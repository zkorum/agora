from __future__ import annotations

import uuid

from content_translation_worker.db import create_lease_token
from content_translation_worker.worker import WORKER_ID


def test_create_lease_token_is_uuid() -> None:
    token = create_lease_token()

    assert isinstance(token, uuid.UUID)


def test_worker_id_is_bounded_service_label() -> None:
    assert WORKER_ID == "content-translation-worker"
    assert len(WORKER_ID) <= 100
