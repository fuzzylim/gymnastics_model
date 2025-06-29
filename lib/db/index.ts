import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Create the connection
const connectionString = process.env.DATABASE_URL

// For production, use a single connection
// For development, allow multiple connections for better DX
const client = postgres(connectionString, {
  max: process.env.NODE_ENV === 'production' ? 1 : 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
})

export const db = drizzle(client, { schema })

// Export the client for potential direct usage
export { client }

// Helper function to close the connection (useful for serverless)
export async function closeConnection() {
  await client.end()
}