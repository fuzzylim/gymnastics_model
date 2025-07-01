import { stripe, STRIPE_WEBHOOKS_SECRET } from './config'
import { db } from '@/lib/db'
import { subscriptions, invoices, tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'

/**
 * Verify and construct webhook event from request
 */
export function constructWebhookEvent(body: string | Buffer, signature: string) {
  try {
    return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOKS_SECRET)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

/**
 * Handle subscription created event
 */
export async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const tenantId = subscription.metadata.tenantId
    const planId = subscription.metadata.planId

    if (!tenantId || !planId) {
      console.error('Missing tenantId or planId in subscription metadata')
      return
    }

    // Update or create subscription record
    await db
      .insert(subscriptions)
      .values({
        tenantId,
        planId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        status: subscription.status as any,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        quantity: subscription.items.data[0]?.quantity || 1,
        metadata: subscription.metadata,
      })
      .onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: {
          status: subscription.status as any,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          quantity: subscription.items.data[0]?.quantity || 1,
          updatedAt: new Date(),
        },
      })

    // Update tenant subscription status
    await db
      .update(tenants)
      .set({
        subscriptionStatus: subscription.status as any,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))

    console.log(`Subscription created/updated: ${subscription.id}`)
  } catch (error) {
    console.error('Failed to handle subscription created:', error)
    throw error
  }
}

/**
 * Handle subscription updated event
 */
export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Update subscription record
    const [updated] = await db
      .update(subscriptions)
      .set({
        status: subscription.status as any,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
        quantity: subscription.items.data[0]?.quantity || 1,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .returning()

    if (updated) {
      // Update tenant subscription status
      await db
        .update(tenants)
        .set({
          subscriptionStatus: subscription.status as any,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, updated.tenantId))
    }

    console.log(`Subscription updated: ${subscription.id}`)
  } catch (error) {
    console.error('Failed to handle subscription updated:', error)
    throw error
  }
}

/**
 * Handle subscription deleted/canceled event
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Update subscription record
    const [updated] = await db
      .update(subscriptions)
      .set({
        status: 'cancelled' as any,
        canceledAt: new Date(),
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .returning()

    if (updated) {
      // Update tenant subscription status
      await db
        .update(tenants)
        .set({
          subscriptionStatus: 'cancelled' as any,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, updated.tenantId))
    }

    console.log(`Subscription deleted: ${subscription.id}`)
  } catch (error) {
    console.error('Failed to handle subscription deleted:', error)
    throw error
  }
}

/**
 * Handle invoice payment succeeded event
 */
export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = (invoice as any).subscription as string
    const customerId = invoice.customer as string

    // Find the subscription in our database
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
    })

    if (!subscription) {
      console.warn(`Subscription not found for invoice: ${invoice.id}`)
      return
    }

    // Update or create invoice record
    await db
      .insert(invoices)
      .values({
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: customerId,
        number: invoice.number || null,
        status: invoice.status as any,
        amountDue: (invoice.amount_due / 100).toString(),
        amountPaid: (invoice.amount_paid / 100).toString(),
        currency: invoice.currency.toUpperCase(),
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        paidAt: invoice.status_transitions?.paid_at 
          ? new Date(invoice.status_transitions.paid_at * 1000) 
          : null,
        attemptCount: invoice.attempt_count || 0,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        metadata: invoice.metadata,
      })
      .onConflictDoUpdate({
        target: invoices.stripeInvoiceId,
        set: {
          status: invoice.status as any,
          amountPaid: (invoice.amount_paid / 100).toString(),
          paidAt: invoice.status_transitions?.paid_at 
            ? new Date(invoice.status_transitions.paid_at * 1000) 
            : null,
          attemptCount: invoice.attempt_count || 0,
          updatedAt: new Date(),
        },
      })

    console.log(`Invoice payment succeeded: ${invoice.id}`)
  } catch (error) {
    console.error('Failed to handle invoice payment succeeded:', error)
    throw error
  }
}

/**
 * Handle invoice payment failed event
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = (invoice as any).subscription as string

    // Find the subscription in our database
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
    })

    if (!subscription) {
      console.warn(`Subscription not found for failed invoice: ${invoice.id}`)
      return
    }

    // Update invoice record
    await db
      .update(invoices)
      .set({
        status: 'open',
        attemptCount: invoice.attempt_count || 0,
        updatedAt: new Date(),
      })
      .where(eq(invoices.stripeInvoiceId, invoice.id))

    // TODO: Send notification to tenant about failed payment
    console.log(`Invoice payment failed: ${invoice.id}`)
  } catch (error) {
    console.error('Failed to handle invoice payment failed:', error)
    throw error
  }
}

/**
 * Handle customer updated event
 */
export async function handleCustomerUpdated(customer: Stripe.Customer) {
  try {
    // Update tenant record if needed
    await db
      .update(tenants)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(tenants.stripeCustomerId, customer.id))

    console.log(`Customer updated: ${customer.id}`)
  } catch (error) {
    console.error('Failed to handle customer updated:', error)
    throw error
  }
}

/**
 * Main webhook event handler
 */
export async function handleWebhookEvent(event: Stripe.Event) {
  try {
    console.log(`Processing webhook event: ${event.type}`)

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer)
        break

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    console.log(`Successfully processed webhook event: ${event.id}`)
  } catch (error) {
    console.error(`Failed to process webhook event ${event.id}:`, error)
    throw error
  }
}