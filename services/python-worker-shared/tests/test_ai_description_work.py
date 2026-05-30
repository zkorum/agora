from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from uuid import uuid4

import pytest
from sqlalchemy import Engine, create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from agora_worker_shared.ai_description_work import (
    DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE,
    ClaimedDescriptionTranslationWorkItem,
    ClaimedLineageDescriptionWorkItem,
    LineageDescriptionWorkDemand,
    PendingLocaleStatusRow,
    RequiredLineageDescriptionRow,
    TranslationWorkDemand,
    activate_pending_translation_expectations,
    claim_ai_description_locale_work_items_batch,
    claimable_immediate_retry_at,
    complete_non_processable_ai_description_work_batch,
    description_translation_work_claim_batches,
    fetch_due_ai_description_work_conversation_ids,
    finalize_first_pass_ai_description_work_batch,
    lineage_description_work_demands_for_statuses,
    process_ai_description_locale_work_item,
    process_description_translation_work_items_batch,
    queue_ai_description_content_updated_events,
    recover_expired_ai_description_work,
    retry_ai_description_locale_work_item,
    translation_work_demands_for_statuses,
)
from agora_worker_shared.db import (
    ClaimedWorkItem,
    complete_computed_analysis_work_items_batch,
    extend_postgres_leases,
    recover_expired_running_work,
)
from agora_worker_shared.description_input import DescriptionOutputError
from agora_worker_shared.description_translation import (
    DescriptionForTranslation,
    DescriptionTranslation,
)
from agora_worker_shared.generated_models import (
    AiDescriptionLocaleExpectationKindEnum,
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotResult,
    AnalysisWorkState,
    Base,
    Conversation,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotCheckpointReasonEnum,
    ConversationViewSnapshotReasonEnum,
    OpinionGroup,
    OpinionGroupCandidate,
    OpinionGroupDescription,
    OpinionGroupDescriptionLocaleExpectation,
    OpinionGroupDescriptionTranslation,
    OpinionGroupDescriptionTranslationWork,
    OpinionGroupLineage,
    OpinionGroupLineageDescriptionWork,
    OpinionGroupVariant,
    ParticipationMode,
    RealtimeEventOutbox,
)
from agora_worker_shared.retry_policy import RetryPolicy

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
    session.add(
        AnalysisSnapshot(
            id=30,
            conversation_id=10,
            conversation_content_id=40,
            input_snapshot_id=1,
            data_generation=1,
            computed_at=NOW,
            created_at=NOW,
        )
    )
    session.add(
        AnalysisSnapshotResult(
            id=50,
            conversation_id=10,
            analysis_snapshot_id=30,
            opinion_group_spec_id=1,
            outcome=AnalysisResultOutcomeEnum.success,
            outcome_reason=None,
            variants_enabled=False,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupVariant(
            id=601,
            opinion_group_spec_id=1,
            group_count=2,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupCandidate(
            id=401,
            snapshot_result_id=50,
            opinion_group_variant_id=601,
            scope_id=701,
            outcome=AnalysisResultOutcomeEnum.success,
            outcome_reason=None,
            raw_output=None,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupLineage(
            id=301,
            scope_id=701,
            system_description_id=501,
            admin_description_id=None,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroup(
            id=801,
            candidate_id=401,
            scope_id=701,
            lineage_id=301,
            key="0",
            external_id=0,
            num_users=1,
            created_at=NOW,
        )
    )
    session.add_all(
        [
            OpinionGroupDescriptionLocaleExpectation(
                id=101,
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_result_id=50,
                locale="en",
                expectation_kind=AiDescriptionLocaleExpectationKindEnum.english_description,
                retry_demand_due_at=NOW,
                created_at=NOW,
                updated_at=NOW,
            ),
            OpinionGroupDescriptionLocaleExpectation(
                id=102,
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_result_id=50,
                locale="fr",
                expectation_kind=AiDescriptionLocaleExpectationKindEnum.translation,
                retry_demand_due_at=None,
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


def _translation_claim(
    *,
    work_id: int = 202,
    conversation_id: int = 10,
    conversation_slug_id: str = "abc12345",
    description_id: int = 501,
    locale: str = "fr",
    lease_token: str = "token-translation",
) -> ClaimedDescriptionTranslationWorkItem:
    return ClaimedDescriptionTranslationWorkItem(
        id=work_id,
        conversation_id=conversation_id,
        conversation_slug_id=conversation_slug_id,
        description_id=description_id,
        locale=locale,
        attempt_count=1,
        lease_token=lease_token,
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


def test_translation_claim_batches_keep_context_and_bound_size() -> None:
    same_context_claims = [
        _translation_claim(
            work_id=300 + offset,
            description_id=700 + offset,
            lease_token=f"token-{offset}",
        )
        for offset in range(DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE + 1)
    ]
    claims = [
        *same_context_claims,
        _translation_claim(
            work_id=400,
            conversation_id=11,
            conversation_slug_id="def67890",
            description_id=800,
            lease_token="token-other-conversation",
        ),
        _translation_claim(
            work_id=401,
            description_id=801,
            locale="es",
            lease_token="token-other-locale",
        ),
    ]

    batches = description_translation_work_claim_batches(claims)

    assert sum(len(batch) for batch in batches) == len(claims)
    assert all(len(batch) <= DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE for batch in batches)
    assert all(
        len({(claim.conversation_id, claim.locale) for claim in batch}) == 1
        for batch in batches
    )
    assert [claim.description_id for claim in batches[0]] == [700, 701, 702, 703]
    assert [claim.description_id for claim in batches[1]] == [704]


def test_process_translation_work_items_batch_persists_multiple_translations() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add_all(
            [
                OpinionGroupDescription(
                    id=501,
                    locale="en",
                    label="Group one",
                    summary="Summary one",
                    created_at=NOW,
                ),
                OpinionGroupDescription(
                    id=502,
                    locale="en",
                    label="Group two",
                    summary="Summary two",
                    created_at=NOW,
                ),
            ]
        )
        first_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork).where(
                OpinionGroupDescriptionTranslationWork.id == 202
            )
        ).scalar_one()
        first_work.next_run_at = None
        first_work.lease_owner = "worker-1"
        first_work.lease_token = "token-translation-1"
        first_work.lease_expires_at = NOW + timedelta(minutes=10)
        session.add(
            OpinionGroupDescriptionTranslationWork(
                id=203,
                description_id=502,
                conversation_id=10,
                locale="fr",
                attempt_count=1,
                next_run_at=None,
                lease_owner="worker-1",
                lease_token="token-translation-2",
                lease_expires_at=NOW + timedelta(minutes=10),
                non_retryable_ai_description_epoch=None,
                last_error_code=None,
                last_error_message=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    calls: list[tuple[list[DescriptionForTranslation], list[str]]] = []

    def translate_descriptions(
        descriptions: list[DescriptionForTranslation],
        target_language_codes: list[str],
    ) -> list[DescriptionTranslation]:
        calls.append((descriptions, target_language_codes))
        return [
            DescriptionTranslation(
                description_id=description.description_id,
                locale=target_language_codes[0],
                label=f"{description.label} fr",
                summary=f"{description.summary} fr",
            )
            for description in descriptions
        ]

    result = process_description_translation_work_items_batch(
        engine,
        claims=[
            _translation_claim(
                work_id=202,
                lease_token="token-translation-1",
            ),
            _translation_claim(
                work_id=203,
                description_id=502,
                lease_token="token-translation-2",
            ),
        ],
        translate_descriptions=translate_descriptions,
    )

    with Session(engine) as session:
        translations = (
            session.execute(
                select(OpinionGroupDescriptionTranslation).order_by(
                    OpinionGroupDescriptionTranslation.description_id
                )
            )
            .scalars()
            .all()
        )
        work_rows = (
            session.execute(
                select(OpinionGroupDescriptionTranslationWork).order_by(
                    OpinionGroupDescriptionTranslationWork.id
                )
            )
            .scalars()
            .all()
        )

    assert len(calls) == 1
    assert calls[0][1] == ["fr"]
    assert [description.description_id for description in calls[0][0]] == [501, 502]
    assert [(translation.description_id, translation.locale) for translation in translations] == [
        (501, "fr"),
        (502, "fr"),
    ]
    assert [translation.label for translation in translations] == ["Group one fr", "Group two fr"]
    assert all(work_row.lease_token is None for work_row in work_rows)
    assert all(work_row.next_run_at is None for work_row in work_rows)
    assert [schedule.conversation_id for schedule in result.schedules] == [10, 10]
    assert result.translated_description_ids == [501, 502]


def test_content_update_events_coalesce_locales_per_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.add(
            OpinionGroupDescriptionLocaleExpectation(
                id=103,
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_result_id=50,
                locale="es",
                expectation_kind=AiDescriptionLocaleExpectationKindEnum.translation,
                retry_demand_due_at=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    queue_ai_description_content_updated_events(
        engine,
        lineage_ids_by_conversation_id={},
        translation_description_ids_by_conversation_locale={
            (10, "fr"): [501],
            (10, "es"): [501],
        },
    )

    with Session(engine) as session:
        events = session.execute(select(RealtimeEventOutbox)).scalars().all()

    assert len(events) == 1
    assert events[0].payload["conversationViewSnapshotId"] == 20
    assert events[0].payload["locales"] == ["es", "fr"]


def test_process_translation_work_items_batch_rejects_output_mismatch() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add(
            OpinionGroupDescription(
                id=501,
                locale="en",
                label="Group one",
                summary="Summary one",
                created_at=NOW,
            )
        )
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.next_run_at = None
        translation_work.lease_owner = "worker-1"
        translation_work.lease_token = "token-translation"
        translation_work.lease_expires_at = NOW + timedelta(minutes=10)
        session.commit()

    def translate_descriptions(
        _descriptions: list[DescriptionForTranslation],
        target_language_codes: list[str],
    ) -> list[DescriptionTranslation]:
        return [
            DescriptionTranslation(
                description_id=999,
                locale=target_language_codes[0],
                label="wrong",
                summary="wrong",
            )
        ]

    with pytest.raises(DescriptionOutputError):
        process_description_translation_work_items_batch(
            engine,
            claims=[_translation_claim()],
            translate_descriptions=translate_descriptions,
        )

    with Session(engine) as session:
        translation_count = session.execute(
            select(OpinionGroupDescriptionTranslation)
        ).scalars().all()
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()

    assert translation_count == []
    assert translation_work.lease_token == "token-translation"


def test_immediate_retry_time_is_claimable_with_second_precision() -> None:
    now = datetime(2026, 5, 21, 12, 0, 0, 838633, tzinfo=UTC)

    retry_at = claimable_immediate_retry_at(now)

    assert retry_at == datetime(2026, 5, 21, 12, 0, 0, tzinfo=UTC)
    assert retry_at <= now


def test_non_processable_ai_cleanup_fallbacks_statuses_without_activation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)

    completed_ids = complete_non_processable_ai_description_work_batch(
        engine,
        conversation_ids=[10],
    )

    with Session(engine) as session:
        expectations = (
            session.execute(
                select(OpinionGroupDescriptionLocaleExpectation).order_by(
                    OpinionGroupDescriptionLocaleExpectation.locale
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
    assert [expectation.retry_demand_due_at for expectation in expectations] == [None, None]
    assert view_snapshot.activated_at is None
    assert lineage_work.next_run_at is None
    assert translation_work.next_run_at is None


def test_pending_translation_blocks_snapshot_activation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_claiming_first_pass_work_does_not_activate_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.commit()

    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        checkpoint_reasons = session.execute(
            select(ConversationViewSnapshotCheckpointReason)
        ).scalars().all()

    assert len(claims) == 1
    assert view_snapshot.activated_at is None
    assert checkpoint_reasons == []


def test_first_pass_claiming_treats_fallback_statuses_as_terminal() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.next_run_at = None
        english_expectation = session.execute(
            select(OpinionGroupDescriptionLocaleExpectation).where(
                OpinionGroupDescriptionLocaleExpectation.locale == "en"
            )
        ).scalar_one()
        english_expectation.retry_demand_due_at = None
        session.commit()

    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_pending_status=True,
    )

    assert claims == []


def test_first_pass_finalization_warns_and_activates_pending_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.fallback_status_count == 1
    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_first_pass_finalization_activates_pending_translation_after_generation_advances() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.analysis_data_generation = 2
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.fallback_status_count == 1
    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_first_pass_finalization_warns_and_activates_pending_english() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.fallback_status_count == 1
    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_first_pass_finalization_ignores_ready_english_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_first_pass_finalization_ignores_ready_translation_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.add(
            OpinionGroupDescriptionTranslation(
                id=601,
                description_id=501,
                locale="fr",
                label="Groupe",
                summary="Résumé",
                created_at=NOW,
            )
        )
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_activation_does_not_publish_content_count_snapshots() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=30,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.conversation_content_updated,
                is_closed=False,
                opinion_count=3,
                vote_count=3,
                participant_count=3,
                total_opinion_count=3,
                total_vote_count=3,
                total_participant_count=3,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=None,
                created_at=NOW + timedelta(seconds=1),
            )
        )

        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20, 21],
        translation_enabled=True,
    )

    with Session(engine) as session:
        snapshots = session.execute(
            select(ConversationViewSnapshot).order_by(ConversationViewSnapshot.id)
        ).scalars().all()

    assert result.activated_view_snapshot_ids == [20]
    assert snapshots[0].activated_at is not None
    assert snapshots[1].activated_at is None


def test_newer_content_snapshot_does_not_stale_first_pass_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=30,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.conversation_content_updated,
                is_closed=False,
                opinion_count=3,
                vote_count=3,
                participant_count=3,
                total_opinion_count=3,
                total_vote_count=3,
                total_participant_count=3,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=None,
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()

    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )

    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedDescriptionTranslationWorkItem)


def test_translation_fallback_allows_first_pass_activation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_activate_pending_translation_expectations_marks_missing_translation_due() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.commit()

    activated_ids = activate_pending_translation_expectations(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
    )

    with Session(engine) as session:
        translation_expectation = session.execute(
            select(OpinionGroupDescriptionLocaleExpectation).where(
                OpinionGroupDescriptionLocaleExpectation.expectation_kind
                == AiDescriptionLocaleExpectationKindEnum.translation
            )
        ).scalar_one()

    assert activated_ids == [10]
    assert translation_expectation.retry_demand_due_at is not None


def test_activate_pending_translation_expectations_clears_ready_translation_due() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        translation_expectation = session.execute(
            select(OpinionGroupDescriptionLocaleExpectation).where(
                OpinionGroupDescriptionLocaleExpectation.expectation_kind
                == AiDescriptionLocaleExpectationKindEnum.translation
            )
        ).scalar_one()
        translation_expectation.retry_demand_due_at = NOW
        session.add(
            OpinionGroupDescriptionTranslation(
                id=601,
                description_id=501,
                locale="fr",
                label="Groupe",
                summary="Résumé",
                created_at=NOW,
            )
        )
        session.commit()

    activated_ids = activate_pending_translation_expectations(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
    )

    with Session(engine) as session:
        translation_expectation = session.execute(
            select(OpinionGroupDescriptionLocaleExpectation).where(
                OpinionGroupDescriptionLocaleExpectation.expectation_kind
                == AiDescriptionLocaleExpectationKindEnum.translation
            )
        ).scalar_one()

    assert activated_ids == []
    assert translation_expectation.retry_demand_due_at is None


def test_translation_retry_fallback_does_not_activate_first_pass_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.lease_owner = "worker-1"
        translation_work.lease_token = "token-translation"
        translation_work.lease_expires_at = NOW + timedelta(minutes=10)
        translation_work.next_run_at = None
        session.commit()

    schedule = retry_ai_description_locale_work_item(
        engine,
        claim=ClaimedDescriptionTranslationWorkItem(
            id=202,
            conversation_id=10,
            conversation_slug_id="abc12345",
            description_id=501,
            locale="fr",
            attempt_count=1,
            lease_token="token-translation",
        ),
        retry_policy=RetryPolicy(
            burst_attempts=10,
            burst_interval_seconds=10,
            cooldown_seconds=300,
        ),
        error_code="ai_description_retryable",
        error_message="temporary translation failure",
        force_cooldown=True,
    )

    with Session(engine) as session:
        expectations = (
            session.execute(
                select(OpinionGroupDescriptionLocaleExpectation).order_by(
                    OpinionGroupDescriptionLocaleExpectation.locale
                )
            )
            .scalars()
            .all()
        )
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()

    assert schedule.retry_scheduled_at is not None
    assert expectations[1].retry_demand_due_at is None
    assert view_snapshot.activated_at is None
    assert translation_work.lease_token is None
    assert translation_work.next_run_at is not None


def test_stale_non_checkpoint_retry_work_is_not_claimable() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
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
                activated_at=NOW + timedelta(seconds=1),
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()

    due_conversation_ids = fetch_due_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
    )
    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
    )

    assert due_conversation_ids == []
    assert claims == []


def test_retry_claim_requires_activated_view_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        session.commit()

    unactivated_due_ids = fetch_due_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )
    unactivated_claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.commit()

    activated_due_ids = fetch_due_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )
    activated_claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )

    assert unactivated_due_ids == []
    assert unactivated_claims == []
    assert activated_due_ids == [10]
    assert len(activated_claims) == 1
    assert isinstance(activated_claims[0], ClaimedLineageDescriptionWorkItem)


def test_retry_claim_allows_activated_checkpoint_after_newer_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        session.add(
            ConversationViewSnapshotCheckpointReason(
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis,
                group_count=None,
                participant_milestone=None,
                vote_milestone=None,
                created_at=NOW,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
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
                activated_at=NOW + timedelta(seconds=1),
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()

    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )

    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedLineageDescriptionWorkItem)


def test_recover_expired_work_can_target_unactivated_first_pass() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.next_run_at = None
        lineage_work.lease_owner = "worker-1"
        lineage_work.lease_token = "token-1"
        lineage_work.lease_expires_at = NOW - timedelta(seconds=1)
        session.commit()

    recovered_ids = recover_expired_ai_description_work(
        engine,
        translation_enabled=False,
        require_unactivated_view_snapshot=True,
    )

    with Session(engine) as session:
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()

    assert recovered_ids == [10]
    assert lineage_work.lease_token is None
    assert lineage_work.next_run_at is not None


def test_unactivated_recovery_does_not_claim_activated_retry_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.next_run_at = None
        lineage_work.lease_owner = "worker-1"
        lineage_work.lease_token = "token-1"
        lineage_work.lease_expires_at = NOW - timedelta(seconds=1)
        session.commit()

    unactivated_recovered_ids = recover_expired_ai_description_work(
        engine,
        translation_enabled=False,
        require_unactivated_view_snapshot=True,
    )
    activated_recovered_ids = recover_expired_ai_description_work(
        engine,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )

    assert unactivated_recovered_ids == []
    assert activated_recovered_ids == [10]


def test_completion_releases_stale_unactivated_first_pass_after_new_votes() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add(
            AnalysisWorkState(
                id=901,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=0,
                running_data_generation=1,
                persisted_analysis_snapshot_id=30,
                dirty_since=None,
                next_run_at=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=NOW + timedelta(minutes=10),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    claim = ClaimedWorkItem(
        id=901,
        conversation_id=10,
        conversation_slug_id="abc12345",
        opinion_group_spec_id=1,
        data_generation=1,
        attempt_count=1,
        lease_token="analysis-token",
        persisted_analysis_snapshot_id=30,
    )

    blocked_schedules = complete_computed_analysis_work_items_batch(
        engine,
        claims=[claim],
        require_display_safe_activation=True,
    )
    with Session(engine) as session:
        blocked_state = session.execute(select(AnalysisWorkState)).scalar_one()
        blocked_running_generation = blocked_state.running_data_generation
        blocked_persisted_snapshot_id = blocked_state.persisted_analysis_snapshot_id
        blocked_lease_token = blocked_state.lease_token
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.analysis_data_generation = 2
        session.commit()

    stale_schedules = complete_computed_analysis_work_items_batch(
        engine,
        claims=[claim],
        require_display_safe_activation=True,
    )
    with Session(engine) as session:
        stale_state = session.execute(select(AnalysisWorkState)).scalar_one()
        stale_last_completed_generation = stale_state.last_completed_data_generation
        stale_running_generation = stale_state.running_data_generation
        stale_persisted_snapshot_id = stale_state.persisted_analysis_snapshot_id

    assert blocked_schedules == []
    assert blocked_running_generation == 1
    assert blocked_persisted_snapshot_id == 30
    assert blocked_lease_token == "analysis-token"
    assert len(stale_schedules) == 1
    assert stale_schedules[0].conversation_id == 10
    assert stale_schedules[0].next_run_at is not None
    assert stale_last_completed_generation == 1
    assert stale_running_generation is None
    assert stale_persisted_snapshot_id is None


def test_extend_postgres_leases_only_extends_active_owned_claims() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.add_all(
            [
                AnalysisWorkState(
                    id=901,
                    conversation_id=10,
                    opinion_group_spec_id=1,
                    last_completed_data_generation=0,
                    running_data_generation=1,
                    persisted_analysis_snapshot_id=None,
                    dirty_since=None,
                    next_run_at=None,
                    attempt_generation=1,
                    attempt_count=1,
                    non_retryable_generation=None,
                    non_retryable_analysis_engine_epoch=None,
                    lease_owner="math-updater",
                    lease_token="analysis-token",
                    lease_expires_at=NOW + timedelta(seconds=1),
                    last_error_kind=None,
                    last_error_code=None,
                    last_error_message=None,
                    last_error_stack_hash=None,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                AnalysisWorkState(
                    id=902,
                    conversation_id=10,
                    opinion_group_spec_id=1,
                    last_completed_data_generation=0,
                    running_data_generation=2,
                    persisted_analysis_snapshot_id=None,
                    dirty_since=None,
                    next_run_at=None,
                    attempt_generation=2,
                    attempt_count=1,
                    non_retryable_generation=None,
                    non_retryable_analysis_engine_epoch=None,
                    lease_owner="math-updater",
                    lease_token="other-token",
                    lease_expires_at=NOW + timedelta(seconds=1),
                    last_error_kind=None,
                    last_error_code=None,
                    last_error_message=None,
                    last_error_stack_hash=None,
                    created_at=NOW,
                    updated_at=NOW,
                ),
            ]
        )
        session.commit()

    result = extend_postgres_leases(
        engine,
        claims=[
            ClaimedWorkItem(
                id=901,
                conversation_id=10,
                conversation_slug_id="abc12345",
                opinion_group_spec_id=1,
                data_generation=1,
                attempt_count=1,
                lease_token="analysis-token",
                persisted_analysis_snapshot_id=None,
            ),
            ClaimedWorkItem(
                id=902,
                conversation_id=10,
                conversation_slug_id="abc12345",
                opinion_group_spec_id=1,
                data_generation=2,
                attempt_count=1,
                lease_token="stale-token",
                persisted_analysis_snapshot_id=None,
            ),
        ],
        lease_ttl_seconds=120,
    )

    with Session(engine) as session:
        work_states = (
            session.execute(select(AnalysisWorkState).order_by(AnalysisWorkState.id))
            .scalars()
            .all()
        )

    original_expires_at = (NOW + timedelta(seconds=1)).replace(tzinfo=None)
    assert result.extended_work_state_ids == [901]
    assert work_states[0].lease_expires_at is not None
    assert work_states[0].lease_expires_at > original_expires_at
    assert work_states[1].lease_expires_at == original_expires_at


def test_recover_expired_persisted_analysis_work_keeps_resume_state() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.add(
            AnalysisWorkState(
                id=901,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=0,
                running_data_generation=1,
                persisted_analysis_snapshot_id=30,
                dirty_since=None,
                next_run_at=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=NOW - timedelta(seconds=1),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    recovered_ids = recover_expired_running_work(engine)

    with Session(engine) as session:
        recovered_state = session.execute(select(AnalysisWorkState)).scalar_one()

    assert recovered_ids == [10]
    assert recovered_state.running_data_generation == 1
    assert recovered_state.persisted_analysis_snapshot_id == 30
    assert recovered_state.lease_token == "analysis-token"
    assert recovered_state.next_run_at is None


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
        expectations = (
            session.execute(
                select(OpinionGroupDescriptionLocaleExpectation).order_by(
                    OpinionGroupDescriptionLocaleExpectation.locale
                )
            )
            .scalars()
            .all()
        )
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()

    assert [expectation.retry_demand_due_at for expectation in expectations] == [None, None]
    assert view_snapshot.activated_at is None
    assert lineage_work.lease_token is None
    assert lineage_work.next_run_at is None
