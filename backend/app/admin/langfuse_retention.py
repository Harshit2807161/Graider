"""Delete old Langfuse traces (self-hosted OSS has no automatic retention).

Run with: python -m app.admin.langfuse_retention --older-than-days N [--submission-id ID] [--dry-run]
Uses the Langfuse public API (GET /api/public/traces, DELETE /api/public/traces/{id}) with the
configured LANGFUSE_BASE_URL and keys. Grading-run traces carry the submission id as session id
and in metadata, so `--submission-id` deletes one student's traces (erasure requests); it can be
combined with `--older-than-days` (use 0 for "everything up to now").
"""

import argparse
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

PAGE_SIZE = 100


class LangfuseClient:
    """Thin client for the two Langfuse public API calls retention needs."""

    def __init__(
        self,
        base_url: str,
        public_key: str,
        secret_key: str,
        client: Optional[httpx.Client] = None,
    ) -> None:
        self._client = client or httpx.Client(timeout=30)
        self._base = base_url.rstrip("/")
        self._auth = httpx.BasicAuth(public_key, secret_key)

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        response = self._client.request(method, f"{self._base}{path}", auth=self._auth, **kwargs)
        response.raise_for_status()
        return response

    def list_traces(
        self, to_timestamp: Optional[datetime] = None, session_id: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Every trace matching the filters (all pages, collected before anything is deleted)."""
        params: dict[str, Any] = {"limit": PAGE_SIZE}
        if to_timestamp is not None:
            params["toTimestamp"] = to_timestamp.astimezone(timezone.utc).isoformat()
        if session_id is not None:
            params["sessionId"] = session_id
        traces: list[dict[str, Any]] = []
        page = 1
        while True:
            body = self._request("GET", "/api/public/traces", params={**params, "page": page}).json()
            traces.extend(body.get("data", []))
            if page >= int(body.get("meta", {}).get("totalPages", 1) or 1):
                return traces
            page += 1

    def delete_trace(self, trace_id: str) -> None:
        self._request("DELETE", f"/api/public/traces/{trace_id}")


def _belongs_to(trace: dict[str, Any], submission_id: str) -> bool:
    metadata = trace.get("metadata")
    in_metadata = isinstance(metadata, dict) and str(metadata.get("submission_id")) == submission_id
    return in_metadata or trace.get("sessionId") == submission_id


def purge(
    client: LangfuseClient,
    older_than_days: Optional[int] = None,
    submission_id: Optional[UUID] = None,
    dry_run: bool = False,
    now: Optional[datetime] = None,
) -> list[str]:
    """Delete (or with dry_run only select) matching traces; returns their ids."""
    if older_than_days is None and submission_id is None:
        raise ValueError("give older_than_days, submission_id or both")
    cutoff = None
    if older_than_days is not None:
        cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=older_than_days)
    sid = str(submission_id) if submission_id else None
    traces = client.list_traces(to_timestamp=cutoff, session_id=sid)
    if sid:  # never trust the server-side filter alone with an erasure
        traces = [t for t in traces if _belongs_to(t, sid)]
    ids = [t["id"] for t in traces]
    if not dry_run:
        for trace_id in ids:
            client.delete_trace(trace_id)
    logger.info("langfuse_retention", matched=len(ids), deleted=0 if dry_run else len(ids), dry_run=dry_run)
    return ids


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--older-than-days", type=int, help="delete traces older than this many days")
    parser.add_argument("--submission-id", type=UUID, help="only this submission's traces")
    parser.add_argument("--dry-run", action="store_true", help="list what would be deleted")
    args = parser.parse_args(argv)
    if args.older_than_days is None and args.submission_id is None:
        parser.error("give --older-than-days, --submission-id or both")
    if not (settings.LANGFUSE_BASE_URL and settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY):
        print("Langfuse is not configured (LANGFUSE_BASE_URL / _PUBLIC_KEY / _SECRET_KEY)", file=sys.stderr)
        return 1
    client = LangfuseClient(
        settings.LANGFUSE_BASE_URL, settings.LANGFUSE_PUBLIC_KEY, settings.LANGFUSE_SECRET_KEY
    )
    ids = purge(client, args.older_than_days, args.submission_id, args.dry_run)
    print(f"{len(ids)} trace(s) {'would be deleted' if args.dry_run else 'deleted'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
