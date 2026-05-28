from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import and_, false, func, or_, select, true, update
from sqlalchemy import insert as sqlalchemy_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, aliased

from agora_worker_shared.db import (
    CheckpointActivationContext,
    materialize_checkpoint_reasons_for_activated_view_snapshots,
)
from agora_worker_shared.description_input import (
    ConversationDescriptionInput,
    DescriptionInputError,
    DescriptionOutputError,
    GroupDescriptionInput,
    RepresentativeOpinionText,
)
from agora_worker_shared.description_translation import (
    DescriptionForTranslation,
    TranslationRepresentativeOpinion,
)
from agora_worker_shared.generated_models import (
    AiDescriptionLocaleStatusEnum,
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotOpinion,
    AnalysisSnapshotResult,
    Conversation,
    ConversationContent,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotReasonEnum,
    OpinionContent,
    OpinionGroup,
    OpinionGroupCandidate,
    OpinionGroupCandidateAssessment,
    OpinionGroupDescription,
    OpinionGroupDescriptionLocaleStatus,
    OpinionGroupDescriptionTranslation,
    OpinionGroupDescriptionTranslationWork,
    OpinionGroupLineage,
    OpinionGroupLineageDescriptionWork,
    OpinionGroupOpinionStats,
    OpinionGroupVariant,
    RealtimeEventOutbox,
)
from agora_worker_shared.generated_shared_types import SUPPORTED_DISPLAY_LANGUAGE_CODES
from agora_worker_shared.retry_policy import RetryPolicy, next_cooldown_retry_at, next_retry_at

log = logging.getLogger(__name__)
POSTGRES_INSERT_BIND_PARAM_LIMIT = 60_000


def _max_rows_per_insert(*, column_count: int) -> int:
    return max(1, POSTGRES_INSERT_BIND_PARAM_LIMIT // column_count)


def _iter_chunks[T](values: list[T], *, chunk_size: int) -> Iterator[list[T]]:
    for start in range(0, len(values), chunk_size):
        yield values[start : start + chunk_size]

if TYPE_CHECKING:
    from collections.abc import Callable, Iterator, Mapping, Sequence

    from sqlalchemy import Engine
    from sqlalchemy.sql.elements import ColumnElement

    from agora_worker_shared.bedrock_label_summary import ParsedLabelSummaryOutput
    from agora_worker_shared.description_translation import DescriptionTranslation

    DescriptionGenerator = Callable[
        [ConversationDescriptionInput],
        ParsedLabelSummaryOutput,
    ]
    DescriptionTranslator = Callable[
        [list[DescriptionForTranslation], list[str]],
        list[DescriptionTranslation],
    ]


@dataclass(frozen=True)
class ClaimedLineageDescriptionWorkItem:
    id: int
    conversation_id: int
    conversation_slug_id: str
    lineage_id: int
    source_candidate_id: int
    locale: str
    attempt_count: int
    lease_token: str


@dataclass(frozen=True)
class ClaimedDescriptionTranslationWorkItem:
    id: int
    conversation_id: int
    conversation_slug_id: str
    description_id: int
    locale: str
    attempt_count: int
    lease_token: str


type ClaimedAiDescriptionLocaleWorkItem = (
    ClaimedLineageDescriptionWorkItem | ClaimedDescriptionTranslationWorkItem
)


@dataclass(frozen=True)
class WorkStateSchedule:
    conversation_id: int
    next_run_at: datetime | None
    retry_scheduled_at: datetime | None = None


@dataclass(frozen=True)
class DueAiDescriptionWorkConversationRow:
    conversation_id: int
    next_run_at: datetime | None


@dataclass(frozen=True)
class AiDescriptionQueueSchedules:
    lineage_descriptions: list[WorkStateSchedule]
    translations: list[WorkStateSchedule]


def claimable_immediate_retry_at(now: datetime) -> datetime:
    # Work-state timestamps are stored with second precision; flooring avoids
    # rounding an immediate retry into the next second and missing the next claim.
    return now.replace(microsecond=0)


def _format_ids_for_log(ids: Sequence[int]) -> str:
    limit = 20
    head = list(ids[:limit])
    suffix = "" if len(ids) <= limit else f", ... +{len(ids) - limit}"
    return ", ".join(str(item_id) for item_id in head) + suffix


@dataclass(frozen=True)
class _CandidateOption:
    candidate_id: int
    group_count: int
    selection_score: float | None


@dataclass(frozen=True)
class PendingLocaleStatusRow:
    id: int
    conversation_id: int
    conversation_view_snapshot_id: int
    analysis_snapshot_result_id: int
    locale: str
    next_run_at: datetime | None


@dataclass(frozen=True)
class RequiredLineageDescriptionRow:
    lineage_id: int
    candidate_id: int
    system_description_id: int | None


@dataclass(frozen=True)
class LineageDescriptionWorkDemand:
    lineage_id: int
    conversation_id: int
    source_candidate_id: int
    next_run_at: datetime | None


@dataclass(frozen=True)
class TranslationWorkDemand:
    description_id: int
    conversation_id: int
    locale: str
    next_run_at: datetime | None


@dataclass(frozen=True)
class _LineageDescriptionRequest:
    group_key: str
    conversation: ConversationDescriptionInput


def _latest_or_checkpoint_status_condition(
    *,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
) -> ColumnElement[bool]:
    if require_activated_view_snapshot and require_unactivated_view_snapshot:
        return false()

    newer_view_snapshot = aliased(ConversationViewSnapshot)
    checkpoint_exists = (
        select(ConversationViewSnapshotCheckpointReason.id)
        .where(
            ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id
            == OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id
        )
        .exists()
    )
    newer_view_snapshot_exists = (
        select(newer_view_snapshot.id)
        .where(
            and_(
                newer_view_snapshot.conversation_id == ConversationViewSnapshot.conversation_id,
                newer_view_snapshot.opinion_group_spec_id
                == ConversationViewSnapshot.opinion_group_spec_id,
                newer_view_snapshot.view_reason
                == ConversationViewSnapshotReasonEnum.analysis_completed,
                or_(
                    newer_view_snapshot.created_at > ConversationViewSnapshot.created_at,
                    and_(
                        newer_view_snapshot.created_at == ConversationViewSnapshot.created_at,
                        newer_view_snapshot.id > ConversationViewSnapshot.id,
                    ),
                ),
            )
        )
        .exists()
    )
    latest_or_checkpoint_condition = or_(checkpoint_exists, ~newer_view_snapshot_exists)
    if not require_activated_view_snapshot:
        if require_unactivated_view_snapshot:
            return and_(
                ConversationViewSnapshot.activated_at.is_(None),
                latest_or_checkpoint_condition,
            )
        return latest_or_checkpoint_condition

    return and_(
        ConversationViewSnapshot.activated_at.is_not(None),
        latest_or_checkpoint_condition,
    )


def _processable_conversation_condition() -> ColumnElement[bool]:
    return and_(
        Conversation.current_content_id.is_not(None),
        Conversation.conversation_type == ConversationType.polis,
    )


def _fetch_non_processable_conversation_ids(
    session: Session,
    *,
    conversation_ids: list[int],
) -> list[int]:
    if not conversation_ids:
        return []

    rows = session.execute(
        select(Conversation.id)
        .where(
            and_(
                Conversation.id.in_(sorted(set(conversation_ids))),
                or_(
                    Conversation.current_content_id.is_(None),
                    Conversation.conversation_type != ConversationType.polis,
                ),
            )
        )
        .order_by(Conversation.id)
    ).all()
    return [row.id for row in rows]


def _conversation_is_processable(
    session: Session,
    *,
    conversation_id: int,
) -> bool:
    row = session.execute(
        select(Conversation.id)
        .where(
            and_(
                Conversation.id == conversation_id,
                _processable_conversation_condition(),
            )
        )
        .limit(1)
    ).first()
    return row is not None


def _mark_non_processable_locale_statuses_fallback(
    session: Session,
    *,
    conversation_ids: list[int],
) -> list[int]:
    if not conversation_ids:
        return []

    rows = session.execute(
        update(OpinionGroupDescriptionLocaleStatus)
        .where(
            and_(
                OpinionGroupDescriptionLocaleStatus.conversation_id.in_(
                    sorted(set(conversation_ids))
                ),
                OpinionGroupDescriptionLocaleStatus.status != AiDescriptionLocaleStatusEnum.ready,
            )
        )
        .values(
            status=AiDescriptionLocaleStatusEnum.fallback,
            next_run_at=None,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
        .returning(OpinionGroupDescriptionLocaleStatus.conversation_id)
    ).all()
    return [row.conversation_id for row in rows]


def complete_non_processable_ai_description_work_batch(
    engine: Engine,
    *,
    conversation_ids: list[int],
    include_lineage_descriptions: bool = True,
    include_translations: bool = True,
    require_activated_view_snapshot: bool = False,
) -> list[int]:
    if not conversation_ids or (not include_lineage_descriptions and not include_translations):
        return []

    with Session(engine) as session:
        non_processable_conversation_ids = _fetch_non_processable_conversation_ids(
            session,
            conversation_ids=conversation_ids,
        )
        if not non_processable_conversation_ids:
            return []

        completed_conversation_ids: list[int] = [*non_processable_conversation_ids]
        if include_lineage_descriptions:
            completed_conversation_ids.extend(
                row.conversation_id
                for row in session.execute(
                    update(OpinionGroupLineageDescriptionWork)
                    .where(
                        and_(
                            OpinionGroupLineageDescriptionWork.conversation_id.in_(
                                non_processable_conversation_ids
                            ),
                            or_(
                                OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                                OpinionGroupLineageDescriptionWork.lease_expires_at < func.now(),
                            ),
                            or_(
                                OpinionGroupLineageDescriptionWork.next_run_at.is_not(None),
                                OpinionGroupLineageDescriptionWork.lease_token.is_not(None),
                            ),
                        )
                    )
                    .values(
                        next_run_at=None,
                        lease_owner=None,
                        lease_token=None,
                        lease_expires_at=None,
                        last_error_code=None,
                        last_error_message=None,
                        updated_at=func.now(),
                    )
                    .returning(OpinionGroupLineageDescriptionWork.conversation_id)
                )
            )

        if include_translations:
            completed_conversation_ids.extend(
                row.conversation_id
                for row in session.execute(
                    update(OpinionGroupDescriptionTranslationWork)
                    .where(
                        and_(
                            OpinionGroupDescriptionTranslationWork.conversation_id.in_(
                                non_processable_conversation_ids
                            ),
                            or_(
                                OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                                OpinionGroupDescriptionTranslationWork.lease_expires_at
                                < func.now(),
                            ),
                            or_(
                                OpinionGroupDescriptionTranslationWork.next_run_at.is_not(None),
                                OpinionGroupDescriptionTranslationWork.lease_token.is_not(None),
                            ),
                        )
                    )
                    .values(
                        next_run_at=None,
                        lease_owner=None,
                        lease_token=None,
                        lease_expires_at=None,
                        last_error_code=None,
                        last_error_message=None,
                        updated_at=func.now(),
                    )
                    .returning(OpinionGroupDescriptionTranslationWork.conversation_id)
                )
            )

        completed_conversation_ids.extend(
            _mark_non_processable_locale_statuses_fallback(
                session,
                conversation_ids=non_processable_conversation_ids,
            )
        )
        activated_view_snapshot_ids = (
            []
            if require_activated_view_snapshot
            else activate_display_safe_view_snapshots(
                session,
                conversation_ids=non_processable_conversation_ids,
            )
        )
        if activated_view_snapshot_ids:
            completed_conversation_ids.extend(non_processable_conversation_ids)
        session.commit()

    return sorted(set(completed_conversation_ids))


def fetch_due_ai_description_work_conversation_ids(
    engine: Engine,
    *,
    limit: int,
    ai_description_epoch: int,
    translation_enabled: bool,
    include_lineage_descriptions: bool = True,
    include_translations: bool = True,
    require_activated_view_snapshot: bool = False,
) -> list[int]:
    with Session(engine) as session:
        rows: list[DueAiDescriptionWorkConversationRow] = []
        if include_lineage_descriptions:
            lineage_rows = session.execute(
                select(
                    OpinionGroupLineageDescriptionWork.conversation_id,
                    OpinionGroupLineageDescriptionWork.next_run_at,
                )
                .join(
                    Conversation,
                    Conversation.id == OpinionGroupLineageDescriptionWork.conversation_id,
                )
                .join(
                    OpinionGroupLineage,
                    OpinionGroupLineage.id == OpinionGroupLineageDescriptionWork.lineage_id,
                )
                .where(
                    and_(
                        Conversation.ai_labeling_enabled.is_(True),
                        OpinionGroupLineage.system_description_id.is_(None),
                        OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                        OpinionGroupLineageDescriptionWork.next_run_at.is_not(None),
                        OpinionGroupLineageDescriptionWork.next_run_at <= func.now(),
                        _lineage_work_relevant_status_filter(
                            conversation_view_snapshot_ids=None,
                            require_activated_view_snapshot=require_activated_view_snapshot,
                        ),
                        or_(
                            OpinionGroupLineageDescriptionWork.non_retryable_ai_description_epoch.is_(
                                None
                            ),
                            ai_description_epoch
                            > func.coalesce(
                                OpinionGroupLineageDescriptionWork.non_retryable_ai_description_epoch,
                                0,
                            ),
                        ),
                    )
                )
                .order_by(OpinionGroupLineageDescriptionWork.next_run_at.asc())
                .limit(limit)
            )
            rows.extend(
                DueAiDescriptionWorkConversationRow(
                    conversation_id=row.conversation_id,
                    next_run_at=row.next_run_at,
                )
                for row in lineage_rows
            )
        if translation_enabled and include_translations:
            translation_rows = session.execute(
                select(
                    OpinionGroupDescriptionTranslationWork.conversation_id,
                    OpinionGroupDescriptionTranslationWork.next_run_at,
                )
                .join(
                    Conversation,
                    Conversation.id == OpinionGroupDescriptionTranslationWork.conversation_id,
                )
                .where(
                    and_(
                        Conversation.ai_labeling_enabled.is_(True),
                        OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                        OpinionGroupDescriptionTranslationWork.next_run_at.is_not(None),
                        OpinionGroupDescriptionTranslationWork.next_run_at <= func.now(),
                        _translation_work_relevant_status_filter(
                            conversation_view_snapshot_ids=None,
                            require_activated_view_snapshot=require_activated_view_snapshot,
                        ),
                        ~select(OpinionGroupDescriptionTranslation.id)
                        .where(
                            and_(
                                OpinionGroupDescriptionTranslation.description_id
                                == OpinionGroupDescriptionTranslationWork.description_id,
                                OpinionGroupDescriptionTranslation.locale
                                == OpinionGroupDescriptionTranslationWork.locale,
                            )
                        )
                        .exists(),
                        or_(
                            OpinionGroupDescriptionTranslationWork.non_retryable_ai_description_epoch.is_(
                                None
                            ),
                            ai_description_epoch
                            > func.coalesce(
                                OpinionGroupDescriptionTranslationWork.non_retryable_ai_description_epoch,
                                0,
                            ),
                        ),
                    )
                )
                .order_by(OpinionGroupDescriptionTranslationWork.next_run_at.asc())
                .limit(limit)
            )
            rows.extend(
                DueAiDescriptionWorkConversationRow(
                    conversation_id=row.conversation_id,
                    next_run_at=row.next_run_at,
                )
                for row in translation_rows
            )
        if include_lineage_descriptions and (translation_enabled and include_translations):
            status_locale_filter = true()
        elif include_lineage_descriptions:
            status_locale_filter = OpinionGroupDescriptionLocaleStatus.locale == "en"
        elif include_translations:
            status_locale_filter = and_(
                OpinionGroupDescriptionLocaleStatus.locale != "en",
                OpinionGroupDescriptionLocaleStatus.translation_expected.is_(True),
            )
        else:
            status_locale_filter = false_condition()

        status_rows = session.execute(
            select(
                OpinionGroupDescriptionLocaleStatus.conversation_id,
                OpinionGroupDescriptionLocaleStatus.next_run_at,
            )
            .join(
                Conversation,
                Conversation.id == OpinionGroupDescriptionLocaleStatus.conversation_id,
            )
            .join(
                ConversationViewSnapshot,
                ConversationViewSnapshot.id
                == OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id,
            )
            .where(
                and_(
                    Conversation.ai_labeling_enabled.is_(True),
                    OpinionGroupDescriptionLocaleStatus.status
                    != AiDescriptionLocaleStatusEnum.ready,
                    OpinionGroupDescriptionLocaleStatus.next_run_at.is_not(None),
                    OpinionGroupDescriptionLocaleStatus.next_run_at <= func.now(),
                    status_locale_filter,
                    or_(
                        OpinionGroupDescriptionLocaleStatus.non_retryable_ai_description_epoch.is_(
                            None
                        ),
                        ai_description_epoch
                        > func.coalesce(
                            OpinionGroupDescriptionLocaleStatus.non_retryable_ai_description_epoch,
                            0,
                        ),
                    ),
                    _latest_or_checkpoint_status_condition(
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    ),
                )
            )
            .order_by(OpinionGroupDescriptionLocaleStatus.next_run_at.asc())
            .limit(limit)
        ).all()
        rows.extend(
            DueAiDescriptionWorkConversationRow(
                conversation_id=row.conversation_id,
                next_run_at=row.next_run_at,
            )
            for row in status_rows
        )

    due_conversation_ids: list[int] = []
    seen_conversation_ids: set[int] = set()
    sorted_rows = sorted(
        rows,
        key=lambda row: (
            row.next_run_at.timestamp() if row.next_run_at is not None else float("-inf")
        ),
    )
    for row in sorted_rows:
        if row.conversation_id in seen_conversation_ids:
            continue
        seen_conversation_ids.add(row.conversation_id)
        due_conversation_ids.append(row.conversation_id)
        if len(due_conversation_ids) >= limit:
            break
    return due_conversation_ids


def recover_expired_ai_description_work(
    engine: Engine,
    *,
    translation_enabled: bool,
    conversation_ids: list[int] | None = None,
    conversation_view_snapshot_ids: list[int] | None = None,
    include_lineage_descriptions: bool = True,
    include_translations: bool = True,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
) -> list[int]:
    if conversation_ids is not None and not conversation_ids:
        return []
    if conversation_view_snapshot_ids is not None and not conversation_view_snapshot_ids:
        return []

    unique_conversation_ids = (
        sorted(set(conversation_ids)) if conversation_ids is not None else None
    )
    lineage_conversation_filter: ColumnElement[bool] = (
        OpinionGroupLineageDescriptionWork.conversation_id.in_(unique_conversation_ids)
        if unique_conversation_ids is not None
        else true()
    )
    translation_conversation_filter: ColumnElement[bool] = (
        OpinionGroupDescriptionTranslationWork.conversation_id.in_(unique_conversation_ids)
        if unique_conversation_ids is not None
        else true()
    )

    with Session(engine) as session:
        recovered_conversation_ids: list[int] = []
        if include_lineage_descriptions:
            recovered_conversation_ids.extend(
                row.conversation_id
                for row in session.execute(
                    update(OpinionGroupLineageDescriptionWork)
                    .where(
                        and_(
                            lineage_conversation_filter,
                            OpinionGroupLineageDescriptionWork.lease_expires_at.is_not(None),
                            OpinionGroupLineageDescriptionWork.lease_expires_at < func.now(),
                            _lineage_work_relevant_status_filter(
                                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                                require_activated_view_snapshot=require_activated_view_snapshot,
                                require_unactivated_view_snapshot=require_unactivated_view_snapshot,
                            ),
                        )
                    )
                    .values(
                        lease_owner=None,
                        lease_token=None,
                        lease_expires_at=None,
                        next_run_at=func.now(),
                        updated_at=func.now(),
                    )
                    .returning(OpinionGroupLineageDescriptionWork.conversation_id)
                )
            )
        if translation_enabled and include_translations:
            recovered_conversation_ids.extend(
                row.conversation_id
                for row in session.execute(
                    update(OpinionGroupDescriptionTranslationWork)
                    .where(
                        and_(
                            translation_conversation_filter,
                            OpinionGroupDescriptionTranslationWork.lease_expires_at.is_not(None),
                            OpinionGroupDescriptionTranslationWork.lease_expires_at < func.now(),
                            _translation_work_relevant_status_filter(
                                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                                require_activated_view_snapshot=require_activated_view_snapshot,
                                require_unactivated_view_snapshot=require_unactivated_view_snapshot,
                            ),
                        )
                    )
                    .values(
                        lease_owner=None,
                        lease_token=None,
                        lease_expires_at=None,
                        next_run_at=func.now(),
                        updated_at=func.now(),
                    )
                    .returning(OpinionGroupDescriptionTranslationWork.conversation_id)
                )
            )
        session.commit()

    return sorted(set(recovered_conversation_ids))


def activate_pending_translation_expectations(
    engine: Engine,
    *,
    limit: int,
    require_activated_view_snapshot: bool = False,
) -> list[int]:
    if limit <= 0:
        return []

    english_status = aliased(OpinionGroupDescriptionLocaleStatus)
    newer_view_snapshot = aliased(ConversationViewSnapshot)
    english_ready_exists = (
        select(english_status.id)
        .where(
            and_(
                english_status.conversation_view_snapshot_id
                == OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id,
                english_status.locale == "en",
                english_status.status == AiDescriptionLocaleStatusEnum.ready,
            )
        )
        .exists()
    )
    checkpoint_exists = (
        select(ConversationViewSnapshotCheckpointReason.id)
        .where(
            ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id
            == OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id
        )
        .exists()
    )
    newer_view_snapshot_exists = (
        select(newer_view_snapshot.id)
        .where(
            and_(
                newer_view_snapshot.conversation_id == ConversationViewSnapshot.conversation_id,
                newer_view_snapshot.opinion_group_spec_id
                == ConversationViewSnapshot.opinion_group_spec_id,
                or_(
                    newer_view_snapshot.created_at > ConversationViewSnapshot.created_at,
                    and_(
                        newer_view_snapshot.created_at == ConversationViewSnapshot.created_at,
                        newer_view_snapshot.id > ConversationViewSnapshot.id,
                    ),
                ),
            )
        )
        .exists()
    )

    with Session(engine) as session:
        rows = session.execute(
            select(
                OpinionGroupDescriptionLocaleStatus.id,
                OpinionGroupDescriptionLocaleStatus.conversation_id,
            )
            .join(
                Conversation,
                Conversation.id == OpinionGroupDescriptionLocaleStatus.conversation_id,
            )
            .join(
                ConversationViewSnapshot,
                ConversationViewSnapshot.id
                == OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id,
            )
            .where(
                and_(
                    Conversation.ai_labeling_enabled.is_(True),
                    _processable_conversation_condition(),
                    OpinionGroupDescriptionLocaleStatus.locale != "en",
                    OpinionGroupDescriptionLocaleStatus.status
                    != AiDescriptionLocaleStatusEnum.ready,
                    OpinionGroupDescriptionLocaleStatus.translation_expected.is_(False),
                    OpinionGroupDescriptionLocaleStatus.lease_token.is_(None),
                    english_ready_exists,
                    or_(checkpoint_exists, ~newer_view_snapshot_exists),
                    ConversationViewSnapshot.activated_at.is_not(None)
                    if require_activated_view_snapshot
                    else true(),
                )
            )
            .order_by(OpinionGroupDescriptionLocaleStatus.id)
            .limit(limit)
        ).all()
        if not rows:
            return []

        status_ids = [row.id for row in rows]
        session.execute(
            update(OpinionGroupDescriptionLocaleStatus)
            .where(OpinionGroupDescriptionLocaleStatus.id.in_(status_ids))
            .values(
                translation_expected=True,
                next_run_at=func.now(),
                non_retryable_ai_description_epoch=None,
                last_error_code=None,
                last_error_message=None,
                updated_at=func.now(),
            )
        )
        session.commit()

    return sorted({row.conversation_id for row in rows})


def fetch_ai_description_queue_schedules(
    engine: Engine,
    *,
    conversation_ids: list[int],
    require_activated_view_snapshot: bool = False,
) -> AiDescriptionQueueSchedules:
    if not conversation_ids:
        return AiDescriptionQueueSchedules(lineage_descriptions=[], translations=[])

    unique_conversation_ids = sorted(set(conversation_ids))
    with Session(engine) as session:
        lineage_rows = session.execute(
            select(
                OpinionGroupLineageDescriptionWork.conversation_id,
                func.min(OpinionGroupLineageDescriptionWork.next_run_at).label("next_run_at"),
            )
            .join(
                Conversation,
                Conversation.id == OpinionGroupLineageDescriptionWork.conversation_id,
            )
            .where(
                and_(
                    OpinionGroupLineageDescriptionWork.conversation_id.in_(unique_conversation_ids),
                    _processable_conversation_condition(),
                    OpinionGroupLineageDescriptionWork.next_run_at.is_not(None),
                    OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                    _lineage_work_relevant_status_filter(
                        conversation_view_snapshot_ids=None,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    ),
                )
            )
            .group_by(OpinionGroupLineageDescriptionWork.conversation_id)
        ).all()
        translation_rows = session.execute(
            select(
                OpinionGroupDescriptionTranslationWork.conversation_id,
                func.min(OpinionGroupDescriptionTranslationWork.next_run_at).label("next_run_at"),
            )
            .join(
                Conversation,
                Conversation.id == OpinionGroupDescriptionTranslationWork.conversation_id,
            )
            .where(
                and_(
                    OpinionGroupDescriptionTranslationWork.conversation_id.in_(
                        unique_conversation_ids
                    ),
                    _processable_conversation_condition(),
                    OpinionGroupDescriptionTranslationWork.next_run_at.is_not(None),
                    OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                    _translation_work_relevant_status_filter(
                        conversation_view_snapshot_ids=None,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    ),
                )
            )
            .group_by(OpinionGroupDescriptionTranslationWork.conversation_id)
        ).all()

    return AiDescriptionQueueSchedules(
        lineage_descriptions=[
            WorkStateSchedule(
                conversation_id=row.conversation_id,
                next_run_at=row.next_run_at,
            )
            for row in lineage_rows
        ],
        translations=[
            WorkStateSchedule(
                conversation_id=row.conversation_id,
                next_run_at=row.next_run_at,
            )
            for row in translation_rows
        ],
    )


def fetch_ai_description_view_snapshot_ids_for_analysis_snapshots(
    engine: Engine,
    *,
    analysis_snapshot_ids: list[int],
) -> list[int]:
    if not analysis_snapshot_ids:
        return []

    with Session(engine) as session:
        rows = session.execute(
            select(ConversationViewSnapshot.id)
            .join(
                Conversation,
                Conversation.id == ConversationViewSnapshot.conversation_id,
            )
            .where(
                and_(
                    Conversation.ai_labeling_enabled.is_(True),
                    _processable_conversation_condition(),
                    ConversationViewSnapshot.analysis_snapshot_id.in_(
                        sorted(set(analysis_snapshot_ids))
                    ),
                )
            )
        ).all()

    return [row.id for row in rows]


def _pending_status_view_snapshot_filter(
    conversation_view_snapshot_ids: list[int] | None,
) -> ColumnElement[bool]:
    if conversation_view_snapshot_ids is None:
        return true()
    if not conversation_view_snapshot_ids:
        return false_condition()
    return OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id.in_(
        sorted(set(conversation_view_snapshot_ids))
    )


def false_condition() -> ColumnElement[bool]:
    return false()


def activate_display_safe_view_snapshots(
    session: Session,
    *,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int] | None = None,
    block_pending_translations: bool = False,
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> list[int]:
    if not conversation_ids:
        return []
    if conversation_view_snapshot_ids is not None and not conversation_view_snapshot_ids:
        return []

    blocking_status_condition = and_(
        OpinionGroupDescriptionLocaleStatus.locale == "en",
        OpinionGroupDescriptionLocaleStatus.ai_generation_expected.is_(True),
    )
    if block_pending_translations:
        blocking_status_condition = or_(
            blocking_status_condition,
            OpinionGroupDescriptionLocaleStatus.translation_expected.is_(True),
        )
    newer_view_snapshot = aliased(ConversationViewSnapshot)
    newer_view_snapshot_exists = (
        select(newer_view_snapshot.id)
        .where(
            and_(
                newer_view_snapshot.conversation_id == ConversationViewSnapshot.conversation_id,
                newer_view_snapshot.opinion_group_spec_id
                == ConversationViewSnapshot.opinion_group_spec_id,
                newer_view_snapshot.view_reason
                == ConversationViewSnapshotReasonEnum.analysis_completed,
                or_(
                    newer_view_snapshot.created_at > ConversationViewSnapshot.created_at,
                    and_(
                        newer_view_snapshot.created_at == ConversationViewSnapshot.created_at,
                        newer_view_snapshot.id > ConversationViewSnapshot.id,
                    ),
                ),
            )
        )
        .exists()
    )

    blocking_status_exists = (
        select(OpinionGroupDescriptionLocaleStatus.id)
        .where(
            and_(
                OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id
                == ConversationViewSnapshot.id,
                OpinionGroupDescriptionLocaleStatus.status == AiDescriptionLocaleStatusEnum.pending,
                blocking_status_condition,
            )
        )
        .exists()
    )
    snapshot_matches_current_generation = (
        select(AnalysisSnapshot.id)
        .join(Conversation, Conversation.id == AnalysisSnapshot.conversation_id)
        .where(
            and_(
                AnalysisSnapshot.id == ConversationViewSnapshot.analysis_snapshot_id,
                Conversation.analysis_data_generation == AnalysisSnapshot.data_generation,
            )
        )
        .exists()
    )
    candidate_filters: list[ColumnElement[bool]] = [
        ConversationViewSnapshot.conversation_id.in_(sorted(set(conversation_ids))),
        ConversationViewSnapshot.activated_at.is_(None),
        ConversationViewSnapshot.view_reason
        == ConversationViewSnapshotReasonEnum.analysis_completed,
        ~newer_view_snapshot_exists,
        snapshot_matches_current_generation,
    ]
    if conversation_view_snapshot_ids is not None:
        candidate_filters.append(
            ConversationViewSnapshot.id.in_(sorted(set(conversation_view_snapshot_ids)))
        )

    candidate_count = session.execute(
        select(func.count(ConversationViewSnapshot.id)).where(and_(*candidate_filters))
    ).scalar_one()
    filters = [*candidate_filters, ~blocking_status_exists]

    rows = session.execute(
        update(ConversationViewSnapshot)
        .where(and_(*filters))
        .values(activated_at=func.now())
        .returning(ConversationViewSnapshot.id)
    ).all()
    activated_view_snapshot_ids = [row.id for row in rows]
    materialize_checkpoint_reasons_for_activated_view_snapshots(
        session,
        conversation_view_snapshot_ids=activated_view_snapshot_ids,
        checkpoint_activation_context=checkpoint_activation_context,
    )
    if candidate_count > 0 or activated_view_snapshot_ids:
        log.info(
            "[AiDescriptionWorkDB] Checked display-safe snapshot activation "
            "candidates=%d activated=%d blocked_or_pending=%d conversation_ids=%s",
            candidate_count,
            len(activated_view_snapshot_ids),
            candidate_count - len(activated_view_snapshot_ids),
            _format_ids_for_log(conversation_ids),
        )
    _queue_conversation_analysis_updated_events_for_view_snapshots(
        session,
        conversation_view_snapshot_ids=activated_view_snapshot_ids,
    )
    return activated_view_snapshot_ids


def _queue_conversation_analysis_updated_events_for_view_snapshots(
    session: Session,
    *,
    conversation_view_snapshot_ids: list[int],
) -> None:
    if not conversation_view_snapshot_ids:
        return

    checkpoint_rows = session.execute(
        select(ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id).where(
            ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id.in_(
                sorted(set(conversation_view_snapshot_ids))
            )
        )
    ).all()
    checkpoint_view_snapshot_ids = {row.conversation_view_snapshot_id for row in checkpoint_rows}

    rows = session.execute(
        select(
            Conversation.slug_id,
            ConversationViewSnapshot.id,
            ConversationViewSnapshot.analysis_snapshot_id,
            ConversationViewSnapshot.opinion_count,
            ConversationViewSnapshot.vote_count,
            ConversationViewSnapshot.participant_count,
            ConversationViewSnapshot.total_opinion_count,
            ConversationViewSnapshot.total_vote_count,
            ConversationViewSnapshot.total_participant_count,
            ConversationViewSnapshot.moderated_opinion_count,
            ConversationViewSnapshot.hidden_opinion_count,
            ConversationViewSnapshot.is_closed,
        )
        .join(Conversation, Conversation.id == ConversationViewSnapshot.conversation_id)
        .where(
            and_(
                ConversationViewSnapshot.id.in_(sorted(set(conversation_view_snapshot_ids))),
                ConversationViewSnapshot.activated_at.is_not(None),
                ConversationViewSnapshot.analysis_snapshot_id.is_not(None),
            )
        )
    ).all()
    created_at = datetime.now(UTC)
    timestamp = int(created_at.timestamp() * 1000)
    values = [
        {
            "event_type": "conversation_analysis_updated",
            "created_at": created_at,
            "payload": {
                "conversationSlugId": row.slug_id,
                "conversationViewSnapshotId": row.id,
                "analysisSnapshotId": row.analysis_snapshot_id,
                "checkpointChanged": row.id in checkpoint_view_snapshot_ids,
                "opinionCount": row.opinion_count,
                "voteCount": row.vote_count,
                "participantCount": row.participant_count,
                "totalOpinionCount": row.total_opinion_count,
                "totalVoteCount": row.total_vote_count,
                "totalParticipantCount": row.total_participant_count,
                "moderatedOpinionCount": row.moderated_opinion_count,
                "hiddenOpinionCount": row.hidden_opinion_count,
                "isClosed": row.is_closed,
                "timestamp": timestamp,
            },
        }
        for row in rows
        if row.analysis_snapshot_id is not None
    ]
    if not values:
        return

    session.execute(sqlalchemy_insert(RealtimeEventOutbox).values(values))


def _fetch_pending_locale_status_rows(
    session: Session,
    *,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int] | None = None,
    locale: str | None = None,
    non_english_only: bool = False,
    translation_expected: bool | None = None,
    next_run_required: bool = False,
    require_activated_view_snapshot: bool = False,
) -> list[PendingLocaleStatusRow]:
    if not conversation_ids:
        return []
    if conversation_view_snapshot_ids is not None and not conversation_view_snapshot_ids:
        return []

    locale_filter: ColumnElement[bool]
    if locale is not None:
        locale_filter = OpinionGroupDescriptionLocaleStatus.locale == locale
    elif non_english_only:
        locale_filter = OpinionGroupDescriptionLocaleStatus.locale != "en"
    else:
        locale_filter = true()

    translation_expected_filter: ColumnElement[bool]
    if translation_expected is None:
        translation_expected_filter = true()
    else:
        translation_expected_filter = OpinionGroupDescriptionLocaleStatus.translation_expected.is_(
            translation_expected
        )

    next_run_filter = (
        OpinionGroupDescriptionLocaleStatus.next_run_at.is_not(None)
        if next_run_required
        else true()
    )

    rows = session.execute(
        select(
            OpinionGroupDescriptionLocaleStatus.id,
            OpinionGroupDescriptionLocaleStatus.conversation_id,
            OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id,
            OpinionGroupDescriptionLocaleStatus.analysis_snapshot_result_id,
            OpinionGroupDescriptionLocaleStatus.locale,
            OpinionGroupDescriptionLocaleStatus.next_run_at,
        )
        .join(
            Conversation,
            Conversation.id == OpinionGroupDescriptionLocaleStatus.conversation_id,
        )
        .join(
            ConversationViewSnapshot,
            ConversationViewSnapshot.id
            == OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id,
        )
        .where(
            and_(
                OpinionGroupDescriptionLocaleStatus.conversation_id.in_(
                    sorted(set(conversation_ids))
                ),
                Conversation.ai_labeling_enabled.is_(True),
                _processable_conversation_condition(),
                OpinionGroupDescriptionLocaleStatus.status != AiDescriptionLocaleStatusEnum.ready,
                locale_filter,
                translation_expected_filter,
                next_run_filter,
                _pending_status_view_snapshot_filter(conversation_view_snapshot_ids),
                _latest_or_checkpoint_status_condition(
                    require_activated_view_snapshot=require_activated_view_snapshot,
                ),
            )
        )
        .order_by(
            OpinionGroupDescriptionLocaleStatus.next_run_at.asc().nulls_last(),
            OpinionGroupDescriptionLocaleStatus.id,
        )
    ).all()

    return [
        PendingLocaleStatusRow(
            id=row.id,
            conversation_id=row.conversation_id,
            conversation_view_snapshot_id=row.conversation_view_snapshot_id,
            analysis_snapshot_result_id=row.analysis_snapshot_result_id,
            locale=row.locale,
            next_run_at=row.next_run_at,
        )
        for row in rows
    ]


def _fetch_required_lineage_description_rows_for_status(
    session: Session,
    *,
    status: PendingLocaleStatusRow,
) -> list[RequiredLineageDescriptionRow]:
    required_candidate_ids = _fetch_required_candidate_ids_for_result(
        session,
        analysis_snapshot_result_id=status.analysis_snapshot_result_id,
    )
    if not required_candidate_ids:
        return []

    rows = session.execute(
        select(
            OpinionGroup.lineage_id,
            OpinionGroup.candidate_id,
            OpinionGroupLineage.system_description_id,
        )
        .join(OpinionGroupLineage, OpinionGroupLineage.id == OpinionGroup.lineage_id)
        .where(
            and_(
                OpinionGroup.candidate_id.in_(required_candidate_ids),
                OpinionGroup.lineage_id.is_not(None),
            )
        )
        .order_by(OpinionGroup.candidate_id, OpinionGroup.id)
    ).all()

    return [
        RequiredLineageDescriptionRow(
            lineage_id=row.lineage_id,
            candidate_id=row.candidate_id,
            system_description_id=row.system_description_id,
        )
        for row in rows
        if row.lineage_id is not None
    ]


def _required_system_description_ids_for_status(
    session: Session,
    *,
    status: PendingLocaleStatusRow,
) -> tuple[set[int], bool]:
    lineage_rows = _fetch_required_lineage_description_rows_for_status(
        session,
        status=status,
    )
    description_ids = {
        row.system_description_id for row in lineage_rows if row.system_description_id is not None
    }
    all_lineages_have_descriptions = all(
        row.system_description_id is not None for row in lineage_rows
    )
    return description_ids, all_lineages_have_descriptions


def lineage_description_work_demands_for_statuses(
    *,
    statuses: Sequence[PendingLocaleStatusRow],
    lineage_rows_by_status_id: Mapping[int, Sequence[RequiredLineageDescriptionRow]],
) -> list[LineageDescriptionWorkDemand]:
    demands_by_lineage_id: dict[int, LineageDescriptionWorkDemand] = {}
    for status in statuses:
        for row in lineage_rows_by_status_id.get(status.id, ()):
            if row.system_description_id is not None:
                continue
            if row.lineage_id in demands_by_lineage_id:
                continue
            demands_by_lineage_id[row.lineage_id] = LineageDescriptionWorkDemand(
                lineage_id=row.lineage_id,
                conversation_id=status.conversation_id,
                source_candidate_id=row.candidate_id,
                next_run_at=status.next_run_at,
            )

    return list(demands_by_lineage_id.values())


def translation_work_demands_for_statuses(
    *,
    statuses: Sequence[PendingLocaleStatusRow],
    description_ids_by_status_id: Mapping[int, set[int]],
    translated_description_ids_by_status_id: Mapping[int, set[int]],
) -> list[TranslationWorkDemand]:
    demands_by_description_locale: dict[tuple[int, str], TranslationWorkDemand] = {}
    for status in statuses:
        description_ids = description_ids_by_status_id.get(status.id, set())
        if not description_ids:
            continue
        translated_description_ids = translated_description_ids_by_status_id.get(
            status.id,
            set(),
        )
        for description_id in sorted(description_ids - translated_description_ids):
            key = (description_id, status.locale)
            if key in demands_by_description_locale:
                continue
            demands_by_description_locale[key] = TranslationWorkDemand(
                description_id=description_id,
                conversation_id=status.conversation_id,
                locale=status.locale,
                next_run_at=status.next_run_at,
            )

    return list(demands_by_description_locale.values())


def _ensure_lineage_description_work_for_pending_statuses(
    session: Session,
    *,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int] | None = None,
    require_activated_view_snapshot: bool = False,
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        locale="en",
        next_run_required=True,
        require_activated_view_snapshot=require_activated_view_snapshot,
    )
    lineage_rows_by_status_id = {
        status.id: _fetch_required_lineage_description_rows_for_status(
            session,
            status=status,
        )
        for status in statuses
    }
    demands = lineage_description_work_demands_for_statuses(
        statuses=statuses,
        lineage_rows_by_status_id=lineage_rows_by_status_id,
    )

    if not demands:
        return

    values: list[dict[str, object]] = [
        {
            "lineage_id": demand.lineage_id,
            "conversation_id": demand.conversation_id,
            "source_candidate_id": demand.source_candidate_id,
            "next_run_at": demand.next_run_at or func.now(),
        }
        for demand in demands
    ]
    for chunk in _iter_chunks(values, chunk_size=_max_rows_per_insert(column_count=4)):
        insert_query = pg_insert(OpinionGroupLineageDescriptionWork).values(chunk)
        session.execute(
            insert_query.on_conflict_do_update(
                index_elements=[OpinionGroupLineageDescriptionWork.lineage_id],
                set_={
                    "conversation_id": insert_query.excluded.conversation_id,
                    "source_candidate_id": insert_query.excluded.source_candidate_id,
                    "next_run_at": func.coalesce(
                        OpinionGroupLineageDescriptionWork.next_run_at,
                        insert_query.excluded.next_run_at,
                    ),
                    "updated_at": func.now(),
                },
                where=OpinionGroupLineageDescriptionWork.lease_token.is_(None),
            )
        )


def _ensure_translation_work_for_pending_statuses(
    session: Session,
    *,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int] | None = None,
    require_activated_view_snapshot: bool = False,
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        non_english_only=True,
        translation_expected=True,
        next_run_required=True,
        require_activated_view_snapshot=require_activated_view_snapshot,
    )
    description_ids_by_status_id: dict[int, set[int]] = {}
    translated_description_ids_by_status_id: dict[int, set[int]] = {}
    for status in statuses:
        description_ids, _all_lineages_have_descriptions = (
            _required_system_description_ids_for_status(session, status=status)
        )
        if not description_ids:
            continue
        description_ids_by_status_id[status.id] = description_ids
        existing_translation_rows = session.execute(
            select(OpinionGroupDescriptionTranslation.description_id).where(
                and_(
                    OpinionGroupDescriptionTranslation.description_id.in_(sorted(description_ids)),
                    OpinionGroupDescriptionTranslation.locale == status.locale,
                )
            )
        ).all()
        translated_description_ids_by_status_id[status.id] = {
            row.description_id for row in existing_translation_rows
        }
    demands = translation_work_demands_for_statuses(
        statuses=statuses,
        description_ids_by_status_id=description_ids_by_status_id,
        translated_description_ids_by_status_id=translated_description_ids_by_status_id,
    )

    if not demands:
        return

    values: list[dict[str, object]] = [
        {
            "description_id": demand.description_id,
            "conversation_id": demand.conversation_id,
            "locale": demand.locale,
            "next_run_at": demand.next_run_at or func.now(),
        }
        for demand in demands
    ]
    for chunk in _iter_chunks(values, chunk_size=_max_rows_per_insert(column_count=4)):
        insert_query = pg_insert(OpinionGroupDescriptionTranslationWork).values(chunk)
        session.execute(
            insert_query.on_conflict_do_update(
                index_elements=[
                    OpinionGroupDescriptionTranslationWork.description_id,
                    OpinionGroupDescriptionTranslationWork.locale,
                ],
                set_={
                    "conversation_id": insert_query.excluded.conversation_id,
                    "next_run_at": func.coalesce(
                        OpinionGroupDescriptionTranslationWork.next_run_at,
                        insert_query.excluded.next_run_at,
                    ),
                    "updated_at": func.now(),
                },
                where=OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
            )
        )


def _lineage_work_relevant_status_filter(
    conversation_view_snapshot_ids: list[int] | None,
    *,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
) -> ColumnElement[bool]:
    return (
        select(OpinionGroupDescriptionLocaleStatus.id)
        .join(
            ConversationViewSnapshot,
            ConversationViewSnapshot.id
            == OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id,
        )
        .join(
            OpinionGroupCandidate,
            OpinionGroupCandidate.snapshot_result_id
            == OpinionGroupDescriptionLocaleStatus.analysis_snapshot_result_id,
        )
        .join(OpinionGroup, OpinionGroup.candidate_id == OpinionGroupCandidate.id)
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(
                OpinionGroupDescriptionLocaleStatus.conversation_id
                == OpinionGroupLineageDescriptionWork.conversation_id,
                OpinionGroupDescriptionLocaleStatus.locale == "en",
                OpinionGroupDescriptionLocaleStatus.status
                != AiDescriptionLocaleStatusEnum.ready,
                OpinionGroupDescriptionLocaleStatus.ai_generation_expected.is_(True),
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
                OpinionGroup.lineage_id == OpinionGroupLineageDescriptionWork.lineage_id,
                _pending_status_view_snapshot_filter(conversation_view_snapshot_ids),
                _latest_or_checkpoint_status_condition(
                    require_activated_view_snapshot=require_activated_view_snapshot,
                    require_unactivated_view_snapshot=require_unactivated_view_snapshot,
                ),
            )
        )
        .exists()
    )


def _lineage_work_view_snapshot_filter(
    conversation_view_snapshot_ids: list[int] | None,
    *,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
) -> ColumnElement[bool]:
    return _lineage_work_relevant_status_filter(
        conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_unactivated_view_snapshot=require_unactivated_view_snapshot,
    )


def _translation_work_relevant_status_filter(
    conversation_view_snapshot_ids: list[int] | None,
    *,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
) -> ColumnElement[bool]:
    return (
        select(OpinionGroupDescriptionLocaleStatus.id)
        .join(
            ConversationViewSnapshot,
            ConversationViewSnapshot.id
            == OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id,
        )
        .join(
            AnalysisSnapshotResult,
            AnalysisSnapshotResult.id
            == OpinionGroupDescriptionLocaleStatus.analysis_snapshot_result_id,
        )
        .join(
            OpinionGroupCandidate,
            OpinionGroupCandidate.snapshot_result_id == AnalysisSnapshotResult.id,
        )
        .join(OpinionGroup, OpinionGroup.candidate_id == OpinionGroupCandidate.id)
        .join(OpinionGroupLineage, OpinionGroupLineage.id == OpinionGroup.lineage_id)
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(
                OpinionGroupDescriptionLocaleStatus.conversation_id
                == OpinionGroupDescriptionTranslationWork.conversation_id,
                OpinionGroupDescriptionLocaleStatus.locale
                == OpinionGroupDescriptionTranslationWork.locale,
                OpinionGroupDescriptionLocaleStatus.status
                != AiDescriptionLocaleStatusEnum.ready,
                OpinionGroupDescriptionLocaleStatus.translation_expected.is_(True),
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
                OpinionGroupLineage.system_description_id
                == OpinionGroupDescriptionTranslationWork.description_id,
                _pending_status_view_snapshot_filter(conversation_view_snapshot_ids),
                _latest_or_checkpoint_status_condition(
                    require_activated_view_snapshot=require_activated_view_snapshot,
                    require_unactivated_view_snapshot=require_unactivated_view_snapshot,
                ),
            )
        )
        .exists()
    )


def _translation_work_view_snapshot_filter(
    conversation_view_snapshot_ids: list[int] | None,
    *,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
) -> ColumnElement[bool]:
    return _translation_work_relevant_status_filter(
        conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_unactivated_view_snapshot=require_unactivated_view_snapshot,
    )


def claim_ai_description_locale_work_items_batch(
    engine: Engine,
    *,
    worker_id: str,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int] | None = None,
    lease_ttl_seconds: int,
    limit: int,
    ai_description_epoch: int,
    translation_enabled: bool,
    claim_lineage_descriptions: bool = True,
    claim_translations: bool = True,
    block_pending_translations_for_activation: bool = False,
    require_activated_view_snapshot: bool = False,
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> list[ClaimedAiDescriptionLocaleWorkItem]:
    if (
        not conversation_ids
        or limit <= 0
        or (not claim_lineage_descriptions and not claim_translations)
    ):
        return []

    unique_conversation_ids = list(dict.fromkeys(conversation_ids))
    lease_expires_at = datetime.now(UTC) + timedelta(seconds=lease_ttl_seconds)
    claims: list[ClaimedAiDescriptionLocaleWorkItem] = []

    with Session(engine) as session:
        if claim_lineage_descriptions:
            _ensure_lineage_description_work_for_pending_statuses(
                session,
                conversation_ids=unique_conversation_ids,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            _refresh_english_locale_statuses(
                session,
                conversation_ids=unique_conversation_ids,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
        if translation_enabled and claim_translations:
            _ensure_translation_work_for_pending_statuses(
                session,
                conversation_ids=unique_conversation_ids,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            _refresh_translation_locale_statuses(
                session,
                conversation_ids=unique_conversation_ids,
                locales=[locale for locale in SUPPORTED_DISPLAY_LANGUAGE_CODES if locale != "en"],
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
        if not require_activated_view_snapshot:
            activate_display_safe_view_snapshots(
                session,
                conversation_ids=unique_conversation_ids,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                block_pending_translations=block_pending_translations_for_activation,
                checkpoint_activation_context=checkpoint_activation_context,
            )

        for conversation_id in unique_conversation_ids:
            remaining_claim_limit = limit - len(claims)
            if remaining_claim_limit <= 0:
                break

            if claim_lineage_descriptions:
                claimable_lineage_rows = session.execute(
                    select(
                        OpinionGroupLineageDescriptionWork.id,
                        OpinionGroupLineageDescriptionWork.conversation_id,
                        OpinionGroupLineageDescriptionWork.lineage_id,
                        OpinionGroupLineageDescriptionWork.source_candidate_id,
                        OpinionGroupLineageDescriptionWork.attempt_count,
                        Conversation.slug_id.label("conversation_slug_id"),
                    )
                    .join(
                        Conversation,
                        Conversation.id == OpinionGroupLineageDescriptionWork.conversation_id,
                    )
                    .join(
                        OpinionGroupLineage,
                        OpinionGroupLineage.id == OpinionGroupLineageDescriptionWork.lineage_id,
                    )
                    .where(
                        and_(
                            OpinionGroupLineageDescriptionWork.conversation_id == conversation_id,
                            Conversation.ai_labeling_enabled.is_(True),
                            _processable_conversation_condition(),
                            OpinionGroupLineage.system_description_id.is_(None),
                            OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                            OpinionGroupLineageDescriptionWork.next_run_at.is_not(None),
                            OpinionGroupLineageDescriptionWork.next_run_at <= func.now(),
                            _lineage_work_view_snapshot_filter(
                                conversation_view_snapshot_ids,
                                require_activated_view_snapshot=require_activated_view_snapshot,
                            ),
                            or_(
                                OpinionGroupLineageDescriptionWork.non_retryable_ai_description_epoch.is_(
                                    None
                                ),
                                ai_description_epoch
                                > func.coalesce(
                                    OpinionGroupLineageDescriptionWork.non_retryable_ai_description_epoch,
                                    0,
                                ),
                            ),
                        )
                    )
                    .order_by(
                        OpinionGroupLineageDescriptionWork.next_run_at.asc(),
                        OpinionGroupLineageDescriptionWork.id,
                    )
                    .limit(remaining_claim_limit)
                    .with_for_update(skip_locked=True)
                ).all()

                if claimable_lineage_rows:
                    claimed_lineage_count = 0
                    for claimable_lineage_row in claimable_lineage_rows:
                        if len(claims) >= limit:
                            break

                        lease_token = f"{worker_id}:{uuid.uuid4()}"
                        attempt_count = claimable_lineage_row.attempt_count + 1
                        updated_lineage_row = session.execute(
                            update(OpinionGroupLineageDescriptionWork)
                            .where(
                                and_(
                                    OpinionGroupLineageDescriptionWork.id
                                    == claimable_lineage_row.id,
                                    OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                                )
                            )
                            .values(
                                attempt_count=attempt_count,
                                next_run_at=None,
                                lease_owner=worker_id,
                                lease_token=lease_token,
                                lease_expires_at=lease_expires_at,
                                updated_at=func.now(),
                            )
                            .returning(
                                OpinionGroupLineageDescriptionWork.id,
                                OpinionGroupLineageDescriptionWork.conversation_id,
                                OpinionGroupLineageDescriptionWork.lineage_id,
                                OpinionGroupLineageDescriptionWork.source_candidate_id,
                                OpinionGroupLineageDescriptionWork.lease_token,
                            )
                        ).first()
                        if updated_lineage_row is None:
                            continue

                        claimed_lineage_count += 1
                        claims.append(
                            ClaimedLineageDescriptionWorkItem(
                                id=updated_lineage_row.id,
                                conversation_id=updated_lineage_row.conversation_id,
                                conversation_slug_id=claimable_lineage_row.conversation_slug_id,
                                lineage_id=updated_lineage_row.lineage_id,
                                source_candidate_id=updated_lineage_row.source_candidate_id,
                                locale="en",
                                attempt_count=attempt_count,
                                lease_token=updated_lineage_row.lease_token,
                            )
                        )

                    if claimed_lineage_count > 0:
                        continue

            remaining_claim_limit = limit - len(claims)
            if remaining_claim_limit <= 0:
                break

            if not translation_enabled or not claim_translations:
                continue

            claimable_translation_rows = session.execute(
                select(
                    OpinionGroupDescriptionTranslationWork.id,
                    OpinionGroupDescriptionTranslationWork.conversation_id,
                    OpinionGroupDescriptionTranslationWork.description_id,
                    OpinionGroupDescriptionTranslationWork.locale,
                    OpinionGroupDescriptionTranslationWork.attempt_count,
                    Conversation.slug_id.label("conversation_slug_id"),
                )
                .join(
                    Conversation,
                    Conversation.id == OpinionGroupDescriptionTranslationWork.conversation_id,
                )
                .where(
                    and_(
                        OpinionGroupDescriptionTranslationWork.conversation_id == conversation_id,
                        Conversation.ai_labeling_enabled.is_(True),
                        _processable_conversation_condition(),
                        OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                        OpinionGroupDescriptionTranslationWork.next_run_at.is_not(None),
                        OpinionGroupDescriptionTranslationWork.next_run_at <= func.now(),
                        _translation_work_view_snapshot_filter(
                            conversation_view_snapshot_ids,
                            require_activated_view_snapshot=require_activated_view_snapshot,
                        ),
                        ~select(OpinionGroupDescriptionTranslation.id)
                        .where(
                            and_(
                                OpinionGroupDescriptionTranslation.description_id
                                == OpinionGroupDescriptionTranslationWork.description_id,
                                OpinionGroupDescriptionTranslation.locale
                                == OpinionGroupDescriptionTranslationWork.locale,
                            )
                        )
                        .exists(),
                        or_(
                            OpinionGroupDescriptionTranslationWork.non_retryable_ai_description_epoch.is_(
                                None
                            ),
                            ai_description_epoch
                            > func.coalesce(
                                OpinionGroupDescriptionTranslationWork.non_retryable_ai_description_epoch,
                                0,
                            ),
                        ),
                    )
                )
                .order_by(
                    OpinionGroupDescriptionTranslationWork.next_run_at.asc(),
                    OpinionGroupDescriptionTranslationWork.id,
                )
                .limit(remaining_claim_limit)
                .with_for_update(skip_locked=True)
            ).all()
            for claimable_translation_row in claimable_translation_rows:
                if len(claims) >= limit:
                    break

                lease_token = f"{worker_id}:{uuid.uuid4()}"
                attempt_count = claimable_translation_row.attempt_count + 1
                updated_translation_row = session.execute(
                    update(OpinionGroupDescriptionTranslationWork)
                    .where(
                        and_(
                            OpinionGroupDescriptionTranslationWork.id
                            == claimable_translation_row.id,
                            OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                        )
                    )
                    .values(
                        attempt_count=attempt_count,
                        next_run_at=None,
                        lease_owner=worker_id,
                        lease_token=lease_token,
                        lease_expires_at=lease_expires_at,
                        updated_at=func.now(),
                    )
                    .returning(
                        OpinionGroupDescriptionTranslationWork.id,
                        OpinionGroupDescriptionTranslationWork.conversation_id,
                        OpinionGroupDescriptionTranslationWork.description_id,
                        OpinionGroupDescriptionTranslationWork.locale,
                        OpinionGroupDescriptionTranslationWork.lease_token,
                    )
                ).first()
                if updated_translation_row is None:
                    continue

                claims.append(
                    ClaimedDescriptionTranslationWorkItem(
                        id=updated_translation_row.id,
                        conversation_id=updated_translation_row.conversation_id,
                        conversation_slug_id=claimable_translation_row.conversation_slug_id,
                        description_id=updated_translation_row.description_id,
                        locale=updated_translation_row.locale,
                        attempt_count=attempt_count,
                        lease_token=updated_translation_row.lease_token,
                    )
                )

        session.commit()

    return claims


def process_ai_description_locale_work_item(
    engine: Engine,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    generate_descriptions: DescriptionGenerator,
    translate_descriptions: DescriptionTranslator | None,
    block_pending_translations_for_activation: bool = False,
    require_activated_view_snapshot: bool = False,
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> WorkStateSchedule:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        started_at = time.perf_counter()
        with Session(engine) as session:
            if not _ai_description_claim_is_active(session, claim=claim):
                log.info(
                    "[AiDescriptionWorkDB] Skipping inactive lineage claim "
                    "conversationSlugId=%s lineageId=%d attemptCount=%d",
                    claim.conversation_slug_id,
                    claim.lineage_id,
                    claim.attempt_count,
                )
                schedule = _get_conversation_schedule(
                    session,
                    conversation_id=claim.conversation_id,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                )
                session.commit()
                return schedule
            if not _conversation_is_processable(session, conversation_id=claim.conversation_id):
                schedule = _complete_claimed_non_processable_ai_description_work(
                    session,
                    claim=claim,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                    checkpoint_activation_context=checkpoint_activation_context,
                )
                session.commit()
                return schedule
            lineage_request = _fetch_base_description_request_for_lineage_work(
                session,
                claim=claim,
            )
            session.commit()

        provider_started_at = time.perf_counter()
        generated_descriptions = (
            generate_descriptions(lineage_request.conversation)
            if lineage_request is not None
            else None
        )
        provider_ms = (time.perf_counter() - provider_started_at) * 1000

        with Session(engine) as session:
            if not _ai_description_claim_is_active(session, claim=claim):
                log.info(
                    "[AiDescriptionWorkDB] Skipping inactive lineage claim after provider "
                    "conversationSlugId=%s lineageId=%d attemptCount=%d",
                    claim.conversation_slug_id,
                    claim.lineage_id,
                    claim.attempt_count,
                )
                schedule = _get_conversation_schedule(
                    session,
                    conversation_id=claim.conversation_id,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                )
                session.commit()
                return schedule
            if not _conversation_is_processable(session, conversation_id=claim.conversation_id):
                schedule = _complete_claimed_non_processable_ai_description_work(
                    session,
                    claim=claim,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                    checkpoint_activation_context=checkpoint_activation_context,
                )
                session.commit()
                return schedule
            if generated_descriptions is not None and lineage_request is not None:
                _persist_generated_base_description_for_lineage_work(
                    session,
                    claim=claim,
                    request=lineage_request,
                    generated=generated_descriptions,
                )
            _mark_lineage_description_work_complete(session, claim=claim)
            _refresh_english_locale_statuses(
                session,
                conversation_ids=[claim.conversation_id],
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            _ensure_translation_work_for_pending_statuses(
                session,
                conversation_ids=[claim.conversation_id],
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            if not require_activated_view_snapshot:
                activate_display_safe_view_snapshots(
                    session,
                    conversation_ids=[claim.conversation_id],
                    block_pending_translations=block_pending_translations_for_activation,
                    checkpoint_activation_context=checkpoint_activation_context,
                )
            schedule = _get_conversation_schedule(
                session,
                conversation_id=claim.conversation_id,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            session.commit()
            log.info(
                "[AiDescriptionWorkDB] Completed lineage description work "
                "conversationSlugId=%s conversationId=%d lineageId=%d "
                "attemptCount=%d providerMs=%.1f totalMs=%.1f generated=%s "
                "nextRunAt=%s",
                claim.conversation_slug_id,
                claim.conversation_id,
                claim.lineage_id,
                claim.attempt_count,
                provider_ms,
                (time.perf_counter() - started_at) * 1000,
                lineage_request is not None,
                schedule.next_run_at.isoformat() if schedule.next_run_at is not None else "none",
            )
            return schedule

    if translate_descriptions is None:
        msg = f"translation service unavailable for locale {claim.locale}"
        raise DescriptionInputError(msg)

    started_at = time.perf_counter()
    with Session(engine) as session:
        if not _ai_description_claim_is_active(session, claim=claim):
            log.info(
                "[AiDescriptionWorkDB] Skipping inactive translation claim "
                "conversationSlugId=%s descriptionId=%d locale=%s attemptCount=%d",
                claim.conversation_slug_id,
                claim.description_id,
                claim.locale,
                claim.attempt_count,
            )
            schedule = _get_conversation_schedule(
                session,
                conversation_id=claim.conversation_id,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            session.commit()
            return schedule
        if not _conversation_is_processable(session, conversation_id=claim.conversation_id):
            schedule = _complete_claimed_non_processable_ai_description_work(
                session,
                claim=claim,
                require_activated_view_snapshot=require_activated_view_snapshot,
                checkpoint_activation_context=checkpoint_activation_context,
            )
            session.commit()
            return schedule
        description_request = _fetch_description_for_translation_work(
            session,
            claim=claim,
        )
        session.commit()

    provider_started_at = time.perf_counter()
    translations = (
        translate_descriptions([description_request], [claim.locale])
        if description_request is not None
        else []
    )
    provider_ms = (time.perf_counter() - provider_started_at) * 1000

    with Session(engine) as session:
        if not _ai_description_claim_is_active(session, claim=claim):
            log.info(
                "[AiDescriptionWorkDB] Skipping inactive translation claim after provider "
                "conversationSlugId=%s descriptionId=%d locale=%s attemptCount=%d",
                claim.conversation_slug_id,
                claim.description_id,
                claim.locale,
                claim.attempt_count,
            )
            schedule = _get_conversation_schedule(
                session,
                conversation_id=claim.conversation_id,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            session.commit()
            return schedule
        if not _conversation_is_processable(session, conversation_id=claim.conversation_id):
            schedule = _complete_claimed_non_processable_ai_description_work(
                session,
                claim=claim,
                require_activated_view_snapshot=require_activated_view_snapshot,
                checkpoint_activation_context=checkpoint_activation_context,
            )
            session.commit()
            return schedule
        if description_request is not None:
            _persist_locale_translation_for_description_work(
                session,
                claim=claim,
                translations=translations,
            )
        _mark_translation_work_complete(session, claim=claim)
        _refresh_translation_locale_statuses(
            session,
            conversation_ids=[claim.conversation_id],
            locales=[claim.locale],
            require_activated_view_snapshot=require_activated_view_snapshot,
        )
        if not require_activated_view_snapshot:
            activate_display_safe_view_snapshots(
                session,
                conversation_ids=[claim.conversation_id],
                block_pending_translations=block_pending_translations_for_activation,
                checkpoint_activation_context=checkpoint_activation_context,
            )
        schedule = _get_conversation_schedule(
            session,
            conversation_id=claim.conversation_id,
            require_activated_view_snapshot=require_activated_view_snapshot,
        )
        session.commit()
        log.info(
            "[AiDescriptionWorkDB] Completed translation work conversationSlugId=%s "
            "conversationId=%d descriptionId=%d locale=%s attemptCount=%d "
            "providerMs=%.1f totalMs=%.1f translated=%s nextRunAt=%s",
            claim.conversation_slug_id,
            claim.conversation_id,
            claim.description_id,
            claim.locale,
            claim.attempt_count,
            provider_ms,
            (time.perf_counter() - started_at) * 1000,
            description_request is not None,
            schedule.next_run_at.isoformat() if schedule.next_run_at is not None else "none",
        )
        return schedule


def _ai_description_claim_is_active(
    session: Session,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
) -> bool:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        row = session.execute(
            select(OpinionGroupLineageDescriptionWork.id)
            .where(
                and_(
                    OpinionGroupLineageDescriptionWork.id == claim.id,
                    OpinionGroupLineageDescriptionWork.lease_token == claim.lease_token,
                )
            )
            .with_for_update()
        ).first()
        return row is not None

    row = session.execute(
        select(OpinionGroupDescriptionTranslationWork.id)
        .where(
            and_(
                OpinionGroupDescriptionTranslationWork.id == claim.id,
                OpinionGroupDescriptionTranslationWork.lease_token == claim.lease_token,
            )
        )
        .with_for_update()
    ).first()
    return row is not None


def _complete_claimed_non_processable_ai_description_work(
    session: Session,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    require_activated_view_snapshot: bool = False,
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> WorkStateSchedule:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        session.execute(
            update(OpinionGroupLineageDescriptionWork)
            .where(
                and_(
                    OpinionGroupLineageDescriptionWork.id == claim.id,
                    OpinionGroupLineageDescriptionWork.lease_token == claim.lease_token,
                )
            )
            .values(
                next_run_at=None,
                lease_owner=None,
                lease_token=None,
                lease_expires_at=None,
                last_error_code=None,
                last_error_message=None,
                updated_at=func.now(),
            )
        )
    else:
        session.execute(
            update(OpinionGroupDescriptionTranslationWork)
            .where(
                and_(
                    OpinionGroupDescriptionTranslationWork.id == claim.id,
                    OpinionGroupDescriptionTranslationWork.lease_token == claim.lease_token,
                )
            )
            .values(
                next_run_at=None,
                lease_owner=None,
                lease_token=None,
                lease_expires_at=None,
                last_error_code=None,
                last_error_message=None,
                updated_at=func.now(),
            )
        )

    _mark_non_processable_locale_statuses_fallback(
        session,
        conversation_ids=[claim.conversation_id],
    )
    if not require_activated_view_snapshot:
        activate_display_safe_view_snapshots(
            session,
            conversation_ids=[claim.conversation_id],
            checkpoint_activation_context=checkpoint_activation_context,
        )
    return _get_conversation_schedule(
        session,
        conversation_id=claim.conversation_id,
        require_activated_view_snapshot=require_activated_view_snapshot,
    )


def retry_ai_description_locale_work_item(
    engine: Engine,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    retry_policy: RetryPolicy,
    error_code: str,
    error_message: str,
    retry_immediately_without_fallback: bool = False,
    force_cooldown: bool = False,
    block_pending_translations_for_activation: bool = False,
    require_activated_view_snapshot: bool = False,
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> WorkStateSchedule:
    now = datetime.now(UTC)
    retry_at = (
        claimable_immediate_retry_at(now)
        if retry_immediately_without_fallback
        else next_cooldown_retry_at(now=now, policy=retry_policy)
        if force_cooldown
        else next_retry_at(
            now=now,
            attempt_count=claim.attempt_count,
            policy=retry_policy,
        )
    )
    delay_seconds = max(0.0, (retry_at - now).total_seconds())
    with Session(engine) as session:
        if isinstance(claim, ClaimedLineageDescriptionWorkItem):
            if not retry_immediately_without_fallback:
                _mark_english_statuses_fallback_for_lineage(
                    session,
                    claim=claim,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                )
            session.execute(
                update(OpinionGroupLineageDescriptionWork)
                .where(
                    and_(
                        OpinionGroupLineageDescriptionWork.id == claim.id,
                        OpinionGroupLineageDescriptionWork.lease_token == claim.lease_token,
                    )
                )
                .values(
                    next_run_at=retry_at,
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    last_error_code=error_code,
                    last_error_message=error_message,
                    updated_at=func.now(),
                )
            )
        else:
            if not retry_immediately_without_fallback:
                _mark_translation_statuses_fallback_for_description(
                    session,
                    claim=claim,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                )
            session.execute(
                update(OpinionGroupDescriptionTranslationWork)
                .where(
                    and_(
                        OpinionGroupDescriptionTranslationWork.id == claim.id,
                        OpinionGroupDescriptionTranslationWork.lease_token == claim.lease_token,
                    )
                )
                .values(
                    next_run_at=retry_at,
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    last_error_code=error_code,
                    last_error_message=error_message,
                    updated_at=func.now(),
                )
            )
        schedule = _get_conversation_schedule(
            session,
            conversation_id=claim.conversation_id,
            require_activated_view_snapshot=require_activated_view_snapshot,
        )
        if not require_activated_view_snapshot:
            activate_display_safe_view_snapshots(
                session,
                conversation_ids=[claim.conversation_id],
                block_pending_translations=block_pending_translations_for_activation,
                checkpoint_activation_context=checkpoint_activation_context,
            )
        session.commit()
        if isinstance(claim, ClaimedLineageDescriptionWorkItem):
            retry_kind = "lineage"
            retry_target_name = "lineageId"
            retry_target_id = claim.lineage_id
        else:
            retry_kind = "translation"
            retry_target_name = "descriptionId"
            retry_target_id = claim.description_id
        fallback_marked = not retry_immediately_without_fallback
        log.info(
            "[AiDescriptionWorkDB] Scheduled AI description retry kind=%s "
            "conversationSlugId=%s conversationId=%d locale=%s %s=%d attemptCount=%d "
            "retryAt=%s delaySeconds=%.1f immediate=%s forceCooldown=%s "
            "fallbackMarked=%s activationBlocksTranslations=%s",
            retry_kind,
            claim.conversation_slug_id,
            claim.conversation_id,
            claim.locale,
            retry_target_name,
            retry_target_id,
            claim.attempt_count,
            retry_at.isoformat(),
            delay_seconds,
            retry_immediately_without_fallback,
            force_cooldown,
            fallback_marked,
            block_pending_translations_for_activation,
        )
        return WorkStateSchedule(
            conversation_id=schedule.conversation_id,
            next_run_at=schedule.next_run_at,
            retry_scheduled_at=retry_at,
        )


def mark_non_retryable_ai_description_locale_work_item(
    engine: Engine,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    ai_description_epoch: int,
    error_code: str,
    error_message: str,
    block_pending_translations_for_activation: bool = False,
    require_activated_view_snapshot: bool = False,
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> WorkStateSchedule:
    with Session(engine) as session:
        if isinstance(claim, ClaimedLineageDescriptionWorkItem):
            _mark_english_statuses_fallback_for_lineage(
                session,
                claim=claim,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            session.execute(
                update(OpinionGroupLineageDescriptionWork)
                .where(
                    and_(
                        OpinionGroupLineageDescriptionWork.id == claim.id,
                        OpinionGroupLineageDescriptionWork.lease_token == claim.lease_token,
                    )
                )
                .values(
                    next_run_at=None,
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    non_retryable_ai_description_epoch=ai_description_epoch,
                    last_error_code=error_code,
                    last_error_message=error_message,
                    updated_at=func.now(),
                )
            )
        else:
            _mark_translation_statuses_fallback_for_description(
                session,
                claim=claim,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            session.execute(
                update(OpinionGroupDescriptionTranslationWork)
                .where(
                    and_(
                        OpinionGroupDescriptionTranslationWork.id == claim.id,
                        OpinionGroupDescriptionTranslationWork.lease_token == claim.lease_token,
                    )
                )
                .values(
                    next_run_at=None,
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    non_retryable_ai_description_epoch=ai_description_epoch,
                    last_error_code=error_code,
                    last_error_message=error_message,
                    updated_at=func.now(),
                )
            )
        schedule = _get_conversation_schedule(
            session,
            conversation_id=claim.conversation_id,
            require_activated_view_snapshot=require_activated_view_snapshot,
        )
        if not require_activated_view_snapshot:
            activate_display_safe_view_snapshots(
                session,
                conversation_ids=[claim.conversation_id],
                block_pending_translations=block_pending_translations_for_activation,
                checkpoint_activation_context=checkpoint_activation_context,
            )
        session.commit()
        return schedule


def _mark_lineage_description_work_complete(
    session: Session,
    *,
    claim: ClaimedLineageDescriptionWorkItem,
) -> None:
    session.execute(
        update(OpinionGroupLineageDescriptionWork)
        .where(
            and_(
                OpinionGroupLineageDescriptionWork.id == claim.id,
                OpinionGroupLineageDescriptionWork.lease_token == claim.lease_token,
            )
        )
        .values(
            next_run_at=None,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
    )


def _mark_translation_work_complete(
    session: Session,
    *,
    claim: ClaimedDescriptionTranslationWorkItem,
) -> None:
    session.execute(
        update(OpinionGroupDescriptionTranslationWork)
        .where(
            and_(
                OpinionGroupDescriptionTranslationWork.id == claim.id,
                OpinionGroupDescriptionTranslationWork.lease_token == claim.lease_token,
            )
        )
        .values(
            next_run_at=None,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
    )


def _refresh_english_locale_statuses(
    session: Session,
    *,
    conversation_ids: list[int],
    require_activated_view_snapshot: bool = False,
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=conversation_ids,
        locale="en",
        require_activated_view_snapshot=require_activated_view_snapshot,
    )
    ready_status_ids: list[int] = []
    ready_view_snapshot_ids: list[int] = []
    for status in statuses:
        _description_ids, all_lineages_have_descriptions = (
            _required_system_description_ids_for_status(session, status=status)
        )
        if not all_lineages_have_descriptions:
            continue
        ready_status_ids.append(status.id)
        ready_view_snapshot_ids.append(status.conversation_view_snapshot_id)

    if not ready_status_ids:
        return

    session.execute(
        update(OpinionGroupDescriptionLocaleStatus)
        .where(OpinionGroupDescriptionLocaleStatus.id.in_(ready_status_ids))
        .values(
            status=AiDescriptionLocaleStatusEnum.ready,
            next_run_at=None,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
    )
    session.execute(
        update(OpinionGroupDescriptionLocaleStatus)
        .where(
            and_(
                OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id.in_(
                    sorted(set(ready_view_snapshot_ids))
                ),
                OpinionGroupDescriptionLocaleStatus.locale != "en",
                OpinionGroupDescriptionLocaleStatus.translation_expected.is_(True),
                OpinionGroupDescriptionLocaleStatus.status != AiDescriptionLocaleStatusEnum.ready,
                OpinionGroupDescriptionLocaleStatus.next_run_at.is_(None),
            )
        )
        .values(
            next_run_at=func.now(),
            non_retryable_ai_description_epoch=None,
            updated_at=func.now(),
        )
    )


def _refresh_translation_locale_statuses(
    session: Session,
    *,
    conversation_ids: list[int],
    locales: list[str],
    require_activated_view_snapshot: bool = False,
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=conversation_ids,
        non_english_only=True,
        translation_expected=True,
        require_activated_view_snapshot=require_activated_view_snapshot,
    )
    locale_set = set(locales)
    ready_status_ids: list[int] = []
    for status in statuses:
        if status.locale not in locale_set:
            continue
        description_ids, all_lineages_have_descriptions = (
            _required_system_description_ids_for_status(session, status=status)
        )
        if not all_lineages_have_descriptions:
            continue
        if description_ids:
            translated_rows = session.execute(
                select(OpinionGroupDescriptionTranslation.description_id).where(
                    and_(
                        OpinionGroupDescriptionTranslation.description_id.in_(
                            sorted(description_ids)
                        ),
                        OpinionGroupDescriptionTranslation.locale == status.locale,
                    )
                )
            ).all()
            translated_description_ids = {row.description_id for row in translated_rows}
            if description_ids - translated_description_ids:
                continue
        ready_status_ids.append(status.id)

    if not ready_status_ids:
        return

    session.execute(
        update(OpinionGroupDescriptionLocaleStatus)
        .where(OpinionGroupDescriptionLocaleStatus.id.in_(ready_status_ids))
        .values(
            status=AiDescriptionLocaleStatusEnum.ready,
            next_run_at=None,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
    )


def _mark_english_statuses_fallback_for_lineage(
    session: Session,
    *,
    claim: ClaimedLineageDescriptionWorkItem,
    require_activated_view_snapshot: bool = False,
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=[claim.conversation_id],
        locale="en",
        require_activated_view_snapshot=require_activated_view_snapshot,
    )
    fallback_status_ids = [
        status.id
        for status in statuses
        if any(
            row.lineage_id == claim.lineage_id
            for row in _fetch_required_lineage_description_rows_for_status(
                session,
                status=status,
            )
        )
    ]
    if not fallback_status_ids:
        return

    fallback_view_snapshot_ids = [
        status.conversation_view_snapshot_id
        for status in statuses
        if status.id in fallback_status_ids
    ]
    session.execute(
        update(OpinionGroupDescriptionLocaleStatus)
        .where(OpinionGroupDescriptionLocaleStatus.id.in_(fallback_status_ids))
        .values(
            status=AiDescriptionLocaleStatusEnum.fallback,
            next_run_at=None,
            updated_at=func.now(),
        )
    )
    session.execute(
        update(OpinionGroupDescriptionLocaleStatus)
        .where(
            and_(
                OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id.in_(
                    sorted(set(fallback_view_snapshot_ids))
                ),
                OpinionGroupDescriptionLocaleStatus.locale != "en",
                OpinionGroupDescriptionLocaleStatus.translation_expected.is_(True),
                OpinionGroupDescriptionLocaleStatus.status == AiDescriptionLocaleStatusEnum.pending,
            )
        )
        .values(
            status=AiDescriptionLocaleStatusEnum.fallback,
            next_run_at=None,
            updated_at=func.now(),
        )
    )


def _mark_translation_statuses_fallback_for_description(
    session: Session,
    *,
    claim: ClaimedDescriptionTranslationWorkItem,
    require_activated_view_snapshot: bool = False,
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=[claim.conversation_id],
        locale=claim.locale,
        translation_expected=True,
        require_activated_view_snapshot=require_activated_view_snapshot,
    )
    fallback_status_ids: list[int] = []
    for status in statuses:
        description_ids, _all_lineages_have_descriptions = (
            _required_system_description_ids_for_status(session, status=status)
        )
        if claim.description_id in description_ids:
            fallback_status_ids.append(status.id)

    if not fallback_status_ids:
        return

    session.execute(
        update(OpinionGroupDescriptionLocaleStatus)
        .where(OpinionGroupDescriptionLocaleStatus.id.in_(fallback_status_ids))
        .values(
            status=AiDescriptionLocaleStatusEnum.fallback,
            next_run_at=None,
            updated_at=func.now(),
        )
    )


def _get_conversation_schedule(
    session: Session,
    *,
    conversation_id: int,
    require_activated_view_snapshot: bool = False,
) -> WorkStateSchedule:
    lineage_next_run_at = session.execute(
        select(func.min(OpinionGroupLineageDescriptionWork.next_run_at)).where(
            and_(
                OpinionGroupLineageDescriptionWork.conversation_id == conversation_id,
                OpinionGroupLineageDescriptionWork.next_run_at.is_not(None),
                OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                _lineage_work_relevant_status_filter(
                    conversation_view_snapshot_ids=None,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                ),
            )
        )
    ).scalar_one_or_none()
    translation_next_run_at = session.execute(
        select(func.min(OpinionGroupDescriptionTranslationWork.next_run_at)).where(
            and_(
                OpinionGroupDescriptionTranslationWork.conversation_id == conversation_id,
                OpinionGroupDescriptionTranslationWork.next_run_at.is_not(None),
                OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                _translation_work_relevant_status_filter(
                    conversation_view_snapshot_ids=None,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                ),
            )
        )
    ).scalar_one_or_none()
    next_run_values = [
        next_run_at
        for next_run_at in (lineage_next_run_at, translation_next_run_at)
        if next_run_at is not None
    ]
    return WorkStateSchedule(
        conversation_id=conversation_id,
        next_run_at=min(next_run_values) if next_run_values else None,
    )


def _fetch_base_description_request_for_lineage_work(
    session: Session,
    *,
    claim: ClaimedLineageDescriptionWorkItem,
) -> _LineageDescriptionRequest | None:
    existing_description_id = session.execute(
        select(OpinionGroupLineage.system_description_id).where(
            OpinionGroupLineage.id == claim.lineage_id
        )
    ).scalar_one_or_none()
    if existing_description_id is not None:
        return None

    conversation_content = session.execute(
        select(ConversationContent.title, ConversationContent.body, AnalysisSnapshot.id)
        .select_from(OpinionGroupCandidate)
        .join(
            AnalysisSnapshotResult,
            AnalysisSnapshotResult.id == OpinionGroupCandidate.snapshot_result_id,
        )
        .join(AnalysisSnapshot, AnalysisSnapshot.id == AnalysisSnapshotResult.analysis_snapshot_id)
        .join(
            ConversationContent,
            ConversationContent.id == AnalysisSnapshot.conversation_content_id,
        )
        .where(OpinionGroupCandidate.id == claim.source_candidate_id)
        .limit(1)
    ).first()
    if conversation_content is None:
        msg = "analysis snapshot is missing conversation content"
        raise DescriptionInputError(msg)

    lineage_row = session.execute(
        select(
            OpinionGroup.key,
        )
        .where(
            and_(
                OpinionGroup.candidate_id == claim.source_candidate_id,
                OpinionGroup.lineage_id == claim.lineage_id,
            )
        )
        .limit(1)
    ).first()
    if lineage_row is None:
        msg = f"lineage {claim.lineage_id} is missing source group"
        raise DescriptionInputError(msg)

    representative_rows = session.execute(
        select(
            AnalysisSnapshotOpinion.opinion_id,
            OpinionContent.content,
            OpinionGroupOpinionStats.representative_agreement_type,
        )
        .select_from(OpinionGroup)
        .join(OpinionGroupOpinionStats, OpinionGroupOpinionStats.group_id == OpinionGroup.id)
        .join(
            AnalysisSnapshotOpinion,
            AnalysisSnapshotOpinion.id == OpinionGroupOpinionStats.analysis_snapshot_opinion_id,
        )
        .join(OpinionContent, OpinionContent.id == AnalysisSnapshotOpinion.opinion_content_id)
        .where(
            and_(
                OpinionGroup.candidate_id == claim.source_candidate_id,
                OpinionGroup.lineage_id == claim.lineage_id,
                OpinionGroupOpinionStats.representative_agreement_type.is_not(None),
            )
        )
        .order_by(AnalysisSnapshotOpinion.opinion_id)
    ).all()
    if not representative_rows:
        msg = f"lineage {claim.lineage_id} has no representative opinions"
        raise DescriptionInputError(msg)

    group = GroupDescriptionInput(
        group_key=lineage_row.key,
        representative_opinions=sorted(
            [
                RepresentativeOpinionText(
                    opinion_id=row.opinion_id,
                    stance=row.representative_agreement_type,
                    content=row.content,
                )
                for row in representative_rows
                if row.representative_agreement_type is not None
            ],
            key=lambda opinion: (opinion.stance.value, opinion.opinion_id),
        ),
    )
    return _LineageDescriptionRequest(
        group_key=group.group_key,
        conversation=ConversationDescriptionInput(
            conversation_title=conversation_content.title,
            conversation_body=conversation_content.body,
            groups=[group],
            analysis_snapshot_id=conversation_content.id,
        ),
    )


def _persist_generated_base_description_for_lineage_work(
    session: Session,
    *,
    claim: ClaimedLineageDescriptionWorkItem,
    request: _LineageDescriptionRequest,
    generated: ParsedLabelSummaryOutput,
) -> None:
    lineage = session.execute(
        select(OpinionGroupLineage.system_description_id)
        .where(OpinionGroupLineage.id == claim.lineage_id)
        .with_for_update()
    ).first()
    if lineage is None:
        msg = f"lineage {claim.lineage_id} is missing"
        raise DescriptionInputError(msg)
    if lineage.system_description_id is not None:
        return

    label_summary = generated.clusters.get(request.group_key)
    if label_summary is None:
        msg = f"missing generated description for group {request.group_key}"
        raise DescriptionOutputError(msg)

    description_id = session.execute(
        sqlalchemy_insert(OpinionGroupDescription)
        .values(
            {
                "locale": "en",
                "label": label_summary.label,
                "summary": label_summary.summary,
            }
        )
        .returning(OpinionGroupDescription.id)
    ).scalar_one()
    session.execute(
        update(OpinionGroupLineage)
        .where(
            and_(
                OpinionGroupLineage.id == claim.lineage_id,
                OpinionGroupLineage.system_description_id.is_(None),
            )
        )
        .values(system_description_id=description_id)
    )


def _persist_locale_translation_for_description_work(
    session: Session,
    *,
    claim: ClaimedDescriptionTranslationWorkItem,
    translations: list[DescriptionTranslation],
) -> None:
    existing_translation = session.execute(
        select(OpinionGroupDescriptionTranslation.id)
        .where(
            and_(
                OpinionGroupDescriptionTranslation.description_id == claim.description_id,
                OpinionGroupDescriptionTranslation.locale == claim.locale,
            )
        )
        .limit(1)
    ).first()
    if existing_translation is not None:
        return

    if len(translations) != 1:
        msg = f"translation output mismatch for locale {claim.locale}"
        raise DescriptionOutputError(msg)

    translation = translations[0]
    if translation.description_id != claim.description_id or translation.locale != claim.locale:
        msg = f"translation output mismatch for locale {claim.locale}"
        raise DescriptionOutputError(msg)

    session.execute(
        pg_insert(OpinionGroupDescriptionTranslation)
        .values(
            {
                "description_id": translation.description_id,
                "locale": translation.locale,
                "label": translation.label,
                "summary": translation.summary,
            }
        )
        .on_conflict_do_nothing(
            index_elements=[
                OpinionGroupDescriptionTranslation.description_id,
                OpinionGroupDescriptionTranslation.locale,
            ]
        )
    )


def _fetch_description_for_translation_work(
    session: Session,
    *,
    claim: ClaimedDescriptionTranslationWorkItem,
) -> DescriptionForTranslation | None:
    existing_translation = session.execute(
        select(OpinionGroupDescriptionTranslation.id)
        .where(
            and_(
                OpinionGroupDescriptionTranslation.description_id == claim.description_id,
                OpinionGroupDescriptionTranslation.locale == claim.locale,
            )
        )
        .limit(1)
    ).first()
    if existing_translation is not None:
        return None

    description_row = session.execute(
        select(
            OpinionGroupDescription.id,
            OpinionGroupDescription.label,
            OpinionGroupDescription.summary,
        ).where(OpinionGroupDescription.id == claim.description_id)
    ).first()
    if description_row is None:
        msg = f"description {claim.description_id} is missing"
        raise DescriptionInputError(msg)

    lineage_context = session.execute(
        select(
            OpinionGroupLineage.id.label("lineage_id"),
            OpinionGroupLineageDescriptionWork.source_candidate_id,
        )
        .join(
            OpinionGroupLineageDescriptionWork,
            OpinionGroupLineageDescriptionWork.lineage_id == OpinionGroupLineage.id,
        )
        .where(
            and_(
                OpinionGroupLineage.system_description_id == claim.description_id,
                OpinionGroupLineageDescriptionWork.conversation_id == claim.conversation_id,
            )
        )
        .limit(1)
    ).first()

    conversation_title: str | None = None
    representative_opinions: list[TranslationRepresentativeOpinion] = []
    if lineage_context is not None:
        conversation_content = session.execute(
            select(ConversationContent.title)
            .select_from(OpinionGroupCandidate)
            .join(
                AnalysisSnapshotResult,
                AnalysisSnapshotResult.id == OpinionGroupCandidate.snapshot_result_id,
            )
            .join(
                AnalysisSnapshot,
                AnalysisSnapshot.id == AnalysisSnapshotResult.analysis_snapshot_id,
            )
            .join(
                ConversationContent,
                ConversationContent.id == AnalysisSnapshot.conversation_content_id,
            )
            .where(OpinionGroupCandidate.id == lineage_context.source_candidate_id)
            .limit(1)
        ).first()
        conversation_title = (
            conversation_content.title if conversation_content is not None else None
        )
        representative_rows = session.execute(
            select(
                AnalysisSnapshotOpinion.opinion_id,
                OpinionContent.content,
                OpinionGroupOpinionStats.representative_agreement_type,
            )
            .select_from(OpinionGroup)
            .join(OpinionGroupOpinionStats, OpinionGroupOpinionStats.group_id == OpinionGroup.id)
            .join(
                AnalysisSnapshotOpinion,
                AnalysisSnapshotOpinion.id == OpinionGroupOpinionStats.analysis_snapshot_opinion_id,
            )
            .join(OpinionContent, OpinionContent.id == AnalysisSnapshotOpinion.opinion_content_id)
            .where(
                and_(
                    OpinionGroup.candidate_id == lineage_context.source_candidate_id,
                    OpinionGroup.lineage_id == lineage_context.lineage_id,
                    OpinionGroupOpinionStats.representative_agreement_type.is_not(None),
                )
            )
            .order_by(AnalysisSnapshotOpinion.opinion_id)
        ).all()
        representative_opinions = sorted(
            [
                TranslationRepresentativeOpinion(
                    opinion_id=row.opinion_id,
                    stance=row.representative_agreement_type.value,
                    content=row.content,
                )
                for row in representative_rows
                if row.representative_agreement_type is not None
            ],
            key=lambda opinion: (opinion.stance, opinion.opinion_id),
        )

    return DescriptionForTranslation(
        description_id=description_row.id,
        label=description_row.label,
        summary=description_row.summary,
        conversation_title=conversation_title,
        representative_opinions=representative_opinions,
    )


def _fetch_required_candidate_ids_for_result(
    session: Session,
    *,
    analysis_snapshot_result_id: int,
) -> list[int]:
    candidate_rows = session.execute(
        select(
            OpinionGroupCandidate.id.label("candidate_id"),
            OpinionGroupVariant.group_count,
            OpinionGroupCandidateAssessment.selection_score,
        )
        .join(
            OpinionGroupVariant,
            OpinionGroupVariant.id == OpinionGroupCandidate.opinion_group_variant_id,
        )
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(
                OpinionGroupCandidate.snapshot_result_id == analysis_snapshot_result_id,
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
            )
        )
        .order_by(OpinionGroupVariant.group_count.asc())
    ).all()
    return _select_required_candidate_ids_from_options(
        session,
        analysis_snapshot_result_id=analysis_snapshot_result_id,
        options=[
            _CandidateOption(
                candidate_id=row.candidate_id,
                group_count=row.group_count,
                selection_score=row.selection_score,
            )
            for row in candidate_rows
        ],
    )


def _select_required_candidate_ids_from_options(
    session: Session,
    *,
    analysis_snapshot_result_id: int,
    options: Sequence[_CandidateOption],
) -> list[int]:
    if not options:
        return []

    result_row = session.execute(
        select(AnalysisSnapshotResult.variants_enabled).where(
            AnalysisSnapshotResult.id == analysis_snapshot_result_id
        )
    ).first()
    if result_row is not None and result_row.variants_enabled:
        return sorted({option.candidate_id for option in options})

    selected = max(
        options,
        key=lambda option: (
            option.selection_score if option.selection_score is not None else float("-inf"),
            option.group_count,
        ),
    )
    return [selected.candidate_id]
