'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClearCookiesPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear all auth-related cookies
    const authCookies = [
      'authjs.session-token',
      '__Secure-authjs.session-token',
      'authjs.csrf-token', 
      '__Host-authjs.csrf-token',
      'authjs.callback-url',
      '__Secure-authjs.callback-url'
    ]

    authCookies.forEach(cookieName => {
      // Clear cookie by setting it with expired date
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure`
    })

    // Also try to clear using the API
    fetch('/api/auth/clear-cookies', { method: 'POST' })
      .then(() => {
        console.log('Cookies cleared via API')
      })
      .catch(err => {
        console.log('Failed to clear cookies via API:', err)
      })

    // Redirect to login after a short delay
    setTimeout(() => {
      router.push('/login')
    }, 1000)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Clearing Authentication Cookies
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we clear your session...
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  )
}