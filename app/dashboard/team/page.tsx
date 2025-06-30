import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getAuthUserWithTenant } from '@/lib/auth/session-utils'
import { db } from '@/lib/db'
import { withTenantContext } from '@/lib/db/tenant-context'
import { tenantMemberships } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { TeamMembersList } from './components/team-members-list'
import { InviteMemberButton } from './components/invite-member-button'

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const userWithTenant = await getAuthUserWithTenant()
  if (!userWithTenant) {
    redirect('/onboarding')
  }

  // Get all team members
  const members = await withTenantContext(userWithTenant.tenantId, async (db) => {
    return await db.query.tenantMemberships.findMany({
      where: eq(tenantMemberships.tenantId, userWithTenant.tenantId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
            image: true,
            createdAt: true,
          },
        },
        inviter: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: (memberships: any, { desc }: any) => [desc(memberships.joinedAt)],
    })
  })

  const canInvite = ['owner', 'admin'].includes(userWithTenant.role || '')

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
              <p className="mt-2 text-sm text-gray-700">
                Manage your team members and their roles
              </p>
            </div>
            {canInvite && (
              <div className="mt-4 sm:mt-0">
                <InviteMemberButton userWithTenant={userWithTenant} />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <TeamMembersList 
              members={members} 
              currentUser={userWithTenant}
            />
          </div>
        </div>
      </div>
    </div>
  )
}