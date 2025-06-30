import { getAuthSession } from '@/lib/auth/session-utils'
import { getUserTenants } from '@/lib/db/tenant-utils'
import { redirect } from 'next/navigation'
import { CreateTenantForm } from './components/create-tenant-form'
import { TenantList } from './components/tenant-list'

export default async function OnboardingPage() {
  const session = await getAuthSession()
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  // Get user's existing tenants
  const userTenants = await getUserTenants(session.user.id)

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Gymnastics Model
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Get started by joining a team or creating your own
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Show existing tenants if any */}
          {userTenants.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Your Teams
              </h3>
              <TenantList tenants={userTenants} />
            </div>
          )}

          {/* Create new tenant option */}
          <div className="bg-white py-8 px-6 shadow rounded-lg">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Create a New Team
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Start your own team and invite others to join
              </p>
            </div>
            
            <CreateTenantForm userId={session.user.id} />
          </div>

          {/* Waiting for invitation */}
          <div className="bg-white py-8 px-6 shadow rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Waiting for an Invitation?
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                If someone invited you to their team, check your email for an invitation link.
              </p>
              <p className="text-xs text-gray-400">
                If you can't find the invitation, ask your team admin to resend it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}