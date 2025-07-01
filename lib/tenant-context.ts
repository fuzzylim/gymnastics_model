// Import the actual implementations
import { getTenantBySlug, getTenantByDomain } from './db/tenant-utils'

// Re-export tenant utilities for API usage
export { getTenantBySlug, getTenantByDomain } from './db/tenant-utils'

// Alias for commonly used functions
export const getTenantFromSlug = getTenantBySlug
export const getTenantContext = async (slug: string) => {
  const tenant = await getTenantBySlug(slug)
  return { tenant }
}

// For API route usage
export const getTenantFromRequest = async (request: Request) => {
  const url = new URL(request.url)
  const host = url.hostname
  
  // Extract subdomain from hostname
  const subdomain = host.split('.')[0]
  
  // If we have a subdomain that's not 'www', use it as tenant slug
  if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
    return await getTenantBySlug(subdomain)
  }
  
  // Otherwise, check for tenant slug in headers or path
  const tenantSlug = url.pathname.split('/')[1]
  if (tenantSlug) {
    return await getTenantBySlug(tenantSlug)
  }
  
  return null
}