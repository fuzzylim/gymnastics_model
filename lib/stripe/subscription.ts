import { stripe } from './config'
import { db } from '@/lib/db'
import { subscriptions, billingPlans, tenants } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import type { Subscription, Tenant, BillingPlan } from '@/lib/db/schema'

export interface CreateSubscriptionParams {
  customerId: string
  priceId: string
  tenantId: string
  planId: string
  quantity?: number
  trialDays?: number
  metadata?: Record<string, string>
}

export interface UpdateSubscriptionParams {
  subscriptionId: string
  priceId?: string
  quantity?: number
  cancelAtPeriodEnd?: boolean
  metadata?: Record<string, string>
}

/**
 * Create a new subscription
 */
export async function createSubscription({
  customerId,
  priceId,
  tenantId,
  planId,
  quantity = 1,
  trialDays,
  metadata = {},
}: CreateSubscriptionParams) {
  try {
    const subscriptionData: any = {
      customer: customerId,
      items: [
        {
          price: priceId,
          quantity,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        tenantId,
        planId,
        ...metadata,
      },
    }

    // Add trial period if specified
    if (trialDays && trialDays > 0) {
      subscriptionData.trial_period_days = trialDays
    }

    const stripeSubscription = await stripe.subscriptions.create(subscriptionData)

    // Store subscription in database
    const [dbSubscription] = await db
      .insert(subscriptions)
      .values({
        tenantId,
        planId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customerId,
        status: stripeSubscription.status as any,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        quantity,
        metadata: metadata,
      })
      .returning()

    // Update tenant subscription status
    await db
      .update(tenants)
      .set({
        subscriptionStatus: stripeSubscription.status as any,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))

    return {
      subscription: stripeSubscription,
      dbSubscription,
    }
  } catch (error) {
    console.error('Failed to create subscription:', error)
    throw new Error('Failed to create subscription')
  }
}

/**
 * Update an existing subscription
 */
export async function updateSubscription({
  subscriptionId,
  priceId,
  quantity,
  cancelAtPeriodEnd,
  metadata,
}: UpdateSubscriptionParams) {
  try {
    const updateData: any = {}

    if (priceId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      updateData.items = [
        {
          id: subscription.items.data[0].id,
          price: priceId,
          quantity: quantity || subscription.items.data[0].quantity,
        },
      ]
    } else if (quantity) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      updateData.items = [
        {
          id: subscription.items.data[0].id,
          quantity,
        },
      ]
    }

    if (cancelAtPeriodEnd !== undefined) {
      updateData.cancel_at_period_end = cancelAtPeriodEnd
    }

    if (metadata) {
      updateData.metadata = metadata
    }

    const stripeSubscription = await stripe.subscriptions.update(subscriptionId, updateData)

    // Update database record
    const updateDbData: any = {
      status: stripeSubscription.status as any,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
      updatedAt: new Date(),
    }

    if (quantity) updateDbData.quantity = quantity
    if (metadata) updateDbData.metadata = metadata

    const [dbSubscription] = await db
      .update(subscriptions)
      .set(updateDbData)
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
      .returning()

    return {
      subscription: stripeSubscription,
      dbSubscription,
    }
  } catch (error) {
    console.error('Failed to update subscription:', error)
    throw new Error('Failed to update subscription')
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
  try {
    let stripeSubscription

    if (cancelAtPeriodEnd) {
      // Cancel at period end
      stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
    } else {
      // Cancel immediately
      stripeSubscription = await stripe.subscriptions.cancel(subscriptionId)
    }

    // Update database record
    const [dbSubscription] = await db
      .update(subscriptions)
      .set({
        status: stripeSubscription.status as any,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
        endedAt: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
      .returning()

    return {
      subscription: stripeSubscription,
      dbSubscription,
    }
  } catch (error) {
    console.error('Failed to cancel subscription:', error)
    throw new Error('Failed to cancel subscription')
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  try {
    const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    // Update database record
    const [dbSubscription] = await db
      .update(subscriptions)
      .set({
        status: stripeSubscription.status as any,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
      .returning()

    return {
      subscription: stripeSubscription,
      dbSubscription,
    }
  } catch (error) {
    console.error('Failed to reactivate subscription:', error)
    throw new Error('Failed to reactivate subscription')
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice.payment_intent', 'customer'],
    })

    const dbSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
      with: {
        tenant: true,
        plan: true,
      },
    })

    return {
      subscription: stripeSubscription,
      dbSubscription,
    }
  } catch (error) {
    console.error('Failed to retrieve subscription:', error)
    throw new Error('Failed to retrieve subscription')
  }
}

/**
 * Get tenant's active subscription
 */
export async function getTenantSubscription(tenantId: string) {
  try {
    const dbSubscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.tenantId, tenantId),
        eq(subscriptions.status, 'active')
      ),
      with: {
        tenant: true,
        plan: true,
      },
    })

    if (!dbSubscription) {
      return null
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      dbSubscription.stripeSubscriptionId,
      {
        expand: ['latest_invoice.payment_intent'],
      }
    )

    return {
      subscription: stripeSubscription,
      dbSubscription,
    }
  } catch (error) {
    console.error('Failed to retrieve tenant subscription:', error)
    throw new Error('Failed to retrieve tenant subscription')
  }
}

/**
 * Create customer portal session
 */
export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session
  } catch (error) {
    console.error('Failed to create customer portal session:', error)
    throw new Error('Failed to create customer portal session')
  }
}

/**
 * Get subscription usage summary
 */
export async function getSubscriptionUsage(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const usageRecords = await stripe.subscriptionItems.listUsageRecordSummaries(
      subscription.items.data[0].id
    )

    return {
      subscription,
      usage: usageRecords.data,
    }
  } catch (error) {
    console.error('Failed to retrieve subscription usage:', error)
    throw new Error('Failed to retrieve subscription usage')
  }
}

/**
 * Get billing plan by ID
 */
export async function getBillingPlan(planId: string) {
  try {
    const [plan] = await db
      .select()
      .from(billingPlans)
      .where(eq(billingPlans.id, planId))
      .limit(1)
    
    return plan || null
  } catch (error) {
    console.error('Failed to get billing plan:', error)
    throw new Error('Failed to get billing plan')
  }
}