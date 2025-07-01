import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, pgEnum, decimal, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'member', 'viewer'])
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'cancelled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid'])
export const planIntervalEnum = pgEnum('plan_interval', ['month', 'year'])
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'open', 'paid', 'uncollectible', 'void'])
export const usageEventStatusEnum = pgEnum('usage_event_status', ['pending', 'processed', 'failed'])

// Tenants table - core of multi-tenancy
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  domain: varchar('domain', { length: 255 }).unique(), // Custom domain support
  settings: jsonb('settings').default({}),
  subscriptionStatus: subscriptionStatusEnum('subscription_status').default('trialing'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  emailVerified: timestamp('email_verified'),
  image: varchar('image', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Tenant memberships - many-to-many relationship between users and tenants
export const tenantMemberships = pgTable('tenant_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: userRoleEnum('role').default('member').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at'),
  joinedAt: timestamp('joined_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Passkey credentials for WebAuthn
export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  credentialId: text('credential_id').unique().notNull(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').default(0).notNull(),
  transports: jsonb('transports'), // Store as JSON array
  name: varchar('name', { length: 100 }), // User-friendly name for the credential
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsed: timestamp('last_used'),
})

// Authentication challenges (for replay protection)
export const authChallenges = pgTable('auth_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  challenge: text('challenge').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // 'registration' or 'authentication'
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Sessions for NextAuth
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').unique().notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Account linking for OAuth providers (if we add them later)
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  idToken: text('id_token'),
  sessionState: varchar('session_state', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations (updated to include billing)
export const tenantsRelations = relations(tenants, ({ many }) => ({
  memberships: many(tenantMemberships),
  subscriptions: many(subscriptions),
  invoices: many(invoices),
  usageEvents: many(usageEvents),
  paymentMethods: many(paymentMethods),
}))

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(tenantMemberships),
  credentials: many(credentials),
  sessions: many(sessions),
  accounts: many(accounts),
  challenges: many(authChallenges),
  invitedMemberships: many(tenantMemberships, {
    relationName: 'invitedBy',
  }),
}))

export const tenantMembershipsRelations = relations(tenantMemberships, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantMemberships.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [tenantMemberships.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [tenantMemberships.invitedBy],
    references: [users.id],
    relationName: 'invitedBy',
  }),
}))

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
}))

export const authChallengesRelations = relations(authChallenges, ({ one }) => ({
  user: one(users, {
    fields: [authChallenges.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

// Types for TypeScript
export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type TenantMembership = typeof tenantMemberships.$inferSelect
export type NewTenantMembership = typeof tenantMemberships.$inferInsert

export type Credential = typeof credentials.$inferSelect
export type NewCredential = typeof credentials.$inferInsert

export type AuthChallenge = typeof authChallenges.$inferSelect
export type NewAuthChallenge = typeof authChallenges.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

// Billing Plans table
export const billingPlans = pgTable('billing_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  stripePriceId: varchar('stripe_price_id', { length: 255 }).unique().notNull(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(), // In dollars
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  interval: planIntervalEnum('interval').notNull(),
  intervalCount: integer('interval_count').default(1).notNull(),
  trialDays: integer('trial_days').default(0),
  features: jsonb('features').default([]), // Array of feature names
  limits: jsonb('limits').default({}), // Usage limits (users, storage, etc.)
  popular: boolean('popular').default(false),
  active: boolean('active').default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  stripeProductIdIdx: index('billing_plans_stripe_product_id_idx').on(table.stripeProductId),
  activeIdx: index('billing_plans_active_idx').on(table.active),
}))

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  planId: uuid('plan_id').references(() => billingPlans.id).notNull(),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique().notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at'),
  endedAt: timestamp('ended_at'),
  quantity: integer('quantity').default(1).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('subscriptions_tenant_id_idx').on(table.tenantId),
  stripeSubscriptionIdIdx: index('subscriptions_stripe_subscription_id_idx').on(table.stripeSubscriptionId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
}))

// Invoices table
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }).unique().notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
  number: varchar('number', { length: 100 }),
  status: invoiceStatusEnum('status').notNull(),
  amountDue: decimal('amount_due', { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  attemptCount: integer('attempt_count').default(0),
  hostedInvoiceUrl: text('hosted_invoice_url'),
  invoicePdf: text('invoice_pdf'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('invoices_tenant_id_idx').on(table.tenantId),
  stripeInvoiceIdIdx: index('invoices_stripe_invoice_id_idx').on(table.stripeInvoiceId),
  statusIdx: index('invoices_status_idx').on(table.status),
  dueDateIdx: index('invoices_due_date_idx').on(table.dueDate),
}))

// Usage Events table (for metered billing)
export const usageEvents = pgTable('usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  eventType: varchar('event_type', { length: 100 }).notNull(), // e.g., 'api_call', 'storage_gb', 'users'
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 4 }), // Price per unit
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  status: usageEventStatusEnum('status').default('pending').notNull(),
  billingPeriod: varchar('billing_period', { length: 20 }).notNull(), // YYYY-MM format
  stripeUsageRecordId: varchar('stripe_usage_record_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('usage_events_tenant_id_idx').on(table.tenantId),
  eventTypeIdx: index('usage_events_event_type_idx').on(table.eventType),
  billingPeriodIdx: index('usage_events_billing_period_idx').on(table.billingPeriod),
  recordedAtIdx: index('usage_events_recorded_at_idx').on(table.recordedAt),
}))

// Payment Methods table
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 255 }).unique().notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // card, sepa_debit, etc.
  brand: varchar('brand', { length: 50 }), // visa, mastercard, etc.
  last4: varchar('last4', { length: 4 }),
  expMonth: integer('exp_month'),
  expYear: integer('exp_year'),
  isDefault: boolean('is_default').default(false),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('payment_methods_tenant_id_idx').on(table.tenantId),
  stripePaymentMethodIdIdx: index('payment_methods_stripe_payment_method_id_idx').on(table.stripePaymentMethodId),
}))

// Billing Relations
export const billingPlansRelations = relations(billingPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenantId],
    references: [tenants.id],
  }),
  plan: one(billingPlans, {
    fields: [subscriptions.planId],
    references: [billingPlans.id],
  }),
  invoices: many(invoices),
  usageEvents: many(usageEvents),
}))

export const invoicesRelations = relations(invoices, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}))

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [usageEvents.tenantId],
    references: [tenants.id],
  }),
  subscription: one(subscriptions, {
    fields: [usageEvents.subscriptionId],
    references: [subscriptions.id],
  }),
}))

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  tenant: one(tenants, {
    fields: [paymentMethods.tenantId],
    references: [tenants.id],
  }),
}))


// Billing Types for TypeScript
export type BillingPlan = typeof billingPlans.$inferSelect
export type NewBillingPlan = typeof billingPlans.$inferInsert

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

export type UsageEvent = typeof usageEvents.$inferSelect
export type NewUsageEvent = typeof usageEvents.$inferInsert

export type PaymentMethod = typeof paymentMethods.$inferSelect
export type NewPaymentMethod = typeof paymentMethods.$inferInsert