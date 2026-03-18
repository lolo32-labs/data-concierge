# ingestion/load.py
"""Load a client's data into PostgreSQL based on their config.yaml."""
import argparse
import os
import re
import yaml
import pandas as pd
import psycopg2
from parsers.csv_parser import parse_csv
from parsers.excel_parser import parse_excel


def load_client(client_dir: str, db_url: str):
    config_path = os.path.join(client_dir, "config.yaml")
    with open(config_path) as f:
        config = yaml.safe_load(f)

    schema = config["database_schema"]
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', schema):
        raise ValueError(f"Invalid schema name: {schema}")

    raw_dir = os.path.join(client_dir, "raw")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')

    for filename in sorted(os.listdir(raw_dir)):
        filepath = os.path.join(raw_dir, filename)
        if filename.endswith(".csv"):
            df = parse_csv(filepath)
            table_name = filename.rsplit(".", 1)[0].lower().replace(" ", "_")
            _load_dataframe(cur, schema, table_name, df)
            print(f"  Loaded {filename} -> {schema}.{table_name} ({len(df)} rows)")
        elif filename.endswith((".xlsx", ".xls")):
            sheets = parse_excel(filepath)
            for table_name, df in sheets.items():
                _load_dataframe(cur, schema, table_name, df)
                print(f"  Loaded {filename}/{table_name} -> {schema}.{table_name} ({len(df)} rows)")

    cur.execute(f'GRANT USAGE ON SCHEMA "{schema}" TO readonly')
    cur.execute(f'GRANT SELECT ON ALL TABLES IN SCHEMA "{schema}" TO readonly')
    cur.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema}" GRANT SELECT ON TABLES TO readonly')

    cur.close()
    conn.close()
    print(f"Done loading client: {config['client_id']}")


def _load_dataframe(cur, schema: str, table_name: str, df: pd.DataFrame):
    cur.execute(f'DROP TABLE IF EXISTS "{schema}"."{table_name}"')
    col_defs = []
    for col in df.columns:
        dtype = df[col].dtype
        if pd.api.types.is_integer_dtype(dtype):
            pg_type = "BIGINT"
        elif pd.api.types.is_float_dtype(dtype):
            pg_type = "DOUBLE PRECISION"
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            pg_type = "TIMESTAMPTZ"
        else:
            pg_type = "TEXT"
        col_defs.append(f'"{col}" {pg_type}')

    create_sql = f'CREATE TABLE "{schema}"."{table_name}" (id SERIAL PRIMARY KEY, {", ".join(col_defs)})'
    cur.execute(create_sql)

    if len(df) > 0:
        cols = ", ".join(f'"{c}"' for c in df.columns)
        placeholders = ", ".join(["%s"] * len(df.columns))
        insert_sql = f'INSERT INTO "{schema}"."{table_name}" ({cols}) VALUES ({placeholders})'
        for _, row in df.iterrows():
            values = [None if pd.isna(v) else v for v in row.values]
            cur.execute(insert_sql, values)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load client data into PostgreSQL")
    parser.add_argument("client_dir", help="Path to client directory")
    parser.add_argument("--db-url", default=os.environ.get("DATABASE_URL"))
    args = parser.parse_args()
    if not args.db_url:
        print("Error: DATABASE_URL env var or --db-url required")
        exit(1)
    load_client(args.client_dir, args.db_url)
