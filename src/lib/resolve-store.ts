// src/lib/resolve-store.ts — Resolve storeId from JWT or DB lookup.
// The JWT mints storeId at login time. If a store is connected AFTER login,
// the JWT still has storeId=null. This helper falls back to a DB lookup.
import { pool } from "./pool";

export async function resolveStoreId(
  session: { user: { id: string; storeId?: string | null } }
): Promise<string | null> {
  // Fast path: storeId is in the JWT
  if (session.user.storeId) return session.user.storeId;

  // Slow path: look up from DB (store was connected after JWT was minted)
  const result = await pool.query(
    "SELECT id FROM stores WHERE user_id = $1 LIMIT 1",
    [session.user.id]
  );

  return result.rows[0]?.id || null;
}
