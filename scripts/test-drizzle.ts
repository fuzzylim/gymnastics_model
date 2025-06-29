import { config } from 'dotenv'

// Load environment variables before importing db
config()

import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { users, tenants, tenantMemberships } from '../lib/db/schema'

async function testDrizzle() {
    console.log('🧪 Testing Drizzle ORM operations...\n')

    try {
        // Test 1: Query all users
        console.log('1️⃣ Fetching all users:')
        const allUsers = await db.select().from(users)
        console.table(allUsers.map(u => ({ id: u.id, email: u.email, name: u.name })))

        // Test 2: Query all tenants
        console.log('\n2️⃣ Fetching all tenants:')
        const allTenants = await db.select().from(tenants)
        console.table(allTenants.map(t => ({ id: t.id, slug: t.slug, name: t.name })))

        // Test 3: Query memberships with joins
        console.log('\n3️⃣ Fetching tenant memberships with relations:')
        const memberships = await db
            .select({
                userEmail: users.email,
                tenantSlug: tenants.slug,
                role: tenantMemberships.role,
            })
            .from(tenantMemberships)
            .innerJoin(users, eq(users.id, tenantMemberships.userId))
            .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))

        console.table(memberships)

        // Test 4: Count records
        console.log('\n4️⃣ Record counts:')
        console.log(`  Users: ${allUsers.length}`)
        console.log(`  Tenants: ${allTenants.length}`)
        console.log(`  Memberships: ${memberships.length}`)

        console.log('\n✅ Drizzle ORM is working correctly!')

    } catch (error) {
        console.error('❌ Error testing Drizzle:', error)
    } finally {
        // Close the connection
        await db.$client.end()
    }
}

// Run the test
testDrizzle()