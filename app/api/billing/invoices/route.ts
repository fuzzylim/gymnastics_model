import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { withTenantContext } from '@/lib/db/tenant-context'
import { invoices } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenantId' },
        { status: 400 }
      )
    }

    return await withTenantContext(tenantId, async (db) => {
      // Get invoices for the tenant
      const tenantInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId))
        .orderBy(invoices.created)

      return NextResponse.json({
        invoices: tenantInvoices,
      })
    })
  } catch (error) {
    console.error('Invoices fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}