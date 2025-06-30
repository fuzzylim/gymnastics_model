import { auth } from '@/lib/auth'
import { getTenantFromSlug } from '@/lib/tenant-context'
import { db } from '@/lib/db'
import { tenantMemberships, billingPlans } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getTenantSubscription, getCurrentUsage } from '@/lib/stripe'
import BillingDashboard from './billing-dashboard'

export default async function BillingPage({
  params,
}: {
  params: { tenant: string }
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const tenant = await getTenantFromSlug(params.tenant)
  if (!tenant) {
    redirect('/404')
  }

  // Check user permissions
  const membership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.tenantId, tenant.id),
      eq(tenantMemberships.userId, session.user.id)
    ),
  })

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    redirect(`/${params.tenant}/dashboard`)
  }

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
        userRole={membership.role}
      />
    </div>
  )
}