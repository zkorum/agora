from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import and_, false, func, or_, select, true, update
from sqlalchemy import insert as sqlalchemy_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, aliased

from math_updater.description_input import (
    ConversationDescriptionInput,
    DescriptionInputError,
    GroupDescriptionInput,
    RepresentativeOpinionText,
)
from math_updater.description_translation import DescriptionForTranslation
from math_updater.generated_models import (
    AiDescriptionLocaleStatusEnum,
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotOpinion,
    AnalysisSnapshotResult,
    Conversation,
    ConversationContent,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
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
    PremiumFeatureEntitlement,
)
from math_updater.generated_models import PremiumFeature as PremiumFeatureEnum
from math_updater.generated_shared_types import SUPPORTED_DISPLAY_LANGUAGE_CODES
from math_updater.retry_policy import RetryPolicy, next_retry_at

if TYPE_CHECKING:
    from collections.abc import Callable, Mapping, Sequence

    from sqlalchemy import Engine
    from sqlalchemy.sql.elements import ColumnElement

    from math_updater.bedrock_label_summary import ParsedLabelSummaryOutput
    from math_updater.description_translation import DescriptionTranslation

    DescriptionGenerator = Callable[
        [ConversationDescriptionInput],
        ParsedLabelSummaryOutput,
    ]
    DescriptionTranslator = Callable[
        [list[DescriptionForTranslation], list[str]],
        list[DescriptionTranslation],
    ]


PREMIUM_ANALYSIS_FEATURE = PremiumFeatureEnum.analysis_variants


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


def _latest_or_checkpoint_status_condition() -> ColumnElement[bool]:
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
    return or_(checkpoint_exists, ~newer_view_snapshot_exists)


def fetch_due_ai_description_work_conversation_ids(
    engine: Engine,
    *,
    limit: int,
    ai_description_epoch: int,
    translation_enabled: bool,
) -> list[int]:
    with Session(engine) as session:
        rows = list(
            session.execute(
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
            ).all()
        )
        if translation_enabled:
            rows.extend(
                session.execute(
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
                ).all()
            )
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
                    true()
                    if translation_enabled
                    else OpinionGroupDescriptionLocaleStatus.locale == "en",
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
                    _latest_or_checkpoint_status_condition(),
                )
            )
            .order_by(OpinionGroupDescriptionLocaleStatus.next_run_at.asc())
            .limit(limit)
        ).all()
        rows.extend(status_rows)

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
) -> list[int]:
    with Session(engine) as session:
        rows = list(
            session.execute(
                update(OpinionGroupLineageDescriptionWork)
                .where(
                    and_(
                        OpinionGroupLineageDescriptionWork.lease_expires_at.is_not(None),
                        OpinionGroupLineageDescriptionWork.lease_expires_at < func.now(),
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
            ).all()
        )
        if translation_enabled:
            rows.extend(
                session.execute(
                    update(OpinionGroupDescriptionTranslationWork)
                    .where(
                        and_(
                            OpinionGroupDescriptionTranslationWork.lease_expires_at.is_not(None),
                            OpinionGroupDescriptionTranslationWork.lease_expires_at < func.now(),
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
                ).all()
            )
        session.commit()

    return sorted({row.conversation_id for row in rows})


def activate_pending_translation_expectations(
    engine: Engine,
    *,
    limit: int,
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
                    OpinionGroupDescriptionLocaleStatus.locale != "en",
                    OpinionGroupDescriptionLocaleStatus.status
                    != AiDescriptionLocaleStatusEnum.ready,
                    OpinionGroupDescriptionLocaleStatus.translation_expected.is_(False),
                    OpinionGroupDescriptionLocaleStatus.lease_token.is_(None),
                    english_ready_exists,
                    or_(checkpoint_exists, ~newer_view_snapshot_exists),
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


def _fetch_pending_locale_status_rows(
    session: Session,
    *,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int] | None = None,
    locale: str | None = None,
    non_english_only: bool = False,
    translation_expected: bool | None = None,
    next_run_required: bool = False,
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
                OpinionGroupDescriptionLocaleStatus.status != AiDescriptionLocaleStatusEnum.ready,
                locale_filter,
                translation_expected_filter,
                next_run_filter,
                _pending_status_view_snapshot_filter(conversation_view_snapshot_ids),
                _latest_or_checkpoint_status_condition(),
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
        conversation_id=status.conversation_id,
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
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        locale="en",
        next_run_required=True,
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

    insert_query = pg_insert(OpinionGroupLineageDescriptionWork).values(
        [
            {
                "lineage_id": demand.lineage_id,
                "conversation_id": demand.conversation_id,
                "source_candidate_id": demand.source_candidate_id,
                "next_run_at": demand.next_run_at or func.now(),
            }
            for demand in demands
        ]
    )
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
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        non_english_only=True,
        translation_expected=True,
        next_run_required=True,
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

    insert_query = pg_insert(OpinionGroupDescriptionTranslationWork).values(
        [
            {
                "description_id": demand.description_id,
                "conversation_id": demand.conversation_id,
                "locale": demand.locale,
                "next_run_at": demand.next_run_at or func.now(),
            }
            for demand in demands
        ]
    )
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


def _lineage_work_view_snapshot_filter(
    conversation_view_snapshot_ids: list[int] | None,
) -> ColumnElement[bool]:
    if conversation_view_snapshot_ids is None:
        return true()
    if not conversation_view_snapshot_ids:
        return false_condition()

    return (
        select(OpinionGroupCandidate.id)
        .join(
            AnalysisSnapshotResult,
            AnalysisSnapshotResult.id == OpinionGroupCandidate.snapshot_result_id,
        )
        .join(
            ConversationViewSnapshot,
            and_(
                ConversationViewSnapshot.analysis_snapshot_id
                == AnalysisSnapshotResult.analysis_snapshot_id,
                ConversationViewSnapshot.opinion_group_spec_id
                == AnalysisSnapshotResult.opinion_group_spec_id,
            ),
        )
        .where(
            and_(
                OpinionGroupCandidate.id == OpinionGroupLineageDescriptionWork.source_candidate_id,
                ConversationViewSnapshot.id.in_(sorted(set(conversation_view_snapshot_ids))),
            )
        )
        .exists()
    )


def _translation_work_view_snapshot_filter(
    conversation_view_snapshot_ids: list[int] | None,
) -> ColumnElement[bool]:
    if conversation_view_snapshot_ids is None:
        return true()
    if not conversation_view_snapshot_ids:
        return false_condition()

    status = aliased(OpinionGroupDescriptionLocaleStatus)
    return (
        select(status.id)
        .join(
            OpinionGroupCandidate,
            OpinionGroupCandidate.snapshot_result_id == status.analysis_snapshot_result_id,
        )
        .join(OpinionGroup, OpinionGroup.candidate_id == OpinionGroupCandidate.id)
        .join(OpinionGroupLineage, OpinionGroupLineage.id == OpinionGroup.lineage_id)
        .where(
            and_(
                status.conversation_view_snapshot_id.in_(
                    sorted(set(conversation_view_snapshot_ids))
                ),
                status.locale == OpinionGroupDescriptionTranslationWork.locale,
                OpinionGroupLineage.system_description_id
                == OpinionGroupDescriptionTranslationWork.description_id,
            )
        )
        .exists()
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
) -> list[ClaimedAiDescriptionLocaleWorkItem]:
    if not conversation_ids or limit <= 0:
        return []

    unique_conversation_ids = list(dict.fromkeys(conversation_ids))[:limit]
    lease_expires_at = datetime.now(UTC) + timedelta(seconds=lease_ttl_seconds)
    claims: list[ClaimedAiDescriptionLocaleWorkItem] = []

    with Session(engine) as session:
        _ensure_lineage_description_work_for_pending_statuses(
            session,
            conversation_ids=unique_conversation_ids,
            conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        )
        _refresh_english_locale_statuses(
            session,
            conversation_ids=unique_conversation_ids,
        )
        if translation_enabled:
            _ensure_translation_work_for_pending_statuses(
                session,
                conversation_ids=unique_conversation_ids,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
            )
            _refresh_translation_locale_statuses(
                session,
                conversation_ids=unique_conversation_ids,
                locales=[locale for locale in SUPPORTED_DISPLAY_LANGUAGE_CODES if locale != "en"],
            )

        for conversation_id in unique_conversation_ids:
            claimable_lineage_row = session.execute(
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
                        OpinionGroupLineage.system_description_id.is_(None),
                        OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                        OpinionGroupLineageDescriptionWork.next_run_at.is_not(None),
                        OpinionGroupLineageDescriptionWork.next_run_at <= func.now(),
                        _lineage_work_view_snapshot_filter(conversation_view_snapshot_ids),
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
                .limit(1)
                .with_for_update(skip_locked=True)
            ).first()
            if claimable_lineage_row is not None:
                lease_token = f"{worker_id}:{uuid.uuid4()}"
                attempt_count = claimable_lineage_row.attempt_count + 1
                updated_lineage_row = session.execute(
                    update(OpinionGroupLineageDescriptionWork)
                    .where(
                        and_(
                            OpinionGroupLineageDescriptionWork.id == claimable_lineage_row.id,
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
                continue

            if not translation_enabled:
                continue

            claimable_translation_row = session.execute(
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
                        OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                        OpinionGroupDescriptionTranslationWork.next_run_at.is_not(None),
                        OpinionGroupDescriptionTranslationWork.next_run_at <= func.now(),
                        _translation_work_view_snapshot_filter(conversation_view_snapshot_ids),
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
                .limit(1)
                .with_for_update(skip_locked=True)
            ).first()
            if claimable_translation_row is None:
                continue

            lease_token = f"{worker_id}:{uuid.uuid4()}"
            attempt_count = claimable_translation_row.attempt_count + 1
            updated_translation_row = session.execute(
                update(OpinionGroupDescriptionTranslationWork)
                .where(
                    and_(
                        OpinionGroupDescriptionTranslationWork.id == claimable_translation_row.id,
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
) -> WorkStateSchedule:
    with Session(engine) as session:
        if isinstance(claim, ClaimedLineageDescriptionWorkItem):
            _persist_base_description_for_lineage_work(
                session,
                claim=claim,
                generate_descriptions=generate_descriptions,
            )
            _mark_lineage_description_work_complete(session, claim=claim)
            _refresh_english_locale_statuses(
                session,
                conversation_ids=[claim.conversation_id],
            )
            _ensure_translation_work_for_pending_statuses(
                session,
                conversation_ids=[claim.conversation_id],
            )
        else:
            if translate_descriptions is None:
                msg = f"translation service unavailable for locale {claim.locale}"
                raise DescriptionInputError(msg)
            _persist_locale_translation_for_description_work(
                session,
                claim=claim,
                translate_descriptions=translate_descriptions,
            )
            _mark_translation_work_complete(session, claim=claim)
            _refresh_translation_locale_statuses(
                session,
                conversation_ids=[claim.conversation_id],
                locales=[claim.locale],
            )

        schedule = _get_conversation_schedule(session, conversation_id=claim.conversation_id)
        session.commit()
        return schedule


def retry_ai_description_locale_work_item(
    engine: Engine,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    retry_policy: RetryPolicy,
    error_code: str,
    error_message: str,
) -> WorkStateSchedule:
    retry_at = next_retry_at(
        now=datetime.now(UTC),
        attempt_count=claim.attempt_count,
        policy=retry_policy,
    )
    with Session(engine) as session:
        if isinstance(claim, ClaimedLineageDescriptionWorkItem):
            _mark_english_statuses_fallback_for_lineage(session, claim=claim)
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
            _mark_translation_statuses_fallback_for_description(session, claim=claim)
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
        )
        session.commit()
        return schedule


def mark_non_retryable_ai_description_locale_work_item(
    engine: Engine,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    ai_description_epoch: int,
    error_code: str,
    error_message: str,
) -> WorkStateSchedule:
    with Session(engine) as session:
        if isinstance(claim, ClaimedLineageDescriptionWorkItem):
            _mark_english_statuses_fallback_for_lineage(session, claim=claim)
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
            _mark_translation_statuses_fallback_for_description(session, claim=claim)
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
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=conversation_ids,
        locale="en",
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
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=conversation_ids,
        non_english_only=True,
        translation_expected=True,
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
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=[claim.conversation_id],
        locale="en",
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

    session.execute(
        update(OpinionGroupDescriptionLocaleStatus)
        .where(OpinionGroupDescriptionLocaleStatus.id.in_(fallback_status_ids))
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
) -> None:
    statuses = _fetch_pending_locale_status_rows(
        session,
        conversation_ids=[claim.conversation_id],
        locale=claim.locale,
        translation_expected=True,
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
) -> WorkStateSchedule:
    lineage_next_run_at = session.execute(
        select(func.min(OpinionGroupLineageDescriptionWork.next_run_at)).where(
            and_(
                OpinionGroupLineageDescriptionWork.conversation_id == conversation_id,
                OpinionGroupLineageDescriptionWork.next_run_at.is_not(None),
                OpinionGroupLineageDescriptionWork.lease_token.is_(None),
            )
        )
    ).scalar_one_or_none()
    translation_next_run_at = session.execute(
        select(func.min(OpinionGroupDescriptionTranslationWork.next_run_at)).where(
            and_(
                OpinionGroupDescriptionTranslationWork.conversation_id == conversation_id,
                OpinionGroupDescriptionTranslationWork.next_run_at.is_not(None),
                OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
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


def _persist_base_description_for_lineage_work(
    session: Session,
    *,
    claim: ClaimedLineageDescriptionWorkItem,
    generate_descriptions: DescriptionGenerator,
) -> None:
    existing_description_id = session.execute(
        select(OpinionGroupLineage.system_description_id).where(
            OpinionGroupLineage.id == claim.lineage_id
        )
    ).scalar_one_or_none()
    if existing_description_id is not None:
        return

    conversation_content = session.execute(
        select(ConversationContent.title, ConversationContent.body)
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
    generated = generate_descriptions(
        ConversationDescriptionInput(
            conversation_title=conversation_content.title,
            conversation_body=conversation_content.body,
            groups=[group],
        )
    )
    label_summary = generated.clusters.get(group.group_key)
    if label_summary is None:
        msg = f"missing generated description for group {group.group_key}"
        raise DescriptionInputError(msg)

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
    translate_descriptions: DescriptionTranslator,
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

    translations = translate_descriptions(
        [
            DescriptionForTranslation(
                description_id=description_row.id,
                label=description_row.label,
                summary=description_row.summary,
            )
        ],
        [claim.locale],
    )
    if len(translations) != 1:
        msg = f"translation output mismatch for locale {claim.locale}"
        raise DescriptionInputError(msg)

    translation = translations[0]
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


def _fetch_required_candidate_ids_for_result(
    session: Session,
    *,
    conversation_id: int,
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
        conversation_id=conversation_id,
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
    conversation_id: int,
    options: Sequence[_CandidateOption],
) -> list[int]:
    if not options:
        return []
    if _conversation_has_premium_analysis_access(
        session,
        conversation_id=conversation_id,
        now=datetime.now(UTC),
    ):
        return sorted({option.candidate_id for option in options})

    selected = max(
        options,
        key=lambda option: (
            option.selection_score if option.selection_score is not None else float("-inf"),
            option.group_count,
        ),
    )
    return [selected.candidate_id]


def _conversation_has_premium_analysis_access(
    session: Session,
    *,
    conversation_id: int,
    now: datetime,
) -> bool:
    conversation_row = session.execute(
        select(Conversation.author_id, Conversation.organization_id).where(
            Conversation.id == conversation_id
        )
    ).first()
    if conversation_row is None:
        return False

    entitlement_filters: list[ColumnElement[bool]] = []
    if conversation_row.author_id is not None:
        entitlement_filters.append(PremiumFeatureEntitlement.user_id == conversation_row.author_id)
    if conversation_row.organization_id is not None:
        entitlement_filters.append(
            PremiumFeatureEntitlement.organization_id == conversation_row.organization_id
        )
    if not entitlement_filters:
        return False

    entitlement_row = session.execute(
        select(PremiumFeatureEntitlement.id)
        .where(
            and_(
                PremiumFeatureEntitlement.feature == PREMIUM_ANALYSIS_FEATURE,
                PremiumFeatureEntitlement.starts_at <= now,
                PremiumFeatureEntitlement.revoked_at.is_(None),
                or_(
                    PremiumFeatureEntitlement.expires_at.is_(None),
                    PremiumFeatureEntitlement.expires_at > now,
                ),
                or_(*entitlement_filters),
            )
        )
        .limit(1)
    ).first()
    return entitlement_row is not None
