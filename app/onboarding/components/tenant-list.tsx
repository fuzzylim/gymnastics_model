import Link from 'next/link'

interface TenantListProps {
  tenants: Array<{
    id: string
    tenantId: string
    userId: string
    role: string
    invitedBy: string | null
    invitedAt: Date | null
    joinedAt: Date | null
    createdAt: Date
    updatedAt: Date
    tenant: {
      id: string
      slug: string
      name: string
      description: string | null
      domain: string | null
      settings: any
      subscriptionStatus: string | null
      createdAt: Date
      updatedAt: Date
    }
  }>
}

export function TenantList({ tenants }: TenantListProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'member':
        return 'bg-green-100 text-green-800'
      case 'viewer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-3">
      {tenants.map((membership) => (
        <Link
          key={membership.tenant.id}
          href={`/${membership.tenant.slug}/dashboard`}
          className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">
                {membership.tenant.name}
              </h3>
              {membership.tenant.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {membership.tenant.description}
                </p>
              )}
              <div className="flex items-center mt-2 space-x-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(membership.role)}`}
                >
                  {membership.role}
                </span>
                <span className="text-xs text-gray-500">
                  /{membership.tenant.slug}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}