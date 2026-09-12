from __future__ import annotations

import html
import logging
import re
import uuid
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Literal, TypedDict

import bleach
from sqlalchemy import and_, func, or_, select, true, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from content_translation_worker.events import (
    ContentTranslationEventData,
    build_content_translation_event_data,
    build_project_content_translation_event_data,
)
from content_translation_worker.generated_models import (
    AnalysisSnapshotOpinion,
    ContentTranslationSourceKind,
    ContentTranslationWork,
    ContentTranslationWorkStatus,
    Conversation,
    ConversationContent,
    ConversationContentTranslation,
    ConversationViewSnapshot,
    LanguageDetectionProvider,
    Opinion,
    OpinionContent,
    OpinionContentTranslation,
    OpinionModeration,
    OpinionModerationAction,
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
    User,
)
from content_translation_worker.models import (
    ClaimedContentTranslationWork,
    ContentRevision,
    ConversationSource,
    ConversationTranslationBundle,
    OpinionSource,
    OpinionTranslationBundle,
    PreparedContentTranslation,
    ProcessWorkResult,
    ProjectSource,
    ProjectTranslationBundle,
    RankingItemSource,
    RankingItemTranslationBundle,
    SurveyQuestionOptionSource,
    SurveyQuestionSource,
    SurveyRevision,
    SurveyTranslationBundle,
)
from content_translation_worker.work_policy import (
    retry_delays_seconds,
    translation_target_languages,
)

EAGER_VISIBLE_PRIORITY_RANK = 1
log = logging.getLogger(__name__)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from sqlalchemy.sql.elements import ColumnElement

    from content_translation_worker.models import (
        SourceRevision,
        TranslationBundle,
        TranslationSource,
    )
    from content_translation_worker.translation import (
        ContentTranslationResult,
    )

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
NUMERIC_CHARACTER_REFERENCE_PATTERN = re.compile(
    r"&#(?:(?P<decimal>\d+)|[xX](?P<hexadecimal>[\da-fA-F]+));?"
)
BIDI_CHARACTER_REFERENCE_PATTERN = re.compile(r"&(?:lrm|rlm);", flags=re.IGNORECASE)
BASIC_HTML_ENTITY_PATTERN = re.compile(
    r"&#(?:(?P<decimal>\d+)|[xX](?P<hexadecimal>[\da-fA-F]+));?"
    r"|&(?P<named>amp|apos|gt|lt|nbsp|quot);",
    flags=re.IGNORECASE,
)
BIDI_CONTROL_CODE_POINTS = {
    0x061C,
    0x200E,
    0x200F,
    *range(0x202A, 0x202F),
    *range(0x2066, 0x206A),
}


def create_lease_token() -> uuid.UUID:
    return uuid.uuid4()


def remove_non_display_control_characters(value: str) -> str:
    without_literal_controls = "".join(
        character
        for character in value
        if not (
            ord(character) <= 0x08
            or 0x0B <= ord(character) <= 0x0C
            or 0x0E <= ord(character) <= 0x1F
            or 0x7F <= ord(character) <= 0x9F
            or ord(character) in BIDI_CONTROL_CODE_POINTS
        )
    )

    def remove_encoded_control(match: re.Match[str]) -> str:
        decimal = match.group("decimal")
        hexadecimal = match.group("hexadecimal")
        encoded_code_point = decimal if decimal is not None else hexadecimal
        if encoded_code_point is None:
            return match.group(0)
        normalized_code_point = encoded_code_point.lstrip("0") or "0"
        if len(normalized_code_point) > 4:
            return match.group(0)
        code_point = int(normalized_code_point, 10 if decimal is not None else 16)
        if (
            code_point <= 0x08
            or 0x0B <= code_point <= 0x0C
            or 0x0E <= code_point <= 0x1F
            or 0x7F <= code_point <= 0x9F
            or code_point in BIDI_CONTROL_CODE_POINTS
        ):
            return ""
        return match.group(0)

    return NUMERIC_CHARACTER_REFERENCE_PATTERN.sub(
        remove_encoded_control,
        BIDI_CHARACTER_REFERENCE_PATTERN.sub("", without_literal_controls),
    )


def sanitize_translated_html(value: str) -> str:
    return remove_non_display_control_characters(
        bleach.clean(
            remove_non_display_control_characters(value),
            tags=ALLOWED_TRANSLATED_HTML_TAGS,
            attributes={},
            strip=True,
        )
    )


def _normalize_counted_text(value: str) -> str:
    return re.sub(r"\n+", "\n", value).strip("\n")


def _decode_basic_html_entities(value: str) -> str:
    named_entities = {
        "amp": "&",
        "apos": "'",
        "gt": ">",
        "lt": "<",
        "nbsp": "\xa0",
        "quot": '"',
    }

    def decode_entity(match: re.Match[str]) -> str:
        named = match.group("named")
        if named is not None:
            return named_entities[named.lower()]
        decimal = match.group("decimal")
        hexadecimal = match.group("hexadecimal")
        encoded_code_point = decimal if decimal is not None else hexadecimal
        if encoded_code_point is None:
            return match.group(0)
        try:
            code_point = int(encoded_code_point, 10 if decimal is not None else 16)
            if code_point > 0x10FFFF or 0xD800 <= code_point <= 0xDFFF:
                return match.group(0)
            return chr(code_point)
        except ValueError:
            return match.group(0)

    return BASIC_HTML_ENTITY_PATTERN.sub(decode_entity, value)


def convert_html_to_counted_text(value: str) -> str:
    text_with_newlines = re.sub(
        r"</(?:p|li|div|h[1-6])>",
        "\n",
        value,
        flags=re.IGNORECASE,
    )
    text_with_newlines = re.sub(
        r"<br\s*/?>",
        "\n",
        text_with_newlines,
        flags=re.IGNORECASE,
    )
    plain_text = bleach.clean(
        text_with_newlines,
        tags=frozenset(),
        attributes={},
        strip=True,
    )
    return _normalize_counted_text(html.unescape(plain_text))


def convert_html_to_counted_text_fallback(value: str) -> str:
    text_with_newlines = re.sub(
        r"</(?:p|li|div|h[1-6])>",
        "\n",
        value,
        flags=re.IGNORECASE,
    )
    text_with_newlines = re.sub(
        r"<br\s*/?>",
        "\n",
        text_with_newlines,
        flags=re.IGNORECASE,
    )
    plain_text = re.sub(r"<[^>]*>", "", text_with_newlines)
    plain_text = re.sub(r"<[^>]*$", "", plain_text)
    return _normalize_counted_text(_decode_basic_html_entities(plain_text))


def html_to_counted_text(value: str) -> str:
    try:
        return convert_html_to_counted_text(value)
    except Exception:
        log.warning(
            "HTML-to-text conversion failed; using best-effort text (HTML length: %d)",
            len(value),
            exc_info=True,
        )
        return convert_html_to_counted_text_fallback(value)


@dataclass(frozen=True)
class TranslationSourceMetadata:
    source_language_code: SpokenLanguageCode | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None = None


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
        and source_metadata.source_language_provider == LanguageDetectionProvider.google_translate
        and current_source_language_provider in {None, LanguageDetectionProvider.lingua}
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
                    OpinionContent.source_language_provider == LanguageDetectionProvider.lingua,
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
                    RankingItemContent.source_language_provider == LanguageDetectionProvider.lingua,
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


class LostContentTranslationWorkLeaseError(RuntimeError):
    pass


def recover_expired_leases(session: Session) -> int:
    recovered_ids = session.scalars(
        update(ContentTranslationWork)
        .where(
            ContentTranslationWork.status == ContentTranslationWorkStatus.running,
            ContentTranslationWork.lease_expires_at < func.clock_timestamp(),
        )
        .values(
            status=ContentTranslationWorkStatus.pending,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            updated_at=func.now(),
        )
        .returning(ContentTranslationWork.id)
    )
    return len(list(recovered_ids))


def retry_failed_eager_work(
    session: Session,
    *,
    limit: int,
    initial_seconds: float,
    maximum_seconds: float,
) -> int:
    delays = retry_delays_seconds(initial_seconds=initial_seconds, maximum_seconds=maximum_seconds)
    due_attempts: list[ColumnElement[bool]] = []
    for index, delay in enumerate(delays):
        if len(delays) == 1:
            attempt_condition = true()
        elif index == len(delays) - 1:
            attempt_condition = ContentTranslationWork.attempt_count >= index + 1
        elif index == 0:
            attempt_condition = ContentTranslationWork.attempt_count <= 1
        else:
            attempt_condition = ContentTranslationWork.attempt_count == index + 1
        due_attempts.append(
            and_(
                attempt_condition,
                ContentTranslationWork.failed_at
                <= func.statement_timestamp() - timedelta(seconds=delay),
            )
        )
    retryable_ids = list(
        session.scalars(
            select(ContentTranslationWork.id)
            .where(
                and_(
                    ContentTranslationWork.status == ContentTranslationWorkStatus.failed,
                    ContentTranslationWork.priority_rank == EAGER_VISIBLE_PRIORITY_RANK,
                    or_(
                        ContentTranslationWork.last_error_code.is_(None),
                        ContentTranslationWork.last_error_code.not_in(
                            ["missing_source", "ineligible_source"]
                        ),
                    ),
                    ContentTranslationWork.failed_at.is_not(None),
                    or_(*due_attempts),
                )
            )
            .order_by(ContentTranslationWork.failed_at.asc(), ContentTranslationWork.id.asc())
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
    )
    if not retryable_ids:
        return 0

    updated_ids = session.scalars(
        update(ContentTranslationWork)
        .where(
            ContentTranslationWork.id.in_(retryable_ids),
            ContentTranslationWork.status == ContentTranslationWorkStatus.failed,
        )
        .values(
            status=ContentTranslationWorkStatus.pending,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
        .returning(ContentTranslationWork.id)
    )
    return len(list(updated_ids))


def _source_revision_for_work_row(row: ContentTranslationWork) -> SourceRevision | None:
    if row.source_kind == ContentTranslationSourceKind.project:
        if row.project_content_id is None:
            return None
        return ContentRevision(
            kind=ContentTranslationSourceKind.project, content_id=row.project_content_id
        )
    if row.source_kind == ContentTranslationSourceKind.conversation:
        if row.conversation_content_id is None:
            return None
        return ContentRevision(
            kind=ContentTranslationSourceKind.conversation, content_id=row.conversation_content_id
        )
    if row.source_kind == ContentTranslationSourceKind.opinion:
        if row.opinion_content_id is None:
            return None
        return ContentRevision(
            kind=ContentTranslationSourceKind.opinion, content_id=row.opinion_content_id
        )
    if row.source_kind == ContentTranslationSourceKind.ranking_item:
        if row.ranking_item_content_id is None:
            return None
        return ContentRevision(
            kind=ContentTranslationSourceKind.ranking_item, content_id=row.ranking_item_content_id
        )
    if row.survey_question_content_id is None or row.survey_question_option_content_ids is None:
        return None
    return SurveyRevision(
        content_id=row.survey_question_content_id,
        option_content_ids=tuple(row.survey_question_option_content_ids),
    )


def claim_content_translation_work(
    session: Session,
    *,
    worker_id: str,
    work_ids: list[int] | None,
    candidate_limit: int,
    lease_ttl_seconds: int,
) -> ClaimedContentTranslationWork | None:
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
                    ContentTranslationWork.source_kind != ContentTranslationSourceKind.conversation,
                    Conversation.current_content_id
                    == ContentTranslationWork.conversation_content_id,
                ),
            ),
        ),
    ]
    if work_ids is not None:
        if not work_ids:
            return None
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
        .limit(candidate_limit)
    )

    for row, conversation_slug_id in rows:
        source_revision = _source_revision_for_work_row(row)
        if source_revision is None:
            continue
        targets = translation_target_languages(row.display_language_code)
        # This lock covers only the short claim transaction. Durable row leases
        # coordinate execution after commit, including requests for either script.
        if len(targets) > 1:
            source_key = f"{source_revision.kind.value}:{source_revision.content_id}"
            if isinstance(source_revision, SurveyRevision):
                source_key += ":" + ",".join(
                    str(content_id) for content_id in source_revision.option_content_ids
                )
            locked = session.scalar(
                select(
                    func.pg_try_advisory_xact_lock(
                        func.hashtextextended(
                            f"content_translation:{source_key}:{targets[0].value}", 0
                        )
                    )
                )
            )
            if locked is not True:
                continue
        for target in targets:
            if target == row.display_language_code:
                continue
            session.execute(
                pg_insert(ContentTranslationWork)
                .values(
                    conversation_id=row.conversation_id,
                    source_kind=row.source_kind,
                    project_content_id=row.project_content_id,
                    conversation_content_id=row.conversation_content_id,
                    opinion_content_id=row.opinion_content_id,
                    survey_question_content_id=row.survey_question_content_id,
                    survey_question_option_content_ids=row.survey_question_option_content_ids,
                    ranking_item_content_id=row.ranking_item_content_id,
                    display_language_code=target,
                    priority_rank=row.priority_rank,
                    status=ContentTranslationWorkStatus.pending,
                    created_at=func.now(),
                    updated_at=func.now(),
                )
                .on_conflict_do_nothing()
            )
        group = list(
            session.scalars(
                select(ContentTranslationWork)
                .where(
                    ContentTranslationWork.source_kind == row.source_kind,
                    _work_source_condition(source_revision),
                    ContentTranslationWork.display_language_code.in_(targets),
                )
                .order_by(ContentTranslationWork.id)
                .with_for_update(skip_locked=True)
                .execution_options(populate_existing=True)
            )
        )
        if len(group) != len(targets) or any(
            member.status == ContentTranslationWorkStatus.running for member in group
        ):
            continue
        if not any(member.status == ContentTranslationWorkStatus.pending for member in group):
            continue
        lease_token = create_lease_token()
        next_attempt_count = max(member.attempt_count for member in group) + 1
        session.execute(
            update(ContentTranslationWork)
            .where(ContentTranslationWork.id.in_([member.id for member in group]))
            .values(
                status=ContentTranslationWorkStatus.running,
                attempt_count=next_attempt_count,
                lease_owner=worker_id,
                lease_token=lease_token,
                lease_expires_at=func.clock_timestamp() + timedelta(seconds=lease_ttl_seconds),
                updated_at=func.now(),
            )
        )
        return ClaimedContentTranslationWork(
            conversation_slug_id=conversation_slug_id,
            source_revision=source_revision,
            display_language_code=row.display_language_code,
            lease_token=lease_token,
            work_ids=(row.id, *(member.id for member in group if member.id != row.id)),
        )
    return None


def _work_source_condition(revision: SourceRevision) -> ColumnElement[bool]:
    if isinstance(revision, SurveyRevision):
        return and_(
            ContentTranslationWork.survey_question_content_id == revision.content_id,
            ContentTranslationWork.survey_question_option_content_ids
            == list(revision.option_content_ids),
        )
    columns = {
        ContentTranslationSourceKind.project: ContentTranslationWork.project_content_id,
        ContentTranslationSourceKind.conversation: ContentTranslationWork.conversation_content_id,
        ContentTranslationSourceKind.opinion: ContentTranslationWork.opinion_content_id,
        ContentTranslationSourceKind.ranking_item: ContentTranslationWork.ranking_item_content_id,
    }
    return columns[revision.kind] == revision.content_id


def prepare_claimed_work(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
) -> PreparedContentTranslation | ProcessWorkResult:
    lock_active_claim(session, claim=claim)
    if claim.source_kind == ContentTranslationSourceKind.opinion:
        eligibility = _get_opinion_source_eligibility(
            session,
            opinion_content_id=claim.source_revision.content_id,
        )
        if eligibility == "hidden" or eligibility == "deleted_author":
            _mark_ineligible_source(session, claim=claim, reason=eligibility)
            return ProcessWorkResult(work_id=claim.id, status="ineligible_source")
    source = _fetch_claim_source(session, claim=claim)
    if source is None:
        _mark_missing_source(session, claim=claim)
        return ProcessWorkResult(work_id=claim.id, status="missing_source")
    if all(
        _has_fresh_translation(
            session, claim=replace(claim, display_language_code=target), source=source
        )
        for target in translation_target_languages(claim.display_language_code)
    ):
        _mark_completed(session, claim=claim)
        return ProcessWorkResult(work_id=claim.id, status="completed")
    return PreparedContentTranslation(claim=claim, source=source)


def _fetch_claim_source(
    session: Session, *, claim: ClaimedContentTranslationWork
) -> TranslationSource | None:
    revision = claim.source_revision
    if isinstance(revision, SurveyRevision):
        return _fetch_survey_question_source(
            session,
            survey_question_content_id=revision.content_id,
            survey_question_option_content_ids=revision.option_content_ids,
        )
    match revision.kind:
        case ContentTranslationSourceKind.project:
            return _fetch_project_source(session, project_content_id=revision.content_id)
        case ContentTranslationSourceKind.conversation:
            return _fetch_conversation_source(session, conversation_content_id=revision.content_id)
        case ContentTranslationSourceKind.opinion:
            return _fetch_opinion_source(session, opinion_content_id=revision.content_id)
        case ContentTranslationSourceKind.ranking_item:
            return _fetch_ranking_item_source(session, ranking_item_content_id=revision.content_id)


def _has_fresh_translation(
    session: Session, *, claim: ClaimedContentTranslationWork, source: TranslationSource
) -> bool:
    if isinstance(source, ProjectSource):
        return _has_fresh_project_translation(session, claim=claim, source=source)
    if isinstance(source, ConversationSource):
        return _has_fresh_conversation_translation(session, claim=claim, source=source)
    if isinstance(source, OpinionSource):
        return _has_fresh_opinion_translation(session, claim=claim, source=source)
    if isinstance(source, RankingItemSource):
        return _has_fresh_ranking_item_translation(session, claim=claim, source=source)
    return _has_fresh_survey_question_translation(session, claim=claim, source=source)


def publish_translation_bundle(
    session: Session, *, claim: ClaimedContentTranslationWork, bundle: TranslationBundle
) -> ProcessWorkResult:
    prepared = prepare_claimed_work(session, claim=claim)
    if isinstance(prepared, ProcessWorkResult):
        return prepared
    if prepared.source != bundle.source:
        _update_claimed_work(
            session,
            claim=claim,
            values={
                "status": ContentTranslationWorkStatus.pending,
                "lease_owner": None,
                "lease_token": None,
                "lease_expires_at": None,
                "updated_at": func.now(),
            },
        )
        return ProcessWorkResult(work_id=claim.id, status="source_changed")
    if isinstance(bundle, ConversationTranslationBundle):
        _persist_conversation_translation(session, bundle=bundle)
    elif isinstance(bundle, ProjectTranslationBundle):
        _persist_project_translation(session, bundle=bundle)
    elif isinstance(bundle, OpinionTranslationBundle):
        _persist_opinion_translation(session, bundle=bundle)
    elif isinstance(bundle, RankingItemTranslationBundle):
        _persist_ranking_item_translation(session, bundle=bundle)
    else:
        _persist_survey_translation(session, bundle=bundle)
    _mark_completed(session, claim=claim)
    return ProcessWorkResult(work_id=claim.id, status="completed")


def fail_claimed_work(
    session: Session, *, claim: ClaimedContentTranslationWork, error_type: str
) -> ProcessWorkResult:
    lock_active_claim(session, claim=claim)
    source = _fetch_claim_source(session, claim=claim)
    _mark_failed(
        session,
        claim=claim,
        error_code=error_type,
        error_message="Translation attempt failed; see worker phase and error type in logs",
    )
    if source is not None:
        for target in translation_target_languages(claim.display_language_code):
            if isinstance(source, ProjectSource):
                _insert_project_translation_event(
                    session, source=source, target_language_code=target.value, status="failed"
                )
            elif isinstance(source, ConversationSource):
                _insert_conversation_translation_event(
                    session, source=source, target_language_code=target.value, status="failed"
                )
            elif isinstance(source, OpinionSource):
                _insert_opinion_translation_event(
                    session, source=source, target_language_code=target.value, status="failed"
                )
            elif isinstance(source, RankingItemSource):
                _insert_ranking_item_translation_event(
                    session, source=source, target_language_code=target.value, status="failed"
                )
            else:
                _insert_survey_question_translation_event(
                    session, source=source, target_language_code=target.value, status="failed"
                )
    return ProcessWorkResult(work_id=claim.id, status="failed")


def lock_active_claim(session: Session, *, claim: ClaimedContentTranslationWork) -> None:
    ids = list(
        session.scalars(
            select(ContentTranslationWork.id)
            .where(
                ContentTranslationWork.id.in_(claim.work_ids),
                ContentTranslationWork.status == ContentTranslationWorkStatus.running,
                ContentTranslationWork.lease_token == claim.lease_token,
                ContentTranslationWork.lease_expires_at > func.clock_timestamp(),
            )
            .order_by(ContentTranslationWork.id)
            .with_for_update()
        )
    )
    if len(ids) != len(claim.work_ids):
        raise LostContentTranslationWorkLeaseError(f"Lost translation lease work_id={claim.id}")


def heartbeat_claim(
    session: Session, *, claim: ClaimedContentTranslationWork, lease_ttl_seconds: int
) -> None:
    lock_active_claim(session, claim=claim)
    _update_claimed_work(
        session,
        claim=claim,
        values={
            "lease_expires_at": func.clock_timestamp() + timedelta(seconds=lease_ttl_seconds),
            "updated_at": func.now(),
        },
    )


OpinionSourceEligibility = Literal["eligible", "hidden", "deleted_author", "missing"]


def _fetch_project_source(
    session: Session,
    *,
    project_content_id: int,
) -> ProjectSource | None:
    row = session.execute(
        select(
            Project.id.label("project_id"),
            Project.slug.label("project_slug"),
            ProjectContent.id,
            ProjectContent.public_id,
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
        project_slug=row.project_slug,
        content_id=row.id,
        public_id=row.public_id,
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
        .select_from(OpinionContent)
        .join(Opinion, Opinion.id == OpinionContent.opinion_id)
        .join(User, User.id == Opinion.author_id)
        .join(Conversation, Conversation.id == Opinion.conversation_id)
        .where(
            and_(
                OpinionContent.id == opinion_content_id,
                Opinion.current_content_id.is_not(None),
                Conversation.current_content_id.is_not(None),
                Conversation.is_importing.is_(False),
                User.is_deleted.is_(False),
                ~select(OpinionModeration.id)
                .where(
                    and_(
                        OpinionModeration.opinion_id == Opinion.id,
                        OpinionModeration.moderation_action == OpinionModerationAction.hide,
                        OpinionModeration.deleted_at.is_(None),
                    )
                )
                .exists(),
                or_(
                    Opinion.current_content_id == OpinionContent.id,
                    select(AnalysisSnapshotOpinion.id)
                    .join(
                        ConversationViewSnapshot,
                        ConversationViewSnapshot.analysis_snapshot_id
                        == AnalysisSnapshotOpinion.analysis_snapshot_id,
                    )
                    .where(
                        and_(
                            AnalysisSnapshotOpinion.opinion_content_id == OpinionContent.id,
                            AnalysisSnapshotOpinion.opinion_id == Opinion.id,
                            ConversationViewSnapshot.conversation_id == Conversation.id,
                            ConversationViewSnapshot.activated_at.is_not(None),
                        )
                    )
                    .exists(),
                ),
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


def _get_opinion_source_eligibility(
    session: Session,
    *,
    opinion_content_id: int,
) -> OpinionSourceEligibility:
    row = session.execute(
        select(
            User.is_deleted,
            select(OpinionModeration.id)
            .where(
                and_(
                    OpinionModeration.opinion_id == Opinion.id,
                    OpinionModeration.moderation_action == OpinionModerationAction.hide,
                    OpinionModeration.deleted_at.is_(None),
                )
            )
            .exists()
            .label("is_hidden"),
        )
        .select_from(OpinionContent)
        .join(Opinion, Opinion.id == OpinionContent.opinion_id)
        .join(User, User.id == Opinion.author_id)
        .where(OpinionContent.id == opinion_content_id)
        .limit(1)
    ).one_or_none()
    if row is None:
        return "missing"
    if row.is_deleted:
        return "deleted_author"
    if row.is_hidden:
        return "hidden"
    return "eligible"


def _fetch_survey_question_source(
    session: Session,
    *,
    survey_question_content_id: int,
    survey_question_option_content_ids: tuple[int, ...],
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
    current_option_content_ids = sorted(option.id for option in option_rows)
    if current_option_content_ids != sorted(survey_question_option_content_ids):
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
        options=tuple(
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
        ),
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
                ConversationContentTranslation.display_language_code == claim.display_language_code,
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
                ProjectContentTranslation.display_language_code == claim.display_language_code,
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
                SurveyQuestionContentTranslation.survey_question_content_id == source.content_id,
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
                RankingItemContentTranslation.display_language_code == claim.display_language_code,
            )
        )
    ).first()
    return row is not None and _translation_source_matches_current_source(
        translation_source_language_code=row.source_language_code,
        current_source_language_code=source.source_language_code,
    )


def _persist_conversation_translation(
    session: Session,
    *,
    bundle: ConversationTranslationBundle,
) -> None:
    source = bundle.source
    for translated in bundle.translations:
        display_language_code = translated.language
        title_result = translated.title
        body_result = translated.body
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


def _persist_project_translation(
    session: Session,
    *,
    bundle: ProjectTranslationBundle,
) -> None:
    source = bundle.source
    for translated in bundle.translations:
        display_language_code = translated.language
        title_result = translated.title
        subtitle_result = translated.subtitle
        body_result = translated.body
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
                        subtitle_result.translated_text if subtitle_result is not None else None
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
        _insert_project_translation_event(
            session,
            source=source,
            target_language_code=display_language_code.value,
            status="completed",
        )


def _persist_opinion_translation(
    session: Session,
    *,
    bundle: OpinionTranslationBundle,
) -> None:
    source = bundle.source
    source_decision = bundle.source_decision
    for localized_result in bundle.translations:
        translated_content = sanitize_translated_html(localized_result.result.translated_text)
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


def _persist_ranking_item_translation(
    session: Session,
    *,
    bundle: RankingItemTranslationBundle,
) -> None:
    source = bundle.source
    source_decision = bundle.source_decision
    for translated in bundle.translations:
        display_language_code = translated.language
        title_result = translated.title
        translated_title = sanitize_translated_html(title_result.translated_text)
        body_result = translated.body
        translated_body_html = (
            sanitize_translated_html(body_result.translated_text)
            if body_result is not None
            else None
        )
        translated_body_plain_text = (
            html_to_counted_text(translated_body_html) if translated_body_html is not None else None
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
            translated_title=translated_title,
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
                    "translated_title": translated_title,
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


def _persist_survey_translation(
    session: Session,
    *,
    bundle: SurveyTranslationBundle,
) -> None:
    source = bundle.source
    for translated in bundle.translations:
        display_language_code = translated.language
        question_result = translated.question
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

        for translated_option in translated.options:
            option = translated_option.source
            option_result = translated_option.result
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


def _insert_project_translation_event(
    session: Session,
    *,
    source: ProjectSource,
    target_language_code: str,
    status: Literal["completed", "failed"],
) -> None:
    timestamp_ms = int(datetime.now(UTC).timestamp() * 1000)
    _persist_translation_event(
        session,
        event_data=build_project_content_translation_event_data(
            project_slug=source.project_slug,
            target_language_code=target_language_code,
            status=status,
            source_version=source.public_id,
            timestamp_ms=timestamp_ms,
        ),
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


def _mark_ineligible_source(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    reason: Literal["hidden", "deleted_author"],
) -> None:
    error_message = (
        "Opinion is hidden" if reason == "hidden" else "Opinion author account is deleted"
    )
    _mark_failed(
        session,
        claim=claim,
        error_code="ineligible_source",
        error_message=error_message,
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


class ClaimedWorkUpdate(TypedDict, total=False):
    status: ContentTranslationWorkStatus
    lease_owner: str | None
    lease_token: uuid.UUID | None
    lease_expires_at: datetime | ColumnElement[datetime] | None
    completed_at: datetime | ColumnElement[datetime] | None
    failed_at: datetime | ColumnElement[datetime] | None
    last_error_code: str | None
    last_error_message: str | None
    updated_at: datetime | ColumnElement[datetime]


def _update_claimed_work(
    session: Session,
    *,
    claim: ClaimedContentTranslationWork,
    values: ClaimedWorkUpdate,
) -> None:
    updated_ids = list(
        session.scalars(
            update(ContentTranslationWork)
            .where(
                and_(
                    ContentTranslationWork.id.in_(claim.work_ids),
                    ContentTranslationWork.lease_token == claim.lease_token,
                )
            )
            .values(**values)
            .returning(ContentTranslationWork.id)
        )
    )
    if len(updated_ids) != len(claim.work_ids):
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
    _persist_translation_event(session, event_data=event_data)


def _persist_translation_event(
    session: Session,
    *,
    event_data: ContentTranslationEventData,
) -> None:
    event = RealtimeEventOutbox(
        event_type="content_translation_updated",
        payload=event_data.payload,
        created_at=datetime.now(UTC),
    )
    session.add(event)
    session.flush()
    session.add(RealtimeEventOutboxTopic(event_id=event.id, topic=event_data.topic))
