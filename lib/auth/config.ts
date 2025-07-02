import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import { EmailProvider } from "./email-provider"
import Credentials from "next-auth/providers/credentials"
import { getUserById } from "@/lib/db/auth-utils"

const config = {
  adapter: DrizzleAdapter(db),
  providers: [
    EmailProvider,
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: {
        userId: { label: "User ID", type: "text" },
        email: { label: "Email", type: "email" },
        isPasskeyAuth: { label: "Passkey Auth", type: "text" },
      },
      async authorize(credentials) {
        // Only allow this provider for passkey authentication
        if (!credentials?.isPasskeyAuth || credentials.isPasskeyAuth !== "true") {
          return null
        }

        if (!credentials?.userId || !credentials?.email) {
          return null
        }

        // Verify the user exists
        const user = await getUserById(credentials.userId as string)
        if (!user || user.email !== credentials.email) {
          return null
        }

        // Return user object for session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Include user ID in the token
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Send user ID to the client
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  events: {
    async signOut() {
      // Clear any custom session cookies on sign out
    },
  },
  cookies: {
    sessionToken: {
      name: `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)
export { config as authConfig }