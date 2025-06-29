import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantByDomain, getTenantBySlug } from './lib/db/tenant-utils'
import { auth } from './lib/auth/config'

/**
 * Middleware for tenant resolution and authentication
 */
export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return NextResponse.next()
  }

  // Get authentication session
  const session = await auth()

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/auth/error',
  ]

  // Check if the current path is public (considering tenant prefixes)
  const isPublicRoute = publicRoutes.some(route => {
    return pathname === route || pathname.endsWith(route)
  })

  // Authentication check for protected routes
  if (!session && !isPublicRoute) {
    const signInUrl = new URL('/auth/login', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // If authenticated user tries to access auth pages, redirect to dashboard
  if (session && (pathname.includes('/auth/login') || pathname.includes('/auth/register'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Skip tenant resolution for auth routes and home page
  if (
    pathname === '/' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  // Resolve tenant from subdomain
  const domainParts = hostname.split('.')
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  const isCustomDomain = !isLocalhost && domainParts.length === 2

  let subdomain: string | null = null

  // Handle different domain scenarios
  if (isLocalhost) {
    // Extract tenant from first path segment for local development
    // e.g. localhost:3000/tenant-slug/dashboard
    const segments = pathname.split('/')
    if (segments.length > 1 && segments[1] !== '') {
      subdomain = segments[1]
    }
  } else if (domainParts.length > 2) {
    // Extract tenant from subdomain for production
    // e.g. tenant-slug.app.com
    subdomain = domainParts[0]
  } else if (isCustomDomain) {
    // Custom domain support
    // Entire domain is mapped to a tenant
    subdomain = hostname
  }

  // If no subdomain/tenant identified, redirect to main page
  if (!subdomain) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Fetch tenant from database
  try {
    const tenant = isCustomDomain
      ? await getTenantByDomain(subdomain)
      : await getTenantBySlug(subdomain)

    if (!tenant) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Add tenant and user info to request headers
    const headers = new Headers(request.headers)
    headers.set('x-tenant-id', tenant.id)
    headers.set('x-tenant-slug', tenant.slug)
    
    if (session?.user?.id) {
      headers.set('x-user-id', session.user.id)
    }

    // For authenticated users, we could add tenant membership validation here
    // This will be implemented when we integrate with tenant context
    
    // Modify the URL for local development to remove tenant from path
    // e.g. /tenant-slug/dashboard -> /dashboard
    if (isLocalhost && pathname.startsWith(`/${subdomain}`)) {
      const newUrl = new URL(request.url)
      newUrl.pathname = pathname.replace(`/${subdomain}`, '') || '/'
      return NextResponse.rewrite(newUrl, { headers })
    }

    // For production, just add tenant headers and continue
    return NextResponse.next({ headers })
  } catch (error) {
    console.error('Tenant resolution error:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}