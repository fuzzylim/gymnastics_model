import Link from 'next/link'
import type { UserWithTenant } from '@/lib/types/auth'

interface QuickActionsProps {
  userWithTenant: UserWithTenant
}

export function QuickActions({ userWithTenant }: QuickActionsProps) {
  const { role } = userWithTenant

  const actions = [
    {
      name: 'Invite Team Member',
      description: 'Add new members to your team',
      href: '/dashboard/team/invite',
      icon: '👋',
      requiredRoles: ['owner', 'admin'],
    },
    {
      name: 'View Analytics',
      description: 'Check your team metrics',
      href: '/dashboard/analytics',
      icon: '📊',
    },
    {
      name: 'Update Settings',
      description: 'Manage tenant preferences',
      href: '/dashboard/settings',
      icon: '⚙️',
      requiredRoles: ['owner', 'admin'],
    },
    {
      name: 'Billing & Usage',
      description: 'View subscription details',
      href: '/dashboard/billing',
      icon: '💳',
      requiredRoles: ['owner'],
    },
  ]

  // Filter actions based on user role
  const availableActions = actions.filter(action => {
    if (!action.requiredRoles) return true
    return role && action.requiredRoles.includes(role)
  })

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="space-y-3">
          {availableActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-lg">{action.icon}</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    {action.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}