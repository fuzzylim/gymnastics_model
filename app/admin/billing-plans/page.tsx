import { auth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function BillingPlansPage() {
  const session = await auth()
  
  // In a real implementation, these would come from Stripe or database
  const billingPlans = [
    {
      id: 'free',
      name: 'Free Plan',
      description: 'Perfect for getting started',
      price: 0,
      currency: 'AUD',
      interval: 'month',
      active: true,
      features: [
        'Up to 5 team members',
        'Basic dashboard',
        'Email support',
        '1GB storage',
      ],
      limits: {
        users: 5,
        storage: '1GB',
        apiCalls: 1000,
      },
      subscribers: 245,
    },
    {
      id: 'starter',
      name: 'Starter Plan',
      description: 'For growing teams',
      price: 29,
      currency: 'AUD',
      interval: 'month',
      active: true,
      features: [
        'Up to 25 team members',
        'Advanced analytics',
        'Priority support',
        '10GB storage',
        'Custom branding',
      ],
      limits: {
        users: 25,
        storage: '10GB',
        apiCalls: 10000,
      },
      subscribers: 89,
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      description: 'For established organisations',
      price: 99,
      currency: 'AUD',
      interval: 'month',
      active: true,
      features: [
        'Up to 100 team members',
        'Advanced integrations',
        '24/7 support',
        '100GB storage',
        'Custom domain',
        'API access',
      ],
      limits: {
        users: 100,
        storage: '100GB',
        apiCalls: 100000,
      },
      subscribers: 34,
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      description: 'For large organisations',
      price: 299,
      currency: 'AUD',
      interval: 'month',
      active: true,
      features: [
        'Unlimited team members',
        'Enterprise integrations',
        'Dedicated support',
        'Unlimited storage',
        'White-label solution',
        'SLA guarantee',
      ],
      limits: {
        users: 'unlimited',
        storage: 'unlimited',
        apiCalls: 'unlimited',
      },
      subscribers: 12,
    },
  ]

  const totalSubscribers = billingPlans.reduce((sum, plan) => sum + plan.subscribers, 0)
  const totalRevenue = billingPlans.reduce((sum, plan) => sum + (plan.price * plan.subscribers), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing Plans Management</h1>
          <p className="text-gray-600">
            Configure subscription plans and pricing
          </p>
        </div>
        <Button>
          + Create New Plan
        </Button>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers}</div>
            <p className="text-xs text-gray-500">Across all plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString('en-AU')}
            </div>
            <p className="text-xs text-gray-500">AUD per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Revenue Per User</CardTitle>
            <span className="text-2xl">📊</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(totalRevenue / totalSubscribers).toLocaleString('en-AU')}
            </div>
            <p className="text-xs text-gray-500">AUD per subscriber</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {billingPlans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {plan.active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </div>
                  {plan.price > 0 && (
                    <div className="text-sm text-gray-500">/{plan.interval}</div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Subscriber Count */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Current Subscribers</span>
                <span className="text-lg font-bold text-blue-600">{plan.subscribers}</span>
              </div>

              {/* Plan Limits */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Plan Limits</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Team Members:</span>
                    <span className="font-medium">{plan.limits.users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span className="font-medium">{plan.limits.storage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Calls:</span>
                    <span className="font-medium">{plan.limits.apiCalls.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
                <ul className="space-y-1 text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Revenue */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Monthly Revenue</span>
                <span className="text-lg font-bold text-green-600">
                  ${(plan.price * plan.subscribers).toLocaleString('en-AU')}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Edit Plan
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  View Subscribers
                </Button>
                <Button 
                  variant={plan.active ? "destructive" : "default"} 
                  size="sm"
                >
                  {plan.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Comparison</CardTitle>
          <CardDescription>
            Side-by-side comparison of all billing plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Feature</th>
                  {billingPlans.map((plan) => (
                    <th key={plan.id} className="text-center py-3 px-4 font-medium text-gray-900">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Price</td>
                  {billingPlans.map((plan) => (
                    <td key={plan.id} className="text-center py-3 px-4">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Team Members</td>
                  {billingPlans.map((plan) => (
                    <td key={plan.id} className="text-center py-3 px-4">
                      {plan.limits.users}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Storage</td>
                  {billingPlans.map((plan) => (
                    <td key={plan.id} className="text-center py-3 px-4">
                      {plan.limits.storage}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Subscribers</td>
                  {billingPlans.map((plan) => (
                    <td key={plan.id} className="text-center py-3 px-4 font-medium">
                      {plan.subscribers}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}