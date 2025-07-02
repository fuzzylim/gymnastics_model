import { NextRequest, NextResponse } from 'next/server'
import { verifyPasskeyAuthentication } from '@/lib/auth/passkeys'
import { getUserById, getUserByEmail } from '@/lib/db/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const { authenticationResponse, email } = await request.json()

    if (!authenticationResponse) {
      return NextResponse.json(
        { error: 'Authentication response is required' },
        { status: 400 }
      )
    }

    // If email is provided, get the userId for targeted verification
    let expectedUserId: string | undefined
    if (email) {
      const user = await getUserByEmail(email)
      if (user) {
        expectedUserId = user.id
      }
    }

    const verification = await verifyPasskeyAuthentication(
      authenticationResponse,
      expectedUserId // Pass userId, not email
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

      // Return success - the client will use NextAuth signIn to create session
      return NextResponse.json({
        verified: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        message: 'Authentication successful. Please wait while we create your session...',
      })
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