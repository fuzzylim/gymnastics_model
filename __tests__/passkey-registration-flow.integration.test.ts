import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as registerOptions } from '@/app/api/auth/passkey/register/options/route'
import { POST as registerVerify } from '@/app/api/auth/passkey/register/verify/route'
import { db } from '@/lib/db'
import { users, credentials, authChallenges } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Mock WebAuthn responses for registration
const mockRegistrationResponse = {
  id: 'test-registration-credential-id',
  rawId: 'test-registration-credential-id',
  type: 'public-key',
  response: {
    clientDataJSON: Buffer.from(JSON.stringify({
      type: 'webauthn.create',
      challenge: 'example-challenge',
      origin: 'http://localhost:3000'
    })).toString('base64'),
    attestationObject: Buffer.from('mock-attestation-object').toString('base64'),
    transports: ['internal']
  }
}

// Mock SimpleWebAuthn functions for registration
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(() => ({
    challenge: 'example-challenge',
    rp: { name: 'Test App', id: 'localhost' },
    user: { id: 'user-id', name: 'test@example.com', displayName: 'Test User' },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred'
    }
  })),
  verifyRegistrationResponse: vi.fn(() => ({
    verified: true,
    registrationInfo: {
      credentialID: Buffer.from('test-registration-credential-id', 'utf-8'),
      credentialPublicKey: Buffer.from('test-public-key', 'utf-8'),
      counter: 0
    }
  }))
}))

vi.mock('@simplewebauthn/server/helpers', () => ({
  isoBase64URL: {
    fromBuffer: vi.fn((buffer) => Buffer.from(buffer).toString('base64url')),
    toBuffer: vi.fn((str) => Buffer.from(str, 'base64url'))
  }
}))

describe('Passkey Registration Flow Integration', () => {
  const testEmail = 'registration-test@example.com'
  const testName = 'Registration Test User'
  let testUserId: string

  beforeEach(async () => {
    // Clean up any existing test data
    if (testUserId) {
      await db.delete(credentials).where(eq(credentials.userId, testUserId))
    }
    await db.delete(users).where(eq(users.email, testEmail))
    await db.delete(authChallenges)
  })

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await db.delete(credentials).where(eq(credentials.userId, testUserId))
      await db.delete(users).where(eq(users.id, testUserId))
    }
    await db.delete(authChallenges)
  })

  describe('Registration Options Endpoint', () => {
    it('should generate registration options for new user', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          name: testName
        })
      })

      const response = await registerOptions(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('challenge')
      expect(data).toHaveProperty('rp')
      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('pubKeyCredParams')
      expect(data).toHaveProperty('timeout')
      expect(data).toHaveProperty('attestation')
      expect(data).toHaveProperty('authenticatorSelection')

      // Verify user was created
      const createdUser = await db.select().from(users).where(eq(users.email, testEmail))
      expect(createdUser).toHaveLength(1)
      expect(createdUser[0].email).toBe(testEmail)
      expect(createdUser[0].name).toBe(testName)
      testUserId = createdUser[0].id

      // Verify challenge was created
      const challenges = await db.select().from(authChallenges).where(eq(authChallenges.userId, testUserId))
      expect(challenges).toHaveLength(1)
      expect(challenges[0].type).toBe('registration')
      expect(challenges[0].used).toBe(false)
    })

    it('should generate registration options for existing user', async () => {
      // Create existing user
      const [existingUser] = await db.insert(users).values({
        email: testEmail,
        name: 'Existing Name'
      }).returning()
      testUserId = existingUser.id

      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          name: testName // Different name
        })
      })

      const response = await registerOptions(request)
      expect(response.status).toBe(200)

      // Should use existing user, not create new one
      const allUsers = await db.select().from(users).where(eq(users.email, testEmail))
      expect(allUsers).toHaveLength(1)
      expect(allUsers[0].id).toBe(existingUser.id)
      expect(allUsers[0].name).toBe('Existing Name') // Original name preserved
    })

    it('should reject request without email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
        method: 'POST',
        body: JSON.stringify({
          name: testName
        })
      })

      const response = await registerOptions(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Email is required')
    })

    it('should handle registration options with minimal data', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail
          // No name provided
        })
      })

      const response = await registerOptions(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('challenge')

      // Verify user was created with null name
      const createdUser = await db.select().from(users).where(eq(users.email, testEmail))
      expect(createdUser).toHaveLength(1)
      expect(createdUser[0].email).toBe(testEmail)
      expect(createdUser[0].name).toBeNull()
      testUserId = createdUser[0].id
    })
  })

  describe('Registration Verification Endpoint', () => {
    beforeEach(async () => {
      // Create user and challenge for verification tests
      const [user] = await db.insert(users).values({
        email: testEmail,
        name: testName
      }).returning()
      testUserId = user.id

      await db.insert(authChallenges).values({
        challenge: 'example-challenge',
        userId: user.id,
        type: 'registration',
        expiresAt: new Date(Date.now() + 60000)
      })
    })

    it('should complete registration verification successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          registrationResponse: mockRegistrationResponse
        })
      })

      const response = await registerVerify(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.verified).toBe(true)
      expect(data.message).toBe('Passkey registered successfully')
      expect(data).toHaveProperty('credentialId')

      // Verify credential was stored in database
      const storedCredentials = await db.select().from(credentials).where(eq(credentials.userId, testUserId))
      expect(storedCredentials).toHaveLength(1)
      expect(storedCredentials[0].credentialId).toBeDefined()
      expect(storedCredentials[0].userId).toBe(testUserId)
      expect(storedCredentials[0].counter).toBe(0)
      expect(storedCredentials[0].publicKey).toBeDefined()

      // Verify challenge was marked as used
      const usedChallenges = await db.select().from(authChallenges).where(eq(authChallenges.userId, testUserId))
      expect(usedChallenges[0].used).toBe(true)
    })

    it('should reject verification without email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          registrationResponse: mockRegistrationResponse
        })
      })

      const response = await registerVerify(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Email and registration response are required')
    })

    it('should reject verification without registration response', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail
        })
      })

      const response = await registerVerify(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Email and registration response are required')
    })

    it('should reject verification for non-existent user', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          registrationResponse: mockRegistrationResponse
        })
      })

      const response = await registerVerify(request)
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error).toBe('User not found')
    })

    it('should handle multiple registrations for same user', async () => {
      // First registration
      const firstRequest = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          registrationResponse: mockRegistrationResponse
        })
      })

      const firstResponse = await registerVerify(firstRequest)
      expect(firstResponse.status).toBe(200)

      // Create new challenge for second registration
      await db.insert(authChallenges).values({
        challenge: 'example-challenge', // Use same challenge as mocked
        userId: testUserId,
        type: 'registration',
        expiresAt: new Date(Date.now() + 60000)
      })

      // Second registration with different credential
      const secondRegistrationResponse = {
        ...mockRegistrationResponse,
        id: 'second-credential-id',
        rawId: 'second-credential-id'
      }

      // Mock the verification to return different credential ID for second registration
      const { verifyRegistrationResponse } = await import('@simplewebauthn/server')
      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credentialID: Buffer.from('second-credential-id', 'utf-8'),
          credentialPublicKey: Buffer.from('second-public-key', 'utf-8'),
          counter: 0
        }
      })

      const secondRequest = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          registrationResponse: secondRegistrationResponse
        })
      })

      const secondResponse = await registerVerify(secondRequest)
      expect(secondResponse.status).toBe(200)

      // Verify user now has multiple credentials
      const allCredentials = await db.select().from(credentials).where(eq(credentials.userId, testUserId))
      expect(allCredentials).toHaveLength(2)
    })
  })

  describe('Registration Flow Security', () => {
    it('should prevent registration with expired challenge', async () => {
      // Create user with expired challenge
      const [user] = await db.insert(users).values({
        email: testEmail,
        name: testName
      }).returning()
      testUserId = user.id

      await db.insert(authChallenges).values({
        challenge: 'expired-challenge',
        userId: user.id,
        type: 'registration',
        expiresAt: new Date(Date.now() - 60000) // Expired 1 minute ago
      })

      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          registrationResponse: mockRegistrationResponse
        })
      })

      const response = await registerVerify(request)
      expect(response.status).toBe(500)
    })

    it('should prevent registration with used challenge', async () => {
      // Create user with used challenge
      const [user] = await db.insert(users).values({
        email: testEmail,
        name: testName
      }).returning()
      testUserId = user.id

      await db.insert(authChallenges).values({
        challenge: 'used-challenge',
        userId: user.id,
        type: 'registration',
        used: true, // Already used
        expiresAt: new Date(Date.now() + 60000)
      })

      const request = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          registrationResponse: mockRegistrationResponse
        })
      })

      const response = await registerVerify(request)
      expect(response.status).toBe(500)
    })
  })

  describe('Integration with Authentication', () => {
    it('should allow authentication after successful registration', async () => {
      // First, complete registration
      const [user] = await db.insert(users).values({
        email: testEmail,
        name: testName
      }).returning()
      testUserId = user.id

      await db.insert(authChallenges).values({
        challenge: 'example-challenge',
        userId: user.id,
        type: 'registration',
        expiresAt: new Date(Date.now() + 60000)
      })

      const registrationRequest = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          registrationResponse: mockRegistrationResponse
        })
      })

      const registrationResponse = await registerVerify(registrationRequest)
      expect(registrationResponse.status).toBe(200)

      // Verify credential exists and can be found
      const storedCredentials = await db.select().from(credentials).where(eq(credentials.userId, testUserId))
      expect(storedCredentials).toHaveLength(1)
      
      // Credential ID should be base64URL encoded version of the mock response
      const expectedCredentialId = 'dGVzdC1yZWdpc3RyYXRpb24tY3JlZGVudGlhbC1pZA'
      expect(storedCredentials[0].credentialId).toBe(expectedCredentialId)

      // This confirms the credential is properly stored for authentication
      const credentialId = storedCredentials[0].credentialId
      expect(credentialId).toBe(expectedCredentialId)
    })
  })
})