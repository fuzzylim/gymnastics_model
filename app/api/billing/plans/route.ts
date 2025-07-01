import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { billingPlans } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get all active billing plans
    const plans = await db.query.billingPlans.findMany({
      where: eq(billingPlans.active, true),
      orderBy: (plans, { asc }) => [asc(plans.amount)],
    })

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Failed to fetch billing plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing plans' },
      { status: 500 }
    )
  }
}