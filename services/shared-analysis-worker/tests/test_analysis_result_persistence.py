from __future__ import annotations

import re
import sqlite3
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Literal
from unittest.mock import patch
from uuid import UUID

import pytest
from sqlalchemy import MetaData, create_engine, delete, event, func, literal, select, update
from sqlalchemy.orm import Session

from agora_analysis_worker_shared.analysis_compute import (
    CandidateAssessment,
    ComputedAnalysisBundle,
    ComputedGroupOpinionStats,
    ComputedOpinionGroup,
    ComputedOpinionGroupCandidate,
    ComputedRepresentativeOpinion,
    SnapshotOpinionMetrics,
    compute_analysis_bundle,
)
from agora_analysis_worker_shared.db import (
    AnalysisWorkStatePersistenceError,
    ClaimedWorkItem,
    OpinionGroupConfigRecord,
    OpinionGroupSpecRecord,
    OpinionGroupVariantRecord,
    StoredInputSnapshot,
    capture_closing_analysis_input,
    complete_computed_analysis_work_items_batch,
    persist_computed_analysis_results_batch,
    persist_empty_vote_matrix_results_batch,
)
from agora_analysis_worker_shared.generated_models import (
    AnalysisInputBaseline,
    AnalysisInputMode,
    AnalysisInputParticipantEligibility,
    AnalysisInputSnapshot,
    AnalysisInsufficientDataReasonEnum,
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotResult,
    AnalysisSurveyChoiceCapture,
    AnalysisWorkState,
    Base,
    Conversation,
    ConversationAnalysisClose,
    ConversationLanguageSettingsSource,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotCheckpointReasonEnum,
    ModerationReasonEnum,
    Opinion,
    OpinionGroup,
    OpinionGroupClustererEnum,
    OpinionGroupOpinionStats,
    OpinionGroupReducerEnum,
    OpinionGroupSelectionPolicyEnum,
    OpinionGroupSpec,
    OpinionGroupUser,
    OpinionGroupVariant,
    OpinionModeration,
    OpinionModerationAction,
    ParticipationMode,
    PolisAnalysisClose,
    PolisAnalysisCloseGeneration,
    PolisConversationConfig,
    PolisVotingPresentation,
    RealtimeEventOutbox,
    SurveyAggregateSnapshot,
    SurveyConfig,
    User,
    VoteEnumSimple,
)
from agora_analysis_worker_shared.input_snapshot import (
    OpinionInputRow,
    PreparedInputSnapshot,
    VoteInputRow,
    prepare_input_snapshot,
)
from agora_analysis_worker_shared.retained_inputs import (
    AnalysisSourceCounts,
    ClosingAnalysisResultInput,
    LiveAnalysisResultInput,
    RetainedAnalysisInput,
    prepare_closing_analysis_result_input,
)

if TYPE_CHECKING:
    from collections.abc import Iterator

    from sqlalchemy import Engine

    from agora_analysis_worker_shared.retained_inputs import AnalysisResultInput


SOURCE_COUNTS = AnalysisSourceCounts(vote_count=12, participant_count=6)


@dataclass(frozen=True)
class Fixture:
    claim: ClaimedWorkItem
    prepared: PreparedInputSnapshot
    closing: ClosingAnalysisResultInput
    stored: StoredInputSnapshot


@pytest.fixture
def engine() -> Iterator[Engine]:
    def connect() -> sqlite3.Connection:
        connection = sqlite3.connect(":memory:")
        connection.create_function("greatest", 2, max)
        return connection

    engine = create_engine("sqlite://", creator=connect)
    metadata = MetaData()
    for table in Base.metadata.tables.values():
        copied = table.to_metadata(metadata)
        if "created_at" in copied.c:
            copied.c.created_at.nullable = True
    metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


def seed(
    *,
    engine: Engine,
    empty: bool = False,
    unvoted: bool = False,
    source_counts: AnalysisSourceCounts = SOURCE_COUNTS,
) -> Fixture:
    now = datetime.now(UTC)
    rows = [
        VoteInputRow(
            conversation_id=10,
            data_generation=2,
            user_id=UUID(int=participant + 1),
            opinion_id=100 + opinion,
            opinion_content_id=1000 + opinion,
            vote="agree" if (participant < 3) == (opinion == 0) else "disagree",
        )
        for participant in range(6)
        for opinion in range(2)
    ]
    catalogue = [
        OpinionInputRow(
            conversation_id=10,
            data_generation=2,
            opinion_id=100 + index,
            opinion_content_id=1000 + index,
        )
        for index in range(3 if unvoted else 2)
    ]
    prepared = prepare_input_snapshot(
        conversation_id=10, data_generation=2, rows=rows, opinion_rows=catalogue
    )
    original = prepare_input_snapshot(
        conversation_id=10,
        data_generation=1,
        rows=[replace(row, data_generation=1) for row in rows],
        opinion_rows=[replace(opinion, data_generation=1) for opinion in catalogue],
    )
    captured = (
        prepare_input_snapshot(
            conversation_id=10,
            data_generation=2,
            rows=[],
            opinion_rows=catalogue[2:],
        )
        if empty
        else prepared
    )
    numerical = RetainedAnalysisInput(
        conversation_id=10,
        data_generation=2,
        participant_count=captured.participant_count,
        opinions=tuple(captured.opinions),
        votes=tuple(captured.votes),
    )
    claim = ClaimedWorkItem(
        id=40,
        conversation_id=10,
        conversation_slug_id="polis001",
        opinion_group_spec_id=1,
        data_generation=2,
        attempt_count=1,
        lease_token="native-persistence",
        persisted_analysis_snapshot_id=None,
    )
    with Session(engine) as session, session.begin():
        session.add_all(
            [
                PolisConversationConfig(
                    id=10,
                    analysis_data_generation=2,
                    voting_presentation=PolisVotingPresentation.list,
                    updated_at=now,
                ),
                Conversation(
                    id=10,
                    slug_id="polis001",
                    project_id=1,
                    current_content_id=20,
                    polis_config_id=10,
                    language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                    participation_mode=ParticipationMode.account_required,
                    conversation_type=ConversationType.polis,
                    is_closed=True,
                    closing_target_revision=2,
                    updated_at=now,
                    last_reacted_at=now,
                ),
                OpinionGroupSpec(
                    id=1,
                    analysis_spec_id=1,
                    key="native",
                    version=1,
                    reducer=OpinionGroupReducerEnum.pca,
                    clusterer=OpinionGroupClustererEnum.kmeans,
                    selection_policy=OpinionGroupSelectionPolicyEnum.silhouette_size_balance,
                    min_clusterable_participants=2,
                    min_votes_per_participant=2,
                    max_group_count=2,
                ),
                OpinionGroupVariant(id=2, opinion_group_spec_id=1, group_count=2),
                AnalysisWorkState(
                    id=claim.id,
                    conversation_id=10,
                    opinion_group_spec_id=1,
                    running_data_generation=2,
                    lease_owner="test",
                    lease_token=claim.lease_token,
                    lease_expires_at=now + timedelta(minutes=5),
                    updated_at=now,
                ),
                AnalysisInputSnapshot(
                    id=49,
                    conversation_id=10,
                    data_generation=1,
                    input_hash=original.input_hash,
                    payload_version=2,
                    opinion_count=len(original.opinions),
                    participant_count=6,
                    vote_count=12,
                    compression="zstd",
                    payload=original.payload,
                ),
                AnalysisInputBaseline(
                    input_snapshot_id=49,
                    baseline_input_snapshot_id=49,
                    conversation_id=10,
                    participant_indices=list(range(6)),
                    opinion_indices=list(range(len(original.opinions))),
                    source_vote_count=source_counts.vote_count,
                    source_participant_count=source_counts.participant_count,
                ),
                AnalysisInputSnapshot(
                    id=50,
                    conversation_id=10,
                    data_generation=2,
                    input_hash=captured.input_hash,
                    payload_version=2,
                    opinion_count=len(captured.opinions),
                    participant_count=captured.participant_count,
                    vote_count=len(captured.votes),
                    compression="zstd",
                    payload=captured.payload,
                ),
                SurveyConfig(id=70, conversation_id=10, is_optional=True, updated_at=now),
                AnalysisSnapshot(
                    id=1,
                    conversation_id=10,
                    input_snapshot_id=49,
                    data_generation=1,
                    computed_at=now,
                ),
                AnalysisSnapshotResult(
                    id=1,
                    conversation_id=10,
                    analysis_snapshot_id=1,
                    opinion_group_spec_id=1,
                    outcome=AnalysisResultOutcomeEnum.success,
                    variants_enabled=False,
                ),
                SurveyAggregateSnapshot(
                    id=60,
                    conversation_id=10,
                    analysis_snapshot_id=1,
                    survey_config_id=70,
                    survey_config_revision=1,
                    suppression_threshold=5,
                ),
                ConversationViewSnapshot(
                    id=30,
                    conversation_id=10,
                    opinion_group_spec_id=1,
                    analysis_snapshot_id=1,
                    survey_aggregate_snapshot_id=60,
                    view_reason="analysis_completed",
                    is_closed=True,
                    opinion_count=len(original.opinions),
                    total_opinion_count=len(original.opinions),
                    vote_count=12,
                    total_vote_count=source_counts.vote_count,
                    participant_count=6,
                    total_participant_count=source_counts.participant_count,
                    moderated_opinion_count=0,
                    hidden_opinion_count=0,
                    activated_at=now,
                ),
                ConversationViewSnapshotCheckpointReason(
                    conversation_view_snapshot_id=30,
                    conversation_id=10,
                    opinion_group_spec_id=1,
                    reason=ConversationViewSnapshotCheckpointReasonEnum.conversation_closed,
                ),
            ]
        )
        for index in range(len(catalogue)):
            session.add(
                Opinion(
                    id=100 + index,
                    slug_id=f"op{index:06d}",
                    conversation_id=10,
                    current_content_id=None,
                    deleted_at=now,
                    updated_at=now,
                    last_reacted_at=now,
                )
            )
            if empty and index < 2:
                session.add(
                    OpinionModeration(
                        opinion_id=100 + index,
                        moderation_action=(
                            OpinionModerationAction.move
                            if index == 0
                            else OpinionModerationAction.hide
                        ),
                        moderation_reason=ModerationReasonEnum.misleading,
                        updated_at=now,
                    )
                )
    return Fixture(
        claim=claim,
        prepared=prepared,
        closing=ClosingAnalysisResultInput(numerical=numerical, source_view_snapshot_id=30),
        stored=StoredInputSnapshot(
            id=50, conversation_id=10, data_generation=2, input_hash=captured.input_hash
        ),
    )


def bundle() -> ComputedAnalysisBundle:
    groups: list[ComputedOpinionGroup] = []
    for index in range(2):
        representative = ComputedRepresentativeOpinion(
            local_opinion_index=index,
            agreement_type=VoteEnumSimple.agree,
            probability_agreement=0.9,
            num_agreement=3,
            raw_repness={},
        )
        groups.append(
            ComputedOpinionGroup(
                key=str(index),
                external_id=index,
                local_participant_indexes=list(range(index * 3, index * 3 + 3)),
                representative_opinions=[representative],
                opinion_stats=[
                    ComputedGroupOpinionStats(
                        local_opinion_index=opinion,
                        num_agrees=3 if opinion == index else 0,
                        num_disagrees=0 if opinion == index else 3,
                        num_passes=0,
                        representative_opinion=representative if opinion == index else None,
                    )
                    for opinion in range(2)
                ],
            )
        )
    return ComputedAnalysisBundle(
        conversation_id=10,
        data_generation=2,
        outcome=AnalysisResultOutcomeEnum.success,
        outcome_reason=None,
        candidates=[
            ComputedOpinionGroupCandidate(
                opinion_group_variant_id=2,
                group_count=2,
                outcome=AnalysisResultOutcomeEnum.success,
                outcome_reason=None,
                raw_output=None,
                groups=groups,
                assessment=CandidateAssessment(
                    silhouette_score=0.8,
                    coefficient_of_variation=0,
                    balance_score=1,
                    selection_score=0.8,
                    hidden_reason=None,
                ),
                opinion_metrics=[],
            )
        ],
        snapshot_opinions=[
            SnapshotOpinionMetrics(
                local_opinion_index=opinion,
                num_agrees=3,
                num_disagrees=3,
                num_passes=0,
                routing_priority=0.5,
            )
            for opinion in range(2)
        ],
    )


def persist(*, engine: Engine, fixture: Fixture, source: AnalysisResultInput) -> None:
    persist_computed_analysis_results_batch(
        engine,
        claims=[fixture.claim],
        stored_input_snapshots_by_conversation_id={10: fixture.stored},
        inputs_by_conversation_id={10: source},
        bundles_by_conversation_id={10: bundle()},
        ai_generation_expected=False,
    )


def test_bound_closing_capture_seals_identity_free_input_and_reuses_it(engine: Engine) -> None:
    fixture = seed(engine=engine, empty=True, unvoted=True)
    claim = replace(fixture.claim, data_generation=3, uses_closing_inputs=True)
    with Session(engine) as session, session.begin():
        parent = session.get_one(Conversation, claim.conversation_id)
        parent.closed_finalized_at = datetime.now(UTC)
        parent.closing_target_revision = 1
        parent.vote_buffer_drained = True
        session.get_one(PolisConversationConfig, 10).analysis_data_generation = 3
        session.get_one(AnalysisWorkState, claim.id).running_data_generation = 3
        session.get_one(AnalysisWorkState, claim.id).uses_closing_inputs = True
        session.add_all(
            [
                ConversationAnalysisClose(
                    id=1,
                    conversation_id=claim.conversation_id,
                    close_epoch=parent.vote_buffer_epoch,
                    source_revision=1,
                    selected_input_mode=AnalysisInputMode.closing,
                    served_input_mode=AnalysisInputMode.closing,
                    minimum_closing_result_revision=3,
                    finalized_at=parent.closed_finalized_at,
                ),
                PolisAnalysisClose(
                    close_id=1,
                    conversation_id=claim.conversation_id,
                    opinion_group_spec_id=claim.opinion_group_spec_id,
                    original_view_snapshot_id=30,
                ),
                PolisAnalysisCloseGeneration(
                    close_id=1,
                    conversation_id=claim.conversation_id,
                    data_generation=3,
                ),
            ]
        )
    with Session(engine) as session, session.begin():
        source, stored = capture_closing_analysis_input(session=session, claim=claim)
        assert source.source_view_snapshot_id == 30
        assert [opinion.opinion_id for opinion in source.numerical.opinions] == [102]
        assert not source.numerical.votes
        cert = session.get_one(AnalysisInputBaseline, stored.id)
        assert cert.baseline_input_snapshot_id == 49
        assert cert.opinion_indices == [2]
        assert cert.participant_indices == []
        assert cert.source_vote_count == 12
        assert cert.source_participant_count == 6
        assert session.scalars(select(AnalysisInputParticipantEligibility)).first() is None
    with Session(engine) as session, session.begin():
        assert capture_closing_analysis_input(session=session, claim=claim) == (source, stored)
    with Session(engine) as session, session.begin():
        session.get_one(PolisConversationConfig, 10).analysis_data_generation = 4
    with Session(engine) as session, session.begin():
        assert capture_closing_analysis_input(session=session, claim=claim) == (source, stored)
        session.get_one(Conversation, claim.conversation_id).closed_finalized_at = None
    with (
        Session(engine) as session,
        session.begin(),
        pytest.raises(AnalysisWorkStatePersistenceError, match="no longer matches"),
    ):
        capture_closing_analysis_input(session=session, claim=claim)


def test_identity_free_success_preserves_native_groups_counts_and_original_survey(
    engine: Engine,
) -> None:
    fixture = seed(engine=engine)
    read_tables: set[str] = set()

    def record_tables(
        _connection: object,
        _cursor: object,
        statement: str,
        _parameters: object,
        _context: object,
        _executemany: bool,
    ) -> None:
        read_tables.update(re.findall(r'\b(?:FROM|JOIN)\s+"?(\w+)"?', statement, re.IGNORECASE))

    event.listen(engine, "before_cursor_execute", record_tables)
    with patch(
        "agora_analysis_worker_shared.db._fetch_survey_responses",
        side_effect=AssertionError("Closing must not reread private survey responses"),
    ):
        persist(engine=engine, fixture=fixture, source=fixture.closing)
    event.remove(engine, "before_cursor_execute", record_tables)
    assert read_tables.isdisjoint(
        {"user", "vote", "vote_content", "survey_response", "survey_answer", "survey_answer_option"}
    )
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(User)) == 0
        assert session.scalar(select(func.count()).select_from(OpinionGroupUser)) == 0
        assert sorted(session.scalars(select(OpinionGroup.num_users)).all()) == [3, 3]
        assert session.scalar(select(func.count()).select_from(OpinionGroupOpinionStats)) == 4
        latest = session.scalars(
            select(ConversationViewSnapshot).order_by(ConversationViewSnapshot.id.desc()).limit(1)
        ).one()
        assert (latest.opinion_count, latest.vote_count, latest.participant_count) == (2, 12, 6)
        assert (
            latest.total_opinion_count,
            latest.total_vote_count,
            latest.total_participant_count,
            latest.moderated_opinion_count,
        ) == (2, 12, 6, 0)
        assert latest.survey_aggregate_snapshot_id is None
        original = session.get_one(ConversationViewSnapshot, 30)
        assert original.survey_aggregate_snapshot_id == 60
        assert session.scalar(select(func.count()).select_from(SurveyAggregateSnapshot)) == 1
        published_event = session.scalars(select(RealtimeEventOutbox)).one()
        assert published_event.payload["voteCount"] == 12
        assert published_event.payload["participantCount"] == 6
        assert published_event.payload["totalOpinionCount"] == 2
    assert (
        complete_computed_analysis_work_items_batch(
            engine, claims=[fixture.claim], require_display_safe_activation=True
        )
        == []
    )


@pytest.mark.parametrize("empty", [False, True])
def test_native_closing_preserves_complete_unvoted_catalogue_after_content_erasure(
    engine: Engine, empty: bool, monkeypatch: pytest.MonkeyPatch
) -> None:
    fixture = seed(engine=engine, empty=empty, unvoted=True)
    with Session(engine) as session:
        source, counters = prepare_closing_analysis_result_input(
            session=session,
            conversation_id=10,
            opinion_group_spec_id=1,
            source_view_snapshot_id=30,
            data_generation=2,
        )
    assert source == fixture.closing
    assert counters.total_opinion_count == 3
    if empty:
        # SQLite cannot render the production correlated UPDATE RETURNING query.
        monkeypatch.setattr(
            "agora_analysis_worker_shared.db._current_analysis_generation_subquery",
            lambda: literal(2),
        )
        persist_empty_vote_matrix_results_batch(
            engine,
            claims=[fixture.claim],
            stored_input_snapshots_by_conversation_id={10: fixture.stored},
            inputs_by_conversation_id={10: source},
        )
    else:
        computed = compute_analysis_bundle(
            snapshot=source.numerical,
            config=OpinionGroupConfigRecord(
                spec=OpinionGroupSpecRecord(
                    id=1,
                    min_clusterable_participants=2,
                    min_votes_per_participant=2,
                    max_group_count=2,
                ),
                variants=[OpinionGroupVariantRecord(id=2, opinion_group_spec_id=1, group_count=2)],
            ),
        )
        persist_computed_analysis_results_batch(
            engine,
            claims=[fixture.claim],
            stored_input_snapshots_by_conversation_id={10: fixture.stored},
            inputs_by_conversation_id={10: source},
            bundles_by_conversation_id={10: computed},
            ai_generation_expected=False,
        )
    with Session(engine) as session:
        latest = session.scalars(
            select(ConversationViewSnapshot).order_by(ConversationViewSnapshot.id.desc()).limit(1)
        ).one()
        assert latest.total_opinion_count == 3
        assert latest.opinion_count == (1 if empty else 3)
        assert latest.participant_count == (0 if empty else 6)
        assert latest.vote_count == (0 if empty else 12)
        assert latest.survey_aggregate_snapshot_id is None
        assert session.get_one(ConversationViewSnapshot, 30).opinion_count == 3
        assert session.scalar(select(func.count()).select_from(OpinionGroupUser)) == 0


@pytest.mark.parametrize("initial_close", [False, True])
def test_live_success_keeps_private_writeback_and_retains_survey_only_at_close(
    engine: Engine,
    initial_close: bool,
) -> None:
    fixture = seed(engine=engine)
    with Session(engine) as session, session.begin():
        parent = session.get_one(Conversation, fixture.claim.conversation_id)
        if initial_close:
            snapshot_id = fixture.stored.id
            session.add(
                AnalysisInputBaseline(
                    input_snapshot_id=snapshot_id,
                    baseline_input_snapshot_id=snapshot_id,
                    conversation_id=parent.id,
                    participant_indices=list(range(fixture.prepared.participant_count)),
                    opinion_indices=list(range(len(fixture.prepared.opinions))),
                    source_vote_count=len(fixture.prepared.votes),
                    source_participant_count=fixture.prepared.participant_count,
                )
            )
        else:
            parent.is_closed = False
            parent.closing_target_revision = None
        session.add_all(
            User(id=participant.user_id, username=f"user-{index}", updated_at=datetime.now(UTC))
            for index, participant in enumerate(fixture.prepared.participants)
        )
    persist(
        engine=engine,
        fixture=fixture,
        source=LiveAnalysisResultInput(numerical=fixture.prepared),
    )
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(OpinionGroupUser)) == 6
        assert session.scalar(select(func.count()).select_from(SurveyAggregateSnapshot)) == 2
        assert session.scalar(select(func.count()).select_from(AnalysisSurveyChoiceCapture)) == int(
            initial_close
        )


def test_closing_retains_broader_source_totals_without_admitting_ineligible_voters(
    engine: Engine,
) -> None:
    fixture = seed(
        engine=engine, source_counts=AnalysisSourceCounts(vote_count=14, participant_count=7)
    )
    with Session(engine) as session:
        source, counters = prepare_closing_analysis_result_input(
            session=session,
            conversation_id=10,
            opinion_group_spec_id=1,
            source_view_snapshot_id=30,
            data_generation=2,
        )
    assert source.numerical.participant_count == 6
    assert len(source.numerical.votes) == 12
    assert counters.total_vote_count == 14
    assert counters.total_participant_count == 7
    persist(engine=engine, fixture=fixture, source=source)
    with Session(engine) as session:
        latest = session.scalars(
            select(ConversationViewSnapshot).order_by(ConversationViewSnapshot.id.desc()).limit(1)
        ).one()
        assert (latest.vote_count, latest.participant_count) == (12, 6)
        assert (latest.total_vote_count, latest.total_participant_count) == (14, 7)
        assert session.scalar(select(func.count()).select_from(User)) == 0
        assert session.scalar(select(func.count()).select_from(OpinionGroupUser)) == 0


def test_identity_free_empty_result_does_not_build_a_replacement_survey(
    engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    # SQLite cannot render the production correlated subquery in UPDATE RETURNING.
    monkeypatch.setattr(
        "agora_analysis_worker_shared.db._current_analysis_generation_subquery",
        lambda: literal(2),
    )
    fixture = seed(engine=engine, empty=True)
    assert (
        persist_empty_vote_matrix_results_batch(
            engine,
            claims=[fixture.claim],
            stored_input_snapshots_by_conversation_id={10: fixture.stored},
            inputs_by_conversation_id={10: fixture.closing},
        )
        == []
    )
    with Session(engine) as session:
        latest = session.scalars(
            select(ConversationViewSnapshot).order_by(ConversationViewSnapshot.id.desc()).limit(1)
        ).one()
        assert (latest.opinion_count, latest.vote_count, latest.participant_count) == (0, 0, 0)
        assert (latest.total_vote_count, latest.total_participant_count) == (12, 6)
        assert latest.survey_aggregate_snapshot_id is None
        assert session.scalar(select(func.count()).select_from(SurveyAggregateSnapshot)) == 1
        assert session.scalar(select(func.count()).select_from(OpinionGroupUser)) == 0


def test_identity_free_insufficient_result_uses_the_same_native_outcome_storage(
    engine: Engine,
) -> None:
    fixture = seed(engine=engine)
    computed = bundle()
    reason = AnalysisInsufficientDataReasonEnum.not_enough_unique_points
    insufficient = replace(
        computed,
        outcome=AnalysisResultOutcomeEnum.insufficient_data,
        outcome_reason=reason,
        candidates=[
            replace(
                candidate,
                outcome=AnalysisResultOutcomeEnum.insufficient_data,
                outcome_reason=reason,
                groups=[],
                assessment=None,
            )
            for candidate in computed.candidates
        ],
    )
    persist_computed_analysis_results_batch(
        engine,
        claims=[fixture.claim],
        stored_input_snapshots_by_conversation_id={10: fixture.stored},
        inputs_by_conversation_id={10: fixture.closing},
        bundles_by_conversation_id={10: insufficient},
        ai_generation_expected=False,
    )
    with Session(engine) as session:
        result = session.scalars(
            select(AnalysisSnapshotResult).where(AnalysisSnapshotResult.analysis_snapshot_id != 1)
        ).one()
        assert result.outcome == AnalysisResultOutcomeEnum.insufficient_data
        assert result.outcome_reason == reason
        latest = session.scalars(
            select(ConversationViewSnapshot).order_by(ConversationViewSnapshot.id.desc()).limit(1)
        ).one()
        assert (latest.vote_count, latest.participant_count) == (12, 6)
        assert latest.activated_at is not None
        assert session.scalar(select(func.count()).select_from(OpinionGroup)) == 0
        assert session.scalar(select(func.count()).select_from(SurveyAggregateSnapshot)) == 1


def test_identity_free_publication_failure_rolls_back_the_native_result_graph(
    engine: Engine,
) -> None:
    fixture = seed(engine=engine)
    with (
        patch(
            "agora_analysis_worker_shared.db._queue_conversation_analysis_updated_events_for_view_snapshots",
            side_effect=RuntimeError("event failure before commit"),
        ),
        pytest.raises(RuntimeError, match="event failure"),
    ):
        persist(engine=engine, fixture=fixture, source=fixture.closing)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(AnalysisSnapshot)) == 1
        assert session.scalar(select(func.count()).select_from(ConversationViewSnapshot)) == 1
        assert session.scalar(select(func.count()).select_from(OpinionGroup)) == 0
        assert session.scalar(select(func.count()).select_from(OpinionGroupOpinionStats)) == 0
        assert session.scalar(select(func.count()).select_from(SurveyAggregateSnapshot)) == 1
        state = session.get_one(AnalysisWorkState, fixture.claim.id)
        assert state.persisted_analysis_snapshot_id is None
        assert state.lease_token == fixture.claim.lease_token
    persist(engine=engine, fixture=fixture, source=fixture.closing)


@pytest.mark.parametrize("action", [OpinionModerationAction.move, OpinionModerationAction.hide])
def test_closing_preparation_uses_only_certified_inputs_and_current_moderation(
    engine: Engine, action: OpinionModerationAction
) -> None:
    fixture = seed(engine=engine)
    now = datetime.now(UTC)
    with Session(engine) as session, session.begin():
        moderation = OpinionModeration(
            opinion_id=100,
            moderation_action=action,
            moderation_reason=ModerationReasonEnum.misleading,
            updated_at=now,
        )
        session.add(moderation)
        session.flush()
        source, counters = prepare_closing_analysis_result_input(
            session=session,
            conversation_id=10,
            opinion_group_spec_id=1,
            source_view_snapshot_id=30,
            data_generation=2,
        )
        assert source.source_view_snapshot_id == 30
        assert len(source.numerical.opinions) == 1
        assert len(source.numerical.votes) == 6
        assert source.numerical.participant_count == 6
        assert counters.opinion_count == 1
        assert (counters.total_opinion_count, counters.total_vote_count) == (2, 12)
        assert counters.total_participant_count == 6
        assert counters.moderated_opinion_count == (
            1 if action == OpinionModerationAction.move else 0
        )
        assert counters.hidden_opinion_count == (1 if action == OpinionModerationAction.hide else 0)
        moderation.moderation_explanation = "Explanation-only edit"
        session.flush()
        assert prepare_closing_analysis_result_input(
            session=session,
            conversation_id=10,
            opinion_group_spec_id=1,
            source_view_snapshot_id=30,
            data_generation=2,
        ) == (source, counters)
        moderation.deleted_at = now
        session.flush()
        restored, restored_counters = prepare_closing_analysis_result_input(
            session=session,
            conversation_id=10,
            opinion_group_spec_id=1,
            source_view_snapshot_id=30,
            data_generation=2,
        )
        assert restored == fixture.closing
        assert restored_counters.opinion_count == 2
        assert restored_counters.moderated_opinion_count == 0
        assert restored_counters.hidden_opinion_count == 0
        assert session.get_one(ConversationViewSnapshot, 30).opinion_count == 2
        assert session.scalar(select(func.count()).select_from(User)) == 0


@pytest.mark.parametrize(
    "damage",
    [
        "inactive",
        "open",
        "checkpoint",
        "certificate",
        "catalogue",
        "votes",
        "participants",
        "payload",
        "result_scope",
    ],
)
def test_closing_preparation_rejects_unprovable_source_provenance(
    engine: Engine,
    damage: Literal[
        "inactive",
        "open",
        "checkpoint",
        "certificate",
        "catalogue",
        "votes",
        "participants",
        "payload",
        "result_scope",
    ],
) -> None:
    seed(engine=engine)
    with Session(engine) as session, session.begin():
        view = session.get_one(ConversationViewSnapshot, 30)
        match damage:
            case "inactive":
                view.activated_at = None
            case "open":
                view.is_closed = False
            case "checkpoint":
                session.execute(
                    update(ConversationViewSnapshotCheckpointReason).values(
                        reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis
                    )
                )
            case "certificate":
                session.execute(delete(AnalysisInputBaseline))
            case "catalogue":
                # A historical unvoted opinion cannot be invented from today's catalogue.
                view.total_opinion_count = 3
            case "votes":
                view.vote_count = 11
            case "participants":
                view.total_participant_count = 7
            case "payload":
                session.get_one(AnalysisInputSnapshot, 49).payload = b"damaged retained input"
            case "result_scope":
                session.get_one(AnalysisSnapshotResult, 1).opinion_group_spec_id = 2
    with Session(engine) as session, pytest.raises(ValueError, match="Closing source"):
        prepare_closing_analysis_result_input(
            session=session,
            conversation_id=10,
            opinion_group_spec_id=1,
            source_view_snapshot_id=30,
            data_generation=2,
        )


@pytest.mark.parametrize("boundary", ["conversation", "spec", "view", "generation"])
def test_closing_preparation_enforces_source_scope_and_generation(
    engine: Engine, boundary: Literal["conversation", "spec", "view", "generation"]
) -> None:
    seed(engine=engine)
    with Session(engine) as session, pytest.raises(ValueError, match="Closing"):
        prepare_closing_analysis_result_input(
            session=session,
            conversation_id=11 if boundary == "conversation" else 10,
            opinion_group_spec_id=2 if boundary == "spec" else 1,
            source_view_snapshot_id=31 if boundary == "view" else 30,
            data_generation=1 if boundary == "generation" else 2,
        )


@pytest.mark.parametrize("change", ["supplied_matrix", "sealed_capture", "moderation"])
def test_native_writer_rechecks_closing_provenance_before_committing(
    engine: Engine, change: Literal["supplied_matrix", "sealed_capture", "moderation"]
) -> None:
    fixture = seed(engine=engine)
    source = fixture.closing
    if change == "supplied_matrix":
        first, *remaining = source.numerical.votes
        source = replace(
            source,
            numerical=replace(
                source.numerical, votes=(replace(first, vote=-first.vote), *remaining)
            ),
        )
    else:
        with Session(engine) as session, session.begin():
            if change == "sealed_capture":
                capture = session.get_one(AnalysisInputSnapshot, 50)
                capture.input_hash = "0" * 64
            else:
                session.add(
                    OpinionModeration(
                        opinion_id=100,
                        moderation_action=OpinionModerationAction.hide,
                        moderation_reason=ModerationReasonEnum.misleading,
                        updated_at=datetime.now(UTC),
                    )
                )
    with pytest.raises(ValueError):
        persist(engine=engine, fixture=fixture, source=source)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(AnalysisSnapshot)) == 1
        assert session.scalar(select(func.count()).select_from(ConversationViewSnapshot)) == 1
        assert session.scalar(select(func.count()).select_from(OpinionGroup)) == 0
        assert session.scalar(select(func.count()).select_from(RealtimeEventOutbox)) == 0
        assert session.get_one(ConversationViewSnapshot, 30).survey_aggregate_snapshot_id == 60


@pytest.mark.parametrize("invalidation", ["generation", "lease", "expired", "deleted", "finalized"])
def test_identity_free_inputs_do_not_bypass_existing_publication_fences(
    engine: Engine, invalidation: Literal["generation", "lease", "expired", "deleted", "finalized"]
) -> None:
    fixture = seed(engine=engine)
    with Session(engine) as session, session.begin():
        match invalidation:
            case "generation":
                session.execute(update(PolisConversationConfig).values(analysis_data_generation=3))
            case "lease":
                session.execute(update(AnalysisWorkState).values(lease_token="replacement"))
            case "expired":
                session.execute(
                    update(AnalysisWorkState).values(
                        lease_expires_at=datetime.now(UTC) - timedelta(seconds=5)
                    )
                )
            case "deleted":
                session.execute(update(Conversation).values(current_content_id=None))
            case "finalized":
                session.execute(update(Conversation).values(closed_finalized_at=datetime.now(UTC)))
    if invalidation in ("lease", "expired"):
        with pytest.raises(AnalysisWorkStatePersistenceError):
            persist(engine=engine, fixture=fixture, source=fixture.closing)
    else:
        persist(engine=engine, fixture=fixture, source=fixture.closing)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(AnalysisSnapshot)) == 1
        assert session.scalar(select(func.count()).select_from(ConversationViewSnapshot)) == 1
        assert session.scalar(select(func.count()).select_from(OpinionGroup)) == 0
        assert session.scalar(select(func.count()).select_from(RealtimeEventOutbox)) == 0
