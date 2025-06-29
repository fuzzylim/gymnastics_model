import { headers } from 'next/headers'
import { auth } from './config'
import { userHasTenantAccess, getUserTenantRole } from '@/lib/db/tenant-utils'

/**
 * Get the current authenticated user session
 */
export async function getAuthSession() {
  return await auth()
}

/**
 * Get the current tenant ID from request headers (set by middleware)
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-id')
}

/**
 * Get the current tenant slug from request headers (set by middleware)
 */
export async function getCurrentTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

/**
 * Get the current user ID from request headers (set by middleware)
 */
export async function getCurrentUserId(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-user-id')
}

/**
 * Get authenticated user with tenant context validation
 */
export async function getAuthUserWithTenant() {
  const session = await getAuthSession()
  const tenantId = await getCurrentTenantId()
  
  if (!session?.user?.id) {
    throw new Error('User not authenticated')
  }
  
  if (!tenantId) {
    throw new Error('No tenant context')
  }
  
  // Verify user has access to the current tenant
  const hasAccess = await userHasTenantAccess(session.user.id, tenantId)
  if (!hasAccess) {
    throw new Error('User does not have access to this tenant')
  }
  
  // Get user's role in the tenant
  const role = await getUserTenantRole(session.user.id, tenantId)
  
  return {
    user: session.user,
    tenantId,
    tenantSlug: await getCurrentTenantSlug(),
    role,
  }
}

/**
 * Check if the current user has the required role(s) in the current tenant
 */
export async function requireTenantRole(allowedRoles: string[]) {
  const { role } = await getAuthUserWithTenant()
  
  if (!role || !allowedRoles.includes(role)) {
    throw new Error(`Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`)
  }
  
  return true
}

/**
 * Check if the current user is an admin or owner in the current tenant
 */
export async function requireTenantAdmin() {
  return await requireTenantRole(['owner', 'admin'])
}

/**
 * Check if the current user is the owner of the current tenant
 */
export async function requireTenantOwner() {
  return await requireTenantRole(['owner'])
}

/**
 * Get tenant-scoped context for API routes
 */
export async function getTenantContext() {
  const session = await getAuthSession()
  const tenantId = await getCurrentTenantId()
  const userId = session?.user?.id
  
  return {
    session,
    tenantId,
    tenantSlug: await getCurrentTenantSlug(),
    userId,
    isAuthenticated: !!session,
    hasTenantContext: !!tenantId,
  }
}