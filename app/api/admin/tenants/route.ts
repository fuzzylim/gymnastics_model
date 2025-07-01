import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tenants, users, tenantMemberships } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  description: z.string().optional(),
  ownerEmail: z.string().email('Invalid email format'),
  domain: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper admin role checking
    // For now, any authenticated user can access admin functions

    // Get all tenants with basic info
    const allTenants = await db.query.tenants.findMany({
      orderBy: (tenants, { desc }) => [desc(tenants.createdAt)],
    })

    return NextResponse.json({ tenants: allTenants })
  } catch (error) {
    console.error('Failed to fetch tenants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper admin role checking
    // For now, any authenticated user can create tenants

    const body = await request.json()
    const { name, slug, description, ownerEmail, domain } = createTenantSchema.parse(body)

    // Check if slug is already taken
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Slug is already taken' },
        { status: 400 }
      )
    }

    // Check if domain is already taken (if provided)
    if (domain) {
      const existingDomain = await db.query.tenants.findFirst({
        where: eq(tenants.domain, domain),
      })

      if (existingDomain) {
        return NextResponse.json(
          { error: 'Domain is already taken' },
          { status: 400 }
        )
      }
    }

    // Create or find the owner user
    let ownerUser = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    })

    if (!ownerUser) {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: ownerEmail,
          name: ownerEmail.split('@')[0], // Use email prefix as default name
        })
        .returning()
      
      ownerUser = newUser
    }

    // Create the tenant
    const [newTenant] = await db
      .insert(tenants)
      .values({
        name,
        slug,
        description: description || null,
        domain: domain || null,
      })
      .returning()

    // Create owner membership
    await db.insert(tenantMemberships).values({
      tenantId: newTenant.id,
      userId: ownerUser.id,
      role: 'owner',
      joinedAt: new Date(),
    })

    return NextResponse.json({
      tenant: newTenant,
      owner: ownerUser,
    })
  } catch (error) {
    console.error('Failed to create tenant:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}