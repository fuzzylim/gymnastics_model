import { stripe } from './config'
import { db } from '@/lib/db'
import { usageEvents, subscriptions } from '@/lib/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import type { UsageEvent } from '@/lib/db/schema'

export interface RecordUsageParams {
  tenantId: string
  eventType: string
  quantity: number
  subscriptionId?: string
  unitPrice?: number
  metadata?: Record<string, string>
}

export interface UsageSummary {
  eventType: string
  totalQuantity: number
  totalAmount: number
  period: string
}

/**
 * Record a usage event for a tenant
 */
export async function recordUsageEvent({
  tenantId,
  eventType,
  quantity,
  subscriptionId,
  unitPrice,
  metadata = {},
}: RecordUsageParams) {
  try {
    const billingPeriod = getCurrentBillingPeriod()
    
    // Calculate total amount if unit price is provided
    const totalAmount = unitPrice ? (quantity * unitPrice) : null

    // Store usage event in database
    const [usageEvent] = await db
      .insert(usageEvents)
      .values({
        tenantId,
        subscriptionId,
        eventType,
        quantity,
        unitPrice: unitPrice?.toString(),
        totalAmount: totalAmount?.toString(),
        billingPeriod,
        metadata,
        recordedAt: new Date(),
      })
      .returning()

    return usageEvent
  } catch (error) {
    console.error('Failed to record usage event:', error)
    throw new Error('Failed to record usage event')
  }
}

/**
 * Submit usage to Stripe for metered billing
 */
export async function submitUsageToStripe(
  subscriptionItemId: string,
  quantity: number,
  timestamp?: Date
) {
  try {
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp: timestamp ? Math.floor(timestamp.getTime() / 1000) : Math.floor(Date.now() / 1000),
        action: 'set', // 'increment' or 'set'
      }
    )

    return usageRecord
  } catch (error) {
    console.error('Failed to submit usage to Stripe:', error)
    throw new Error('Failed to submit usage to Stripe')
  }
}

/**
 * Get usage summary for a tenant and period
 */
export async function getUsageSummary(
  tenantId: string,
  billingPeriod?: string
): Promise<UsageSummary[]> {
  try {
    const period = billingPeriod || getCurrentBillingPeriod()
    
    const events = await db.query.usageEvents.findMany({
      where: and(
        eq(usageEvents.tenantId, tenantId),
        eq(usageEvents.billingPeriod, period)
      ),
    })

    // Group by event type and sum quantities
    const summary = events.reduce((acc: Record<string, UsageSummary>, event) => {
      if (!acc[event.eventType]) {
        acc[event.eventType] = {
          eventType: event.eventType,
          totalQuantity: 0,
          totalAmount: 0,
          period,
        }
      }

      acc[event.eventType].totalQuantity += event.quantity
      if (event.totalAmount) {
        acc[event.eventType].totalAmount += parseFloat(event.totalAmount)
      }

      return acc
    }, {} as Record<string, UsageSummary>)

    return Object.values(summary)
  } catch (error) {
    console.error('Failed to get usage summary:', error)
    throw new Error('Failed to get usage summary')
  }
}

/**
 * Get current usage for a tenant
 */
export async function getCurrentUsage(tenantId: string) {
  try {
    const currentPeriod = getCurrentBillingPeriod()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)
    endOfMonth.setDate(0)
    endOfMonth.setHours(23, 59, 59, 999)

    const events = await db.query.usageEvents.findMany({
      where: and(
        eq(usageEvents.tenantId, tenantId),
        gte(usageEvents.recordedAt, startOfMonth),
        lte(usageEvents.recordedAt, endOfMonth)
      ),
    })

    // Group by event type
    const usage = events.reduce((acc, event) => {
      if (!acc[event.eventType]) {
        acc[event.eventType] = {
          count: 0,
          totalAmount: 0,
        }
      }

      acc[event.eventType].count += event.quantity
      if (event.totalAmount) {
        acc[event.eventType].totalAmount += parseFloat(event.totalAmount)
      }

      return acc
    }, {} as Record<string, { count: number; totalAmount: number }>)

    return usage
  } catch (error) {
    console.error('Failed to get current usage:', error)
    throw new Error('Failed to get current usage')
  }
}

/**
 * Check if tenant has exceeded usage limits
 */
export async function checkUsageLimits(tenantId: string, eventType: string, quantity: number) {
  try {
    // Get tenant's subscription and plan
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.tenantId, tenantId),
        eq(subscriptions.status, 'active')
      ),
      with: {
        plan: true,
      },
    })

    if (!subscription?.plan) {
      // No active subscription, allow limited usage for trial
      return { allowed: true, remaining: null }
    }

    const planLimits = subscription.plan.limits as any
    const eventLimit = planLimits?.[eventType]

    // If no limit set, allow unlimited usage
    if (!eventLimit || eventLimit === -1) {
      return { allowed: true, remaining: null }
    }

    // Get current usage for this period
    const currentUsage = await getCurrentUsage(tenantId)
    const currentCount = currentUsage[eventType]?.count || 0
    const newTotal = currentCount + quantity

    const allowed = newTotal <= eventLimit
    const remaining = Math.max(0, eventLimit - currentCount)

    return { allowed, remaining, limit: eventLimit, current: currentCount }
  } catch (error) {
    console.error('Failed to check usage limits:', error)
    throw new Error('Failed to check usage limits')
  }
}

/**
 * Process pending usage events for Stripe submission
 */
export async function processPendingUsage() {
  try {
    const pendingEvents = await db.query.usageEvents.findMany({
      where: eq(usageEvents.status, 'pending'),
      with: {
        subscription: true,
      },
    })

    const results = []

    for (const event of pendingEvents) {
      try {
        if (event.subscription?.stripeSubscriptionId) {
          // Get subscription from Stripe to find the metered item
          const stripeSubscription = await stripe.subscriptions.retrieve(
            event.subscription.stripeSubscriptionId
          )

          // Find the metered subscription item (assuming first item is metered)
          const subscriptionItem = stripeSubscription.items.data[0]

          if (subscriptionItem) {
            // Submit usage to Stripe
            await submitUsageToStripe(
              subscriptionItem.id,
              event.quantity,
              event.recordedAt
            )

            // Mark as processed
            await db
              .update(usageEvents)
              .set({
                status: 'processed',
                processedAt: new Date(),
              })
              .where(eq(usageEvents.id, event.id))

            results.push({ id: event.id, status: 'processed' })
          }
        }
      } catch (error) {
        console.error(`Failed to process usage event ${event.id}:`, error)
        
        // Mark as failed
        await db
          .update(usageEvents)
          .set({
            status: 'failed',
            processedAt: new Date(),
          })
          .where(eq(usageEvents.id, event.id))

        results.push({ id: event.id, status: 'failed', error: (error as Error).message })
      }
    }

    return results
  } catch (error) {
    console.error('Failed to process pending usage:', error)
    throw new Error('Failed to process pending usage')
  }
}

/**
 * Get current billing period in YYYY-MM format
 */
function getCurrentBillingPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Helper to record common usage events
 */
export const usageTrackers = {
  apiCall: (tenantId: string, subscriptionId?: string) =>
    recordUsageEvent({
      tenantId,
      subscriptionId,
      eventType: 'api_call',
      quantity: 1,
    }),

  storageUsed: (tenantId: string, gigabytes: number, subscriptionId?: string) =>
    recordUsageEvent({
      tenantId,
      subscriptionId,
      eventType: 'storage_gb',
      quantity: gigabytes,
    }),

  userAdded: (tenantId: string, subscriptionId?: string) =>
    recordUsageEvent({
      tenantId,
      subscriptionId,
      eventType: 'users',
      quantity: 1,
    }),

  userRemoved: (tenantId: string, subscriptionId?: string) =>
    recordUsageEvent({
      tenantId,
      subscriptionId,
      eventType: 'users',
      quantity: -1,
    }),
}