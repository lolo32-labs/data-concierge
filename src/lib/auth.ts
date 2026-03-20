import { cookies } from "next/headers";

/**
 * Check if the request is authenticated for a given client.
 * Returns true if the auth cookie is present and valid.
 * The "demo" client is always allowed (no auth required).
 */
export async function isAuthenticated(clientId: string): Promise<boolean> {
  if (clientId === "demo") return true;

  const cookieStore = await cookies();
  const authCookie = cookieStore.get(`dc-auth-${clientId}`);
  return authCookie?.value === "authenticated";
}
