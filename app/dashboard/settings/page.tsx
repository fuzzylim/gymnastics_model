import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getAuthUserWithTenant } from '@/lib/auth/session-utils'
import { SettingsTabs } from './components/settings-tabs'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { mergeWithDefaults, type TenantSettings } from '@/lib/types/tenant-settings'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const userWithTenant = await getAuthUserWithTenant()
  if (!userWithTenant) {
    redirect('/onboarding')
  }

  // Only owners and admins can access settings
  if (!['owner', 'admin'].includes(userWithTenant.role || '')) {
    redirect('/dashboard')
  }

  // Get tenant information and settings
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, userWithTenant.tenantId),
    columns: {
      id: true,
      name: true,
      slug: true,
      description: true,
      domain: true,
      settings: true,
      subscriptionStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!tenant) {
    redirect('/dashboard')
  }

  const settings = mergeWithDefaults(tenant.settings as Partial<TenantSettings>)

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your tenant settings and preferences
          </p>
        </div>

        <SettingsTabs 
          tenant={tenant}
          settings={settings}
          userRole={userWithTenant.role || 'member'}
        />
      </div>
    </div>
  )
}