import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tenants, tenantMemberships } from '@/lib/db/schema'
import { eq, count, desc } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import CreateTenantDialog from './create-tenant-dialog'
import TenantActionsDropdown from './tenant-actions-dropdown'

export default async function TenantsPage() {
  const session = await auth()
  
  // Get all tenants with membership counts and owner info
  const tenantsWithData = await db
    .select({
      tenant: tenants,
      memberCount: count(tenantMemberships.id),
    })
    .from(tenants)
    .leftJoin(tenantMemberships, eq(tenants.id, tenantMemberships.tenantId))
    .groupBy(tenants.id)
    .orderBy(desc(tenants.createdAt))

  // Get owner information for each tenant
  const tenantsWithOwners = await Promise.all(
    tenantsWithData.map(async (item) => {
      const owner = await db.query.tenantMemberships.findFirst({
        where: eq(tenantMemberships.tenantId, item.tenant.id),
        with: {
          user: true,
        },
        orderBy: (memberships, { asc }) => [asc(memberships.createdAt)],
      })

      return {
        ...item,
        owner: owner?.user || null,
      }
    })
  )

  const getSubscriptionStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Active', variant: 'default' as const },
      trialing: { label: 'Trial', variant: 'secondary' as const },
      past_due: { label: 'Past Due', variant: 'destructive' as const },
      cancelled: { label: 'Cancelled', variant: 'outline' as const },
      incomplete: { label: 'Incomplete', variant: 'destructive' as const },
      unpaid: { label: 'Unpaid', variant: 'destructive' as const },
    }
    return statusMap[status || 'unknown'] || { label: status || 'Unknown', variant: 'outline' as const }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-gray-600">
            Manage all tenant organisations in the system
          </p>
        </div>
        <CreateTenantDialog />
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants ({tenantsWithOwners.length})</CardTitle>
          <CardDescription>
            Complete list of tenant organisations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Organisation</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Owner</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Members</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenantsWithOwners.map((item) => {
                  const { tenant, memberCount, owner } = item
                  const statusBadge = getSubscriptionStatusBadge(tenant.subscriptionStatus)
                  
                  return (
                    <tr key={tenant.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{tenant.name}</p>
                          <p className="text-sm text-gray-500">/{tenant.slug}</p>
                          {tenant.domain && (
                            <p className="text-xs text-blue-600">{tenant.domain}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {owner ? (
                          <div>
                            <p className="text-sm font-medium">{owner?.name || 'Unnamed'}</p>
                            <p className="text-xs text-gray-500">{owner?.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No owner</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{memberCount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <TenantActionsDropdown tenant={tenant} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {tenantsWithOwners.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No tenants found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create your first tenant organisation to get started
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}