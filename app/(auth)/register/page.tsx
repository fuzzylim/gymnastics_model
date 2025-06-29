'use client'

import { useState } from 'react'
import Link from 'next/link'
import { startRegistration } from '@simplewebauthn/browser'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [supportsPasskeys, setSupportsPasskeys] = useState(true)

  const handlePasskeyRegistration = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        setSupportsPasskeys(false)
        setError('Passkeys are not supported on this device')
        return
      }

      // Get registration options
      const optionsResponse = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options')
      }

      const options = await optionsResponse.json()

      // Start registration
      const regResponse = await startRegistration(options)

      // Verify registration
      const verificationResponse = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          registrationResponse: regResponse,
        }),
      })

      if (!verificationResponse.ok) {
        throw new Error('Registration verification failed')
      }

      const result = await verificationResponse.json()

      if (result.verified) {
        setSuccess('Passkey registered successfully! You can now sign in.')
        // Optionally redirect to login page or dashboard
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else {
        setError('Registration verification failed')
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLinkRegistration = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

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
        setSuccess('Check your email for a magic link to sign in!')
        setError('')
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            sign in to your existing account
          </Link>
        </p>
      </div>

      <form className="space-y-4" onSubmit={handlePasskeyRegistration}>
        <div>
          <label htmlFor="name" className="sr-only">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Full name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Passkey Registration */}
        {supportsPasskeys && (
          <button
            type="submit"
            disabled={isLoading || !email}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span>Creating passkey...</span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m3 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2" />
                </svg>
                Create account with Passkey
              </>
            )}
          </button>
        )}
      </form>

      {/* Magic Link Registration */}
      <button
        type="button"
        onClick={handleMagicLinkRegistration}
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
            Register with Magic Link
          </>
        )}
      </button>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      {!supportsPasskeys && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="text-sm text-yellow-700">
            Your device doesn't support passkeys. Please use the magic link option above.
          </div>
        </div>
      )}

      <div className="text-xs text-center text-gray-500 mt-4">
        <p>
          Passkeys provide secure, passwordless authentication using your device's built-in security features like fingerprint, face recognition, or PIN.
        </p>
      </div>
    </div>
  )
}