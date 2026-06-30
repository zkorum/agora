from __future__ import annotations

from unittest.mock import create_autospec

from sqlalchemy.dialects.postgresql import dialect as postgresql_dialect
from sqlalchemy.orm import Session

from content_translation_worker.db import claim_content_translation_work_batch


def test_claim_query_locks_only_content_translation_work() -> None:
    session = create_autospec(Session, instance=True)
    session.execute.return_value = []

    claim_content_translation_work_batch(
        session,
        worker_id="worker-1",
        work_ids=None,
        batch_size=10,
        lease_ttl_seconds=30,
    )

    statement = session.execute.call_args.args[0]
    sql = str(statement.compile(dialect=postgresql_dialect()))

    assert "FOR UPDATE OF content_translation_work SKIP LOCKED" in sql
