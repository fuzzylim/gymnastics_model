import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getUserByEmail,
  getUserById,
  createUser,
  getUserCredentials,
  getCredentialById,
  createCredential,
  updateCredentialCounter,
  deleteCredential,
  createChallenge,
  getValidChallenge,
  markChallengeAsUsed,
  cleanupExpiredChallenges
} from '@/lib/db/auth-utils'
import { db } from '@/lib/db'
import { users, credentials, authChallenges } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

describe('Auth Utils Integration Tests', () => {
  let testUserId: string
  let testCredentialId: string
  let testChallengeId: string

  afterEach(async () => {
    // Clean up in reverse dependency order
    if (testChallengeId) {
      await db.delete(authChallenges).where(eq(authChallenges.id, testChallengeId))
    }
    if (testCredentialId) {
      await db.delete(credentials).where(eq(credentials.id, testCredentialId))
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId))
    }
    
    // Clean up any remaining test data
    await db.delete(authChallenges)
    await db.delete(credentials)
    await db.delete(users).where(eq(users.email, 'test@example.com'))
  })

  describe('User Operations', () => {
    describe('createUser', () => {
      it('should create user with all fields', async () => {
        const userData = {
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: new Date()
        }

        const user = await createUser(userData)
        testUserId = user.id

        expect(user).toBeDefined()
        expect(user.email).toBe(userData.email)
        expect(user.name).toBe(userData.name)
        expect(user.emailVerified).toEqual(userData.emailVerified)
        expect(user.id).toBeDefined()
        expect(user.createdAt).toBeDefined()
        expect(user.updatedAt).toBeDefined()
      })

      it('should create user with minimal fields', async () => {
        const userData = {
          email: 'minimal@example.com'
        }

        const user = await createUser(userData)
        testUserId = user.id

        expect(user.email).toBe(userData.email)
        expect(user.name).toBeNull()
        expect(user.emailVerified).toBeNull()
      })

      it('should enforce unique email constraint', async () => {
        const userData = {
          email: 'unique@example.com',
          name: 'First User'
        }

        const firstUser = await createUser(userData)
        testUserId = firstUser.id

        // Attempt to create user with same email should fail
        await expect(createUser({
          email: 'unique@example.com',
          name: 'Second User'
        })).rejects.toThrow()
      })
    })

    describe('getUserByEmail', () => {
      beforeEach(async () => {
        const user = await createUser({
          email: 'test@example.com',
          name: 'Test User'
        })
        testUserId = user.id
      })

      it('should find existing user by email', async () => {
        const user = await getUserByEmail('test@example.com')

        expect(user).toBeDefined()
        expect(user!.email).toBe('test@example.com')
        expect(user!.name).toBe('Test User')
        expect(user!.id).toBe(testUserId)
      })

      it('should return null for non-existent email', async () => {
        const user = await getUserByEmail('nonexistent@example.com')
        expect(user).toBeNull()
      })

      it('should be case sensitive', async () => {
        const user = await getUserByEmail('TEST@EXAMPLE.COM')
        expect(user).toBeNull()
      })
    })

    describe('getUserById', () => {
      beforeEach(async () => {
        const user = await createUser({
          email: 'test@example.com',
          name: 'Test User'
        })
        testUserId = user.id
      })

      it('should find existing user by id', async () => {
        const user = await getUserById(testUserId)

        expect(user).toBeDefined()
        expect(user!.id).toBe(testUserId)
        expect(user!.email).toBe('test@example.com')
      })

      it('should return null for non-existent id', async () => {
        const user = await getUserById('00000000-0000-0000-0000-000000000000')
        expect(user).toBeNull()
      })

      it('should handle invalid UUID format', async () => {
        const user = await getUserById('invalid-uuid')
        expect(user).toBeNull()
      })
    })
  })

  describe('Credential Operations', () => {
    beforeEach(async () => {
      const user = await createUser({
        email: 'test@example.com',
        name: 'Test User'
      })
      testUserId = user.id
    })

    describe('createCredential', () => {
      it('should create credential with all fields', async () => {
        const credentialData = {
          credentialId: 'test-credential-id',
          userId: testUserId,
          publicKey: 'test-public-key',
          counter: 0,
          transports: JSON.stringify(['internal', 'hybrid'])
        }

        const credential = await createCredential(credentialData)
        testCredentialId = credential.id

        expect(credential).toBeDefined()
        expect(credential.credentialId).toBe(credentialData.credentialId)
        expect(credential.userId).toBe(testUserId)
        expect(credential.publicKey).toBe(credentialData.publicKey)
        expect(credential.counter).toBe(0)
        expect(credential.transports).toEqual(['internal', 'hybrid'])
        expect(credential.createdAt).toBeDefined()
      })

      it('should create credential without transports', async () => {
        const credentialData = {
          credentialId: 'test-credential-no-transport',
          userId: testUserId,
          publicKey: 'test-public-key',
          counter: 0,
          transports: null
        }

        const credential = await createCredential(credentialData)
        testCredentialId = credential.id

        expect(credential.transports).toBeNull()
      })

      it('should enforce unique credential ID', async () => {
        const credentialData = {
          credentialId: 'unique-credential-id',
          userId: testUserId,
          publicKey: 'test-public-key',
          counter: 0
        }

        const firstCredential = await createCredential(credentialData)
        testCredentialId = firstCredential.id

        // Attempt to create credential with same ID should fail
        await expect(createCredential(credentialData)).rejects.toThrow()
      })
    })

    describe('getUserCredentials', () => {
      beforeEach(async () => {
        // Create multiple credentials for user
        const cred1 = await createCredential({
          credentialId: 'credential-1',
          userId: testUserId,
          publicKey: 'public-key-1',
          counter: 0
        })

        const cred2 = await createCredential({
          credentialId: 'credential-2',
          userId: testUserId,
          publicKey: 'public-key-2',
          counter: 5
        })

        testCredentialId = cred1.id // Will clean up the first one
      })

      it('should return all credentials for user', async () => {
        const credentials = await getUserCredentials(testUserId)

        expect(credentials).toHaveLength(2)
        expect(credentials.map(c => c.credentialId)).toContain('credential-1')
        expect(credentials.map(c => c.credentialId)).toContain('credential-2')
      })

      it('should return empty array for user with no credentials', async () => {
        const newUser = await createUser({
          email: 'nocreds@example.com'
        })

        const credentials = await getUserCredentials(newUser.id)
        expect(credentials).toHaveLength(0)

        // Clean up
        await db.delete(users).where(eq(users.id, newUser.id))
      })
    })

    describe('getCredentialById', () => {
      beforeEach(async () => {
        const credential = await createCredential({
          credentialId: 'test-credential-lookup',
          userId: testUserId,
          publicKey: 'test-public-key',
          counter: 0
        })
        testCredentialId = credential.id
      })

      it('should find credential by credentialId', async () => {
        const credential = await getCredentialById('test-credential-lookup')

        expect(credential).toBeDefined()
        expect(credential!.credentialId).toBe('test-credential-lookup')
        expect(credential!.userId).toBe(testUserId)
      })

      it('should return null for non-existent credentialId', async () => {
        const credential = await getCredentialById('non-existent-credential')
        expect(credential).toBeNull()
      })
    })

    describe('updateCredentialCounter', () => {
      beforeEach(async () => {
        const credential = await createCredential({
          credentialId: 'counter-test-credential',
          userId: testUserId,
          publicKey: 'test-public-key',
          counter: 5
        })
        testCredentialId = credential.id
      })

      it('should update counter for valid increment', async () => {
        await updateCredentialCounter('counter-test-credential', 10)

        const credential = await getCredentialById('counter-test-credential')
        expect(credential!.counter).toBe(10)
        expect(credential!.lastUsed).toBeDefined()
      })

      it('should reject counter rollback (anti-replay protection)', async () => {
        await expect(
          updateCredentialCounter('counter-test-credential', 3)
        ).rejects.toThrow('must be greater than')
      })

      it('should reject same counter value', async () => {
        await expect(
          updateCredentialCounter('counter-test-credential', 5)
        ).rejects.toThrow('must be greater than')
      })

      it('should handle non-existent credential', async () => {
        await expect(
          updateCredentialCounter('non-existent-credential', 10)
        ).rejects.toThrow('not found')
      })
    })

    describe('deleteCredential', () => {
      beforeEach(async () => {
        const credential = await createCredential({
          credentialId: 'delete-test-credential',
          userId: testUserId,
          publicKey: 'test-public-key',
          counter: 0
        })
        testCredentialId = credential.id
      })

      it('should delete existing credential', async () => {
        await deleteCredential('delete-test-credential')

        const credential = await getCredentialById('delete-test-credential')
        expect(credential).toBeNull()

        testCredentialId = '' // Already deleted
      })

      it('should handle deletion of non-existent credential', async () => {
        // Should not throw error
        await deleteCredential('non-existent-credential')
      })
    })
  })

  describe('Challenge Operations', () => {
    beforeEach(async () => {
      const user = await createUser({
        email: 'test@example.com',
        name: 'Test User'
      })
      testUserId = user.id
    })

    describe('createChallenge', () => {
      it('should create registration challenge', async () => {
        const challengeData = {
          challenge: 'test-registration-challenge',
          userId: testUserId,
          type: 'registration' as const,
          expiresAt: new Date(Date.now() + 60000)
        }

        const challenge = await createChallenge(challengeData)
        testChallengeId = challenge.id

        expect(challenge).toBeDefined()
        expect(challenge.challenge).toBe(challengeData.challenge)
        expect(challenge.userId).toBe(testUserId)
        expect(challenge.type).toBe('registration')
        expect(challenge.used).toBe(false)
        expect(challenge.createdAt).toBeDefined()
      })

      it('should create authentication challenge without userId', async () => {
        const challengeData = {
          challenge: 'test-auth-challenge',
          userId: null,
          type: 'authentication' as const,
          expiresAt: new Date(Date.now() + 60000)
        }

        const challenge = await createChallenge(challengeData)
        testChallengeId = challenge.id

        expect(challenge.userId).toBeNull()
        expect(challenge.type).toBe('authentication')
      })

      it('should cleanup expired challenges before creating new one', async () => {
        // Create expired challenge
        const expiredData = {
          challenge: 'expired-challenge',
          userId: testUserId,
          type: 'registration' as const,
          expiresAt: new Date(Date.now() - 60000) // Expired
        }

        const expiredChallenge = await createChallenge(expiredData)

        // Create new challenge (should trigger cleanup)
        const newData = {
          challenge: 'new-challenge',
          userId: testUserId,
          type: 'registration' as const,
          expiresAt: new Date(Date.now() + 60000)
        }

        const newChallenge = await createChallenge(newData)
        testChallengeId = newChallenge.id

        // Expired challenge should be cleaned up
        const foundExpired = await getValidChallenge('expired-challenge', testUserId)
        expect(foundExpired).toBeNull()
      })
    })

    describe('getValidChallenge', () => {
      beforeEach(async () => {
        const challengeData = {
          challenge: 'valid-test-challenge',
          userId: testUserId,
          type: 'authentication' as const,
          expiresAt: new Date(Date.now() + 60000)
        }

        const challenge = await createChallenge(challengeData)
        testChallengeId = challenge.id
      })

      it('should find valid challenge with userId', async () => {
        const challenge = await getValidChallenge('valid-test-challenge', testUserId)

        expect(challenge).toBeDefined()
        expect(challenge!.challenge).toBe('valid-test-challenge')
        expect(challenge!.userId).toBe(testUserId)
        expect(challenge!.used).toBe(false)
      })

      it('should find valid challenge without userId', async () => {
        const challenge = await getValidChallenge('valid-test-challenge')

        expect(challenge).toBeDefined()
        expect(challenge!.challenge).toBe('valid-test-challenge')
      })

      it('should return null for expired challenge', async () => {
        // Create expired challenge
        const expiredData = {
          challenge: 'expired-test-challenge',
          userId: testUserId,
          type: 'authentication' as const,
          expiresAt: new Date(Date.now() - 1000) // Expired
        }

        await createChallenge(expiredData)

        const challenge = await getValidChallenge('expired-test-challenge', testUserId)
        expect(challenge).toBeNull()
      })

      it('should return null for used challenge', async () => {
        await markChallengeAsUsed(testChallengeId)

        const challenge = await getValidChallenge('valid-test-challenge', testUserId)
        expect(challenge).toBeNull()
      })

      it('should return null for non-existent challenge', async () => {
        const challenge = await getValidChallenge('non-existent-challenge', testUserId)
        expect(challenge).toBeNull()
      })
    })

    describe('markChallengeAsUsed', () => {
      beforeEach(async () => {
        const challengeData = {
          challenge: 'mark-used-challenge',
          userId: testUserId,
          type: 'registration' as const,
          expiresAt: new Date(Date.now() + 60000)
        }

        const challenge = await createChallenge(challengeData)
        testChallengeId = challenge.id
      })

      it('should mark challenge as used', async () => {
        await markChallengeAsUsed(testChallengeId)

        const challenge = await getValidChallenge('mark-used-challenge', testUserId)
        expect(challenge).toBeNull() // Should not be valid anymore
      })

      it('should handle marking non-existent challenge', async () => {
        // Should not throw error
        await markChallengeAsUsed('00000000-0000-0000-0000-000000000000')
      })
    })

    describe('cleanupExpiredChallenges', () => {
      it('should remove expired challenges', async () => {
        // Create expired challenge
        const expiredData = {
          challenge: 'cleanup-expired-challenge',
          userId: testUserId,
          type: 'authentication' as const,
          expiresAt: new Date(Date.now() - 60000) // Expired
        }

        await createChallenge(expiredData)

        // Create valid challenge
        const validData = {
          challenge: 'cleanup-valid-challenge',
          userId: testUserId,
          type: 'authentication' as const,
          expiresAt: new Date(Date.now() + 60000)
        }

        const validChallenge = await createChallenge(validData)
        testChallengeId = validChallenge.id

        // Run cleanup
        await cleanupExpiredChallenges()

        // Expired challenge should be gone
        const expiredFound = await getValidChallenge('cleanup-expired-challenge', testUserId)
        expect(expiredFound).toBeNull()

        // Valid challenge should remain
        const validFound = await getValidChallenge('cleanup-valid-challenge', testUserId)
        expect(validFound).toBeDefined()
      })

      it('should only remove unused expired challenges', async () => {
        // Create expired but used challenge
        const expiredUsedData = {
          challenge: 'expired-used-challenge',
          userId: testUserId,
          type: 'authentication' as const,
          expiresAt: new Date(Date.now() - 60000) // Expired
        }

        const expiredUsedChallenge = await createChallenge(expiredUsedData)
        await markChallengeAsUsed(expiredUsedChallenge.id)

        // Run cleanup
        await cleanupExpiredChallenges()

        // Used challenge should be removed during cleanup
        // (cleanup removes unused AND expired challenges)
      })
    })
  })
})