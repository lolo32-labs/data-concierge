import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getClientConfig } from "@/lib/client-config";
import { computeStoreMetrics } from "@/lib/metrics";

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { clientId } = await params;

  // Auth check
  if (!(await isAuthenticated(clientId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load client config
  const config = await getClientConfig(clientId);
  if (!config) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const metrics = await computeStoreMetrics(config.database_schema);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error(`Dashboard metrics error (${clientId}):`, error);
    return NextResponse.json(
      { error: "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
