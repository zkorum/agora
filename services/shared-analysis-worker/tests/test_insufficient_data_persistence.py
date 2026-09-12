from __future__ import annotations

import sqlite3
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from uuid import UUID

import pytest
from sqlalchemy import Engine, create_engine, literal, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from agora_analysis_worker_shared.analysis_compute import compute_analysis_bundle
from agora_analysis_worker_shared.db import (
    ClaimedWorkItem,
    OpinionGroupConfigRecord,
    OpinionGroupSpecRecord,
    OpinionGroupVariantRecord,
    StoredInputSnapshot,
    claim_work_items_batch,
    complete_computed_analysis_work_items_batch,
    persist_computed_analysis_results_batch,
    persist_empty_vote_matrix_results_batch,
)
from agora_analysis_worker_shared.generated_models import (
    AnalysisInsufficientDataReasonEnum,
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotResult,
    AnalysisWorkState,
    Base,
    Conversation,
    ConversationLanguageSettingsSource,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotReasonEnum,
    OpinionGroupCandidate,
    OpinionGroupVariant,
    ParticipationMode,
    PolisConversationConfig,
    RealtimeEventOutbox,
)
from agora_analysis_worker_shared.input_snapshot import VoteInputRow, prepare_input_snapshot

if TYPE_CHECKING:
    from sqlalchemy.sql.elements import ColumnElement

NOW = datetime(2026, 8, 21, 10, 0, 0, tzinfo=UTC)


def _create_engine() -> Engine:
    def connect() -> sqlite3.Connection:
        connection = sqlite3.connect(":memory:", check_same_thread=False)
        connection.create_function("greatest", 2, max)
        return connection

    engine = create_engine(
        "sqlite://",
        creator=connect,
        poolclass=StaticPool,
    )
    created_at_columns = [
        table.c.created_at for table in Base.metadata.tables.values() if "created_at" in table.c
    ]
    for column in created_at_columns:
        column.nullable = True
    Base.metadata.create_all(engine)
    for column in created_at_columns:
        column.nullable = False
    return engine


def test_empty_vote_matrix_publishes_activated_zero_count_snapshot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def current_analysis_generation() -> ColumnElement[int]:
        return literal(2)

    monkeypatch.setattr(
        "agora_analysis_worker_shared.db._current_analysis_generation_subquery",
        current_analysis_generation,
    )
    engine = _create_engine()
    lease_token = "empty-matrix-token"
    with Session(engine) as session:
        session.add(
            PolisConversationConfig(
                id=10,
                ai_labeling_enabled=True,
                analysis_data_generation=2,
                preferred_opinion_group_count=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.add(
            Conversation(
                id=10,
                slug_id="abc12345",
                project_id=1,
                current_content_id=None,
                polis_config_id=10,
                ranking_config_id=None,
                dynamic_translation_enabled=False,
                language_settings_source=(ConversationLanguageSettingsSource.conversation_override),
                is_indexed=True,
                participation_mode=ParticipationMode.account_required,
                conversation_type=ConversationType.polis,
                is_importing=False,
                is_closed=False,
                is_edited=False,
                requires_event_ticket=None,
                created_at=NOW,
                updated_at=NOW,
                last_reacted_at=NOW,
            )
        )
        session.add(
            OpinionGroupVariant(
                id=20,
                opinion_group_spec_id=1,
                group_count=2,
                created_at=NOW,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=30,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=None,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=None,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                preferred_opinion_group_count=None,
                is_closed=False,
                opinion_count=1,
                vote_count=1,
                participant_count=1,
                total_opinion_count=1,
                total_vote_count=1,
                total_participant_count=1,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW,
                created_at=NOW,
            )
        )
        session.add(
            AnalysisWorkState(
                id=40,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=1,
                running_data_generation=2,
                persisted_analysis_snapshot_id=None,
                dirty_since=NOW,
                attempt_generation=2,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token=lease_token,
                lease_expires_at=NOW + timedelta(minutes=5),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    prepared_snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=2,
        rows=[],
    )
    claim = ClaimedWorkItem(
        id=40,
        conversation_id=10,
        conversation_slug_id="abc12345",
        opinion_group_spec_id=1,
        data_generation=2,
        attempt_count=1,
        lease_token=lease_token,
        persisted_analysis_snapshot_id=None,
    )

    newer_generation_ids = persist_empty_vote_matrix_results_batch(
        engine,
        claims=[claim],
        stored_input_snapshots_by_conversation_id={
            10: StoredInputSnapshot(
                id=50,
                conversation_id=10,
                data_generation=2,
                input_hash=prepared_snapshot.input_hash,
            )
        },
        prepared_input_snapshots_by_conversation_id={10: prepared_snapshot},
    )

    with Session(engine) as session:
        analysis_snapshot = session.execute(select(AnalysisSnapshot)).scalar_one()
        result = session.execute(select(AnalysisSnapshotResult)).scalar_one()
        view_snapshots = session.scalars(
            select(ConversationViewSnapshot).order_by(ConversationViewSnapshot.id)
        ).all()
        events = session.scalars(select(RealtimeEventOutbox)).all()
        work_state = session.execute(select(AnalysisWorkState)).scalar_one()

    assert newer_generation_ids == []
    assert result.analysis_snapshot_id == analysis_snapshot.id
    assert result.outcome == AnalysisResultOutcomeEnum.insufficient_data
    assert result.outcome_reason == AnalysisInsufficientDataReasonEnum.empty_vote_matrix
    assert len(view_snapshots) == 2
    published_snapshot = view_snapshots[-1]
    assert published_snapshot.analysis_snapshot_id == analysis_snapshot.id
    assert published_snapshot.view_reason == ConversationViewSnapshotReasonEnum.analysis_completed
    assert published_snapshot.vote_count == 0
    assert published_snapshot.participant_count == 0
    assert published_snapshot.activated_at is not None
    assert len(events) == 1
    assert events[0].event_type == "conversation_analysis_updated"
    assert events[0].payload["conversationViewSnapshotId"] == published_snapshot.id
    assert events[0].payload["analysisSnapshotId"] == analysis_snapshot.id
    assert events[0].payload["voteCount"] == 0
    assert events[0].payload["participantCount"] == 0
    assert work_state.last_completed_data_generation == 2
    assert work_state.running_data_generation is None
    assert work_state.lease_token is None


@pytest.mark.parametrize("new_votes_before_completion", [False, True])
def test_collapsed_projection_is_persisted_and_waits_for_new_generation(
    new_votes_before_completion: bool,
) -> None:
    engine = _create_engine()
    with Session(engine) as session:
        session.add(
            PolisConversationConfig(
                id=10,
                ai_labeling_enabled=True,
                analysis_data_generation=2,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.add(
            Conversation(
                id=10,
                slug_id="abc12345",
                project_id=1,
                current_content_id=40,
                polis_config_id=10,
                dynamic_translation_enabled=False,
                language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                is_indexed=True,
                participation_mode=ParticipationMode.account_required,
                conversation_type=ConversationType.polis,
                is_importing=False,
                is_closed=False,
                is_edited=False,
                created_at=NOW,
                updated_at=NOW,
                last_reacted_at=NOW,
            )
        )
        session.add_all(
            OpinionGroupVariant(
                id=group_count * 10,
                opinion_group_spec_id=1,
                group_count=group_count,
                created_at=NOW,
            )
            for group_count in [2, 3]
        )
        session.add(
            AnalysisWorkState(
                id=40,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=1,
                dirty_since=NOW,
                attempt_generation=1,
                attempt_count=0,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    def claim_work() -> list[ClaimedWorkItem]:
        return claim_work_items_batch(
            engine,
            worker_id="math-updater",
            conversation_ids=[10],
            lease_ttl_seconds=60,
            limit=1,
            analysis_engine_epoch=1,
        )

    def add_new_votes_generation() -> None:
        with Session(engine) as session:
            config = session.execute(select(PolisConversationConfig)).scalar_one()
            config.analysis_data_generation = 3
            session.commit()

    claims = claim_work()
    assert len(claims) == 1
    assert claims[0].data_generation == 2
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=2,
        rows=[
            VoteInputRow(
                conversation_id=10,
                data_generation=2,
                user_id=UUID(int=participant + 1),
                opinion_id=opinion_id,
                opinion_content_id=opinion_id + 1000,
                vote="agree",
            )
            for participant in range(6)
            for opinion_id in [100, 101 + participant % 3]
        ],
    )
    bundle = compute_analysis_bundle(
        snapshot=snapshot,
        config=OpinionGroupConfigRecord(
            spec=OpinionGroupSpecRecord(
                id=1,
                min_clusterable_participants=2,
                min_votes_per_participant=2,
                max_group_count=3,
            ),
            variants=[
                OpinionGroupVariantRecord(
                    id=group_count * 10, opinion_group_spec_id=1, group_count=group_count
                )
                for group_count in [2, 3]
            ],
        ),
    )
    persisted = persist_computed_analysis_results_batch(
        engine,
        claims=claims,
        stored_input_snapshots_by_conversation_id={
            10: StoredInputSnapshot(
                id=50, conversation_id=10, data_generation=2, input_hash=snapshot.input_hash
            )
        },
        prepared_input_snapshots_by_conversation_id={10: snapshot},
        bundles_by_conversation_id={10: bundle},
        ai_generation_expected=True,
    )
    assert persisted.ai_description_work_conversation_ids == []
    assert persisted.ai_description_work_view_snapshot_ids == []

    with Session(engine) as session:
        result = session.execute(select(AnalysisSnapshotResult)).scalar_one()
        candidates = session.scalars(select(OpinionGroupCandidate)).all()
        view = session.execute(select(ConversationViewSnapshot)).scalar_one()
        assert result.outcome == AnalysisResultOutcomeEnum.insufficient_data
        assert result.outcome_reason == AnalysisInsufficientDataReasonEnum.not_enough_unique_points
        assert len(candidates) == 2
        for candidate in candidates:
            assert candidate.outcome == AnalysisResultOutcomeEnum.insufficient_data
            assert candidate.outcome_reason == (
                AnalysisInsufficientDataReasonEnum.not_enough_unique_points
            )
            assert candidate.raw_output is not None
            assert candidate.raw_output["reason"] == "not_enough_unique_points"
        assert view.activated_at is not None

    if new_votes_before_completion:
        add_new_votes_generation()
    newer_generation_ids = complete_computed_analysis_work_items_batch(
        engine, claims=claims, require_display_safe_activation=True
    )
    assert newer_generation_ids == ([10] if new_votes_before_completion else [])
    with Session(engine) as session:
        work_state = session.execute(select(AnalysisWorkState)).scalar_one()
        assert work_state.last_completed_data_generation == 2
        assert work_state.running_data_generation is None
        assert work_state.lease_token is None
        assert work_state.last_error_code is None

    if not new_votes_before_completion:
        assert claim_work() == []
        add_new_votes_generation()
    next_claims = claim_work()
    assert len(next_claims) == 1
    assert next_claims[0].data_generation == 3
    engine.dispose()
