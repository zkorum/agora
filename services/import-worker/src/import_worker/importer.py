from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, Protocol

from pydantic import BaseModel, TypeAdapter
from reddwarf.data_loader import Loader
from sqlalchemy import and_, case, desc, select, update
from sqlalchemy import insert as sqlalchemy_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert

from import_worker.csv_import import build_import_from_csv
from import_worker.generated_models import (
    AnalysisWorkState,
    Conversation,
    ConversationContent,
    ConversationImport,
    ConversationViewSnapshot,
    ConversationViewSnapshotReasonEnum,
    Notification,
    NotificationImport,
    Opinion,
    OpinionContent,
    OpinionGroupSpec,
    OpinionModeration,
    Organization,
    User,
    UserOrganizationMapping,
    Vote,
    VoteContent,
)
from import_worker.generated_shared_types import (
    MAX_LENGTH_BODY_HTML,
    MAX_LENGTH_OPINION_HTML_OUTPUT,
    MAX_LENGTH_TITLE,
)
from import_worker.html import process_user_generated_html
from import_worker.ids import generate_random_slug_id, generate_uuid
from import_worker.import_models import ImportPolisResults
from import_worker.polis_url import extract_polis_id_from_url

if TYPE_CHECKING:
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
    def __init__(self, *, polis_id: str, data_source: str | None = None) -> None:
        if data_source is None:
            self._loader: Any = Loader(polis_id=polis_id)
        else:
            self._loader = Loader(polis_id=polis_id, data_source=data_source)

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


LOGGER = logging.getLogger(__name__)
CHUNK_SIZE = 1000


@dataclass(frozen=True)
class ImportProcessResult:
    event: ImportNotificationEvent | None
    analysis_conversation_id: int | None
    analysis_due_at_ms: int | None


@dataclass(frozen=True)
class ConversationIds:
    conversation_slug_id: str
    conversation_id: int
    conversation_content_id: int


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


@dataclass(frozen=True)
class AnalysisSchedule:
    conversation_id: int
    next_run_at: datetime | None


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


def _get_organization_id(
    session: Session,
    *,
    organization_name: str | None,
    user_id: uuid.UUID,
) -> int | None:
    if organization_name is None or organization_name == "":
        return None

    row = session.execute(
        select(Organization.id)
        .join(UserOrganizationMapping, UserOrganizationMapping.organization_id == Organization.id)
        .where(
            and_(
                Organization.name == organization_name,
                UserOrganizationMapping.user_id == user_id,
            ),
        ),
    ).first()
    if row is None:
        raise ValueError(f"User {user_id} is not part of organization {organization_name}")
    return row.id


def _build_imported_polis_conversation(request: ImportRequest) -> tuple[ImportPolisResults, str]:
    if request.type == "csv":
        return build_import_from_csv(request.files.model_dump(by_alias=True)), "csv"

    polis_id = extract_polis_id_from_url(request.polis_url)
    loader: PolisLoader
    if polis_id.report_id is not None:
        loader = RedDwarfPolisLoader(polis_id=polis_id.report_id, data_source="csv_export")
        loader.load_api_data_conversation()
        polis_url_type = "report"
    elif polis_id.conversation_id is not None:
        loader = RedDwarfPolisLoader(polis_id=polis_id.conversation_id)
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
) -> ConversationIds:
    author_id = uuid.UUID(request.author_id)
    organization_id = _get_organization_id(
        session,
        organization_name=request.form_data.post_as_organization,
        user_id=author_id,
    )
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
        max_length=MAX_LENGTH_BODY_HTML,
        ellipsis=" [...].",
    )
    body = process_user_generated_html(body, enable_links=True, mode="input")
    conversation_slug_id = generate_random_slug_id()
    import_url = request.polis_url if request.type == "url" else None

    conversation_row = session.execute(
        sqlalchemy_insert(Conversation)
        .values(
            author_id=author_id,
            slug_id=conversation_slug_id,
            organization_id=organization_id,
            is_indexed=request.form_data.is_indexed,
            participation_mode=request.form_data.participation_mode.value,
            conversation_type="polis",
            is_importing=True,
            requires_event_ticket=request.form_data.requires_event_ticket,
            ai_labeling_enabled=request.form_data.ai_labeling_enabled,
            preferred_opinion_group_count=None
            if preferred_opinion_group_count is None
            else preferred_opinion_group_count.root,
            current_content_id=None,
            created_at=now,
            updated_at=now,
            last_reacted_at=now,
            import_url=import_url,
            import_conversation_url=conversation_url,
            import_export_url=report_url,
            import_created_at=_timestamp_from_polis(imported.conversation_data.created),
            import_author=imported.conversation_data.ownername,
            import_method=request.type,
        )
        .returning(Conversation.id),
    ).first()
    if conversation_row is None:
        raise RuntimeError("Failed to create conversation")
    conversation_id = conversation_row.id

    content_row = session.execute(
        sqlalchemy_insert(ConversationContent)
        .values(conversation_id=conversation_id, title=title, body=body)
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
    session.execute(
        update(User)
        .where(User.id == author_id)
        .values(
            active_conversation_count=User.active_conversation_count + 1,
            total_conversation_count=User.total_conversation_count + 1,
        ),
    )
    session.commit()
    return ConversationIds(
        conversation_slug_id=conversation_slug_id,
        conversation_id=conversation_id,
        conversation_content_id=conversation_content_id,
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


def _insert_opinions(
    session: Session,
    *,
    imported: ImportPolisResults,
    conversation_ids: ConversationIds,
    participant_data: ParticipantData,
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

    content_values = [
        {
            "opinion_id": opinion_id_per_statement_id[comment.statement_id],
            "conversation_content_id": conversation_ids.conversation_content_id,
            "content": process_user_generated_html(
                _truncate_with_ellipsis(
                    comment.txt,
                    max_length=MAX_LENGTH_OPINION_HTML_OUTPUT,
                    ellipsis=" [...]",
                ),
                enable_links=True,
                mode="output",
            ),
        }
        for comment in imported.comments_data
    ]
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
    return OpinionInsertData(
        opinion_id_per_statement_id=opinion_id_per_statement_id,
        opinion_content_id_per_opinion_id=opinion_content_id_per_opinion_id,
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


def _update_counts_and_schedule(
    session: Session,
    *,
    conversation_id: int,
    participant_data: ParticipantData,
) -> AnalysisSchedule:
    now = now_zero_ms()
    conversation_row = session.execute(
        select(
            Conversation.analysis_data_generation,
            Conversation.current_content_id,
            Conversation.is_closed,
        )
        .where(Conversation.id == conversation_id)
        .with_for_update(),
    ).first()
    if conversation_row is None:
        raise RuntimeError(f"Missing imported conversation {conversation_id}")
    data_generation = conversation_row.analysis_data_generation + 1
    session.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
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
                        "next_run_at": now,
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
                AnalysisWorkState.next_run_at,
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
        next_run_values: list[datetime] = []
        for row in work_state_rows:
            next_run_at = now if row.running_data_generation is None else row.next_run_at
            if next_run_at is not None:
                next_run_values.append(next_run_at)
            session.execute(
                update(AnalysisWorkState)
                .where(AnalysisWorkState.id == row.id)
                .values(
                    dirty_since=row.dirty_since or now,
                    next_run_at=next_run_at,
                    updated_at=now,
                ),
            )
    else:
        next_run_values = []

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
        next_run_at=min(next_run_values) if next_run_values else None,
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
        select(Conversation.analysis_data_generation).where(Conversation.id == conversation_id),
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
        ).where(
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
        notification_slug_id, _ = _create_import_notification(
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
                importId=row.id,
                conversationId=conversation_id,
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
        select(Conversation.author_id, Conversation.current_content_id).where(
            Conversation.id == conversation_id,
        ),
    ).first()
    if conversation_row is None or conversation_row.current_content_id is None:
        return
    session.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(current_content_id=None),
    )
    session.execute(
        update(User)
        .where(User.id == conversation_row.author_id)
        .values(active_conversation_count=User.active_conversation_count - 1),
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
) -> tuple[str, int]:
    notification_slug_id = generate_random_slug_id()
    notification_row = session.execute(
        sqlalchemy_insert(Notification)
        .values(slug_id=notification_slug_id, user_id=user_id, notification_type=notification_type)
        .returning(Notification.id),
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
    return notification_slug_id, notification_row.id


def _get_import_record(session: Session, *, import_slug_id: str) -> tuple[int, uuid.UUID]:
    row = session.execute(
        select(ConversationImport.id, ConversationImport.user_id).where(
            ConversationImport.slug_id == import_slug_id,
        ),
    ).first()
    if row is None:
        raise RuntimeError(f"Import record not found for {import_slug_id}")
    return row.id, row.user_id


def process_import_request(session: Session, *, request: ImportRequest) -> ImportProcessResult:
    conversation_id: int | None = None
    try:
        imported, polis_url_type = _build_imported_polis_conversation(request)
        conversation_ids = _create_conversation(
            session,
            request=request,
            imported=imported,
            polis_url_type=polis_url_type,
        )
        conversation_id = conversation_ids.conversation_id
        participant_data = _insert_imported_users(
            session,
            imported=imported,
            conversation_slug_id=conversation_ids.conversation_slug_id,
        )
        opinions = _insert_opinions(
            session,
            imported=imported,
            conversation_ids=conversation_ids,
            participant_data=participant_data,
        )
        _insert_votes(
            session,
            imported=imported,
            opinions=opinions,
            participant_data=participant_data,
            conversation_slug_id=conversation_ids.conversation_slug_id,
        )
        schedule = _update_counts_and_schedule(
            session,
            conversation_id=conversation_ids.conversation_id,
            participant_data=participant_data,
        )

        _import_id, _user_id = _get_import_record(session, import_slug_id=request.import_slug_id)
        session.execute(
            update(ConversationImport)
            .where(ConversationImport.slug_id == request.import_slug_id)
            .values(
                conversation_id=conversation_ids.conversation_id,
                updated_at=now_zero_ms(),
            ),
        )
        session.commit()
        next_run_at_ms = (
            int(schedule.next_run_at.replace(tzinfo=UTC).timestamp() * 1000)
            if schedule.next_run_at is not None
            else None
        )
        return ImportProcessResult(
            event=None,
            analysis_conversation_id=conversation_ids.conversation_id,
            analysis_due_at_ms=next_run_at_ms,
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
        select(ConversationImport.id, ConversationImport.user_id).where(
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
    notification_slug_id, _ = _create_import_notification(
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
        importId=row.id,
        conversationId=None,
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
        notification_slug_id, _ = _create_import_notification(
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
                importId=row.id,
                conversationId=None,
                broadcastNewConversation=False,
            ),
        )
    session.commit()
    return events
