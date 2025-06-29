import { eq, and } from 'drizzle-orm'
import { db } from './index'
import { tenants, users, tenantMemberships, type Tenant, type User, type TenantMembership } from './schema'

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1)

  return result[0] || null
}

/**
 * Get tenant by domain
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.domain, domain))
    .limit(1)

  return result[0] || null
}

/**
 * Get user's tenants with their roles
 */
export async function getUserTenants(userId: string): Promise<(TenantMembership & { tenant: Tenant })[]> {
  return await db
    .select({
      id: tenantMemberships.id,
      tenantId: tenantMemberships.tenantId,
      userId: tenantMemberships.userId,
      role: tenantMemberships.role,
      invitedBy: tenantMemberships.invitedBy,
      invitedAt: tenantMemberships.invitedAt,
      joinedAt: tenantMemberships.joinedAt,
      createdAt: tenantMemberships.createdAt,
      updatedAt: tenantMemberships.updatedAt,
      tenant: {
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        description: tenants.description,
        domain: tenants.domain,
        settings: tenants.settings,
        subscriptionStatus: tenants.subscriptionStatus,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      }
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
    .where(eq(tenantMemberships.userId, userId))
}

/**
 * Check if user has access to a tenant
 */
export async function userHasTenantAccess(userId: string, tenantId: string): Promise<boolean> {
  const result = await db
    .select({ id: tenantMemberships.id })
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.userId, userId),
        eq(tenantMemberships.tenantId, tenantId)
      )
    )
    .limit(1)

  return result.length > 0
}

/**
 * Get user's role in a tenant
 */
export async function getUserTenantRole(userId: string, tenantId: string): Promise<string | null> {
  const result = await db
    .select({ role: tenantMemberships.role })
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.userId, userId),
        eq(tenantMemberships.tenantId, tenantId)
      )
    )
    .limit(1)

  return result[0]?.role || null
}

/**
 * Get tenant members with user details
 */
export async function getTenantMembers(tenantId: string): Promise<(TenantMembership & { user: User })[]> {
  return await db
    .select({
      id: tenantMemberships.id,
      tenantId: tenantMemberships.tenantId,
      userId: tenantMemberships.userId,
      role: tenantMemberships.role,
      invitedBy: tenantMemberships.invitedBy,
      invitedAt: tenantMemberships.invitedAt,
      joinedAt: tenantMemberships.joinedAt,
      createdAt: tenantMemberships.createdAt,
      updatedAt: tenantMemberships.updatedAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
        image: users.image,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }
    })
    .from(tenantMemberships)
    .innerJoin(users, eq(tenantMemberships.userId, users.id))
    .where(eq(tenantMemberships.tenantId, tenantId))
}

/**
 * Create a new tenant with owner
 */
export async function createTenantWithOwner(
  tenantData: {
    slug: string
    name: string
    description?: string
  },
  ownerId: string
): Promise<{ tenant: Tenant; membership: TenantMembership }> {
  return await db.transaction(async (tx) => {
    // Create tenant
    const [tenant] = await tx
      .insert(tenants)
      .values({
        slug: tenantData.slug,
        name: tenantData.name,
        description: tenantData.description,
      })
      .returning()

    // Create owner membership
    const [membership] = await tx
      .insert(tenantMemberships)
      .values({
        tenantId: tenant.id,
        userId: ownerId,
        role: 'owner',
      })
      .returning()

    return { tenant, membership }
  })
}

/**
 * Invite user to tenant
 */
export async function inviteUserToTenant(
  tenantId: string,
  userEmail: string,
  role: 'admin' | 'member' | 'viewer',
  invitedBy: string
): Promise<TenantMembership> {
  return await db.transaction(async (tx) => {
    // Find or create user
    let user = await tx
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1)
      .then(result => result[0])

    if (!user) {
      const [newUser] = await tx
        .insert(users)
        .values({ email: userEmail })
        .returning()
      user = newUser
    }

    // Create membership
    const [membership] = await tx
      .insert(tenantMemberships)
      .values({
        tenantId,
        userId: user.id,
        role,
        invitedBy,
        invitedAt: new Date(),
      })
      .returning()

    return membership
  })
}