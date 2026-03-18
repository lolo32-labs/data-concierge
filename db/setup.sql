-- db/setup.sql
-- Run this against your PostgreSQL database to set up roles and the config table.

-- 1. Create readonly role (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'readonly') THEN
    CREATE ROLE readonly LOGIN PASSWORD 'CHANGE_ME';
  END IF;
END
$$;

-- 2. Client configs table (in public schema)
CREATE TABLE IF NOT EXISTS public.client_configs (
  client_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  database_schema TEXT NOT NULL,
  password TEXT NOT NULL,
  suggested_questions JSONB NOT NULL DEFAULT '[]',
  dashboard_metrics JSONB NOT NULL DEFAULT '[]',
  schema_description TEXT NOT NULL DEFAULT '',
  business_context TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Grant readonly access to client_configs
GRANT SELECT ON public.client_configs TO readonly;

-- 4. Revoke information_schema and pg_catalog access from readonly
REVOKE ALL ON SCHEMA information_schema FROM readonly;
REVOKE ALL ON ALL TABLES IN SCHEMA information_schema FROM readonly;
REVOKE ALL ON SCHEMA pg_catalog FROM readonly;

-- Example: create a client schema
-- CREATE SCHEMA client_mikes_auto;
-- GRANT USAGE ON SCHEMA client_mikes_auto TO readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA client_mikes_auto TO readonly;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA client_mikes_auto GRANT SELECT ON TABLES TO readonly;
