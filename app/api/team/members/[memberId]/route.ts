import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { withTenantContext } from '@/lib/db/tenant-context'
import { tenantMemberships } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const updateMemberSchema = z.object({
  role: z.enum(['member', 'admin'], {
    errorMap: () => ({ message: 'Role must be member or admin' })
  }).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const { memberId } = params
    const body = await request.json()
    const validatedData = updateMemberSchema.parse(body)

    // Verify requester has permission (owner or admin)
    const requesterMembership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, session.user!.id)
      ),
    })

    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the target membership
    const targetMembership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.id, memberId),
        eq(tenantMemberships.tenantId, tenantId)
      ),
    })

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent owners from being demoted (only other owners can change owner roles)
    if (targetMembership.role === 'owner' && requesterMembership.role !== 'owner') {
      return NextResponse.json({ 
        error: 'Only owners can modify other owner memberships' 
      }, { status: 403 })
    }

    // Prevent self-demotion of the last owner
    if (requesterMembership.id === targetMembership.id && 
        requesterMembership.role === 'owner') {
      // Check if there are other owners
      const otherOwners = await db.query.tenantMemberships.findMany({
        where: and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.role, 'owner')
        ),
      })

      if (otherOwners.length <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the last owner. Promote another member to owner first.' 
        }, { status: 400 })
      }
    }

    // Update the membership
    const [updatedMembership] = await withTenantContext(tenantId, async (db) => {
      return await db.update(tenantMemberships)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tenantMemberships.id, memberId),
          eq(tenantMemberships.tenantId, tenantId)
        ))
        .returning()
    })

    return NextResponse.json({ 
      message: 'Member updated successfully',
      membership: updatedMembership 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error updating team member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const { memberId } = params

    // Verify requester has permission (owner or admin)
    const requesterMembership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, session.user!.id)
      ),
    })

    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the target membership
    const targetMembership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.id, memberId),
        eq(tenantMemberships.tenantId, tenantId)
      ),
    })

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent removal of owners by non-owners
    if (targetMembership.role === 'owner' && requesterMembership.role !== 'owner') {
      return NextResponse.json({ 
        error: 'Only owners can remove other owners' 
      }, { status: 403 })
    }

    // Prevent removal of the last owner
    if (targetMembership.role === 'owner') {
      const ownerCount = await db.query.tenantMemberships.findMany({
        where: and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.role, 'owner')
        ),
      })

      if (ownerCount.length <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the last owner' 
        }, { status: 400 })
      }
    }

    // Remove the membership
    await withTenantContext(tenantId, async (db) => {
      await db.delete(tenantMemberships)
        .where(and(
          eq(tenantMemberships.id, memberId),
          eq(tenantMemberships.tenantId, tenantId)
        ))
    })

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}