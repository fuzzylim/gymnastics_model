import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as registerOptions } from '@/app/api/auth/passkey/register/options/route'
import { POST as registerVerify } from '@/app/api/auth/passkey/register/verify/route'
import { POST as authOptions } from '@/app/api/auth/passkey/authenticate/options/route'
import { POST as authVerify } from '@/app/api/auth/passkey/authenticate/verify/route'
import { db } from '@/lib/db'
import { users, credentials, authChallenges, sessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Mock WebAuthn responses
const mockRegistrationResponse = {
  id: 'test-credential-id',
  rawId: 'test-credential-id',
  type: 'public-key',
  response: {
    clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiZXhhbXBsZS1jaGFsbGVuZ2UiLCJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjMwMDAifQ==',
    attestationObject: 'test-attestation-object',
    transports: ['internal']
  }
}

const mockAuthenticationResponse = {
  id: 'test-credential-id',
  rawId: 'test-credential-id',
  type: 'public-key',
  response: {
    clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiZXhhbXBsZS1jaGFsbGVuZ2UiLCJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjMwMDAifQ==',
    authenticatorData: 'test-authenticator-data',
    signature: 'test-signature'
  }
}

// Mock SimpleWebAuthn functions
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(() => ({
    challenge: 'example-challenge',
    rp: { name: 'Test App', id: 'localhost' },
    user: { id: 'user-id', name: 'test@example.com', displayName: 'Test User' },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
    timeout: 60000,
    attestation: 'none'
  })),
  generateAuthenticationOptions: vi.fn(() => ({
    challenge: 'example-challenge',
    timeout: 60000,
    rpId: 'localhost'
  })),
  verifyRegistrationResponse: vi.fn(() => ({
    verified: true,
    registrationInfo: {
      credentialID: Buffer.from('test-credential-id', 'utf-8'),
      credentialPublicKey: Buffer.from('test-public-key', 'utf-8'),
      counter: 0
    }
  })),
  verifyAuthenticationResponse: vi.fn(() => ({
    verified: true,
    authenticationInfo: {
      newCounter: 1
    }
  }))
}))

vi.mock('@simplewebauthn/server/helpers', () => ({
  isoBase64URL: {
    fromBuffer: vi.fn((buffer) => Buffer.from(buffer).toString('base64url')),
    toBuffer: vi.fn((str) => Buffer.from(str, 'base64url'))
  }
}))

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    set: vi.fn()
  }))
}))

describe('Passkey Authentication Flow Integration', () => {
  const testEmail = 'test@example.com'
  const testName = 'Test User'
  let testUserId: string

  beforeEach(async () => {
    // Clean up any existing test data
    if (testUserId) {
      await db.delete(sessions).where(eq(sessions.userId, testUserId))
      await db.delete(credentials).where(eq(credentials.userId, testUserId))
    }
    await db.delete(users).where(eq(users.email, testEmail))
    await db.delete(authChallenges)
  })

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await db.delete(sessions).where(eq(sessions.userId, testUserId))
      await db.delete(credentials).where(eq(credentials.userId, testUserId))
      await db.delete(users).where(eq(users.id, testUserId))
    }
    await db.delete(authChallenges)
  })

  describe('Complete Registration Flow', () => {
    it('should complete full registration process', async () => {
      // Step 1: Get registration options
      const optionsRequest = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, name: testName })
      })

      const optionsResponse = await registerOptions(optionsRequest)
      expect(optionsResponse.status).toBe(200)

      const optionsData = await optionsResponse.json()
      expect(optionsData).toHaveProperty('challenge')
      expect(optionsData).toHaveProperty('user')
      expect(optionsData.user.name).toBe(testEmail)

      // Verify user was created
      const [user] = await db.select().from(users).where(eq(users.email, testEmail))
      expect(user).toBeDefined()
      expect(user.email).toBe(testEmail)
      expect(user.name).toBe(testName)
      testUserId = user.id

      // Verify challenge was created
      const challenges = await db.select().from(authChallenges).where(eq(authChallenges.userId, user.id))
      expect(challenges).toHaveLength(1)
      expect(challenges[0].type).toBe('registration')

      // Step 2: Verify registration
      const verifyRequest = new NextRequest('http://localhost:3000/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          registrationResponse: mockRegistrationResponse
        })
      })

      const verifyResponse = await registerVerify(verifyRequest)
      expect(verifyResponse.status).toBe(200)

      const verifyData = await verifyResponse.json()
      expect(verifyData.verified).toBe(true)
      expect(verifyData).toHaveProperty('credentialId')

      // Verify credential was created
      const userCredentials = await db.select().from(credentials).where(eq(credentials.userId, user.id))
      expect(userCredentials).toHaveLength(1)
      expect(userCredentials[0].credentialId).toBeDefined()
      expect(userCredentials[0].counter).toBe(0)

      // Verify challenge was marked as used
      const updatedChallenges = await db.select().from(authChallenges).where(eq(authChallenges.userId, user.id))
      expect(updatedChallenges[0].used).toBe(true)
    })

    it('should handle registration with existing user', async () => {
      // Create existing user
      const [existingUser] = await db.insert(users).values({
        email: testEmail,
        name: 'Existing Name'
      }).returning()
      testUserId = existingUser.id

      const optionsRequest = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, name: testName })
      })

      const optionsResponse = await registerOptions(optionsRequest)
      expect(optionsResponse.status).toBe(200)

      // Should use existing user, not create new one
      const users_count = await db.select().from(users).where(eq(users.email, testEmail))
      expect(users_count).toHaveLength(1)
      expect(users_count[0].id).toBe(existingUser.id)
    })
  })

  describe('Complete Authentication Flow', () => {
    beforeEach(async () => {
      // Set up user with credential for authentication tests
      const [user] = await db.insert(users).values({
        email: testEmail,
        name: testName
      }).returning()
      testUserId = user.id

      await db.insert(credentials).values({
        credentialId: 'test-credential-id',
        userId: user.id,
        publicKey: 'test-public-key',
        counter: 0,
        transports: ['internal']
      })
    })

    it('should complete authentication with email (targeted)', async () => {
      // Step 1: Get authentication options with email
      const optionsRequest = new NextRequest('http://localhost:3000/api/auth/passkey/authenticate/options', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail })
      })

      const optionsResponse = await authOptions(optionsRequest)
      expect(optionsResponse.status).toBe(200)

      const optionsData = await optionsResponse.json()
      expect(optionsData).toHaveProperty('challenge')

      // Verify challenge was created
      const challenges = await db.select().from(authChallenges).where(eq(authChallenges.userId, testUserId))
      expect(challenges).toHaveLength(1)
      expect(challenges[0].type).toBe('authentication')

      // Step 2: Verify authentication
      const verifyRequest = new NextRequest('http://localhost:3000/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          authenticationResponse: mockAuthenticationResponse
        })
      })

      const verifyResponse = await authVerify(verifyRequest)
      expect(verifyResponse.status).toBe(200)

      const verifyData = await verifyResponse.json()
      expect(verifyData.verified).toBe(true)
      expect(verifyData.user).toEqual({
        id: testUserId,
        email: testEmail,
        name: testName
      })

      // Verify session was created
      const userSessions = await db.select().from(sessions).where(eq(sessions.userId, testUserId))
      expect(userSessions).toHaveLength(1)
      expect(userSessions[0].sessionToken).toBeDefined()
      expect(userSessions[0].expires.getTime()).toBeGreaterThan(Date.now())

      // Verify credential counter was updated
      const updatedCredentials = await db.select().from(credentials).where(eq(credentials.userId, testUserId))
      expect(updatedCredentials[0].counter).toBe(1)

      // Verify challenge was marked as used
      const updatedChallenges = await db.select().from(authChallenges).where(eq(authChallenges.userId, testUserId))
      expect(updatedChallenges[0].used).toBe(true)
    })

    it('should complete authentication without email (discoverable)', async () => {
      // Step 1: Get authentication options without email
      const optionsRequest = new NextRequest('http://localhost:3000/api/auth/passkey/authenticate/options', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const optionsResponse = await authOptions(optionsRequest)
      expect(optionsResponse.status).toBe(200)

      // Verify challenge was created without specific user
      const challenges = await db.select().from(authChallenges)
      const latestChallenge = challenges[challenges.length - 1]
      expect(latestChallenge.userId).toBeNull()
      expect(latestChallenge.type).toBe('authentication')

      // Step 2: Verify authentication without email
      const verifyRequest = new NextRequest('http://localhost:3000/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        body: JSON.stringify({
          authenticationResponse: mockAuthenticationResponse
        })
      })

      const verifyResponse = await authVerify(verifyRequest)
      expect(verifyResponse.status).toBe(200)

      const verifyData = await verifyResponse.json()
      expect(verifyData.verified).toBe(true)
      expect(verifyData.user.id).toBe(testUserId)

      // Verify session was created
      const userSessions = await db.select().from(sessions).where(eq(sessions.userId, testUserId))
      expect(userSessions).toHaveLength(1)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle registration without email', async () => {
      const optionsRequest = new NextRequest('http://localhost:3000/api/auth/passkey/register/options', {
        method: 'POST',
        body: JSON.stringify({ name: testName })
      })

      const optionsResponse = await registerOptions(optionsRequest)
      expect(optionsResponse.status).toBe(400)

      const errorData = await optionsResponse.json()
      expect(errorData.error).toBe('Email is required')
    })

    it('should handle authentication with non-existent user', async () => {
      const verifyRequest = new NextRequest('http://localhost:3000/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          authenticationResponse: mockAuthenticationResponse
        })
      })

      const verifyResponse = await authVerify(verifyRequest)
      expect(verifyResponse.status).toBe(500)
    })

    it('should handle authentication without credential', async () => {
      // Create user without credentials
      const [user] = await db.insert(users).values({
        email: testEmail,
        name: testName
      }).returning()
      testUserId = user.id

      const verifyRequest = new NextRequest('http://localhost:3000/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          authenticationResponse: mockAuthenticationResponse
        })
      })

      const verifyResponse = await authVerify(verifyRequest)
      expect(verifyResponse.status).toBe(500)
    })
  })
})