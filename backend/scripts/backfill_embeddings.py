"""
One-off backfill: generate embeddings for existing job_postings and
fraud_reports rows that predate Milestone P2-4's embedding write path.
Safe to re-run — only touches rows where `embedding` is still null.

Usage (from backend/, with the venv active):
    python -m scripts.backfill_embeddings
"""

import time

from app.services.embeddings import embed_text
from app.supabase_client import get_supabase_admin_client


def backfill_table(table: str, text_column: str) -> None:
    client = get_supabase_admin_client()
    rows = client.table(table).select(f"id,{text_column}").is_("embedding", "null").execute()
    pending = rows.data or []
    print(f"{table}: {len(pending)} row(s) to backfill")

    for row in pending:
        text = (row.get(text_column) or "").strip()
        if not text:
            print(f"  skip {row['id']} (empty {text_column})")
            continue
        vector = embed_text(text)
        if not vector:
            print(f"  skip {row['id']} (embedding failed)")
            continue
        client.table(table).update({"embedding": vector}).eq("id", row["id"]).execute()
        print(f"  embedded {row['id']}")
        time.sleep(0.2)  # gentle on the embeddings API rate limit


def main() -> None:
    backfill_table("job_postings", "description")
    backfill_table("fraud_reports", "description")


if __name__ == "__main__":
    main()
