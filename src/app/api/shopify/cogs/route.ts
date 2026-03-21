// POST /api/shopify/cogs — Save COGS entries for variants.
// Accepts array of { variantId, costPerUnit } pairs.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { pool } from "@/lib/pool";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "No store connected" }, { status: 401 });
  }

  const { entries } = (await request.json()) as {
    entries: Array<{ variantId: string; costPerUnit: number }>;
  };

  if (!entries || !Array.isArray(entries)) {
    return NextResponse.json({ error: "entries array required" }, { status: 400 });
  }

  const storeId = session.user.storeId;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let saved = 0;
    for (const entry of entries) {
      if (!entry.variantId || entry.costPerUnit == null || entry.costPerUnit < 0) {
        continue;
      }

      // Verify the variant belongs to this store
      const variantCheck = await client.query(
        "SELECT id FROM shopify_product_variants WHERE id = $1 AND store_id = $2",
        [entry.variantId, storeId]
      );
      if (variantCheck.rows.length === 0) continue;

      // Close any existing open COGS entry
      await client.query(
        `UPDATE cogs_entries
         SET effective_to = CURRENT_DATE
         WHERE variant_id = $1 AND store_id = $2 AND effective_to IS NULL`,
        [entry.variantId, storeId]
      );

      // Insert new COGS entry
      await client.query(
        `INSERT INTO cogs_entries (store_id, variant_id, cost_per_unit, effective_from, source)
         VALUES ($1, $2, $3, CURRENT_DATE, 'manual')
         ON CONFLICT (variant_id, effective_from) DO UPDATE SET
           cost_per_unit = EXCLUDED.cost_per_unit`,
        [storeId, entry.variantId, entry.costPerUnit.toFixed(2)]
      );
      saved++;
    }

    await client.query("COMMIT");

    return NextResponse.json({ saved, total: entries.length });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("COGS save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  } finally {
    client.release();
  }
}
