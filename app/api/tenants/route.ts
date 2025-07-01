import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session-utils'
import { createTenantWithOwner, getTenantBySlug } from '@/lib/db/tenant-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { name, slug, description } = await request.json()

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check if slug is already taken
    const existingTenant = await getTenantBySlug(slug)
    if (existingTenant) {
      return NextResponse.json(
        { error: 'This team URL is already taken' },
        { status: 409 }
      )
    }

    // Create tenant with the current user as owner
    const { tenant, membership } = await createTenantWithOwner(
      {
        name,
        slug,
        description,
      },
      session.user.id
    )

    return NextResponse.json({
      tenant,
      membership,
      message: 'Team created successfully',
    })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's tenants (this functionality is already in getUserTenants)
    // For now, just return a success response
    return NextResponse.json({
      message: 'Use getUserTenants function for getting user tenants',
    })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}