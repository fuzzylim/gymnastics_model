import { NextRequest, NextResponse } from 'next/server'
import { verifyPasskeyAuthentication } from '@/lib/auth/passkeys'
import { getUserById, getUserByEmail, createSession } from '@/lib/db/auth-utils'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

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

      // Create NextAuth session
      try {
        // Generate session token
        const sessionToken = randomBytes(32).toString('hex')
        
        // Session expires in 30 days
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        
        // Create session in database
        await createSession({
          sessionToken,
          userId: user.id,
          expires,
        })
        
        // Set session cookie
        const cookieStore = cookies()
        cookieStore.set('authjs.session-token', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          expires,
          path: '/',
        })
        
        return NextResponse.json({
          verified: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          message: 'Authentication successful',
        })
      } catch (sessionError) {
        console.error('Error creating session:', sessionError)
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