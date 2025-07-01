import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTenantFromRequest } from '@/lib/tenant-context'
import { db } from '@/lib/db'
import { createCustomerPortalSession } from '@/lib/stripe'
import { tenantMemberships } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await getTenantFromRequest(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check if user is owner or admin
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenant.id),
        eq(tenantMemberships.userId, session.user.id)
      ),
    })

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!tenant.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const { returnUrl } = await request.json()
    
    // Create customer portal session
    const portalSession = await createCustomerPortalSession(
      tenant.stripeCustomerId,
      returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/${tenant.slug}/settings/billing`
    )

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Failed to create customer portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    )
  }
}