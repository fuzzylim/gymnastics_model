import { db } from '@/lib/db'
import { tenantMemberships, tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getUserWithTenant(userId: string) {
  const result = await db
    .select({
      id: tenantMemberships.id,
      role: tenantMemberships.role,
      joinedAt: tenantMemberships.joinedAt,
      tenant: {
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        settings: tenants.settings,
        createdAt: tenants.createdAt,
      },
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
    .where(eq(tenantMemberships.userId, userId))
    .limit(1)

  return result[0] || null
}

export async function getTenantMembership(userId: string, tenantId: string) {
  const result = await db
    .select()
    .from(tenantMemberships)
    .where(eq(tenantMemberships.userId, userId))
    .where(eq(tenantMemberships.tenantId, tenantId))
    .limit(1)

  return result[0] || null
}

export async function getUserTenants(userId: string) {
  return await db
    .select({
      id: tenantMemberships.id,
      role: tenantMemberships.role,
      joinedAt: tenantMemberships.joinedAt,
      tenant: {
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        settings: tenants.settings,
        createdAt: tenants.createdAt,
      },
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
    .where(eq(tenantMemberships.userId, userId))
}