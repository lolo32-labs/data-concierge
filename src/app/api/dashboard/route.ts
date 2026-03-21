// GET /api/dashboard — Returns computed profit metrics for the authenticated store.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { computeDashboardMetrics } from "@/lib/profit-metrics";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "No store connected" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const periodDays = [7, 30, 90].includes(days) ? days : 30;

  try {
    const metrics = await computeDashboardMetrics(session.user.storeId, periodDays);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { error: "Failed to compute metrics" },
      { status: 500 }
    );
  }
}
