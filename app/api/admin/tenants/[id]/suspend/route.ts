import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper admin role checking
    // For now, any authenticated user can suspend tenants

    const tenantId = params.id

    // Check if tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Suspend tenant by updating subscription status
    // In a real implementation, you might want to:
    // 1. Cancel their subscription
    // 2. Disable access to the platform
    // 3. Send notification emails
    // 4. Log the suspension action

    const [updatedTenant] = await db
      .update(tenants)
      .set({
        subscriptionStatus: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning()

    return NextResponse.json({ 
      success: true, 
      tenant: updatedTenant,
      message: 'Tenant suspended successfully'
    })
  } catch (error) {
    console.error('Failed to suspend tenant:', error)
    return NextResponse.json(
      { error: 'Failed to suspend tenant' },
      { status: 500 }
    )
  }
}