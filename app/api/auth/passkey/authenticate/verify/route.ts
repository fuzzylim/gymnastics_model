import { NextRequest, NextResponse } from 'next/server'
import { verifyPasskeyAuthentication } from '@/lib/auth/passkeys'
import { getUserById } from '@/lib/db/auth-utils'
import { signIn } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    const { authenticationResponse, email } = await request.json()

    if (!authenticationResponse) {
      return NextResponse.json(
        { error: 'Authentication response is required' },
        { status: 400 }
      )
    }

    const verification = await verifyPasskeyAuthentication(
      authenticationResponse,
      email // This helps with targeted verification if provided
    )

    if (verification.verified && verification.userId) {
      // Validate userId is not empty
      if (!verification.userId.trim()) {
        return NextResponse.json(
          { error: 'Invalid user ID returned from verification' },
          { status: 500 }
        )
      }
      
      const user = await getUserById(verification.userId)
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Create session using NextAuth
      try {
        // Note: We'll need to integrate this with NextAuth's session creation
        // For now, return success with user info
        return NextResponse.json({
          verified: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          message: 'Authentication successful',
        })
      } catch (signInError) {
        console.error('Error creating session:', signInError)
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Error verifying authentication:', error)
    return NextResponse.json(
      { error: 'Authentication verification failed' },
      { status: 500 }
    )
  }
}