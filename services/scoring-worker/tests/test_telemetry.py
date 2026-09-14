import json
import logging

import pytest

from scoring_worker.config import Settings
from scoring_worker.telemetry import emit_performance_event
from scoring_worker.valkey_client import DirtyConversation
from scoring_worker.worker import report_rejected_revisions


def test_semantic_event_uses_existing_marker(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.INFO):
        emit_performance_event(
            enabled=True,
            action="compute_completed",
            outcome="success",
            conversation_slug_id="fixture",
            duration_ms=12,
            metadata={"batchId": "batch", "inputRevision": 8},
        )
    event = json.loads(caplog.records[0].getMessage().removeprefix("AGORA_LOAD_EVENT "))
    assert event["scenario"] == "solidago-ranking"
    assert event["conversationSlugId"] == "fixture"
    assert event["metadata"]["inputRevision"] == 8


def test_disabled_performance_events_are_silent(caplog: pytest.LogCaptureFixture) -> None:
    emit_performance_event(enabled=False, action="compute_completed", outcome="success")
    assert not caplog.records


def test_log_level_follows_worker_convention() -> None:
    base = {"connection_string": "postgresql://localhost/test"}
    assert Settings.model_validate({**base, "AGORA_DEV_MODE": True}).resolved_log_level == "DEBUG"
    assert (
        Settings.model_validate(
            {**base, "AGORA_DEV_MODE": True, "log_level": "INFO"}
        ).resolved_log_level
        == "INFO"
    )


def test_rejection_diagnostics_identify_only_stale_members(
    caplog: pytest.LogCaptureFixture,
) -> None:
    conversations = [
        DirtyConversation(
            conversation_id=i, slug_id=f"fixture-{i}", weight=20, member=f"{i}:fixture-{i}"
        )
        for i in (1, 2, 3)
    ]
    with caplog.at_level(logging.INFO):
        report_rejected_revisions(
            {1: 10, 2: 12},
            enabled=True,
            batch_id="batch",
            conversations=conversations,
            completed_ids=[1, 2, 3],
            expected={1: 10, 2: 10, 3: 10},
        )
    events = [
        json.loads(record.getMessage().removeprefix("AGORA_LOAD_EVENT "))
        for record in caplog.records
    ]
    assert [event["conversationSlugId"] for event in events] == ["fixture-2", "fixture-3"]
    assert events[0]["metadata"]["observedRevision"] == 12
    assert events[1]["metadata"]["observedRevision"] is None
