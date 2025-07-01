import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tenants, users, tenantMemberships, subscriptions } from '@/lib/db/schema'
import { count, eq, sql, gte } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AnalyticsPage() {
  
  // Get date ranges
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Get analytics data
  const [
    totalMetrics,
    currentMonthMetrics,
    lastMonthMetrics,
    recentGrowth,
    subscriptionBreakdown,
    tenantGrowthData,
  ] = await Promise.all([
    // Total metrics
    Promise.all([
      db.select({ count: count() }).from(tenants),
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(tenantMemberships),
      db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, 'active')),
    ]),
    
    // Current month metrics
    Promise.all([
      db.select({ count: count() }).from(tenants).where(gte(tenants.createdAt, startOfMonth)),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, startOfMonth)),
      db.select({ count: count() }).from(tenantMemberships).where(gte(tenantMemberships.createdAt, startOfMonth)),
    ]),
    
    // Last month metrics
    Promise.all([
      db.select({ count: count() }).from(tenants).where(
        sql`${tenants.createdAt} >= ${startOfLastMonth} AND ${tenants.createdAt} <= ${endOfLastMonth}`
      ),
      db.select({ count: count() }).from(users).where(
        sql`${users.createdAt} >= ${startOfLastMonth} AND ${users.createdAt} <= ${endOfLastMonth}`
      ),
    ]),
    
    // Recent 30-day growth
    Promise.all([
      db.select({ count: count() }).from(tenants).where(gte(tenants.createdAt, thirtyDaysAgo)),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
    ]),

    // Subscription status breakdown
    db.select({
      status: subscriptions.status,
      count: count(),
    }).from(subscriptions).groupBy(subscriptions.status),

    // Tenant growth over last 6 months (monthly)
    db.select({
      month: sql<string>`to_char(${tenants.createdAt}, 'YYYY-MM')`,
      count: count(),
    }).from(tenants)
    .where(gte(tenants.createdAt, new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)))
    .groupBy(sql`to_char(${tenants.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${tenants.createdAt}, 'YYYY-MM')`),
  ])

  const [totalTenants, totalUsers, , activeSubscriptions] = totalMetrics
  const [newTenantsThisMonth, newUsersThisMonth, newMembershipsThisMonth] = currentMonthMetrics
  const [newTenantsLastMonth, newUsersLastMonth] = lastMonthMetrics
  const [tenantGrowth30d, userGrowth30d] = recentGrowth

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const tenantGrowthPercent = calculateGrowth(newTenantsThisMonth[0].count, newTenantsLastMonth[0].count)
  const userGrowthPercent = calculateGrowth(newUsersThisMonth[0].count, newUsersLastMonth[0].count)

  const metrics = [
    {
      title: 'Total Tenants',
      value: totalTenants[0].count,
      change: tenantGrowthPercent,
      changeLabel: 'vs last month',
      icon: '🏢',
    },
    {
      title: 'Total Users',
      value: totalUsers[0].count,
      change: userGrowthPercent,
      changeLabel: 'vs last month',
      icon: '👥',
    },
    {
      title: 'New Tenants (30d)',
      value: tenantGrowth30d[0].count,
      change: null,
      changeLabel: 'last 30 days',
      icon: '📈',
    },
    {
      title: 'Active Subscriptions',
      value: activeSubscriptions[0].count,
      change: null,
      changeLabel: 'currently active',
      icon: '💳',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
        <p className="text-gray-600">
          System performance metrics and growth analytics
        </p>
      </div>

      {/* Key Metrics Grid */}
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
              <div className="flex items-center text-xs text-gray-500 mt-1">
                {metric.change !== null && (
                  <span className={metric.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {metric.change >= 0 ? '+' : ''}{metric.change}%{' '}
                  </span>
                )}
                <span>{metric.changeLabel}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>
              Breakdown of subscription statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptionBreakdown.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        item.status === 'active' ? 'bg-green-500' :
                        item.status === 'trialing' ? 'bg-blue-500' :
                        item.status === 'past_due' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}
                    />
                    <span className="text-sm capitalize">{item.status}</span>
                  </div>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
              {subscriptionBreakdown.length === 0 && (
                <p className="text-gray-500 text-center py-4">No subscription data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Growth Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Growth</CardTitle>
            <CardDescription>
              Tenant registrations over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenantGrowthData.map((item) => (
                <div key={item.month} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(item.month + '-01').toLocaleDateString('en-AU', { 
                      year: 'numeric', 
                      month: 'short' 
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="bg-blue-500 h-2 rounded"
                      style={{ 
                        width: `${Math.max((item.count / Math.max(...tenantGrowthData.map(d => d.count))) * 100, 5)}px`,
                        minWidth: '5px'
                      }}
                    />
                    <span className="text-sm font-medium w-8">{item.count}</span>
                  </div>
                </div>
              ))}
              {tenantGrowthData.length === 0 && (
                <p className="text-gray-500 text-center py-4">No growth data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity (30 days)</CardTitle>
          <CardDescription>
            Summary of recent system activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{tenantGrowth30d[0].count}</p>
              <p className="text-sm text-gray-600">New Tenants</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{userGrowth30d[0].count}</p>
              <p className="text-sm text-gray-600">New Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{newMembershipsThisMonth[0].count}</p>
              <p className="text-sm text-gray-600">New Memberships</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}