// src/lib/pool.ts — Single shared database pool for the entire application.
// All modules should import from here instead of creating their own Pool instances.
// See: eng review issue #1 — consolidate pools to avoid connection exhaustion on Vercel.
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

export const readonlyPool = new Pool({
  connectionString: process.env.DATABASE_READONLY_URL || process.env.DATABASE_URL,
  max: 5,
});
