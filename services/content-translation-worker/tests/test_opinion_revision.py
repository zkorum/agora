from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Literal

import pytest
from sqlalchemy import create_engine, delete, update
from sqlalchemy.orm import Session

import content_translation_worker.db as translation_db
from content_translation_worker.db import (
    ClaimedContentTranslationWork,
    OpinionSource,
    ProcessWorkResult,
    process_claimed_work,
)
from content_translation_worker.generated_models import (
    AnalysisSnapshotOpinion,
    ContentTranslationSourceKind,
    Conversation,
    ConversationLanguageSettingsSource,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotReasonEnum,
    DisplayLanguageCode,
    LanguageDetectionProvider,
    Opinion,
    OpinionContent,
    ParticipationMode,
    SpokenLanguageCode,
)
from content_translation_worker.simulated_translation import SimulatedTranslationService
from content_translation_worker.translation_model import SimulatedTranslationMode

if TYPE_CHECKING:
    from collections.abc import Iterator

    from content_translation_worker.translation import ContentTranslationService

HISTORICAL_CONTENT_ID = 10
CURRENT_CONTENT_ID = 11
CONVERSATION_ID = 20
OPINION_ID = 30


@pytest.fixture
def opinion_revision_session() -> Iterator[Session]:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Conversation.metadata.create_all(
        engine,
        tables=[
            Conversation.metadata.tables["conversation"],
            Conversation.metadata.tables["opinion"],
            Conversation.metadata.tables["opinion_content"],
            Conversation.metadata.tables["opinion_content_translation"],
            Conversation.metadata.tables["analysis_snapshot_opinion"],
            Conversation.metadata.tables["conversation_view_snapshot"],
        ],
    )
    now = datetime.now(UTC)
    with Session(engine) as session:
        session.add(
            Conversation(
                id=CONVERSATION_ID,
                slug_id="conv1234",
                project_id=1,
                current_content_id=1,
                is_importing=False,
                language_settings_source=(ConversationLanguageSettingsSource.conversation_override),
                participation_mode=ParticipationMode.guest,
                conversation_type=ConversationType.polis,
                created_at=now,
                updated_at=now,
                last_reacted_at=now,
            )
        )
        session.add(
            Opinion(
                id=OPINION_ID,
                slug_id="opin1234",
                author_id=uuid.uuid4(),
                conversation_id=CONVERSATION_ID,
                current_content_id=CURRENT_CONTENT_ID,
                created_at=now,
                updated_at=now,
                last_reacted_at=now,
            )
        )
        session.add_all(
            [
                OpinionContent(
                    id=HISTORICAL_CONTENT_ID,
                    public_id=uuid.uuid4(),
                    opinion_id=OPINION_ID,
                    conversation_content_id=1,
                    content="Historical statement",
                    source_language_code=SpokenLanguageCode.es,
                    source_raw_language_code="es",
                    source_language_provider=LanguageDetectionProvider.lingua,
                    source_language_confidence=1.0,
                    created_at=now,
                ),
                OpinionContent(
                    id=CURRENT_CONTENT_ID,
                    public_id=uuid.uuid4(),
                    opinion_id=OPINION_ID,
                    conversation_content_id=1,
                    content="Current statement",
                    source_language_code=SpokenLanguageCode.es,
                    source_raw_language_code="es",
                    source_language_provider=LanguageDetectionProvider.lingua,
                    source_language_confidence=1.0,
                    created_at=now,
                ),
            ]
        )
        session.add(
            AnalysisSnapshotOpinion(
                id=40,
                analysis_snapshot_id=50,
                opinion_id=OPINION_ID,
                opinion_content_id=HISTORICAL_CONTENT_ID,
                local_opinion_index=0,
                created_at=now,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=41,
                conversation_id=CONVERSATION_ID,
                opinion_group_spec_id=1,
                analysis_snapshot_id=50,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=1,
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
                activated_at=now,
                created_at=now,
            )
        )
        session.commit()
        yield session
    engine.dispose()


def test_processes_non_current_historical_opinion_revision(
    opinion_revision_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    translated_texts: list[str] = []

    def translate_opinion_source(
        session: Session,
        *,
        claim: ClaimedContentTranslationWork,
        source: OpinionSource,
        translation_service: ContentTranslationService,
    ) -> None:
        del session
        results = translation_service.translate_texts(
            texts=[source.content],
            source_language_code=source.source_language_code,
            target_language_code=claim.display_language_code.value,
            mime_type="text/html",
        )
        translated_texts.extend(result.translated_text for result in results)

    def mark_completed(
        session: Session,
        *,
        claim: ClaimedContentTranslationWork,
    ) -> None:
        del session, claim

    monkeypatch.setattr(translation_db, "_translate_opinion_source", translate_opinion_source)
    monkeypatch.setattr(translation_db, "_mark_completed", mark_completed)

    result = process_claimed_work(
        opinion_revision_session,
        claim=_opinion_claim(opinion_content_id=HISTORICAL_CONTENT_ID),
        translation_service=_translation_service(),
    )

    assert result == ProcessWorkResult(work_id=1, status="completed")
    assert translated_texts == ["[simulated es->en text/html] Historical statement"]


@pytest.mark.parametrize(
    "ineligible_source",
    [
        "missing_revision",
        "unreferenced_revision",
        "unactivated_snapshot",
        "deleted_opinion",
        "deleted_conversation",
        "importing_conversation",
    ],
)
def test_ineligible_opinion_revision_remains_missing_source(
    opinion_revision_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    ineligible_source: Literal[
        "missing_revision",
        "unreferenced_revision",
        "unactivated_snapshot",
        "deleted_opinion",
        "deleted_conversation",
        "importing_conversation",
    ],
) -> None:
    opinion_content_id = HISTORICAL_CONTENT_ID
    if ineligible_source == "missing_revision":
        opinion_content_id = 999
    elif ineligible_source == "unreferenced_revision":
        opinion_revision_session.execute(delete(AnalysisSnapshotOpinion))
    elif ineligible_source == "unactivated_snapshot":
        opinion_revision_session.execute(update(ConversationViewSnapshot).values(activated_at=None))
    elif ineligible_source == "deleted_opinion":
        opinion_revision_session.execute(
            update(Opinion).where(Opinion.id == OPINION_ID).values(current_content_id=None)
        )
    elif ineligible_source == "deleted_conversation":
        opinion_revision_session.execute(
            update(Conversation)
            .where(Conversation.id == CONVERSATION_ID)
            .values(current_content_id=None)
        )
    else:
        opinion_revision_session.execute(
            update(Conversation).where(Conversation.id == CONVERSATION_ID).values(is_importing=True)
        )

    marked_work_ids: list[int] = []

    def mark_missing_source(
        session: Session,
        *,
        claim: ClaimedContentTranslationWork,
    ) -> None:
        del session
        marked_work_ids.append(claim.id)

    monkeypatch.setattr(translation_db, "_mark_missing_source", mark_missing_source)

    result = process_claimed_work(
        opinion_revision_session,
        claim=_opinion_claim(opinion_content_id=opinion_content_id),
        translation_service=_translation_service(),
    )

    assert result == ProcessWorkResult(work_id=1, status="missing_source")
    assert marked_work_ids == [1]


def _opinion_claim(*, opinion_content_id: int) -> ClaimedContentTranslationWork:
    return ClaimedContentTranslationWork(
        id=1,
        conversation_id=CONVERSATION_ID,
        conversation_slug_id="conv1234",
        source_kind=ContentTranslationSourceKind.opinion,
        source_key=f"opinion_content:{opinion_content_id}",
        project_content_id=None,
        conversation_content_id=None,
        opinion_content_id=opinion_content_id,
        survey_question_content_id=None,
        survey_question_option_content_ids=None,
        ranking_item_content_id=None,
        display_language_code=DisplayLanguageCode.en,
        lease_token=uuid.uuid4(),
    )


def _translation_service() -> SimulatedTranslationService:
    return SimulatedTranslationService(
        mode=SimulatedTranslationMode.SUCCESS,
        retryable_failure_attempts=0,
    )
