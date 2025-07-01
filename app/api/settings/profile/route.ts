import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { withTenantContext } from '@/lib/db/tenant-context'
import { tenants, tenantMemberships } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for tenant profile update
const tenantProfileSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional().nullable(),
  slug: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  domain: z.string().optional().nullable(),
})

// PATCH /api/settings/profile - Update tenant profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = tenantProfileSchema.parse(body)

    // Verify user has permission to update tenant profile (owner only)
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, session.user.id)
      ),
    })

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ 
        error: 'Only tenant owners can update tenant profile' 
      }, { status: 403 })
    }

    // Check if slug is already taken by another tenant
    if (validatedData.slug) {
      const existingTenant = await db.query.tenants.findFirst({
        where: and(
          eq(tenants.slug, validatedData.slug),
          ne(tenants.id, tenantId)
        ),
      })

      if (existingTenant) {
        return NextResponse.json({ 
          error: 'This URL slug is already taken' 
        }, { status: 409 })
      }
    }

    // Check if domain is already taken by another tenant
    if (validatedData.domain) {
      const existingTenant = await db.query.tenants.findFirst({
        where: and(
          eq(tenants.domain, validatedData.domain),
          ne(tenants.id, tenantId)
        ),
      })

      if (existingTenant) {
        return NextResponse.json({ 
          error: 'This domain is already in use' 
        }, { status: 409 })
      }
    }

    // Update tenant profile
    const [updatedTenant] = await withTenantContext(tenantId, async (db) => {
      return await db.update(tenants)
        .set({
          name: validatedData.name,
          description: validatedData.description,
          slug: validatedData.slug,
          domain: validatedData.domain || null,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning({
          id: tenants.id,
          name: tenants.name,
          description: tenants.description,
          slug: tenants.slug,
          domain: tenants.domain,
          updatedAt: tenants.updatedAt,
        })
    })

    console.log(`Tenant profile updated for ${tenantId} by user ${session.user.id}`)

    return NextResponse.json({ 
      message: 'Tenant profile updated successfully',
      tenant: updatedTenant
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error updating tenant profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}