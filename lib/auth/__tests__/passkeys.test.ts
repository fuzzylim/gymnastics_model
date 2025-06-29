import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePasskeyRegistrationOptions, generatePasskeyAuthenticationOptions } from '../passkeys'

// Mock SimpleWebAuthn
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}))

// Mock database utilities
vi.mock('@/lib/db/auth-utils', () => ({
  getUserCredentials: vi.fn(),
  createCredential: vi.fn(),
  updateCredentialCounter: vi.fn(),
  createChallenge: vi.fn(),
  getValidChallenge: vi.fn(),
  markChallengeAsUsed: vi.fn(),
}))

// Mock environment variables
process.env.RP_NAME = 'Gymnastics Model'
process.env.RP_ID = 'localhost'
process.env.ORIGIN = 'http://localhost:3000'

describe('Passkey Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generatePasskeyRegistrationOptions', () => {
    it('should generate registration options with correct parameters', async () => {
      const { generateRegistrationOptions } = await import('@simplewebauthn/server')
      const { getUserCredentials, createChallenge } = await import('@/lib/db/auth-utils')

      const mockOptions = {
        challenge: 'mock-challenge',
        rp: { name: 'Test App', id: 'localhost' },
        user: { id: 'user123', name: 'test@example.com', displayName: 'test@example.com' },
      }

      ;(getUserCredentials as any).mockResolvedValue([])
      ;(generateRegistrationOptions as any).mockResolvedValue(mockOptions)
      ;(createChallenge as any).mockResolvedValue({ id: 'challenge-id' })

      const result = await generatePasskeyRegistrationOptions({
        userId: 'user123',
        userEmail: 'test@example.com',
        userName: 'Test User',
      })

      expect(getUserCredentials).toHaveBeenCalledWith('user123')
      expect(generateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          rpName: 'Gymnastics Model',
          rpID: 'localhost',
          userID: 'user123',
          userName: 'test@example.com',
          userDisplayName: 'Test User',
        })
      )
      expect(createChallenge).toHaveBeenCalledWith({
        challenge: 'mock-challenge',
        userId: 'user123',
        type: 'registration',
        expiresAt: expect.any(Date),
      })
      expect(result).toBe(mockOptions)
    })
  })

  describe('generatePasskeyAuthenticationOptions', () => {
    it('should generate authentication options', async () => {
      const { generateAuthenticationOptions } = await import('@simplewebauthn/server')
      const { getUserCredentials, createChallenge } = await import('@/lib/db/auth-utils')

      const mockOptions = {
        challenge: 'mock-auth-challenge',
        timeout: 60000,
        rpID: 'localhost',
      }

      ;(getUserCredentials as any).mockResolvedValue([])
      ;(generateAuthenticationOptions as any).mockResolvedValue(mockOptions)
      ;(createChallenge as any).mockResolvedValue({ id: 'challenge-id' })

      const result = await generatePasskeyAuthenticationOptions({
        userId: 'user123',
      })

      expect(generateAuthenticationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
          rpID: 'localhost',
        })
      )
      expect(createChallenge).toHaveBeenCalledWith({
        challenge: 'mock-auth-challenge',
        userId: 'user123',
        type: 'authentication',
        expiresAt: expect.any(Date),
      })
      expect(result).toBe(mockOptions)
    })

    it('should work without userId for discoverable credentials', async () => {
      const { generateAuthenticationOptions } = await import('@simplewebauthn/server')
      const { createChallenge } = await import('@/lib/db/auth-utils')

      const mockOptions = {
        challenge: 'mock-auth-challenge',
        timeout: 60000,
        rpID: 'localhost',
      }

      ;(generateAuthenticationOptions as any).mockResolvedValue(mockOptions)
      ;(createChallenge as any).mockResolvedValue({ id: 'challenge-id' })

      const result = await generatePasskeyAuthenticationOptions()

      expect(generateAuthenticationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
          allowCredentials: undefined,
          rpID: 'localhost',
        })
      )
      expect(createChallenge).toHaveBeenCalledWith({
        challenge: 'mock-auth-challenge',
        userId: null,
        type: 'authentication',
        expiresAt: expect.any(Date),
      })
      expect(result).toBe(mockOptions)
    })
  })
})