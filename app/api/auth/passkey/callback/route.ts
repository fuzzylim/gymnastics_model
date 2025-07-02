import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth/config'
import { cookies } from 'next/headers'

/**
 * This endpoint handles the callback after successful passkey verification
 * It creates a proper NextAuth session using the credentials provider
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      )
    }

    // Create a NextAuth session using the credentials provider
    // This will handle JWT creation and cookie setting properly
    const result = await signIn('credentials', {
      redirect: false,
      email,
      userId,
      // Special flag to indicate this is from passkey verification
      isPasskeyAuth: true,
    })

    if (result?.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Session created successfully',
    })
  } catch (error) {
    console.error('Error creating NextAuth session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}