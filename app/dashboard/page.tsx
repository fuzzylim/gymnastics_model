import { getAuthUserWithTenant } from '@/lib/auth/session-utils'
import { getTenantMembers } from '@/lib/db/tenant-utils'
import { DashboardStats } from './components/dashboard-stats'
import { RecentActivity } from './components/recent-activity'
import { QuickActions } from './components/quick-actions'

export default async function DashboardPage() {
  const userWithTenant = await getAuthUserWithTenant()
  const teamMembers = await getTenantMembers(userWithTenant.tenantId)

  // Calculate some basic metrics
  const metrics = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(member => member.joinedAt).length,
    pendingInvites: teamMembers.filter(member => !member.joinedAt).length,
    // Add more metrics as needed
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {userWithTenant.user.name || userWithTenant.user.email}
        </p>
      </div>

      {/* Stats overview */}
      <DashboardStats metrics={metrics} userWithTenant={userWithTenant} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-1">
          <QuickActions userWithTenant={userWithTenant} />
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2">
          <RecentActivity userWithTenant={userWithTenant} />
        </div>
      </div>

      {/* Additional sections can be added here */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Team Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Members</span>
              <span className="text-sm font-medium">{metrics.totalMembers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Active Members</span>
              <span className="text-sm font-medium">{metrics.activeMembers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Pending Invites</span>
              <span className="text-sm font-medium">{metrics.pendingInvites}</span>
            </div>
          </div>
          {userWithTenant.role && ['owner', 'admin'].includes(userWithTenant.role) && (
            <div className="mt-4 pt-4 border-t">
              <a
                href="/dashboard/team"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Manage team →
              </a>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Your Role</span>
              <span className="text-sm font-medium capitalize">
                {userWithTenant.role || 'Member'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Tenant</span>
              <span className="text-sm font-medium">
                {userWithTenant.tenantSlug}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Member Since</span>
              <span className="text-sm font-medium">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}