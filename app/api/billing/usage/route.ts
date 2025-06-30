import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTenantFromRequest } from '@/lib/tenant-context'
import { db } from '@/lib/db'
import { getCurrentUsage, getUsageSummary, recordUsageEvent } from '@/lib/stripe'
import { tenantMemberships } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const recordUsageSchema = z.object({
  eventType: z.string(),
  quantity: z.number().int().positive(),
  metadata: z.record(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await getTenantFromRequest(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check if user has access to tenant
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenant.id),
        eq(tenantMemberships.userId, session.user.id)
      ),
    })

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')

    // Get current usage
    const currentUsage = await getCurrentUsage(tenant.id)
    
    // Get usage summary for specific period if requested
    let usageSummary = null
    if (period) {
      usageSummary = await getUsageSummary(tenant.id, period)
    }

    return NextResponse.json({
      currentUsage,
      usageSummary,
      period,
    })
  } catch (error) {
    console.error('Failed to fetch usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
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

    const tenant = await getTenantFromRequest(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check if user is owner or admin
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenant.id),
        eq(tenantMemberships.userId, session.user.id)
      ),
    })

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { eventType, quantity, metadata } = recordUsageSchema.parse(body)

    // Record usage event
    const usageEvent = await recordUsageEvent({
      tenantId: tenant.id,
      eventType,
      quantity,
      metadata,
    })

    return NextResponse.json({ usageEvent })
  } catch (error) {
    console.error('Failed to record usage:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to record usage' },
      { status: 500 }
    )
  }
}