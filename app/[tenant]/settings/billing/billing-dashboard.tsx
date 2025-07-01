'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Tenant, Subscription, BillingPlan } from '@/lib/db/schema'

interface BillingDashboardProps {
  tenant: Tenant
  subscription: (Subscription & { plan?: BillingPlan | null }) | null
  currentUsage: Record<string, { count: number; totalAmount: number }>
  availablePlans: BillingPlan[]
  userRole: string
}

interface PlanFeatures {
  maxUsers: number
  maxStorage: number
  apiCalls: number
  features: string[]
}

export default function BillingDashboard({
  tenant,
  subscription,
  currentUsage,
  availablePlans,
  userRole,
}: BillingDashboardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCustomerPortal = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/${tenant.slug}/settings/billing`,
        }),
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        throw new Error('Failed to create portal session')
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error)
      alert('Failed to open customer portal')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/billing/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      if (response.ok) {
        const data = await response.json()
        // TODO: Implement Stripe Elements for payment
        alert('Subscription created! Payment integration pending.')
        window.location.reload()
      } else {
        throw new Error('Failed to create subscription')
      }
    } catch (error) {
      console.error('Failed to create subscription:', error)
      alert('Failed to create subscription')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const getSubscriptionStatus = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Active', variant: 'default' as const },
      trialing: { label: 'Trial', variant: 'secondary' as const },
      past_due: { label: 'Past Due', variant: 'destructive' as const },
      cancelled: { label: 'Cancelled', variant: 'outline' as const },
      incomplete: { label: 'Incomplete', variant: 'destructive' as const },
      unpaid: { label: 'Unpaid', variant: 'destructive' as const },
    }
    return statusMap[status] || { label: status, variant: 'outline' as const }
  }

  const getPlanLimits = (plan: BillingPlan): PlanFeatures => {
    const limits = plan.limits as Record<string, any>
    return {
      maxUsers: limits?.maxUsers || 0,
      maxStorage: limits?.maxStorage || 0,
      apiCalls: limits?.apiCalls || 0,
      features: (plan.features as string[]) || [],
    }
  }

  const calculateUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((current / limit) * 100, 100)
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>
            Your current plan and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{subscription.plan?.name}</h3>
                  <p className="text-gray-600">
                    {formatCurrency(subscription.plan?.amount || 0)} per{' '}
                    {subscription.plan?.interval}
                  </p>
                </div>
                <Badge {...getSubscriptionStatus(subscription.status)}>
                  {getSubscriptionStatus(subscription.status).label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Current period:</span>
                  <br />
                  {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-gray-500">Renewal:</span>
                  <br />
                  {subscription.cancelAtPeriodEnd
                    ? 'Cancels at period end'
                    : 'Auto-renews'}
                </div>
              </div>

              {userRole === 'owner' && (
                <div className="flex gap-2">
                  <Button onClick={handleCustomerPortal} disabled={isLoading}>
                    Manage Billing
                  </Button>
                  {subscription.cancelAtPeriodEnd && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement reactivation
                        alert('Reactivation not yet implemented')
                      }}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="font-semibold mb-2">No Active Subscription</h3>
              <p className="text-gray-600 mb-4">
                You&apos;re currently on a trial. Choose a plan to continue using all features.
              </p>
              <Badge variant="secondary">Trial</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Overview */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>
              Track your current usage against plan limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscription.plan && (() => {
                const limits = getPlanLimits(subscription.plan)
                return (
                  <>
                    {/* Users */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Team Members</span>
                        <span>
                          {currentUsage.users?.count || 0}
                          {limits.maxUsers === -1 ? '' : ` / ${limits.maxUsers}`}
                        </span>
                      </div>
                      {limits.maxUsers !== -1 && (
                        <Progress
                          value={calculateUsagePercentage(
                            currentUsage.users?.count || 0,
                            limits.maxUsers
                          )}
                        />
                      )}
                    </div>

                    {/* API Calls */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>API Calls</span>
                        <span>
                          {currentUsage.api_call?.count || 0}
                          {limits.apiCalls === -1 ? '' : ` / ${limits.apiCalls}`}
                        </span>
                      </div>
                      {limits.apiCalls !== -1 && (
                        <Progress
                          value={calculateUsagePercentage(
                            currentUsage.api_call?.count || 0,
                            limits.apiCalls
                          )}
                        />
                      )}
                    </div>

                    {/* Storage */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Storage (GB)</span>
                        <span>
                          {currentUsage.storage_gb?.count || 0}
                          {limits.maxStorage === -1 ? '' : ` / ${limits.maxStorage}`}
                        </span>
                      </div>
                      {limits.maxStorage !== -1 && (
                        <Progress
                          value={calculateUsagePercentage(
                            currentUsage.storage_gb?.count || 0,
                            limits.maxStorage
                          )}
                        />
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      {!subscription && userRole === 'owner' && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>
              Select a plan that fits your organisation's needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {availablePlans.map((plan) => {
                const limits = getPlanLimits(plan)
                return (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-6 relative ${
                      plan.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-4 bg-blue-500">
                        Popular
                      </Badge>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <div className="text-2xl font-bold">
                          {formatCurrency(plan.amount)}
                          <span className="text-sm font-normal text-gray-500">
                            /{plan.interval}
                          </span>
                        </div>
                        {plan.description && (
                          <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          • {limits.maxUsers === -1 ? 'Unlimited' : limits.maxUsers} team members
                        </div>
                        <div>
                          • {limits.maxStorage === -1 ? 'Unlimited' : `${limits.maxStorage}GB`} storage
                        </div>
                        <div>
                          • {limits.apiCalls === -1 ? 'Unlimited' : limits.apiCalls} API calls/month
                        </div>
                        {limits.features.map((feature: string) => (
                          <div key={feature}>• {feature.replace('_', ' ')}</div>
                        ))}
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isLoading}
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {plan.trialDays ? `Start ${plan.trialDays}-day trial` : 'Subscribe'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {userRole !== 'owner' && (
        <Alert>
          <AlertDescription>
            Only the tenant owner can manage billing and subscriptions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}