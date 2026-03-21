// src/lib/db.ts
import { type QueryResultRow } from "pg";
import { pool as adminPool, readonlyPool } from "./pool";

/**
 * Execute a safe, read-only query scoped to a client's schema.
 * Sets search_path and statement_timeout per connection.
 */
export async function executeClientQuery(
  schema: string,
  sql: string
): Promise<QueryResultRow[]> {
  const client = await readonlyPool.connect();
  try {
    await client.query(`SET search_path = ${quoteIdent(schema)}`);
    await client.query("SET statement_timeout = 5000");
    const result = await client.query(sql);
    return result.rows;
  } finally {
    // Reset before returning to pool
    await client.query("RESET search_path");
    await client.query("RESET statement_timeout");
    client.release();
  }
}

/**
 * Execute a query against the public schema (for config, metrics).
 */
export async function executeAdminQuery<T extends QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await adminPool.query<T>(sql, params);
  return result.rows;
}

/**
 * Quote a SQL identifier to prevent injection in SET search_path.
 */
function quoteIdent(ident: string): string {
  // Only allow alphanumeric and underscores in schema names
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(ident)) {
    throw new Error(`Invalid schema name: ${ident}`);
  }
  return `"${ident}"`;
}
