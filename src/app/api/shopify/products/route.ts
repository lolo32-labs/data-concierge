// GET /api/shopify/products — Get products + variants with COGS for the authenticated store.
// Used by onboarding (top 10) and settings (all).
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { pool } from "@/lib/pool";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.storeId) {
    return NextResponse.json({ noStore: true, error: "No store connected" }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const result = await pool.query(
    `SELECT
       p.id AS product_id,
       p.title AS product_title,
       p.shopify_gid AS product_gid,
       v.id AS variant_id,
       v.title AS variant_title,
       v.sku,
       v.price,
       v.inventory_quantity,
       c.cost_per_unit,
       c.source AS cogs_source,
       CASE WHEN v.price > 0 AND c.cost_per_unit IS NOT NULL
         THEN ROUND(((v.price - c.cost_per_unit) / v.price * 100)::numeric, 1)
         ELSE NULL
       END AS margin_pct
     FROM shopify_products p
     JOIN shopify_product_variants v ON v.product_id = p.id
     LEFT JOIN cogs_entries c ON c.variant_id = v.id AND c.effective_to IS NULL
     WHERE p.store_id = $1 AND p.status = 'active'
     ORDER BY p.title, v.title
     LIMIT $2`,
    [session.user.storeId, limit]
  );

  // Group by product
  const products = new Map<string, {
    productId: string;
    title: string;
    variants: Array<{
      variantId: string;
      title: string;
      sku: string | null;
      price: number;
      inventoryQuantity: number | null;
      costPerUnit: number | null;
      cogsSource: string | null;
      marginPct: number | null;
    }>;
  }>();

  for (const row of result.rows) {
    if (!products.has(row.product_id)) {
      products.set(row.product_id, {
        productId: row.product_id,
        title: row.product_title,
        variants: [],
      });
    }
    products.get(row.product_id)!.variants.push({
      variantId: row.variant_id,
      title: row.variant_title,
      sku: row.sku,
      price: parseFloat(row.price),
      inventoryQuantity: row.inventory_quantity,
      costPerUnit: row.cost_per_unit ? parseFloat(row.cost_per_unit) : null,
      cogsSource: row.cogs_source,
      marginPct: row.margin_pct ? parseFloat(row.margin_pct) : null,
    });
  }

  return NextResponse.json({
    products: Array.from(products.values()),
    total: products.size,
  });
}
