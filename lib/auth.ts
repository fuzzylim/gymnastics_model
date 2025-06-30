// Re-export the main auth functions from the config
export { auth, signIn, signOut } from './auth/config'
export type { Session } from 'next-auth'