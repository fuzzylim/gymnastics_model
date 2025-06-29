import { eq, and, gt, lt } from 'drizzle-orm'
import { db } from './index'
import { 
  users, 
  credentials, 
  authChallenges, 
  sessions,
  type User,
  type Credential,
  type AuthChallenge,
  type NewCredential,
  type NewAuthChallenge
} from './schema'

/**
 * User operations
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  return result[0] || null
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  return result[0] || null
}

export async function createUser(userData: {
  email: string
  name?: string
  emailVerified?: Date
}): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(userData)
    .returning()

  return user
}

/**
 * Credential operations for passkeys
 */
export async function getUserCredentials(userId: string): Promise<Credential[]> {
  return await db
    .select()
    .from(credentials)
    .where(eq(credentials.userId, userId))
}

export async function getCredentialById(credentialId: string): Promise<Credential | null> {
  const result = await db
    .select()
    .from(credentials)
    .where(eq(credentials.credentialId, credentialId))
    .limit(1)

  return result[0] || null
}

export async function createCredential(credentialData: NewCredential): Promise<Credential> {
  const [credential] = await db
    .insert(credentials)
    .values(credentialData)
    .returning()

  return credential
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  await db
    .update(credentials)
    .set({ 
      counter, 
      lastUsed: new Date(),
    })
    .where(eq(credentials.credentialId, credentialId))
}

export async function deleteCredential(credentialId: string): Promise<void> {
  await db
    .delete(credentials)
    .where(eq(credentials.credentialId, credentialId))
}

/**
 * Challenge operations for WebAuthn
 */
export async function createChallenge(challengeData: NewAuthChallenge): Promise<AuthChallenge> {
  // Clean up expired challenges first
  await cleanupExpiredChallenges()

  const [challenge] = await db
    .insert(authChallenges)
    .values(challengeData)
    .returning()

  return challenge
}

export async function getValidChallenge(challenge: string, userId?: string): Promise<AuthChallenge | null> {
  const conditions = [
    eq(authChallenges.challenge, challenge),
    eq(authChallenges.used, false),
    gt(authChallenges.expiresAt, new Date())
  ]

  if (userId) {
    conditions.push(eq(authChallenges.userId, userId))
  }

  const result = await db
    .select()
    .from(authChallenges)
    .where(and(...conditions))
    .limit(1)

  return result[0] || null
}

export async function markChallengeAsUsed(challengeId: string): Promise<void> {
  await db
    .update(authChallenges)
    .set({ used: true })
    .where(eq(authChallenges.id, challengeId))
}

export async function cleanupExpiredChallenges(): Promise<void> {
  await db
    .delete(authChallenges)
    .where(
      and(
        eq(authChallenges.used, false),
        lt(authChallenges.expiresAt, new Date())
      )
    )
}

/**
 * Session operations
 */
export async function createSession(sessionData: {
  sessionToken: string
  userId: string
  expires: Date
}) {
  const [session] = await db
    .insert(sessions)
    .values(sessionData)
    .returning()

  return session
}

export async function getSessionByToken(sessionToken: string) {
  const result = await db
    .select({
      id: sessions.id,
      sessionToken: sessions.sessionToken,
      userId: sessions.userId,
      expires: sessions.expires,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
        image: users.image,
      }
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.sessionToken, sessionToken),
        gt(sessions.expires, new Date())
      )
    )
    .limit(1)

  return result[0] || null
}

export async function updateSessionExpires(sessionToken: string, expires: Date) {
  await db
    .update(sessions)
    .set({ expires })
    .where(eq(sessions.sessionToken, sessionToken))
}

export async function deleteSession(sessionToken: string) {
  await db
    .delete(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
}

export async function deleteUserSessions(userId: string) {
  await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
}