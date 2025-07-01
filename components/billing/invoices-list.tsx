'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Invoice {
  id: string
  stripeInvoiceId: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  created: Date
  dueDate?: Date
  invoiceUrl?: string
  invoicePdf?: string
  description?: string
}

interface InvoicesListProps {
  tenantId: string
}

export function InvoicesList({ tenantId }: InvoicesListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`/api/billing/invoices?tenantId=${tenantId}`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      } else {
        setError('Failed to fetch invoices')
      }
    } catch (err) {
      setError('Failed to fetch invoices')
    } finally {
      setIsLoading(false)
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'open':
        return 'bg-yellow-100 text-yellow-800'
      case 'void':
      case 'uncollectible':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoiceId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Failed to download invoice:', err)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [tenantId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading invoices...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <Button 
          variant="outline" 
          onClick={fetchInvoices}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-2">No invoices found</div>
        <p className="text-sm text-gray-400">
          Invoices will appear here once you have an active subscription
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
        >
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div>
                <p className="font-medium">
                  Invoice #{invoice.stripeInvoiceId.slice(-8)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(invoice.created)}
                  {invoice.dueDate && ` • Due ${formatDate(invoice.dueDate)}`}
                </p>
                {invoice.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {invoice.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-semibold">
                {formatAmount(invoice.amount, invoice.currency)}
              </p>
              <Badge
                variant="secondary"
                className={`text-xs ${getStatusColor(invoice.status)}`}
              >
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Badge>
            </div>

            <div className="flex space-x-2">
              {invoice.invoiceUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(invoice.invoiceUrl, '_blank')}
                >
                  View
                </Button>
              )}
              {invoice.invoicePdf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadInvoice(invoice.id)}
                >
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}