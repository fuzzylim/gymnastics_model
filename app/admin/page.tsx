import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tenants, users, tenantMemberships, subscriptions } from '@/lib/db/schema'
import { count, eq, sql } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
  const session = await auth()
  
  // Get system metrics
  const [
    totalTenants,
    totalUsers, 
    totalMemberships,
    activeSubscriptions,
    recentTenants,
    recentUsers,
  ] = await Promise.all([
    db.select({ count: count() }).from(tenants),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(tenantMemberships),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, 'active')),
    db.query.tenants.findMany({
      orderBy: (tenants, { desc }) => [desc(tenants.createdAt)],
      limit: 5,
      with: {
        memberships: {
          limit: 1,
          with: {
            user: true,
          },
        },
      },
    }),
    db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
      limit: 5,
    }),
  ])

  const metrics = [
    {
      title: 'Total Tenants',
      value: totalTenants[0].count,
      description: 'Active organisations',
      icon: '🏢',
    },
    {
      title: 'Total Users',
      value: totalUsers[0].count,
      description: 'Registered users',
      icon: '👥',
    },
    {
      title: 'Total Memberships',
      value: totalMemberships[0].count,
      description: 'User-tenant relationships',
      icon: '🔗',
    },
    {
      title: 'Active Subscriptions',
      value: activeSubscriptions[0].count,
      description: 'Paying customers',
      icon: '💳',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
        <p className="text-gray-600">
          Overview of all tenants, users, and system metrics
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <span className="text-2xl">{metric.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-gray-500">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tenants</CardTitle>
            <CardDescription>
              Newly created organisations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-gray-500">/{tenant.slug}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {tenant.memberships[0]?.user?.email || 'No owner'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentTenants.length === 0 && (
                <p className="text-gray-500 text-center py-4">No tenants found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Newly registered users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{user.name || 'Unnamed User'}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-gray-500 text-center py-4">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/tenants"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium">Manage Tenants</h3>
              <p className="text-sm text-gray-600">
                View, create, and manage tenant organisations
              </p>
            </a>
            <a
              href="/admin/users"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium">Manage Users</h3>
              <p className="text-sm text-gray-600">
                View and manage user accounts
              </p>
            </a>
            <a
              href="/admin/billing-plans"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium">Billing Plans</h3>
              <p className="text-sm text-gray-600">
                Configure subscription plans and pricing
              </p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}