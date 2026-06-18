from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any, Literal

import bleach
from sqlalchemy import and_, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from content_translation_worker.events import build_content_translation_event_data
from content_translation_worker.generated_models import (
    ContentTranslationSourceKind,
    ContentTranslationWork,
    ContentTranslationWorkStatus,
    Conversation,
    ConversationContent,
    ConversationContentTranslation,
    DisplayLanguageCode,
    Opinion,
    OpinionContent,
    OpinionContentTranslation,
    RealtimeEventOutbox,
    RealtimeEventOutboxTopic,
    SurveyQuestion,
    SurveyQuestionContent,
    SurveyQuestionContentTranslation,
    SurveyQuestionOption,
    SurveyQuestionOptionContent,
    SurveyQuestionOptionContentTranslation,
)
from content_translation_worker.translation import (
    ContentTranslationProviderError,
    ContentTranslationService,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

SUPPORTED_SOURCE_KINDS = {
    ContentTranslationSourceKind.conversation,
    ContentTranslationSourceKind.opinion,
    ContentTranslationSourceKind.survey_question,
}
ALLOWED_TRANSLATED_HTML_TAGS = frozenset(
    {"b", "strong", "i", "em", "strike", "s", "u", "p", "br", "ul", "ol", "li"}
)


def create_lease_token() -> uuid.UUID:
    return uuid.uuid4()


def sanitize_translated_html(value: str) -> str:
    return bleach.clean(
        value,
        tags=ALLOWED_TRANSLATED_HTML_TAGS,
        attributes={},
        strip=True,
    )


@dataclass(frozen=True)
class ClaimedContentTranslationWork:
    id: int
    conversation_id: int
    source_kind: ContentTranslationSourceKind
    conversation_content_id: int | None
    opinion_content_id: int | None
    survey_question_content_id: int | None
    survey_question_option_content_ids: list[int] | None
    display_language_code: DisplayLanguageCode
    lease_token: uuid.UUID


@dataclass(frozen=True)
class ProcessWorkResult:
    work_id: int
    status: Literal["completed", "failed", "missing_source"]


def recover_expired_leases(session: Session) -> int:
    expired_ids = list(
        session.scalars(
            select(ContentTranslationWork.id).where(
                and_(
                    ContentTranslationWork.status == ContentTranslationWorkStatus.running,
                    ContentTranslationWork.lease_expires_at.is_not(None),
                    ContentTranslationWork.lease_expires_at < func.now(),
                )
            )
        )
    )
    if not expired_ids:
        return 0

    session.execute(
        update(ContentTranslationWork)
        .where(ContentTranslationWork.id.in_(expired_ids))
        .values(
            status=ContentTranslationWorkStatus.pending,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            updated_at=func.now(),
        )
    )
    return len(expired_ids)


def claim_content_translation_work_batch(
    session: Session,
    *,
    worker_id: str,
    work_ids: list[int] | None,
    batch_size: int,
    lease_ttl_seconds: int,
) -> list[ClaimedContentTranslationWork]:
    lease_expires_at = datetime.now(UTC) + timedelta(seconds=lease_ttl_seconds)
    conditions = [
        ContentTranslationWork.status == ContentTranslationWorkStatus.pending,
        ContentTranslationWork.source_kind.in_(SUPPORTED_SOURCE_KINDS),
    ]
    if work_ids is not None:
        if not work_ids:
            return []
        conditions.append(ContentTranslationWork.id.in_(work_ids))

    rows = list(
        session.scalars(
            select(ContentTranslationWork)
            .where(and_(*conditions))
            .order_by(
                ContentTranslationWork.priority_rank.asc(),
                ContentTranslationWork.updated_at.asc(),
                ContentTranslationWork.id.asc(),
            )
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        )
    )

    claims: list[ClaimedContentTranslationWork] = []
    for row in rows:
        lease_token = create_lease_token()
        row.status = ContentTranslationWorkStatus.running
        row.attempt_count += 1
        row.lease_owner = worker_id
        row.lease_token = lease_token
        row.lease_expires_at = lease_expires_at
        row.updated_at = datetime.now(UTC)
        claims.append(
            ClaimedContentTranslationWork(
                id=row.id,
                conversation_id=row.conversation_id,
                source_kind=row.source_kind,
                conversation_content_id=row.conversation_content_id,
                opinion_content_id=row.opinion_content_id,
                survey_question_content_id=row.survey_question_content_id,
                survey_question_option_content_ids=row.survey_question_option_content_ids,
                display_language_code=row.display_language_code,
                lease_token=lease_token,
            )
        )
    return claims


def process_claimed_work(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    translation_service: ContentTranslationService,
) -> ProcessWorkResult:
    try:
        if claim.source_kind == ContentTranslationSourceKind.conversation:
            if claim.conversation_content_id is None:
                _mark_failed(
                    session,
                    claim=claim,
                    error_code="invalid_source",
                    error_message="conversation work is missing conversation_content_id",
                )
                return ProcessWorkResult(work_id=claim.id, status="failed")
            source = _fetch_conversation_source(
                session,
                conversation_content_id=claim.conversation_content_id,
            )
            if source is None:
                _mark_missing_source(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="missing_source")
            try:
                _translate_conversation_source(
                    session,
                    claim=claim,
                    source=source,
                    translation_service=translation_service,
                )
            except ContentTranslationProviderError as error:
                _mark_failed(
                    session,
                    claim=claim,
                    error_code=error.__class__.__name__,
                    error_message=str(error),
                )
                _insert_conversation_translation_event(
                    session,
                    source=source,
                    target_language_code=claim.display_language_code.value,
                    status="failed",
                )
                return ProcessWorkResult(work_id=claim.id, status="failed")
            _mark_completed(session, claim=claim)
            return ProcessWorkResult(work_id=claim.id, status="completed")

        if claim.source_kind == ContentTranslationSourceKind.survey_question:
            if (
                claim.survey_question_content_id is None
                or claim.survey_question_option_content_ids is None
            ):
                _mark_failed(
                    session,
                    claim=claim,
                    error_code="invalid_source",
                    error_message=("survey question work is missing survey source content ids"),
                )
                return ProcessWorkResult(work_id=claim.id, status="failed")
            source = _fetch_survey_question_source(
                session,
                survey_question_content_id=claim.survey_question_content_id,
                survey_question_option_content_ids=claim.survey_question_option_content_ids,
            )
            if source is None:
                _mark_missing_source(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="missing_source")
            try:
                _translate_survey_question_source(
                    session,
                    claim=claim,
                    source=source,
                    translation_service=translation_service,
                )
            except ContentTranslationProviderError as error:
                _mark_failed(
                    session,
                    claim=claim,
                    error_code=error.__class__.__name__,
                    error_message=str(error),
                )
                _insert_survey_question_translation_event(
                    session,
                    source=source,
                    target_language_code=claim.display_language_code.value,
                    status="failed",
                )
                return ProcessWorkResult(work_id=claim.id, status="failed")
            _mark_completed(session, claim=claim)
            return ProcessWorkResult(work_id=claim.id, status="completed")

        if claim.opinion_content_id is None:
            _mark_failed(
                session,
                claim=claim,
                error_code="invalid_source",
                error_message="opinion work is missing opinion_content_id",
            )
            return ProcessWorkResult(work_id=claim.id, status="failed")
        source = _fetch_opinion_source(session, opinion_content_id=claim.opinion_content_id)
        if source is None:
            _mark_missing_source(session, claim=claim)
            return ProcessWorkResult(work_id=claim.id, status="missing_source")
        try:
            _translate_opinion_source(
                session,
                claim=claim,
                source=source,
                translation_service=translation_service,
            )
        except ContentTranslationProviderError as error:
            _mark_failed(
                session,
                claim=claim,
                error_code=error.__class__.__name__,
                error_message=str(error),
            )
            _insert_opinion_translation_event(
                session,
                source=source,
                target_language_code=claim.display_language_code.value,
                status="failed",
            )
            return ProcessWorkResult(work_id=claim.id, status="failed")
        _mark_completed(session, claim=claim)
        return ProcessWorkResult(work_id=claim.id, status="completed")
    except Exception as error:
        _mark_failed(
            session,
            claim=claim,
            error_code=error.__class__.__name__,
            error_message=str(error),
        )
        return ProcessWorkResult(work_id=claim.id, status="failed")


@dataclass(frozen=True)
class ConversationSource:
    conversation_slug_id: str
    content_id: int
    title: str
    body: str | None
    source_language_code: str | None


@dataclass(frozen=True)
class OpinionSource:
    conversation_slug_id: str
    opinion_slug_id: str
    content_id: int
    content: str
    source_language_code: str | None


@dataclass(frozen=True)
class SurveyQuestionOptionSource:
    option_slug_id: str
    content_id: int
    option_text: str
    source_language_code: str | None


@dataclass(frozen=True)
class SurveyQuestionSource:
    conversation_slug_id: str
    question_slug_id: str
    content_id: int
    question_text: str
    source_language_code: str | None
    options: list[SurveyQuestionOptionSource]


def _fetch_conversation_source(
    session: Session,
    *,
    conversation_content_id: int,
) -> ConversationSource | None:
    row = session.execute(
        select(
            Conversation.slug_id,
            ConversationContent.id,
            ConversationContent.title,
            ConversationContent.body,
            ConversationContent.source_language_code,
        )
        .join(Conversation, Conversation.id == ConversationContent.conversation_id)
        .where(
            and_(
                ConversationContent.id == conversation_content_id,
                Conversation.current_content_id == ConversationContent.id,
            )
        )
        .limit(1)
    ).one_or_none()
    if row is None:
        return None
    return ConversationSource(
        conversation_slug_id=row.slug_id,
        content_id=row.id,
        title=row.title,
        body=row.body,
        source_language_code=row.source_language_code,
    )


def _fetch_opinion_source(
    session: Session,
    *,
    opinion_content_id: int,
) -> OpinionSource | None:
    row = session.execute(
        select(
            Conversation.slug_id.label("conversation_slug_id"),
            Opinion.slug_id.label("opinion_slug_id"),
            OpinionContent.id,
            OpinionContent.content,
            OpinionContent.source_language_code,
        )
        .join(Opinion, Opinion.id == OpinionContent.opinion_id)
        .join(Conversation, Conversation.id == Opinion.conversation_id)
        .where(
            and_(
                OpinionContent.id == opinion_content_id,
                Opinion.current_content_id == OpinionContent.id,
            )
        )
        .limit(1)
    ).one_or_none()
    if row is None:
        return None
    return OpinionSource(
        conversation_slug_id=row.conversation_slug_id,
        opinion_slug_id=row.opinion_slug_id,
        content_id=row.id,
        content=row.content,
        source_language_code=row.source_language_code,
    )


def _fetch_survey_question_source(
    session: Session,
    *,
    survey_question_content_id: int,
    survey_question_option_content_ids: list[int],
) -> SurveyQuestionSource | None:
    row = session.execute(
        select(
            Conversation.slug_id.label("conversation_slug_id"),
            SurveyQuestion.slug_id.label("question_slug_id"),
            SurveyQuestionContent.id,
            SurveyQuestionContent.question_text,
            SurveyQuestionContent.source_language_code,
            SurveyQuestion.id.label("question_id"),
        )
        .join(SurveyQuestion, SurveyQuestion.id == SurveyQuestionContent.survey_question_id)
        .join(Conversation, Conversation.id == SurveyQuestion.conversation_id)
        .where(
            and_(
                SurveyQuestionContent.id == survey_question_content_id,
                SurveyQuestion.current_content_id == SurveyQuestionContent.id,
            )
        )
        .limit(1)
    ).one_or_none()
    if row is None:
        return None

    option_rows = session.execute(
        select(
            SurveyQuestionOption.slug_id,
            SurveyQuestionOptionContent.id,
            SurveyQuestionOptionContent.option_text,
            SurveyQuestionOptionContent.source_language_code,
        )
        .join(
            SurveyQuestionOptionContent,
            SurveyQuestionOptionContent.id == SurveyQuestionOption.current_content_id,
        )
        .where(SurveyQuestionOption.survey_question_id == row.question_id)
        .order_by(SurveyQuestionOption.display_order.asc())
    ).all()
    current_option_content_ids = [option.id for option in option_rows]
    if current_option_content_ids != survey_question_option_content_ids:
        return None

    return SurveyQuestionSource(
        conversation_slug_id=row.conversation_slug_id,
        question_slug_id=row.question_slug_id,
        content_id=row.id,
        question_text=row.question_text,
        source_language_code=row.source_language_code,
        options=[
            SurveyQuestionOptionSource(
                option_slug_id=option.slug_id,
                content_id=option.id,
                option_text=option.option_text,
                source_language_code=option.source_language_code,
            )
            for option in option_rows
        ],
    )


def _translate_conversation_source(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: ConversationSource,
    translation_service: ContentTranslationService,
) -> None:
    title = translation_service.translate_texts(
        texts=[source.title],
        source_language_code=source.source_language_code,
        target_language_code=claim.display_language_code.value,
        mime_type="text/plain",
    )[0]
    body = None
    if source.body is not None:
        body = translation_service.translate_texts(
            texts=[source.body],
            source_language_code=source.source_language_code,
            target_language_code=claim.display_language_code.value,
            mime_type="text/html",
        )[0]
        body = sanitize_translated_html(body)

    stmt = pg_insert(ConversationContentTranslation).values(
        conversation_content_id=source.content_id,
        display_language_code=claim.display_language_code,
        translated_title=title,
        translated_body=body,
        created_at=func.now(),
        updated_at=func.now(),
    )
    session.execute(
        stmt.on_conflict_do_update(
            index_elements=[
                ConversationContentTranslation.conversation_content_id,
                ConversationContentTranslation.display_language_code,
            ],
            set_={
                "translated_title": title,
                "translated_body": body,
                "updated_at": func.now(),
            },
        )
    )
    _insert_conversation_translation_event(
        session,
        source=source,
        target_language_code=claim.display_language_code.value,
        status="completed",
    )


def _translate_opinion_source(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: OpinionSource,
    translation_service: ContentTranslationService,
) -> None:
    translated_content = translation_service.translate_texts(
        texts=[source.content],
        source_language_code=source.source_language_code,
        target_language_code=claim.display_language_code.value,
        mime_type="text/html",
    )[0]
    translated_content = sanitize_translated_html(translated_content)
    stmt = pg_insert(OpinionContentTranslation).values(
        opinion_content_id=source.content_id,
        display_language_code=claim.display_language_code,
        translated_content=translated_content,
        created_at=func.now(),
        updated_at=func.now(),
    )
    session.execute(
        stmt.on_conflict_do_update(
            index_elements=[
                OpinionContentTranslation.opinion_content_id,
                OpinionContentTranslation.display_language_code,
            ],
            set_={"translated_content": translated_content, "updated_at": func.now()},
        )
    )
    _insert_opinion_translation_event(
        session,
        source=source,
        target_language_code=claim.display_language_code.value,
        status="completed",
    )


def _translate_survey_question_source(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: SurveyQuestionSource,
    translation_service: ContentTranslationService,
) -> None:
    translated_question_text = translation_service.translate_texts(
        texts=[source.question_text],
        source_language_code=source.source_language_code,
        target_language_code=claim.display_language_code.value,
        mime_type="text/plain",
    )[0]
    question_stmt = pg_insert(SurveyQuestionContentTranslation).values(
        survey_question_content_id=source.content_id,
        display_language_code=claim.display_language_code,
        translated_question_text=translated_question_text,
        created_at=func.now(),
        updated_at=func.now(),
    )
    session.execute(
        question_stmt.on_conflict_do_update(
            index_elements=[
                SurveyQuestionContentTranslation.survey_question_content_id,
                SurveyQuestionContentTranslation.display_language_code,
            ],
            set_={
                "translated_question_text": translated_question_text,
                "updated_at": func.now(),
            },
        )
    )

    for option in source.options:
        translated_option_text = translation_service.translate_texts(
            texts=[option.option_text],
            source_language_code=option.source_language_code,
            target_language_code=claim.display_language_code.value,
            mime_type="text/plain",
        )[0]
        option_stmt = pg_insert(SurveyQuestionOptionContentTranslation).values(
            survey_question_option_content_id=option.content_id,
            display_language_code=claim.display_language_code,
            translated_option_text=translated_option_text,
            created_at=func.now(),
            updated_at=func.now(),
        )
        session.execute(
            option_stmt.on_conflict_do_update(
                index_elements=[
                    SurveyQuestionOptionContentTranslation.survey_question_option_content_id,
                    SurveyQuestionOptionContentTranslation.display_language_code,
                ],
                set_={
                    "translated_option_text": translated_option_text,
                    "updated_at": func.now(),
                },
            )
        )

    _insert_survey_question_translation_event(
        session,
        source=source,
        target_language_code=claim.display_language_code.value,
        status="completed",
    )


def _insert_conversation_translation_event(
    session: Session,
    *,
    source: ConversationSource,
    target_language_code: str,
    status: Literal["completed", "failed"],
) -> None:
    _insert_translation_event(
        session,
        subject={"kind": "conversation", "conversationSlugId": source.conversation_slug_id},
        conversation_slug_id=source.conversation_slug_id,
        target_language_code=target_language_code,
        status=status,
        source_version=f"conversation_content:{source.content_id}",
    )


def _insert_opinion_translation_event(
    session: Session,
    *,
    source: OpinionSource,
    target_language_code: str,
    status: Literal["completed", "failed"],
) -> None:
    _insert_translation_event(
        session,
        subject={
            "kind": "opinion",
            "conversationSlugId": source.conversation_slug_id,
            "opinionSlugId": source.opinion_slug_id,
        },
        conversation_slug_id=source.conversation_slug_id,
        target_language_code=target_language_code,
        status=status,
        source_version=f"opinion_content:{source.content_id}",
    )


def _insert_survey_question_translation_event(
    session: Session,
    *,
    source: SurveyQuestionSource,
    target_language_code: str,
    status: Literal["completed", "failed"],
) -> None:
    option_content_ids = ",".join(str(option.content_id) for option in source.options)
    _insert_translation_event(
        session,
        subject={
            "kind": "survey_question",
            "conversationSlugId": source.conversation_slug_id,
            "questionSlugId": source.question_slug_id,
        },
        conversation_slug_id=source.conversation_slug_id,
        target_language_code=target_language_code,
        status=status,
        source_version=(
            f"survey_question_content:{source.content_id}:option_content:{option_content_ids}"
        ),
    )


def _mark_completed(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
) -> None:
    _update_claimed_work(
        session,
        claim=claim,
        values={
            "status": ContentTranslationWorkStatus.completed,
            "lease_owner": None,
            "lease_token": None,
            "lease_expires_at": None,
            "completed_at": func.now(),
            "failed_at": None,
            "last_error_code": None,
            "last_error_message": None,
            "updated_at": func.now(),
        },
    )


def _mark_missing_source(session: Session, *, claim: ClaimedContentTranslationWork) -> None:
    _mark_failed(
        session,
        claim=claim,
        error_code="missing_source",
        error_message="Source content no longer exists or is not current",
    )


def _mark_failed(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    error_code: str,
    error_message: str,
) -> None:
    _update_claimed_work(
        session,
        claim=claim,
        values={
            "status": ContentTranslationWorkStatus.failed,
            "lease_owner": None,
            "lease_token": None,
            "lease_expires_at": None,
            "failed_at": func.now(),
            "last_error_code": error_code[:100],
            "last_error_message": error_message,
            "updated_at": func.now(),
        },
    )


def _update_claimed_work(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    values: dict[str, Any],
) -> None:
    updated_id = session.scalar(
        update(ContentTranslationWork)
        .where(
            and_(
                ContentTranslationWork.id == claim.id,
                ContentTranslationWork.lease_token == claim.lease_token,
            )
        )
        .values(**values)
        .returning(ContentTranslationWork.id)
    )
    if updated_id is None:
        msg = f"Lost lease while updating content translation work {claim.id}"
        raise RuntimeError(msg)


def _insert_translation_event(
    session: Session,
    *,
    subject: dict[str, str],
    conversation_slug_id: str,
    target_language_code: str,
    status: Literal["completed", "failed"],
    source_version: str,
) -> None:
    timestamp_ms = int(datetime.now(UTC).timestamp() * 1000)
    event_data = build_content_translation_event_data(
        subject=subject,
        conversation_slug_id=conversation_slug_id,
        target_language_code=target_language_code,
        status=status,
        source_version=source_version,
        timestamp_ms=timestamp_ms,
    )
    event = RealtimeEventOutbox(
        event_type="content_translation_updated",
        payload=event_data.payload,
        created_at=datetime.now(UTC),
    )
    session.add(event)
    session.flush()
    session.add(RealtimeEventOutboxTopic(event_id=event.id, topic=event_data.topic))
