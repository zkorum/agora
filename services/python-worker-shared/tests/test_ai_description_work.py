from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Engine, create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from agora_worker_shared.ai_description_work import (
    ClaimedLineageDescriptionWorkItem,
    LineageDescriptionWorkDemand,
    PendingLocaleStatusRow,
    RequiredLineageDescriptionRow,
    TranslationWorkDemand,
    complete_non_processable_ai_description_work_batch,
    lineage_description_work_demands_for_statuses,
    process_ai_description_locale_work_item,
    translation_work_demands_for_statuses,
)
from agora_worker_shared.generated_models import (
    AiDescriptionLocaleStatusEnum,
    Base,
    Conversation,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotReasonEnum,
    OpinionGroupDescriptionLocaleStatus,
    OpinionGroupDescriptionTranslationWork,
    OpinionGroupLineageDescriptionWork,
    ParticipationMode,
)

if TYPE_CHECKING:
    from agora_worker_shared.bedrock_label_summary import ParsedLabelSummaryOutput
    from agora_worker_shared.description_input import ConversationDescriptionInput

NOW = datetime(2026, 5, 21, 12, 0, 0, tzinfo=UTC)


def _create_engine() -> Engine:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return engine


def _insert_non_processable_ai_work_state(
    session: Session,
    *,
    leased_lineage_work: bool = False,
) -> None:
    session.add(
        Conversation(
            id=10,
            slug_id="abc12345",
            author_id=uuid4(),
            organization_id=None,
            current_content_id=None,
            current_ranking_score_id=None,
            is_indexed=True,
            participation_mode=ParticipationMode.account_required,
            conversation_type=ConversationType.polis,
            is_importing=False,
            is_closed=False,
            is_edited=False,
            requires_event_ticket=None,
            ai_labeling_enabled=True,
            analysis_data_generation=1,
            preferred_opinion_group_count=None,
            import_url=None,
            import_conversation_url=None,
            import_export_url=None,
            import_created_at=None,
            import_author=None,
            import_method=None,
            external_source_config=None,
            created_at=NOW,
            updated_at=NOW,
            last_reacted_at=NOW,
        )
    )
    session.add(
        ConversationViewSnapshot(
            id=20,
            conversation_id=10,
            opinion_group_spec_id=1,
            analysis_snapshot_id=30,
            survey_aggregate_snapshot_id=None,
            conversation_content_id=40,
            view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
            is_closed=False,
            opinion_count=2,
            vote_count=2,
            participant_count=2,
            total_opinion_count=2,
            total_vote_count=2,
            total_participant_count=2,
            moderated_opinion_count=0,
            hidden_opinion_count=0,
            activated_at=None,
            created_at=NOW,
        )
    )
    session.add_all(
        [
            OpinionGroupDescriptionLocaleStatus(
                id=101,
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_result_id=50,
                locale="en",
                status=AiDescriptionLocaleStatusEnum.pending,
                ai_generation_expected=True,
                translation_expected=False,
                attempt_count=0,
                next_run_at=NOW,
                lease_owner=None,
                lease_token=None,
                lease_expires_at=None,
                non_retryable_ai_description_epoch=None,
                last_error_code=None,
                last_error_message=None,
                created_at=NOW,
                updated_at=NOW,
            ),
            OpinionGroupDescriptionLocaleStatus(
                id=102,
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_result_id=50,
                locale="fr",
                status=AiDescriptionLocaleStatusEnum.pending,
                ai_generation_expected=True,
                translation_expected=True,
                attempt_count=0,
                next_run_at=None,
                lease_owner=None,
                lease_token=None,
                lease_expires_at=None,
                non_retryable_ai_description_epoch=None,
                last_error_code=None,
                last_error_message=None,
                created_at=NOW,
                updated_at=NOW,
            ),
        ]
    )
    session.add(
        OpinionGroupLineageDescriptionWork(
            id=201,
            lineage_id=301,
            conversation_id=10,
            source_candidate_id=401,
            attempt_count=1,
            next_run_at=None if leased_lineage_work else NOW,
            lease_owner="worker-1" if leased_lineage_work else None,
            lease_token="token-1" if leased_lineage_work else None,
            lease_expires_at=NOW + timedelta(minutes=10) if leased_lineage_work else None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            created_at=NOW,
            updated_at=NOW,
        )
    )
    session.add(
        OpinionGroupDescriptionTranslationWork(
            id=202,
            description_id=501,
            conversation_id=10,
            locale="fr",
            attempt_count=1,
            next_run_at=NOW,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            created_at=NOW,
            updated_at=NOW,
        )
    )
    session.commit()


def _status(
    *,
    status_id: int,
    conversation_id: int = 10,
    locale: str = "en",
    next_run_at: datetime | None = NOW,
) -> PendingLocaleStatusRow:
    return PendingLocaleStatusRow(
        id=status_id,
        conversation_id=conversation_id,
        conversation_view_snapshot_id=100 + status_id,
        analysis_snapshot_result_id=200 + status_id,
        locale=locale,
        next_run_at=next_run_at,
    )


def test_lineage_description_work_demands_are_unique_and_skip_ready_lineages() -> None:
    later = NOW + timedelta(minutes=5)
    statuses = [
        _status(status_id=1, next_run_at=NOW),
        _status(status_id=2, next_run_at=later),
    ]

    demands = lineage_description_work_demands_for_statuses(
        statuses=statuses,
        lineage_rows_by_status_id={
            1: [
                RequiredLineageDescriptionRow(
                    lineage_id=10,
                    candidate_id=1000,
                    system_description_id=None,
                ),
                RequiredLineageDescriptionRow(
                    lineage_id=11,
                    candidate_id=1001,
                    system_description_id=9001,
                ),
            ],
            2: [
                RequiredLineageDescriptionRow(
                    lineage_id=10,
                    candidate_id=2000,
                    system_description_id=None,
                ),
                RequiredLineageDescriptionRow(
                    lineage_id=12,
                    candidate_id=2001,
                    system_description_id=None,
                ),
            ],
        },
    )

    assert demands == [
        LineageDescriptionWorkDemand(
            lineage_id=10,
            conversation_id=10,
            source_candidate_id=1000,
            next_run_at=NOW,
        ),
        LineageDescriptionWorkDemand(
            lineage_id=12,
            conversation_id=10,
            source_candidate_id=2001,
            next_run_at=later,
        ),
    ]


def test_translation_work_demands_are_unique_per_description_locale() -> None:
    statuses = [
        _status(status_id=1, locale="fr", next_run_at=NOW),
        _status(status_id=2, locale="fr", next_run_at=NOW + timedelta(minutes=5)),
        _status(status_id=3, locale="es", next_run_at=NOW + timedelta(minutes=10)),
    ]

    demands = translation_work_demands_for_statuses(
        statuses=statuses,
        description_ids_by_status_id={
            1: {10, 20},
            2: {10, 30},
            3: {10},
        },
        translated_description_ids_by_status_id={
            1: {20},
            2: set(),
            3: {10},
        },
    )

    assert demands == [
        TranslationWorkDemand(
            description_id=10,
            conversation_id=10,
            locale="fr",
            next_run_at=NOW,
        ),
        TranslationWorkDemand(
            description_id=30,
            conversation_id=10,
            locale="fr",
            next_run_at=NOW + timedelta(minutes=5),
        ),
    ]


def test_non_processable_ai_cleanup_fallbacks_statuses_and_activates_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)

    completed_ids = complete_non_processable_ai_description_work_batch(
        engine,
        conversation_ids=[10],
    )

    with Session(engine) as session:
        statuses = (
            session.execute(
                select(OpinionGroupDescriptionLocaleStatus).order_by(
                    OpinionGroupDescriptionLocaleStatus.locale
                )
            )
            .scalars()
            .all()
        )
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()

    assert completed_ids == [10]
    assert [status.status for status in statuses] == [
        AiDescriptionLocaleStatusEnum.fallback,
        AiDescriptionLocaleStatusEnum.fallback,
    ]
    assert view_snapshot.activated_at is not None
    assert lineage_work.next_run_at is None
    assert translation_work.next_run_at is None


def test_claimed_non_processable_lineage_work_does_not_call_generator() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session, leased_lineage_work=True)

    def fail_generator(_input: ConversationDescriptionInput) -> ParsedLabelSummaryOutput:
        raise AssertionError("generator should not be called")

    process_ai_description_locale_work_item(
        engine,
        claim=ClaimedLineageDescriptionWorkItem(
            id=201,
            conversation_id=10,
            conversation_slug_id="abc12345",
            lineage_id=301,
            source_candidate_id=401,
            locale="en",
            attempt_count=1,
            lease_token="token-1",
        ),
        generate_descriptions=fail_generator,
        translate_descriptions=None,
    )

    with Session(engine) as session:
        statuses = (
            session.execute(
                select(OpinionGroupDescriptionLocaleStatus).order_by(
                    OpinionGroupDescriptionLocaleStatus.locale
                )
            )
            .scalars()
            .all()
        )
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()

    assert [status.status for status in statuses] == [
        AiDescriptionLocaleStatusEnum.fallback,
        AiDescriptionLocaleStatusEnum.fallback,
    ]
    assert view_snapshot.activated_at is not None
    assert lineage_work.lease_token is None
    assert lineage_work.next_run_at is None
