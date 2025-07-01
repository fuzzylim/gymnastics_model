import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

interface RouteContext {
  params: { id: string }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paymentMethodId } = params

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Missing payment method ID' },
        { status: 400 }
      )
    }

    // Detach payment method from Stripe
    await stripe.paymentMethods.detach(paymentMethodId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment method deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    )
  }
}