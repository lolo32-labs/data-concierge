// src/lib/client-config.ts
import { executeAdminQuery } from "@/lib/db";

export interface DashboardMetric {
  label: string;
  query: string;
  format: "currency" | "number" | "percentage";
  compare_query: string;
}

export interface ClientConfig {
  client_id: string;
  name: string;
  database_schema: string;
  password: string;
  suggested_questions: string[];
  dashboard_metrics: DashboardMetric[];
  schema_description: string;
  business_context: string;
}

export async function getClientConfig(clientId: string): Promise<ClientConfig | null> {
  const rows = await executeAdminQuery<ClientConfig>(
    "SELECT * FROM public.client_configs WHERE client_id = $1",
    [clientId]
  );
  return rows[0] ?? null;
}
