import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { withTenantContext } from '@/lib/db/tenant-context'
import { tenantMemberships, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    // Verify user is a member of this tenant
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, session.user.id)
      ),
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all members of this tenant
    const members = await withTenantContext(tenantId, async (db) => {
      return await db.query.tenantMemberships.findMany({
        where: eq(tenantMemberships.tenantId, tenantId),
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              name: true,
              image: true,
              createdAt: true,
            },
          },
          inviter: {
            columns: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: (memberships: any, { desc }: any) => [desc(memberships.joinedAt)],
      })
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}