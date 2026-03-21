// GET /api/shopify/store-status — Get store connection status + basic info.
// Used by dashboard layout and reconnect flow.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { pool } from "@/lib/pool";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has a store
  const storeResult = await pool.query(
    `SELECT s.id, s.shopify_domain, s.store_name, s.currency,
            s.plan, s.trial_ends_at, s.sync_status, s.last_sync_at,
            (SELECT COUNT(*) > 0 FROM shopify_tokens WHERE store_id = s.id) AS has_token
     FROM stores s
     WHERE s.user_id = $1
     LIMIT 1`,
    [session.user.id]
  );

  if (storeResult.rows.length === 0) {
    return NextResponse.json({
      connected: false,
      needsOnboarding: true,
    });
  }

  const store = storeResult.rows[0];
  const connected = store.has_token && store.sync_status !== "disconnected";

  return NextResponse.json({
    connected,
    needsOnboarding: store.sync_status === "pending",
    needsReconnect: !store.has_token || store.sync_status === "disconnected",
    store: {
      id: store.id,
      domain: store.shopify_domain,
      name: store.store_name,
      currency: store.currency,
      plan: store.plan,
      trialEndsAt: store.trial_ends_at,
      syncStatus: store.sync_status,
      lastSyncAt: store.last_sync_at,
    },
  });
}
