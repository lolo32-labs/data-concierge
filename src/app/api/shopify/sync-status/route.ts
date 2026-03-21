// GET /api/shopify/sync-status — Check sync status for the authenticated user's store.
// Used by onboarding UI to poll for sync completion and show live progress.
// Returns current counts so the UI can display "17 products synced, 5 orders synced..."
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
    `SELECT s.sync_status, s.last_sync_at, s.shop_name,
       (SELECT COUNT(*) FROM shopify_orders WHERE store_id = $1)::int AS order_count,
       (SELECT COUNT(*) FROM shopify_products WHERE store_id = $1)::int AS product_count,
       (SELECT COUNT(*) FROM shopify_product_variants WHERE store_id = $1)::int AS variant_count,
       (SELECT COUNT(*) FROM shopify_order_line_items WHERE store_id = $1)::int AS line_item_count
     FROM stores s WHERE s.id = $1`,
    [storeId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const store = result.rows[0];
  return NextResponse.json({
    syncStatus: store.sync_status,
    lastSyncAt: store.last_sync_at,
    shopName: store.shop_name,
    productCount: store.product_count,
    variantCount: store.variant_count,
    orderCount: store.order_count,
    lineItemCount: store.line_item_count,
  });
}
