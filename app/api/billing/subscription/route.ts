import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTenantFromRequest } from '@/lib/tenant-context'
import { db } from '@/lib/db'
import { 
  createSubscription, 
  getTenantSubscription, 
  updateSubscription, 
  cancelSubscription,
  getOrCreateCustomerForTenant,
} from '@/lib/stripe'
import { billingPlans, tenantMemberships } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  paymentMethodId: z.string().optional(),
})

const updateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  quantity: z.number().int().positive().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
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

    // Get tenant's subscription
    const subscriptionData = await getTenantSubscription(tenant.id)

    return NextResponse.json({ 
      subscription: subscriptionData?.dbSubscription || null,
      plan: subscriptionData?.dbSubscription?.plan || null,
    })
  } catch (error) {
    console.error('Failed to fetch subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()
    const { planId, paymentMethodId } = createSubscriptionSchema.parse(body)

    // Get the billing plan
    const plan = await db.query.billingPlans.findFirst({
      where: eq(billingPlans.id, planId),
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomerForTenant(
      tenant,
      session.user.email!,
      session.user.name || 'Unknown'
    )

    // Create subscription
    const { subscription, dbSubscription } = await createSubscription({
      customerId: customer.id,
      priceId: plan.stripePriceId,
      tenantId: tenant.id,
      planId: plan.id,
      trialDays: plan.trialDays || 0,
      metadata: {
        tenantSlug: tenant.slug,
        planName: plan.name,
      },
    })

    return NextResponse.json({
      subscription: dbSubscription,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    })
  } catch (error) {
    console.error('Failed to create subscription:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const updateData = updateSubscriptionSchema.parse(body)

    // Get tenant's current subscription
    const subscriptionData = await getTenantSubscription(tenant.id)
    if (!subscriptionData) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    let priceId: string | undefined

    // If updating plan, get the new price ID
    if (updateData.planId) {
      const newPlan = await db.query.billingPlans.findFirst({
        where: eq(billingPlans.id, updateData.planId),
      })

      if (!newPlan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }

      priceId = newPlan.stripePriceId
    }

    // Update subscription
    const { subscription, dbSubscription } = await updateSubscription({
      subscriptionId: subscriptionData.subscription.id,
      priceId,
      quantity: updateData.quantity,
      cancelAtPeriodEnd: updateData.cancelAtPeriodEnd,
    })

    return NextResponse.json({ subscription: dbSubscription })
  } catch (error) {
    console.error('Failed to update subscription:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await getTenantFromRequest(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check if user is owner
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenant.id),
        eq(tenantMemberships.userId, session.user.id)
      ),
    })

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only tenant owners can cancel subscriptions' }, { status: 403 })
    }

    // Get tenant's current subscription
    const subscriptionData = await getTenantSubscription(tenant.id)
    if (!subscriptionData) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    const { cancelAtPeriodEnd = true } = await request.json().catch(() => ({}))

    // Cancel subscription
    const { subscription, dbSubscription } = await cancelSubscription(
      subscriptionData.subscription.id,
      cancelAtPeriodEnd
    )

    return NextResponse.json({ subscription: dbSubscription })
  } catch (error) {
    console.error('Failed to cancel subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}