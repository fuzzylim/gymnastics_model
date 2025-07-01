import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { withTenantContext } from '@/lib/db/tenant-context'
import { getCustomerPaymentMethods } from '@/lib/stripe'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

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

      if (!tenant || !tenant.stripeCustomerId) {
        return NextResponse.json({
          paymentMethods: [],
        })
      }

      // Get payment methods from Stripe
      const paymentMethods = await getCustomerPaymentMethods(tenant.stripeCustomerId)

      return NextResponse.json({
        paymentMethods,
      })
    })
  } catch (error) {
    console.error('Payment methods fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}