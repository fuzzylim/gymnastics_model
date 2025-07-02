import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  createSession, 
  getSessionByToken, 
  updateSessionExpires, 
  deleteSession, 
  deleteUserSessions 
} from '@/lib/db/auth-utils'
import { db } from '@/lib/db'
import { users, sessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

describe('Session Management', () => {
  let testUserId: string
  let testSessionToken: string

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      name: 'Test User'
    }).returning()
    testUserId = user.id

    testSessionToken = 'test-session-token-' + Date.now()
  })

  afterEach(async () => {
    // Clean up test data only if testUserId is valid
    if (testUserId && testUserId.length > 0) {
      await db.delete(sessions).where(eq(sessions.userId, testUserId))
      await db.delete(users).where(eq(users.id, testUserId))
    }
  })

  describe('createSession', () => {
    it('should create a new session', async () => {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      const session = await createSession({
        sessionToken: testSessionToken,
        userId: testUserId,
        expires
      })

      expect(session).toBeDefined()
      expect(session.sessionToken).toBe(testSessionToken)
      expect(session.userId).toBe(testUserId)
      expect(session.expires).toEqual(expires)
      expect(session.id).toBeDefined()

      // Verify in database
      const [dbSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, testSessionToken))

      expect(dbSession).toBeDefined()
      expect(dbSession.sessionToken).toBe(testSessionToken)
      expect(dbSession.userId).toBe(testUserId)
    })

    it('should create session with proper timestamps', async () => {
      const now = new Date()
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const session = await createSession({
        sessionToken: testSessionToken,
        userId: testUserId,
        expires
      })

      expect(session.expires.getTime()).toBe(expires.getTime())
      expect(session.expires.getTime()).toBeGreaterThan(now.getTime())
    })
  })

  describe('getSessionByToken', () => {
    beforeEach(async () => {
      // Create a test session
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await createSession({
        sessionToken: testSessionToken,
        userId: testUserId,
        expires
      })
    })

    it('should retrieve valid session with user data', async () => {
      const sessionData = await getSessionByToken(testSessionToken)

      expect(sessionData).toBeDefined()
      expect(sessionData!.sessionToken).toBe(testSessionToken)
      expect(sessionData!.userId).toBe(testUserId)
      expect(sessionData!.user).toBeDefined()
      expect(sessionData!.user.id).toBe(testUserId)
      expect(sessionData!.user.email).toBe('test@example.com')
      expect(sessionData!.user.name).toBe('Test User')
    })

    it('should return null for non-existent session', async () => {
      const sessionData = await getSessionByToken('non-existent-token')
      expect(sessionData).toBeNull()
    })

    it('should return null for expired session', async () => {
      // Create expired session
      const expiredToken = 'expired-session-token'
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

      await createSession({
        sessionToken: expiredToken,
        userId: testUserId,
        expires: pastDate
      })

      const sessionData = await getSessionByToken(expiredToken)
      expect(sessionData).toBeNull()
    })
  })

  describe('updateSessionExpires', () => {
    beforeEach(async () => {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await createSession({
        sessionToken: testSessionToken,
        userId: testUserId,
        expires
      })
    })

    it('should update session expiration', async () => {
      const newExpires = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

      await updateSessionExpires(testSessionToken, newExpires)

      const sessionData = await getSessionByToken(testSessionToken)
      expect(sessionData).toBeDefined()
      expect(sessionData!.expires.getTime()).toBe(newExpires.getTime())
    })

    it('should extend session lifetime', async () => {
      const originalSession = await getSessionByToken(testSessionToken)
      const originalExpires = originalSession!.expires

      const extendedExpires = new Date(originalExpires.getTime() + 24 * 60 * 60 * 1000)
      await updateSessionExpires(testSessionToken, extendedExpires)

      const updatedSession = await getSessionByToken(testSessionToken)
      expect(updatedSession!.expires.getTime()).toBeGreaterThan(originalExpires.getTime())
    })
  })

  describe('deleteSession', () => {
    beforeEach(async () => {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await createSession({
        sessionToken: testSessionToken,
        userId: testUserId,
        expires
      })
    })

    it('should delete specific session', async () => {
      // Verify session exists
      let sessionData = await getSessionByToken(testSessionToken)
      expect(sessionData).toBeDefined()

      // Delete session
      await deleteSession(testSessionToken)

      // Verify session is gone
      sessionData = await getSessionByToken(testSessionToken)
      expect(sessionData).toBeNull()
    })

    it('should not affect other sessions', async () => {
      // Create second session
      const secondToken = 'second-session-token'
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await createSession({
        sessionToken: secondToken,
        userId: testUserId,
        expires
      })

      // Delete first session
      await deleteSession(testSessionToken)

      // Verify second session still exists
      const secondSession = await getSessionByToken(secondToken)
      expect(secondSession).toBeDefined()

      // Clean up
      await deleteSession(secondToken)
    })
  })

  describe('deleteUserSessions', () => {
    beforeEach(async () => {
      // Create multiple sessions for the user
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      await createSession({
        sessionToken: testSessionToken,
        userId: testUserId,
        expires
      })

      await createSession({
        sessionToken: testSessionToken + '-2',
        userId: testUserId,
        expires
      })
    })

    it('should delete all sessions for a user', async () => {
      // Verify sessions exist
      let session1 = await getSessionByToken(testSessionToken)
      let session2 = await getSessionByToken(testSessionToken + '-2')
      expect(session1).toBeDefined()
      expect(session2).toBeDefined()

      // Delete all user sessions
      await deleteUserSessions(testUserId)

      // Verify all sessions are gone
      session1 = await getSessionByToken(testSessionToken)
      session2 = await getSessionByToken(testSessionToken + '-2')
      expect(session1).toBeNull()
      expect(session2).toBeNull()
    })

    it('should not affect other users sessions', async () => {
      // Create second user with session
      const [secondUser] = await db.insert(users).values({
        email: 'second@example.com',
        name: 'Second User'
      }).returning()

      const secondUserToken = 'second-user-token'
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await createSession({
        sessionToken: secondUserToken,
        userId: secondUser.id,
        expires
      })

      // Delete first user's sessions
      await deleteUserSessions(testUserId)

      // Verify second user's session still exists
      const secondUserSession = await getSessionByToken(secondUserToken)
      expect(secondUserSession).toBeDefined()

      // Clean up
      await deleteSession(secondUserToken)
      await db.delete(users).where(eq(users.id, secondUser.id))
    })
  })

  describe('Session Security', () => {
    it('should handle concurrent session creation', async () => {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      // Create multiple sessions concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        createSession({
          sessionToken: `concurrent-token-${i}`,
          userId: testUserId,
          expires
        })
      )

      const sessions = await Promise.all(promises)
      
      // All sessions should be created successfully
      expect(sessions).toHaveLength(5)
      sessions.forEach((session, i) => {
        expect(session.sessionToken).toBe(`concurrent-token-${i}`)
        expect(session.userId).toBe(testUserId)
      })

      // Clean up
      await Promise.all(
        sessions.map(session => deleteSession(session.sessionToken))
      )
    })

    it('should enforce unique session tokens', async () => {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      // Create first session
      await createSession({
        sessionToken: testSessionToken,
        userId: testUserId,
        expires
      })

      // Attempt to create duplicate session token should fail
      await expect(createSession({
        sessionToken: testSessionToken,
        userId: testUserId,
        expires
      })).rejects.toThrow()
    })

    it('should handle session cleanup after user deletion', async () => {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      await createSession({
        sessionToken: testSessionToken,
        userId: testUserId,
        expires
      })

      // Verify session exists
      let sessionData = await getSessionByToken(testSessionToken)
      expect(sessionData).toBeDefined()

      // Delete user (sessions should be cleaned up via foreign key constraint)
      await db.delete(users).where(eq(users.id, testUserId))

      // Session should no longer be retrievable
      sessionData = await getSessionByToken(testSessionToken)
      expect(sessionData).toBeNull()

      // Don't run afterEach cleanup since user is already deleted
      testUserId = ''
    })
  })
})