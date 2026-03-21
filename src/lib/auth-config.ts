// src/lib/auth-config.ts — Auth.js v5 configuration for ProfitSight MVP
// This is the NEW auth system (JWT-based). Used by /auth/* and /api/auth/* routes.
// The OLD cookie-based auth (src/lib/auth.ts) is still used by /[clientId]/* demo routes.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "./pool";

/**
 * Core authorization logic, extracted for testability.
 * Returns user object on success, null on failure.
 */
export async function authorizeCredentials(
  credentials: Partial<Record<"email" | "password", unknown>> | undefined
) {
  if (!credentials?.email || !credentials?.password) return null;

  const result = await pool.query(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1",
    [credentials.email]
  );

  const user = result.rows[0];
  if (!user || !user.password_hash) return null;

  const valid = await bcrypt.compare(
    credentials.password as string,
    user.password_hash
  );
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch the user's active store (null if they haven't connected Shopify yet)
        const { rows } = await pool.query(
          "SELECT id FROM stores WHERE user_id = $1 LIMIT 1",
          [user.id]
        );
        token.storeId = rows[0]?.id ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.storeId = token.storeId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
  },
});
