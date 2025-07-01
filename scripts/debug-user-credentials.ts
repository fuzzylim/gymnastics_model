import { config } from 'dotenv'
config()

import { db } from '../lib/db'
import { users, credentials } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

async function debugUserCredentials(email: string) {
  try {
    console.log(`\n🔍 Debugging credentials for: ${email}\n`)
    
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    
    if (!user) {
      console.log('❌ User not found with email:', email)
      return
    }
    
    console.log('✅ User found:')
    console.log({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    
    // Find credentials
    const userCredentials = await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, user.id))
    
    console.log(`\n📱 Found ${userCredentials.length} credential(s):`)
    
    userCredentials.forEach((cred, index) => {
      console.log(`\nCredential ${index + 1}:`)
      console.log({
        credentialId: cred.credentialId,
        counter: cred.counter,
        lastUsed: cred.lastUsed,
        createdAt: cred.createdAt,
        transports: cred.transports,
      })
    })
    
    if (userCredentials.length === 0) {
      console.log('\n⚠️  No credentials found for this user.')
      console.log('This means registration may not have completed successfully.')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

// Run with email from command line or default to fuzzylim@gmail.com
const email = process.argv[2] || 'fuzzylim@gmail.com'
debugUserCredentials(email)