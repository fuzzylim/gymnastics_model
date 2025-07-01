import { config } from 'dotenv'

// Load environment variables before importing db
config()

import { db } from './index'
import { tenants, users, tenantMemberships, billingPlans } from './schema'

export async function seedDatabase() {
  console.log('🌱 Seeding database...')

  try {
    // Create demo users
    const [demoUser] = await db
      .insert(users)
      .values({
        email: 'demo@example.com',
        name: 'Demo User',
        emailVerified: new Date(),
      })
      .returning()

    const [adminUser] = await db
      .insert(users)
      .values({
        email: 'admin@example.com',
        name: 'Admin User',
        emailVerified: new Date(),
      })
      .returning()

    // Create demo tenants
    const [acmeTenant] = await db
      .insert(tenants)
      .values({
        slug: 'acme-corp',
        name: 'Acme Corporation',
        description: 'A demo company for testing multi-tenant features',
        subscriptionStatus: 'active',
      })
      .returning()

    const [startupTenant] = await db
      .insert(tenants)
      .values({
        slug: 'startup-demo',
        name: 'Startup Demo',
        description: 'Another demo organisation',
        subscriptionStatus: 'trialing',
      })
      .returning()

    // Create memberships
    await db.insert(tenantMemberships).values([
      {
        tenantId: acmeTenant.id,
        userId: demoUser.id,
        role: 'owner',
        joinedAt: new Date(),
      },
      {
        tenantId: acmeTenant.id,
        userId: adminUser.id,
        role: 'admin',
        joinedAt: new Date(),
      },
      {
        tenantId: startupTenant.id,
        userId: demoUser.id,
        role: 'admin',
        joinedAt: new Date(),
      },
    ])

    // Create or update billing plans
    const billingPlanData = [
      {
        name: 'Starter',
        stripePriceId: 'price_starter_monthly',
        stripeProductId: 'prod_starter',
        amount: 2900, // $29.00 AUD
        currency: 'aud',
        interval: 'month',
        features: {
          maxUsers: 5,
          maxStorage: 1,
          apiCalls: 1000,
        },
        active: true,
      },
      {
        name: 'Professional',
        stripePriceId: 'price_professional_monthly',
        stripeProductId: 'prod_professional',
        amount: 9900, // $99.00 AUD
        currency: 'aud',
        interval: 'month',
        features: {
          maxUsers: 25,
          maxStorage: 10,
          apiCalls: 10000,
        },
        active: true,
      },
      {
        name: 'Enterprise',
        stripePriceId: 'price_enterprise_monthly',
        stripeProductId: 'prod_enterprise',
        amount: 29900, // $299.00 AUD
        currency: 'aud',
        interval: 'month',
        features: {
          maxUsers: -1, // Unlimited
          maxStorage: -1, // Unlimited
          apiCalls: -1, // Unlimited
        },
        active: true,
      },
    ]

    await db.insert(billingPlans).values(billingPlanData)

    console.log('✅ Database seeded successfully!')
    console.log(`Demo users created:`)
    console.log(`  - ${demoUser.email} (${demoUser.id})`)
    console.log(`  - ${adminUser.email} (${adminUser.id})`)
    console.log(`Demo tenants created:`)
    console.log(`  - ${acmeTenant.slug} (${acmeTenant.id})`)
    console.log(`  - ${startupTenant.slug} (${startupTenant.id})`)
    console.log(`Billing plans created:`)
    console.log(`  - Starter ($29/month)`)
    console.log(`  - Professional ($99/month)`)
    console.log(`  - Enterprise ($299/month)`)

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding complete')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seeding failed:', error)
      process.exit(1)
    })
}