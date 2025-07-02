import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, credentials, authChallenges } from '@/lib/db/schema'

export async function GET() {
  try {
    // Get counts of users, credentials, and challenges
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt
    }).from(users).limit(10)
    
    const allCredentials = await db.select({
      id: credentials.id,
      credentialId: credentials.credentialId,
      userId: credentials.userId,
      createdAt: credentials.createdAt
    }).from(credentials).limit(10)
    
    const allChallenges = await db.select({
      id: authChallenges.id,
      type: authChallenges.type,
      userId: authChallenges.userId,
      used: authChallenges.used,
      expiresAt: authChallenges.expiresAt,
      createdAt: authChallenges.createdAt
    }).from(authChallenges).limit(10)
    
    return NextResponse.json({
      users: {
        count: allUsers.length,
        data: allUsers
      },
      credentials: {
        count: allCredentials.length,
        data: allCredentials
      },
      challenges: {
        count: allChallenges.length,
        data: allChallenges
      }
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ error: 'Failed to fetch debug data' }, { status: 500 })
  }
}