from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Literal

import pytest
from sqlalchemy import create_engine, delete, text, update
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
    ContentTranslationWork,
    ContentTranslationWorkStatus,
    Conversation,
    ConversationLanguageSettingsSource,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotReasonEnum,
    DisplayLanguageCode,
    LanguageDetectionProvider,
    ModerationReasonEnum,
    Opinion,
    OpinionContent,
    OpinionModeration,
    OpinionModerationAction,
    ParticipationMode,
    SpokenLanguageCode,
    User,
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
AUTHOR_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")


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
            Conversation.metadata.tables["opinion_moderation"],
            Conversation.metadata.tables["user"],
        ],
    )
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE content_translation_work (
                    id INTEGER PRIMARY KEY,
                    conversation_id INTEGER,
                    source_kind TEXT NOT NULL,
                    project_content_id INTEGER,
                    conversation_content_id INTEGER,
                    opinion_content_id INTEGER,
                    survey_question_content_id INTEGER,
                    survey_question_option_content_ids TEXT,
                    ranking_item_content_id INTEGER,
                    display_language_code TEXT NOT NULL,
                    status TEXT NOT NULL,
                    priority_rank INTEGER NOT NULL,
                    attempt_count INTEGER NOT NULL,
                    lease_owner TEXT,
                    lease_token TEXT,
                    lease_expires_at DATETIME,
                    last_error_code TEXT,
                    last_error_message TEXT,
                    requested_at DATETIME,
                    completed_at DATETIME,
                    failed_at DATETIME,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
        )
    now = datetime.now(UTC)
    with Session(engine) as session:
        session.add(
            User(
                id=AUTHOR_ID,
                polis_participant_id=1,
                username="opinion-author",
                is_site_moderator=False,
                is_site_org_admin=False,
                is_imported=False,
                is_deleted=False,
                deleted_at=None,
                active_conversation_count=0,
                total_conversation_count=0,
                total_opinion_count=1,
                created_at=now,
                updated_at=now,
            )
        )
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
                author_id=AUTHOR_ID,
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


@pytest.mark.parametrize("ineligible_source", ["hidden", "deleted_author"])
def test_rejects_ineligible_opinion_source(
    opinion_revision_session: Session,
    ineligible_source: Literal["hidden", "deleted_author"],
) -> None:
    if ineligible_source == "hidden":
        opinion_revision_session.add(
            OpinionModeration(
                opinion_id=OPINION_ID,
                author_id=None,
                moderation_action=OpinionModerationAction.hide,
                moderation_reason=ModerationReasonEnum.spam,
                moderation_explanation=None,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
                deleted_at=None,
            )
        )
    else:
        opinion_revision_session.execute(
            update(User).where(User.id == AUTHOR_ID).values(is_deleted=True)
        )
    opinion_revision_session.flush()
    claim = _opinion_claim(opinion_content_id=HISTORICAL_CONTENT_ID)
    _add_claimed_work(opinion_revision_session, claim=claim)

    result = process_claimed_work(
        opinion_revision_session,
        claim=claim,
        translation_service=_translation_service(),
    )

    assert result == ProcessWorkResult(work_id=1, status="ineligible_source")
    work = opinion_revision_session.get(ContentTranslationWork, claim.id)
    assert work is not None
    assert work.status == ContentTranslationWorkStatus.failed
    assert work.last_error_code == "ineligible_source"
    expected_message = (
        "Opinion is hidden"
        if ineligible_source == "hidden"
        else "Opinion author account is deleted"
    )
    assert work.last_error_message == expected_message
    assert work.lease_owner is None
    assert work.lease_token is None
    assert work.lease_expires_at is None


def test_rechecks_hide_moderation_immediately_before_translation(
    opinion_revision_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider_called = False

    def hide_before_translation(
        session: Session,
        *,
        claim: ClaimedContentTranslationWork,
        source: OpinionSource,
    ) -> bool:
        del claim, source
        session.add(
            OpinionModeration(
                opinion_id=OPINION_ID,
                author_id=None,
                moderation_action=OpinionModerationAction.hide,
                moderation_reason=ModerationReasonEnum.spam,
                moderation_explanation=None,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
                deleted_at=None,
            )
        )
        session.flush()
        return False

    def translate_opinion_source(
        session: Session,
        *,
        claim: ClaimedContentTranslationWork,
        source: OpinionSource,
        translation_service: ContentTranslationService,
    ) -> None:
        nonlocal provider_called
        del session, claim, source, translation_service
        provider_called = True

    monkeypatch.setattr(
        translation_db,
        "_has_fresh_opinion_translation",
        hide_before_translation,
    )
    monkeypatch.setattr(translation_db, "_translate_opinion_source", translate_opinion_source)
    claim = _opinion_claim(opinion_content_id=HISTORICAL_CONTENT_ID)
    _add_claimed_work(opinion_revision_session, claim=claim)

    result = process_claimed_work(
        opinion_revision_session,
        claim=claim,
        translation_service=_translation_service(),
    )

    assert result == ProcessWorkResult(work_id=1, status="ineligible_source")
    assert provider_called is False
    work = opinion_revision_session.get(ContentTranslationWork, claim.id)
    assert work is not None
    assert work.status == ContentTranslationWorkStatus.failed
    assert work.last_error_code == "ineligible_source"
    assert work.last_error_message == "Opinion is hidden"


def _add_claimed_work(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
) -> None:
    now = datetime.now(UTC)
    session.add(
        ContentTranslationWork(
            id=claim.id,
            conversation_id=claim.conversation_id,
            source_kind=claim.source_kind,
            project_content_id=claim.project_content_id,
            conversation_content_id=claim.conversation_content_id,
            opinion_content_id=claim.opinion_content_id,
            survey_question_content_id=claim.survey_question_content_id,
            survey_question_option_content_ids=claim.survey_question_option_content_ids,
            ranking_item_content_id=claim.ranking_item_content_id,
            display_language_code=claim.display_language_code,
            status=ContentTranslationWorkStatus.running,
            priority_rank=0,
            attempt_count=1,
            lease_owner="worker-1",
            lease_token=claim.lease_token,
            lease_expires_at=now + timedelta(minutes=1),
            requested_at=now,
            created_at=now,
            updated_at=now,
        )
    )
    session.flush()


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
