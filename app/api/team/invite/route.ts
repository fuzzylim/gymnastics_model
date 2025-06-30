import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { withTenantContext } from '@/lib/db/tenant-context'
import { tenantMemberships, users, tenants } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'admin'], {
    errorMap: () => ({ message: 'Role must be member or admin' })
  }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = inviteSchema.parse(body)
    const { email, role } = validatedData

    // Verify user has permission to invite (owner or admin)
    const inviterMembership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, session.user.id)
      ),
    })

    if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if user already exists
    let inviteeUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    // Create user if they don't exist
    if (!inviteeUser) {
      const [newUser] = await db.insert(users).values({
        email,
        emailVerified: null, // Will be verified when they accept the invite
      }).returning()
      inviteeUser = newUser
    }

    // Check if user is already a member of this tenant
    const existingMembership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, inviteeUser.id)
      ),
    })

    if (existingMembership) {
      return NextResponse.json({ 
        error: 'User is already a member of this tenant' 
      }, { status: 409 })
    }

    // Create the invitation
    const [membership] = await withTenantContext(tenantId, async (db) => {
      return await db.insert(tenantMemberships).values({
        tenantId,
        userId: inviteeUser!.id,
        role,
        invitedBy: session.user!.id,
        invitedAt: new Date(),
        joinedAt: null, // Will be set when they accept the invitation
      }).returning()
    })

    // Get tenant info for the email
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: {
        name: true,
        slug: true,
      },
    })

    // TODO: Send email invitation
    // For now, we'll just log it (in production, integrate with email service)
    console.log(`
      📧 INVITATION EMAIL (Development Mode):
      To: ${email}
      Subject: You've been invited to join ${tenant?.name}
      
      Hi there!
      
      ${session.user!.email} has invited you to join "${tenant?.name}" as a ${role}.
      
      Click here to accept your invitation:
      ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?invite=${membership.id}
      
      If you don't have an account yet, you'll be able to create one during the invitation process.
      
      Best regards,
      The ${tenant?.name} Team
    `)

    return NextResponse.json({ 
      message: 'Invitation sent successfully',
      membership: {
        id: membership.id,
        email: inviteeUser.email,
        role: membership.role,
        invitedAt: membership.invitedAt,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error sending team invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}