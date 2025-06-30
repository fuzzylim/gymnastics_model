import { headers } from 'next/headers'
import { getTenantBySlug } from '../db/tenant-utils'
import type { Tenant } from '../db/schema'

/**
 * Get tenant context from middleware headers
 * This runs on the server side and can access the database
 */
export async function getTenantFromHeaders(): Promise<Tenant | null> {
  const headersList = headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  
  if (!tenantSlug) {
    return null
  }

  try {
    return await getTenantBySlug(tenantSlug)
  } catch (error) {
    console.error('Failed to resolve tenant:', error)
    return null
  }
}

/**
 * Get current user ID from middleware headers
 */
export function getUserFromHeaders(): string | null {
  const headersList = headers()
  return headersList.get('x-user-id')
}

/**
 * Get both tenant and user from headers
 */
export async function getTenantAndUserFromHeaders(): Promise<{
  tenant: Tenant | null
  userId: string | null
}> {
  const [tenant, userId] = await Promise.all([
    getTenantFromHeaders(),
    Promise.resolve(getUserFromHeaders())
  ])

  return { tenant, userId }
}