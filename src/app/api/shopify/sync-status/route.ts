// GET /api/shopify/sync-status — Check sync status for the authenticated user's store.
// Used by onboarding UI to poll for sync completion.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { resolveStoreId } from "@/lib/resolve-store";
import { pool } from "@/lib/pool";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const storeId = await resolveStoreId(session);
  if (!storeId) {
    return NextResponse.json({ noStore: true, error: "No store connected" }, { status: 200 });
  }

  const result = await pool.query(
    `SELECT sync_status, last_sync_at,
       (SELECT COUNT(*) FROM shopify_orders WHERE store_id = $1)::int AS order_count,
       (SELECT COUNT(*) FROM shopify_products WHERE store_id = $1)::int AS product_count
     FROM stores WHERE id = $1`,
    [storeId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const store = result.rows[0];
  return NextResponse.json({
    syncStatus: store.sync_status,
    lastSyncAt: store.last_sync_at,
    orderCount: store.order_count,
    productCount: store.product_count,
  });
}
