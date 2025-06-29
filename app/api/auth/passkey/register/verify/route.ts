import { NextRequest, NextResponse } from 'next/server'
import { verifyPasskeyRegistration } from '@/lib/auth/passkeys'
import { getUserByEmail } from '@/lib/db/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const { email, registrationResponse } = await request.json()

    if (!email || !registrationResponse) {
      return NextResponse.json(
        { error: 'Email and registration response are required' },
        { status: 400 }
      )
    }

    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const verification = await verifyPasskeyRegistration(user.id, registrationResponse)

    if (verification.verified) {
      return NextResponse.json({
        verified: true,
        message: 'Passkey registered successfully',
        credentialId: verification.credentialID,
      })
    } else {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error verifying registration:', error)
    return NextResponse.json(
      { error: 'Registration verification failed' },
      { status: 500 }
    )
  }
}