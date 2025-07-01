import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { withTenantContext } from '@/lib/db/tenant-context'
import { getOrCreateCustomerForTenant, createSetupIntent } from '@/lib/stripe'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenantId } = await request.json()

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenantId' },
        { status: 400 }
      )
    }

    return await withTenantContext(tenantId, async (db) => {
      // Get tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)

      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        )
      }

      // Get or create Stripe customer
      const customer = await getOrCreateCustomerForTenant(
        tenant,
        session.user.email!,
        session.user.name || session.user.email!
      )

      // Create setup intent
      const setupIntent = await createSetupIntent(customer.id)

      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
        customerId: customer.id,
      })
    })
  } catch (error) {
    console.error('Setup intent creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    )
  }
}