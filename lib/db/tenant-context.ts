import { and, eq, sql } from 'drizzle-orm'
import { db as database, client } from './index'
import { tenants, tenantMemberships, users, User, Tenant, TenantMembership } from './schema'

/**
 * Tenant-aware database context following best practices
 * All queries should go through these functions to ensure proper tenant isolation
 */

/**
 * Execute database operations within a tenant context
 * This sets the tenant_id at the PostgreSQL session level for Row-Level Security
 * 
 * @param tenantId - The tenant ID to scope operations to
 * @param callback - The database operations to execute
 * @returns The result of the callback
 * 
 * @example
 * const users = await withTenantContext(tenantId, async (db) => {
 *   return await db.select().from(users);
 * });
 */
export async function withTenantContext<T>(
    tenantId: string,
    callback: (db: typeof database) => Promise<T>
): Promise<T> {
    // Set the tenant context for RLS
    await client`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    
    try {
        // Execute the callback with the tenant-scoped db
        return await callback(database)
    } catch (error) {
        throw error
    }
}

export class TenantContext {
    constructor(
        private userId: string,
        private tenantId?: string
    ) { }

    /**
     * Get all tenants for the current user
     */
    async getUserTenants() {
        return await database
            .select({
                tenant: tenants,
                membership: tenantMemberships,
            })
            .from(tenantMemberships)
            .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
            .where(eq(tenantMemberships.userId, this.userId))
    }

    /**
     * Get current tenant with membership info
     */
    async getCurrentTenant() {
        if (!this.tenantId) {
            throw new Error('No tenant context set')
        }

        const result = await database
            .select({
                tenant: tenants,
                membership: tenantMemberships,
            })
            .from(tenants)
            .innerJoin(tenantMemberships, and(
                eq(tenantMemberships.tenantId, tenants.id),
                eq(tenantMemberships.userId, this.userId)
            ))
            .where(eq(tenants.id, this.tenantId))
            .limit(1)

        if (!result[0]) {
            throw new Error('User does not have access to this tenant')
        }

        return result[0]
    }

    /**
     * Check if user has specific role in current tenant
     */
    async hasRole(roles: string[]) {
        if (!this.tenantId) return false

        const membership = await database
            .select()
            .from(tenantMemberships)
            .where(and(
                eq(tenantMemberships.tenantId, this.tenantId),
                eq(tenantMemberships.userId, this.userId)
            ))
            .limit(1)

        if (!membership[0]) return false
        return roles.includes(membership[0].role)
    }

    /**
     * Get tenant-scoped database query helper
     * All data access should use this to ensure proper tenant isolation
     */
    scopedQuery() {
        if (!this.tenantId) {
            throw new Error('No tenant context set for scoped query')
        }

        return {
            /**
             * Build a tenant-scoped query for any table with tenantId
             * Automatically applies tenant filtering for security
             * @param table Any table with a tenantId column
             */
            from: <T extends { tenantId: unknown }>(table: any) => {
                return database.select().from(table).where(eq(table.tenantId, this.tenantId))
            },

            /**
             * Create new record with current tenant ID automatically applied
             * @param table The DB table
             * @param data The data to insert (tenantId will be added automatically)
             */
            insert: <T, D extends Record<string, any>>(
                table: any,
                data: Omit<D, 'tenantId'>
            ) => {
                return database.insert(table).values({
                    ...data,
                    tenantId: this.tenantId,
                })
            },

            /**
             * Update with tenant ID check for security
             * @param table The DB table
             * @param data The data to update
             */
            update: <T, D extends Record<string, any>>(
                table: any,
                data: Omit<D, 'tenantId'>
            ) => {
                return database
                    .update(table)
                    .set(data)
                    .where(eq(table.tenantId, this.tenantId))
            },

            /**
             * Delete with tenant ID check for security
             * @param table The DB table
             */
            delete: <T>(table: any) => {
                return database.delete(table).where(eq(table.tenantId, this.tenantId))
            },
        }
    }
}
