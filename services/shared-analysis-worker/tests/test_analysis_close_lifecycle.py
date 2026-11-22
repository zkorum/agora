from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, func, select, update
from sqlalchemy.orm import Session

from agora_analysis_worker_shared.analysis_lifecycle import finalize_closed_analysis
from agora_analysis_worker_shared.generated_models import (
    AnalysisFamilyEnum,
    AnalysisInputMode,
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotResult,
    AnalysisSpec,
    Base,
    Conversation,
    ConversationAnalysisClose,
    ConversationLanguageSettingsSource,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotReasonEnum,
    OpinionGroupClustererEnum,
    OpinionGroupReducerEnum,
    OpinionGroupSelectionPolicyEnum,
    OpinionGroupSpec,
    ParticipationMode,
    PolisAnalysisClose,
    PolisConversationConfig,
    PolisVotingPresentation,
)

if TYPE_CHECKING:
    from collections.abc import Iterator
    from typing import Literal

    from sqlalchemy import Engine

NOW = datetime(2026, 11, 17, tzinfo=UTC)


def add_native_results(session: Session, *, generation: int) -> None:
    session.add(
        AnalysisSnapshot(
            id=generation,
            conversation_id=1,
            input_snapshot_id=generation,
            data_generation=generation,
            computed_at=NOW,
            created_at=NOW,
        )
    )
    for spec_id in (1, 2):
        session.add(
            AnalysisSnapshotResult(
                conversation_id=1,
                analysis_snapshot_id=generation,
                opinion_group_spec_id=spec_id,
                outcome=AnalysisResultOutcomeEnum.success,
                created_at=NOW,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=generation * 10 + spec_id,
                conversation_id=1,
                opinion_group_spec_id=spec_id,
                analysis_snapshot_id=generation,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=True,
                opinion_count=2,
                total_opinion_count=2,
                vote_count=10,
                total_vote_count=12,
                participant_count=5,
                total_participant_count=6,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW,
                created_at=NOW,
            )
        )


@pytest.fixture
def engine() -> Iterator[Engine]:
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session, session.begin():
        session.add(
            PolisConversationConfig(
                id=1,
                analysis_data_generation=1,
                voting_presentation=PolisVotingPresentation.list,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.add(
            Conversation(
                id=1,
                slug_id="close001",
                project_id=1,
                polis_config_id=1,
                current_content_id=1,
                conversation_type=ConversationType.polis,
                participation_mode=ParticipationMode.account_required,
                language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                is_closed=True,
                closing_target_revision=1,
                created_at=NOW,
                updated_at=NOW,
                last_reacted_at=NOW,
            )
        )
        for spec_id in (1, 2):
            session.add(
                AnalysisSpec(
                    id=spec_id, analysis_family=AnalysisFamilyEnum.opinion_groups, created_at=NOW
                )
            )
            session.add(
                OpinionGroupSpec(
                    id=spec_id,
                    analysis_spec_id=spec_id,
                    key=f"spec-{spec_id}",
                    version=1,
                    reducer=OpinionGroupReducerEnum.pca,
                    clusterer=OpinionGroupClustererEnum.kmeans,
                    selection_policy=OpinionGroupSelectionPolicyEnum.silhouette_size_balance,
                    min_clusterable_participants=2,
                    min_votes_per_participant=1,
                    max_group_count=2,
                    created_at=NOW,
                )
            )
        add_native_results(session, generation=1)
    try:
        yield engine
    finally:
        engine.dispose()


def test_finalization_seals_one_shared_close_and_all_native_references(engine: Engine) -> None:
    with Session(engine) as session, session.begin():
        finalize_closed_analysis(session, conversation_ids=[1])
        close = session.scalars(select(ConversationAnalysisClose)).one()
        assert close.selected_input_mode == AnalysisInputMode.closing
        assert close.close_epoch == session.get_one(Conversation, 1).vote_buffer_epoch
        assert close.source_revision == 1
        refs = session.scalars(select(PolisAnalysisClose)).all()
        assert len(refs) == 2
        assert {ref.close_id for ref in refs} == {close.id}
        for ref in refs:
            expected_id = 10 + ref.opinion_group_spec_id
            assert ref.original_view_snapshot_id == expected_id
        finalize_closed_analysis(session, conversation_ids=[1])
        assert session.scalar(select(func.count()).select_from(ConversationAnalysisClose)) == 1
        assert session.scalar(select(func.count()).select_from(ConversationViewSnapshot)) == 2
        assert session.scalar(select(func.count()).select_from(AnalysisSnapshot)) == 1
        assert (
            session.scalar(
                select(func.count()).select_from(ConversationViewSnapshotCheckpointReason)
            )
            == 2
        )


@pytest.mark.parametrize(
    "invalidation",
    [
        "deleted",
        "erased",
        "importing",
        "undrained",
        "generation",
        "inactive",
        "missing_result",
        "scope",
    ],
)
def test_incomplete_or_ineligible_close_does_not_create_selection_or_partial_references(
    engine: Engine,
    invalidation: Literal[
        "deleted",
        "erased",
        "importing",
        "undrained",
        "generation",
        "inactive",
        "missing_result",
        "scope",
    ],
) -> None:
    with Session(engine) as session, session.begin():
        conversation = session.get_one(Conversation, 1)
        match invalidation:
            case "deleted":
                conversation.deleted_at = NOW
            case "erased":
                conversation.current_content_id = None
            case "importing":
                conversation.is_importing = True
            case "undrained":
                conversation.vote_buffer_drained = False
            case "generation":
                conversation.closing_target_revision = 2
            case "inactive":
                session.get_one(ConversationViewSnapshot, 12).activated_at = None
            case "missing_result":
                result = session.scalars(
                    select(AnalysisSnapshotResult).where(
                        AnalysisSnapshotResult.opinion_group_spec_id == 2
                    )
                ).one()
                result.opinion_group_spec_id = 3
            case "scope":
                session.get_one(AnalysisSnapshot, 1).conversation_id = 2
        session.flush()
        finalize_closed_analysis(session, conversation_ids=[1])
        assert session.get_one(Conversation, 1).closed_finalized_at is None
        for model in (
            ConversationAnalysisClose,
            PolisAnalysisClose,
            ConversationViewSnapshotCheckpointReason,
        ):
            assert session.scalar(select(func.count()).select_from(model)) == 0


def test_reclose_defaults_to_closing_without_rebinding_the_previous_close(engine: Engine) -> None:
    with Session(engine) as session, session.begin():
        finalize_closed_analysis(session, conversation_ids=[1])
        previous = session.scalars(select(ConversationAnalysisClose)).one()
        previous.selected_input_mode = AnalysisInputMode.live
        previous_epoch = previous.close_epoch
        conversation = session.get_one(Conversation, 1)
        conversation.is_closed = False
        conversation.closed_finalized_at = None
        conversation.closing_target_revision = None
        conversation.vote_buffer_epoch = uuid4()
        session.execute(update(PolisConversationConfig).values(analysis_data_generation=2))
        session.flush()
        assert previous.close_epoch == previous_epoch
        conversation.is_closed = True
        conversation.closing_target_revision = 2
        add_native_results(session, generation=2)
        session.flush()
        finalize_closed_analysis(session, conversation_ids=[1])
        closes = session.scalars(
            select(ConversationAnalysisClose).order_by(ConversationAnalysisClose.id)
        ).all()
        assert len(closes) == 2
        assert closes[0].selected_input_mode == AnalysisInputMode.live
        assert closes[1].selected_input_mode == AnalysisInputMode.closing
        assert closes[1].close_epoch == conversation.vote_buffer_epoch != previous_epoch
        refs = session.scalars(
            select(PolisAnalysisClose).where(PolisAnalysisClose.close_id == previous.id)
        ).all()
        assert {ref.original_view_snapshot_id for ref in refs} == {11, 12}
