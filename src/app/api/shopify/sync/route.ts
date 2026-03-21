// POST /api/shopify/sync — Trigger a full sync for the authenticated user's store.
// Called from onboarding flow and "Refresh Now" button.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { runFullSync } from "@/lib/shopify-sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "No store connected" }, { status: 401 });
  }

  try {
    const result = await runFullSync(session.user.storeId);
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
