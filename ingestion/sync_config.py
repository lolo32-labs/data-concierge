# ingestion/sync_config.py
"""Sync client YAML configs to the client_configs PostgreSQL table."""
import argparse
import json
import os
import yaml
import psycopg2


def sync_configs(clients_dir: str, db_url: str):
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    for client_id in sorted(os.listdir(clients_dir)):
        config_path = os.path.join(clients_dir, client_id, "config.yaml")
        if not os.path.isfile(config_path):
            continue
        with open(config_path) as f:
            config = yaml.safe_load(f)

        cur.execute(
            """
            INSERT INTO public.client_configs
                (client_id, name, database_schema, password,
                 suggested_questions, dashboard_metrics,
                 schema_description, business_context, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (client_id) DO UPDATE SET
                name = EXCLUDED.name,
                database_schema = EXCLUDED.database_schema,
                password = EXCLUDED.password,
                suggested_questions = EXCLUDED.suggested_questions,
                dashboard_metrics = EXCLUDED.dashboard_metrics,
                schema_description = EXCLUDED.schema_description,
                business_context = EXCLUDED.business_context,
                updated_at = now()
            """,
            (
                config["client_id"],
                config["name"],
                config["database_schema"],
                config["password"],
                json.dumps(config.get("suggested_questions", [])),
                json.dumps(config.get("dashboard_metrics", [])),
                config.get("schema_description", ""),
                config.get("business_context", ""),
            ),
        )
        print(f"  Synced config: {config['client_id']}")

    cur.close()
    conn.close()
    print("Done syncing configs.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync client configs to PostgreSQL")
    parser.add_argument("--clients-dir", default="clients")
    parser.add_argument("--db-url", default=os.environ.get("DATABASE_URL"))
    args = parser.parse_args()
    if not args.db_url:
        print("Error: DATABASE_URL env var or --db-url required")
        exit(1)
    sync_configs(args.clients_dir, args.db_url)
