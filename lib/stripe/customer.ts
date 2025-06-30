import { stripe } from './config'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Tenant } from '@/lib/db/schema'

export interface CreateCustomerParams {
  email: string
  name: string
  tenantId: string
  metadata?: Record<string, string>
}

export interface UpdateCustomerParams {
  customerId: string
  email?: string
  name?: string
  metadata?: Record<string, string>
}

/**
 * Create a new Stripe customer for a tenant
 */
export async function createStripeCustomer({
  email,
  name,
  tenantId,
  metadata = {},
}: CreateCustomerParams) {
  try {
    // Create customer in Stripe
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        tenantId,
        ...metadata,
      },
    })

    // Update tenant with Stripe customer ID
    await db
      .update(tenants)
      .set({
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))

    return customer
  } catch (error) {
    console.error('Failed to create Stripe customer:', error)
    throw new Error('Failed to create customer')
  }
}

/**
 * Retrieve a Stripe customer by ID
 */
export async function getStripeCustomer(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    
    if (customer.deleted) {
      throw new Error('Customer has been deleted')
    }
    
    return customer
  } catch (error) {
    console.error('Failed to retrieve Stripe customer:', error)
    throw new Error('Failed to retrieve customer')
  }
}

/**
 * Update a Stripe customer
 */
export async function updateStripeCustomer({
  customerId,
  email,
  name,
  metadata,
}: UpdateCustomerParams) {
  try {
    const updateData: Stripe.CustomerUpdateParams = {}
    
    if (email) updateData.email = email
    if (name) updateData.name = name
    if (metadata) updateData.metadata = metadata

    const customer = await stripe.customers.update(customerId, updateData)
    return customer
  } catch (error) {
    console.error('Failed to update Stripe customer:', error)
    throw new Error('Failed to update customer')
  }
}

/**
 * Get Stripe customer for a tenant
 */
export async function getOrCreateCustomerForTenant(tenant: Tenant, userEmail: string, userName: string) {
  // If tenant already has a Stripe customer ID, return it
  if (tenant.stripeCustomerId) {
    try {
      return await getStripeCustomer(tenant.stripeCustomerId)
    } catch (error) {
      console.warn('Existing customer not found, creating new one:', error)
      // Fall through to create new customer
    }
  }

  // Create new customer
  return await createStripeCustomer({
    email: userEmail,
    name: userName,
    tenantId: tenant.id,
    metadata: {
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
    },
  })
}

/**
 * Delete a Stripe customer (soft delete)
 */
export async function deleteStripeCustomer(customerId: string) {
  try {
    const customer = await stripe.customers.del(customerId)
    return customer
  } catch (error) {
    console.error('Failed to delete Stripe customer:', error)
    throw new Error('Failed to delete customer')
  }
}

/**
 * List payment methods for a customer
 */
export async function getCustomerPaymentMethods(customerId: string) {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })
    
    return paymentMethods.data
  } catch (error) {
    console.error('Failed to retrieve payment methods:', error)
    throw new Error('Failed to retrieve payment methods')
  }
}

/**
 * Create a setup intent for adding payment methods
 */
export async function createSetupIntent(customerId: string) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    })
    
    return setupIntent
  } catch (error) {
    console.error('Failed to create setup intent:', error)
    throw new Error('Failed to create setup intent')
  }
}