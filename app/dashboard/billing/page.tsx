import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserWithTenant } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db'
import { billingPlans } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getTenantSubscription, getCurrentUsage } from '@/lib/stripe'
import BillingDashboard from '../../[tenant]/settings/billing/billing-dashboard'

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const userWithTenant = await getUserWithTenant(session.user.id)
  if (!userWithTenant || userWithTenant.role !== 'owner') {
    redirect('/dashboard')
  }

  const { tenant } = userWithTenant

  // Get current subscription
  let subscriptionData = null
  try {
    subscriptionData = await getTenantSubscription(tenant.id)
  } catch (error) {
    console.error('Failed to fetch subscription:', error)
  }

  // Get current usage
  let currentUsage = {}
  try {
    currentUsage = await getCurrentUsage(tenant.id)
  } catch (error) {
    console.error('Failed to fetch usage:', error)
  }

  // Get all available plans
  const plans = await db.query.billingPlans.findMany({
    where: eq(billingPlans.active, true),
    orderBy: (plans, { asc }) => [asc(plans.amount)],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-gray-600">
          Manage your subscription, view usage, and billing history.
        </p>
      </div>

      <BillingDashboard
        tenant={tenant}
        subscription={subscriptionData?.dbSubscription || null}
        currentUsage={currentUsage}
        availablePlans={plans}
        userRole={userWithTenant.role}
      />
    </div>
  )
}