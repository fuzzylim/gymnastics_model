import { auth } from '@/lib/auth'
import { withTenantContext } from '@/lib/db/tenant-context'
import { InvoicesList } from '@/components/billing/invoices-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface InvoicesPageProps {
  params: { tenant: string }
}

export default async function InvoicesPage({ params }: InvoicesPageProps) {
  const session = await auth()
  
  if (!session?.user) {
    return <div>Unauthorized</div>
  }

  return await withTenantContext(params.tenant, async () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-gray-600">
            View and download your billing invoices
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>
              Your invoice history and payment records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoicesList tenantId={params.tenant} />
          </CardContent>
        </Card>
      </div>
    )
  })
}