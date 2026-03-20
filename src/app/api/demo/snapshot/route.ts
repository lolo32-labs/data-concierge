import { NextResponse } from "next/server";
import { computeStoreMetrics } from "@/lib/metrics";

export async function GET() {
  try {
    const metrics = await computeStoreMetrics("client_shopify_demo");
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Demo snapshot error:", error);
    return NextResponse.json(
      { error: "Failed to load demo snapshot" },
      { status: 500 }
    );
  }
}
