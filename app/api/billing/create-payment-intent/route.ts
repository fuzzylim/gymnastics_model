import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { withTenantContext } from '@/lib/db/tenant-context'
import { createStripeCustomer, createPaymentIntent } from '@/lib/stripe/customer'
import { getBillingPlan } from '@/lib/stripe/subscription'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId, priceId, tenantId } = await request.json()

    if (!planId || !priceId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    return await withTenantContext(tenantId, async (db) => {
      // Get the billing plan details
      const plan = await getBillingPlan(planId)
      if (!plan) {
        return NextResponse.json(
          { error: 'Invalid billing plan' },
          { status: 400 }
        )
      }

      // Create or get Stripe customer
      const customer = await createStripeCustomer({
        tenantId,
        email: session.user.email!,
        name: session.user.name || session.user.email!,
      })

      // Create payment intent for subscription setup
      const paymentIntent = await createPaymentIntent({
        customerId: customer.id,
        amount: plan.amount,
        currency: plan.currency,
        priceId,
        metadata: {
          tenantId,
          planId,
          userId: session.user.id,
        },
      })

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
      })
    })
  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}