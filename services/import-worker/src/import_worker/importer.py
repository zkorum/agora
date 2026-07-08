from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, Protocol

from pydantic import BaseModel, TypeAdapter
from reddwarf.data_loader import Loader
from sqlalchemy import and_, case, desc, select, update
from sqlalchemy import insert as sqlalchemy_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert

from import_worker.csv_import import build_import_from_csv
from import_worker.generated_import_contracts import FailureReason
from import_worker.generated_models import (
    AnalysisWorkState,
    ContentTranslationSourceKind,
    ContentTranslationWork,
    ContentTranslationWorkStatus,
    Conversation,
    ConversationContent,
    ConversationImport,
    ConversationImportSource,
    ConversationTranslationTargetLanguage,
    ConversationViewSnapshot,
    ConversationViewSnapshotReasonEnum,
    DisplayLanguageCode,
    Notification,
    NotificationImport,
    Opinion,
    OpinionContent,
    OpinionGroupSpec,
    OpinionModeration,
    PolisConversationConfig,
    User,
    Vote,
    VoteContent,
)
from import_worker.generated_shared_types import (
    MAX_LENGTH_CONVERSATION_BODY_HTML,
    MAX_LENGTH_OPINION_HTML_OUTPUT,
    MAX_LENGTH_TITLE,
)
from import_worker.html import html_to_counted_text, process_user_generated_html
from import_worker.ids import generate_random_slug_id, generate_uuid
from import_worker.import_models import ImportPolisResults
from import_worker.language_detection import (
    GoogleLanguageDetector,
    SourceLanguageHint,
    SourceLanguageMetadata,
    detect_source_language,
)
from import_worker.polis_url import extract_polis_id_from_url

if TYPE_CHECKING:
    import uuid
    from collections.abc import Iterable

    from sqlalchemy.orm import Session

    from import_worker.queue import ImportNotificationEvent, ImportRequest


class PolisLoader(Protocol):
    @property
    def report_id(self) -> object | None: ...

    @property
    def conversation_id(self) -> object | None: ...

    @property
    def conversation_data(self) -> object: ...

    @property
    def comments_data(self) -> object: ...

    @property
    def votes_data(self) -> object: ...

    def load_api_data_conversation(self) -> object: ...


class RedDwarfPolisLoader:
    def __init__(
        self,
        *,
        polis_id: str,
        request_timeout_seconds: float,
        data_source: str | None = None,
    ) -> None:
        if data_source is None:
            self._loader: Any = TimeoutRedDwarfLoader(
                polis_id=polis_id,
                request_timeout_seconds=request_timeout_seconds,
            )
        else:
            self._loader = TimeoutRedDwarfLoader(
                polis_id=polis_id,
                data_source=data_source,
                request_timeout_seconds=request_timeout_seconds,
            )

    @property
    def report_id(self) -> object | None:
        value = self._loader.report_id
        return value if value is not None else None

    @property
    def conversation_id(self) -> object | None:
        value = self._loader.conversation_id
        return value if value is not None else None

    @property
    def conversation_data(self) -> object:
        return self._loader.conversation_data

    @property
    def comments_data(self) -> object:
        return self._loader.comments_data

    @property
    def votes_data(self) -> object:
        return self._loader.votes_data

    def load_api_data_conversation(self) -> object:
        return self._loader.load_api_data_conversation()


class TimeoutRedDwarfLoader(Loader):
    _request_timeout_seconds: float

    def __init__(
        self,
        *,
        polis_id: str,
        request_timeout_seconds: float,
        data_source: str | None = None,
    ) -> None:
        self._request_timeout_seconds = request_timeout_seconds
        loader_init: Any = vars(Loader)["__init__"]
        if data_source is None:
            loader_init(self, polis_id=polis_id)
        else:
            loader_init(self, polis_id=polis_id, data_source=data_source)

    def init_http_client(self) -> None:
        super().init_http_client()
        session: Any = self.session
        original_request = session.request
        request_timeout_seconds = self._request_timeout_seconds

        def request_with_timeout(method: str, url: str, **kwargs: Any) -> Any:
            kwargs.setdefault("timeout", request_timeout_seconds)
            return original_request(method, url, **kwargs)

        session.request = request_with_timeout


LOGGER = logging.getLogger(__name__)
CHUNK_SIZE = 1000


@dataclass(frozen=True)
class AnalysisQueueSchedule:
    conversation_id: int
    conversation_slug_id: str
    enqueued_at_ms: int


@dataclass(frozen=True)
class ContentTranslationQueueSchedule:
    work_ids: list[int]
    enqueued_at_ms: int


@dataclass(frozen=True)
class ImportProcessResult:
    event: ImportNotificationEvent | None
    analysis_schedule: AnalysisQueueSchedule | None
    content_translation_schedule: ContentTranslationQueueSchedule | None


@dataclass(frozen=True)
class ConversationIds:
    conversation_slug_id: str
    conversation_id: int
    conversation_content_id: int
    conversation_source_language_code: str | None
    content_language_hints: list[SourceLanguageHint]


@dataclass(frozen=True)
class SeedOpinionContentSource:
    content_id: int
    source_language_code: str | None


@dataclass(frozen=True)
class ParticipantData:
    user_id_per_participant_id: dict[int, uuid.UUID]
    participant_count: int
    vote_count: int
    opinion_count: int
    total_participant_count: int
    total_vote_count: int
    total_opinion_count: int
    moderated_opinion_count: int
    hidden_opinion_count: int


@dataclass(frozen=True)
class OpinionInsertData:
    opinion_id_per_statement_id: dict[int, int]
    opinion_content_id_per_opinion_id: dict[int, int]
    seed_opinion_content_sources: list[SeedOpinionContentSource]


@dataclass(frozen=True)
class AnalysisSchedule:
    conversation_id: int
    should_enqueue_analysis: bool


class InsertedOpinionRow(BaseModel):
    id: int
    slug_id: str


class InsertedOpinionContentRow(BaseModel):
    id: int
    opinion_id: int


class InsertedVoteRow(BaseModel):
    id: int
    polis_vote_id: int | None


class InsertedVoteContentRow(BaseModel):
    id: int
    vote_id: int


INSERTED_OPINION_ROWS = TypeAdapter(list[InsertedOpinionRow])
INSERTED_OPINION_CONTENT_ROWS = TypeAdapter(list[InsertedOpinionContentRow])
INSERTED_VOTE_ROWS = TypeAdapter(list[InsertedVoteRow])
INSERTED_VOTE_CONTENT_ROWS = TypeAdapter(list[InsertedVoteContentRow])


def now_zero_ms() -> datetime:
    return datetime.now(UTC).replace(microsecond=0, tzinfo=None)


def _elapsed_ms(started_at: float) -> float:
    return (time.perf_counter() - started_at) * 1000


def _chunks[T](items: list[T], chunk_size: int) -> Iterable[list[T]]:
    for index in range(0, len(items), chunk_size):
        yield items[index : index + chunk_size]


def _truncate_with_ellipsis(value: str, *, max_length: int, ellipsis: str) -> str:
    if len(value) <= max_length:
        return value
    return f"{value[: max_length - len(ellipsis)]}{ellipsis}"


def _timestamp_from_polis(value: int | float | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromtimestamp(value / 1000, UTC).replace(tzinfo=None)


def _display_language_code_or_none(language_code: str | None) -> DisplayLanguageCode | None:
    if language_code is None:
        return None
    try:
        return DisplayLanguageCode(language_code)
    except ValueError:
        return None


def import_translation_target_language_codes(
    *,
    detected_language_code: str | None,
    manual_language_codes: Iterable[DisplayLanguageCode],
    effective_language_codes: Iterable[DisplayLanguageCode],
    policy_source: str,
) -> list[DisplayLanguageCode]:
    if policy_source == "project_inherited":
        return list(dict.fromkeys(effective_language_codes))[:3]

    target_languages = list(manual_language_codes)
    detected_display_language_code = _display_language_code_or_none(detected_language_code)
    if detected_display_language_code is not None:
        target_languages = [detected_display_language_code, *target_languages]
    return list(dict.fromkeys(target_languages))[:3]


def _build_imported_polis_conversation(
    request: ImportRequest,
    *,
    polis_fetch_timeout_seconds: float,
) -> tuple[ImportPolisResults, str]:
    load_started_at = time.perf_counter()
    if request.type == "csv":
        imported = build_import_from_csv(request.files.model_dump(by_alias=True))
        LOGGER.info(
            "Loaded import source importSlugId=%s importType=csv comments=%s votes=%s "
            "durationMs=%.1f",
            request.import_slug_id,
            len(imported.comments_data),
            len(imported.votes_data),
            _elapsed_ms(load_started_at),
        )
        return imported, "csv"

    polis_id = extract_polis_id_from_url(request.polis_url)
    loader: PolisLoader
    if polis_id.report_id is not None:
        loader = RedDwarfPolisLoader(
            polis_id=polis_id.report_id,
            data_source="csv_export",
            request_timeout_seconds=polis_fetch_timeout_seconds,
        )
        loader.load_api_data_conversation()
        polis_url_type = "report"
    elif polis_id.conversation_id is not None:
        loader = RedDwarfPolisLoader(
            polis_id=polis_id.conversation_id,
            request_timeout_seconds=polis_fetch_timeout_seconds,
        )
        polis_url_type = "conversation"
    else:
        raise ValueError("Incorrect Polis URL")

    imported = ImportPolisResults.model_validate(
        {
            "report_id": loader.report_id,
            "conversation_id": loader.conversation_id,
            "conversation_data": loader.conversation_data,
            "comments_data": loader.comments_data,
            "votes_data": loader.votes_data,
        },
    )
    LOGGER.info(
        "Loaded import source importSlugId=%s importType=url polisUrlType=%s comments=%s "
        "votes=%s durationMs=%.1f",
        request.import_slug_id,
        polis_url_type,
        len(imported.comments_data),
        len(imported.votes_data),
        _elapsed_ms(load_started_at),
    )
    return imported, polis_url_type


def _conversation_urls(
    *,
    request: ImportRequest,
    imported: ImportPolisResults,
    polis_url_type: str,
) -> tuple[str | None, str | None]:
    if request.type == "csv":
        return imported.conversation_data.link_url, None

    if polis_url_type == "conversation":
        report_url = None
        if imported.report_id is not None:
            report_url = f"https://pol.is/report/{imported.report_id}"
        return request.polis_url, report_url

    conversation_url = imported.conversation_data.link_url
    if conversation_url is None and imported.conversation_data.conversation_id is not None:
        conversation_url = f"https://pol.is/{imported.conversation_data.conversation_id}"
    return conversation_url, request.polis_url


def _create_conversation(
    session: Session,
    *,
    request: ImportRequest,
    imported: ImportPolisResults,
    polis_url_type: str,
    google_detector: GoogleLanguageDetector | None,
) -> ConversationIds:
    conversation_url, report_url = _conversation_urls(
        request=request,
        imported=imported,
        polis_url_type=polis_url_type,
    )
    preferred_opinion_group_count = request.form_data.preferred_opinion_group_count
    now = now_zero_ms()
    title = imported.conversation_data.topic
    if len(title.strip()) == 0:
        title = "[No title] Imported conversation"
    title = _truncate_with_ellipsis(title, max_length=MAX_LENGTH_TITLE, ellipsis=" [...]")
    body = _truncate_with_ellipsis(
        imported.conversation_data.description,
        max_length=MAX_LENGTH_CONVERSATION_BODY_HTML,
        ellipsis=" [...].",
    )
    body = process_user_generated_html(body, enable_links=True, mode="input")
    body_plain_text = html_to_counted_text(body)
    detected_language_metadata = detect_source_language(
        f"{title}\n{body_plain_text}",
        google_detector=google_detector,
    )
    content_source_language_code = detected_language_metadata.language_code
    content_source_language_confidence = detected_language_metadata.confidence
    content_language_hints: list[SourceLanguageHint] = []
    conversation_slug_id = generate_random_slug_id()
    import_url = request.polis_url if request.type == "url" else None
    language_target_policy = request.form_data.language_target_policy

    polis_config_row = session.execute(
        sqlalchemy_insert(PolisConversationConfig)
        .values(
            ai_labeling_enabled=request.form_data.ai_labeling_enabled,
            preferred_opinion_group_count=None
            if preferred_opinion_group_count is None
            else preferred_opinion_group_count.root,
            created_at=now,
            updated_at=now,
        )
        .returning(PolisConversationConfig.id),
    ).first()
    if polis_config_row is None:
        raise RuntimeError("Failed to create Polis conversation config")

    conversation_row = session.execute(
        sqlalchemy_insert(Conversation)
        .values(
            slug_id=conversation_slug_id,
            project_id=request.project_id,
            is_indexed=request.form_data.is_indexed,
            participation_mode=request.form_data.participation_mode.value,
            conversation_type="polis",
            polis_config_id=polis_config_row.id,
            is_importing=True,
            requires_event_ticket=request.form_data.requires_event_ticket,
            current_content_id=None,
            created_at=now,
            updated_at=now,
            last_reacted_at=now,
            dynamic_translation_enabled=language_target_policy.dynamic_translation_enabled,
            language_settings_source=language_target_policy.source,
        )
        .returning(Conversation.id),
    ).first()
    if conversation_row is None:
        raise RuntimeError("Failed to create conversation")
    conversation_id = conversation_row.id

    session.execute(
        sqlalchemy_insert(ConversationImportSource).values(
            conversation_id=conversation_id,
            import_url=import_url,
            import_conversation_url=conversation_url,
            import_export_url=report_url,
            import_created_at=_timestamp_from_polis(imported.conversation_data.created),
            import_author=imported.conversation_data.ownername,
            import_method=request.type,
            created_at=now,
            updated_at=now,
        ),
    )

    content_row = session.execute(
        sqlalchemy_insert(ConversationContent)
        .values(
            conversation_id=conversation_id,
            title=title,
            body=body,
            body_plain_text=body_plain_text,
            source_language_code=content_source_language_code,
            source_raw_language_code=detected_language_metadata.raw_language_code,
            source_language_provider=detected_language_metadata.provider,
            source_language_confidence=content_source_language_confidence,
        )
        .returning(ConversationContent.id),
    ).first()
    if content_row is None:
        raise RuntimeError("Failed to create conversation content")
    conversation_content_id = content_row.id

    session.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(current_content_id=conversation_content_id),
    )
    manual_language_codes: list[DisplayLanguageCode] = []
    effective_language_codes: list[DisplayLanguageCode] = []
    if language_target_policy.source == "conversation_override":
        manual_language_codes = [
            DisplayLanguageCode(language_code.value)
            for language_code in language_target_policy.manual_target_language_codes
        ]
    else:
        effective_language_codes = [
            DisplayLanguageCode(language_code.value)
            for language_code in language_target_policy.effective_target_language_codes
        ]
    target_languages = import_translation_target_language_codes(
        detected_language_code=content_source_language_code,
        manual_language_codes=manual_language_codes,
        effective_language_codes=effective_language_codes,
        policy_source=language_target_policy.source,
    )
    if target_languages:
        session.execute(
            sqlalchemy_insert(ConversationTranslationTargetLanguage),
            [
                {
                    "conversation_id": conversation_id,
                    "language_code": language_code,
                    "created_at": now,
                }
                for language_code in target_languages
            ],
        )
    session.commit()
    return ConversationIds(
        conversation_slug_id=conversation_slug_id,
        conversation_id=conversation_id,
        conversation_content_id=conversation_content_id,
        conversation_source_language_code=content_source_language_code,
        content_language_hints=content_language_hints,
    )


def _insert_imported_users(
    session: Session,
    *,
    imported: ImportPolisResults,
    conversation_slug_id: str,
) -> ParticipantData:
    participant_ids = sorted(
        {
            *[comment.participant_id for comment in imported.comments_data],
            *[vote.participant_id for vote in imported.votes_data],
        },
    )
    user_id_per_participant_id = {
        participant_id: generate_uuid() for participant_id in participant_ids
    }
    session.execute(
        sqlalchemy_insert(User),
        [
            {
                "id": user_id_per_participant_id[participant_id],
                "username": f"ext_{conversation_slug_id}_{participant_id}",
                "first_name": f"ext_{conversation_slug_id}_{participant_id}",
                "is_imported": True,
            }
            for participant_id in participant_ids
        ],
    )

    moderated_statement_ids = {
        comment.statement_id for comment in imported.comments_data if comment.moderated == -1
    }
    participant_ids_from_unmoderated_votes = [
        vote.participant_id
        for vote in imported.votes_data
        if vote.statement_id not in moderated_statement_ids
    ]
    participant_ids_from_all_votes = [vote.participant_id for vote in imported.votes_data]
    participant_count = len(set(participant_ids_from_unmoderated_votes))
    vote_count = len(participant_ids_from_unmoderated_votes)
    opinion_count = len(imported.comments_data) - len(moderated_statement_ids)
    if participant_count != imported.conversation_data.participant_count:
        participant_count_for_all_votes = len(set(participant_ids_from_all_votes))
        LOGGER.warning(
            "[Import] Calculated participantCount=%s but Polis returned %s. "
            "ParticipantCountIncludingModerated=%s",
            participant_count,
            imported.conversation_data.participant_count,
            participant_count_for_all_votes,
        )
    session.commit()
    return ParticipantData(
        user_id_per_participant_id=user_id_per_participant_id,
        participant_count=participant_count,
        vote_count=vote_count,
        opinion_count=opinion_count,
        total_participant_count=len(set(participant_ids_from_all_votes)),
        total_vote_count=len(imported.votes_data),
        total_opinion_count=len(imported.comments_data),
        moderated_opinion_count=len(moderated_statement_ids),
        hidden_opinion_count=0,
    )


def imported_opinion_source_language_metadata(
    *,
    content_plain_text: str,
    is_seed: bool,
    content_language_hints: list[SourceLanguageHint],
    google_detector: GoogleLanguageDetector | None,
) -> SourceLanguageMetadata:
    return detect_source_language(
        content_plain_text,
        google_detector=google_detector if is_seed else None,
        language_hints=content_language_hints,
    )


def _insert_opinions(
    session: Session,
    *,
    imported: ImportPolisResults,
    conversation_ids: ConversationIds,
    participant_data: ParticipantData,
    google_detector: GoogleLanguageDetector | None,
) -> OpinionInsertData:
    vote_counts_by_statement_id: dict[int, dict[str, int]] = {}
    for vote in imported.votes_data:
        counts = vote_counts_by_statement_id.setdefault(
            vote.statement_id,
            {"agrees": 0, "disagrees": 0, "passes": 0},
        )
        if vote.vote == 1:
            counts["agrees"] += 1
        elif vote.vote == -1:
            counts["disagrees"] += 1
        else:
            counts["passes"] += 1

    statement_id_per_opinion_slug_id: dict[str, int] = {}
    opinion_values: list[dict[str, Any]] = []
    for comment in imported.comments_data:
        opinion_slug_id = generate_random_slug_id()
        statement_id_per_opinion_slug_id[opinion_slug_id] = comment.statement_id
        counts = vote_counts_by_statement_id.get(
            comment.statement_id,
            {"agrees": 0, "disagrees": 0, "passes": 0},
        )
        opinion_values.append(
            {
                "slug_id": opinion_slug_id,
                "author_id": participant_data.user_id_per_participant_id[comment.participant_id],
                "current_content_id": None,
                "conversation_id": conversation_ids.conversation_id,
                "is_seed": comment.is_seed or False,
                "num_agrees": counts["agrees"],
                "num_disagrees": counts["disagrees"],
                "num_passes": counts["passes"],
            },
        )

    raw_inserted_opinion_rows: object = (
        session.execute(
            sqlalchemy_insert(Opinion)
            .values(opinion_values)
            .returning(Opinion.id, Opinion.slug_id),
        )
        .mappings()
        .all()
    )
    inserted_opinion_rows = INSERTED_OPINION_ROWS.validate_python(
        raw_inserted_opinion_rows,
    )
    opinion_id_per_statement_id = {
        statement_id_per_opinion_slug_id[row.slug_id]: row.id for row in inserted_opinion_rows
    }

    content_values: list[dict[str, Any]] = []
    source_language_code_per_opinion_id: dict[int, str | None] = {}
    for comment in imported.comments_data:
        content = process_user_generated_html(
            _truncate_with_ellipsis(
                comment.txt,
                max_length=MAX_LENGTH_OPINION_HTML_OUTPUT,
                ellipsis=" [...]",
            ),
            enable_links=True,
            mode="output",
        )
        content_plain_text = html_to_counted_text(content)
        opinion_id = opinion_id_per_statement_id[comment.statement_id]
        source_language_metadata = imported_opinion_source_language_metadata(
            content_plain_text=content_plain_text,
            is_seed=comment.is_seed or False,
            content_language_hints=conversation_ids.content_language_hints,
            google_detector=google_detector,
        )
        source_language_code_per_opinion_id[opinion_id] = (
            source_language_metadata.language_code
        )
        content_values.append(
            {
                "opinion_id": opinion_id,
                "conversation_content_id": conversation_ids.conversation_content_id,
                "content": content,
                "content_plain_text": content_plain_text,
                "source_language_code": source_language_metadata.language_code,
                "source_raw_language_code": source_language_metadata.raw_language_code,
                "source_language_provider": source_language_metadata.provider,
                "source_language_confidence": source_language_metadata.confidence,
            },
        )
    raw_inserted_content_rows: object = (
        session.execute(
            sqlalchemy_insert(OpinionContent)
            .values(content_values)
            .returning(OpinionContent.id, OpinionContent.opinion_id),
        )
        .mappings()
        .all()
    )
    inserted_content_rows = INSERTED_OPINION_CONTENT_ROWS.validate_python(
        raw_inserted_content_rows,
    )
    opinion_content_id_per_opinion_id = {row.opinion_id: row.id for row in inserted_content_rows}

    for chunk in _chunks(inserted_content_rows, CHUNK_SIZE):
        session.execute(
            update(Opinion)
            .where(Opinion.id.in_([row.opinion_id for row in chunk]))
            .values(
                current_content_id=case(
                    *[(Opinion.id == row.opinion_id, row.id) for row in chunk],
                    else_=Opinion.current_content_id,
                ),
                updated_at=now_zero_ms(),
            ),
        )

    moderated_values = [
        {
            "opinion_id": opinion_id_per_statement_id[comment.statement_id],
            "moderation_action": "move",
            "moderation_reason": "spam",
        }
        for comment in imported.comments_data
        if comment.moderated == -1
    ]
    if moderated_values:
        session.execute(sqlalchemy_insert(OpinionModeration), moderated_values)
    session.commit()
    seed_opinion_content_sources: list[SeedOpinionContentSource] = []
    for comment in imported.comments_data:
        if not comment.is_seed:
            continue
        opinion_id = opinion_id_per_statement_id[comment.statement_id]
        opinion_content_id = opinion_content_id_per_opinion_id[opinion_id]
        seed_opinion_content_sources.append(
            SeedOpinionContentSource(
                content_id=opinion_content_id,
                source_language_code=source_language_code_per_opinion_id[opinion_id],
            ),
        )

    return OpinionInsertData(
        opinion_id_per_statement_id=opinion_id_per_statement_id,
        opinion_content_id_per_opinion_id=opinion_content_id_per_opinion_id,
        seed_opinion_content_sources=seed_opinion_content_sources,
    )


def _insert_votes(
    session: Session,
    *,
    imported: ImportPolisResults,
    opinions: OpinionInsertData,
    participant_data: ParticipantData,
    conversation_slug_id: str,
) -> None:
    vote_values: list[dict[str, Any]] = []
    vote_content_inputs: dict[int, dict[str, Any]] = {}
    for polis_vote_id, vote in enumerate(imported.votes_data):
        opinion_id = opinions.opinion_id_per_statement_id[vote.statement_id]
        vote_values.append(
            {
                "author_id": participant_data.user_id_per_participant_id[vote.participant_id],
                "opinion_id": opinion_id,
                "current_content_id": None,
                "polis_vote_id": polis_vote_id,
            },
        )
        vote_content_inputs[polis_vote_id] = {
            "opinion_content_id": opinions.opinion_content_id_per_opinion_id[opinion_id],
            "vote": "agree" if vote.vote == 1 else "disagree" if vote.vote == -1 else "pass",
        }

    inserted_vote_rows: list[InsertedVoteRow] = []
    for chunk in _chunks(vote_values, CHUNK_SIZE):
        raw_inserted_vote_rows: object = (
            session.execute(
                sqlalchemy_insert(Vote).values(chunk).returning(Vote.id, Vote.polis_vote_id),
            )
            .mappings()
            .all()
        )
        inserted_vote_rows.extend(
            INSERTED_VOTE_ROWS.validate_python(raw_inserted_vote_rows),
        )

    vote_content_values: list[dict[str, Any]] = []
    for row in inserted_vote_rows:
        if row.polis_vote_id is None or row.polis_vote_id not in vote_content_inputs:
            raise RuntimeError(
                "[Import] Data is out of sync while importing "
                f"voteId={row.id}, polisVoteId={row.polis_vote_id} "
                f"with conversationSlugId={conversation_slug_id}",
            )
        vote_content_values.append({"vote_id": row.id, **vote_content_inputs[row.polis_vote_id]})

    inserted_vote_content_rows: list[InsertedVoteContentRow] = []
    for chunk in _chunks(vote_content_values, CHUNK_SIZE):
        raw_inserted_vote_content_rows: object = (
            session.execute(
                sqlalchemy_insert(VoteContent)
                .values(chunk)
                .returning(VoteContent.id, VoteContent.vote_id),
            )
            .mappings()
            .all()
        )
        inserted_vote_content_rows.extend(
            INSERTED_VOTE_CONTENT_ROWS.validate_python(raw_inserted_vote_content_rows),
        )

    for chunk in _chunks(inserted_vote_content_rows, CHUNK_SIZE):
        session.execute(
            update(Vote)
            .where(Vote.id.in_([row.vote_id for row in chunk]))
            .values(
                current_content_id=case(
                    *[(Vote.id == row.vote_id, row.id) for row in chunk],
                    else_=Vote.current_content_id,
                ),
                updated_at=now_zero_ms(),
            ),
        )
    session.commit()


def _create_content_translation_work(
    session: Session,
    *,
    conversation_ids: ConversationIds,
    opinions: OpinionInsertData,
) -> ContentTranslationQueueSchedule | None:
    target_rows = session.execute(
        select(
            Conversation.dynamic_translation_enabled,
            ConversationTranslationTargetLanguage.language_code.label(
                "target_language_code",
            ),
        )
        .select_from(Conversation)
        .outerjoin(
            ConversationTranslationTargetLanguage,
            ConversationTranslationTargetLanguage.conversation_id == Conversation.id,
        )
        .where(Conversation.id == conversation_ids.conversation_id)
        .order_by(ConversationTranslationTargetLanguage.id.asc()),
    ).all()
    first_target_row = target_rows[0] if target_rows else None
    if first_target_row is None or not first_target_row.dynamic_translation_enabled:
        return None
    target_language_codes = {
        row.target_language_code
        for row in target_rows
        if row.target_language_code is not None
    }
    if not target_language_codes:
        return None

    now = now_zero_ms()
    work_values: list[dict[str, object]] = []
    for language_code in target_language_codes:
        if (
            conversation_ids.conversation_source_language_code is None
            or language_code.value != conversation_ids.conversation_source_language_code
        ):
            work_values.append(
                {
                    "conversation_id": conversation_ids.conversation_id,
                    "source_kind": ContentTranslationSourceKind.conversation,
                    "conversation_content_id": conversation_ids.conversation_content_id,
                    "opinion_content_id": None,
                    "survey_question_content_id": None,
                    "survey_question_option_content_ids": None,
                    "display_language_code": language_code,
                    "status": ContentTranslationWorkStatus.pending,
                    "priority_rank": 1,
                    "requested_at": now,
                    "created_at": now,
                    "updated_at": now,
                },
            )
        for seed_opinion_source in opinions.seed_opinion_content_sources:
            if (
                seed_opinion_source.source_language_code is not None
                and language_code.value == seed_opinion_source.source_language_code
            ):
                continue
            work_values.append(
                {
                    "conversation_id": conversation_ids.conversation_id,
                    "source_kind": ContentTranslationSourceKind.opinion,
                    "conversation_content_id": None,
                    "opinion_content_id": seed_opinion_source.content_id,
                    "survey_question_content_id": None,
                    "survey_question_option_content_ids": None,
                    "display_language_code": language_code,
                    "status": ContentTranslationWorkStatus.pending,
                    "priority_rank": 1,
                    "requested_at": now,
                    "created_at": now,
                    "updated_at": now,
                },
            )

    if not work_values:
        return None

    work_rows = session.execute(
        sqlalchemy_insert(ContentTranslationWork)
        .values(work_values)
        .returning(ContentTranslationWork.id),
    ).all()
    work_ids = [row.id for row in work_rows]
    if not work_ids:
        return None
    return ContentTranslationQueueSchedule(
        work_ids=work_ids,
        enqueued_at_ms=int(now.timestamp() * 1000),
    )


def _update_counts_and_schedule(
    session: Session,
    *,
    conversation_id: int,
    participant_data: ParticipantData,
) -> AnalysisSchedule:
    now = now_zero_ms()
    conversation_row = session.execute(
        select(
            PolisConversationConfig.analysis_data_generation,
            Conversation.current_content_id,
            Conversation.is_closed,
        )
        .join(PolisConversationConfig, PolisConversationConfig.id == Conversation.polis_config_id)
        .where(Conversation.id == conversation_id)
        .with_for_update(),
    ).first()
    if conversation_row is None:
        raise RuntimeError(f"Missing imported conversation {conversation_id}")
    data_generation = conversation_row.analysis_data_generation + 1
    session.execute(
        update(PolisConversationConfig)
        .where(
            PolisConversationConfig.id
            == select(Conversation.polis_config_id)
            .where(Conversation.id == conversation_id)
            .scalar_subquery()
        )
        .values(
            analysis_data_generation=data_generation,
        ),
    )

    current_spec_ids = _current_opinion_group_spec_ids(session)

    if current_spec_ids:
        session.execute(
            pg_insert(AnalysisWorkState)
            .values(
                [
                    {
                        "conversation_id": conversation_id,
                        "opinion_group_spec_id": spec_id,
                        "dirty_since": now,
                        "updated_at": now,
                    }
                    for spec_id in current_spec_ids
                ],
            )
            .on_conflict_do_nothing(
                index_elements=["conversation_id", "opinion_group_spec_id"],
            ),
        )
        work_state_rows = session.execute(
            select(
                AnalysisWorkState.id,
                AnalysisWorkState.dirty_since,
                AnalysisWorkState.running_data_generation,
            )
            .where(
                and_(
                    AnalysisWorkState.conversation_id == conversation_id,
                    AnalysisWorkState.opinion_group_spec_id.in_(current_spec_ids),
                ),
            )
            .with_for_update(),
        ).all()
        for row in work_state_rows:
            session.execute(
                update(AnalysisWorkState)
                .where(AnalysisWorkState.id == row.id)
                .values(
                    dirty_since=row.dirty_since or now,
                    updated_at=now,
                ),
            )

    if current_spec_ids:
        session.execute(
            sqlalchemy_insert(ConversationViewSnapshot).values(
                [
                    {
                        "conversation_id": conversation_id,
                        "opinion_group_spec_id": spec_id,
                        "analysis_snapshot_id": None,
                        "survey_aggregate_snapshot_id": None,
                        "conversation_content_id": conversation_row.current_content_id,
                        "view_reason": (
                            ConversationViewSnapshotReasonEnum.conversation_lifecycle_updated
                        ),
                        "is_closed": conversation_row.is_closed,
                        "opinion_count": participant_data.opinion_count,
                        "vote_count": participant_data.vote_count,
                        "participant_count": participant_data.participant_count,
                        "total_opinion_count": participant_data.total_opinion_count,
                        "total_vote_count": participant_data.total_vote_count,
                        "total_participant_count": participant_data.total_participant_count,
                        "moderated_opinion_count": participant_data.moderated_opinion_count,
                        "hidden_opinion_count": participant_data.hidden_opinion_count,
                        "activated_at": now,
                        "created_at": now,
                    }
                    for spec_id in current_spec_ids
                ],
            ),
        )

    session.commit()
    return AnalysisSchedule(
        conversation_id=conversation_id,
        should_enqueue_analysis=bool(current_spec_ids) and participant_data.vote_count > 0,
    )


def _current_opinion_group_spec_ids(session: Session) -> list[int]:
    spec_rows = session.execute(
        select(OpinionGroupSpec.id, OpinionGroupSpec.key).order_by(
            OpinionGroupSpec.key,
            desc(OpinionGroupSpec.version),
        ),
    ).all()
    seen_keys: set[str] = set()
    current_spec_ids: list[int] = []
    for row in spec_rows:
        if row.key in seen_keys:
            continue
        seen_keys.add(row.key)
        current_spec_ids.append(row.id)
    return current_spec_ids


def _is_analysis_terminal_for_import(
    session: Session,
    *,
    conversation_id: int,
) -> bool:
    conversation_row = session.execute(
        select(PolisConversationConfig.analysis_data_generation)
        .join(Conversation, Conversation.polis_config_id == PolisConversationConfig.id)
        .where(Conversation.id == conversation_id),
    ).first()
    if conversation_row is None:
        return False

    current_spec_ids = _current_opinion_group_spec_ids(session)
    if not current_spec_ids:
        return True

    work_state_rows = session.execute(
        select(
            AnalysisWorkState.last_completed_data_generation,
            AnalysisWorkState.non_retryable_generation,
        ).where(
            and_(
                AnalysisWorkState.conversation_id == conversation_id,
                AnalysisWorkState.opinion_group_spec_id.in_(current_spec_ids),
            ),
        ),
    ).all()
    if len(work_state_rows) != len(current_spec_ids):
        return False

    data_generation = conversation_row.analysis_data_generation
    return all(
        row.last_completed_data_generation >= data_generation
        or (
            row.non_retryable_generation is not None
            and row.non_retryable_generation >= data_generation
        )
        for row in work_state_rows
    )


def complete_ready_imports(session: Session) -> list[ImportNotificationEvent]:
    from import_worker.queue import ImportNotificationEvent

    import_rows = session.execute(
        select(
            ConversationImport.id,
            ConversationImport.slug_id,
            ConversationImport.user_id,
            ConversationImport.conversation_id,
            Conversation.slug_id.label("conversation_slug_id"),
            ConversationContent.title.label("conversation_title"),
        )
        .join(Conversation, Conversation.id == ConversationImport.conversation_id)
        .join(ConversationContent, ConversationContent.id == Conversation.current_content_id)
        .where(
            and_(
                ConversationImport.status == "processing",
                ConversationImport.conversation_id.is_not(None),
            ),
        ),
    ).all()
    events: list[ImportNotificationEvent] = []
    for row in import_rows:
        conversation_id = row.conversation_id
        if conversation_id is None or not _is_analysis_terminal_for_import(
            session,
            conversation_id=conversation_id,
        ):
            continue

        now = now_zero_ms()
        session.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(is_importing=False),
        )
        session.execute(
            update(ConversationImport)
            .where(ConversationImport.id == row.id)
            .values(status="completed", updated_at=now),
        )
        (
            notification_slug_id,
            _,
            notification_created_at,
            notification_is_read,
        ) = _create_import_notification(
            session,
            user_id=row.user_id,
            import_id=row.id,
            conversation_id=conversation_id,
            notification_type="import_completed",
        )
        events.append(
            ImportNotificationEvent(
                type="import_notification",
                userId=str(row.user_id),
                notificationSlugId=notification_slug_id,
                notificationCreatedAt=notification_created_at.isoformat(),
                notificationIsRead=notification_is_read,
                importId=row.id,
                importSlugId=row.slug_id,
                conversationId=conversation_id,
                conversationSlugId=row.conversation_slug_id,
                conversationTitle=row.conversation_title,
                failureReason=None,
                broadcastNewConversation=True,
            ),
        )

    if events:
        session.commit()
    else:
        session.rollback()
    return events


def _soft_delete_imported_users_for_conversation(
    session: Session,
    *,
    conversation_id: int,
) -> None:
    users_from_opinions = session.execute(
        select(Opinion.author_id)
        .join(User, User.id == Opinion.author_id)
        .where(
            and_(
                Opinion.conversation_id == conversation_id,
                User.is_imported.is_(True),
                User.is_deleted.is_(False),
            ),
        )
        .distinct(),
    ).all()
    users_from_votes = session.execute(
        select(Vote.author_id)
        .join(Opinion, Opinion.id == Vote.opinion_id)
        .join(User, User.id == Vote.author_id)
        .where(
            and_(
                Opinion.conversation_id == conversation_id,
                User.is_imported.is_(True),
                User.is_deleted.is_(False),
            ),
        )
        .distinct(),
    ).all()
    user_ids = {row.author_id for row in users_from_opinions} | {
        row.author_id for row in users_from_votes
    }
    if not user_ids:
        return
    now = now_zero_ms()
    session.execute(
        update(User)
        .where(User.id.in_(user_ids))
        .values(is_deleted=True, deleted_at=now, updated_at=now),
    )


def _delete_imported_conversation(
    session: Session,
    *,
    conversation_id: int,
) -> None:
    conversation_row = session.execute(
        select(Conversation.current_content_id).where(Conversation.id == conversation_id),
    ).first()
    if conversation_row is None or conversation_row.current_content_id is None:
        return
    session.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(current_content_id=None),
    )
    session.execute(
        update(Opinion)
        .where(Opinion.conversation_id == conversation_id)
        .values(current_content_id=None),
    )


def _create_import_notification(
    session: Session,
    *,
    user_id: uuid.UUID,
    import_id: int,
    conversation_id: int | None,
    notification_type: str,
) -> tuple[str, int, datetime, bool]:
    notification_slug_id = generate_random_slug_id()
    notification_row = session.execute(
        sqlalchemy_insert(Notification)
        .values(slug_id=notification_slug_id, user_id=user_id, notification_type=notification_type)
        .returning(Notification.id, Notification.created_at, Notification.is_read),
    ).first()
    if notification_row is None:
        raise RuntimeError("Failed to create import notification")
    session.execute(
        sqlalchemy_insert(NotificationImport).values(
            notification_id=notification_row.id,
            import_id=import_id,
            conversation_id=conversation_id,
        ),
    )
    return (
        notification_slug_id,
        notification_row.id,
        notification_row.created_at,
        notification_row.is_read,
    )


def _get_import_user_id(session: Session, *, import_slug_id: str) -> uuid.UUID:
    row = session.execute(
        select(ConversationImport.user_id).where(
            ConversationImport.slug_id == import_slug_id,
        ),
    ).first()
    if row is None:
        raise RuntimeError(f"Import record not found for {import_slug_id}")
    return row.user_id


def google_detector_for_import(
    *,
    request: ImportRequest,
    google_detector: GoogleLanguageDetector | None,
) -> GoogleLanguageDetector | None:
    if request.form_data.language_target_policy.dynamic_translation_enabled:
        return google_detector
    return None


def process_import_request(
    session: Session,
    *,
    request: ImportRequest,
    google_detector: GoogleLanguageDetector | None = None,
    polis_fetch_timeout_seconds: float,
) -> ImportProcessResult:
    conversation_id: int | None = None
    import_started_at = time.perf_counter()
    try:
        import_user_id = _get_import_user_id(session, import_slug_id=request.import_slug_id)
        if str(import_user_id) != request.actor_user_id:
            raise RuntimeError(
                f"Import actor mismatch for {request.import_slug_id}: "
                f"payload actor {request.actor_user_id} does not match "
                f"import owner {import_user_id}",
            )

        imported, polis_url_type = _build_imported_polis_conversation(
            request,
            polis_fetch_timeout_seconds=polis_fetch_timeout_seconds,
        )
        active_google_detector = google_detector_for_import(
            request=request,
            google_detector=google_detector,
        )
        phase_started_at = time.perf_counter()
        conversation_ids = _create_conversation(
            session,
            request=request,
            imported=imported,
            polis_url_type=polis_url_type,
            google_detector=active_google_detector,
        )
        conversation_id = conversation_ids.conversation_id
        LOGGER.info(
            "Created imported conversation importSlugId=%s conversationSlugId=%s "
            "durationMs=%.1f",
            request.import_slug_id,
            conversation_ids.conversation_slug_id,
            _elapsed_ms(phase_started_at),
        )
        phase_started_at = time.perf_counter()
        participant_data = _insert_imported_users(
            session,
            imported=imported,
            conversation_slug_id=conversation_ids.conversation_slug_id,
        )
        LOGGER.info(
            "Inserted imported participants importSlugId=%s conversationSlugId=%s "
            "participants=%s totalParticipants=%s durationMs=%.1f",
            request.import_slug_id,
            conversation_ids.conversation_slug_id,
            participant_data.participant_count,
            participant_data.total_participant_count,
            _elapsed_ms(phase_started_at),
        )
        phase_started_at = time.perf_counter()
        opinions = _insert_opinions(
            session,
            imported=imported,
            conversation_ids=conversation_ids,
            participant_data=participant_data,
            google_detector=active_google_detector,
        )
        LOGGER.info(
            "Inserted imported statements importSlugId=%s conversationSlugId=%s "
            "statements=%s totalStatements=%s moderatedStatements=%s hiddenStatements=%s "
            "durationMs=%.1f",
            request.import_slug_id,
            conversation_ids.conversation_slug_id,
            participant_data.opinion_count,
            participant_data.total_opinion_count,
            participant_data.moderated_opinion_count,
            participant_data.hidden_opinion_count,
            _elapsed_ms(phase_started_at),
        )
        phase_started_at = time.perf_counter()
        _insert_votes(
            session,
            imported=imported,
            opinions=opinions,
            participant_data=participant_data,
            conversation_slug_id=conversation_ids.conversation_slug_id,
        )
        LOGGER.info(
            "Inserted imported votes importSlugId=%s conversationSlugId=%s votes=%s "
            "totalVotes=%s durationMs=%.1f",
            request.import_slug_id,
            conversation_ids.conversation_slug_id,
            participant_data.vote_count,
            participant_data.total_vote_count,
            _elapsed_ms(phase_started_at),
        )
        phase_started_at = time.perf_counter()
        content_translation_schedule = _create_content_translation_work(
            session,
            conversation_ids=conversation_ids,
            opinions=opinions,
        )
        LOGGER.info(
            "Created imported content translation work importSlugId=%s conversationSlugId=%s "
            "workCount=%s durationMs=%.1f",
            request.import_slug_id,
            conversation_ids.conversation_slug_id,
            0
            if content_translation_schedule is None
            else len(content_translation_schedule.work_ids),
            _elapsed_ms(phase_started_at),
        )
        phase_started_at = time.perf_counter()
        schedule = _update_counts_and_schedule(
            session,
            conversation_id=conversation_ids.conversation_id,
            participant_data=participant_data,
        )
        LOGGER.info(
            "Updated imported conversation counts importSlugId=%s conversationSlugId=%s "
            "shouldEnqueueAnalysis=%s durationMs=%.1f",
            request.import_slug_id,
            conversation_ids.conversation_slug_id,
            schedule.should_enqueue_analysis,
            _elapsed_ms(phase_started_at),
        )

        phase_started_at = time.perf_counter()
        session.execute(
            update(ConversationImport)
            .where(ConversationImport.slug_id == request.import_slug_id)
            .values(
                conversation_id=conversation_ids.conversation_id,
                updated_at=now_zero_ms(),
            ),
        )
        session.commit()
        LOGGER.info(
            "Finalized imported conversation row importSlugId=%s conversationSlugId=%s "
            "durationMs=%.1f totalDurationMs=%.1f",
            request.import_slug_id,
            conversation_ids.conversation_slug_id,
            _elapsed_ms(phase_started_at),
            _elapsed_ms(import_started_at),
        )
        analysis_queue_schedule = (
            AnalysisQueueSchedule(
                conversation_id=conversation_ids.conversation_id,
                conversation_slug_id=conversation_ids.conversation_slug_id,
                enqueued_at_ms=int(now_zero_ms().timestamp() * 1000),
            )
            if schedule.should_enqueue_analysis
            else None
        )
        return ImportProcessResult(
            event=None,
            analysis_schedule=analysis_queue_schedule,
            content_translation_schedule=content_translation_schedule,
        )
    except Exception:
        session.rollback()
        if conversation_id is not None:
            _delete_imported_conversation(session, conversation_id=conversation_id)
            _soft_delete_imported_users_for_conversation(session, conversation_id=conversation_id)
            session.commit()
        raise


def mark_import_failed(
    session: Session,
    *,
    import_slug_id: str,
    failure_reason: str,
) -> ImportNotificationEvent | None:
    from import_worker.queue import ImportNotificationEvent

    row = session.execute(
        select(ConversationImport.id, ConversationImport.slug_id, ConversationImport.user_id).where(
            ConversationImport.slug_id == import_slug_id,
        ),
    ).first()
    if row is None:
        session.rollback()
        return None
    session.execute(
        update(ConversationImport)
        .where(ConversationImport.slug_id == import_slug_id)
        .values(status="failed", failure_reason=failure_reason, updated_at=now_zero_ms()),
    )
    (
        notification_slug_id,
        _,
        notification_created_at,
        notification_is_read,
    ) = _create_import_notification(
        session,
        user_id=row.user_id,
        import_id=row.id,
        conversation_id=None,
        notification_type="import_failed",
    )
    session.commit()
    return ImportNotificationEvent(
        type="import_notification",
        userId=str(row.user_id),
        notificationSlugId=notification_slug_id,
        notificationCreatedAt=notification_created_at.isoformat(),
        notificationIsRead=notification_is_read,
        importId=row.id,
        importSlugId=row.slug_id,
        conversationId=None,
        conversationSlugId=None,
        conversationTitle=None,
        failureReason=FailureReason(failure_reason),
        broadcastNewConversation=False,
    )


def cleanup_stale_imports(
    session: Session,
    *,
    stale_threshold_ms: int,
) -> list[ImportNotificationEvent]:
    from import_worker.queue import ImportNotificationEvent

    stale_before = datetime.fromtimestamp(
        (datetime.now(UTC).timestamp() * 1000 - stale_threshold_ms) / 1000,
        UTC,
    ).replace(tzinfo=None)
    stale_rows = session.execute(
        select(ConversationImport.id, ConversationImport.slug_id, ConversationImport.user_id).where(
            and_(
                ConversationImport.status == "processing",
                ConversationImport.conversation_id.is_(None),
                ConversationImport.updated_at < stale_before,
            ),
        ),
    ).all()
    if not stale_rows:
        return []

    session.execute(
        update(ConversationImport)
        .where(
            and_(
                ConversationImport.status == "processing",
                ConversationImport.conversation_id.is_(None),
                ConversationImport.updated_at < stale_before,
            ),
        )
        .values(status="failed", failure_reason="timeout", updated_at=now_zero_ms()),
    )
    events: list[ImportNotificationEvent] = []
    for row in stale_rows:
        (
            notification_slug_id,
            _,
            notification_created_at,
            notification_is_read,
        ) = _create_import_notification(
            session,
            user_id=row.user_id,
            import_id=row.id,
            conversation_id=None,
            notification_type="import_failed",
        )
        events.append(
            ImportNotificationEvent(
                type="import_notification",
                userId=str(row.user_id),
                notificationSlugId=notification_slug_id,
                notificationCreatedAt=notification_created_at.isoformat(),
                notificationIsRead=notification_is_read,
                importId=row.id,
                importSlugId=row.slug_id,
                conversationId=None,
                conversationSlugId=None,
                conversationTitle=None,
                failureReason=FailureReason.timeout,
                broadcastNewConversation=False,
            ),
        )
    session.commit()
    return events
