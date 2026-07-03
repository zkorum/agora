from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine, create_engine, delete, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from agora_analysis_worker_shared.ai_description_work import (
    DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE,
    CandidateLocaleRequestRow,
    ClaimedDescriptionTranslationWorkItem,
    ClaimedLineageDescriptionWorkItem,
    EagerAiDescriptionTargetLocaleRow,
    EagerDescriptionCandidateRow,
    LineageDescriptionWorkDemand,
    RequiredLineageDescriptionRow,
    TranslationWorkDemand,
    claim_ai_description_locale_work_items_batch,
    claim_first_pass_ai_description_locale_work_items_batch,
    complete_non_processable_ai_description_work_batch,
    description_translation_work_claim_batches,
    eager_ai_description_target_locales_by_candidate,
    extend_ai_description_locale_work_leases,
    fetch_claimable_ai_description_work_conversation_ids,
    finalize_first_pass_ai_description_work_batch,
    generate_label_summaries_with_partial_retry,
    lineage_description_work_demands_for_candidate_requests,
    materialize_requested_description_translation_work,
    materialize_requested_lineage_description_work,
    process_ai_description_locale_work_item,
    process_description_translation_work_items_batch,
    queue_ai_description_content_updated_events,
    recover_expired_ai_description_work,
    retry_ai_description_locale_work_item,
    translation_work_demands_for_candidate_requests,
    translation_work_demands_for_eager_candidates,
)
from agora_analysis_worker_shared.bedrock_label_summary import (
    LabelSummary,
    ParsedLabelSummaryOutput,
)
from agora_analysis_worker_shared.db import (
    ClaimedWorkItem,
    claim_work_items_batch,
    complete_computed_analysis_work_items_batch,
    extend_postgres_leases,
    fetch_claimable_work_conversation_ids,
    recover_expired_running_work,
)
from agora_analysis_worker_shared.description_input import (
    ConversationDescriptionInput,
    DescriptionOutputError,
    GroupDescriptionInput,
    RepresentativeOpinionText,
)
from agora_analysis_worker_shared.description_translation import (
    DescriptionForTranslation,
    DescriptionTranslation,
)
from agora_analysis_worker_shared.generated_models import (
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotResult,
    AnalysisWorkState,
    Base,
    Conversation,
    ConversationContent,
    ConversationLanguageSettingsSource,
    ConversationTranslationTargetLanguage,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotCheckpointReasonEnum,
    ConversationViewSnapshotReasonEnum,
    DisplayLanguageCode,
    OpinionGroup,
    OpinionGroupCandidate,
    OpinionGroupCandidateAssessment,
    OpinionGroupCandidateDescriptionLocaleRequest,
    OpinionGroupDescription,
    OpinionGroupDescriptionTranslation,
    OpinionGroupDescriptionTranslationWork,
    OpinionGroupLineage,
    OpinionGroupLineageDescriptionWork,
    OpinionGroupVariant,
    ParticipationMode,
    RealtimeEventOutbox,
    SpokenLanguageCode,
    VoteEnumSimple,
)
from agora_analysis_worker_shared.generated_shared_types import (
    SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES,
)

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
            project_id=1,
            current_content_id=40,
            dynamic_translation_enabled=True,
            language_settings_source=ConversationLanguageSettingsSource.conversation_override,
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
        ConversationContent(
            id=40,
            public_id=uuid.UUID("00000000-0000-0000-0000-000000000040"),
            conversation_id=10,
            title="Test conversation",
            body=None,
            body_plain_text="Test conversation",
            source_language_code=SpokenLanguageCode.en,
            source_raw_language_code="en",
            source_language_provider=None,
            source_language_confidence=1.0,
            created_at=NOW,
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
        OpinionGroupCandidateAssessment(
            id=901,
            candidate_id=401,
            silhouette_score=0.8,
            coefficient_of_variation=None,
            balance_score=0.8,
            selection_score=0.8,
            hidden_reason=None,
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
    session.add(
        OpinionGroupCandidateDescriptionLocaleRequest(
            id=101,
            candidate_id=401,
            locale="fr",
            created_at=NOW,
            updated_at=NOW,
        )
    )
    session.add(
        OpinionGroupLineageDescriptionWork(
            id=201,
            lineage_id=301,
            conversation_id=10,
            source_candidate_id=401,
            attempt_count=1,
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


def _candidate_locale_request(
    *,
    request_id: int,
    conversation_id: int = 10,
    candidate_id: int | None = None,
    locale: str = "en",
) -> CandidateLocaleRequestRow:
    return CandidateLocaleRequestRow(
        id=request_id,
        conversation_id=conversation_id,
        candidate_id=candidate_id or 1000 + request_id,
        locale=locale,
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


def _insert_effective_conversation_target_language(
    session: Session,
    *,
    source_language_code: str = "en",
    target_language_code: DisplayLanguageCode = DisplayLanguageCode.fr,
    deleted_at: datetime | None = None,
) -> None:
    content = session.get(ConversationContent, 40)
    if content is not None:
        content.source_language_code = SpokenLanguageCode(source_language_code)
    session.add(
        ConversationTranslationTargetLanguage(
            id=203,
            conversation_id=10,
            language_code=target_language_code,
            created_at=NOW,
            deleted_at=deleted_at,
        )
    )


def test_label_summary_partial_retry_stops_after_timeout() -> None:
    calls: list[list[str]] = []

    def generate_descriptions(
        conversation: ConversationDescriptionInput,
    ) -> ParsedLabelSummaryOutput:
        calls.append([group.group_key for group in conversation.groups])
        if len(calls) == 1:
            return ParsedLabelSummaryOutput(
                mode="strict",
                clusters={
                    "0": LabelSummary(
                        reasoning="ok",
                        label="Transitists",
                        summary="Supports transit.",
                    )
                },
            )
        raise TimeoutError("bedrock timed out")

    result = generate_label_summaries_with_partial_retry(
        generate_descriptions=generate_descriptions,
        conversation=ConversationDescriptionInput(
            conversation_title="Transit funding",
            conversation_body="How should transit be funded?",
            groups=[
                GroupDescriptionInput(
                    group_key="0",
                    representative_opinions=[
                        RepresentativeOpinionText(
                            opinion_id=10,
                            stance=VoteEnumSimple.agree,
                            content="Fund transit",
                        )
                    ],
                ),
                GroupDescriptionInput(
                    group_key="1",
                    representative_opinions=[
                        RepresentativeOpinionText(
                            opinion_id=20,
                            stance=VoteEnumSimple.disagree,
                            content="Raise fares",
                        )
                    ],
                ),
            ],
            analysis_snapshot_id=30,
        ),
        attempts=3,
    )

    assert calls == [["0", "1"], ["1"]]
    assert list(result.clusters) == ["0"]


def _insert_attempted_eager_translation_work(session: Session) -> None:
    existing_work_by_locale = {
        work.locale: work
        for work in session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalars()
    }
    next_id = 10_000
    for locale in SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES:
        locale_code = DisplayLanguageCode(locale)
        existing_work = existing_work_by_locale.get(locale_code)
        if existing_work is not None:
            existing_work.attempt_count = 1
            continue
        session.add(
            OpinionGroupDescriptionTranslationWork(
                id=next_id,
                description_id=501,
                conversation_id=10,
                locale=locale_code,
                attempt_count=1,
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
        next_id += 1


def _insert_all_eager_translations(session: Session) -> None:
    existing_locales = {
        translation.locale
        for translation in session.execute(
            select(OpinionGroupDescriptionTranslation)
        ).scalars()
    }
    next_id = 20_000
    for locale in SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES:
        if locale in existing_locales:
            continue
        session.add(
            OpinionGroupDescriptionTranslation(
                id=next_id,
                description_id=501,
                locale=locale,
                label=f"Label {locale}",
                summary=f"Summary {locale}",
                created_at=NOW,
            )
        )
        next_id += 1


def test_lineage_description_work_demands_are_unique_and_skip_ready_lineages() -> None:
    requests = [
        _candidate_locale_request(request_id=1, candidate_id=1000),
        _candidate_locale_request(request_id=2, candidate_id=2000),
    ]

    demands = lineage_description_work_demands_for_candidate_requests(
        requests=requests,
        lineage_rows_by_request_id={
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
        ),
        LineageDescriptionWorkDemand(
            lineage_id=12,
            conversation_id=10,
            source_candidate_id=2001,
        ),
    ]


def test_translation_work_demands_are_unique_per_description_locale() -> None:
    requests = [
        _candidate_locale_request(request_id=1, locale="fr"),
        _candidate_locale_request(request_id=2, locale="fr"),
        _candidate_locale_request(request_id=3, locale="es"),
    ]

    demands = translation_work_demands_for_candidate_requests(
        requests=requests,
        description_ids_by_request_id={
            1: {10, 20},
            2: {10, 30},
            3: {10},
        },
        translated_description_ids_by_request_id={
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
        ),
        TranslationWorkDemand(
            description_id=30,
            conversation_id=10,
            locale="fr",
        ),
    ]


def test_eager_ai_description_targets_use_effective_non_english_targets() -> None:
    candidates = [
        EagerDescriptionCandidateRow(
            conversation_id=10,
            candidate_id=100,
        )
    ]
    target_locale_rows = [
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="fr",
        ),
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="es",
        ),
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="en",
        ),
    ]

    target_locales_by_candidate_id = eager_ai_description_target_locales_by_candidate(
        candidates=candidates,
        target_locale_rows=target_locale_rows,
        supported_target_language_codes={"en", "es", "fr"},
    )
    demands = translation_work_demands_for_eager_candidates(
        candidates=candidates,
        lineage_rows_by_candidate_id={
            100: [
                RequiredLineageDescriptionRow(
                    lineage_id=1,
                    candidate_id=100,
                    system_description_id=1001,
                ),
                RequiredLineageDescriptionRow(
                    lineage_id=2,
                    candidate_id=100,
                    system_description_id=1002,
                ),
            ]
        },
        target_locales_by_candidate_id=target_locales_by_candidate_id,
        translated_description_ids_by_locale={"es": {1002}},
    )

    assert target_locales_by_candidate_id == {100: ("es", "fr")}
    assert demands == [
        TranslationWorkDemand(
            description_id=1001,
            conversation_id=10,
            locale="es",
        ),
        TranslationWorkDemand(
            description_id=1001,
            conversation_id=10,
            locale="fr",
        ),
        TranslationWorkDemand(
            description_id=1002,
            conversation_id=10,
            locale="fr",
        ),
    ]


def test_eager_ai_description_targets_ignore_unsupported_effective_targets() -> None:
    candidates = [
        EagerDescriptionCandidateRow(
            conversation_id=10,
            candidate_id=100,
        )
    ]
    target_locale_rows = [
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="es",
        ),
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="de",
        ),
    ]

    target_locales_by_candidate_id = eager_ai_description_target_locales_by_candidate(
        candidates=candidates,
        target_locale_rows=target_locale_rows,
        supported_target_language_codes={"es", "fr"},
    )

    assert target_locales_by_candidate_id == {100: ("es",)}


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
    assert all(len({claim.locale for claim in batch}) == 1 for batch in batches)
    assert [claim.description_id for claim in batches[0]] == [700, 701, 702, 703]
    assert [claim.description_id for claim in batches[1]] == [704, 800]


def test_process_translation_work_items_batch_persists_multiple_translations() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = None
        session.commit()
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
    assert [schedule.conversation_id for schedule in result.schedules] == [10, 10]
    assert result.translated_description_ids == [501, 502]


def test_content_update_events_coalesce_locales_per_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.add(
            OpinionGroupCandidateDescriptionLocaleRequest(
                id=103,
                candidate_id=401,
                locale="es",
                created_at=NOW,
                updated_at=NOW,
            )
        )
        _insert_all_eager_translations(session)
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
    assert events[0].payload["candidateIds"] == [401]


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


def test_non_processable_ai_cleanup_fallbacks_statuses_without_activation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = None
        session.commit()

    completed_ids = complete_non_processable_ai_description_work_batch(
        engine,
        conversation_ids=[10],
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()

    assert completed_ids == [10]
    assert view_snapshot.activated_at is None
    assert lineage_work.lease_token is None
    assert translation_work.lease_token is None


def test_first_pass_ignores_lazy_pending_translation_request() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
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

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_first_pass_ignores_english_effective_target_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(
            session,
            target_language_code=DisplayLanguageCode.en,
        )
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
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

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_requested_translation_materializes_without_effective_target_language() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.execute(delete(OpinionGroupDescriptionTranslationWork))
        session.commit()

    conversation_ids = materialize_requested_description_translation_work(
        engine,
        limit=10,
    )

    with Session(engine) as session:
        target_rows = session.execute(
            select(ConversationTranslationTargetLanguage)
        ).scalars().all()
        translation_work_rows = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalars().all()

    assert conversation_ids == [10]
    assert target_rows == []
    assert [(row.description_id, row.locale) for row in translation_work_rows] == [
        (501, "fr")
    ]


def test_pending_eager_translation_blocks_snapshot_activation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
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
    assert result.activated_view_snapshot_ids == []
    assert view_snapshot.activated_at is None


def test_claiming_first_pass_work_does_not_activate_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.commit()

    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=1,
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


def test_first_pass_claiming_allows_one_immediate_lineage_retry() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.attempt_count = 1
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
    )

    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedLineageDescriptionWorkItem)
    assert claims[0].attempt_count == 2


def test_first_pass_claiming_uses_materialized_auto_and_facilitator_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        conversation.preferred_opinion_group_count = 2
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.preferred_opinion_group_count = 2
        result = session.execute(select(AnalysisSnapshotResult)).scalar_one()
        result.variants_enabled = True
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        existing_lineage_work = session.execute(
            select(OpinionGroupLineageDescriptionWork)
        ).scalar_one()
        existing_translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        session.delete(existing_lineage_work)
        session.delete(existing_translation_work)
        session.add_all(
            [
                OpinionGroupVariant(
                    id=602,
                    opinion_group_spec_id=1,
                    group_count=3,
                    created_at=NOW,
                ),
                OpinionGroupVariant(
                    id=603,
                    opinion_group_spec_id=1,
                    group_count=4,
                    created_at=NOW,
                ),
                OpinionGroupCandidate(
                    id=402,
                    snapshot_result_id=50,
                    opinion_group_variant_id=602,
                    scope_id=702,
                    outcome=AnalysisResultOutcomeEnum.success,
                    outcome_reason=None,
                    raw_output=None,
                    created_at=NOW,
                ),
                OpinionGroupCandidateAssessment(
                    id=902,
                    candidate_id=402,
                    silhouette_score=0.7,
                    coefficient_of_variation=None,
                    balance_score=0.7,
                    selection_score=0.7,
                    hidden_reason=None,
                    created_at=NOW,
                ),
                OpinionGroupCandidate(
                    id=403,
                    snapshot_result_id=50,
                    opinion_group_variant_id=603,
                    scope_id=703,
                    outcome=AnalysisResultOutcomeEnum.success,
                    outcome_reason=None,
                    raw_output=None,
                    created_at=NOW,
                ),
                OpinionGroupCandidateAssessment(
                    id=903,
                    candidate_id=403,
                    silhouette_score=0.9,
                    coefficient_of_variation=None,
                    balance_score=0.9,
                    selection_score=0.9,
                    hidden_reason=None,
                    created_at=NOW,
                ),
                OpinionGroupLineage(
                    id=302,
                    scope_id=702,
                    system_description_id=None,
                    admin_description_id=None,
                    created_at=NOW,
                ),
                OpinionGroupLineage(
                    id=303,
                    scope_id=703,
                    system_description_id=None,
                    admin_description_id=None,
                    created_at=NOW,
                ),
                OpinionGroup(
                    id=802,
                    candidate_id=402,
                    scope_id=702,
                    lineage_id=302,
                    key="1",
                    external_id=1,
                    num_users=1,
                    created_at=NOW,
                ),
                OpinionGroup(
                    id=803,
                    candidate_id=403,
                    scope_id=703,
                    lineage_id=303,
                    key="2",
                    external_id=2,
                    num_users=1,
                    created_at=NOW,
                ),
                OpinionGroupLineageDescriptionWork(
                    id=204,
                    lineage_id=301,
                    conversation_id=10,
                    source_candidate_id=401,
                    attempt_count=0,
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    non_retryable_ai_description_epoch=None,
                    last_error_code=None,
                    last_error_message=None,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                OpinionGroupLineageDescriptionWork(
                    id=205,
                    lineage_id=303,
                    conversation_id=10,
                    source_candidate_id=403,
                    attempt_count=0,
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
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
    )

    with Session(engine) as session:
        work_rows = session.execute(
            select(OpinionGroupLineageDescriptionWork).order_by(
                OpinionGroupLineageDescriptionWork.source_candidate_id
            )
        ).scalars().all()

    assert {
        claim.source_candidate_id
        for claim in claims
        if isinstance(claim, ClaimedLineageDescriptionWorkItem)
    } == {401, 403}
    assert [work.source_candidate_id for work in work_rows] == [401, 403]


def test_first_pass_claiming_stops_after_one_lineage_retry() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.attempt_count = 2
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
    )

    assert claims == []


def test_first_pass_claiming_allows_one_immediate_translation_retry() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 1
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=1,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )

    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedDescriptionTranslationWorkItem)
    assert claims[0].attempt_count == 2


def test_first_pass_claiming_materializes_effective_target_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        conversation.dynamic_translation_enabled = False
        session.execute(
            delete(OpinionGroupDescriptionTranslationWork).where(
                OpinionGroupDescriptionTranslationWork.id == 202,
            )
        )
        session.add_all(
            [
                OpinionGroupDescription(
                    id=501,
                    locale="en",
                    label="Group one",
                    summary="Summary one",
                    created_at=NOW,
                ),
                ConversationTranslationTargetLanguage(
                    id=304,
                    conversation_id=10,
                    language_code="es",
                    created_at=NOW,
                ),
            ]
        )
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
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
    assert claims[0].locale == "es"


def test_first_pass_claiming_ignores_deleted_effective_target_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session, deleted_at=NOW)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
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

    assert claims == []


def test_first_pass_finalization_blocks_pending_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
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
    assert result.activated_view_snapshot_ids == []
    assert view_snapshot.activated_at is None


def test_first_pass_finalization_blocks_pending_translation_after_generation_advances() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
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
    assert result.activated_view_snapshot_ids == []
    assert view_snapshot.activated_at is None


def test_first_pass_finalization_blocks_pending_english() -> None:
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
    assert result.activated_view_snapshot_ids == []
    assert view_snapshot.activated_at is None


def test_first_pass_finalization_without_ai_generator_bypasses_description_gate() -> None:
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
        translation_enabled=False,
        require_ai_descriptions=False,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.fallback_status_count == 0
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
        translation_enabled=False,
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
        _insert_attempted_eager_translation_work(session)
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
            .where(OpinionGroupDescriptionTranslationWork.locale == "fr")
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
        _insert_all_eager_translations(session)
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
        _insert_attempted_eager_translation_work(session)
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


def test_newer_content_snapshot_does_not_stale_requested_translation() -> None:
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
    assert all(isinstance(claim, ClaimedDescriptionTranslationWorkItem) for claim in claims)
    assert claims[0].locale == "fr"


def test_translation_fallback_allows_first_pass_activation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_attempted_eager_translation_work(session)
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


def test_materialize_requested_translation_work_creates_missing_translation_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.commit()

    materialized_ids = materialize_requested_description_translation_work(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
    )

    with Session(engine) as session:
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork).where(
                OpinionGroupDescriptionTranslationWork.locale == "fr"
            )
        ).scalar_one()

    assert materialized_ids == [10]
    assert translation_work.lease_token is None


def test_materialize_requested_translation_work_includes_checkpoints_when_enabled() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        request = session.execute(
            select(OpinionGroupCandidateDescriptionLocaleRequest)
        ).scalar_one()
        request.updated_at = NOW
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
        session.add(
            OpinionGroupCandidateDescriptionLocaleRequest(
                id=102,
                candidate_id=401,
                locale="es",
                created_at=NOW + timedelta(seconds=1),
                updated_at=NOW + timedelta(seconds=1),
            )
        )
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

    default_materialized_ids = materialize_requested_description_translation_work(
        engine,
        limit=1,
        require_activated_view_snapshot=True,
    )
    checkpoint_materialized_ids = materialize_requested_description_translation_work(
        engine,
        limit=1,
        require_activated_view_snapshot=True,
        include_checkpoints=True,
    )

    assert default_materialized_ids == []
    assert checkpoint_materialized_ids == [10]
    with Session(engine) as session:
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork).where(
                OpinionGroupDescriptionTranslationWork.locale == "es"
            )
        ).scalar_one()

    assert translation_work.description_id == 501


def test_materialize_requested_lineage_work_includes_checkpoints_when_enabled() -> None:
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

    default_materialized_ids = materialize_requested_lineage_description_work(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
    )
    checkpoint_materialized_ids = materialize_requested_lineage_description_work(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
        include_checkpoints=True,
    )

    assert default_materialized_ids == []
    assert checkpoint_materialized_ids == [10]


def test_materialize_requested_translation_work_skips_ready_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
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
        _insert_all_eager_translations(session)
        session.commit()

    materialized_ids = materialize_requested_description_translation_work(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
    )
    claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        include_lineage_descriptions=False,
        require_activated_view_snapshot=True,
    )

    assert materialized_ids == []
    assert claimable_ids == []


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
        error_code="ai_description_retryable",
        error_message="temporary translation failure",
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()

    assert schedule.retry_released_at is not None
    assert view_snapshot.activated_at is None
    assert translation_work.lease_token is None


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

    claimable_conversation_ids = fetch_claimable_ai_description_work_conversation_ids(
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

    assert claimable_conversation_ids == []
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

    unactivated_claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
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

    activated_claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
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

    assert unactivated_claimable_ids == []
    assert unactivated_claims == []
    assert activated_claimable_ids == [10]
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
    assert stale_schedules == [10]
    assert stale_last_completed_generation == 1
    assert stale_running_generation is None
    assert stale_persisted_snapshot_id is None


def test_expired_unpersisted_analysis_work_is_claimable_immediately() -> None:
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
                persisted_analysis_snapshot_id=None,
                dirty_since=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=datetime.now(UTC) - timedelta(seconds=1),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    claimable_ids = fetch_claimable_work_conversation_ids(
        engine,
        limit=10,
        analysis_engine_epoch=1,
    )
    claims = claim_work_items_batch(
        engine,
        worker_id="math-updater-2",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        analysis_engine_epoch=1,
    )
    claimable_after_claim_ids = fetch_claimable_work_conversation_ids(
        engine,
        limit=10,
        analysis_engine_epoch=1,
    )

    assert claimable_ids == [10]
    assert len(claims) == 1
    assert claims[0].conversation_id == 10
    assert claims[0].data_generation == 1
    assert claims[0].attempt_count == 2
    assert claimable_after_claim_ids == []


def test_expired_first_pass_analysis_work_claimable_after_snapshot_checkpoint() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
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
        session.add(
            AnalysisWorkState(
                id=901,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=0,
                running_data_generation=1,
                persisted_analysis_snapshot_id=None,
                dirty_since=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=datetime.now(UTC) - timedelta(seconds=1),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    claimable_ids = fetch_claimable_work_conversation_ids(
        engine,
        limit=10,
        analysis_engine_epoch=1,
    )
    claims = claim_work_items_batch(
        engine,
        worker_id="math-updater-2",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        analysis_engine_epoch=1,
    )

    assert claimable_ids == [10]
    assert len(claims) == 1
    assert claims[0].conversation_id == 10
    assert claims[0].data_generation == 1
    assert claims[0].attempt_count == 2


def test_active_analysis_lease_blocks_duplicate_claim() -> None:
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
                persisted_analysis_snapshot_id=None,
                dirty_since=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=datetime.now(UTC) + timedelta(minutes=10),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    claimable_ids = fetch_claimable_work_conversation_ids(
        engine,
        limit=10,
        analysis_engine_epoch=1,
    )
    claims = claim_work_items_batch(
        engine,
        worker_id="math-updater-2",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        analysis_engine_epoch=1,
    )

    assert claimable_ids == []
    assert claims == []


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


def test_extend_ai_description_locale_work_leases_only_extends_active_claims() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session, leased_lineage_work=True)
        translation_work = session.get(OpinionGroupDescriptionTranslationWork, 202)
        assert translation_work is not None
        translation_work.lease_owner = "worker-1"
        translation_work.lease_token = "token-translation"
        translation_work.lease_expires_at = NOW + timedelta(seconds=1)
        session.add(
            OpinionGroupDescriptionTranslationWork(
                id=203,
                description_id=501,
                conversation_id=10,
                locale="es",
                attempt_count=1,
                lease_owner="worker-1",
                lease_token="other-token",
                lease_expires_at=NOW + timedelta(seconds=1),
                non_retryable_ai_description_epoch=None,
                last_error_code=None,
                last_error_message=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    result = extend_ai_description_locale_work_leases(
        engine,
        claims=[
            ClaimedLineageDescriptionWorkItem(
                id=201,
                conversation_id=10,
                conversation_slug_id="abc12345",
                lineage_id=301,
                source_candidate_id=401,
                locale="en",
                attempt_count=1,
                lease_token="token-1",
            ),
            _translation_claim(),
            _translation_claim(
                work_id=203,
                locale="es",
                lease_token="stale-token",
            ),
        ],
        lease_ttl_seconds=120,
    )

    with Session(engine) as session:
        lineage_work = session.get(OpinionGroupLineageDescriptionWork, 201)
        active_translation_work = session.get(OpinionGroupDescriptionTranslationWork, 202)
        stale_translation_work = session.get(OpinionGroupDescriptionTranslationWork, 203)

    original_expires_at = (NOW + timedelta(seconds=1)).replace(tzinfo=None)
    assert lineage_work is not None
    assert active_translation_work is not None
    assert stale_translation_work is not None
    assert result.extended_lineage_work_ids == [201]
    assert result.extended_translation_work_ids == [202]
    assert result.extended_count == 2
    assert lineage_work.lease_expires_at is not None
    assert active_translation_work.lease_expires_at is not None
    assert lineage_work.lease_expires_at > original_expires_at
    assert active_translation_work.lease_expires_at > original_expires_at
    assert stale_translation_work.lease_expires_at == original_expires_at


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
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()

    assert view_snapshot.activated_at is None
    assert lineage_work.lease_token is None
