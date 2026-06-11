from __future__ import annotations

from typing import TYPE_CHECKING

from agora_analysis_worker_shared.bedrock_label_summary import ParsedLabelSummaryOutput
from agora_analysis_worker_shared.db import ClaimedWorkItem, PersistComputedAnalysisResult
from sqlalchemy import Engine, create_engine
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
) -> ParsedLabelSummaryOutput:
    return ParsedLabelSummaryOutput(mode="strict", clusters={})


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
