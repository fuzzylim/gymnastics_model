'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StripeProvider } from './stripe-provider'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

interface PaymentMethod {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
}

interface PaymentMethodsProps {
  tenantId: string
}

function AddPaymentMethodForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    setError(undefined)

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing/payment-methods`,
        },
        redirect: 'if_required',
      })

      if (error) {
        setError(error.message || 'Failed to add payment method')
      } else {
        onSuccess()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Button 
        type="submit" 
        disabled={!stripe || !elements || isLoading}
        className="w-full"
      >
        {isLoading ? 'Adding...' : 'Add Payment Method'}
      </Button>
    </form>
  )
}

export function PaymentMethods({ tenantId }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [setupClientSecret, setSetupClientSecret] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingMethod, setIsAddingMethod] = useState(false)

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/billing/payment-methods')
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data.paymentMethods || [])
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createSetupIntent = async () => {
    try {
      const response = await fetch('/api/billing/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      })

      if (response.ok) {
        const { clientSecret } = await response.json()
        setSetupClientSecret(clientSecret)
        setIsAddingMethod(true)
      }
    } catch (error) {
      console.error('Failed to create setup intent:', error)
    }
  }

  const deletePaymentMethod = async (paymentMethodId: string) => {
    try {
      const response = await fetch(`/api/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId))
      }
    } catch (error) {
      console.error('Failed to delete payment method:', error)
    }
  }

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1)
  }

  const handleAddMethodSuccess = () => {
    setIsAddingMethod(false)
    setSetupClientSecret(undefined)
    fetchPaymentMethods()
  }

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your payment methods for billing and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No payment methods added yet
            </p>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs font-semibold">
                      {method.card?.brand?.slice(0, 2).toUpperCase() || 'PM'}
                    </div>
                    <div>
                      <p className="font-medium">
                        {method.card ? formatCardBrand(method.card.brand) : 'Payment Method'} 
                        {method.card && ` •••• ${method.card.last4}`}
                      </p>
                      {method.card && (
                        <p className="text-sm text-gray-500">
                          Expires {method.card.exp_month}/{method.card.exp_year}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePaymentMethod(method.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!isAddingMethod && (
            <Button 
              onClick={createSetupIntent}
              variant="outline" 
              className="w-full"
            >
              Add Payment Method
            </Button>
          )}
        </CardContent>
      </Card>

      {isAddingMethod && setupClientSecret && (
        <Card>
          <CardHeader>
            <CardTitle>Add Payment Method</CardTitle>
            <CardDescription>
              Add a new payment method to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StripeProvider clientSecret={setupClientSecret}>
              <AddPaymentMethodForm onSuccess={handleAddMethodSuccess} />
            </StripeProvider>
            
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddingMethod(false)
                setSetupClientSecret(undefined)
              }}
              className="w-full mt-4"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}