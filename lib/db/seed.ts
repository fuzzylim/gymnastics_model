import { config } from 'dotenv'

// Load environment variables before importing db
config()

import { db } from './index'
import { tenants, users, tenantMemberships } from './schema'

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

    console.log('✅ Database seeded successfully!')
    console.log(`Demo users created:`)
    console.log(`  - ${demoUser.email} (${demoUser.id})`)
    console.log(`  - ${adminUser.email} (${adminUser.id})`)
    console.log(`Demo tenants created:`)
    console.log(`  - ${acmeTenant.slug} (${acmeTenant.id})`)
    console.log(`  - ${startupTenant.slug} (${startupTenant.id})`)

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