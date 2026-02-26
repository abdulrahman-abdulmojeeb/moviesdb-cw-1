#!/usr/bin/env python3
"""
Sync Enrichment Data from Production Server
Downloads a pg COPY dump of movie_details and external_ratings from the
production server and loads it into the local database.

Usage:
    python sync_enrichment.py [--server URL]

Environment variables:
    DATABASE_URL - PostgreSQL connection string
"""

import argparse
import io
import os
import re
import sys
from datetime import datetime

try:
    import httpx
except ImportError:
    print("Error: httpx is required. Install with: pip install httpx")
    sys.exit(1)

import psycopg2

DEFAULT_SERVER = "https://comp22-cw.marlin.im"


def get_db_connection():
    return psycopg2.connect(
        os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/movielens",
        )
    )


def main():
    parser = argparse.ArgumentParser(
        description="Sync movie enrichment data from production server"
    )
    parser.add_argument(
        "--server",
        default=DEFAULT_SERVER,
        help=f"Production server URL (default: {DEFAULT_SERVER})",
    )
    args = parser.parse_args()

    server = args.server.rstrip("/")

    print("Enrichment Data Sync")
    print(f"Server: {server}")
    print(f"Started at: {datetime.now()}")
    print("-" * 50)

    # Download SQL dump in one request
    url = f"{server}/api/movies/export/enrichment.sql"
    print(f"Downloading enrichment dump...")
    with httpx.Client(timeout=60.0) as client:
        resp = client.get(url)
        resp.raise_for_status()
    dump = resp.text
    print(f"  Downloaded {len(resp.content)} bytes")

    # Parse COPY blocks: each block has TRUNCATE, COPY FROM stdin, data, \.
    blocks = re.findall(
        r"TRUNCATE (\w+);\nCOPY \1 FROM stdin;\n(.*?)\n\\\.",
        dump,
        re.DOTALL,
    )

    if not blocks:
        print("  No COPY blocks found in dump")
        sys.exit(1)

    conn = get_db_connection()
    cursor = conn.cursor()

    for table_name, data in blocks:
        cursor.execute(f"TRUNCATE {table_name}")
        print(f"  Loading {table_name}...")
        cursor.copy_expert(f"COPY {table_name} FROM STDIN", io.StringIO(data))

    conn.commit()
    cursor.close()

    print("-" * 50)
    print(f"Synced {len(blocks)} tables")
    print(f"Finished at: {datetime.now()}")
    conn.close()


if __name__ == "__main__":
    main()
