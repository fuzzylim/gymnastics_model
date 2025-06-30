import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent, handleWebhookEvent } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Construct and verify webhook event
    const event = constructWebhookEvent(body, signature)

    // Handle the webhook event
    await handleWebhookEvent(event)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    
    if (error.message === 'Invalid webhook signature') {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}