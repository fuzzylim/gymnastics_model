import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../options/route'
import { NextRequest } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/auth/passkeys', () => ({
  generatePasskeyRegistrationOptions: vi.fn(),
}))

vi.mock('@/lib/db/auth-utils', () => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
}))

describe('Passkey Registration Options Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate options for new user', async () => {
    const { generatePasskeyRegistrationOptions } = await import('@/lib/auth/passkeys')
    const { getUserByEmail, createUser } = await import('@/lib/db/auth-utils')

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }

    const mockOptions = {
      challenge: 'test-challenge',
      rp: { name: 'Test App', id: 'localhost' },
      user: { id: 'user-123', name: 'test@example.com', displayName: 'Test User' }
    }

    // Mock no existing user found, then create new user
    ;(getUserByEmail as any).mockResolvedValue(null)
    ;(createUser as any).mockResolvedValue(mockUser)
    ;(generatePasskeyRegistrationOptions as any).mockResolvedValue(mockOptions)

    const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockOptions)
    expect(getUserByEmail).toHaveBeenCalledWith('test@example.com')
    expect(createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test User'
    })
    expect(generatePasskeyRegistrationOptions).toHaveBeenCalledWith({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User'
    })
  })

  it('should generate options for existing user', async () => {
    const { generatePasskeyRegistrationOptions } = await import('@/lib/auth/passkeys')
    const { getUserByEmail, createUser } = await import('@/lib/db/auth-utils')

    const mockUser = {
      id: 'existing-user-123',
      email: 'existing@example.com',
      name: 'Existing User',
    }

    const mockOptions = {
      challenge: 'test-challenge',
      rp: { name: 'Test App', id: 'localhost' }
    }

    // Mock existing user found
    ;(getUserByEmail as any).mockResolvedValue(mockUser)
    ;(generatePasskeyRegistrationOptions as any).mockResolvedValue(mockOptions)

    const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
      method: 'POST',
      body: JSON.stringify({
        email: 'existing@example.com',
        name: 'New Name' // Should be ignored
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockOptions)
    expect(getUserByEmail).toHaveBeenCalledWith('existing@example.com')
    expect(createUser).not.toHaveBeenCalled()
    expect(generatePasskeyRegistrationOptions).toHaveBeenCalledWith({
      userId: 'existing-user-123',
      userEmail: 'existing@example.com',
      userName: 'Existing User'
    })
  })

  it('should reject request without email', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email is required')
  })

  it('should handle undefined name gracefully', async () => {
    const { generatePasskeyRegistrationOptions } = await import('@/lib/auth/passkeys')
    const { getUserByEmail, createUser } = await import('@/lib/db/auth-utils')

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: null,
    }

    ;(getUserByEmail as any).mockResolvedValue(null)
    ;(createUser as any).mockResolvedValue(mockUser)
    ;(generatePasskeyRegistrationOptions as any).mockResolvedValue({})

    const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com'
        // No name provided
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    expect(createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: undefined
    })
    expect(generatePasskeyRegistrationOptions).toHaveBeenCalledWith({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: undefined
    })
  })
})