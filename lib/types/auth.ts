/**
 * Shared types for authentication and user context
 */

export interface AuthUser {
  id?: string
  email?: string | null
  name?: string | null
  image?: string | null
}

export interface UserWithTenant {
  user: AuthUser
  tenantId: string
  tenantSlug: string | null
  role: string | null
}