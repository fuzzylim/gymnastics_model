import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../index'
import { withTenantContext } from '../tenant-context'
import { tenants, users, tenantMemberships } from '../schema'
import { eq } from 'drizzle-orm'
import { createTenantWithOwner } from '../tenant-utils'

// Skip this test file if not in integration test mode
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'

describe.skipIf(!runIntegrationTests)('Tenant Isolation Integration Tests', () => {
  let tenant1Id: string
  let tenant2Id: string
  let user1Id: string
  let user2Id: string

  beforeAll(async () => {
    // Create test users
    const [user1] = await db
      .insert(users)
      .values({
        email: 'test-user-1@example.com',
        name: 'Test User 1',
      })
      .returning()
    user1Id = user1.id

    const [user2] = await db
      .insert(users)
      .values({
        email: 'test-user-2@example.com',
        name: 'Test User 2',
      })
      .returning()
    user2Id = user2.id

    // Create test tenants
    const tenant1Result = await createTenantWithOwner(
      {
        slug: 'test-tenant-1',
        name: 'Test Tenant 1',
        description: 'Integration test tenant 1',
      },
      user1Id
    )
    tenant1Id = tenant1Result.tenant.id

    const tenant2Result = await createTenantWithOwner(
      {
        slug: 'test-tenant-2',
        name: 'Test Tenant 2',
        description: 'Integration test tenant 2',
      },
      user2Id
    )
    tenant2Id = tenant2Result.tenant.id
  })

  afterAll(async () => {
    // Clean up test data
    await db.delete(tenantMemberships).where(
      eq(tenantMemberships.tenantId, tenant1Id)
    )
    await db.delete(tenantMemberships).where(
      eq(tenantMemberships.tenantId, tenant2Id)
    )
    await db.delete(tenants).where(eq(tenants.id, tenant1Id))
    await db.delete(tenants).where(eq(tenants.id, tenant2Id))
    await db.delete(users).where(eq(users.id, user1Id))
    await db.delete(users).where(eq(users.id, user2Id))
  })

  describe('Row-Level Security', () => {
    it('should only show data from the current tenant context', async () => {
      // Add user2 to tenant1 as a member
      await db
        .insert(tenantMemberships)
        .values({
          tenantId: tenant1Id,
          userId: user2Id,
          role: 'member',
        })

      // Query memberships in tenant1 context
      const tenant1Members = await withTenantContext(tenant1Id, async (db) => {
        return await db
          .select()
          .from(tenantMemberships)
          .where(eq(tenantMemberships.tenantId, tenant1Id))
      })

      // Query memberships in tenant2 context
      const tenant2Members = await withTenantContext(tenant2Id, async (db) => {
        return await db
          .select()
          .from(tenantMemberships)
          .where(eq(tenantMemberships.tenantId, tenant2Id))
      })

      // Verify isolation
      expect(tenant1Members.length).toBe(2) // owner + member
      expect(tenant2Members.length).toBe(1) // only owner
      
      // Verify no cross-tenant data
      const tenant1UserIds = tenant1Members.map((m: any) => m.userId)
      const tenant2UserIds = tenant2Members.map((m: any) => m.userId)
      
      expect(tenant1UserIds).toContain(user1Id)
      expect(tenant1UserIds).toContain(user2Id)
      expect(tenant2UserIds).toContain(user2Id)
      expect(tenant2UserIds).not.toContain(user1Id)
    })

    it('should prevent updates to other tenant data', async () => {
      // Try to update tenant1 data while in tenant2 context
      const updateResult = await withTenantContext(tenant2Id, async (db) => {
        return await db
          .update(tenants)
          .set({ description: 'Hacked description' })
          .where(eq(tenants.id, tenant1Id))
          .returning()
      })

      // Should not update anything
      expect(updateResult.length).toBe(0)

      // Verify tenant1 data is unchanged
      const [tenant1Data] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenant1Id))
      
      expect(tenant1Data.description).toBe('Integration test tenant 1')
    })

    it('should prevent deletion of other tenant data', async () => {
      // Create a test record in tenant1
      const [testMembership] = await db
        .insert(tenantMemberships)
        .values({
          tenantId: tenant1Id,
          userId: user1Id,
          role: 'viewer',
        })
        .returning()

      // Try to delete it from tenant2 context
      const deleteResult = await withTenantContext(tenant2Id, async (db) => {
        return await db
          .delete(tenantMemberships)
          .where(eq(tenantMemberships.id, testMembership.id))
          .returning()
      })

      // Should not delete anything
      expect(deleteResult.length).toBe(0)

      // Verify the record still exists
      const [stillExists] = await db
        .select()
        .from(tenantMemberships)
        .where(eq(tenantMemberships.id, testMembership.id))
      
      expect(stillExists).toBeDefined()

      // Clean up
      await db
        .delete(tenantMemberships)
        .where(eq(tenantMemberships.id, testMembership.id))
    })
  })

  describe('Tenant Context Validation', () => {
    it('should validate tenant exists before setting context', async () => {
      const nonExistentTenantId = 'non-existent-tenant'
      
      // This should ideally throw an error or handle gracefully
      const result = await withTenantContext(nonExistentTenantId, async (db) => {
        return await db
          .select()
          .from(tenantMemberships)
      })

      // With RLS, this should return empty results
      expect(result).toEqual([])
    })

    it('should handle concurrent tenant contexts correctly', async () => {
      // Run multiple tenant contexts in parallel
      const [result1, result2] = await Promise.all([
        withTenantContext(tenant1Id, async (db) => {
          return await db
            .select()
            .from(tenants)
            .where(eq(tenants.id, tenant1Id))
        }),
        withTenantContext(tenant2Id, async (db) => {
          return await db
            .select()
            .from(tenants)
            .where(eq(tenants.id, tenant2Id))
        }),
      ])

      expect(result1[0].id).toBe(tenant1Id)
      expect(result2[0].id).toBe(tenant2Id)
    })
  })
})