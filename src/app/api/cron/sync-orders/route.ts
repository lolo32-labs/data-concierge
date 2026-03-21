// GET /api/cron/sync-orders — Daily cron job for incremental order sync.
// Runs via Vercel Cron. Syncs orders updated since last sync for all active stores.
import { NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { syncOrders } from "@/lib/shopify-sync";

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all stores that are synced and have a token
  const stores = await pool.query(
    `SELECT s.id, s.shopify_domain, s.last_sync_at
     FROM stores s
     JOIN shopify_tokens t ON t.store_id = s.id
     WHERE s.sync_status IN ('synced', 'error')
     ORDER BY s.last_sync_at ASC NULLS FIRST`
  );

  const results: Array<{ storeId: string; domain: string; status: string; orders?: number }> = [];

  for (const store of stores.rows) {
    // Sync orders since last sync (or 7 days if never synced — safety net)
    const since = store.last_sync_at
      ? new Date(store.last_sync_at).toISOString().split("T")[0]
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    try {
      const result = await syncOrders(store.id, since);
      results.push({
        storeId: store.id,
        domain: store.shopify_domain,
        status: "success",
        orders: result.orders,
      });
    } catch (error) {
      console.error(`Cron sync failed for ${store.shopify_domain}:`, error);
      results.push({
        storeId: store.id,
        domain: store.shopify_domain,
        status: "error",
      });
    }
  }

  return NextResponse.json({
    synced: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
