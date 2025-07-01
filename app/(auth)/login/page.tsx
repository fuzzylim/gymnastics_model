'use client'

import { useState } from 'react'
import Link from 'next/link'
import { startAuthentication } from '@simplewebauthn/browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [supportsPasskeys, setSupportsPasskeys] = useState(true)

  const handlePasskeyLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        setSupportsPasskeys(false)
        setError('Passkeys are not supported on this device')
        return
      }

      // Get authentication options
      const optionsResponse = await fetch('/api/auth/passkey/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined }),
      })

      if (!optionsResponse.ok) {
        throw new Error('Failed to get authentication options')
      }

      const options = await optionsResponse.json()

      // Start authentication
      const authResponse = await startAuthentication(options)
      
      console.log('Client auth response:', {
        id: authResponse.id,
        rawId: authResponse.rawId,
        type: authResponse.type,
        response: authResponse.response,
      })

      // Verify authentication
      const verificationResponse = await fetch('/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authenticationResponse: authResponse,
          email: email || undefined,
        }),
      })

      if (!verificationResponse.ok) {
        throw new Error('Authentication failed')
      }

      const result = await verificationResponse.json()

      if (result.verified) {
        // Redirect to dashboard or home page
        window.location.href = '/dashboard'
      } else {
        setError('Authentication failed')
      }
    } catch (err) {
      console.error('Authentication error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLinkLogin = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await fetch('/api/auth/signin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          callbackUrl: '/dashboard',
        }),
      })

      if (result.ok) {
        setError('')
        // Show success message
        alert('Check your email for a magic link to sign in!')
      } else {
        throw new Error('Failed to send magic link')
      }
    } catch (err) {
      console.error('Magic link error:', err)
      setError('Failed to send magic link')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="space-y-4">
        {/* Email input for targeted authentication */}
        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Email address (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Passkey Login */}
        {supportsPasskeys && (
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m3 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2" />
                </svg>
                Sign in with Passkey
              </>
            )}
          </button>
        )}

        {/* Magic Link Login */}
        <button
          type="button"
          onClick={handleMagicLinkLogin}
          disabled={isLoading || !email}
          className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span>Sending...</span>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Magic Link
            </>
          )}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {!supportsPasskeys && (
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="text-sm text-yellow-700">
              Your device doesn&apos;t support passkeys. Please use the magic link option above.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}