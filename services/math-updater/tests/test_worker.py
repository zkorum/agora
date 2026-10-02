from __future__ import annotations

from typing import TYPE_CHECKING

from agora_analysis_worker_shared.db import ClaimedWorkItem, PersistComputedAnalysisResult
from agora_analysis_worker_shared.description_generation import DescriptionGenerationResult
from psycopg.errors import CheckViolation, NotNullViolation
from sqlalchemy import Engine, create_engine
from sqlalchemy.exc import IntegrityError, OperationalError
from valkey import Valkey

from math_updater import worker

if TYPE_CHECKING:
    import pytest
    from agora_analysis_worker_shared.description_input import ConversationDescriptionInput


def _claim() -> ClaimedWorkItem:
    return ClaimedWorkItem(
        id=1,
        conversation_id=10,
        conversation_slug_id="conversation-1",
        opinion_group_spec_id=1,
        data_generation=2,
        attempt_count=1,
        lease_token="lease-token",
        persisted_analysis_snapshot_id=None,
    )


def _primary_engine() -> Engine:
    return create_engine("sqlite:///:memory:")


def _valkey_client() -> Valkey:
    return Valkey(host="localhost", port=6379)


def _description_generator(
    _conversation: ConversationDescriptionInput,
) -> DescriptionGenerationResult:
    return DescriptionGenerationResult(groups={})


def test_not_null_persistence_failure_is_non_retryable() -> None:
    not_null_error = IntegrityError("insert", {}, NotNullViolation())
    check_error = IntegrityError("insert", {}, CheckViolation())
    connection_error = OperationalError("insert", {}, ConnectionError())

    assert worker.is_non_retryable_not_null_violation(not_null_error)
    assert not worker.is_non_retryable_not_null_violation(check_error)
    assert not worker.is_non_retryable_not_null_violation(connection_error)


def test_non_retryable_failure_only_enqueues_newer_work(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    marked: list[dict[str, object]] = []
    queued: list[dict[str, object]] = []

    def mark_failed(_engine: Engine, **kwargs: object) -> list[int]:
        marked.append(kwargs)
        return [20]

    def enqueue(_vk: Valkey, **kwargs: object) -> None:
        queued.append(kwargs)

    monkeypatch.setattr(worker, "mark_non_retryable_work_items_batch", mark_failed)
    monkeypatch.setattr(worker, "_enqueue_conversations_for_math_work", enqueue)
    worker.mark_analysis_failures_non_retryable(
        primary_engine=_primary_engine(),
        vk=_valkey_client(),
        claims=[_claim()],
        analysis_engine_epoch=2,
        error_code="analysis_persist_not_null_violation",
        error_message="NOT NULL constraint failed",
    )

    assert marked == [
        {
            "claims": [_claim()],
            "analysis_engine_epoch": 2,
            "error_code": "analysis_persist_not_null_violation",
            "error_message": "NOT NULL constraint failed",
        }
    ]
    assert queued == [{"conversation_ids": [20]}]


def test_failed_non_retryable_marker_leaves_claim_for_lease_recovery(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_mark(_engine: Engine, **_kwargs: object) -> list[int]:
        raise OperationalError("update", {}, ConnectionError())

    def fail_enqueue(_vk: Valkey, **_kwargs: object) -> None:
        raise AssertionError("failed marker must not requeue the claim")

    monkeypatch.setattr(worker, "mark_non_retryable_work_items_batch", fail_mark)
    monkeypatch.setattr(worker, "_enqueue_conversations_for_math_work", fail_enqueue)
    worker.mark_analysis_failures_non_retryable(
        primary_engine=_primary_engine(),
        vk=_valkey_client(),
        claims=[_claim()],
        analysis_engine_epoch=2,
        error_code="analysis_persist_not_null_violation",
        error_message="NOT NULL constraint failed",
    )


def test_post_persist_first_pass_runs_for_ai_gated_snapshot_without_new_work(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict[str, object]] = []

    def fake_first_pass(**kwargs: object) -> None:
        calls.append(kwargs)

    monkeypatch.setattr(worker, "_process_ai_description_first_pass", fake_first_pass)

    result = worker.process_or_finalize_ai_description_first_pass_after_persist(
        primary_engine=_primary_engine(),
        vk=_valkey_client(),
        worker_id="worker-1",
        analysis_claims=[_claim()],
        persist_result=PersistComputedAnalysisResult(
            ai_description_work_conversation_ids=[],
            ai_description_work_view_snapshot_ids=[20],
            checkpoint_activation_context=None,
        ),
        lease_ttl_seconds=30,
        heartbeat_interval_seconds=5,
        claim_limit=10,
        max_workers=2,
        ai_description_epoch=1,
        description_generator=_description_generator,
        description_translator=None,
        simulation_runtime=None,
    )

    assert result is True
    assert len(calls) == 1
    assert calls[0]["conversation_ids"] == [10]
    assert calls[0]["conversation_view_snapshot_ids"] == [20]


def test_post_persist_first_pass_finalizes_without_generator(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict[str, object]] = []

    def fake_finalize(**kwargs: object) -> None:
        calls.append(kwargs)

    monkeypatch.setattr(
        worker,
        "_finalize_ai_description_first_pass_without_generator",
        fake_finalize,
    )

    result = worker.process_or_finalize_ai_description_first_pass_after_persist(
        primary_engine=_primary_engine(),
        vk=_valkey_client(),
        worker_id="worker-1",
        analysis_claims=[_claim()],
        persist_result=PersistComputedAnalysisResult(
            ai_description_work_conversation_ids=[],
            ai_description_work_view_snapshot_ids=[20],
            checkpoint_activation_context=None,
        ),
        lease_ttl_seconds=30,
        heartbeat_interval_seconds=5,
        claim_limit=10,
        max_workers=2,
        ai_description_epoch=1,
        description_generator=None,
        description_translator=None,
        simulation_runtime=None,
    )

    assert result is True
    assert len(calls) == 1
    assert calls[0]["conversation_ids"] == [10]
    assert calls[0]["conversation_view_snapshot_ids"] == [20]


def test_post_persist_first_pass_noops_without_ai_gated_snapshot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_first_pass(**_kwargs: object) -> None:
        raise AssertionError("first-pass should not run")

    monkeypatch.setattr(worker, "_process_ai_description_first_pass", fail_first_pass)

    result = worker.process_or_finalize_ai_description_first_pass_after_persist(
        primary_engine=_primary_engine(),
        vk=_valkey_client(),
        worker_id="worker-1",
        analysis_claims=[_claim()],
        persist_result=PersistComputedAnalysisResult(
            ai_description_work_conversation_ids=[],
            ai_description_work_view_snapshot_ids=[],
            checkpoint_activation_context=None,
        ),
        lease_ttl_seconds=30,
        heartbeat_interval_seconds=5,
        claim_limit=10,
        max_workers=2,
        ai_description_epoch=1,
        description_generator=_description_generator,
        description_translator=None,
        simulation_runtime=None,
    )

    assert result is True
