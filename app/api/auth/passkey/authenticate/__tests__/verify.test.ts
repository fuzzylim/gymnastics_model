import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../verify/route'
import { NextRequest } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/auth/passkeys', () => ({
  verifyPasskeyAuthentication: vi.fn(),
}))

vi.mock('@/lib/db/auth-utils', () => ({
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  signIn: vi.fn(),
}))

describe('Passkey Authentication Verify Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should pass userId (not email) to verifyPasskeyAuthentication when email is provided', async () => {
    const { verifyPasskeyAuthentication } = await import('@/lib/auth/passkeys')
    const { getUserByEmail, getUserById } = await import('@/lib/db/auth-utils')

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }

    // Mock the email lookup to return a user
    ;(getUserByEmail as any).mockResolvedValue(mockUser)
    
    // Mock the verification to succeed
    ;(verifyPasskeyAuthentication as any).mockResolvedValue({
      verified: true,
      userId: 'user-123',
    })
    
    // Mock getUserById to return the user
    ;(getUserById as any).mockResolvedValue(mockUser)

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/passkey/authenticate/verify', {
      method: 'POST',
      body: JSON.stringify({
        authenticationResponse: { id: 'cred-123', response: {} },
        email: 'test@example.com',
      }),
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    // Verify that getUserByEmail was called with the email
    expect(getUserByEmail).toHaveBeenCalledWith('test@example.com')
    
    // Verify that verifyPasskeyAuthentication was called with userId (not email)
    expect(verifyPasskeyAuthentication).toHaveBeenCalledWith(
      { id: 'cred-123', response: {} },
      'user-123' // Should be userId, not email
    )
    
    expect(data.verified).toBe(true)
    expect(data.user).toEqual(mockUser)
  })

  it('should handle authentication without email (discoverable credentials)', async () => {
    const { verifyPasskeyAuthentication } = await import('@/lib/auth/passkeys')
    const { getUserById } = await import('@/lib/db/auth-utils')

    const mockUser = {
      id: 'user-456',
      email: 'another@example.com',
      name: 'Another User',
    }

    // Mock the verification to succeed
    ;(verifyPasskeyAuthentication as any).mockResolvedValue({
      verified: true,
      userId: 'user-456',
    })
    
    // Mock getUserById to return the user
    ;(getUserById as any).mockResolvedValue(mockUser)

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/passkey/authenticate/verify', {
      method: 'POST',
      body: JSON.stringify({
        authenticationResponse: { id: 'cred-456', response: {} },
        // No email provided - using discoverable credentials
      }),
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    // Verify that verifyPasskeyAuthentication was called without expectedUserId
    expect(verifyPasskeyAuthentication).toHaveBeenCalledWith(
      { id: 'cred-456', response: {} },
      undefined // No userId when using discoverable credentials
    )
    
    expect(data.verified).toBe(true)
    expect(data.user).toEqual(mockUser)
  })

  it('should handle case when email is provided but user not found', async () => {
    const { verifyPasskeyAuthentication } = await import('@/lib/auth/passkeys')
    const { getUserByEmail } = await import('@/lib/db/auth-utils')

    // Mock the email lookup to return null (user not found)
    ;(getUserByEmail as any).mockResolvedValue(null)
    
    // Mock the verification to succeed anyway (credential might be valid)
    ;(verifyPasskeyAuthentication as any).mockResolvedValue({
      verified: true,
      userId: 'user-789',
    })

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/passkey/authenticate/verify', {
      method: 'POST',
      body: JSON.stringify({
        authenticationResponse: { id: 'cred-789', response: {} },
        email: 'nonexistent@example.com',
      }),
    })

    await POST(mockRequest)

    // Verify that getUserByEmail was called
    expect(getUserByEmail).toHaveBeenCalledWith('nonexistent@example.com')
    
    // Verify that verifyPasskeyAuthentication was called with undefined userId
    // (since user wasn't found by email)
    expect(verifyPasskeyAuthentication).toHaveBeenCalledWith(
      { id: 'cred-789', response: {} },
      undefined
    )
  })
})