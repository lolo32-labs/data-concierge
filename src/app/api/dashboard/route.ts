// GET /api/dashboard — Returns computed profit metrics for the authenticated store.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { resolveStoreId } from "@/lib/resolve-store";
import { computeDashboardMetrics } from "@/lib/profit-metrics";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const storeId = await resolveStoreId(session);
  if (!storeId) {
    return NextResponse.json({ noStore: true, error: "No store connected" }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const periodDays = [7, 30, 90].includes(days) ? days : 30;

  try {
    const metrics = await computeDashboardMetrics(storeId, periodDays);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { error: "Failed to compute metrics" },
      { status: 500 }
    );
  }
}
