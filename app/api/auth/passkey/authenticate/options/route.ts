import { NextRequest, NextResponse } from 'next/server'
import { generatePasskeyAuthenticationOptions } from '@/lib/auth/passkeys'
import { getUserByEmail } from '@/lib/db/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email } = body

    let userId: string | undefined

    // If email is provided, get the user for targeted authentication
    if (email) {
      const user = await getUserByEmail(email)
      if (user) {
        userId = user.id
      }
    }

    const options = await generatePasskeyAuthenticationOptions({
      userId,
    })

    return NextResponse.json(options)
  } catch (error) {
    console.error('Error generating authentication options:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}