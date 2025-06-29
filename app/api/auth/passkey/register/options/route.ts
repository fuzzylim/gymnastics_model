import { NextRequest, NextResponse } from 'next/server'
import { generatePasskeyRegistrationOptions } from '@/lib/auth/passkeys'
import { getUserByEmail, createUser } from '@/lib/db/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find or create user
    let user = await getUserByEmail(email)
    if (!user) {
      user = await createUser({
        email,
        name: name || undefined,
      })
    }

    const options = await generatePasskeyRegistrationOptions({
      userId: user.id,
      userEmail: user.email,
      userName: user.name || undefined,
    })

    return NextResponse.json(options)
  } catch (error) {
    console.error('Error generating registration options:', error)
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    )
  }
}