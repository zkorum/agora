from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import and_, false, func, or_, select, true, tuple_, update
from sqlalchemy import insert as sqlalchemy_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session, aliased

from agora_analysis_worker_shared.bedrock_label_summary import (
    LabelSummary,
    ParsedLabelSummaryOutput,
)
from agora_analysis_worker_shared.db import (
    CheckpointActivationContext,
    materialize_checkpoint_reasons_for_activated_view_snapshots,
)
from agora_analysis_worker_shared.description_input import (
    ConversationDescriptionInput,
    DescriptionInputError,
    DescriptionOutputError,
    GroupDescriptionInput,
    RepresentativeOpinionText,
)
from agora_analysis_worker_shared.description_translation import (
    DescriptionForTranslation,
    TranslationRepresentativeOpinion,
    description_translation_output_locales,
    description_translation_provider_targets,
)
from agora_analysis_worker_shared.generated_models import (
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotOpinion,
    AnalysisSnapshotResult,
    Conversation,
    ConversationContent,
    ConversationTranslationTargetLanguage,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotReasonEnum,
    DisplayLanguageCode,
    OpinionContent,
    OpinionGroup,
    OpinionGroupCandidate,
    OpinionGroupCandidateAssessment,
    OpinionGroupCandidateDescriptionLocaleRequest,
    OpinionGroupDescription,
    OpinionGroupDescriptionTranslation,
    OpinionGroupDescriptionTranslationWork,
    OpinionGroupLineage,
    OpinionGroupLineageDescriptionWork,
    OpinionGroupOpinionStats,
    OpinionGroupVariant,
    PremiumFeature,
    PremiumFeatureEntitlement,
    ProjectOrganizationOwnership,
    RealtimeEventOutbox,
    SpokenLanguageCode,
)
from agora_analysis_worker_shared.generated_shared_types import (
    SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES,
)
from agora_analysis_worker_shared.provider_errors import is_provider_timeout_error

log = logging.getLogger(__name__)
POSTGRES_INSERT_BIND_PARAM_LIMIT = 60_000
DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE = 4
FIRST_PASS_MAX_EXISTING_ATTEMPT_COUNT = 1
SUPPORTED_EAGER_TRANSLATION_TARGET_LANGUAGE_CODES = set(
    SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES
)


def _matching_display_and_spoken_language_codes(
    display_language_codes: tuple[DisplayLanguageCode, ...],
) -> tuple[tuple[DisplayLanguageCode, SpokenLanguageCode], ...]:
    spoken_language_code_by_value = {code.value: code for code in SpokenLanguageCode}
    pairs: list[tuple[DisplayLanguageCode, SpokenLanguageCode]] = []
    for display_language_code in display_language_codes:
        spoken_language_code = spoken_language_code_by_value.get(display_language_code.value)
        if spoken_language_code is not None:
            pairs.append((display_language_code, spoken_language_code))
    return tuple(pairs)


SUPPORTED_EAGER_TRANSLATION_LANGUAGE_PAIRS = _matching_display_and_spoken_language_codes(
    SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES
)


class _AiDescriptionClaimScope(StrEnum):
    retry = "retry"
    first_pass = "first_pass"


def _max_rows_per_insert(*, column_count: int) -> int:
    return max(1, POSTGRES_INSERT_BIND_PARAM_LIMIT // column_count)


def _iter_chunks[T](values: list[T], *, chunk_size: int) -> Iterator[list[T]]:
    for start in range(0, len(values), chunk_size):
        yield values[start : start + chunk_size]


if TYPE_CHECKING:
    from collections.abc import Callable, Iterator, Mapping, Sequence

    from sqlalchemy import Engine
    from sqlalchemy.orm.attributes import InstrumentedAttribute
    from sqlalchemy.sql.elements import ColumnElement, UnaryExpression

    from agora_analysis_worker_shared.description_translation import DescriptionTranslation

    DescriptionGenerator = Callable[
        [ConversationDescriptionInput],
        ParsedLabelSummaryOutput,
    ]
    DescriptionTranslator = Callable[
        [list[DescriptionForTranslation], list[str]],
        list[DescriptionTranslation],
    ]
    type _OrderByExpression = (
        ColumnElement[bool]
        | ColumnElement[datetime | None]
        | UnaryExpression[datetime]
        | InstrumentedAttribute[int]
    )


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
class AiDescriptionWorkResult:
    conversation_id: int
    retry_released_at: datetime | None = None


@dataclass(frozen=True)
class ClaimableAiDescriptionWorkConversationRow:
    conversation_id: int
    updated_at: datetime
    priority: int


@dataclass(frozen=True)
class FirstPassFinalizeResult:
    fallback_status_count: int
    activated_view_snapshot_ids: list[int]


@dataclass(frozen=True)
class FirstPassPendingStatusCounts:
    english: int
    translation: int

    @property
    def total(self) -> int:
        return self.english + self.translation


class FirstPassPendingStatusError(RuntimeError):
    pass


@dataclass(frozen=True)
class DescriptionTranslationBatchProcessResult:
    schedules: list[AiDescriptionWorkResult]
    translated_description_ids: list[int]
    missing_description_ids: list[int] = field(default_factory=list)


@dataclass(frozen=True)
class LineageDescriptionBatchProcessResult:
    schedules: list[AiDescriptionWorkResult]
    generated_lineage_ids: list[int]
    missing_lineage_ids: list[int] = field(default_factory=list)


@dataclass(frozen=True)
class AiDescriptionLeaseExtension:
    extended_lineage_work_ids: list[int]
    extended_translation_work_ids: list[int]

    @property
    def extended_count(self) -> int:
        return len(self.extended_lineage_work_ids) + len(
            self.extended_translation_work_ids
        )


@dataclass(frozen=True)
class _TranslationDescriptionContext:
    description_id: int
    lineage_id: int
    source_candidate_id: int
    conversation_title: str | None


def _format_ids_for_log(ids: Sequence[int]) -> str:
    limit = 20
    head = list(ids[:limit])
    suffix = "" if len(ids) <= limit else f", ... +{len(ids) - limit}"
    return ", ".join(str(item_id) for item_id in head) + suffix


def description_translation_work_claim_batches(
    claims: list[ClaimedDescriptionTranslationWorkItem],
) -> list[list[ClaimedDescriptionTranslationWorkItem]]:
    batches: list[list[ClaimedDescriptionTranslationWorkItem]] = []
    claims_by_context: dict[str, list[ClaimedDescriptionTranslationWorkItem]] = {}
    for claim in claims:
        provider_targets = description_translation_provider_targets([claim.locale])
        provider_target = provider_targets[0]
        claims_by_context.setdefault(provider_target, []).append(claim)

    for context_claims in claims_by_context.values():
        batches.extend(
            _iter_chunks(
                context_claims,
                chunk_size=DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE,
            )
        )
    return batches


def lineage_description_work_claim_batches(
    claims: list[ClaimedLineageDescriptionWorkItem],
) -> list[list[ClaimedLineageDescriptionWorkItem]]:
    claims_by_candidate_id: dict[int, list[ClaimedLineageDescriptionWorkItem]] = {}
    for claim in claims:
        claims_by_candidate_id.setdefault(claim.source_candidate_id, []).append(claim)
    return list(claims_by_candidate_id.values())


@dataclass(frozen=True)
class CandidateLocaleRequestRow:
    id: int
    conversation_id: int
    candidate_id: int
    locale: str


@dataclass(frozen=True)
class EagerDescriptionCandidateRow:
    conversation_id: int
    candidate_id: int
    language_code: str | None
    language_settings_source: str


@dataclass(frozen=True)
class EagerAdditionalTranslationLocaleRow:
    conversation_id: int
    language_code: str
    dynamic_translation_entitled: bool


@dataclass(frozen=True)
class EagerCandidateOptionRow:
    conversation_id: int
    conversation_view_snapshot_id: int
    candidate_id: int
    group_count: int
    preferred_group_count: int | None
    selection_score: float
    language_code: str | None
    language_settings_source: str


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


@dataclass(frozen=True)
class TranslationWorkDemand:
    description_id: int
    conversation_id: int
    locale: str


@dataclass(frozen=True)
class _TranslationWorkCandidateRelevance:
    eager_condition: ColumnElement[bool]
    explicit_locale_request_condition: ColumnElement[bool]


@dataclass(frozen=True)
class _LineageDescriptionWorkInsert:
    lineage_id: int
    conversation_id: int
    source_candidate_id: int

    def to_insert_value(self, *, include_timestamps: bool = False) -> dict[str, object]:
        value: dict[str, object] = {
            "lineage_id": self.lineage_id,
            "conversation_id": self.conversation_id,
            "source_candidate_id": self.source_candidate_id,
        }
        if include_timestamps:
            value["created_at"] = func.now()
            value["updated_at"] = func.now()
        return value


@dataclass(frozen=True)
class _TranslationWorkInsert:
    description_id: int
    conversation_id: int
    locale: str

    def to_insert_value(self, *, include_timestamps: bool = False) -> dict[str, object]:
        value: dict[str, object] = {
            "description_id": self.description_id,
            "conversation_id": self.conversation_id,
            "locale": self.locale,
        }
        if include_timestamps:
            value["created_at"] = func.now()
            value["updated_at"] = func.now()
        return value


@dataclass(frozen=True)
class _LineageDescriptionRequest:
    group_key: str
    conversation: ConversationDescriptionInput


def _latest_or_checkpoint_view_snapshot_filter(
    *,
    conversation_view_snapshot_ids: list[int] | None = None,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
    scope: str = "latest_or_checkpoint",
) -> ColumnElement[bool]:
    if require_activated_view_snapshot and require_unactivated_view_snapshot:
        return false()

    if conversation_view_snapshot_ids is not None:
        if not conversation_view_snapshot_ids:
            return false()
        view_snapshot_filter = ConversationViewSnapshot.id.in_(
            sorted(set(conversation_view_snapshot_ids))
        )
        if require_activated_view_snapshot:
            return and_(
                view_snapshot_filter,
                ConversationViewSnapshot.activated_at.is_not(None),
            )
        if require_unactivated_view_snapshot:
            return and_(
                view_snapshot_filter,
                ConversationViewSnapshot.activated_at.is_(None),
            )
        return view_snapshot_filter

    newer_view_snapshot = aliased(ConversationViewSnapshot)
    checkpoint_exists = (
        select(ConversationViewSnapshotCheckpointReason.id)
        .where(
            ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id
            == ConversationViewSnapshot.id
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
    if scope == "latest":
        scope_condition = and_(~checkpoint_exists, ~newer_view_snapshot_exists)
    elif scope == "checkpoint":
        scope_condition = checkpoint_exists
    else:
        scope_condition = or_(checkpoint_exists, ~newer_view_snapshot_exists)
    if not require_activated_view_snapshot:
        if require_unactivated_view_snapshot:
            return and_(
                ConversationViewSnapshot.activated_at.is_(None),
                scope_condition,
            )
        return scope_condition

    return and_(
        ConversationViewSnapshot.activated_at.is_not(None),
        scope_condition,
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
                            OpinionGroupLineageDescriptionWork.lease_token.is_not(None),
                        )
                    )
                    .values(
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
                            OpinionGroupDescriptionTranslationWork.lease_token.is_not(None),
                        )
                    )
                    .values(
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

        session.commit()

    return sorted(set(completed_conversation_ids))


def finalize_first_pass_ai_description_work_batch(
    engine: Engine,
    *,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int],
    translation_enabled: bool,
    fallback_pending_statuses: bool = False,
    require_ai_descriptions: bool = True,
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> FirstPassFinalizeResult:
    if not conversation_ids or not conversation_view_snapshot_ids:
        return FirstPassFinalizeResult(
            fallback_status_count=0,
            activated_view_snapshot_ids=[],
        )

    unique_conversation_ids = sorted(set(conversation_ids))
    unique_view_snapshot_ids = sorted(set(conversation_view_snapshot_ids))
    with Session(engine) as session:
        fallback_status_count = 0
        if require_ai_descriptions:
            _materialize_eager_lineage_description_work(
                session,
                conversation_ids=unique_conversation_ids,
                conversation_view_snapshot_ids=unique_view_snapshot_ids,
                require_unactivated_view_snapshot=True,
            )
            if translation_enabled:
                _materialize_eager_translation_work(
                    session,
                    conversation_ids=unique_conversation_ids,
                    conversation_view_snapshot_ids=unique_view_snapshot_ids,
                    require_unactivated_view_snapshot=True,
                )
            pending_counts = _first_pass_pending_work_counts(
                session,
                conversation_ids=unique_conversation_ids,
                conversation_view_snapshot_ids=unique_view_snapshot_ids,
                include_translations=translation_enabled,
            )
            if pending_counts.total > 0:
                fallback_status_count = pending_counts.total
                log.warning(
                    "[MathUpdaterDB] First-pass snapshot activation found pending expected "
                    "AI description work english=%d translation=%d conversation_ids=%s "
                    "view_snapshot_ids=%s fallbackPendingStatuses=%s",
                    pending_counts.english,
                    pending_counts.translation,
                    _format_ids_for_log(unique_conversation_ids),
                    _format_ids_for_log(unique_view_snapshot_ids),
                    fallback_pending_statuses,
                )
                session.commit()
                return FirstPassFinalizeResult(
                    fallback_status_count=fallback_status_count,
                    activated_view_snapshot_ids=[],
                )
        activated_view_snapshot_ids = _activate_first_pass_display_safe_view_snapshots(
            session,
            conversation_ids=unique_conversation_ids,
            conversation_view_snapshot_ids=unique_view_snapshot_ids,
            checkpoint_activation_context=checkpoint_activation_context,
        )
        session.commit()

    return FirstPassFinalizeResult(
        fallback_status_count=fallback_status_count,
        activated_view_snapshot_ids=activated_view_snapshot_ids,
    )


def fetch_claimable_ai_description_work_conversation_ids(
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
        rows: list[ClaimableAiDescriptionWorkConversationRow] = []
        if include_lineage_descriptions:
            lineage_latest_candidate_exists = _lineage_work_relevant_candidate_filter(
                conversation_view_snapshot_ids=None,
                require_activated_view_snapshot=require_activated_view_snapshot,
                snapshot_scope="latest",
            )
            lineage_rows = session.execute(
                select(
                    OpinionGroupLineageDescriptionWork.conversation_id,
                    OpinionGroupLineageDescriptionWork.updated_at,
                    lineage_latest_candidate_exists.label("has_latest_candidate"),
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
                        _lineage_work_relevant_candidate_filter(
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
                .order_by(
                    OpinionGroupLineageDescriptionWork.updated_at.asc(),
                    OpinionGroupLineageDescriptionWork.id,
                )
                .limit(limit)
            )
            rows.extend(
                ClaimableAiDescriptionWorkConversationRow(
                    conversation_id=row.conversation_id,
                    updated_at=row.updated_at,
                    priority=0 if row.has_latest_candidate else 1,
                )
                for row in lineage_rows
            )
        if translation_enabled and include_translations:
            translation_latest_candidate_exists = _translation_work_relevant_candidate_filter(
                conversation_view_snapshot_ids=None,
                require_activated_view_snapshot=require_activated_view_snapshot,
                snapshot_scope="latest",
            )
            translation_rows = session.execute(
                select(
                    OpinionGroupDescriptionTranslationWork.conversation_id,
                    OpinionGroupDescriptionTranslationWork.updated_at,
                    translation_latest_candidate_exists.label("has_latest_candidate"),
                )
                .join(
                    Conversation,
                    Conversation.id == OpinionGroupDescriptionTranslationWork.conversation_id,
                )
                .where(
                    and_(
                        Conversation.ai_labeling_enabled.is_(True),
                        OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                        _translation_work_relevant_candidate_filter(
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
                .order_by(
                    OpinionGroupDescriptionTranslationWork.updated_at.asc(),
                    OpinionGroupDescriptionTranslationWork.id,
                )
                .limit(limit)
            )
            rows.extend(
                ClaimableAiDescriptionWorkConversationRow(
                    conversation_id=row.conversation_id,
                    updated_at=row.updated_at,
                    priority=0 if row.has_latest_candidate else 1,
                )
                for row in translation_rows
            )
    claimable_conversation_ids: list[int] = []
    seen_conversation_ids: set[int] = set()
    sorted_rows = sorted(
        rows,
        key=lambda row: (
            row.priority,
            row.updated_at.timestamp(),
        ),
    )
    for row in sorted_rows:
        if row.conversation_id in seen_conversation_ids:
            continue
        seen_conversation_ids.add(row.conversation_id)
        claimable_conversation_ids.append(row.conversation_id)
        if len(claimable_conversation_ids) >= limit:
            break
    return claimable_conversation_ids


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
                            _lineage_work_relevant_candidate_filter(
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
                            _translation_work_relevant_candidate_filter(
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
                        updated_at=func.now(),
                    )
                    .returning(OpinionGroupDescriptionTranslationWork.conversation_id)
                )
            )
        session.commit()

    return sorted(set(recovered_conversation_ids))


def materialize_requested_description_translation_work(
    engine: Engine,
    *,
    limit: int,
    require_activated_view_snapshot: bool = False,
    include_checkpoints: bool = False,
) -> list[int]:
    if limit <= 0:
        return []

    with Session(engine) as session:
        eager_conversation_ids = _materialize_eager_translation_work(
            session,
            conversation_ids=None,
            conversation_view_snapshot_ids=None,
            limit=limit,
            require_activated_view_snapshot=require_activated_view_snapshot,
        )
        requested_conversation_ids = _materialize_translation_work_for_candidate_locale_requests(
            session,
            conversation_ids=None,
            conversation_view_snapshot_ids=None,
            limit=limit,
            require_activated_view_snapshot=require_activated_view_snapshot,
            include_checkpoints=include_checkpoints,
        )
        session.commit()

    return sorted({*eager_conversation_ids, *requested_conversation_ids})


def materialize_requested_lineage_description_work(
    engine: Engine,
    *,
    limit: int,
    require_activated_view_snapshot: bool = False,
    include_checkpoints: bool = False,
) -> list[int]:
    if limit <= 0:
        return []

    with Session(engine) as session:
        eager_conversation_ids = _materialize_eager_lineage_description_work(
            session,
            conversation_ids=None,
            conversation_view_snapshot_ids=None,
            limit=limit,
            require_activated_view_snapshot=require_activated_view_snapshot,
        )
        requested_conversation_ids = (
            _materialize_lineage_description_work_for_candidate_locale_requests(
                session,
                conversation_ids=None,
                conversation_view_snapshot_ids=None,
                limit=limit,
                require_activated_view_snapshot=require_activated_view_snapshot,
                include_checkpoints=include_checkpoints,
            )
        )
        session.commit()

    return sorted({*eager_conversation_ids, *requested_conversation_ids})


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


def _fetch_candidate_locale_request_rows(
    session: Session,
    *,
    conversation_ids: list[int] | None,
    conversation_view_snapshot_ids: list[int] | None = None,
    locale: str | None = None,
    non_english_only: bool = False,
    limit: int | None = None,
    require_activated_view_snapshot: bool = False,
    require_processable_conversation: bool = True,
    include_checkpoints: bool = True,
) -> list[CandidateLocaleRequestRow]:
    if conversation_ids is not None and not conversation_ids:
        return []
    if conversation_view_snapshot_ids is not None and not conversation_view_snapshot_ids:
        return []

    locale_filter: ColumnElement[bool]
    if locale is not None:
        locale_filter = (
            OpinionGroupCandidateDescriptionLocaleRequest.locale == locale
        )
    elif non_english_only:
        locale_filter = (
            OpinionGroupCandidateDescriptionLocaleRequest.locale != DisplayLanguageCode.en
        )
    else:
        locale_filter = true()

    conversation_filter: ColumnElement[bool] = (
        AnalysisSnapshotResult.conversation_id.in_(sorted(set(conversation_ids)))
        if conversation_ids is not None
        else true()
    )
    processable_filter = (
        _processable_conversation_condition() if require_processable_conversation else true()
    )
    scope = "latest_or_checkpoint" if include_checkpoints else "latest"

    query = (
        select(
            OpinionGroupCandidateDescriptionLocaleRequest.id,
            AnalysisSnapshotResult.conversation_id,
            OpinionGroupCandidateDescriptionLocaleRequest.candidate_id,
            OpinionGroupCandidateDescriptionLocaleRequest.locale,
            OpinionGroupCandidateDescriptionLocaleRequest.updated_at,
        )
        .join(
            OpinionGroupCandidate,
            OpinionGroupCandidate.id
            == OpinionGroupCandidateDescriptionLocaleRequest.candidate_id,
        )
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .join(
            AnalysisSnapshotResult,
            AnalysisSnapshotResult.id == OpinionGroupCandidate.snapshot_result_id,
        )
        .join(Conversation, Conversation.id == AnalysisSnapshotResult.conversation_id)
        .join(
            ConversationViewSnapshot,
            and_(
                ConversationViewSnapshot.conversation_id
                == AnalysisSnapshotResult.conversation_id,
                ConversationViewSnapshot.analysis_snapshot_id
                == AnalysisSnapshotResult.analysis_snapshot_id,
                ConversationViewSnapshot.opinion_group_spec_id
                == AnalysisSnapshotResult.opinion_group_spec_id,
            ),
        )
        .where(
            and_(
                conversation_filter,
                Conversation.ai_labeling_enabled.is_(True),
                processable_filter,
                locale_filter,
                AnalysisSnapshotResult.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
                _latest_or_checkpoint_view_snapshot_filter(
                    conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                    scope=scope,
                ),
            )
        )
        .distinct()
        .order_by(
            OpinionGroupCandidateDescriptionLocaleRequest.updated_at.asc(),
            OpinionGroupCandidateDescriptionLocaleRequest.id,
        )
    )
    if limit is not None:
        query = query.limit(limit)

    rows = session.execute(query).all()
    return [
        CandidateLocaleRequestRow(
            id=row.id,
            conversation_id=row.conversation_id,
            candidate_id=row.candidate_id,
            locale=row.locale,
        )
        for row in rows
    ]


def _first_pass_pending_work_counts(
    session: Session,
    *,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int],
    include_translations: bool = True,
) -> FirstPassPendingStatusCounts:
    if not conversation_ids or not conversation_view_snapshot_ids:
        return FirstPassPendingStatusCounts(english=0, translation=0)

    english_count = session.execute(
        select(func.count(OpinionGroupLineageDescriptionWork.id))
        .join(
            OpinionGroupLineage,
            OpinionGroupLineage.id == OpinionGroupLineageDescriptionWork.lineage_id,
        )
        .where(
            and_(
                OpinionGroupLineageDescriptionWork.conversation_id.in_(
                    sorted(set(conversation_ids))
                ),
                OpinionGroupLineage.system_description_id.is_(None),
                OpinionGroupLineageDescriptionWork.attempt_count == 0,
                OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                _lineage_work_relevant_candidate_filter(
                    conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                    require_unactivated_view_snapshot=True,
                ),
            )
        )
    ).scalar_one()
    translation_count = 0
    if include_translations:
        translation_count = session.execute(
            select(func.count(OpinionGroupDescriptionTranslationWork.id))
            .where(
                and_(
                    OpinionGroupDescriptionTranslationWork.conversation_id.in_(
                        sorted(set(conversation_ids))
                    ),
                    OpinionGroupDescriptionTranslationWork.attempt_count == 0,
                    OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
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
                    _eager_translation_work_relevant_candidate_filter(
                        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                        require_unactivated_view_snapshot=True,
                    ),
                )
            )
        ).scalar_one()
    return FirstPassPendingStatusCounts(
        english=english_count,
        translation=translation_count,
    )


def fetch_first_pass_pending_work_counts(
    engine: Engine,
    *,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int],
    include_translations: bool = True,
) -> FirstPassPendingStatusCounts:
    with Session(engine) as session:
        return _first_pass_pending_work_counts(
            session,
            conversation_ids=conversation_ids,
            conversation_view_snapshot_ids=conversation_view_snapshot_ids,
            include_translations=include_translations,
        )


def _activate_first_pass_display_safe_view_snapshots(
    session: Session,
    *,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int],
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> list[int]:
    if not conversation_ids or not conversation_view_snapshot_ids:
        return []

    candidate_filters: list[ColumnElement[bool]] = [
        ConversationViewSnapshot.conversation_id.in_(sorted(set(conversation_ids))),
        ConversationViewSnapshot.id.in_(sorted(set(conversation_view_snapshot_ids))),
        ConversationViewSnapshot.activated_at.is_(None),
        ConversationViewSnapshot.view_reason
        == ConversationViewSnapshotReasonEnum.analysis_completed,
    ]

    candidate_count = session.execute(
        select(func.count(ConversationViewSnapshot.id)).where(and_(*candidate_filters))
    ).scalar_one()

    rows = session.execute(
        update(ConversationViewSnapshot)
        .where(and_(*candidate_filters))
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
            "[MathUpdaterDB] Checked first-pass snapshot activation "
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
    locales_by_view_snapshot_id: Mapping[int, set[str]] | None = None,
    candidate_ids_by_view_snapshot_id: Mapping[int, set[int]] | None = None,
) -> None:
    if not conversation_view_snapshot_ids:
        return

    displayable_group_counts_by_view_snapshot_id = (
        _fetch_displayable_group_counts_by_view_snapshot_id(
            session,
            conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        )
    )

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
    values: list[dict[str, object]] = []
    for row in rows:
        if row.analysis_snapshot_id is None:
            continue
        locales = (
            sorted(locales_by_view_snapshot_id.get(row.id, set()))
            if locales_by_view_snapshot_id is not None
            else []
        )
        candidate_ids = (
            sorted(candidate_ids_by_view_snapshot_id.get(row.id, set()))
            if candidate_ids_by_view_snapshot_id is not None
            else []
        )
        values.append(
            {
                "event_type": "conversation_analysis_updated",
                "created_at": created_at,
                "payload": {
                    "conversationSlugId": row.slug_id,
                    "conversationViewSnapshotId": row.id,
                    "analysisSnapshotId": row.analysis_snapshot_id,
                    "changeKind": "descriptions" if locales else "snapshot",
                    "checkpointChanged": row.id in checkpoint_view_snapshot_ids,
                    "displayableGroupCounts": displayable_group_counts_by_view_snapshot_id.get(
                        row.id,
                        [],
                    ),
                    "opinionCount": row.opinion_count,
                    "voteCount": row.vote_count,
                    "participantCount": row.participant_count,
                    "totalOpinionCount": row.total_opinion_count,
                    "totalVoteCount": row.total_vote_count,
                    "totalParticipantCount": row.total_participant_count,
                    "moderatedOpinionCount": row.moderated_opinion_count,
                    "hiddenOpinionCount": row.hidden_opinion_count,
                    "isClosed": row.is_closed,
                    **(
                        {
                            "locales": locales,
                            "candidateIds": candidate_ids,
                        }
                        if locales
                        else {}
                    ),
                    "timestamp": timestamp,
                },
            }
        )
    if not values:
        return

    session.execute(sqlalchemy_insert(RealtimeEventOutbox).values(values))


def _fetch_displayable_group_counts_by_view_snapshot_id(
    session: Session,
    *,
    conversation_view_snapshot_ids: list[int],
) -> dict[int, list[int]]:
    if not conversation_view_snapshot_ids:
        return {}

    rows = session.execute(
        select(
            ConversationViewSnapshot.id.label("conversation_view_snapshot_id"),
            OpinionGroupVariant.group_count,
        )
        .join(
            AnalysisSnapshotResult,
            and_(
                AnalysisSnapshotResult.analysis_snapshot_id
                == ConversationViewSnapshot.analysis_snapshot_id,
                AnalysisSnapshotResult.opinion_group_spec_id
                == ConversationViewSnapshot.opinion_group_spec_id,
            ),
        )
        .join(
            OpinionGroupCandidate,
            OpinionGroupCandidate.snapshot_result_id == AnalysisSnapshotResult.id,
        )
        .join(
            OpinionGroupVariant,
            OpinionGroupVariant.id == OpinionGroupCandidate.opinion_group_variant_id,
        )
        .join(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(
                ConversationViewSnapshot.id.in_(sorted(set(conversation_view_snapshot_ids))),
                AnalysisSnapshotResult.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
                OpinionGroupCandidateAssessment.selection_score.is_not(None),
            )
        )
        .order_by(ConversationViewSnapshot.id, OpinionGroupVariant.group_count)
    ).all()

    group_counts_by_view_snapshot_id: dict[int, list[int]] = {}
    for row in rows:
        group_counts_by_view_snapshot_id.setdefault(
            row.conversation_view_snapshot_id,
            [],
        ).append(row.group_count)
    return group_counts_by_view_snapshot_id


def _latest_or_checkpoint_view_snapshot_condition() -> ColumnElement[bool]:
    newer_view_snapshot = aliased(ConversationViewSnapshot)
    checkpoint_exists = (
        select(ConversationViewSnapshotCheckpointReason.id)
        .where(
            ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id
            == ConversationViewSnapshot.id
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
    return or_(checkpoint_exists, ~newer_view_snapshot_exists)


def _add_lineage_description_content_update_view_snapshot_locales(
    session: Session,
    *,
    conversation_ids: list[int],
    lineage_ids: list[int],
    view_snapshot_locales: dict[int, set[str]],
    view_snapshot_candidate_ids: dict[int, set[int]],
) -> None:
    if not conversation_ids or not lineage_ids:
        return

    rows = session.execute(
        select(ConversationViewSnapshot.id)
        .add_columns(OpinionGroupCandidate.id.label("candidate_id"))
        .join(
            AnalysisSnapshotResult,
            and_(
                AnalysisSnapshotResult.conversation_id
                == ConversationViewSnapshot.conversation_id,
                AnalysisSnapshotResult.analysis_snapshot_id
                == ConversationViewSnapshot.analysis_snapshot_id,
                AnalysisSnapshotResult.opinion_group_spec_id
                == ConversationViewSnapshot.opinion_group_spec_id,
            ),
        )
        .join(
            OpinionGroupCandidate,
            OpinionGroupCandidate.snapshot_result_id == AnalysisSnapshotResult.id,
        )
        .join(OpinionGroup, OpinionGroup.candidate_id == OpinionGroupCandidate.id)
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(
                ConversationViewSnapshot.conversation_id.in_(sorted(set(conversation_ids))),
                ConversationViewSnapshot.activated_at.is_not(None),
                ConversationViewSnapshot.analysis_snapshot_id.is_not(None),
                ConversationViewSnapshot.view_reason
                == ConversationViewSnapshotReasonEnum.analysis_completed,
                AnalysisSnapshotResult.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
                OpinionGroup.lineage_id.in_(sorted(set(lineage_ids))),
                _latest_or_checkpoint_view_snapshot_condition(),
            )
        )
        .distinct()
        .order_by(ConversationViewSnapshot.id)
    ).all()
    for row in rows:
        view_snapshot_locales.setdefault(row.id, set()).add("en")
        view_snapshot_candidate_ids.setdefault(row.id, set()).add(row.candidate_id)


def _add_translation_content_update_view_snapshot_locales(
    session: Session,
    *,
    conversation_ids: list[int],
    description_ids: list[int],
    locale: str,
    view_snapshot_locales: dict[int, set[str]],
    view_snapshot_candidate_ids: dict[int, set[int]],
) -> None:
    if not conversation_ids or not description_ids:
        return

    rows = session.execute(
        select(ConversationViewSnapshot.id)
        .add_columns(OpinionGroupCandidate.id.label("candidate_id"))
        .join(
            AnalysisSnapshotResult,
            and_(
                AnalysisSnapshotResult.conversation_id
                == ConversationViewSnapshot.conversation_id,
                AnalysisSnapshotResult.analysis_snapshot_id
                == ConversationViewSnapshot.analysis_snapshot_id,
                AnalysisSnapshotResult.opinion_group_spec_id
                == ConversationViewSnapshot.opinion_group_spec_id,
            ),
        )
        .join(
            OpinionGroupCandidate,
            OpinionGroupCandidate.snapshot_result_id == AnalysisSnapshotResult.id,
        )
        .join(
            OpinionGroupCandidateDescriptionLocaleRequest,
            and_(
                OpinionGroupCandidateDescriptionLocaleRequest.candidate_id
                == OpinionGroupCandidate.id,
                OpinionGroupCandidateDescriptionLocaleRequest.locale == locale,
            ),
        )
        .join(OpinionGroup, OpinionGroup.candidate_id == OpinionGroupCandidate.id)
        .join(OpinionGroupLineage, OpinionGroupLineage.id == OpinionGroup.lineage_id)
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(
                ConversationViewSnapshot.conversation_id.in_(sorted(set(conversation_ids))),
                ConversationViewSnapshot.activated_at.is_not(None),
                ConversationViewSnapshot.analysis_snapshot_id.is_not(None),
                ConversationViewSnapshot.view_reason
                == ConversationViewSnapshotReasonEnum.analysis_completed,
                AnalysisSnapshotResult.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
                OpinionGroupLineage.system_description_id.in_(sorted(set(description_ids))),
                _latest_or_checkpoint_view_snapshot_condition(),
            )
        )
        .distinct()
        .order_by(ConversationViewSnapshot.id)
    ).all()
    for row in rows:
        view_snapshot_locales.setdefault(row.id, set()).add(locale)
        view_snapshot_candidate_ids.setdefault(row.id, set()).add(row.candidate_id)


def queue_ai_description_content_updated_events(
    engine: Engine,
    *,
    lineage_ids_by_conversation_id: Mapping[int, Sequence[int]],
    translation_description_ids_by_conversation_locale: Mapping[tuple[int, str], Sequence[int]],
) -> None:
    if (
        not lineage_ids_by_conversation_id
        and not translation_description_ids_by_conversation_locale
    ):
        return

    with Session(engine) as session:
        view_snapshot_locales: dict[int, set[str]] = {}
        view_snapshot_candidate_ids: dict[int, set[int]] = {}
        for conversation_id, lineage_ids in lineage_ids_by_conversation_id.items():
            _add_lineage_description_content_update_view_snapshot_locales(
                session,
                conversation_ids=[conversation_id],
                lineage_ids=sorted(set(lineage_ids)),
                view_snapshot_locales=view_snapshot_locales,
                view_snapshot_candidate_ids=view_snapshot_candidate_ids,
            )
        for (
            conversation_id,
            locale,
        ), description_ids in translation_description_ids_by_conversation_locale.items():
            _add_translation_content_update_view_snapshot_locales(
                session,
                conversation_ids=[conversation_id],
                description_ids=sorted(set(description_ids)),
                locale=locale,
                view_snapshot_locales=view_snapshot_locales,
                view_snapshot_candidate_ids=view_snapshot_candidate_ids,
            )

        _queue_conversation_analysis_updated_events_for_view_snapshots(
            session,
            conversation_view_snapshot_ids=sorted(view_snapshot_locales),
            locales_by_view_snapshot_id=view_snapshot_locales,
            candidate_ids_by_view_snapshot_id=view_snapshot_candidate_ids,
        )
        session.commit()


def _fetch_required_lineage_description_rows_for_candidate(
    session: Session,
    *,
    candidate_id: int,
) -> list[RequiredLineageDescriptionRow]:
    rows_by_candidate_id = _fetch_required_lineage_description_rows_by_candidate(
        session,
        candidate_ids=[candidate_id],
    )
    return rows_by_candidate_id.get(candidate_id, [])


def _fetch_required_lineage_description_rows_by_candidate(
    session: Session,
    *,
    candidate_ids: list[int],
) -> dict[int, list[RequiredLineageDescriptionRow]]:
    if not candidate_ids:
        return {}

    rows = session.execute(
        select(
            OpinionGroup.lineage_id,
            OpinionGroup.candidate_id,
            OpinionGroupLineage.system_description_id,
        )
        .join(OpinionGroupLineage, OpinionGroupLineage.id == OpinionGroup.lineage_id)
        .where(
            and_(
                OpinionGroup.candidate_id.in_(sorted(set(candidate_ids))),
                OpinionGroup.lineage_id.is_not(None),
            )
        )
        .order_by(OpinionGroup.candidate_id, OpinionGroup.id)
    ).all()

    rows_by_candidate_id: dict[int, list[RequiredLineageDescriptionRow]] = {}
    for row in rows:
        if row.lineage_id is None:
            continue
        rows_by_candidate_id.setdefault(row.candidate_id, []).append(
            RequiredLineageDescriptionRow(
                lineage_id=row.lineage_id,
                candidate_id=row.candidate_id,
                system_description_id=row.system_description_id,
            )
        )
    return rows_by_candidate_id


def _required_system_description_ids_for_candidate(
    session: Session,
    *,
    candidate_id: int,
) -> tuple[set[int], bool]:
    lineage_rows = _fetch_required_lineage_description_rows_for_candidate(
        session,
        candidate_id=candidate_id,
    )
    description_ids = {
        row.system_description_id for row in lineage_rows if row.system_description_id is not None
    }
    all_lineages_have_descriptions = bool(lineage_rows) and all(
        row.system_description_id is not None for row in lineage_rows
    )
    return description_ids, all_lineages_have_descriptions


def lineage_description_work_demands_for_candidate_requests(
    *,
    requests: Sequence[CandidateLocaleRequestRow],
    lineage_rows_by_request_id: Mapping[int, Sequence[RequiredLineageDescriptionRow]],
) -> list[LineageDescriptionWorkDemand]:
    demands_by_lineage_id: dict[int, LineageDescriptionWorkDemand] = {}
    for request in requests:
        for row in lineage_rows_by_request_id.get(request.id, ()):
            if row.system_description_id is not None:
                continue
            if row.lineage_id in demands_by_lineage_id:
                continue
            demands_by_lineage_id[row.lineage_id] = LineageDescriptionWorkDemand(
                lineage_id=row.lineage_id,
                conversation_id=request.conversation_id,
                source_candidate_id=row.candidate_id,
            )

    return list(demands_by_lineage_id.values())


def translation_work_demands_for_candidate_requests(
    *,
    requests: Sequence[CandidateLocaleRequestRow],
    description_ids_by_request_id: Mapping[int, set[int]],
    translated_description_ids_by_request_id: Mapping[int, set[int]],
) -> list[TranslationWorkDemand]:
    demands_by_description_locale: dict[tuple[int, str], TranslationWorkDemand] = {}
    for request in requests:
        description_ids = description_ids_by_request_id.get(request.id, set())
        if not description_ids:
            continue
        translated_description_ids = translated_description_ids_by_request_id.get(
            request.id,
            set(),
        )
        for description_id in sorted(description_ids - translated_description_ids):
            key = (description_id, request.locale)
            if key in demands_by_description_locale:
                continue
            demands_by_description_locale[key] = TranslationWorkDemand(
                description_id=description_id,
                conversation_id=request.conversation_id,
                locale=request.locale,
            )

    return list(demands_by_description_locale.values())


def lineage_description_work_demands_for_eager_candidates(
    *,
    candidates: Sequence[EagerDescriptionCandidateRow],
    lineage_rows_by_candidate_id: Mapping[int, Sequence[RequiredLineageDescriptionRow]],
) -> list[LineageDescriptionWorkDemand]:
    demands_by_lineage_id: dict[int, LineageDescriptionWorkDemand] = {}
    for candidate in candidates:
        for row in lineage_rows_by_candidate_id.get(candidate.candidate_id, ()):
            if row.system_description_id is not None:
                continue
            if row.lineage_id in demands_by_lineage_id:
                continue
            demands_by_lineage_id[row.lineage_id] = LineageDescriptionWorkDemand(
                lineage_id=row.lineage_id,
                conversation_id=candidate.conversation_id,
                source_candidate_id=row.candidate_id,
            )
    return list(demands_by_lineage_id.values())


def eager_translation_target_locales_by_candidate(
    *,
    candidates: Sequence[EagerDescriptionCandidateRow],
    additional_locale_rows: Sequence[EagerAdditionalTranslationLocaleRow],
    supported_target_language_codes: set[str] | None = None,
) -> dict[int, tuple[str, ...]]:
    supported_codes = (
        supported_target_language_codes
        if supported_target_language_codes is not None
        else SUPPORTED_EAGER_TRANSLATION_TARGET_LANGUAGE_CODES
    )
    additional_locales_by_conversation_id: dict[int, set[str]] = {}
    for row in additional_locale_rows:
        if not row.dynamic_translation_entitled:
            continue
        if row.language_code not in supported_codes:
            continue
        additional_locales_by_conversation_id.setdefault(row.conversation_id, set()).add(
            row.language_code
        )

    target_locales_by_candidate_id: dict[int, tuple[str, ...]] = {}
    for candidate in candidates:
        target_locales: set[str] = set()
        if (
            candidate.language_code is not None
            and candidate.language_code in supported_codes
        ):
            target_locales.add(candidate.language_code)
        target_locales.update(
            additional_locales_by_conversation_id.get(candidate.conversation_id, set())
        )
        if target_locales:
            target_locales_by_candidate_id[candidate.candidate_id] = tuple(
                sorted(target_locales)
            )

    return target_locales_by_candidate_id


def translation_work_demands_for_eager_candidates(
    *,
    candidates: Sequence[EagerDescriptionCandidateRow],
    lineage_rows_by_candidate_id: Mapping[int, Sequence[RequiredLineageDescriptionRow]],
    target_locales_by_candidate_id: Mapping[int, Sequence[str]],
    translated_description_ids_by_locale: Mapping[str, set[int]],
) -> list[TranslationWorkDemand]:
    demands_by_description_locale: dict[tuple[int, str], TranslationWorkDemand] = {}
    for candidate in candidates:
        target_locales = target_locales_by_candidate_id.get(candidate.candidate_id, ())
        if not target_locales:
            continue
        lineage_rows = lineage_rows_by_candidate_id.get(candidate.candidate_id, ())
        if not lineage_rows or any(row.system_description_id is None for row in lineage_rows):
            continue
        description_ids = {
            row.system_description_id
            for row in lineage_rows
            if row.system_description_id is not None
        }
        for target_locale in target_locales:
            translated_description_ids = translated_description_ids_by_locale.get(
                target_locale, set()
            )
            for description_id in sorted(description_ids - translated_description_ids):
                key = (description_id, target_locale)
                if key in demands_by_description_locale:
                    continue
                demands_by_description_locale[key] = TranslationWorkDemand(
                    description_id=description_id,
                    conversation_id=candidate.conversation_id,
                    locale=target_locale,
                )
    return list(demands_by_description_locale.values())


def _insert_or_reactivate_lineage_description_work(
    session: Session,
    *,
    demands: Sequence[LineageDescriptionWorkDemand],
) -> None:
    if not demands:
        return

    values: list[_LineageDescriptionWorkInsert] = []
    value_by_lineage_id: dict[int, _LineageDescriptionWorkInsert] = {}
    for demand in demands:
        value = _LineageDescriptionWorkInsert(
            lineage_id=demand.lineage_id,
            conversation_id=demand.conversation_id,
            source_candidate_id=demand.source_candidate_id,
        )
        values.append(value)
        value_by_lineage_id[demand.lineage_id] = value
    if session.get_bind().dialect.name == "sqlite":
        for value in values:
            existing_row = session.execute(
                select(OpinionGroupLineageDescriptionWork.id).where(
                    OpinionGroupLineageDescriptionWork.lineage_id == value.lineage_id
                )
            ).first()
            if existing_row is None:
                session.execute(
                    sqlalchemy_insert(OpinionGroupLineageDescriptionWork).values(
                        value.to_insert_value(include_timestamps=True)
                    )
                )
                continue

            session.execute(
                update(OpinionGroupLineageDescriptionWork)
                .where(
                    and_(
                        OpinionGroupLineageDescriptionWork.id == existing_row.id,
                        OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                    )
                )
                .values(
                    conversation_id=value.conversation_id,
                    source_candidate_id=value.source_candidate_id,
                    updated_at=func.now(),
                )
            )
        return

    insert_values = [value.to_insert_value() for value in values]
    for chunk in _iter_chunks(insert_values, chunk_size=_max_rows_per_insert(column_count=3)):
        insert_query = pg_insert(OpinionGroupLineageDescriptionWork).values(chunk)
        session.execute(insert_query.on_conflict_do_nothing())

    lineage_ids = sorted(value_by_lineage_id)
    if not lineage_ids:
        return

    existing_rows = session.execute(
        select(
            OpinionGroupLineageDescriptionWork.id,
            OpinionGroupLineageDescriptionWork.lineage_id,
        )
        .where(
                and_(
                    OpinionGroupLineageDescriptionWork.lineage_id.in_(lineage_ids),
                    OpinionGroupLineageDescriptionWork.lease_token.is_(None),
                )
        )
        .order_by(OpinionGroupLineageDescriptionWork.lineage_id)
        .with_for_update(
            skip_locked=True,
            of=OpinionGroupLineageDescriptionWork,
        )
    ).all()
    for row in existing_rows:
        value = value_by_lineage_id[row.lineage_id]
        session.execute(
            update(OpinionGroupLineageDescriptionWork)
            .where(OpinionGroupLineageDescriptionWork.id == row.id)
            .values(
                conversation_id=value.conversation_id,
                source_candidate_id=value.source_candidate_id,
                updated_at=func.now(),
            )
        )


def _insert_or_reactivate_translation_work(
    session: Session,
    *,
    demands: Sequence[TranslationWorkDemand],
) -> None:
    if not demands:
        return

    values: list[_TranslationWorkInsert] = []
    value_by_description_locale: dict[tuple[int, str], _TranslationWorkInsert] = {}
    for demand in demands:
        value = _TranslationWorkInsert(
            description_id=demand.description_id,
            conversation_id=demand.conversation_id,
            locale=demand.locale,
        )
        values.append(value)
        value_by_description_locale[(demand.description_id, demand.locale)] = value
    if session.get_bind().dialect.name == "sqlite":
        for value in values:
            existing_row = session.execute(
                select(OpinionGroupDescriptionTranslationWork.id).where(
                    and_(
                        OpinionGroupDescriptionTranslationWork.description_id
                        == value.description_id,
                        OpinionGroupDescriptionTranslationWork.locale == value.locale,
                    )
                )
            ).first()
            if existing_row is None:
                session.execute(
                    sqlalchemy_insert(OpinionGroupDescriptionTranslationWork).values(
                        value.to_insert_value(include_timestamps=True)
                    )
                )
                continue

            session.execute(
                update(OpinionGroupDescriptionTranslationWork)
                .where(
                    and_(
                        OpinionGroupDescriptionTranslationWork.id == existing_row.id,
                        OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                    )
                )
                .values(
                    conversation_id=value.conversation_id,
                    updated_at=func.now(),
                )
            )
        return

    insert_values = [value.to_insert_value() for value in values]
    for chunk in _iter_chunks(insert_values, chunk_size=_max_rows_per_insert(column_count=3)):
        insert_query = pg_insert(OpinionGroupDescriptionTranslationWork).values(chunk)
        session.execute(
            insert_query.on_conflict_do_nothing(
                index_elements=[
                    OpinionGroupDescriptionTranslationWork.description_id,
                    OpinionGroupDescriptionTranslationWork.locale,
                ]
            )
        )

    description_locale_keys = sorted(value_by_description_locale)
    if not description_locale_keys:
        return

    for chunk in _iter_chunks(
        description_locale_keys,
        chunk_size=_max_rows_per_insert(column_count=2),
    ):
        existing_rows = session.execute(
            select(
                OpinionGroupDescriptionTranslationWork.id,
                OpinionGroupDescriptionTranslationWork.description_id,
                OpinionGroupDescriptionTranslationWork.locale,
            )
            .where(
                and_(
                    tuple_(
                        OpinionGroupDescriptionTranslationWork.description_id,
                        OpinionGroupDescriptionTranslationWork.locale,
                    ).in_(chunk),
                    OpinionGroupDescriptionTranslationWork.lease_token.is_(None),
                )
            )
            .order_by(
                OpinionGroupDescriptionTranslationWork.description_id,
                OpinionGroupDescriptionTranslationWork.locale,
            )
            .with_for_update(
                skip_locked=True,
                of=OpinionGroupDescriptionTranslationWork,
            )
        ).all()
        for row in existing_rows:
            value = value_by_description_locale[(row.description_id, row.locale)]
            session.execute(
                update(OpinionGroupDescriptionTranslationWork)
                .where(OpinionGroupDescriptionTranslationWork.id == row.id)
                .values(
                    conversation_id=value.conversation_id,
                    updated_at=func.now(),
                )
            )


def _materialize_lineage_description_work_for_candidate_locale_requests(
    session: Session,
    *,
    conversation_ids: list[int] | None,
    conversation_view_snapshot_ids: list[int] | None = None,
    limit: int | None = None,
    require_activated_view_snapshot: bool = False,
    require_processable_conversation: bool = True,
    include_checkpoints: bool = True,
) -> list[int]:
    requests = _fetch_candidate_locale_request_rows(
        session,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_processable_conversation=require_processable_conversation,
        include_checkpoints=include_checkpoints,
    )
    lineage_rows_by_request_id = {
        request.id: _fetch_required_lineage_description_rows_for_candidate(
            session,
            candidate_id=request.candidate_id,
        )
        for request in requests
    }
    demands = lineage_description_work_demands_for_candidate_requests(
        requests=requests,
        lineage_rows_by_request_id=lineage_rows_by_request_id,
    )
    if limit is not None:
        demands = demands[:limit]
    _insert_or_reactivate_lineage_description_work(session, demands=demands)
    return sorted({demand.conversation_id for demand in demands})


def _select_eager_candidates(
    rows: Sequence[EagerCandidateOptionRow],
) -> list[EagerDescriptionCandidateRow]:
    rows_by_view_snapshot_id: dict[int, list[EagerCandidateOptionRow]] = {}
    for row in rows:
        rows_by_view_snapshot_id.setdefault(row.conversation_view_snapshot_id, []).append(row)

    candidates_by_id: dict[int, EagerDescriptionCandidateRow] = {}
    for view_snapshot_rows in rows_by_view_snapshot_id.values():
        auto_row = sorted(
            view_snapshot_rows,
            key=lambda row: (row.selection_score, row.group_count),
            reverse=True,
        )[0]
        preferred_group_count = view_snapshot_rows[0].preferred_group_count
        selected_row = (
            next(
                (
                    row
                    for row in view_snapshot_rows
                    if row.group_count == preferred_group_count
                ),
                None,
            )
            if preferred_group_count is not None
            else auto_row
        )
        if selected_row is None:
            continue
        candidates_by_id[selected_row.candidate_id] = EagerDescriptionCandidateRow(
            conversation_id=selected_row.conversation_id,
            candidate_id=selected_row.candidate_id,
            language_code=selected_row.language_code,
            language_settings_source=selected_row.language_settings_source,
        )

    return list(candidates_by_id.values())


def _fetch_eager_description_candidates(
    session: Session,
    *,
    conversation_ids: list[int] | None,
    conversation_view_snapshot_ids: list[int] | None = None,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
    limit: int | None = None,
) -> list[EagerDescriptionCandidateRow]:
    if conversation_ids is not None and not conversation_ids:
        return []
    if conversation_view_snapshot_ids is not None and not conversation_view_snapshot_ids:
        return []

    conversation_filter: ColumnElement[bool] = (
        AnalysisSnapshotResult.conversation_id.in_(sorted(set(conversation_ids)))
        if conversation_ids is not None
        else true()
    )
    query = (
        select(
            AnalysisSnapshotResult.conversation_id,
            ConversationViewSnapshot.id.label("conversation_view_snapshot_id"),
            OpinionGroupCandidate.id.label("candidate_id"),
            OpinionGroupVariant.group_count,
            Conversation.preferred_opinion_group_count,
            Conversation.language_settings_source,
            ConversationContent.source_language_code.label("language_code"),
            OpinionGroupCandidateAssessment.selection_score,
        )
        .join(
            OpinionGroupCandidate,
            OpinionGroupCandidate.snapshot_result_id == AnalysisSnapshotResult.id,
        )
        .join(
            OpinionGroupVariant,
            OpinionGroupVariant.id == OpinionGroupCandidate.opinion_group_variant_id,
        )
        .join(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .join(Conversation, Conversation.id == AnalysisSnapshotResult.conversation_id)
        .join(
            ConversationContent,
            ConversationContent.id == Conversation.current_content_id,
        )
        .join(
            ConversationViewSnapshot,
            and_(
                ConversationViewSnapshot.conversation_id
                == AnalysisSnapshotResult.conversation_id,
                ConversationViewSnapshot.analysis_snapshot_id
                == AnalysisSnapshotResult.analysis_snapshot_id,
                ConversationViewSnapshot.opinion_group_spec_id
                == AnalysisSnapshotResult.opinion_group_spec_id,
            ),
        )
        .where(
            and_(
                conversation_filter,
                Conversation.ai_labeling_enabled.is_(True),
                _processable_conversation_condition(),
                AnalysisSnapshotResult.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
                OpinionGroupCandidateAssessment.selection_score.is_not(None),
                ConversationViewSnapshot.view_reason
                == ConversationViewSnapshotReasonEnum.analysis_completed,
                _latest_or_checkpoint_view_snapshot_filter(
                    conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                    require_unactivated_view_snapshot=require_unactivated_view_snapshot,
                    scope="latest",
                ),
            )
        )
        .order_by(
            ConversationViewSnapshot.created_at.desc(),
            ConversationViewSnapshot.id.desc(),
            OpinionGroupCandidate.id,
        )
    )
    if limit is not None:
        query = query.limit(limit)

    rows = session.execute(query).all()
    return _select_eager_candidates(
        [
            EagerCandidateOptionRow(
                conversation_id=row.conversation_id,
                conversation_view_snapshot_id=row.conversation_view_snapshot_id,
                candidate_id=row.candidate_id,
                group_count=row.group_count,
                preferred_group_count=row.preferred_opinion_group_count,
                selection_score=row.selection_score,
                language_code=row.language_code,
                language_settings_source=row.language_settings_source,
            )
            for row in rows
            if row.selection_score is not None
        ]
    )


def _fetch_eager_additional_translation_locale_rows(
    session: Session,
    *,
    conversation_ids: list[int],
) -> list[EagerAdditionalTranslationLocaleRow]:
    if not conversation_ids:
        return []

    rows = session.execute(
        select(
            ConversationTranslationTargetLanguage.conversation_id,
            ConversationTranslationTargetLanguage.language_code,
            _active_dynamic_translation_entitlement_exists().label(
                "dynamic_translation_entitled"
            ),
        )
        .select_from(ConversationTranslationTargetLanguage)
        .join(
            Conversation,
            Conversation.id == ConversationTranslationTargetLanguage.conversation_id,
        )
        .where(
            and_(
                Conversation.id.in_(sorted(set(conversation_ids))),
                Conversation.dynamic_translation_enabled.is_(True),
                ConversationTranslationTargetLanguage.language_code.in_(
                    sorted(SUPPORTED_EAGER_TRANSLATION_TARGET_LANGUAGE_CODES)
                ),
            )
        )
    ).all()

    return [
        EagerAdditionalTranslationLocaleRow(
            conversation_id=row.conversation_id,
            language_code=row.language_code,
            dynamic_translation_entitled=row.dynamic_translation_entitled,
        )
        for row in rows
    ]


def _active_dynamic_translation_entitlement_exists() -> ColumnElement[bool]:
    now = func.now()
    return (
        select(PremiumFeatureEntitlement.id)
        .join(
            ProjectOrganizationOwnership,
            PremiumFeatureEntitlement.organization_id
            == ProjectOrganizationOwnership.organization_id,
        )
        .where(
            and_(
                ProjectOrganizationOwnership.project_id == Conversation.project_id,
                PremiumFeatureEntitlement.feature == PremiumFeature.dynamic_translation,
                PremiumFeatureEntitlement.starts_at <= now,
                PremiumFeatureEntitlement.revoked_at.is_(None),
                or_(
                    PremiumFeatureEntitlement.expires_at.is_(None),
                    PremiumFeatureEntitlement.expires_at > now,
                ),
            )
        )
        .exists()
    )


def _materialize_eager_lineage_description_work(
    session: Session,
    *,
    conversation_ids: list[int] | None,
    conversation_view_snapshot_ids: list[int] | None = None,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
    limit: int | None = None,
) -> list[int]:
    candidates = _fetch_eager_description_candidates(
        session,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_unactivated_view_snapshot=require_unactivated_view_snapshot,
        limit=limit,
    )
    lineage_rows_by_candidate_id = _fetch_required_lineage_description_rows_by_candidate(
        session,
        candidate_ids=[candidate.candidate_id for candidate in candidates],
    )
    demands = lineage_description_work_demands_for_eager_candidates(
        candidates=candidates,
        lineage_rows_by_candidate_id=lineage_rows_by_candidate_id,
    )
    _insert_or_reactivate_lineage_description_work(session, demands=demands)
    return sorted({demand.conversation_id for demand in demands})


def _materialize_eager_translation_work(
    session: Session,
    *,
    conversation_ids: list[int] | None,
    conversation_view_snapshot_ids: list[int] | None = None,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
    limit: int | None = None,
) -> list[int]:
    candidates = _fetch_eager_description_candidates(
        session,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_unactivated_view_snapshot=require_unactivated_view_snapshot,
        limit=limit,
    )
    lineage_rows_by_candidate_id = _fetch_required_lineage_description_rows_by_candidate(
        session,
        candidate_ids=[candidate.candidate_id for candidate in candidates],
    )
    additional_locale_rows = _fetch_eager_additional_translation_locale_rows(
        session,
        conversation_ids=[candidate.conversation_id for candidate in candidates],
    )
    target_locales_by_candidate_id = eager_translation_target_locales_by_candidate(
        candidates=candidates,
        additional_locale_rows=additional_locale_rows,
    )
    description_ids = sorted(
        {
            row.system_description_id
            for rows in lineage_rows_by_candidate_id.values()
            for row in rows
            if row.system_description_id is not None
        }
    )
    translated_description_ids_by_locale: dict[str, set[int]] = {}
    if description_ids:
        translation_rows = session.execute(
            select(
                OpinionGroupDescriptionTranslation.description_id,
                OpinionGroupDescriptionTranslation.locale,
            ).where(
                and_(
                    OpinionGroupDescriptionTranslation.description_id.in_(description_ids),
                    OpinionGroupDescriptionTranslation.locale.in_(
                        SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES
                    ),
                )
            )
        ).all()
        for row in translation_rows:
            translated_description_ids_by_locale.setdefault(row.locale, set()).add(
                row.description_id
            )
    demands = translation_work_demands_for_eager_candidates(
        candidates=candidates,
        lineage_rows_by_candidate_id=lineage_rows_by_candidate_id,
        target_locales_by_candidate_id=target_locales_by_candidate_id,
        translated_description_ids_by_locale=translated_description_ids_by_locale,
    )
    _insert_or_reactivate_translation_work(session, demands=demands)
    return sorted({demand.conversation_id for demand in demands})


def _materialize_translation_work_for_candidate_locale_requests(
    session: Session,
    *,
    conversation_ids: list[int] | None,
    conversation_view_snapshot_ids: list[int] | None = None,
    limit: int | None = None,
    require_activated_view_snapshot: bool = False,
    require_processable_conversation: bool = True,
    include_checkpoints: bool = True,
) -> list[int]:
    requests = _fetch_candidate_locale_request_rows(
        session,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        non_english_only=True,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_processable_conversation=require_processable_conversation,
        include_checkpoints=include_checkpoints,
    )
    description_ids_by_request_id: dict[int, set[int]] = {}
    translated_description_ids_by_request_id: dict[int, set[int]] = {}
    for request in requests:
        description_ids, all_lineages_have_descriptions = (
            _required_system_description_ids_for_candidate(
                session,
                candidate_id=request.candidate_id,
            )
        )
        if not all_lineages_have_descriptions or not description_ids:
            continue
        description_ids_by_request_id[request.id] = description_ids
        existing_translation_rows = session.execute(
            select(OpinionGroupDescriptionTranslation.description_id).where(
                and_(
                    OpinionGroupDescriptionTranslation.description_id.in_(sorted(description_ids)),
                    OpinionGroupDescriptionTranslation.locale == request.locale,
                )
            )
        ).all()
        translated_description_ids_by_request_id[request.id] = {
            row.description_id for row in existing_translation_rows
        }
    demands = translation_work_demands_for_candidate_requests(
        requests=requests,
        description_ids_by_request_id=description_ids_by_request_id,
        translated_description_ids_by_request_id=translated_description_ids_by_request_id,
    )
    if limit is not None:
        demands = demands[:limit]
    _insert_or_reactivate_translation_work(session, demands=demands)
    return sorted({demand.conversation_id for demand in demands})


def _lineage_work_relevant_candidate_filter(
    conversation_view_snapshot_ids: list[int] | None,
    *,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
    snapshot_scope: str = "latest_or_checkpoint",
) -> ColumnElement[bool]:
    return (
        select(OpinionGroupCandidate.id)
        .join(
            AnalysisSnapshotResult,
            AnalysisSnapshotResult.id == OpinionGroupCandidate.snapshot_result_id,
        )
        .join(
            ConversationViewSnapshot,
            and_(
                ConversationViewSnapshot.conversation_id
                == AnalysisSnapshotResult.conversation_id,
                ConversationViewSnapshot.analysis_snapshot_id
                == AnalysisSnapshotResult.analysis_snapshot_id,
                ConversationViewSnapshot.opinion_group_spec_id
                == AnalysisSnapshotResult.opinion_group_spec_id,
            ),
        )
        .join(OpinionGroup, OpinionGroup.candidate_id == OpinionGroupCandidate.id)
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(
                AnalysisSnapshotResult.conversation_id
                == OpinionGroupLineageDescriptionWork.conversation_id,
                AnalysisSnapshotResult.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidate.id
                == OpinionGroupLineageDescriptionWork.source_candidate_id,
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
                OpinionGroup.lineage_id == OpinionGroupLineageDescriptionWork.lineage_id,
                _latest_or_checkpoint_view_snapshot_filter(
                    conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                    require_unactivated_view_snapshot=require_unactivated_view_snapshot,
                    scope=snapshot_scope,
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
    snapshot_scope: str = "latest_or_checkpoint",
) -> ColumnElement[bool]:
    return _lineage_work_relevant_candidate_filter(
        conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_unactivated_view_snapshot=require_unactivated_view_snapshot,
        snapshot_scope=snapshot_scope,
    )


def _translation_work_candidate_relevance_conditions(
    conversation_view_snapshot_ids: list[int] | None,
    *,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
    snapshot_scope: str = "latest_or_checkpoint",
) -> _TranslationWorkCandidateRelevance:
    auto_candidate = aliased(OpinionGroupCandidate)
    auto_variant = aliased(OpinionGroupVariant)
    auto_assessment = aliased(OpinionGroupCandidateAssessment)
    explicit_locale_request_exists = (
        select(OpinionGroupCandidateDescriptionLocaleRequest.id)
        .where(
            and_(
                OpinionGroupCandidateDescriptionLocaleRequest.candidate_id
                == OpinionGroupCandidate.id,
                OpinionGroupCandidateDescriptionLocaleRequest.locale
                == OpinionGroupDescriptionTranslationWork.locale,
            )
        )
        .exists()
    )
    higher_priority_auto_candidate_exists = (
        select(auto_candidate.id)
        .join(auto_variant, auto_variant.id == auto_candidate.opinion_group_variant_id)
        .join(auto_assessment, auto_assessment.candidate_id == auto_candidate.id)
        .where(
            and_(
                auto_candidate.snapshot_result_id == OpinionGroupCandidate.snapshot_result_id,
                auto_candidate.outcome == AnalysisResultOutcomeEnum.success,
                auto_assessment.hidden_reason.is_(None),
                auto_assessment.selection_score.is_not(None),
                or_(
                    auto_assessment.selection_score
                    > OpinionGroupCandidateAssessment.selection_score,
                    and_(
                        auto_assessment.selection_score
                        == OpinionGroupCandidateAssessment.selection_score,
                        auto_variant.group_count > OpinionGroupVariant.group_count,
                    ),
                ),
            )
        )
        .exists()
    )
    effective_preferred_candidate = or_(
        and_(
            Conversation.preferred_opinion_group_count.is_not(None),
            OpinionGroupVariant.group_count == Conversation.preferred_opinion_group_count,
        ),
        and_(
            Conversation.preferred_opinion_group_count.is_(None),
            ~higher_priority_auto_candidate_exists,
        ),
    )

    eager_detected_language_candidate = and_(
        effective_preferred_candidate,
        or_(
            false(),
            *(
                and_(
                    OpinionGroupDescriptionTranslationWork.locale
                    == display_language_code,
                    ConversationContent.source_language_code == spoken_language_code,
                )
                for display_language_code, spoken_language_code in (
                    SUPPORTED_EAGER_TRANSLATION_LANGUAGE_PAIRS
                )
            ),
        ),
    )
    eager_additional_language_candidate = and_(
        effective_preferred_candidate,
        OpinionGroupDescriptionTranslationWork.locale.in_(
            sorted(SUPPORTED_EAGER_TRANSLATION_TARGET_LANGUAGE_CODES)
        ),
        _active_dynamic_translation_entitlement_exists(),
        Conversation.dynamic_translation_enabled.is_(True),
        select(ConversationTranslationTargetLanguage.id)
        .where(
            and_(
                ConversationTranslationTargetLanguage.conversation_id == Conversation.id,
                ConversationTranslationTargetLanguage.language_code
                == OpinionGroupDescriptionTranslationWork.locale,
            )
        )
        .exists(),
    )
    eager_snapshot_filter = _latest_or_checkpoint_view_snapshot_filter(
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_unactivated_view_snapshot=require_unactivated_view_snapshot,
        scope="latest",
    )
    explicit_request_snapshot_filter = _latest_or_checkpoint_view_snapshot_filter(
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_unactivated_view_snapshot=require_unactivated_view_snapshot,
        scope=snapshot_scope,
    )
    return _TranslationWorkCandidateRelevance(
        eager_condition=and_(
            or_(
                eager_detected_language_candidate,
                eager_additional_language_candidate,
            ),
            eager_snapshot_filter,
        ),
        explicit_locale_request_condition=and_(
            explicit_locale_request_exists,
            explicit_request_snapshot_filter,
        ),
    )


def _translation_work_relevant_candidate_exists_filter(
    relevant_candidate_conditions: Sequence[ColumnElement[bool]],
) -> ColumnElement[bool]:
    return (
        select(OpinionGroupCandidate.id)
        .join(
            AnalysisSnapshotResult,
            AnalysisSnapshotResult.id == OpinionGroupCandidate.snapshot_result_id,
        )
        .join(Conversation, Conversation.id == AnalysisSnapshotResult.conversation_id)
        .join(
            ConversationContent,
            ConversationContent.id == Conversation.current_content_id,
        )
        .join(
            ConversationViewSnapshot,
            and_(
                ConversationViewSnapshot.conversation_id
                == AnalysisSnapshotResult.conversation_id,
                ConversationViewSnapshot.analysis_snapshot_id
                == AnalysisSnapshotResult.analysis_snapshot_id,
                ConversationViewSnapshot.opinion_group_spec_id
                == AnalysisSnapshotResult.opinion_group_spec_id,
            ),
        )
        .join(
            OpinionGroupVariant,
            OpinionGroupVariant.id == OpinionGroupCandidate.opinion_group_variant_id,
        )
        .join(OpinionGroup, OpinionGroup.candidate_id == OpinionGroupCandidate.id)
        .join(OpinionGroupLineage, OpinionGroupLineage.id == OpinionGroup.lineage_id)
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(
                AnalysisSnapshotResult.conversation_id
                == OpinionGroupDescriptionTranslationWork.conversation_id,
                Conversation.ai_labeling_enabled.is_(True),
                AnalysisSnapshotResult.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
                OpinionGroupLineage.system_description_id
                == OpinionGroupDescriptionTranslationWork.description_id,
                or_(*relevant_candidate_conditions),
            )
        )
        .exists()
    )


def _eager_translation_work_relevant_candidate_filter(
    conversation_view_snapshot_ids: list[int] | None,
    *,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
) -> ColumnElement[bool]:
    relevance = _translation_work_candidate_relevance_conditions(
        conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_unactivated_view_snapshot=require_unactivated_view_snapshot,
        snapshot_scope="latest",
    )
    return _translation_work_relevant_candidate_exists_filter(
        [relevance.eager_condition]
    )


def _translation_work_relevant_candidate_filter(
    conversation_view_snapshot_ids: list[int] | None,
    *,
    require_activated_view_snapshot: bool = False,
    require_unactivated_view_snapshot: bool = False,
    snapshot_scope: str = "latest_or_checkpoint",
) -> ColumnElement[bool]:
    relevance = _translation_work_candidate_relevance_conditions(
        conversation_view_snapshot_ids,
        require_activated_view_snapshot=require_activated_view_snapshot,
        require_unactivated_view_snapshot=require_unactivated_view_snapshot,
        snapshot_scope=snapshot_scope,
    )
    return _translation_work_relevant_candidate_exists_filter(
        [
            relevance.eager_condition,
            relevance.explicit_locale_request_condition,
        ]
    )


def _claim_ai_description_locale_work_items_batch(
    engine: Engine,
    *,
    claim_scope: _AiDescriptionClaimScope,
    worker_id: str,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int] | None = None,
    lease_ttl_seconds: int,
    limit: int,
    ai_description_epoch: int,
    translation_enabled: bool,
    claim_lineage_descriptions: bool = True,
    claim_translations: bool = True,
    require_activated_view_snapshot: bool = False,
    max_existing_attempt_count: int | None = None,
) -> list[ClaimedAiDescriptionLocaleWorkItem]:
    if (
        not conversation_ids
        or limit <= 0
        or (not claim_lineage_descriptions and not claim_translations)
    ):
        return []

    unique_conversation_ids = list(dict.fromkeys(conversation_ids))
    require_unactivated_view_snapshot = (
        conversation_view_snapshot_ids is not None and not require_activated_view_snapshot
    )
    lease_expires_at = datetime.now(UTC) + timedelta(seconds=lease_ttl_seconds)
    claims: list[ClaimedAiDescriptionLocaleWorkItem] = []
    lineage_attempt_filter = (
        OpinionGroupLineageDescriptionWork.attempt_count <= max_existing_attempt_count
        if max_existing_attempt_count is not None
        else true()
    )
    translation_attempt_filter = (
        OpinionGroupDescriptionTranslationWork.attempt_count <= max_existing_attempt_count
        if max_existing_attempt_count is not None
        else true()
    )
    should_prioritize_latest = (
        conversation_view_snapshot_ids is None and require_activated_view_snapshot
    )
    translation_work_view_snapshot_filter = (
        _eager_translation_work_relevant_candidate_filter
        if claim_scope == _AiDescriptionClaimScope.first_pass
        else _translation_work_relevant_candidate_filter
    )
    lineage_order_by: list[_OrderByExpression] = [
        OpinionGroupLineageDescriptionWork.updated_at.asc(),
        OpinionGroupLineageDescriptionWork.id,
    ]
    translation_order_by: list[_OrderByExpression] = [
        OpinionGroupDescriptionTranslationWork.updated_at.asc(),
        OpinionGroupDescriptionTranslationWork.id,
    ]
    if should_prioritize_latest:
        lineage_order_by.insert(
            0,
            _lineage_work_relevant_candidate_filter(
                conversation_view_snapshot_ids=None,
                require_activated_view_snapshot=True,
                snapshot_scope="latest",
            ).desc(),
        )
        translation_order_by.insert(
            0,
            translation_work_view_snapshot_filter(
                conversation_view_snapshot_ids=None,
                require_activated_view_snapshot=True,
            ).desc(),
        )

    with Session(engine) as session:
        if claim_lineage_descriptions:
            _materialize_eager_lineage_description_work(
                session,
                conversation_ids=unique_conversation_ids,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                require_activated_view_snapshot=require_activated_view_snapshot,
                require_unactivated_view_snapshot=require_unactivated_view_snapshot,
            )
            if claim_scope == _AiDescriptionClaimScope.retry:
                _materialize_lineage_description_work_for_candidate_locale_requests(
                    session,
                    conversation_ids=unique_conversation_ids,
                    conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                )
        if translation_enabled and claim_translations:
            _materialize_eager_translation_work(
                session,
                conversation_ids=unique_conversation_ids,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                require_activated_view_snapshot=require_activated_view_snapshot,
                require_unactivated_view_snapshot=require_unactivated_view_snapshot,
            )
            if claim_scope == _AiDescriptionClaimScope.retry:
                _materialize_translation_work_for_candidate_locale_requests(
                    session,
                    conversation_ids=unique_conversation_ids,
                    conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                )

        eager_candidates = _fetch_eager_description_candidates(
            session,
            conversation_ids=unique_conversation_ids,
            conversation_view_snapshot_ids=conversation_view_snapshot_ids,
            require_activated_view_snapshot=require_activated_view_snapshot,
            require_unactivated_view_snapshot=require_unactivated_view_snapshot,
        )
        eager_candidate_ids_by_conversation_id: dict[int, set[int]] = {}
        for candidate in eager_candidates:
            eager_candidate_ids_by_conversation_id.setdefault(
                candidate.conversation_id,
                set(),
            ).add(candidate.candidate_id)
        eager_lineage_rows_by_candidate_id = _fetch_required_lineage_description_rows_by_candidate(
            session,
            candidate_ids=[candidate.candidate_id for candidate in eager_candidates],
        )
        eager_description_ids_by_conversation_id: dict[int, set[int]] = {}
        for candidate in eager_candidates:
            for row in eager_lineage_rows_by_candidate_id.get(candidate.candidate_id, ()):
                if row.system_description_id is not None:
                    eager_description_ids_by_conversation_id.setdefault(
                        candidate.conversation_id,
                        set(),
                    ).add(row.system_description_id)

        for conversation_id in unique_conversation_ids:
            remaining_claim_limit = limit - len(claims)
            if remaining_claim_limit <= 0:
                break

            if claim_lineage_descriptions:
                conversation_lineage_order_by = list(lineage_order_by)
                eager_candidate_ids = eager_candidate_ids_by_conversation_id.get(
                    conversation_id,
                    set(),
                )
                if eager_candidate_ids:
                    conversation_lineage_order_by.insert(
                        0,
                        OpinionGroupLineageDescriptionWork.source_candidate_id.in_(
                            sorted(eager_candidate_ids)
                        ).desc(),
                    )
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
                            lineage_attempt_filter,
                            _lineage_work_view_snapshot_filter(
                                conversation_view_snapshot_ids,
                                require_activated_view_snapshot=require_activated_view_snapshot,
                                require_unactivated_view_snapshot=(
                                    require_unactivated_view_snapshot
                                ),
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
                    .order_by(*conversation_lineage_order_by)
                    .limit(remaining_claim_limit)
                    .with_for_update(
                        skip_locked=True,
                        of=OpinionGroupLineageDescriptionWork,
                    )
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
                                    lineage_attempt_filter,
                                    _lineage_work_view_snapshot_filter(
                                        conversation_view_snapshot_ids,
                                        require_activated_view_snapshot=(
                                            require_activated_view_snapshot
                                        ),
                                        require_unactivated_view_snapshot=(
                                            require_unactivated_view_snapshot
                                        ),
                                    ),
                                )
                            )
                            .values(
                                attempt_count=attempt_count,
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

            conversation_translation_order_by = list(translation_order_by)
            eager_description_ids = eager_description_ids_by_conversation_id.get(
                conversation_id,
                set(),
            )
            if eager_description_ids:
                conversation_translation_order_by.insert(
                    0,
                    OpinionGroupDescriptionTranslationWork.description_id.in_(
                        sorted(eager_description_ids)
                    ).desc(),
                )
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
                        translation_attempt_filter,
                        translation_work_view_snapshot_filter(
                            conversation_view_snapshot_ids,
                            require_activated_view_snapshot=require_activated_view_snapshot,
                            require_unactivated_view_snapshot=require_unactivated_view_snapshot,
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
                .order_by(*conversation_translation_order_by)
                .limit(remaining_claim_limit)
                .with_for_update(
                    skip_locked=True,
                    of=OpinionGroupDescriptionTranslationWork,
                )
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
                                translation_attempt_filter,
                                translation_work_view_snapshot_filter(
                                    conversation_view_snapshot_ids,
                                    require_activated_view_snapshot=require_activated_view_snapshot,
                                    require_unactivated_view_snapshot=(
                                        require_unactivated_view_snapshot
                                    ),
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
                            )
                        )
                    .values(
                        attempt_count=attempt_count,
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
    require_activated_view_snapshot: bool = False,
) -> list[ClaimedAiDescriptionLocaleWorkItem]:
    return _claim_ai_description_locale_work_items_batch(
        engine,
        claim_scope=_AiDescriptionClaimScope.retry,
        worker_id=worker_id,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        lease_ttl_seconds=lease_ttl_seconds,
        limit=limit,
        ai_description_epoch=ai_description_epoch,
        translation_enabled=translation_enabled,
        claim_lineage_descriptions=claim_lineage_descriptions,
        claim_translations=claim_translations,
        require_activated_view_snapshot=require_activated_view_snapshot,
        max_existing_attempt_count=None,
    )


def claim_first_pass_ai_description_locale_work_items_batch(
    engine: Engine,
    *,
    worker_id: str,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int],
    lease_ttl_seconds: int,
    limit: int,
    ai_description_epoch: int,
    translation_enabled: bool,
    claim_lineage_descriptions: bool = True,
    claim_translations: bool = True,
) -> list[ClaimedAiDescriptionLocaleWorkItem]:
    return _claim_ai_description_locale_work_items_batch(
        engine,
        claim_scope=_AiDescriptionClaimScope.first_pass,
        worker_id=worker_id,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        lease_ttl_seconds=lease_ttl_seconds,
        limit=limit,
        ai_description_epoch=ai_description_epoch,
        translation_enabled=translation_enabled,
        claim_lineage_descriptions=claim_lineage_descriptions,
        claim_translations=claim_translations,
        max_existing_attempt_count=FIRST_PASS_MAX_EXISTING_ATTEMPT_COUNT,
    )


def extend_ai_description_locale_work_leases(
    engine: Engine,
    *,
    claims: list[ClaimedAiDescriptionLocaleWorkItem],
    lease_ttl_seconds: int,
) -> AiDescriptionLeaseExtension:
    if not claims:
        return AiDescriptionLeaseExtension(
            extended_lineage_work_ids=[],
            extended_translation_work_ids=[],
        )

    lease_expires_at = datetime.now(UTC) + timedelta(seconds=lease_ttl_seconds)
    lineage_keys = sorted(
        (claim.id, claim.lease_token)
        for claim in claims
        if isinstance(claim, ClaimedLineageDescriptionWorkItem)
    )
    translation_keys = sorted(
        (claim.id, claim.lease_token)
        for claim in claims
        if isinstance(claim, ClaimedDescriptionTranslationWorkItem)
    )
    extended_lineage_work_ids: list[int] = []
    extended_translation_work_ids: list[int] = []

    with Session(engine) as session:
        for chunk in _iter_chunks(
            lineage_keys,
            chunk_size=_max_rows_per_insert(column_count=2),
        ):
            rows = session.execute(
                update(OpinionGroupLineageDescriptionWork)
                .where(
                    tuple_(
                        OpinionGroupLineageDescriptionWork.id,
                        OpinionGroupLineageDescriptionWork.lease_token,
                    ).in_(chunk)
                )
                .values(
                    lease_expires_at=lease_expires_at,
                    updated_at=func.now(),
                )
                .returning(OpinionGroupLineageDescriptionWork.id)
            ).all()
            extended_lineage_work_ids.extend(row.id for row in rows)

        for chunk in _iter_chunks(
            translation_keys,
            chunk_size=_max_rows_per_insert(column_count=2),
        ):
            rows = session.execute(
                update(OpinionGroupDescriptionTranslationWork)
                .where(
                    tuple_(
                        OpinionGroupDescriptionTranslationWork.id,
                        OpinionGroupDescriptionTranslationWork.lease_token,
                    ).in_(chunk)
                )
                .values(
                    lease_expires_at=lease_expires_at,
                    updated_at=func.now(),
                )
                .returning(OpinionGroupDescriptionTranslationWork.id)
            ).all()
            extended_translation_work_ids.extend(row.id for row in rows)
        session.commit()

    return AiDescriptionLeaseExtension(
        extended_lineage_work_ids=sorted(extended_lineage_work_ids),
        extended_translation_work_ids=sorted(extended_translation_work_ids),
    )


def process_ai_description_locale_work_item(
    engine: Engine,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    generate_descriptions: DescriptionGenerator,
    translate_descriptions: DescriptionTranslator | None,
    require_activated_view_snapshot: bool = False,
) -> AiDescriptionWorkResult:
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
                schedule = _get_conversation_work_result(
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
                schedule = _get_conversation_work_result(
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
            _materialize_eager_translation_work(
                session,
                conversation_ids=[claim.conversation_id],
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            _materialize_translation_work_for_candidate_locale_requests(
                session,
                conversation_ids=[claim.conversation_id],
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            schedule = _get_conversation_work_result(
                session,
                conversation_id=claim.conversation_id,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            session.commit()
            log.info(
                "[AiDescriptionWorkDB] Completed lineage description work "
                "conversationSlugId=%s conversationId=%d lineageId=%d "
                "attemptCount=%d providerMs=%.1f totalMs=%.1f generated=%s",
                claim.conversation_slug_id,
                claim.conversation_id,
                claim.lineage_id,
                claim.attempt_count,
                provider_ms,
                (time.perf_counter() - started_at) * 1000,
                lineage_request is not None,
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
            schedule = _get_conversation_work_result(
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
            schedule = _get_conversation_work_result(
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
        schedule = _get_conversation_work_result(
            session,
            conversation_id=claim.conversation_id,
            require_activated_view_snapshot=require_activated_view_snapshot,
        )
        session.commit()
        log.info(
            "[AiDescriptionWorkDB] Completed translation work conversationSlugId=%s "
            "conversationId=%d descriptionId=%d locale=%s attemptCount=%d "
            "providerMs=%.1f totalMs=%.1f translated=%s",
            claim.conversation_slug_id,
            claim.conversation_id,
            claim.description_id,
            claim.locale,
            claim.attempt_count,
            provider_ms,
            (time.perf_counter() - started_at) * 1000,
            description_request is not None,
        )
        return schedule


def _process_lineage_description_work_items_batch(
    engine: Engine,
    *,
    claims: list[ClaimedLineageDescriptionWorkItem],
    generate_descriptions: DescriptionGenerator,
    claim_scope: _AiDescriptionClaimScope,
    require_activated_view_snapshot: bool = False,
) -> LineageDescriptionBatchProcessResult:
    if not claims:
        return LineageDescriptionBatchProcessResult(
            schedules=[],
            generated_lineage_ids=[],
        )

    started_at = time.perf_counter()
    schedules: list[AiDescriptionWorkResult] = []
    processable_claims: list[ClaimedLineageDescriptionWorkItem] = []
    request_by_claim_id: dict[int, _LineageDescriptionRequest] = {}

    with Session(engine) as session:
        active_claims: list[ClaimedLineageDescriptionWorkItem] = []
        for claim in claims:
            if not _ai_description_claim_is_active(session, claim=claim):
                log.info(
                    "[AiDescriptionWorkDB] Skipping inactive lineage claim "
                    "conversationSlugId=%s lineageId=%d attemptCount=%d",
                    claim.conversation_slug_id,
                    claim.lineage_id,
                    claim.attempt_count,
                )
                schedules.append(
                    _get_conversation_work_result(
                        session,
                        conversation_id=claim.conversation_id,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    )
                )
                continue
            if not _conversation_is_processable(session, conversation_id=claim.conversation_id):
                schedules.append(
                    _complete_claimed_non_processable_ai_description_work(
                        session,
                        claim=claim,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    )
                )
                continue
            active_claims.append(claim)

        request_by_claim_id = _fetch_base_description_requests_for_lineage_work_batch(
            session,
            claims=active_claims,
        )
        processable_claims.extend(active_claims)
        session.commit()

    provider_started_at = time.perf_counter()
    generated_by_claim_id: dict[int, ParsedLabelSummaryOutput] = {}
    claims_by_candidate_id: dict[int, list[ClaimedLineageDescriptionWorkItem]] = {}
    for claim in processable_claims:
        if claim.id in request_by_claim_id:
            claims_by_candidate_id.setdefault(claim.source_candidate_id, []).append(claim)

    for candidate_claims in claims_by_candidate_id.values():
        requests = [request_by_claim_id[claim.id] for claim in candidate_claims]
        first_request = requests[0]
        conversation = ConversationDescriptionInput(
            conversation_title=first_request.conversation.conversation_title,
            conversation_body=first_request.conversation.conversation_body,
            groups=[request.conversation.groups[0] for request in requests],
            analysis_snapshot_id=first_request.conversation.analysis_snapshot_id,
        )
        generated = generate_label_summaries_with_partial_retry(
            generate_descriptions=generate_descriptions,
            conversation=conversation,
            attempts=2,
        )
        for claim, request in zip(candidate_claims, requests, strict=True):
            if request.group_key in generated.clusters:
                generated_by_claim_id[claim.id] = generated
    provider_ms = (time.perf_counter() - provider_started_at) * 1000

    missing_lineage_ids = sorted(
        claim.lineage_id
        for claim in processable_claims
        if claim.id in request_by_claim_id and claim.id not in generated_by_claim_id
    )
    with Session(engine) as session:
        completed_claims: list[ClaimedLineageDescriptionWorkItem] = []
        generated_lineage_ids: set[int] = set()
        for claim in processable_claims:
            if not _ai_description_claim_is_active(session, claim=claim):
                log.info(
                    "[AiDescriptionWorkDB] Skipping inactive lineage claim after provider "
                    "conversationSlugId=%s lineageId=%d attemptCount=%d",
                    claim.conversation_slug_id,
                    claim.lineage_id,
                    claim.attempt_count,
                )
                schedules.append(
                    _get_conversation_work_result(
                        session,
                        conversation_id=claim.conversation_id,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    )
                )
                continue
            if not _conversation_is_processable(session, conversation_id=claim.conversation_id):
                schedules.append(
                    _complete_claimed_non_processable_ai_description_work(
                        session,
                        claim=claim,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    )
                )
                continue
            request = request_by_claim_id.get(claim.id)
            generated = generated_by_claim_id.get(claim.id)
            if request is not None and generated is not None:
                _persist_generated_base_description_for_lineage_work(
                    session,
                    claim=claim,
                    request=request,
                    generated=generated,
                )
                generated_lineage_ids.add(claim.lineage_id)
            if request is None or generated is not None:
                _mark_lineage_description_work_complete(session, claim=claim)
                completed_claims.append(claim)

        affected_conversation_ids = sorted({claim.conversation_id for claim in completed_claims})
        if affected_conversation_ids:
            _materialize_eager_translation_work(
                session,
                conversation_ids=affected_conversation_ids,
                require_activated_view_snapshot=require_activated_view_snapshot,
            )
            if claim_scope == _AiDescriptionClaimScope.retry:
                _materialize_translation_work_for_candidate_locale_requests(
                    session,
                    conversation_ids=affected_conversation_ids,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                )
            schedule_by_conversation_id = {
                conversation_id: _get_conversation_work_result(
                    session,
                    conversation_id=conversation_id,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                )
                for conversation_id in affected_conversation_ids
            }
            schedules.extend(
                schedule_by_conversation_id[claim.conversation_id] for claim in completed_claims
            )
        session.commit()

    log.info(
        "[AiDescriptionWorkDB] Completed lineage description work batch count=%d "
        "providerMs=%.1f totalMs=%.1f generated=%d conversationSlugIds=%s",
        len(claims),
        provider_ms,
        (time.perf_counter() - started_at) * 1000,
        len(generated_lineage_ids),
        ",".join(sorted({claim.conversation_slug_id for claim in claims})),
    )
    return LineageDescriptionBatchProcessResult(
        schedules=schedules,
        generated_lineage_ids=sorted(generated_lineage_ids),
        missing_lineage_ids=missing_lineage_ids,
    )


def process_lineage_description_work_items_batch(
    engine: Engine,
    *,
    claims: list[ClaimedLineageDescriptionWorkItem],
    generate_descriptions: DescriptionGenerator,
    require_activated_view_snapshot: bool = False,
) -> LineageDescriptionBatchProcessResult:
    return _process_lineage_description_work_items_batch(
        engine,
        claims=claims,
        generate_descriptions=generate_descriptions,
        claim_scope=_AiDescriptionClaimScope.retry,
        require_activated_view_snapshot=require_activated_view_snapshot,
    )


def process_first_pass_lineage_description_work_items_batch(
    engine: Engine,
    *,
    claims: list[ClaimedLineageDescriptionWorkItem],
    generate_descriptions: DescriptionGenerator,
) -> LineageDescriptionBatchProcessResult:
    return _process_lineage_description_work_items_batch(
        engine,
        claims=claims,
        generate_descriptions=generate_descriptions,
        claim_scope=_AiDescriptionClaimScope.first_pass,
    )


def generate_label_summaries_with_partial_retry(
    *,
    generate_descriptions: DescriptionGenerator,
    conversation: ConversationDescriptionInput,
    attempts: int,
) -> ParsedLabelSummaryOutput:
    generated_clusters: dict[str, LabelSummary] = {}
    generated_mode = "strict"
    group_by_key = {group.group_key: group for group in conversation.groups}
    remaining_group_keys = set(group_by_key)
    for attempt in range(1, attempts + 1):
        if not remaining_group_keys:
            break
        attempt_conversation = ConversationDescriptionInput(
            conversation_title=conversation.conversation_title,
            conversation_body=conversation.conversation_body,
            groups=[group_by_key[group_key] for group_key in sorted(remaining_group_keys)],
            analysis_snapshot_id=conversation.analysis_snapshot_id,
        )
        try:
            generated = generate_descriptions(attempt_conversation)
        except Exception as error:
            if is_provider_timeout_error(error):
                log.warning(
                    "[AiDescriptionWorkDB] AI label/summary partial retry attempt %d/%d timed out",
                    attempt,
                    attempts,
                    exc_info=True,
                )
                if generated_clusters:
                    break
                raise
            log.warning(
                "[AiDescriptionWorkDB] AI label/summary partial retry attempt %d/%d failed",
                attempt,
                attempts,
                exc_info=True,
            )
            if attempt == attempts:
                if generated_clusters:
                    break
                raise
            continue
        generated_mode = "loose" if generated.mode == "loose" else generated_mode
        for group_key in sorted(remaining_group_keys):
            label_summary = generated.clusters.get(group_key)
            if label_summary is None:
                continue
            generated_clusters[group_key] = label_summary
        remaining_group_keys -= set(generated_clusters)
    return ParsedLabelSummaryOutput(mode=generated_mode, clusters=generated_clusters)


def process_description_translation_work_items_batch(
    engine: Engine,
    *,
    claims: list[ClaimedDescriptionTranslationWorkItem],
    translate_descriptions: DescriptionTranslator,
    require_activated_view_snapshot: bool = False,
) -> DescriptionTranslationBatchProcessResult:
    if not claims:
        return DescriptionTranslationBatchProcessResult(
            schedules=[],
            translated_description_ids=[],
        )

    provider_targets = description_translation_provider_targets(
        [claim.locale for claim in claims]
    )
    if len(provider_targets) != 1:
        msg = "translation batches must contain exactly one provider target"
        raise ValueError(msg)
    provider_target_locale = provider_targets[0]

    started_at = time.perf_counter()
    schedules: list[AiDescriptionWorkResult] = []
    descriptions: list[DescriptionForTranslation] = []
    processable_claims: list[ClaimedDescriptionTranslationWorkItem] = []

    with Session(engine) as session:
        active_claims: list[ClaimedDescriptionTranslationWorkItem] = []
        for claim in claims:
            if not _ai_description_claim_is_active(session, claim=claim):
                log.info(
                    "[AiDescriptionWorkDB] Skipping inactive translation claim "
                    "conversationSlugId=%s descriptionId=%d locale=%s attemptCount=%d",
                    claim.conversation_slug_id,
                    claim.description_id,
                    claim.locale,
                    claim.attempt_count,
                )
                schedules.append(
                    _get_conversation_work_result(
                        session,
                        conversation_id=claim.conversation_id,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    )
                )
                continue
            if not _conversation_is_processable(session, conversation_id=claim.conversation_id):
                schedules.append(
                    _complete_claimed_non_processable_ai_description_work(
                        session,
                        claim=claim,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    )
                )
                continue

            active_claims.append(claim)
        descriptions_by_id = _fetch_descriptions_for_translation_work_batch(
            session,
            claims=active_claims,
        )
        for claim in active_claims:
            processable_claims.append(claim)
            description_request = descriptions_by_id.get(claim.description_id)
            if description_request is None:
                continue
            descriptions.append(description_request)
        descriptions = list(
            {
                description.description_id: description for description in descriptions
            }.values()
        )
        session.commit()

    provider_started_at = time.perf_counter()
    translations = (
        translate_descriptions(descriptions, [provider_target_locale]) if descriptions else []
    )
    provider_ms = (time.perf_counter() - provider_started_at) * 1000
    expected_description_ids = {description.description_id for description in descriptions}
    translation_by_description_locale = _translation_by_description_locale_for_batch(
        translations=translations,
        expected_description_ids=expected_description_ids,
        provider_target_locale=provider_target_locale,
    )
    missing_description_ids = sorted(
        {
            claim.description_id
            for claim in processable_claims
            if (claim.description_id, claim.locale) not in translation_by_description_locale
            and claim.description_id in expected_description_ids
        }
    )

    with Session(engine) as session:
        completed_claims: list[ClaimedDescriptionTranslationWorkItem] = []
        provider_requested_description_ids = expected_description_ids
        for claim in processable_claims:
            if not _ai_description_claim_is_active(session, claim=claim):
                log.info(
                    "[AiDescriptionWorkDB] Skipping inactive translation claim after provider "
                    "conversationSlugId=%s descriptionId=%d locale=%s attemptCount=%d",
                    claim.conversation_slug_id,
                    claim.description_id,
                    claim.locale,
                    claim.attempt_count,
                )
                schedules.append(
                    _get_conversation_work_result(
                        session,
                        conversation_id=claim.conversation_id,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    )
                )
                continue
            if not _conversation_is_processable(session, conversation_id=claim.conversation_id):
                schedules.append(
                    _complete_claimed_non_processable_ai_description_work(
                        session,
                        claim=claim,
                        require_activated_view_snapshot=require_activated_view_snapshot,
                    )
                )
                continue
            if (
                claim.description_id not in provider_requested_description_ids
                or (claim.description_id, claim.locale) in translation_by_description_locale
            ):
                completed_claims.append(claim)

        active_description_ids = {
            claim.description_id
            for claim in completed_claims
            if (claim.description_id, claim.locale) in translation_by_description_locale
        }
        translation_values = [
            {
                "description_id": translation.description_id,
                "locale": translation.locale,
                "label": translation.label,
                "summary": translation.summary,
            }
            for (description_id, _locale), translation in translation_by_description_locale.items()
            if description_id in active_description_ids
        ]
        if translation_values:
            _insert_description_translations(
                session,
                translation_values=translation_values,
            )

        for claim in completed_claims:
            _mark_translation_work_complete(session, claim=claim)

        affected_conversation_ids = sorted({claim.conversation_id for claim in completed_claims})
        if affected_conversation_ids:
            schedule_by_conversation_id = {
                conversation_id: _get_conversation_work_result(
                    session,
                    conversation_id=conversation_id,
                    require_activated_view_snapshot=require_activated_view_snapshot,
                )
                for conversation_id in affected_conversation_ids
            }
            schedules.extend(
                schedule_by_conversation_id[claim.conversation_id] for claim in completed_claims
            )
        session.commit()

    log.info(
        "[AiDescriptionWorkDB] Completed translation work batch count=%d providerLocale=%s "
        "providerMs=%.1f totalMs=%.1f translated=%d conversationSlugIds=%s",
        len(completed_claims),
        provider_target_locale,
        provider_ms,
        (time.perf_counter() - started_at) * 1000,
        len(active_description_ids),
        ",".join(sorted({claim.conversation_slug_id for claim in completed_claims})),
    )
    return DescriptionTranslationBatchProcessResult(
        schedules=schedules,
        translated_description_ids=sorted(active_description_ids),
        missing_description_ids=missing_description_ids,
    )


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
) -> AiDescriptionWorkResult:
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
                lease_owner=None,
                lease_token=None,
                lease_expires_at=None,
                last_error_code=None,
                last_error_message=None,
                updated_at=func.now(),
            )
        )

    return _get_conversation_work_result(
        session,
        conversation_id=claim.conversation_id,
        require_activated_view_snapshot=require_activated_view_snapshot,
    )


def retry_ai_description_locale_work_item(
    engine: Engine,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    error_code: str,
    error_message: str,
    require_activated_view_snapshot: bool = False,
) -> AiDescriptionWorkResult:
    now = datetime.now(UTC)
    with Session(engine) as session:
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
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    last_error_code=error_code,
                    last_error_message=error_message,
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
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    last_error_code=error_code,
                    last_error_message=error_message,
                    updated_at=func.now(),
                )
            )
        schedule = _get_conversation_work_result(
            session,
            conversation_id=claim.conversation_id,
            require_activated_view_snapshot=require_activated_view_snapshot,
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
        log.info(
            "[AiDescriptionWorkDB] Released AI description work for retry kind=%s "
            "conversationSlugId=%s conversationId=%d locale=%s %s=%d attemptCount=%d "
            "retryReleasedAt=%s fallbackMarked=%s",
            retry_kind,
            claim.conversation_slug_id,
            claim.conversation_id,
            claim.locale,
            retry_target_name,
            retry_target_id,
            claim.attempt_count,
            now.isoformat(),
            False,
        )
        return AiDescriptionWorkResult(
            conversation_id=schedule.conversation_id,
            retry_released_at=now,
        )


def mark_non_retryable_ai_description_locale_work_item(
    engine: Engine,
    *,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    ai_description_epoch: int,
    error_code: str,
    error_message: str,
    require_activated_view_snapshot: bool = False,
) -> AiDescriptionWorkResult:
    with Session(engine) as session:
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
            session.execute(
                update(OpinionGroupDescriptionTranslationWork)
                .where(
                    and_(
                        OpinionGroupDescriptionTranslationWork.id == claim.id,
                        OpinionGroupDescriptionTranslationWork.lease_token == claim.lease_token,
                    )
                )
                .values(
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    non_retryable_ai_description_epoch=ai_description_epoch,
                    last_error_code=error_code,
                    last_error_message=error_message,
                    updated_at=func.now(),
                )
            )
        schedule = _get_conversation_work_result(
            session,
            conversation_id=claim.conversation_id,
            require_activated_view_snapshot=require_activated_view_snapshot,
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
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
    )


def _get_conversation_work_result(
    session: Session,
    *,
    conversation_id: int,
    require_activated_view_snapshot: bool = False,
) -> AiDescriptionWorkResult:
    del session, require_activated_view_snapshot
    return AiDescriptionWorkResult(conversation_id=conversation_id)


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


def _fetch_base_description_requests_for_lineage_work_batch(
    session: Session,
    *,
    claims: list[ClaimedLineageDescriptionWorkItem],
) -> dict[int, _LineageDescriptionRequest]:
    if not claims:
        return {}

    lineage_ids = sorted({claim.lineage_id for claim in claims})
    lineage_rows = session.execute(
        select(OpinionGroupLineage.id, OpinionGroupLineage.system_description_id).where(
            OpinionGroupLineage.id.in_(lineage_ids)
        )
    ).all()
    existing_description_lineage_ids = {
        row.id for row in lineage_rows if row.system_description_id is not None
    }
    pending_claims = [
        claim for claim in claims if claim.lineage_id not in existing_description_lineage_ids
    ]
    if not pending_claims:
        return {}

    source_candidate_ids = sorted({claim.source_candidate_id for claim in pending_claims})
    conversation_content_rows = session.execute(
        select(
            OpinionGroupCandidate.id.label("candidate_id"),
            ConversationContent.title,
            ConversationContent.body,
            AnalysisSnapshot.id.label("analysis_snapshot_id"),
        )
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
        .where(OpinionGroupCandidate.id.in_(source_candidate_ids))
    ).all()
    conversation_content_by_candidate_id = {
        row.candidate_id: row for row in conversation_content_rows
    }

    group_pairs = sorted(
        {(claim.source_candidate_id, claim.lineage_id) for claim in pending_claims}
    )
    group_rows = session.execute(
        select(
            OpinionGroup.candidate_id,
            OpinionGroup.lineage_id,
            OpinionGroup.key,
        ).where(tuple_(OpinionGroup.candidate_id, OpinionGroup.lineage_id).in_(group_pairs))
    ).all()
    group_key_by_pair = {
        (row.candidate_id, row.lineage_id): row.key for row in group_rows
    }

    representative_rows = session.execute(
        select(
            OpinionGroup.candidate_id,
            OpinionGroup.lineage_id,
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
                tuple_(OpinionGroup.candidate_id, OpinionGroup.lineage_id).in_(group_pairs),
                OpinionGroupOpinionStats.representative_agreement_type.is_not(None),
            )
        )
        .order_by(
            OpinionGroup.candidate_id,
            OpinionGroup.lineage_id,
            AnalysisSnapshotOpinion.opinion_id,
        )
    ).all()
    representative_opinions_by_pair: dict[
        tuple[int, int], list[RepresentativeOpinionText]
    ] = {}
    for row in representative_rows:
        if row.representative_agreement_type is None:
            continue
        representative_opinions_by_pair.setdefault((row.candidate_id, row.lineage_id), []).append(
            RepresentativeOpinionText(
                opinion_id=row.opinion_id,
                stance=row.representative_agreement_type,
                content=row.content,
            )
        )

    requests_by_claim_id: dict[int, _LineageDescriptionRequest] = {}
    for claim in pending_claims:
        pair = (claim.source_candidate_id, claim.lineage_id)
        conversation_content = conversation_content_by_candidate_id.get(claim.source_candidate_id)
        if conversation_content is None:
            msg = "analysis snapshot is missing conversation content"
            raise DescriptionInputError(msg)
        group_key = group_key_by_pair.get(pair)
        if group_key is None:
            msg = f"lineage {claim.lineage_id} is missing source group"
            raise DescriptionInputError(msg)
        representative_opinions = representative_opinions_by_pair.get(pair, [])
        if not representative_opinions:
            msg = f"lineage {claim.lineage_id} has no representative opinions"
            raise DescriptionInputError(msg)
        group = GroupDescriptionInput(
            group_key=group_key,
            representative_opinions=sorted(
                representative_opinions,
                key=lambda opinion: (opinion.stance.value, opinion.opinion_id),
            ),
        )
        requests_by_claim_id[claim.id] = _LineageDescriptionRequest(
            group_key=group.group_key,
            conversation=ConversationDescriptionInput(
                conversation_title=conversation_content.title,
                conversation_body=conversation_content.body,
                groups=[group],
                analysis_snapshot_id=conversation_content.analysis_snapshot_id,
            ),
        )
    return requests_by_claim_id


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

    _insert_description_translations(
        session,
        translation_values=[
            {
                "description_id": translation.description_id,
                "locale": translation.locale,
                "label": translation.label,
                "summary": translation.summary,
            }
        ],
    )


def _insert_description_translations(
    session: Session,
    *,
    translation_values: Sequence[Mapping[str, object]],
) -> None:
    created_at = datetime.now(UTC)
    values: list[dict[str, object]] = []
    for translation_value in translation_values:
        value = dict(translation_value)
        value["created_at"] = created_at
        values.append(value)
    dialect_name = session.get_bind().dialect.name
    if dialect_name == "sqlite":
        statement = (
            sqlite_insert(OpinionGroupDescriptionTranslation)
            .values(values)
            .on_conflict_do_nothing()
        )
    else:
        statement = (
            pg_insert(OpinionGroupDescriptionTranslation)
            .values(values)
            .on_conflict_do_nothing(
                index_elements=[
                    OpinionGroupDescriptionTranslation.description_id,
                    OpinionGroupDescriptionTranslation.locale,
                ]
            )
        )
    session.execute(statement)


def _translation_by_description_locale_for_batch(
    *,
    translations: list[DescriptionTranslation],
    expected_description_ids: set[int],
    provider_target_locale: str,
) -> dict[tuple[int, str], DescriptionTranslation]:
    if not expected_description_ids:
        if translations:
            msg = "translation output mismatch for empty batch"
            raise DescriptionOutputError(msg)
        return {}

    expected_locales = set(description_translation_output_locales(provider_target_locale))
    translation_by_description_locale: dict[tuple[int, str], DescriptionTranslation] = {}
    for translation in translations:
        if translation.locale not in expected_locales:
            msg = f"translation output mismatch for provider locale {provider_target_locale}"
            raise DescriptionOutputError(msg)
        if translation.description_id not in expected_description_ids:
            msg = f"unexpected translation output for description {translation.description_id}"
            raise DescriptionOutputError(msg)
        key = (translation.description_id, translation.locale)
        if key in translation_by_description_locale:
            msg = (
                f"duplicate translation output for description {translation.description_id} "
                f"locale {translation.locale}"
            )
            raise DescriptionOutputError(msg)
        translation_by_description_locale[key] = translation

    return translation_by_description_locale


def _fetch_descriptions_for_translation_work_batch(
    session: Session,
    *,
    claims: list[ClaimedDescriptionTranslationWorkItem],
) -> dict[int, DescriptionForTranslation]:
    if not claims:
        return {}

    provider_targets = description_translation_provider_targets(
        [claim.locale for claim in claims]
    )
    if len(provider_targets) != 1:
        msg = "translation hydration batches must contain exactly one provider target"
        raise ValueError(msg)

    description_ids = sorted({claim.description_id for claim in claims})
    requested_keys = sorted({(claim.description_id, claim.locale) for claim in claims})
    existing_translation_rows = session.execute(
        select(
            OpinionGroupDescriptionTranslation.description_id,
            OpinionGroupDescriptionTranslation.locale,
        ).where(
            tuple_(
                OpinionGroupDescriptionTranslation.description_id,
                OpinionGroupDescriptionTranslation.locale,
            ).in_(requested_keys)
        )
    ).all()
    translated_description_locale_keys = {
        (row.description_id, row.locale) for row in existing_translation_rows
    }
    pending_description_ids = [
        description_id for description_id in description_ids if any(
            (description_id, claim.locale) not in translated_description_locale_keys
            for claim in claims
            if claim.description_id == description_id
        )
    ]
    if not pending_description_ids:
        return {}

    description_rows = session.execute(
        select(
            OpinionGroupDescription.id,
            OpinionGroupDescription.label,
            OpinionGroupDescription.summary,
        ).where(OpinionGroupDescription.id.in_(pending_description_ids))
    ).all()
    description_row_by_id = {row.id: row for row in description_rows}
    missing_description_ids = sorted(set(pending_description_ids) - set(description_row_by_id))
    if missing_description_ids:
        msg = f"description {missing_description_ids[0]} is missing"
        raise DescriptionInputError(msg)

    conversation_ids = sorted({claim.conversation_id for claim in claims})
    context_rows = session.execute(
        select(
            OpinionGroupLineage.system_description_id.label("description_id"),
            OpinionGroupLineage.id.label("lineage_id"),
            OpinionGroupLineageDescriptionWork.source_candidate_id,
            ConversationContent.title.label("conversation_title"),
        )
        .select_from(OpinionGroupLineage)
        .join(
            OpinionGroupLineageDescriptionWork,
            OpinionGroupLineageDescriptionWork.lineage_id == OpinionGroupLineage.id,
        )
        .join(
            OpinionGroupCandidate,
            OpinionGroupCandidate.id == OpinionGroupLineageDescriptionWork.source_candidate_id,
        )
        .join(
            AnalysisSnapshotResult,
            AnalysisSnapshotResult.id == OpinionGroupCandidate.snapshot_result_id,
        )
        .join(AnalysisSnapshot, AnalysisSnapshot.id == AnalysisSnapshotResult.analysis_snapshot_id)
        .join(
            ConversationContent,
            ConversationContent.id == AnalysisSnapshot.conversation_content_id,
        )
        .where(
            and_(
                OpinionGroupLineage.system_description_id.in_(pending_description_ids),
                OpinionGroupLineageDescriptionWork.conversation_id.in_(conversation_ids),
            )
        )
        .order_by(OpinionGroupLineage.system_description_id, OpinionGroupLineageDescriptionWork.id)
    ).all()
    context_by_description_id: dict[int, _TranslationDescriptionContext] = {}
    for row in context_rows:
        if row.description_id in context_by_description_id:
            continue
        context_by_description_id[row.description_id] = _TranslationDescriptionContext(
            description_id=row.description_id,
            lineage_id=row.lineage_id,
            source_candidate_id=row.source_candidate_id,
            conversation_title=row.conversation_title,
        )

    context_pairs = sorted(
        {
            (context.source_candidate_id, context.lineage_id)
            for context in context_by_description_id.values()
        }
    )
    representative_opinions_by_description_id: dict[
        int, list[TranslationRepresentativeOpinion]
    ] = {description_id: [] for description_id in pending_description_ids}
    if context_pairs:
        representative_rows = session.execute(
            select(
                OpinionGroup.candidate_id,
                OpinionGroup.lineage_id,
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
                    tuple_(OpinionGroup.candidate_id, OpinionGroup.lineage_id).in_(context_pairs),
                    OpinionGroupOpinionStats.representative_agreement_type.is_not(None),
                )
            )
            .order_by(
                OpinionGroup.candidate_id,
                OpinionGroup.lineage_id,
                AnalysisSnapshotOpinion.opinion_id,
            )
        ).all()
        description_id_by_context_pair = {
            (context.source_candidate_id, context.lineage_id): context.description_id
            for context in context_by_description_id.values()
        }
        for row in representative_rows:
            description_id = description_id_by_context_pair.get(
                (row.candidate_id, row.lineage_id)
            )
            if description_id is None or row.representative_agreement_type is None:
                continue
            representative_opinions_by_description_id.setdefault(description_id, []).append(
                TranslationRepresentativeOpinion(
                    opinion_id=row.opinion_id,
                    stance=row.representative_agreement_type.value,
                    content=row.content,
                )
            )

    descriptions_by_id: dict[int, DescriptionForTranslation] = {}
    for description_id in pending_description_ids:
        description_row = description_row_by_id[description_id]
        context = context_by_description_id.get(description_id)
        descriptions_by_id[description_id] = DescriptionForTranslation(
            description_id=description_row.id,
            label=description_row.label,
            summary=description_row.summary,
            conversation_title=context.conversation_title if context is not None else None,
            representative_opinions=sorted(
                representative_opinions_by_description_id.get(description_id, []),
                key=lambda opinion: (opinion.stance, opinion.opinion_id),
            ),
        )
    return descriptions_by_id


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
