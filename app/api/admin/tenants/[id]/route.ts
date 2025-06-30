import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper admin role checking
    // For now, any authenticated user can delete tenants

    const tenantId = params.id

    // Check if tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Delete the tenant (this will cascade to memberships due to foreign key)
    await db.delete(tenants).where(eq(tenants.id, tenantId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete tenant:', error)
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper admin role checking

    const tenantId = params.id
    const body = await request.json()

    // Check if tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Update tenant
    const [updatedTenant] = await db
      .update(tenants)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning()

    return NextResponse.json({ tenant: updatedTenant })
  } catch (error) {
    console.error('Failed to update tenant:', error)
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    )
  }
}