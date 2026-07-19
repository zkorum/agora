from __future__ import annotations

import html
import logging
import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any, Literal

import bleach
from sqlalchemy import and_, func, or_, select, text, update
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
    LanguageDetectionProvider,
    Opinion,
    OpinionContent,
    OpinionContentTranslation,
    Project,
    ProjectContent,
    ProjectContentTranslation,
    ProjectContentTranslationSourceKind,
    RankingItem,
    RankingItemContent,
    RankingItemContentTranslation,
    RealtimeEventOutbox,
    RealtimeEventOutboxTopic,
    SpokenLanguageCode,
    SurveyQuestion,
    SurveyQuestionContent,
    SurveyQuestionContentTranslation,
    SurveyQuestionOption,
    SurveyQuestionOptionContent,
    SurveyQuestionOptionContentTranslation,
)
from content_translation_worker.translation import (
    ContentTranslationProviderError,
    ContentTranslationResult,
    ContentTranslationService,
    translate_chinese_script_with_opencc,
)

EAGER_VISIBLE_PRIORITY_RANK = 1
log = logging.getLogger(__name__)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

SUPPORTED_SOURCE_KINDS = {
    ContentTranslationSourceKind.conversation,
    ContentTranslationSourceKind.opinion,
    ContentTranslationSourceKind.project,
    ContentTranslationSourceKind.ranking_item,
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


def html_to_counted_text(value: str) -> str:
    text_with_newlines = re.sub(r"</p>", "\n", value, flags=re.IGNORECASE)
    text_with_newlines = re.sub(
        r"<br\s*/?>",
        "\n",
        text_with_newlines,
        flags=re.IGNORECASE,
    )
    text_with_newlines = re.sub(r"<p>", "", text_with_newlines, flags=re.IGNORECASE)
    plain_text = bleach.clean(
        text_with_newlines,
        tags=frozenset(),
        attributes={},
        strip=True,
    )
    return html.unescape(plain_text).removesuffix("\n")


@dataclass(frozen=True)
class TranslationSourceMetadata:
    source_language_code: SpokenLanguageCode | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None = None


EMPTY_TRANSLATION_SOURCE_METADATA = TranslationSourceMetadata(
    source_language_code=None,
    source_raw_language_code=None,
    source_language_provider=None,
)


@dataclass(frozen=True)
class TranslationSourceDecision:
    source_language_code_for_translation: str | None
    use_google_detected_source: bool

CHINESE_SCRIPT_LANGUAGE_CODES = frozenset({"zh-Hans", "zh-CN", "zh-Hant", "zh-TW"})
CHINESE_DISPLAY_LANGUAGE_CODES = frozenset({"zh-Hans", "zh-Hant"})
CANONICAL_CHINESE_PROVIDER_TARGET = "zh-Hant"
SIMPLIFIED_CHINESE_TARGET = "zh-Hans"
HIGH_CONFIDENCE_LINGUA_SOURCE_THRESHOLD = 0.8


GOOGLE_TRANSLATE_LANGUAGE_ALIASES = {
    "iw": "he",
    "tl": "fil",
    "zh": "zh-Hans",
    "zh-CN": "zh-Hans",
    "zh-cn": "zh-Hans",
    "zh-SG": "zh-Hans",
    "zh-sg": "zh-Hans",
    "zh-HK": "zh-Hant",
    "zh-hk": "zh-Hant",
    "zh-MO": "zh-Hant",
    "zh-mo": "zh-Hant",
    "zh-TW": "zh-Hant",
    "zh-tw": "zh-Hant",
}


def _normalize_google_translate_source_language_code(
    raw_language_code: str,
) -> SpokenLanguageCode | None:
    trimmed_code = raw_language_code.strip().replace("_", "-")
    if trimmed_code == "":
        return None
    normalized_code = GOOGLE_TRANSLATE_LANGUAGE_ALIASES.get(
        trimmed_code,
        GOOGLE_TRANSLATE_LANGUAGE_ALIASES.get(trimmed_code.lower(), trimmed_code),
    )
    try:
        return SpokenLanguageCode(normalized_code)
    except ValueError:
        pass

    primary_code = normalized_code.split("-", maxsplit=1)[0]
    primary_code = GOOGLE_TRANSLATE_LANGUAGE_ALIASES.get(primary_code, primary_code)
    try:
        return SpokenLanguageCode(primary_code)
    except ValueError:
        return None


def choose_user_content_translation_source(
    *,
    source_language_code: str | None,
    source_language_provider: LanguageDetectionProvider | None,
    source_language_confidence: float | None,
) -> TranslationSourceDecision:
    if source_language_code is None:
        return TranslationSourceDecision(
            source_language_code_for_translation=None,
            use_google_detected_source=True,
        )

    if source_language_provider == LanguageDetectionProvider.google_translate:
        return TranslationSourceDecision(
            source_language_code_for_translation=source_language_code,
            use_google_detected_source=False,
        )

    if (
        source_language_provider == LanguageDetectionProvider.lingua
        and source_language_confidence is not None
        and source_language_confidence >= HIGH_CONFIDENCE_LINGUA_SOURCE_THRESHOLD
    ):
        return TranslationSourceDecision(
            source_language_code_for_translation=source_language_code,
            use_google_detected_source=False,
        )

    return TranslationSourceDecision(
        source_language_code_for_translation=None,
        use_google_detected_source=True,
    )


def build_translation_source_metadata_from_results(
    results: list[ContentTranslationResult],
    *,
    use_google_detected_source: bool,
    fallback_source_language_code: str | None,
    fallback_source_raw_language_code: str | None,
    fallback_source_language_provider: LanguageDetectionProvider | None,
    fallback_source_language_confidence: float | None,
) -> TranslationSourceMetadata:
    raw_language_codes = {
        result.source_raw_language_code.strip()
        for result in results
        if result.source_language_provider == "google_translate"
        and result.source_raw_language_code is not None
        and result.source_raw_language_code.strip() != ""
    }
    fallback_metadata = TranslationSourceMetadata(
        source_language_code=_normalize_google_translate_source_language_code(
            fallback_source_language_code
        )
        if fallback_source_language_code is not None
        else None,
        source_raw_language_code=fallback_source_raw_language_code,
        source_language_provider=fallback_source_language_provider,
        source_language_confidence=fallback_source_language_confidence,
    )
    if not use_google_detected_source:
        return fallback_metadata

    if len(raw_language_codes) != 1:
        return fallback_metadata

    raw_language_code = next(iter(raw_language_codes))
    if len(raw_language_code) > 35:
        return fallback_metadata

    normalized_code = _normalize_google_translate_source_language_code(raw_language_code)
    if normalized_code is None:
        return fallback_metadata

    return TranslationSourceMetadata(
        source_language_code=normalized_code,
        source_raw_language_code=raw_language_code,
        source_language_provider=LanguageDetectionProvider.google_translate,
    )


def should_promote_google_source_metadata(
    *,
    source_metadata: TranslationSourceMetadata,
    current_source_language_provider: LanguageDetectionProvider | None,
) -> bool:
    return (
        source_metadata.source_language_code is not None
        and source_metadata.source_language_provider
        == LanguageDetectionProvider.google_translate
        and current_source_language_provider
        in {None, LanguageDetectionProvider.lingua}
    )


def _promote_opinion_source_metadata(
    session: Session,
    *,
    source: OpinionSource,
    source_metadata: TranslationSourceMetadata,
) -> None:
    if not should_promote_google_source_metadata(
        source_metadata=source_metadata,
        current_source_language_provider=source.source_language_provider,
    ):
        return

    session.execute(
        update(OpinionContent)
        .where(
            and_(
                OpinionContent.id == source.content_id,
                or_(
                    OpinionContent.source_language_provider.is_(None),
                    OpinionContent.source_language_provider
                    == LanguageDetectionProvider.lingua,
                ),
            )
        )
        .values(
            source_language_code=source_metadata.source_language_code,
            source_raw_language_code=source_metadata.source_raw_language_code,
            source_language_provider=source_metadata.source_language_provider,
            source_language_confidence=source_metadata.source_language_confidence,
        )
    )


def _promote_ranking_item_source_metadata(
    session: Session,
    *,
    source: RankingItemSource,
    source_metadata: TranslationSourceMetadata,
) -> None:
    if not should_promote_google_source_metadata(
        source_metadata=source_metadata,
        current_source_language_provider=source.source_language_provider,
    ):
        return

    session.execute(
        update(RankingItemContent)
        .where(
            and_(
                RankingItemContent.id == source.content_id,
                or_(
                    RankingItemContent.source_language_provider.is_(None),
                    RankingItemContent.source_language_provider
                    == LanguageDetectionProvider.lingua,
                ),
            )
        )
        .values(
            source_language_code=source_metadata.source_language_code,
            source_raw_language_code=source_metadata.source_raw_language_code,
            source_language_provider=source_metadata.source_language_provider,
            source_language_confidence=source_metadata.source_language_confidence,
        )
    )


@dataclass(frozen=True)
class ClaimedContentTranslationWork:
    id: int
    conversation_id: int | None
    conversation_slug_id: str | None
    source_kind: ContentTranslationSourceKind
    source_key: str
    project_content_id: int | None
    conversation_content_id: int | None
    opinion_content_id: int | None
    survey_question_content_id: int | None
    survey_question_option_content_ids: list[int] | None
    ranking_item_content_id: int | None
    display_language_code: DisplayLanguageCode
    lease_token: uuid.UUID


@dataclass(frozen=True)
class ProcessWorkResult:
    work_id: int
    status: Literal["completed", "failed", "missing_source", "lost_lease"]


class LostContentTranslationWorkLeaseError(RuntimeError):
    pass


@dataclass(frozen=True)
class LocalizedTranslationResult:
    display_language_code: DisplayLanguageCode
    result: ContentTranslationResult


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


def retry_failed_eager_work(
    session: Session,
    *,
    retry_after: datetime,
    limit: int,
) -> int:
    retryable_ids = list(
        session.scalars(
            select(ContentTranslationWork.id)
            .where(
                and_(
                    ContentTranslationWork.status
                    == ContentTranslationWorkStatus.failed,
                    ContentTranslationWork.priority_rank
                    == EAGER_VISIBLE_PRIORITY_RANK,
                    or_(
                        ContentTranslationWork.last_error_code.is_(None),
                        ContentTranslationWork.last_error_code != "missing_source",
                    ),
                    ContentTranslationWork.failed_at.is_not(None),
                    ContentTranslationWork.failed_at <= retry_after,
                )
            )
            .order_by(ContentTranslationWork.failed_at.asc(), ContentTranslationWork.id.asc())
            .limit(limit)
        )
    )
    if not retryable_ids:
        return 0

    session.execute(
        update(ContentTranslationWork)
        .where(ContentTranslationWork.id.in_(retryable_ids))
        .values(
            status=ContentTranslationWorkStatus.pending,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
    )
    return len(retryable_ids)


def _source_key_for_work_row(row: ContentTranslationWork) -> str | None:
    if row.source_kind == ContentTranslationSourceKind.project:
        if row.project_content_id is None:
            return None
        return f"project_content:{row.project_content_id}"
    if row.source_kind == ContentTranslationSourceKind.conversation:
        if row.conversation_content_id is None:
            return None
        return f"conversation_content:{row.conversation_content_id}"
    if row.source_kind == ContentTranslationSourceKind.opinion:
        if row.opinion_content_id is None:
            return None
        return f"opinion_content:{row.opinion_content_id}"
    if row.source_kind == ContentTranslationSourceKind.ranking_item:
        if row.ranking_item_content_id is None:
            return None
        return f"ranking_item_content:{row.ranking_item_content_id}"
    if row.survey_question_content_id is None or row.survey_question_option_content_ids is None:
        return None
    option_content_ids = ",".join(
        str(item) for item in row.survey_question_option_content_ids
    )
    return f"survey_question:{row.survey_question_content_id}:options:{option_content_ids}"


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
        or_(
            and_(
                ContentTranslationWork.source_kind == ContentTranslationSourceKind.project,
                ContentTranslationWork.project_content_id.is_not(None),
            ),
            and_(
                ContentTranslationWork.source_kind != ContentTranslationSourceKind.project,
                ContentTranslationWork.conversation_id.is_not(None),
                Conversation.current_content_id.is_not(None),
                or_(
                    ContentTranslationWork.source_kind
                    != ContentTranslationSourceKind.conversation,
                    Conversation.current_content_id
                    == ContentTranslationWork.conversation_content_id,
                ),
            ),
        ),
    ]
    if work_ids is not None:
        if not work_ids:
            return []
        conditions.append(ContentTranslationWork.id.in_(work_ids))

    rows = session.execute(
        select(ContentTranslationWork, Conversation.slug_id)
        .join(
            Conversation,
            Conversation.id == ContentTranslationWork.conversation_id,
            isouter=True,
        )
        .where(and_(*conditions))
        .order_by(
            ContentTranslationWork.priority_rank.asc(),
            ContentTranslationWork.updated_at.asc(),
            ContentTranslationWork.id.asc(),
        )
        .limit(batch_size)
        .with_for_update(of=ContentTranslationWork, skip_locked=True)
    )

    claims: list[ClaimedContentTranslationWork] = []
    for row, conversation_slug_id in rows:
        source_key = _source_key_for_work_row(row)
        if source_key is None:
            row.status = ContentTranslationWorkStatus.failed
            row.last_error_code = "invalid_source"
            row.last_error_message = "translation work row does not match source_kind"
            row.failed_at = datetime.now(UTC)
            row.updated_at = datetime.now(UTC)
            continue

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
                conversation_slug_id=conversation_slug_id,
                source_kind=row.source_kind,
                source_key=source_key,
                project_content_id=row.project_content_id,
                conversation_content_id=row.conversation_content_id,
                opinion_content_id=row.opinion_content_id,
                survey_question_content_id=row.survey_question_content_id,
                survey_question_option_content_ids=row.survey_question_option_content_ids,
                ranking_item_content_id=row.ranking_item_content_id,
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
        if claim.source_kind == ContentTranslationSourceKind.project:
            if claim.project_content_id is None:
                _mark_failed(
                    session,
                    claim=claim,
                    error_code="invalid_source",
                    error_message="project work is missing project_content_id",
                )
                return ProcessWorkResult(work_id=claim.id, status="failed")
            source = _fetch_project_source(
                session,
                project_content_id=claim.project_content_id,
            )
            if source is None:
                log.warning(
                    "[Worker] Missing translation source work_id=%d source_kind=project "
                    "project_content_id=%d reason=source_not_current_or_deleted",
                    claim.id,
                    claim.project_content_id,
                )
                _mark_missing_source(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="missing_source")
            log.info(
                "[Worker] Translation source work_id=%d source_kind=project "
                "target_language=%s projectId=%d projectContentId=%d",
                claim.id,
                claim.display_language_code.value,
                source.project_id,
                source.content_id,
            )
            _lock_translation_work_group(
                session,
                claim=claim,
                source_language_code=source.source_language_code,
            )
            if _has_fresh_project_translation(session, claim=claim, source=source):
                _mark_completed(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="completed")
            try:
                with session.begin_nested():
                    _translate_project_source(
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
                return ProcessWorkResult(work_id=claim.id, status="failed")
            _mark_completed(session, claim=claim)
            return ProcessWorkResult(work_id=claim.id, status="completed")

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
                log.warning(
                    "[Worker] Missing translation source work_id=%d source_kind=conversation "
                    "conversationSlugId=%s conversation_id=%d conversation_content_id=%d "
                    "reason=source_not_current_or_deleted",
                    claim.id,
                    claim.conversation_slug_id,
                    claim.conversation_id,
                    claim.conversation_content_id,
                )
                _mark_missing_source(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="missing_source")
            log.info(
                "[Worker] Translation source work_id=%d source_kind=conversation "
                "target_language=%s conversationSlugId=%s conversationContentId=%d",
                claim.id,
                claim.display_language_code.value,
                source.conversation_slug_id,
                source.content_id,
            )
            _lock_translation_work_group(
                session,
                claim=claim,
                source_language_code=source.source_language_code,
            )
            if _has_fresh_conversation_translation(session, claim=claim, source=source):
                _mark_completed(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="completed")
            try:
                with session.begin_nested():
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
                log.warning(
                    "[Worker] Missing translation source work_id=%d source_kind=survey_question "
                    "conversationSlugId=%s conversation_id=%d survey_question_content_id=%d "
                    "survey_option_content_ids=%s reason=source_not_current_or_deleted",
                    claim.id,
                    claim.conversation_slug_id,
                    claim.conversation_id,
                    claim.survey_question_content_id,
                    claim.survey_question_option_content_ids,
                )
                _mark_missing_source(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="missing_source")
            log.info(
                "[Worker] Translation source work_id=%d source_kind=survey_question "
                "target_language=%s conversationSlugId=%s questionSlugId=%s "
                "surveyQuestionContentId=%d optionSlugIds=%s",
                claim.id,
                claim.display_language_code.value,
                source.conversation_slug_id,
                source.question_slug_id,
                source.content_id,
                [option.option_slug_id for option in source.options],
            )
            _lock_translation_work_group(
                session,
                claim=claim,
                source_language_code=source.source_language_code,
            )
            if _has_fresh_survey_question_translation(session, claim=claim, source=source):
                _mark_completed(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="completed")
            try:
                with session.begin_nested():
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

        if claim.source_kind == ContentTranslationSourceKind.ranking_item:
            if claim.ranking_item_content_id is None:
                _mark_failed(
                    session,
                    claim=claim,
                    error_code="invalid_source",
                    error_message="ranking item work is missing ranking_item_content_id",
                )
                return ProcessWorkResult(work_id=claim.id, status="failed")
            source = _fetch_ranking_item_source(
                session,
                ranking_item_content_id=claim.ranking_item_content_id,
            )
            if source is None:
                log.warning(
                    "[Worker] Missing translation source work_id=%d source_kind=ranking_item "
                    "conversationSlugId=%s conversation_id=%d ranking_item_content_id=%d "
                    "reason=source_not_current_or_deleted",
                    claim.id,
                    claim.conversation_slug_id,
                    claim.conversation_id,
                    claim.ranking_item_content_id,
                )
                _mark_missing_source(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="missing_source")
            log.info(
                "[Worker] Translation source work_id=%d source_kind=ranking_item "
                "target_language=%s conversationSlugId=%s itemSlugId=%s "
                "rankingItemContentId=%d",
                claim.id,
                claim.display_language_code.value,
                source.conversation_slug_id,
                source.item_slug_id,
                source.content_id,
            )
            _lock_translation_work_group(
                session,
                claim=claim,
                source_language_code=source.source_language_code,
            )
            if _has_fresh_ranking_item_translation(session, claim=claim, source=source):
                _mark_completed(session, claim=claim)
                return ProcessWorkResult(work_id=claim.id, status="completed")
            try:
                with session.begin_nested():
                    _translate_ranking_item_source(
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
                _insert_ranking_item_translation_event(
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
            log.warning(
                "[Worker] Missing translation source work_id=%d source_kind=opinion "
                "conversationSlugId=%s conversation_id=%d opinion_content_id=%d "
                "reason=source_not_current_or_deleted",
                claim.id,
                claim.conversation_slug_id,
                claim.conversation_id,
                claim.opinion_content_id,
            )
            _mark_missing_source(session, claim=claim)
            return ProcessWorkResult(work_id=claim.id, status="missing_source")
        log.info(
            "[Worker] Translation source work_id=%d source_kind=opinion "
            "target_language=%s conversationSlugId=%s opinionSlugId=%s "
            "opinionContentId=%d",
            claim.id,
            claim.display_language_code.value,
            source.conversation_slug_id,
            source.opinion_slug_id,
            source.content_id,
        )
        _lock_translation_work_group(
            session,
            claim=claim,
            source_language_code=source.source_language_code,
        )
        if _has_fresh_opinion_translation(session, claim=claim, source=source):
            _mark_completed(session, claim=claim)
            return ProcessWorkResult(work_id=claim.id, status="completed")
        try:
            with session.begin_nested():
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
    except LostContentTranslationWorkLeaseError as error:
        log.warning("[Worker] %s", error)
        return ProcessWorkResult(work_id=claim.id, status="lost_lease")
    except Exception as error:
        try:
            _mark_failed(
                session,
                claim=claim,
                error_code=error.__class__.__name__,
                error_message=str(error),
            )
        except LostContentTranslationWorkLeaseError as lease_error:
            log.warning("[Worker] %s", lease_error)
            return ProcessWorkResult(work_id=claim.id, status="lost_lease")
        return ProcessWorkResult(work_id=claim.id, status="failed")


@dataclass(frozen=True)
class ConversationSource:
    conversation_slug_id: str
    content_id: int
    public_id: uuid.UUID
    title: str
    body: str | None
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


@dataclass(frozen=True)
class OpinionSource:
    conversation_slug_id: str
    opinion_slug_id: str
    content_id: int
    public_id: uuid.UUID
    content: str
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


@dataclass(frozen=True)
class SurveyQuestionOptionSource:
    option_slug_id: str
    content_id: int
    option_text: str
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


@dataclass(frozen=True)
class SurveyQuestionSource:
    conversation_slug_id: str
    question_slug_id: str
    content_id: int
    public_id: uuid.UUID
    question_text: str
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None
    options: list[SurveyQuestionOptionSource]


@dataclass(frozen=True)
class RankingItemSource:
    conversation_slug_id: str
    item_slug_id: str
    content_id: int
    public_id: uuid.UUID
    title: str
    body_html: str | None
    body_plain_text: str | None
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


@dataclass(frozen=True)
class ProjectSource:
    project_id: int
    content_id: int
    title: str
    subtitle: str | None
    body: str | None
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


def _fetch_project_source(
    session: Session,
    *,
    project_content_id: int,
) -> ProjectSource | None:
    row = session.execute(
        select(
            Project.id.label("project_id"),
            ProjectContent.id,
            ProjectContent.title,
            ProjectContent.subtitle,
            ProjectContent.body,
            ProjectContent.source_language_code,
            ProjectContent.source_raw_language_code,
            ProjectContent.source_language_provider,
            ProjectContent.source_language_confidence,
        )
        .join(Project, Project.id == ProjectContent.project_id)
        .where(
            and_(
                ProjectContent.id == project_content_id,
                Project.current_content_id == ProjectContent.id,
            )
        )
        .limit(1)
    ).one_or_none()
    if row is None:
        return None
    return ProjectSource(
        project_id=row.project_id,
        content_id=row.id,
        title=row.title,
        subtitle=row.subtitle,
        body=row.body,
        source_language_code=row.source_language_code,
        source_raw_language_code=row.source_raw_language_code,
        source_language_provider=row.source_language_provider,
        source_language_confidence=row.source_language_confidence,
    )


def _fetch_conversation_source(
    session: Session,
    *,
    conversation_content_id: int,
) -> ConversationSource | None:
    row = session.execute(
        select(
            Conversation.slug_id,
            ConversationContent.id,
            ConversationContent.public_id,
            ConversationContent.title,
            ConversationContent.body,
            ConversationContent.source_language_code,
            ConversationContent.source_raw_language_code,
            ConversationContent.source_language_provider,
            ConversationContent.source_language_confidence,
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
        public_id=row.public_id,
        title=row.title,
        body=row.body,
        source_language_code=row.source_language_code,
        source_raw_language_code=row.source_raw_language_code,
        source_language_provider=row.source_language_provider,
        source_language_confidence=row.source_language_confidence,
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
            OpinionContent.public_id,
            OpinionContent.content,
            OpinionContent.source_language_code,
            OpinionContent.source_raw_language_code,
            OpinionContent.source_language_provider,
            OpinionContent.source_language_confidence,
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
        public_id=row.public_id,
        content=row.content,
        source_language_code=row.source_language_code,
        source_raw_language_code=row.source_raw_language_code,
        source_language_provider=row.source_language_provider,
        source_language_confidence=row.source_language_confidence,
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
            SurveyQuestionContent.public_id,
            SurveyQuestionContent.question_text,
            SurveyQuestionContent.source_language_code,
            SurveyQuestionContent.source_raw_language_code,
            SurveyQuestionContent.source_language_provider,
            SurveyQuestionContent.source_language_confidence,
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
            SurveyQuestionOptionContent.source_raw_language_code,
            SurveyQuestionOptionContent.source_language_provider,
            SurveyQuestionOptionContent.source_language_confidence,
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
        public_id=row.public_id,
        question_text=row.question_text,
        source_language_code=row.source_language_code,
        source_raw_language_code=row.source_raw_language_code,
        source_language_provider=row.source_language_provider,
        source_language_confidence=row.source_language_confidence,
        options=[
            SurveyQuestionOptionSource(
                option_slug_id=option.slug_id,
                content_id=option.id,
                option_text=option.option_text,
                source_language_code=option.source_language_code,
                source_raw_language_code=option.source_raw_language_code,
                source_language_provider=option.source_language_provider,
                source_language_confidence=option.source_language_confidence,
            )
            for option in option_rows
        ],
    )


def _fetch_ranking_item_source(
    session: Session,
    *,
    ranking_item_content_id: int,
) -> RankingItemSource | None:
    row = session.execute(
        select(
            Conversation.slug_id.label("conversation_slug_id"),
            RankingItem.slug_id.label("item_slug_id"),
            RankingItemContent.id,
            RankingItemContent.public_id,
            RankingItemContent.title,
            RankingItemContent.body,
            RankingItemContent.body_plain_text,
            RankingItemContent.source_language_code,
            RankingItemContent.source_raw_language_code,
            RankingItemContent.source_language_provider,
            RankingItemContent.source_language_confidence,
        )
        .join(RankingItem, RankingItem.id == RankingItemContent.ranking_item_id)
        .join(Conversation, Conversation.id == RankingItem.conversation_id)
        .where(
            and_(
                RankingItemContent.id == ranking_item_content_id,
                RankingItem.current_content_id == RankingItemContent.id,
            )
        )
        .limit(1)
    ).one_or_none()
    if row is None:
        return None
    return RankingItemSource(
        conversation_slug_id=row.conversation_slug_id,
        item_slug_id=row.item_slug_id,
        content_id=row.id,
        public_id=row.public_id,
        title=row.title,
        body_html=row.body,
        body_plain_text=row.body_plain_text,
        source_language_code=row.source_language_code,
        source_raw_language_code=row.source_raw_language_code,
        source_language_provider=row.source_language_provider,
        source_language_confidence=row.source_language_confidence,
    )


def _lock_translation_work_group(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source_language_code: str | None,
) -> None:
    if session.get_bind().dialect.name != "postgresql":
        return

    lock_key = ":".join(
        [
            "content_translation",
            claim.source_kind.value,
            claim.source_key,
            str(claim.survey_question_content_id or ""),
            ",".join(str(item) for item in claim.survey_question_option_content_ids or []),
            _translation_work_target_group(
                source_language_code=source_language_code,
                target_language_code=claim.display_language_code.value,
            ),
        ]
    )
    session.execute(
        text("select pg_advisory_xact_lock(hashtextextended(:lock_key, 0))"),
        {"lock_key": lock_key},
    )


def _translation_work_target_group(
    *,
    source_language_code: str | None,
    target_language_code: str,
) -> str:
    if (
        target_language_code in CHINESE_DISPLAY_LANGUAGE_CODES
        and not _is_chinese_script_language_code(source_language_code)
    ):
        return "zh"
    return target_language_code


def _is_chinese_script_language_code(language_code: str | None) -> bool:
    return language_code in CHINESE_SCRIPT_LANGUAGE_CODES


def _should_store_chinese_script_pair(
    *,
    source_language_code: str | None,
    target_language_code: str,
) -> bool:
    return (
        target_language_code in CHINESE_DISPLAY_LANGUAGE_CODES
        and not _is_chinese_script_language_code(source_language_code)
    )


def _translation_source_matches_current_source(
    *,
    translation_source_language_code: SpokenLanguageCode | None,
    current_source_language_code: str | None,
) -> bool:
    if current_source_language_code is None:
        return translation_source_language_code is None
    current = _normalize_google_translate_source_language_code(current_source_language_code)
    if current is None:
        return translation_source_language_code is None
    return translation_source_language_code == current


def _has_fresh_conversation_translation(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: ConversationSource,
) -> bool:
    row = session.execute(
        select(ConversationContentTranslation.source_language_code).where(
            and_(
                ConversationContentTranslation.conversation_content_id == source.content_id,
                ConversationContentTranslation.display_language_code
                == claim.display_language_code,
            )
        )
    ).first()
    return row is not None and _translation_source_matches_current_source(
        translation_source_language_code=row.source_language_code,
        current_source_language_code=source.source_language_code,
    )


def _has_fresh_project_translation(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: ProjectSource,
) -> bool:
    row = session.execute(
        select(
            ProjectContentTranslation.source_language_code,
            ProjectContentTranslation.source_kind,
        ).where(
            and_(
                ProjectContentTranslation.project_content_id == source.content_id,
                ProjectContentTranslation.display_language_code
                == claim.display_language_code,
                ProjectContentTranslation.deleted_at.is_(None),
            )
        )
    ).first()
    if row is not None and row.source_kind == ProjectContentTranslationSourceKind.manual:
        return True
    return row is not None and _translation_source_matches_current_source(
        translation_source_language_code=row.source_language_code,
        current_source_language_code=source.source_language_code,
    )


def _has_fresh_opinion_translation(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: OpinionSource,
) -> bool:
    row = session.execute(
        select(OpinionContentTranslation.source_language_code).where(
            and_(
                OpinionContentTranslation.opinion_content_id == source.content_id,
                OpinionContentTranslation.display_language_code == claim.display_language_code,
            )
        )
    ).first()
    return row is not None and _translation_source_matches_current_source(
        translation_source_language_code=row.source_language_code,
        current_source_language_code=source.source_language_code,
    )


def _has_fresh_survey_question_translation(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: SurveyQuestionSource,
) -> bool:
    question_row = session.execute(
        select(SurveyQuestionContentTranslation.source_language_code).where(
            and_(
                SurveyQuestionContentTranslation.survey_question_content_id
                == source.content_id,
                SurveyQuestionContentTranslation.display_language_code
                == claim.display_language_code,
            )
        )
    ).first()
    if question_row is None or not _translation_source_matches_current_source(
        translation_source_language_code=question_row.source_language_code,
        current_source_language_code=source.source_language_code,
    ):
        return False

    option_content_ids = [option.content_id for option in source.options]
    if not option_content_ids:
        return True
    option_rows = session.execute(
        select(
            SurveyQuestionOptionContentTranslation.survey_question_option_content_id,
            SurveyQuestionOptionContentTranslation.source_language_code,
        ).where(
            and_(
                SurveyQuestionOptionContentTranslation.display_language_code
                == claim.display_language_code,
                SurveyQuestionOptionContentTranslation.survey_question_option_content_id.in_(
                    option_content_ids
                ),
            )
        )
    ).all()
    translation_source_by_option_id = {
        row.survey_question_option_content_id: row.source_language_code for row in option_rows
    }
    return all(
        option.content_id in translation_source_by_option_id
        and _translation_source_matches_current_source(
            translation_source_language_code=translation_source_by_option_id[option.content_id],
            current_source_language_code=option.source_language_code,
        )
        for option in source.options
    )


def _has_fresh_ranking_item_translation(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: RankingItemSource,
) -> bool:
    row = session.execute(
        select(RankingItemContentTranslation.source_language_code).where(
            and_(
                RankingItemContentTranslation.ranking_item_content_id == source.content_id,
                RankingItemContentTranslation.display_language_code
                == claim.display_language_code,
            )
        )
    ).first()
    return row is not None and _translation_source_matches_current_source(
        translation_source_language_code=row.source_language_code,
        current_source_language_code=source.source_language_code,
    )


def translate_text_for_claim_target(
    *,
    translation_service: ContentTranslationService,
    text_value: str,
    source_language_code: str | None,
    target_language_code: str,
    mime_type: str,
) -> list[LocalizedTranslationResult]:
    if _should_store_chinese_script_pair(
        source_language_code=source_language_code,
        target_language_code=target_language_code,
    ):
        traditional_result = translation_service.translate_texts(
            texts=[text_value],
            source_language_code=source_language_code,
            target_language_code=CANONICAL_CHINESE_PROVIDER_TARGET,
            mime_type=mime_type,
        )[0]
        simplified_result = ContentTranslationResult(
            translated_text=translate_chinese_script_with_opencc(
                text=traditional_result.translated_text,
                source_language_code=CANONICAL_CHINESE_PROVIDER_TARGET,
                target_language_code=SIMPLIFIED_CHINESE_TARGET,
            ),
            source_raw_language_code=traditional_result.source_raw_language_code,
            source_language_provider=traditional_result.source_language_provider,
        )
        return [
            LocalizedTranslationResult(
                display_language_code=DisplayLanguageCode.zh_hant,
                result=traditional_result,
            ),
            LocalizedTranslationResult(
                display_language_code=DisplayLanguageCode.zh_hans,
                result=simplified_result,
            ),
        ]

    result = translation_service.translate_texts(
        texts=[text_value],
        source_language_code=source_language_code,
        target_language_code=target_language_code,
        mime_type=mime_type,
    )[0]
    return [
        LocalizedTranslationResult(
            display_language_code=DisplayLanguageCode(target_language_code),
            result=result,
        )
    ]


def _results_by_display_language_code(
    results: list[LocalizedTranslationResult],
) -> dict[DisplayLanguageCode, ContentTranslationResult]:
    return {result.display_language_code: result.result for result in results}


def _translate_conversation_source(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: ConversationSource,
    translation_service: ContentTranslationService,
) -> None:
    title_results = translate_text_for_claim_target(
        translation_service=translation_service,
        text_value=source.title,
        source_language_code=source.source_language_code,
        target_language_code=claim.display_language_code.value,
        mime_type="text/plain",
    )
    title_result_by_language = _results_by_display_language_code(title_results)
    body_result_by_language: dict[DisplayLanguageCode, ContentTranslationResult | None] = {
        language_code: None for language_code in title_result_by_language
    }
    if source.body is not None:
        body_results = translate_text_for_claim_target(
            translation_service=translation_service,
            text_value=source.body,
            source_language_code=source.source_language_code,
            target_language_code=claim.display_language_code.value,
            mime_type="text/html",
        )
        body_result_by_language = {
            language_code: result
            for language_code, result in _results_by_display_language_code(
                body_results
            ).items()
        }

    for display_language_code, title_result in title_result_by_language.items():
        body_result = body_result_by_language.get(display_language_code)
        translated_body = (
            sanitize_translated_html(body_result.translated_text)
            if body_result is not None
            else None
        )
        translated_body_plain_text = (
            html_to_counted_text(translated_body) if translated_body is not None else None
        )
        source_metadata = build_translation_source_metadata_from_results(
            [title_result, *([] if body_result is None else [body_result])],
            use_google_detected_source=False,
            fallback_source_language_code=source.source_language_code,
            fallback_source_raw_language_code=source.source_raw_language_code,
            fallback_source_language_provider=source.source_language_provider,
            fallback_source_language_confidence=source.source_language_confidence,
        )
        stmt = pg_insert(ConversationContentTranslation).values(
            conversation_content_id=source.content_id,
            display_language_code=display_language_code,
            translated_title=title_result.translated_text,
            translated_body=translated_body,
            translated_body_plain_text=translated_body_plain_text,
            source_language_code=source_metadata.source_language_code,
            source_raw_language_code=source_metadata.source_raw_language_code,
            source_language_provider=source_metadata.source_language_provider,
            source_language_confidence=source_metadata.source_language_confidence,
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
                    "translated_title": title_result.translated_text,
                    "translated_body": translated_body,
                    "translated_body_plain_text": translated_body_plain_text,
                    "source_language_code": source_metadata.source_language_code,
                    "source_raw_language_code": source_metadata.source_raw_language_code,
                    "source_language_provider": source_metadata.source_language_provider,
                    "source_language_confidence": source_metadata.source_language_confidence,
                    "updated_at": func.now(),
                },
            )
        )
        _insert_conversation_translation_event(
            session,
            source=source,
            target_language_code=display_language_code.value,
            status="completed",
        )


def _translate_project_source(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: ProjectSource,
    translation_service: ContentTranslationService,
) -> None:
    title_results = translate_text_for_claim_target(
        translation_service=translation_service,
        text_value=source.title,
        source_language_code=source.source_language_code,
        target_language_code=claim.display_language_code.value,
        mime_type="text/plain",
    )
    title_result_by_language = _results_by_display_language_code(title_results)
    subtitle_result_by_language: dict[
        DisplayLanguageCode,
        ContentTranslationResult | None,
    ] = {language_code: None for language_code in title_result_by_language}
    body_result_by_language: dict[DisplayLanguageCode, ContentTranslationResult | None] = {
        language_code: None for language_code in title_result_by_language
    }
    if source.subtitle is not None:
        subtitle_result_by_language = {
            language_code: result
            for language_code, result in _results_by_display_language_code(
                translate_text_for_claim_target(
                    translation_service=translation_service,
                    text_value=source.subtitle,
                    source_language_code=source.source_language_code,
                    target_language_code=claim.display_language_code.value,
                    mime_type="text/plain",
                )
            ).items()
        }
    if source.body is not None:
        body_result_by_language = {
            language_code: result
            for language_code, result in _results_by_display_language_code(
                translate_text_for_claim_target(
                    translation_service=translation_service,
                    text_value=source.body,
                    source_language_code=source.source_language_code,
                    target_language_code=claim.display_language_code.value,
                    mime_type="text/html",
                )
            ).items()
        }

    for display_language_code, title_result in title_result_by_language.items():
        subtitle_result = subtitle_result_by_language.get(display_language_code)
        body_result = body_result_by_language.get(display_language_code)
        translated_body = (
            sanitize_translated_html(body_result.translated_text)
            if body_result is not None
            else None
        )
        translated_body_plain_text = (
            html_to_counted_text(translated_body) if translated_body is not None else None
        )
        source_metadata = build_translation_source_metadata_from_results(
            [
                title_result,
                *([] if subtitle_result is None else [subtitle_result]),
                *([] if body_result is None else [body_result]),
            ],
            use_google_detected_source=False,
            fallback_source_language_code=source.source_language_code,
            fallback_source_raw_language_code=source.source_raw_language_code,
            fallback_source_language_provider=source.source_language_provider,
            fallback_source_language_confidence=source.source_language_confidence,
        )
        stmt = pg_insert(ProjectContentTranslation).values(
            project_content_id=source.content_id,
            display_language_code=display_language_code,
            translated_title=title_result.translated_text,
            translated_subtitle=(
                subtitle_result.translated_text if subtitle_result is not None else None
            ),
            translated_body=translated_body,
            translated_body_plain_text=translated_body_plain_text,
            source_kind=ProjectContentTranslationSourceKind.machine,
            source_language_code=source_metadata.source_language_code,
            source_raw_language_code=source_metadata.source_raw_language_code,
            source_language_provider=source_metadata.source_language_provider,
            source_language_confidence=source_metadata.source_language_confidence,
            created_at=func.now(),
            updated_at=func.now(),
        )
        session.execute(
            stmt.on_conflict_do_update(
                index_elements=[
                    ProjectContentTranslation.project_content_id,
                    ProjectContentTranslation.display_language_code,
                ],
                index_where=ProjectContentTranslation.deleted_at.is_(None),
                set_={
                    "translated_title": title_result.translated_text,
                    "translated_subtitle": (
                        subtitle_result.translated_text
                        if subtitle_result is not None
                        else None
                    ),
                    "translated_body": translated_body,
                    "translated_body_plain_text": translated_body_plain_text,
                    "source_kind": ProjectContentTranslationSourceKind.machine,
                    "source_language_code": source_metadata.source_language_code,
                    "source_raw_language_code": source_metadata.source_raw_language_code,
                    "source_language_provider": source_metadata.source_language_provider,
                    "source_language_confidence": source_metadata.source_language_confidence,
                    "updated_at": func.now(),
                },
                where=(
                    ProjectContentTranslation.source_kind
                    != ProjectContentTranslationSourceKind.manual
                ),
            )
        )


def _translate_opinion_source(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: OpinionSource,
    translation_service: ContentTranslationService,
) -> None:
    source_decision = choose_user_content_translation_source(
        source_language_code=source.source_language_code,
        source_language_provider=source.source_language_provider,
        source_language_confidence=source.source_language_confidence,
    )
    translation_results = translate_text_for_claim_target(
        translation_service=translation_service,
        text_value=source.content,
        source_language_code=source_decision.source_language_code_for_translation,
        target_language_code=claim.display_language_code.value,
        mime_type="text/html",
    )
    for localized_result in translation_results:
        translated_content = sanitize_translated_html(
            localized_result.result.translated_text
        )
        translated_content_plain_text = html_to_counted_text(translated_content)
        source_metadata = build_translation_source_metadata_from_results(
            [localized_result.result],
            use_google_detected_source=source_decision.use_google_detected_source,
            fallback_source_language_code=source.source_language_code,
            fallback_source_raw_language_code=source.source_raw_language_code,
            fallback_source_language_provider=source.source_language_provider,
            fallback_source_language_confidence=source.source_language_confidence,
        )
        _promote_opinion_source_metadata(
            session,
            source=source,
            source_metadata=source_metadata,
        )
        stmt = pg_insert(OpinionContentTranslation).values(
            opinion_content_id=source.content_id,
            display_language_code=localized_result.display_language_code,
            translated_content=translated_content,
            translated_content_plain_text=translated_content_plain_text,
            source_language_code=source_metadata.source_language_code,
            source_raw_language_code=source_metadata.source_raw_language_code,
            source_language_provider=source_metadata.source_language_provider,
            source_language_confidence=source_metadata.source_language_confidence,
            created_at=func.now(),
            updated_at=func.now(),
        )
        session.execute(
            stmt.on_conflict_do_update(
                index_elements=[
                    OpinionContentTranslation.opinion_content_id,
                    OpinionContentTranslation.display_language_code,
                ],
                set_={
                    "translated_content": translated_content,
                    "translated_content_plain_text": translated_content_plain_text,
                    "source_language_code": source_metadata.source_language_code,
                    "source_raw_language_code": source_metadata.source_raw_language_code,
                    "source_language_provider": source_metadata.source_language_provider,
                    "source_language_confidence": source_metadata.source_language_confidence,
                    "updated_at": func.now(),
                },
            )
        )
        _insert_opinion_translation_event(
            session,
            source=source,
            target_language_code=localized_result.display_language_code.value,
            status="completed",
        )


def _translate_ranking_item_source(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: RankingItemSource,
    translation_service: ContentTranslationService,
) -> None:
    source_decision = choose_user_content_translation_source(
        source_language_code=source.source_language_code,
        source_language_provider=source.source_language_provider,
        source_language_confidence=source.source_language_confidence,
    )
    title_results = translate_text_for_claim_target(
        translation_service=translation_service,
        text_value=source.title,
        source_language_code=source_decision.source_language_code_for_translation,
        target_language_code=claim.display_language_code.value,
        mime_type="text/plain",
    )
    title_result_by_language = _results_by_display_language_code(title_results)
    body_result_by_language: dict[DisplayLanguageCode, ContentTranslationResult | None] = {
        language_code: None for language_code in title_result_by_language
    }
    if source.body_html is not None:
        body_result_by_language = {
            language_code: result
            for language_code, result in _results_by_display_language_code(
                translate_text_for_claim_target(
                    translation_service=translation_service,
                    text_value=source.body_html,
                    source_language_code=source_decision.source_language_code_for_translation,
                    target_language_code=claim.display_language_code.value,
                    mime_type="text/html",
                )
            ).items()
        }

    for display_language_code, title_result in title_result_by_language.items():
        body_result = body_result_by_language.get(display_language_code)
        translated_body_html = (
            sanitize_translated_html(body_result.translated_text)
            if body_result is not None
            else None
        )
        translated_body_plain_text = (
            html_to_counted_text(translated_body_html)
            if translated_body_html is not None
            else None
        )
        source_metadata = build_translation_source_metadata_from_results(
            [title_result, *([] if body_result is None else [body_result])],
            use_google_detected_source=source_decision.use_google_detected_source,
            fallback_source_language_code=source.source_language_code,
            fallback_source_raw_language_code=source.source_raw_language_code,
            fallback_source_language_provider=source.source_language_provider,
            fallback_source_language_confidence=source.source_language_confidence,
        )
        _promote_ranking_item_source_metadata(
            session,
            source=source,
            source_metadata=source_metadata,
        )
        stmt = pg_insert(RankingItemContentTranslation).values(
            ranking_item_content_id=source.content_id,
            display_language_code=display_language_code,
            translated_title=title_result.translated_text,
            translated_body_html=translated_body_html,
            translated_body_plain_text=translated_body_plain_text,
            source_language_code=source_metadata.source_language_code,
            source_raw_language_code=source_metadata.source_raw_language_code,
            source_language_provider=source_metadata.source_language_provider,
            source_language_confidence=source_metadata.source_language_confidence,
            created_at=func.now(),
            updated_at=func.now(),
        )
        session.execute(
            stmt.on_conflict_do_update(
                index_elements=[
                    RankingItemContentTranslation.ranking_item_content_id,
                    RankingItemContentTranslation.display_language_code,
                ],
                set_={
                    "translated_title": title_result.translated_text,
                    "translated_body_html": translated_body_html,
                    "translated_body_plain_text": translated_body_plain_text,
                    "source_language_code": source_metadata.source_language_code,
                    "source_raw_language_code": source_metadata.source_raw_language_code,
                    "source_language_provider": source_metadata.source_language_provider,
                    "source_language_confidence": source_metadata.source_language_confidence,
                    "updated_at": func.now(),
                },
            )
        )
        _insert_ranking_item_translation_event(
            session,
            source=source,
            target_language_code=display_language_code.value,
            status="completed",
        )


def _translate_survey_question_source(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    source: SurveyQuestionSource,
    translation_service: ContentTranslationService,
) -> None:
    question_results = translate_text_for_claim_target(
        translation_service=translation_service,
        text_value=source.question_text,
        source_language_code=source.source_language_code,
        target_language_code=claim.display_language_code.value,
        mime_type="text/plain",
    )
    question_result_by_language = _results_by_display_language_code(question_results)
    option_results_by_id: dict[
        int,
        dict[DisplayLanguageCode, ContentTranslationResult],
    ] = {}
    for option in source.options:
        option_results = translate_text_for_claim_target(
            translation_service=translation_service,
            text_value=option.option_text,
            source_language_code=option.source_language_code,
            target_language_code=claim.display_language_code.value,
            mime_type="text/plain",
        )
        option_results_by_id[option.content_id] = _results_by_display_language_code(
            option_results
        )

    for display_language_code, question_result in question_result_by_language.items():
        if any(
            display_language_code not in option_results_by_id[option.content_id]
            for option in source.options
        ):
            continue
        question_source_metadata = build_translation_source_metadata_from_results(
            [question_result],
            use_google_detected_source=False,
            fallback_source_language_code=source.source_language_code,
            fallback_source_raw_language_code=source.source_raw_language_code,
            fallback_source_language_provider=source.source_language_provider,
            fallback_source_language_confidence=source.source_language_confidence,
        )
        question_stmt = pg_insert(SurveyQuestionContentTranslation).values(
            survey_question_content_id=source.content_id,
            display_language_code=display_language_code,
            translated_question_text=question_result.translated_text,
            source_language_code=question_source_metadata.source_language_code,
            source_raw_language_code=question_source_metadata.source_raw_language_code,
            source_language_provider=question_source_metadata.source_language_provider,
            source_language_confidence=question_source_metadata.source_language_confidence,
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
                    "translated_question_text": question_result.translated_text,
                    "source_language_code": question_source_metadata.source_language_code,
                    "source_raw_language_code": question_source_metadata.source_raw_language_code,
                    "source_language_provider": question_source_metadata.source_language_provider,
                    "source_language_confidence": (
                        question_source_metadata.source_language_confidence
                    ),
                    "updated_at": func.now(),
                },
            )
        )

        for option in source.options:
            option_result = option_results_by_id[option.content_id][display_language_code]
            option_source_metadata = build_translation_source_metadata_from_results(
                [option_result],
                use_google_detected_source=False,
                fallback_source_language_code=option.source_language_code,
                fallback_source_raw_language_code=option.source_raw_language_code,
                fallback_source_language_provider=option.source_language_provider,
                fallback_source_language_confidence=option.source_language_confidence,
            )
            option_stmt = pg_insert(SurveyQuestionOptionContentTranslation).values(
                survey_question_option_content_id=option.content_id,
                display_language_code=display_language_code,
                translated_option_text=option_result.translated_text,
                source_language_code=option_source_metadata.source_language_code,
                source_raw_language_code=option_source_metadata.source_raw_language_code,
                source_language_provider=option_source_metadata.source_language_provider,
                source_language_confidence=option_source_metadata.source_language_confidence,
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
                        "translated_option_text": option_result.translated_text,
                        "source_language_code": option_source_metadata.source_language_code,
                        "source_raw_language_code": option_source_metadata.source_raw_language_code,
                        "source_language_provider": option_source_metadata.source_language_provider,
                        "source_language_confidence": (
                            option_source_metadata.source_language_confidence
                        ),
                        "updated_at": func.now(),
                    },
                )
            )

        _insert_survey_question_translation_event(
            session,
            source=source,
            target_language_code=display_language_code.value,
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
        source_version=source.public_id,
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
            "sourceVersion": str(source.public_id),
        },
        conversation_slug_id=source.conversation_slug_id,
        target_language_code=target_language_code,
        status=status,
        source_version=source.public_id,
    )


def _insert_survey_question_translation_event(
    session: Session,
    *,
    source: SurveyQuestionSource,
    target_language_code: str,
    status: Literal["completed", "failed"],
) -> None:
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
        source_version=source.public_id,
    )


def _insert_ranking_item_translation_event(
    session: Session,
    *,
    source: RankingItemSource,
    target_language_code: str,
    status: Literal["completed", "failed"],
) -> None:
    _insert_translation_event(
        session,
        subject={
            "kind": "ranking_item",
            "conversationSlugId": source.conversation_slug_id,
            "itemSlugId": source.item_slug_id,
        },
        conversation_slug_id=source.conversation_slug_id,
        target_language_code=target_language_code,
        status=status,
        source_version=source.public_id,
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
        raise LostContentTranslationWorkLeaseError(msg)


def _insert_translation_event(
    session: Session,
    *,
    subject: dict[str, str],
    conversation_slug_id: str,
    target_language_code: str,
    status: Literal["completed", "failed"],
    source_version: uuid.UUID,
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
