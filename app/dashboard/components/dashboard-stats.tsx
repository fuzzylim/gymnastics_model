import type { UserWithTenant } from '@/lib/types/auth'

interface DashboardStatsProps {
  metrics: {
    totalMembers: number
    activeMembers: number
    pendingInvites: number
  }
  userWithTenant: UserWithTenant
}

export function DashboardStats({ metrics, userWithTenant }: DashboardStatsProps) {
  const stats = [
    {
      name: 'Total Members',
      value: metrics.totalMembers,
      change: '+12%',
      changeType: 'positive' as const,
      icon: '👥',
    },
    {
      name: 'Active Members',
      value: metrics.activeMembers,
      change: '+8%',
      changeType: 'positive' as const,
      icon: '✅',
    },
    {
      name: 'Pending Invites',
      value: metrics.pendingInvites,
      change: metrics.pendingInvites > 0 ? 'Action needed' : 'All set',
      changeType: metrics.pendingInvites > 0 ? 'neutral' : 'positive' as const,
      icon: '⏳',
    },
    {
      name: 'Your Role',
      value: userWithTenant.role || 'Member',
      change: 'Current access level',
      changeType: 'neutral' as const,
      icon: '🎯',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {stat.name}
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                  </div>
                  <div
                    className={`ml-2 flex items-baseline text-sm font-semibold ${
                      stat.changeType === 'positive'
                        ? 'text-green-600'
                        : stat.changeType === 'negative'
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {stat.change}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}