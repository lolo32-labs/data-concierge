import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/client-config";
import { executeClientQuery } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

interface MetricResult {
  label: string;
  value: number | null;
  previousValue: number | null;
  format: string;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { clientId } = await params;

  // Auth check
  if (!(await isAuthenticated(clientId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getClientConfig(clientId);
  if (!config) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const metrics: MetricResult[] = await Promise.all(
    config.dashboard_metrics.map(async (metric) => {
      try {
        const [currentRows, compareRows] = await Promise.all([
          executeClientQuery(config.database_schema, metric.query),
          metric.compare_query
            ? executeClientQuery(config.database_schema, metric.compare_query)
            : Promise.resolve([]),
        ]);

        const value = currentRows[0] ? Number(Object.values(currentRows[0])[0]) : null;
        const previousValue = compareRows[0] ? Number(Object.values(compareRows[0])[0]) : null;

        return {
          label: metric.label,
          value,
          previousValue,
          format: metric.format,
        };
      } catch (error) {
        console.error(`Metric error (${metric.label}):`, error);
        return { label: metric.label, value: null, previousValue: null, format: metric.format };
      }
    })
  );

  return NextResponse.json({ metrics, updatedAt: new Date().toISOString() });
}
