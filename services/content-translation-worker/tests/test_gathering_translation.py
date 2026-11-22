from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import pytest
from sqlalchemy import create_engine, delete, select, update
from sqlalchemy.orm import Session

from content_translation_worker.db import prepare_claimed_work, publish_translation_bundle
from content_translation_worker.gathering_sources import (
    fetch_gathering_field_source,
    fetch_gathering_response_source,
    gathering_translation_targets,
)
from content_translation_worker.generated_models import (
    Base,
    ContentTranslationSourceKind,
    Conversation,
    ConversationContent,
    ConversationLanguageSettingsSource,
    ConversationTranslationTargetLanguage,
    ConversationType,
    DirectoryVisibility,
    DisplayLanguageCode,
    GatheringAnswer,
    GatheringAnswerTranslation,
    GatheringConfig,
    GatheringField,
    GatheringFieldTranslation,
    GatheringResponse,
    GatheringResponseContent,
    ParticipationMode,
    Project,
    ProjectContent,
    ProjectTranslationTargetLanguage,
    SpokenLanguageCode,
    User,
)
from content_translation_worker.generation import generate_translation_bundle
from content_translation_worker.models import (
    ClaimedContentTranslationWork,
    ContentRevision,
    GatheringFieldRevision,
    GatheringResponseTranslationBundle,
    PreparedContentTranslation,
    ProcessWorkResult,
)
from content_translation_worker.translation import (
    ContentTranslationProviderError,
    ContentTranslationResult,
)

AUTHOR_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")
FIELD_IDS = tuple(uuid.UUID(int=index) for index in range(1, 4))

if TYPE_CHECKING:
    from collections.abc import Iterator


@pytest.fixture
def gathering_session() -> Iterator[Session]:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            Base.metadata.tables[model.__tablename__]
            for model in (
                User,
                Project,
                Conversation,
                ConversationContent,
                ConversationTranslationTargetLanguage,
                ProjectContent,
                ProjectTranslationTargetLanguage,
                GatheringConfig,
                GatheringField,
                GatheringResponse,
                GatheringResponseContent,
                GatheringAnswer,
                GatheringFieldTranslation,
                GatheringAnswerTranslation,
            )
        ],
    )
    now = datetime.now(UTC)
    with Session(engine) as session:
        session.add(
            User(
                id=AUTHOR_ID,
                polis_participant_id=1,
                username="author",
                is_site_moderator=False,
                is_site_org_admin=False,
                is_imported=False,
                is_deleted=False,
                active_conversation_count=0,
                total_conversation_count=0,
                total_opinion_count=0,
                created_at=now,
                updated_at=now,
            )
        )
        session.add(
            Project(
                id=1,
                slug="project",
                title="Project",
                directory_visibility=DirectoryVisibility.unlisted,
                participation_mode=ParticipationMode.guest,
                created_at=now,
                updated_at=now,
            )
        )
        session.add(
            GatheringConfig(
                id=1,
                gathering_mode="new",
                allow_new_responses=True,
                response_visibility="everyone",
            )
        )
        session.add(
            Conversation(
                id=1,
                slug_id="gather01",
                project_id=1,
                current_content_id=1,
                gathering_config_id=1,
                is_importing=False,
                dynamic_translation_enabled=True,
                language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                participation_mode=ParticipationMode.guest,
                conversation_type=ConversationType.gathering,
                created_at=now,
                updated_at=now,
                last_reacted_at=now,
            )
        )
        session.add(
            ConversationContent(
                id=1,
                conversation_id=1,
                title="Gathering",
                source_language_code=SpokenLanguageCode.en,
                created_at=now,
            )
        )
        session.add(
            ConversationTranslationTargetLanguage(
                id=1,
                conversation_id=1,
                language_code=DisplayLanguageCode.fr,
                created_at=now,
            )
        )
        for position, field_id in enumerate(FIELD_IDS, start=1):
            session.add(
                GatheringField(
                    id=field_id,
                    config_id=1,
                    position=position,
                    label="Proposal",
                    required=position == 1,
                    character_limit=500,
                )
            )
        session.add(
            GatheringResponse(
                id=1,
                slug_id="response",
                conversation_id=1,
                config_id=1,
                author_id=AUTHOR_ID,
                is_seed=False,
                current_content_id=1,
                created_at=now,
            )
        )
        session.add(
            GatheringResponseContent(
                id=1,
                response_id=1,
                config_id=1,
                public_id=uuid.uuid4(),
                created_at=now,
            )
        )
        for field_id, value in zip(FIELD_IDS, ("Hello", "Hola", ""), strict=True):
            session.add(
                GatheringAnswer(
                    config_id=1,
                    content_id=1,
                    field_id=field_id,
                    value=value,
                )
            )
        session.commit()
        yield session
    engine.dispose()


class RecordingTranslationService:
    def __init__(self) -> None:
        self.calls: list[tuple[list[str], str | None, str]] = []

    def translate_texts(
        self,
        *,
        texts: list[str],
        source_language_code: str | None,
        target_language_code: str,
        mime_type: str,
    ) -> list[ContentTranslationResult]:
        self.calls.append((texts, source_language_code, mime_type))
        return [
            ContentTranslationResult(
                translated_text=f"{target_language_code}:{value}",
                source_raw_language_code="es" if value == "Hola" else "en",
                source_language_provider="google_translate",
            )
            for value in texts
        ]


def test_mixed_language_answers_keep_field_identity_order_and_blanks(
    gathering_session: Session,
) -> None:
    source = fetch_gathering_response_source(gathering_session, content_id=1)
    assert source is not None
    service = RecordingTranslationService()
    claim = ClaimedContentTranslationWork(
        source_revision=ContentRevision(
            kind=ContentTranslationSourceKind.gathering_response,
            content_id=1,
        ),
        conversation_slug_id="gather01",
        display_language_code=DisplayLanguageCode.fr,
        lease_token=uuid.uuid4(),
        work_ids=(1,),
    )
    bundle = generate_translation_bundle(
        prepared=PreparedContentTranslation(claim=claim, source=source),
        translation_service=service,
        check_active=lambda: None,
    )
    assert isinstance(bundle, GatheringResponseTranslationBundle)
    assert [answer.field_id for answer in bundle.translations[0].answers] == list(FIELD_IDS)
    assert [answer.result.translated_text for answer in bundle.translations[0].answers] == [
        "fr:Hello",
        "fr:Hola",
        "",
    ]
    assert service.calls == [(["Hello"], None, "text/plain"), (["Hola"], None, "text/plain")]


@pytest.mark.parametrize(
    "exclusion",
    [
        "private",
        "hidden",
        "deleted",
        "account_hidden",
        "deleted_author",
        "restricted_author",
        "disabled",
    ],
)
def test_ineligible_responses_cannot_be_prepared_or_published(
    gathering_session: Session,
    exclusion: str,
) -> None:
    session = gathering_session
    assert fetch_gathering_response_source(session, content_id=1) is not None
    if exclusion == "private":
        session.execute(update(GatheringConfig).values(response_visibility="facilitators"))
    elif exclusion == "hidden":
        session.execute(update(GatheringResponse).values(moderation="hide"))
    elif exclusion == "deleted":
        session.execute(update(GatheringResponse).values(deleted_at=datetime.now(UTC)))
    elif exclusion == "account_hidden":
        session.execute(update(GatheringResponse).values(account_hidden_at=datetime.now(UTC)))
    elif exclusion == "deleted_author":
        session.execute(update(User).values(is_deleted=True))
    elif exclusion == "restricted_author":
        session.execute(update(User).values(auth_restricted_at=datetime.now(UTC)))
    else:
        session.execute(update(Conversation).values(dynamic_translation_enabled=False))
    session.flush()
    assert fetch_gathering_response_source(session, content_id=1) is None


def test_field_identity_is_the_frozen_label_revision(gathering_session: Session) -> None:
    field = fetch_gathering_field_source(gathering_session, field_id=FIELD_IDS[0])
    assert field is not None
    assert field.content_id == FIELD_IDS[0]
    assert field.text == "Proposal"
    assert fetch_gathering_field_source(gathering_session, field_id=uuid.uuid4()) is None


def test_moved_but_visible_responses_remain_eligible(gathering_session: Session) -> None:
    gathering_session.execute(update(GatheringResponse).values(moderation="move"))
    assert fetch_gathering_response_source(gathering_session, content_id=1) is not None


def test_target_revocation_and_project_inheritance_are_rechecked(
    gathering_session: Session,
) -> None:
    session = gathering_session
    assert gathering_translation_targets(session, conversation_slug_id="gather01") == {
        DisplayLanguageCode.en,
        DisplayLanguageCode.fr,
    }
    session.execute(
        update(ConversationTranslationTargetLanguage).values(deleted_at=datetime.now(UTC))
    )
    assert gathering_translation_targets(session, conversation_slug_id="gather01") == {
        DisplayLanguageCode.en
    }
    session.execute(update(Conversation).values(language_settings_source="project_inherited"))
    session.execute(update(Project).values(dynamic_translation_enabled=True))
    session.add(
        ProjectTranslationTargetLanguage(
            project_id=1,
            language_code=DisplayLanguageCode.es,
            created_at=datetime.now(UTC),
        )
    )
    session.flush()
    assert gathering_translation_targets(session, conversation_slug_id="gather01") == {
        DisplayLanguageCode.en,
        DisplayLanguageCode.es,
    }
    session.execute(update(Project).values(dynamic_translation_enabled=False))
    assert gathering_translation_targets(session, conversation_slug_id="gather01") == frozenset()


def test_author_rebinding_cannot_admit_an_unlocked_replacement(
    gathering_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    replacement_id = uuid.UUID("00000000-0000-4000-8000-000000000002")
    now = datetime.now(UTC)
    gathering_session.add(
        User(
            id=replacement_id,
            polis_participant_id=2,
            username="replacement",
            is_site_moderator=False,
            is_site_org_admin=False,
            is_imported=False,
            is_deleted=False,
            active_conversation_count=0,
            total_conversation_count=0,
            total_opinion_count=0,
            created_at=now,
            updated_at=now,
        )
    )
    gathering_session.flush()

    def rebind_after_observation(session: Session, *, conversation_id: int) -> bool:
        session.execute(
            update(GatheringResponse)
            .where(
                GatheringResponse.conversation_id == conversation_id,
            )
            .values(author_id=replacement_id)
        )
        return True

    monkeypatch.setattr(
        "content_translation_worker.gathering_sources._lock_conversation",
        rebind_after_observation,
    )
    assert fetch_gathering_response_source(gathering_session, content_id=1) is None


def test_incomplete_saved_versions_are_not_translation_sources(gathering_session: Session) -> None:
    gathering_session.execute(
        delete(GatheringAnswer).where(GatheringAnswer.field_id == FIELD_IDS[1])
    )
    assert fetch_gathering_response_source(gathering_session, content_id=1) is None


def test_preparation_rechecks_work_parent_and_target(
    gathering_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def ignore_claim_write(_session: Session, *, claim: ClaimedContentTranslationWork) -> None:
        del claim

    monkeypatch.setattr("content_translation_worker.db.lock_active_claim", ignore_claim_write)
    monkeypatch.setattr("content_translation_worker.db._mark_missing_source", ignore_claim_write)
    claim = ClaimedContentTranslationWork(
        source_revision=GatheringFieldRevision(content_id=FIELD_IDS[0]),
        conversation_slug_id="gather01",
        display_language_code=DisplayLanguageCode.fr,
        lease_token=uuid.uuid4(),
        work_ids=(1,),
    )
    assert isinstance(
        prepare_claimed_work(gathering_session, claim=claim), PreparedContentTranslation
    )
    gathering_session.execute(
        update(ConversationTranslationTargetLanguage).values(deleted_at=datetime.now(UTC))
    )
    result = prepare_claimed_work(gathering_session, claim=claim)
    assert isinstance(result, ProcessWorkResult)
    assert result.status == "missing_source"
    wrong_parent = ClaimedContentTranslationWork(
        source_revision=claim.source_revision,
        conversation_slug_id="another1",
        display_language_code=claim.display_language_code,
        lease_token=claim.lease_token,
        work_ids=claim.work_ids,
    )
    result = prepare_claimed_work(gathering_session, claim=wrong_parent)
    assert isinstance(result, ProcessWorkResult)
    assert result.status == "missing_source"


def test_publication_takes_lifecycle_locks_before_the_work_lease(
    gathering_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    events: list[str] = []

    def record_parent(_session: Session, *, conversation_id: int) -> bool:
        events.append("conversation")
        return conversation_id == 1

    def record_lease(_session: Session, *, claim: ClaimedContentTranslationWork) -> None:
        events.append(f"lease:{claim.id}")

    def ignore_completion(_session: Session, *, claim: ClaimedContentTranslationWork) -> None:
        del claim

    monkeypatch.setattr(
        "content_translation_worker.gathering_sources._lock_conversation", record_parent
    )
    monkeypatch.setattr("content_translation_worker.db.lock_active_claim", record_lease)
    monkeypatch.setattr("content_translation_worker.db._mark_completed", ignore_completion)
    claim = ClaimedContentTranslationWork(
        source_revision=GatheringFieldRevision(content_id=FIELD_IDS[0]),
        conversation_slug_id="gather01",
        display_language_code=DisplayLanguageCode.fr,
        lease_token=uuid.uuid4(),
        work_ids=(1,),
    )
    prepared = prepare_claimed_work(gathering_session, claim=claim)
    assert isinstance(prepared, PreparedContentTranslation)
    bundle = generate_translation_bundle(
        prepared=prepared,
        translation_service=RecordingTranslationService(),
        check_active=lambda: None,
    )
    result = publish_translation_bundle(gathering_session, claim=claim, bundle=bundle)
    assert result.status == "completed"
    assert events == ["conversation", "lease:1", "conversation", "lease:1"]
    stored = gathering_session.scalar(select(GatheringFieldTranslation.translated_label))
    assert stored == "fr:Proposal"


@pytest.mark.parametrize("kind", ["field", "response"])
def test_nonblank_gathering_text_cannot_publish_an_empty_provider_translation(
    gathering_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    kind: str,
) -> None:
    service = RecordingTranslationService()

    def empty_translation(
        *,
        texts: list[str],
        source_language_code: str | None,
        target_language_code: str,
        mime_type: str,
    ) -> list[ContentTranslationResult]:
        del source_language_code, target_language_code, mime_type
        return [
            ContentTranslationResult(
                translated_text="",
                source_raw_language_code="en",
                source_language_provider="google_translate",
            )
            for _ in texts
        ]

    monkeypatch.setattr(service, "translate_texts", empty_translation)
    if kind == "field":
        source = fetch_gathering_field_source(gathering_session, field_id=FIELD_IDS[0])
        revision = GatheringFieldRevision(content_id=FIELD_IDS[0])
    else:
        source = fetch_gathering_response_source(gathering_session, content_id=1)
        revision = ContentRevision(
            kind=ContentTranslationSourceKind.gathering_response, content_id=1
        )
    assert source is not None
    claim = ClaimedContentTranslationWork(
        source_revision=revision,
        conversation_slug_id="gather01",
        display_language_code=DisplayLanguageCode.fr,
        lease_token=uuid.uuid4(),
        work_ids=(1,),
    )
    with pytest.raises(ContentTranslationProviderError, match="empty"):
        generate_translation_bundle(
            prepared=PreparedContentTranslation(claim=claim, source=source),
            translation_service=service,
            check_active=lambda: None,
        )
