import { cookies } from "next/headers";

/**
 * LEGACY AUTH — cookie-based, used ONLY by /[clientId]/* demo routes.
 * Do NOT use this for new merchant routes. Use Auth.js from auth-config.ts instead.
 * This will be removed once demo mode migrates to the new multi-tenant schema.
 */
export async function isAuthenticated(clientId: string): Promise<boolean> {
  if (clientId === "demo") return true;

  const cookieStore = await cookies();
  const authCookie = cookieStore.get(`dc-auth-${clientId}`);
  return authCookie?.value === "authenticated";
}
