import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import { EmailProvider } from "./email-provider"

const config = {
  adapter: DrizzleAdapter(db),
  providers: [
    EmailProvider,
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
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)
export { config as authConfig }