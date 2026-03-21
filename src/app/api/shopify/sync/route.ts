// POST /api/shopify/sync — Trigger a full sync for the authenticated user's store.
// Called from onboarding flow and "Refresh Now" button.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { resolveStoreId } from "@/lib/resolve-store";
import { runFullSync } from "@/lib/shopify-sync";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const storeId = await resolveStoreId(session);
  if (!storeId) {
    return NextResponse.json({ noStore: true, error: "No store connected" }, { status: 200 });
  }

  try {
    const result = await runFullSync(storeId);
    return NextResponse.json({
      success: true,
      synced: result,
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed. Please try again." },
      { status: 500 }
    );
  }
}
