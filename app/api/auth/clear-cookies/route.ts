import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Clear all authentication-related cookies
    const authCookies = [
      'authjs.session-token',
      '__Secure-authjs.session-token',
      'authjs.csrf-token',
      '__Host-authjs.csrf-token',
      'authjs.callback-url',
      '__Secure-authjs.callback-url'
    ]
    
    authCookies.forEach(cookieName => {
      cookieStore.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    })
    
    return NextResponse.json({ success: true, message: 'Authentication cookies cleared' })
  } catch (error) {
    console.error('Error clearing cookies:', error)
    return NextResponse.json({ error: 'Failed to clear cookies' }, { status: 500 })
  }
}