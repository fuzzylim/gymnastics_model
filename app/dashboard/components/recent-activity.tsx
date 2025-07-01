import type { UserWithTenant } from '@/lib/types/auth'

interface RecentActivityProps {
  userWithTenant: UserWithTenant
}

export function RecentActivity({ userWithTenant }: RecentActivityProps) {
  // Mock activity data - in a real app, this would come from a database
  const activities = [
    {
      id: 1,
      type: 'member_joined',
      description: 'New team member joined',
      user: 'john.doe@example.com',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      icon: '👋',
    },
    {
      id: 2,
      type: 'settings_updated',
      description: 'Tenant settings updated',
      user: userWithTenant.user.email,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      icon: '⚙️',
    },
    {
      id: 3,
      type: 'invitation_sent',
      description: 'Invitation sent to new member',
      user: userWithTenant.user.email,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      icon: '📧',
    },
    {
      id: 4,
      type: 'login',
      description: 'User signed in',
      user: userWithTenant.user.email,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      icon: '🔐',
    },
  ]

  const getRelativeTime = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-gray-400 text-4xl mb-2">📋</div>
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {activities.map((activity, activityIdx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== activities.length - 1 ? (
                      <span
                        className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-lg">{activity.icon}</span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">
                              {activity.description}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">
                            by {activity.user}
                          </p>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          <time dateTime={activity.timestamp.toISOString()}>
                            {getRelativeTime(activity.timestamp)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t">
          <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            View all activity →
          </button>
        </div>
      </div>
    </div>
  )
}