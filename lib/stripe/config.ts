import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  appInfo: {
    name: 'Gymnastics Model',
    version: '1.0.0',
  },
})

export const STRIPE_WEBHOOKS_SECRET = process.env.STRIPE_WEBHOOKS_SECRET || ''

// Stripe configuration constants
export const STRIPE_CONFIG = {
  currency: 'USD',
  paymentMethods: ['card'],
  billingAddressCollection: 'required' as const,
  customerPortalUrl: process.env.STRIPE_CUSTOMER_PORTAL_URL || 'https://billing.stripe.com/p/login/test_YOUR_URL',
} as const

// Plan limits and features
export const PLAN_FEATURES = {
  starter: {
    maxUsers: 5,
    maxStorage: 1, // GB
    apiCalls: 1000,
    features: ['basic_dashboard', 'email_support'],
  },
  professional: {
    maxUsers: 25,
    maxStorage: 10, // GB
    apiCalls: 10000,
    features: ['advanced_dashboard', 'priority_support', 'analytics'],
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxStorage: -1, // unlimited
    apiCalls: -1, // unlimited
    features: ['custom_branding', 'sso', 'priority_support', 'analytics', 'api_access'],
  },
} as const

export type PlanType = keyof typeof PLAN_FEATURES