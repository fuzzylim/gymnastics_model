'use client'

import { useState, useEffect } from 'react'
import { StripeProvider } from './stripe-provider'
import { CheckoutForm } from './checkout-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BillingPlan {
  id: string
  name: string
  stripePriceId: string
  amount: number
  currency: string
  interval: string
  features: {
    maxUsers: number
    maxStorage: number
    apiCalls: number
  }
}

interface SubscriptionCheckoutProps {
  plan: BillingPlan
  tenantId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function SubscriptionCheckout({ 
  plan, 
  tenantId, 
  onSuccess, 
  onCancel 
}: SubscriptionCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  const createPaymentIntent = async () => {
    setIsLoading(true)
    setError(undefined)

    try {
      const response = await fetch('/api/billing/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          priceId: plan.stripePriceId,
          tenantId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const { clientSecret } = await response.json()
      setClientSecret(clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup payment')
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatFeatureValue = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toLocaleString()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscribe to {plan.name}</CardTitle>
          <CardDescription>
            Complete your subscription to start using all features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPrice(plan.amount, plan.currency)}
                  <span className="text-sm font-normal text-gray-500">
                    /{plan.interval}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Plan Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {formatFeatureValue(plan.features.maxUsers)} team members</li>
                <li>• {formatFeatureValue(plan.features.maxStorage)} GB storage</li>
                <li>• {formatFeatureValue(plan.features.apiCalls)} API calls per month</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!clientSecret ? (
            <div className="flex gap-3">
              <Button
                onClick={createPaymentIntent}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Setting up...' : 'Continue to Payment'}
              </Button>
              <Button 
                variant="outline" 
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <StripeProvider clientSecret={clientSecret}>
              <CheckoutForm
                onSuccess={onSuccess}
                onError={setError}
                returnUrl={`${window.location.origin}/billing/success?plan=${plan.id}`}
              />
            </StripeProvider>
          )}
        </CardContent>
      </Card>
    </div>
  )
}