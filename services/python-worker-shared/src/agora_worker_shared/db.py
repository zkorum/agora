from __future__ import annotations

import logging
import uuid
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Literal, TypedDict

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import and_, case, func, or_, select, tuple_, update
from sqlalchemy import insert as sqlalchemy_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, aliased

from agora_worker_shared.generated_models import (
    AiDescriptionLocaleStatusEnum,
    AnalysisCompressionEnum,
    AnalysisInputSnapshot,
    AnalysisInsufficientDataReasonEnum,
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotOpinion,
    AnalysisSnapshotResult,
    AnalysisWorkState,
    Conversation,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotCheckpointReasonEnum,
    ConversationViewSnapshotReasonEnum,
    Opinion,
    OpinionGroup,
    OpinionGroupCandidate,
    OpinionGroupCandidateAssessment,
    OpinionGroupCandidateOpinionMetrics,
    OpinionGroupDescriptionLocaleStatus,
    OpinionGroupLineage,
    OpinionGroupLineageDescriptionWork,
    OpinionGroupLineageScope,
    OpinionGroupOpinionStats,
    OpinionGroupSpec,
    OpinionGroupUser,
    OpinionGroupVariant,
    OpinionModeration,
    OpinionModerationAction,
    PremiumFeatureEntitlement,
    RealtimeEventOutbox,
    SurveyAggregateOption,
    SurveyAggregateOwnerCurrent,
    SurveyAggregateQuestion,
    SurveyAggregateResult,
    SurveyAggregateScopeEnum,
    SurveyAggregateSnapshot,
    SurveyAnswer,
    SurveyAnswerOption,
    SurveyConfig,
    SurveyQuestion,
    SurveyQuestionContent,
    SurveyQuestionOption,
    SurveyQuestionOptionContent,
    SurveyResponse,
    User,
    Vote,
    VoteContent,
    VoteEnumSimple,
)
from agora_worker_shared.generated_models import (
    PremiumFeature as PremiumFeatureEnum,
)
from agora_worker_shared.generated_shared_types import SUPPORTED_DISPLAY_LANGUAGE_CODES
from agora_worker_shared.input_snapshot import PreparedInputSnapshot, VoteInputRow
from agora_worker_shared.lineage_matching import (
    NewLineageGroup,
    PreviousLineageGroup,
    RepresentativeOpinionKey,
    exact_matching_lineage_ids,
    match_lineages_by_representative_opinions,
)
from agora_worker_shared.retry_policy import RetryPolicy, next_retry_at
from agora_worker_shared.survey_aggregates import (
    PUBLIC_SURVEY_SUPPRESSION_THRESHOLD,
    SurveyAggregateBuildResult,
    SurveyAggregateGroupMembership,
    SurveyAnswerSnapshot,
    SurveyConfigSnapshot,
    SurveyOptionSnapshot,
    SurveyQuestionSnapshot,
    SurveyResponseSnapshot,
    build_full_survey_aggregates,
    build_suppressed_survey_aggregates,
)

STRING_OBJECT_DICT_ADAPTER = TypeAdapter(dict[str, object])
PARTICIPANT_MILESTONE_SEEDS = (2,)
PREMIUM_ANALYSIS_FEATURE = PremiumFeatureEnum.analysis_variants
VOTE_MILESTONE_SEEDS: tuple[int, ...] = ()
MILESTONE_MULTIPLIERS = ((1, 1), (25, 10), (5, 1))
POSTGRES_INSERT_BIND_PARAM_LIMIT = 60_000
log = logging.getLogger(__name__)
type _LineageDecisionAction = Literal["reuse", "create"]
type _LineageDecisionReason = Literal[
    "exact_representative_opinion_match",
    "no_previous_lineage_groups",
    "no_exact_representative_opinion_match",
]

if TYPE_CHECKING:
    from collections.abc import Iterator

    from sqlalchemy import Engine
    from sqlalchemy.sql.elements import ColumnElement

    from agora_worker_shared.analysis_compute import (
        ComputedAnalysisBundle,
        ComputedGroupOpinionStats,
        ComputedOpinionGroup,
        ComputedOpinionGroupCandidate,
        JsonObject,
    )


@dataclass(frozen=True)
class ClaimedWorkItem:
    id: int
    conversation_id: int
    conversation_slug_id: str
    opinion_group_spec_id: int
    data_generation: int
    attempt_count: int
    lease_token: str
    persisted_analysis_snapshot_id: int | None


@dataclass(frozen=True)
class ClaimedInputBatch:
    claims: list[ClaimedWorkItem]
    rows_by_conversation_id: dict[int, list[VoteInputRow]]


@dataclass(frozen=True)
class StoredInputSnapshot:
    id: int
    conversation_id: int
    data_generation: int
    input_hash: str


@dataclass(frozen=True)
class WorkStateSchedule:
    conversation_id: int
    next_run_at: datetime | None


@dataclass(frozen=True)
class PersistComputedAnalysisResult:
    analysis_schedules: list[WorkStateSchedule]
    ai_description_due_conversation_ids: list[int]
    ai_description_due_view_snapshot_ids: list[int]
    checkpoint_activation_context: CheckpointActivationContext | None


class AnalysisWorkStatePersistenceError(RuntimeError):
    pass


class LineageAssignmentInvariantError(AnalysisWorkStatePersistenceError):
    pass


class _GroupOpinionStatsInsertBase(TypedDict):
    group_id: int
    analysis_snapshot_opinion_id: int
    num_agrees: int
    num_disagrees: int
    num_passes: int


class _GroupOpinionStatsInsertWithoutRepresentative(_GroupOpinionStatsInsertBase):
    representative_agreement_type: None
    representative_probability_agreement: None
    representative_number_agreement: None
    raw_repness: None


class _GroupOpinionStatsInsertWithRepresentative(_GroupOpinionStatsInsertBase):
    representative_agreement_type: VoteEnumSimple
    representative_probability_agreement: float
    representative_number_agreement: int
    raw_repness: JsonObject


_GroupOpinionStatsInsertValue = (
    _GroupOpinionStatsInsertWithoutRepresentative | _GroupOpinionStatsInsertWithRepresentative
)


class _CheckpointReasonInsertValue(TypedDict):
    conversation_view_snapshot_id: int
    conversation_id: int
    opinion_group_spec_id: int
    reason: ConversationViewSnapshotCheckpointReasonEnum
    group_count: int | None
    previous_group_count: int | None
    participant_count: int | None
    participant_milestone: int | None
    vote_count: int | None
    vote_milestone: int | None
    created_at: datetime


def _max_rows_per_insert(*, column_count: int) -> int:
    return max(1, POSTGRES_INSERT_BIND_PARAM_LIMIT // column_count)


def _iter_chunks[T](values: list[T], *, chunk_size: int) -> Iterator[list[T]]:
    for start in range(0, len(values), chunk_size):
        yield values[start : start + chunk_size]


def _checkpoint_reason_insert_value(
    *,
    conversation_view_snapshot_id: int,
    conversation_id: int,
    opinion_group_spec_id: int,
    reason: ConversationViewSnapshotCheckpointReasonEnum,
    group_count: int | None = None,
    previous_group_count: int | None = None,
    participant_count: int | None = None,
    participant_milestone: int | None = None,
    vote_count: int | None = None,
    vote_milestone: int | None = None,
) -> _CheckpointReasonInsertValue:
    return {
        "conversation_view_snapshot_id": conversation_view_snapshot_id,
        "conversation_id": conversation_id,
        "opinion_group_spec_id": opinion_group_spec_id,
        "reason": reason,
        "group_count": group_count,
        "previous_group_count": previous_group_count,
        "participant_count": participant_count,
        "participant_milestone": participant_milestone,
        "vote_count": vote_count,
        "vote_milestone": vote_milestone,
        "created_at": datetime.now(UTC),
    }


def _format_claims_for_log(claims: list[ClaimedWorkItem]) -> str:
    return ", ".join(
        f"{claim.conversation_slug_id}(id={claim.conversation_id},spec={claim.opinion_group_spec_id},gen={claim.data_generation})"
        for claim in claims
    )


def _format_representative_opinions_for_log(
    representative_opinions: frozenset[RepresentativeOpinionKey],
) -> str:
    limit = 12
    values = sorted(representative_opinions)
    head = values[:limit]
    suffix = "" if len(values) <= limit else f", ... +{len(values) - limit}"
    return (
        ",".join(f"{opinion_id}:{agreement_type}" for opinion_id, agreement_type in head)
        + suffix
    )


def _format_lineage_ids_for_log(lineage_ids: tuple[int, ...]) -> str:
    if not lineage_ids:
        return "none"
    return ",".join(str(lineage_id) for lineage_id in lineage_ids)


def _format_previous_candidate_ids_for_log(previous_groups: list[PreviousLineageGroup]) -> str:
    candidate_ids = sorted(
        {
            previous_group.candidate_id
            for previous_group in previous_groups
            if previous_group.candidate_id is not None
        }
    )
    if not candidate_ids:
        return "none"
    return ",".join(str(candidate_id) for candidate_id in candidate_ids)


def _duplicate_group_opinion_stat_keys(
    values: list[_GroupOpinionStatsInsertValue],
) -> list[tuple[int, int, int]]:
    counts: Counter[tuple[int, int]] = Counter()
    for value in values:
        counts[(value["group_id"], value["analysis_snapshot_opinion_id"])] += 1

    return [
        (group_id, snapshot_opinion_id, count)
        for (group_id, snapshot_opinion_id), count in counts.items()
        if count > 1
    ]


def _invalid_representative_group_opinion_stat_count(
    values: list[_GroupOpinionStatsInsertValue],
) -> int:
    representative_fields = (
        "representative_agreement_type",
        "representative_probability_agreement",
        "representative_number_agreement",
        "raw_repness",
    )
    invalid_count = 0
    for value in values:
        populated_count = sum(value.get(field) is not None for field in representative_fields)
        if populated_count not in (0, len(representative_fields)):
            invalid_count += 1
    return invalid_count


def _group_opinion_stats_insert_value(
    *,
    group_id: int,
    analysis_snapshot_opinion_id: int,
    opinion_stats: ComputedGroupOpinionStats,
) -> _GroupOpinionStatsInsertValue:
    representative = opinion_stats.representative_opinion
    if representative is None:
        without_representative_value: _GroupOpinionStatsInsertWithoutRepresentative = {
            "group_id": group_id,
            "analysis_snapshot_opinion_id": analysis_snapshot_opinion_id,
            "num_agrees": opinion_stats.num_agrees,
            "num_disagrees": opinion_stats.num_disagrees,
            "num_passes": opinion_stats.num_passes,
            "representative_agreement_type": None,
            "representative_probability_agreement": None,
            "representative_number_agreement": None,
            "raw_repness": None,
        }
        return without_representative_value

    with_representative_value: _GroupOpinionStatsInsertWithRepresentative = {
        "group_id": group_id,
        "analysis_snapshot_opinion_id": analysis_snapshot_opinion_id,
        "num_agrees": opinion_stats.num_agrees,
        "num_disagrees": opinion_stats.num_disagrees,
        "num_passes": opinion_stats.num_passes,
        "representative_agreement_type": representative.agreement_type,
        "representative_probability_agreement": representative.probability_agreement,
        "representative_number_agreement": representative.num_agreement,
        "raw_repness": representative.raw_repness,
    }
    return with_representative_value


@dataclass(frozen=True)
class OpinionGroupVariantRecord:
    id: int
    opinion_group_spec_id: int
    group_count: int


@dataclass(frozen=True)
class _CheckpointCandidateOption:
    conversation_id: int
    opinion_group_spec_id: int
    snapshot_id: int
    candidate_id: int
    group_count: int
    selection_score: float | None
    data_generation: int
    created_at: datetime


@dataclass(frozen=True)
class _ArtifactCandidateOption:
    candidate_id: int
    group_count: int
    selection_score: float | None


@dataclass(frozen=True)
class _ConversationViewSnapshotState:
    conversation_content_id: int | None
    ai_labeling_enabled: bool
    is_closed: bool
    preferred_opinion_group_count: int | None


@dataclass(frozen=True)
class _ConversationViewSnapshotCounters:
    opinion_count: int
    total_opinion_count: int
    total_vote_count: int
    total_participant_count: int
    moderated_opinion_count: int
    hidden_opinion_count: int


@dataclass(frozen=True)
class _PreviousSelectedViewSnapshot:
    is_closed: bool
    group_count: int


@dataclass(frozen=True)
class _PersistedConversationViewSnapshot:
    view_snapshot_id: int
    selected_candidate: _CheckpointCandidateOption | None
    conversation_state: _ConversationViewSnapshotState
    opinion_count: int
    vote_count: int
    participant_count: int


@dataclass(frozen=True)
class _ExistingCheckpointReason:
    conversation_view_snapshot_id: int
    conversation_id: int
    opinion_group_spec_id: int
    reason: ConversationViewSnapshotCheckpointReasonEnum
    group_count: int | None
    participant_milestone: int | None
    vote_milestone: int | None


@dataclass(frozen=True)
class CheckpointActivationContext:
    persisted_view_snapshots_by_pair: dict[
        tuple[int, int], _PersistedConversationViewSnapshot
    ]
    current_options_by_pair: dict[tuple[int, int], list[_CheckpointCandidateOption]]


@dataclass(frozen=True)
class OpinionGroupSpecRecord:
    id: int
    min_clusterable_participants: int
    min_votes_per_participant: int
    max_group_count: int


@dataclass(frozen=True)
class OpinionGroupConfigRecord:
    spec: OpinionGroupSpecRecord
    variants: list[OpinionGroupVariantRecord]


@dataclass(frozen=True)
class _NewGroupForLineage:
    conversation_id: int
    conversation_slug_id: str
    candidate_id: int
    opinion_group_variant_id: int
    scope_id: int
    key: str
    representative_opinions: frozenset[RepresentativeOpinionKey]


def claim_work_items_batch(
    engine: Engine,
    *,
    worker_id: str,
    conversation_ids: list[int],
    lease_ttl_seconds: int,
    limit: int,
    analysis_engine_epoch: int,
) -> list[ClaimedWorkItem]:
    with Session(engine) as session:
        claims = _claim_work_items_batch(
            session,
            worker_id=worker_id,
            conversation_ids=conversation_ids,
            lease_ttl_seconds=lease_ttl_seconds,
            limit=limit,
            analysis_engine_epoch=analysis_engine_epoch,
        )
        session.commit()
    return claims


def claim_work_items_and_fetch_inputs_batch(
    engine: Engine,
    *,
    worker_id: str,
    conversation_ids: list[int],
    lease_ttl_seconds: int,
    limit: int,
    analysis_engine_epoch: int,
) -> ClaimedInputBatch:
    with Session(engine) as session:
        session.connection(execution_options={"isolation_level": "REPEATABLE READ"})
        claims = _claim_work_items_batch(
            session,
            worker_id=worker_id,
            conversation_ids=conversation_ids,
            lease_ttl_seconds=lease_ttl_seconds,
            limit=limit,
            analysis_engine_epoch=analysis_engine_epoch,
        )
        rows_by_conversation_id = _fetch_vote_input_rows_batch(
            session,
            conversation_ids=[claim.conversation_id for claim in claims],
        )
        session.commit()

    return ClaimedInputBatch(
        claims=claims,
        rows_by_conversation_id=rows_by_conversation_id,
    )


def _claim_work_items_batch(
    session: Session,
    *,
    worker_id: str,
    conversation_ids: list[int],
    lease_ttl_seconds: int,
    limit: int,
    analysis_engine_epoch: int,
) -> list[ClaimedWorkItem]:
    if not conversation_ids or limit <= 0:
        return []

    conversation_ids_to_claim = list(dict.fromkeys(conversation_ids))[:limit]
    lease_expires_at = datetime.now(UTC) + timedelta(seconds=lease_ttl_seconds)
    running_work_state = aliased(AnalysisWorkState)

    claims: list[ClaimedWorkItem] = []
    for conversation_id in conversation_ids_to_claim:
        running_work_exists = (
            select(running_work_state.id)
            .where(
                and_(
                    running_work_state.conversation_id == AnalysisWorkState.conversation_id,
                    running_work_state.running_data_generation.is_not(None),
                )
            )
            .exists()
        )
        resume_condition = and_(
            AnalysisWorkState.running_data_generation.is_not(None),
            AnalysisWorkState.persisted_analysis_snapshot_id.is_not(None),
            AnalysisWorkState.lease_token.is_(None),
        )
        fresh_condition = and_(
            AnalysisWorkState.running_data_generation.is_(None),
            AnalysisWorkState.persisted_analysis_snapshot_id.is_(None),
            Conversation.analysis_data_generation
            > AnalysisWorkState.last_completed_data_generation,
            ~running_work_exists,
            or_(
                AnalysisWorkState.non_retryable_generation.is_(None),
                Conversation.analysis_data_generation > AnalysisWorkState.non_retryable_generation,
                analysis_engine_epoch
                > func.coalesce(
                    AnalysisWorkState.non_retryable_analysis_engine_epoch,
                    0,
                ),
            ),
        )
        claimable_query = (
            select(AnalysisWorkState, Conversation)
            .join(Conversation, Conversation.id == AnalysisWorkState.conversation_id)
            .where(
                and_(
                    AnalysisWorkState.conversation_id == conversation_id,
                    Conversation.current_content_id.is_not(None),
                    Conversation.conversation_type == ConversationType.polis,
                    or_(
                        AnalysisWorkState.next_run_at.is_(None),
                        AnalysisWorkState.next_run_at <= func.now(),
                    ),
                    or_(resume_condition, fresh_condition),
                )
            )
            .order_by(
                case((resume_condition, 0), else_=1),
                AnalysisWorkState.next_run_at.asc().nulls_first(),
                AnalysisWorkState.id,
            )
            .limit(1)
            .with_for_update(of=AnalysisWorkState, skip_locked=True)
        )
        claimable_row = session.execute(claimable_query).first()
        if claimable_row is None:
            continue

        work_state, conversation = claimable_row
        is_resume_claim = (
            work_state.running_data_generation is not None
            and work_state.persisted_analysis_snapshot_id is not None
        )

        if is_resume_claim:
            data_generation = work_state.running_data_generation
            persisted_analysis_snapshot_id = work_state.persisted_analysis_snapshot_id
            if data_generation is None or persisted_analysis_snapshot_id is None:
                log.warning(
                    "[MathUpdaterDB] Skipping inconsistent persisted resume claim "
                    "work_state_id=%d conversation_id=%d",
                    work_state.id,
                    work_state.conversation_id,
                )
                continue

            lease_token = f"{worker_id}:{uuid.uuid4()}"
            work_state.next_run_at = None
            work_state.lease_owner = worker_id
            work_state.lease_token = lease_token
            work_state.lease_expires_at = lease_expires_at
            work_state.updated_at = datetime.now(UTC)
            session.flush()

            claims.append(
                ClaimedWorkItem(
                    id=work_state.id,
                    conversation_id=work_state.conversation_id,
                    conversation_slug_id=conversation.slug_id,
                    opinion_group_spec_id=work_state.opinion_group_spec_id,
                    data_generation=data_generation,
                    attempt_count=work_state.attempt_count,
                    lease_token=lease_token,
                    persisted_analysis_snapshot_id=persisted_analysis_snapshot_id,
                )
            )
            continue

        data_generation = conversation.analysis_data_generation
        lease_token = f"{worker_id}:{uuid.uuid4()}"
        attempt_count = (
            work_state.attempt_count + 1 if work_state.attempt_generation == data_generation else 1
        )
        work_state.running_data_generation = data_generation
        work_state.persisted_analysis_snapshot_id = None
        work_state.dirty_since = None
        work_state.next_run_at = None
        work_state.attempt_generation = data_generation
        work_state.attempt_count = attempt_count
        work_state.lease_owner = worker_id
        work_state.lease_token = lease_token
        work_state.lease_expires_at = lease_expires_at
        work_state.updated_at = datetime.now(UTC)
        session.flush()

        claims.append(
            ClaimedWorkItem(
                id=work_state.id,
                conversation_id=work_state.conversation_id,
                conversation_slug_id=conversation.slug_id,
                opinion_group_spec_id=work_state.opinion_group_spec_id,
                data_generation=data_generation,
                attempt_count=attempt_count,
                lease_token=lease_token,
                persisted_analysis_snapshot_id=None,
            )
        )

    return claims


def complete_non_processable_work_items_batch(
    engine: Engine,
    *,
    conversation_ids: list[int],
) -> list[int]:
    if not conversation_ids:
        return []

    unique_conversation_ids = sorted(set(conversation_ids))
    current_generation = (
        select(Conversation.analysis_data_generation)
        .where(Conversation.id == AnalysisWorkState.conversation_id)
        .scalar_subquery()
    )
    conversation_current_content_id = (
        select(Conversation.current_content_id)
        .where(Conversation.id == AnalysisWorkState.conversation_id)
        .scalar_subquery()
    )
    conversation_type = (
        select(Conversation.conversation_type)
        .where(Conversation.id == AnalysisWorkState.conversation_id)
        .scalar_subquery()
    )
    query = (
        update(AnalysisWorkState)
        .where(
            and_(
                AnalysisWorkState.conversation_id.in_(unique_conversation_ids),
                AnalysisWorkState.lease_token.is_(None),
                or_(
                    AnalysisWorkState.running_data_generation.is_(None),
                    AnalysisWorkState.persisted_analysis_snapshot_id.is_not(None),
                ),
                or_(
                    conversation_current_content_id.is_(None),
                    conversation_type != ConversationType.polis,
                ),
                or_(
                    current_generation > AnalysisWorkState.last_completed_data_generation,
                    AnalysisWorkState.dirty_since.is_not(None),
                    AnalysisWorkState.next_run_at.is_not(None),
                ),
            )
        )
        .values(
            last_completed_data_generation=func.greatest(
                AnalysisWorkState.last_completed_data_generation,
                func.coalesce(
                    current_generation,
                    AnalysisWorkState.running_data_generation,
                    AnalysisWorkState.last_completed_data_generation,
                ),
            ),
            running_data_generation=None,
            persisted_analysis_snapshot_id=None,
            dirty_since=None,
            next_run_at=None,
            non_retryable_generation=None,
            non_retryable_analysis_engine_epoch=None,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
        .returning(AnalysisWorkState.conversation_id)
    )

    with Session(engine) as session:
        rows = session.execute(query).all()
        session.commit()

    return sorted({row.conversation_id for row in rows})


def extend_postgres_leases(
    engine: Engine,
    *,
    claims: list[ClaimedWorkItem],
    lease_ttl_seconds: int,
) -> int:
    if not claims:
        return 0

    work_state_ids = [claim.id for claim in claims]
    lease_pairs = [(claim.id, claim.lease_token) for claim in claims]
    lease_expires_at = datetime.now(UTC) + timedelta(seconds=lease_ttl_seconds)
    query = (
        update(AnalysisWorkState)
        .where(
            and_(
                AnalysisWorkState.id.in_(work_state_ids),
                tuple_(AnalysisWorkState.id, AnalysisWorkState.lease_token).in_(lease_pairs),
                AnalysisWorkState.running_data_generation.is_not(None),
            )
        )
        .values(lease_expires_at=lease_expires_at, updated_at=func.now())
        .returning(AnalysisWorkState.id)
    )

    with Session(engine) as session:
        rows = session.execute(query).all()
        session.commit()
    return len(rows)


def recover_expired_running_work(engine: Engine) -> list[int]:
    query = (
        update(AnalysisWorkState)
        .where(
            and_(
                AnalysisWorkState.running_data_generation.is_not(None),
                AnalysisWorkState.lease_expires_at < func.now(),
            )
        )
        .values(
            running_data_generation=case(
                (
                    AnalysisWorkState.persisted_analysis_snapshot_id.is_not(None),
                    AnalysisWorkState.running_data_generation,
                ),
                else_=None,
            ),
            next_run_at=func.now(),
            persisted_analysis_snapshot_id=case(
                (
                    AnalysisWorkState.persisted_analysis_snapshot_id.is_not(None),
                    AnalysisWorkState.persisted_analysis_snapshot_id,
                ),
                else_=None,
            ),
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            updated_at=func.now(),
        )
        .returning(AnalysisWorkState.conversation_id)
    )

    with Session(engine) as session:
        rows = session.execute(query).all()
        session.commit()
    return [row.conversation_id for row in rows]


def fetch_due_work_conversation_ids(
    engine: Engine,
    *,
    limit: int,
    analysis_engine_epoch: int,
) -> list[int]:
    current_generation = (
        select(Conversation.analysis_data_generation)
        .where(Conversation.id == AnalysisWorkState.conversation_id)
        .scalar_subquery()
    )
    query = (
        select(AnalysisWorkState.conversation_id)
        .where(
            and_(
                AnalysisWorkState.running_data_generation.is_(None),
                current_generation > AnalysisWorkState.last_completed_data_generation,
                or_(
                    AnalysisWorkState.next_run_at.is_(None),
                    AnalysisWorkState.next_run_at <= func.now(),
                ),
                or_(
                    AnalysisWorkState.non_retryable_generation.is_(None),
                    current_generation > AnalysisWorkState.non_retryable_generation,
                    analysis_engine_epoch
                    > func.coalesce(
                        AnalysisWorkState.non_retryable_analysis_engine_epoch,
                        0,
                    ),
                ),
            )
        )
        .order_by(AnalysisWorkState.next_run_at.asc().nulls_first())
        .limit(limit)
    )

    with Session(engine) as session:
        rows = session.execute(query).all()
    return [row.conversation_id for row in rows]


def fetch_vote_input_rows_batch(
    engine: Engine,
    *,
    conversation_ids: list[int],
) -> dict[int, list[VoteInputRow]]:
    with Session(engine) as session:
        return _fetch_vote_input_rows_batch(
            session,
            conversation_ids=conversation_ids,
        )


def _fetch_vote_input_rows_batch(
    session: Session,
    *,
    conversation_ids: list[int],
) -> dict[int, list[VoteInputRow]]:
    if not conversation_ids:
        return {}

    query = (
        select(
            Opinion.conversation_id,
            Conversation.analysis_data_generation,
            Vote.author_id,
            Opinion.id.label("opinion_id"),
            Opinion.current_content_id.label("opinion_content_id"),
            VoteContent.vote,
        )
        .select_from(Vote)
        .join(VoteContent, VoteContent.id == Vote.current_content_id)
        .join(Opinion, Opinion.id == Vote.opinion_id)
        .join(Conversation, Conversation.id == Opinion.conversation_id)
        .join(User, User.id == Vote.author_id)
        .outerjoin(OpinionModeration, OpinionModeration.opinion_id == Vote.opinion_id)
        .where(
            and_(
                Opinion.conversation_id.in_(conversation_ids),
                User.is_deleted.is_(False),
                OpinionModeration.id.is_(None),
                Vote.current_content_id.is_not(None),
                Opinion.current_content_id.is_not(None),
            )
        )
        .order_by(Opinion.conversation_id, Vote.author_id, Opinion.id)
    )

    rows_by_conversation_id: dict[int, list[VoteInputRow]] = {
        conversation_id: [] for conversation_id in conversation_ids
    }
    rows = session.execute(query).all()

    for row in rows:
        rows_by_conversation_id[row.conversation_id].append(
            VoteInputRow(
                conversation_id=row.conversation_id,
                data_generation=row.analysis_data_generation,
                user_id=row.author_id,
                opinion_id=row.opinion_id,
                opinion_content_id=row.opinion_content_id,
                vote=row.vote.value,
            )
        )

    return rows_by_conversation_id


def upsert_input_snapshots_batch(
    engine: Engine,
    *,
    snapshots: list[PreparedInputSnapshot],
) -> dict[int, StoredInputSnapshot]:
    if not snapshots:
        return {}

    snapshot_keys = [
        (snapshot.conversation_id, snapshot.data_generation, snapshot.input_hash)
        for snapshot in snapshots
    ]
    existing_query = select(
        AnalysisInputSnapshot.id,
        AnalysisInputSnapshot.conversation_id,
        AnalysisInputSnapshot.data_generation,
        AnalysisInputSnapshot.input_hash,
    ).where(
        tuple_(
            AnalysisInputSnapshot.conversation_id,
            AnalysisInputSnapshot.data_generation,
            AnalysisInputSnapshot.input_hash,
        ).in_(snapshot_keys)
    )

    with Session(engine) as session:
        existing_rows = session.execute(existing_query).all()
        existing_by_key = {
            (row.conversation_id, row.data_generation, row.input_hash): StoredInputSnapshot(
                id=row.id,
                conversation_id=row.conversation_id,
                data_generation=row.data_generation,
                input_hash=row.input_hash,
            )
            for row in existing_rows
        }

        snapshots_to_insert = [
            snapshot
            for snapshot in snapshots
            if (snapshot.conversation_id, snapshot.data_generation, snapshot.input_hash)
            not in existing_by_key
        ]

        inserted_by_key: dict[tuple[int, int, str], StoredInputSnapshot] = {}
        if snapshots_to_insert:
            insert_query = (
                sqlalchemy_insert(AnalysisInputSnapshot)
                .values(
                    [
                        {
                            "conversation_id": snapshot.conversation_id,
                            "data_generation": snapshot.data_generation,
                            "input_hash": snapshot.input_hash,
                            "opinion_count": len(snapshot.opinions),
                            "participant_count": len(snapshot.participants),
                            "vote_count": len(snapshot.votes),
                            "compression": AnalysisCompressionEnum.zstd,
                            "payload": snapshot.payload,
                        }
                        for snapshot in snapshots_to_insert
                    ]
                )
                .returning(
                    AnalysisInputSnapshot.id,
                    AnalysisInputSnapshot.conversation_id,
                    AnalysisInputSnapshot.data_generation,
                    AnalysisInputSnapshot.input_hash,
                )
            )
            inserted_rows = session.execute(insert_query).all()
            inserted_by_key = {
                (row.conversation_id, row.data_generation, row.input_hash): StoredInputSnapshot(
                    id=row.id,
                    conversation_id=row.conversation_id,
                    data_generation=row.data_generation,
                    input_hash=row.input_hash,
                )
                for row in inserted_rows
            }

        session.commit()

    stored_by_conversation_id: dict[int, StoredInputSnapshot] = {}
    for snapshot in snapshots:
        key = (snapshot.conversation_id, snapshot.data_generation, snapshot.input_hash)
        stored = existing_by_key.get(key) or inserted_by_key[key]
        stored_by_conversation_id[snapshot.conversation_id] = stored

    return stored_by_conversation_id


def fetch_variants_by_spec_ids(
    session: Session,
    *,
    opinion_group_spec_ids: list[int],
) -> dict[int, list[OpinionGroupVariantRecord]]:
    if not opinion_group_spec_ids:
        return {}

    query = (
        select(
            OpinionGroupVariant.id,
            OpinionGroupVariant.opinion_group_spec_id,
            OpinionGroupVariant.group_count,
        )
        .where(OpinionGroupVariant.opinion_group_spec_id.in_(opinion_group_spec_ids))
        .order_by(OpinionGroupVariant.opinion_group_spec_id, OpinionGroupVariant.group_count)
    )
    rows = session.execute(query).all()
    variants_by_spec_id: dict[int, list[OpinionGroupVariantRecord]] = {
        spec_id: [] for spec_id in opinion_group_spec_ids
    }
    for row in rows:
        variants_by_spec_id[row.opinion_group_spec_id].append(
            OpinionGroupVariantRecord(
                id=row.id,
                opinion_group_spec_id=row.opinion_group_spec_id,
                group_count=row.group_count,
            )
        )
    return variants_by_spec_id


def fetch_opinion_group_configs(
    engine: Engine,
    *,
    opinion_group_spec_ids: list[int],
) -> dict[int, OpinionGroupConfigRecord]:
    if not opinion_group_spec_ids:
        return {}

    unique_spec_ids = sorted(set(opinion_group_spec_ids))
    spec_query = select(
        OpinionGroupSpec.id,
        OpinionGroupSpec.min_clusterable_participants,
        OpinionGroupSpec.min_votes_per_participant,
        OpinionGroupSpec.max_group_count,
    ).where(OpinionGroupSpec.id.in_(unique_spec_ids))

    with Session(engine) as session:
        spec_rows = session.execute(spec_query).all()
        specs_by_id = {
            row.id: OpinionGroupSpecRecord(
                id=row.id,
                min_clusterable_participants=row.min_clusterable_participants,
                min_votes_per_participant=row.min_votes_per_participant,
                max_group_count=row.max_group_count,
            )
            for row in spec_rows
        }
        variants_by_spec_id = fetch_variants_by_spec_ids(
            session,
            opinion_group_spec_ids=unique_spec_ids,
        )

    missing_spec_ids = [spec_id for spec_id in unique_spec_ids if spec_id not in specs_by_id]
    if missing_spec_ids:
        msg = f"missing opinion-group specs {missing_spec_ids}"
        raise ValueError(msg)

    return {
        spec_id: OpinionGroupConfigRecord(
            spec=specs_by_id[spec_id],
            variants=variants_by_spec_id.get(spec_id, []),
        )
        for spec_id in unique_spec_ids
    }


def _get_or_create_lineage_scopes(
    session: Session,
    *,
    conversation_variant_pairs: list[tuple[int, int]],
) -> dict[tuple[int, int], int]:
    if not conversation_variant_pairs:
        return {}

    unique_pairs = sorted(set(conversation_variant_pairs))
    existing_query = select(
        OpinionGroupLineageScope.id,
        OpinionGroupLineageScope.conversation_id,
        OpinionGroupLineageScope.opinion_group_variant_id,
    ).where(
        tuple_(
            OpinionGroupLineageScope.conversation_id,
            OpinionGroupLineageScope.opinion_group_variant_id,
        ).in_(unique_pairs)
    )
    existing_rows = session.execute(existing_query).all()
    scope_id_by_pair = {
        (row.conversation_id, row.opinion_group_variant_id): row.id for row in existing_rows
    }

    missing_pairs = [pair for pair in unique_pairs if pair not in scope_id_by_pair]
    if missing_pairs:
        insert_query = (
            sqlalchemy_insert(OpinionGroupLineageScope)
            .values(
                [
                    {
                        "conversation_id": conversation_id,
                        "opinion_group_variant_id": variant_id,
                    }
                    for conversation_id, variant_id in missing_pairs
                ]
            )
            .returning(
                OpinionGroupLineageScope.id,
                OpinionGroupLineageScope.conversation_id,
                OpinionGroupLineageScope.opinion_group_variant_id,
            )
        )
        inserted_rows = session.execute(insert_query).all()
        for row in inserted_rows:
            scope_id_by_pair[(row.conversation_id, row.opinion_group_variant_id)] = row.id

    return scope_id_by_pair


def _assign_lineages_for_groups(
    session: Session,
    *,
    claims: list[ClaimedWorkItem],
    bundles_by_conversation_id: dict[int, ComputedAnalysisBundle],
    prepared_input_snapshots_by_conversation_id: dict[int, PreparedInputSnapshot],
    candidate_id_by_conversation_variant: dict[tuple[int, int], int],
    scope_id_by_pair: dict[tuple[int, int], int],
) -> dict[tuple[int, str], int]:
    new_groups_by_scope: dict[int, list[_NewGroupForLineage]] = {}
    for claim in claims:
        snapshot = prepared_input_snapshots_by_conversation_id[claim.conversation_id]
        opinion_id_by_local_index = {
            opinion.local_opinion_index: opinion.opinion_id for opinion in snapshot.opinions
        }
        bundle = bundles_by_conversation_id[claim.conversation_id]
        for candidate in bundle.candidates:
            candidate_id = candidate_id_by_conversation_variant[
                (claim.conversation_id, candidate.opinion_group_variant_id)
            ]
            if candidate.outcome != AnalysisResultOutcomeEnum.success:
                log.info(
                    "[MathUpdaterDB] Skipping lineage assignment reason=non_success_candidate "
                    "conversationId=%d conversationSlugId=%s candidateId=%d variantId=%d "
                    "outcome=%s outcomeReason=%s",
                    claim.conversation_id,
                    claim.conversation_slug_id,
                    candidate_id,
                    candidate.opinion_group_variant_id,
                    candidate.outcome,
                    candidate.outcome_reason,
                )
                continue
            if candidate.assessment is not None and candidate.assessment.hidden_reason is not None:
                log.info(
                    "[MathUpdaterDB] Skipping lineage assignment reason=hidden_candidate "
                    "conversationId=%d conversationSlugId=%s candidateId=%d variantId=%d "
                    "hiddenReason=%s groupCount=%d",
                    claim.conversation_id,
                    claim.conversation_slug_id,
                    candidate_id,
                    candidate.opinion_group_variant_id,
                    candidate.assessment.hidden_reason,
                    len(candidate.groups),
                )
                continue
            scope_id = scope_id_by_pair[(claim.conversation_id, candidate.opinion_group_variant_id)]
            for group in candidate.groups:
                new_groups_by_scope.setdefault(scope_id, []).append(
                    _NewGroupForLineage(
                        conversation_id=claim.conversation_id,
                        conversation_slug_id=claim.conversation_slug_id,
                        candidate_id=candidate_id,
                        opinion_group_variant_id=candidate.opinion_group_variant_id,
                        scope_id=scope_id,
                        key=group.key,
                        representative_opinions=_representative_opinion_keys(
                            group=group,
                            opinion_id_by_local_index=opinion_id_by_local_index,
                        ),
                    )
                )

    previous_groups_by_scope = _fetch_latest_lineage_groups_by_scope(
        session,
        scope_ids=list(new_groups_by_scope),
    )
    lineage_id_by_candidate_group_key: dict[tuple[int, str], int] = {}
    for scope_id, new_groups in new_groups_by_scope.items():
        previous_groups = previous_groups_by_scope.get(scope_id, [])
        lineage_match_groups = [
            NewLineageGroup(
                key=_lineage_match_key(group),
                representative_opinions=group.representative_opinions,
            )
            for group in new_groups
        ]
        lineage_id_by_match_key = match_lineages_by_representative_opinions(
            new_groups=lineage_match_groups,
            previous_groups=previous_groups,
        )
        exact_match_lineage_ids_by_key = {
            group.key: tuple(
                sorted(
                    exact_matching_lineage_ids(
                        new_group=group,
                        previous_groups=previous_groups,
                    )
                )
            )
            for group in lineage_match_groups
        }
        unmatched_groups = [
            group
            for group in new_groups
            if _lineage_match_key(group) not in lineage_id_by_match_key
        ]
        log.info(
            "[MathUpdaterDB] Lineage scope decision summary scopeId=%d newGroups=%d "
            "previousGroups=%d previousCandidateIds=%s reused=%d created=%d",
            scope_id,
            len(new_groups),
            len(previous_groups),
            _format_previous_candidate_ids_for_log(previous_groups),
            len(lineage_id_by_match_key),
            len(unmatched_groups),
        )
        new_lineage_ids = _create_lineages(
            session,
            scope_id=scope_id,
            count=len(unmatched_groups),
        )
        lineage_id_by_unmatched_key = {
            _lineage_match_key(group): lineage_id
            for group, lineage_id in zip(unmatched_groups, new_lineage_ids, strict=True)
        }
        for group in new_groups:
            match_key = _lineage_match_key(group)
            exact_match_lineage_ids = exact_match_lineage_ids_by_key[match_key]
            _raise_for_invalid_lineage_match_state(
                group=group,
                exact_match_lineage_ids=exact_match_lineage_ids,
            )
            reused_lineage_id = lineage_id_by_match_key.get(match_key)
            if reused_lineage_id is not None:
                action: _LineageDecisionAction = "reuse"
                lineage_id = reused_lineage_id
            elif match_key in lineage_id_by_unmatched_key:
                if exact_match_lineage_ids:
                    msg = (
                        "lineage exact representative-opinion match was not reused; "
                        "another current group likely claimed the same prior lineage "
                        f"conversationSlugId={group.conversation_slug_id} "
                        f"scopeId={group.scope_id} candidateId={group.candidate_id} "
                        f"variantId={group.opinion_group_variant_id} groupKey={group.key} "
                        "exactMatchLineageIds="
                        f"{_format_lineage_ids_for_log(exact_match_lineage_ids)} "
                        "representativeOpinions="
                        f"{_format_representative_opinions_for_log(group.representative_opinions)}"
                    )
                    raise LineageAssignmentInvariantError(msg)
                action = "create"
                lineage_id = lineage_id_by_unmatched_key[match_key]
            else:
                msg = f"missing lineage assignment for candidate group {match_key}"
                raise RuntimeError(msg)
            lineage_id_by_candidate_group_key[(group.candidate_id, group.key)] = lineage_id
            _log_lineage_assignment_decision(
                group=group,
                action=action,
                reason=_lineage_decision_reason(
                    action=action,
                    group=group,
                    previous_groups=previous_groups,
                    exact_match_lineage_ids=exact_match_lineage_ids,
                ),
                lineage_id=lineage_id,
                previous_groups=previous_groups,
                exact_match_lineage_ids=exact_match_lineage_ids,
            )

    return lineage_id_by_candidate_group_key


def _raise_for_invalid_lineage_match_state(
    *,
    group: _NewGroupForLineage,
    exact_match_lineage_ids: tuple[int, ...],
) -> None:
    if not group.representative_opinions:
        msg = (
            "lineage assignment received a visible successful group without representative "
            f"opinions conversationSlugId={group.conversation_slug_id} "
            f"scopeId={group.scope_id} candidateId={group.candidate_id} "
            f"variantId={group.opinion_group_variant_id} groupKey={group.key}"
        )
        raise LineageAssignmentInvariantError(msg)
    if len(exact_match_lineage_ids) <= 1:
        return
    msg = (
        "lineage assignment found multiple previous lineages with the same exact "
        "representative-opinion set "
        f"conversationSlugId={group.conversation_slug_id} scopeId={group.scope_id} "
        f"candidateId={group.candidate_id} variantId={group.opinion_group_variant_id} "
        f"groupKey={group.key} "
        f"exactMatchLineageIds={_format_lineage_ids_for_log(exact_match_lineage_ids)} "
        f"representativeOpinions={_format_representative_opinions_for_log(group.representative_opinions)}"
    )
    raise LineageAssignmentInvariantError(msg)


def _log_lineage_assignment_decision(
    *,
    group: _NewGroupForLineage,
    action: _LineageDecisionAction,
    reason: _LineageDecisionReason,
    lineage_id: int,
    previous_groups: list[PreviousLineageGroup],
    exact_match_lineage_ids: tuple[int, ...],
) -> None:
    log.info(
        "[MathUpdaterDB] Lineage decision action=%s reason=%s conversationId=%d "
        "conversationSlugId=%s scopeId=%d candidateId=%d variantId=%d groupKey=%s "
        "lineageId=%d representativeOpinionCount=%d representativeOpinions=%s "
        "previousGroupCount=%d previousCandidateIds=%s exactMatchLineageIds=%s",
        action,
        reason,
        group.conversation_id,
        group.conversation_slug_id,
        group.scope_id,
        group.candidate_id,
        group.opinion_group_variant_id,
        group.key,
        lineage_id,
        len(group.representative_opinions),
        _format_representative_opinions_for_log(group.representative_opinions),
        len(previous_groups),
        _format_previous_candidate_ids_for_log(previous_groups),
        _format_lineage_ids_for_log(exact_match_lineage_ids),
    )


def _lineage_decision_reason(
    *,
    action: _LineageDecisionAction,
    group: _NewGroupForLineage,
    previous_groups: list[PreviousLineageGroup],
    exact_match_lineage_ids: tuple[int, ...],
) -> _LineageDecisionReason:
    if action == "reuse":
        return "exact_representative_opinion_match"
    if not previous_groups:
        return "no_previous_lineage_groups"
    if exact_match_lineage_ids:
        msg = (
            "lineage create decision received an exact representative-opinion match "
            f"conversationSlugId={group.conversation_slug_id} scopeId={group.scope_id} "
            f"candidateId={group.candidate_id} variantId={group.opinion_group_variant_id} "
            f"groupKey={group.key} "
            f"exactMatchLineageIds={_format_lineage_ids_for_log(exact_match_lineage_ids)}"
        )
        raise LineageAssignmentInvariantError(msg)
    return "no_exact_representative_opinion_match"


def _representative_opinion_keys(
    *,
    group: ComputedOpinionGroup,
    opinion_id_by_local_index: dict[int, int],
) -> frozenset[RepresentativeOpinionKey]:
    return frozenset(
        (
            opinion_id_by_local_index[representative.local_opinion_index],
            representative.agreement_type.value,
        )
        for representative in group.representative_opinions
        if representative.local_opinion_index in opinion_id_by_local_index
    )


def _lineage_match_key(group: _NewGroupForLineage) -> str:
    return f"{group.candidate_id}:{group.key}"


def _create_lineages(
    session: Session,
    *,
    scope_id: int,
    count: int,
) -> list[int]:
    if count == 0:
        return []
    insert_query = (
        sqlalchemy_insert(OpinionGroupLineage)
        .values([{"scope_id": scope_id} for _index in range(count)])
        .returning(OpinionGroupLineage.id)
    )
    return [row.id for row in session.execute(insert_query).all()]


def _fetch_latest_lineage_groups_by_scope(
    session: Session,
    *,
    scope_ids: list[int],
) -> dict[int, list[PreviousLineageGroup]]:
    if not scope_ids:
        return {}

    latest_candidate = (
        select(
            OpinionGroup.scope_id.label("scope_id"),
            func.max(OpinionGroup.candidate_id).label("candidate_id"),
        )
        .where(
            and_(
                OpinionGroup.scope_id.in_(scope_ids),
                OpinionGroup.lineage_id.is_not(None),
            )
        )
        .group_by(OpinionGroup.scope_id)
        .subquery()
    )
    lineage_rows = session.execute(
        select(
            OpinionGroup.scope_id,
            OpinionGroup.candidate_id,
            OpinionGroup.lineage_id,
            AnalysisSnapshotOpinion.opinion_id,
            OpinionGroupOpinionStats.representative_agreement_type,
        )
        .join(
            latest_candidate,
            and_(
                OpinionGroup.scope_id == latest_candidate.c.scope_id,
                OpinionGroup.candidate_id == latest_candidate.c.candidate_id,
            ),
        )
        .join(
            OpinionGroupOpinionStats,
            OpinionGroupOpinionStats.group_id == OpinionGroup.id,
        )
        .join(
            AnalysisSnapshotOpinion,
            AnalysisSnapshotOpinion.id == OpinionGroupOpinionStats.analysis_snapshot_opinion_id,
        )
        .where(
            and_(
                OpinionGroup.lineage_id.is_not(None),
                OpinionGroupOpinionStats.representative_agreement_type.is_not(None),
            )
        )
    ).all()

    keys_by_scope_lineage: dict[tuple[int, int], set[RepresentativeOpinionKey]] = {}
    candidate_id_by_scope_lineage: dict[tuple[int, int], int] = {}
    for row in lineage_rows:
        if row.lineage_id is None or row.representative_agreement_type is None:
            continue
        scope_lineage_key = (row.scope_id, row.lineage_id)
        keys_by_scope_lineage.setdefault(scope_lineage_key, set()).add(
            (row.opinion_id, row.representative_agreement_type.value)
        )
        candidate_id_by_scope_lineage[scope_lineage_key] = row.candidate_id

    previous_groups_by_scope: dict[int, list[PreviousLineageGroup]] = {}
    for (scope_id, lineage_id), representative_opinions in keys_by_scope_lineage.items():
        previous_groups_by_scope.setdefault(scope_id, []).append(
            PreviousLineageGroup(
                lineage_id=lineage_id,
                representative_opinions=frozenset(representative_opinions),
                candidate_id=candidate_id_by_scope_lineage[(scope_id, lineage_id)],
            )
        )
    return previous_groups_by_scope


def _is_visible_success_candidate(candidate: ComputedOpinionGroupCandidate) -> bool:
    if candidate.outcome != AnalysisResultOutcomeEnum.success:
        return False
    return candidate.assessment is None or candidate.assessment.hidden_reason is None


def _checkpoint_milestones_at_or_below(*, count: int, seeds: tuple[int, ...]) -> list[int]:
    milestones = {seed for seed in seeds if seed <= count}
    base = 10
    while base <= count:
        for numerator, denominator in MILESTONE_MULTIPLIERS:
            milestone = (base * numerator) // denominator
            if milestone <= count:
                milestones.add(milestone)
        base *= 10

    return sorted(milestones)


def _select_checkpoint_candidate(
    candidates: list[_CheckpointCandidateOption],
) -> _CheckpointCandidateOption | None:
    if not candidates:
        return None

    return max(
        candidates,
        key=lambda candidate: (
            candidate.selection_score if candidate.selection_score is not None else float("-inf"),
            candidate.group_count,
        ),
    )


def _select_artifact_candidate(
    candidates: list[_ArtifactCandidateOption],
) -> _ArtifactCandidateOption | None:
    if not candidates:
        return None

    return max(
        candidates,
        key=lambda candidate: (
            candidate.selection_score if candidate.selection_score is not None else float("-inf"),
            candidate.group_count,
        ),
    )


def _fetch_premium_analysis_conversation_ids(
    session: Session,
    *,
    conversation_ids: list[int],
    now: datetime,
) -> set[int]:
    if not conversation_ids:
        return set()

    conversation_rows = session.execute(
        select(Conversation.id, Conversation.author_id, Conversation.organization_id).where(
            Conversation.id.in_(sorted(set(conversation_ids)))
        )
    ).all()
    if not conversation_rows:
        return set()

    author_ids = sorted({row.author_id for row in conversation_rows})
    organization_ids = sorted(
        {row.organization_id for row in conversation_rows if row.organization_id is not None}
    )
    author_entitlement_filter: ColumnElement[bool] | None = None
    if author_ids:
        author_entitlement_filter = and_(
            PremiumFeatureEntitlement.user_id.in_(author_ids),
            PremiumFeatureEntitlement.organization_id.is_(None),
        )
    organization_entitlement_filter: ColumnElement[bool] | None = None
    if organization_ids:
        organization_entitlement_filter = and_(
            PremiumFeatureEntitlement.organization_id.in_(organization_ids),
            PremiumFeatureEntitlement.user_id.is_(None),
        )

    subject_entitlement_filter: ColumnElement[bool] | None
    if author_entitlement_filter is not None and organization_entitlement_filter is not None:
        subject_entitlement_filter = or_(
            author_entitlement_filter,
            organization_entitlement_filter,
        )
    elif author_entitlement_filter is not None:
        subject_entitlement_filter = author_entitlement_filter
    else:
        subject_entitlement_filter = organization_entitlement_filter

    if subject_entitlement_filter is None:
        return set()

    entitlement_rows = session.execute(
        select(
            PremiumFeatureEntitlement.user_id,
            PremiumFeatureEntitlement.organization_id,
        ).where(
            and_(
                PremiumFeatureEntitlement.feature == PREMIUM_ANALYSIS_FEATURE,
                PremiumFeatureEntitlement.starts_at <= now,
                PremiumFeatureEntitlement.revoked_at.is_(None),
                or_(
                    PremiumFeatureEntitlement.expires_at.is_(None),
                    PremiumFeatureEntitlement.expires_at > now,
                ),
                subject_entitlement_filter,
            )
        )
    ).all()
    active_author_ids = {row.user_id for row in entitlement_rows if row.user_id is not None}
    active_organization_ids = {
        row.organization_id for row in entitlement_rows if row.organization_id is not None
    }

    return {
        row.id
        for row in conversation_rows
        if row.author_id in active_author_ids
        or (row.organization_id is not None and row.organization_id in active_organization_ids)
    }


def artifact_candidate_ids_by_pair(
    *,
    claims: list[ClaimedWorkItem],
    bundles_by_conversation_id: dict[int, ComputedAnalysisBundle],
    candidate_id_by_conversation_variant: dict[tuple[int, int], int],
    premium_analysis_conversation_ids: set[int],
) -> dict[tuple[int, int], set[int]]:
    candidate_ids_by_pair: dict[tuple[int, int], set[int]] = {}

    for claim in claims:
        pair = (claim.conversation_id, claim.opinion_group_spec_id)
        bundle = bundles_by_conversation_id[claim.conversation_id]
        visible_candidates: list[_ArtifactCandidateOption] = []
        for candidate in bundle.candidates:
            if not _is_visible_success_candidate(candidate):
                continue
            visible_candidates.append(
                _ArtifactCandidateOption(
                    candidate_id=candidate_id_by_conversation_variant[
                        (claim.conversation_id, candidate.opinion_group_variant_id)
                    ],
                    group_count=candidate.group_count,
                    selection_score=None
                    if candidate.assessment is None
                    else candidate.assessment.selection_score,
                )
            )

        if claim.conversation_id in premium_analysis_conversation_ids:
            candidate_ids_by_pair[pair] = {
                candidate.candidate_id for candidate in visible_candidates
            }
            continue

        selected_candidate = _select_artifact_candidate(visible_candidates)
        if selected_candidate is None:
            candidate_ids_by_pair[pair] = set()
            continue

        candidate_ids_by_pair[pair] = {selected_candidate.candidate_id}

    return candidate_ids_by_pair


def _current_checkpoint_candidate_options_by_pair(
    *,
    claims: list[ClaimedWorkItem],
    snapshot_id_by_conversation_id: dict[int, int],
    candidate_id_by_conversation_variant: dict[tuple[int, int], int],
    bundles_by_conversation_id: dict[int, ComputedAnalysisBundle],
    computed_at: datetime,
) -> dict[tuple[int, int], list[_CheckpointCandidateOption]]:
    options_by_pair: dict[tuple[int, int], list[_CheckpointCandidateOption]] = {}
    for claim in claims:
        snapshot_id = snapshot_id_by_conversation_id[claim.conversation_id]
        bundle = bundles_by_conversation_id[claim.conversation_id]
        for candidate in bundle.candidates:
            if not _is_visible_success_candidate(candidate):
                continue
            candidate_id = candidate_id_by_conversation_variant[
                (claim.conversation_id, candidate.opinion_group_variant_id)
            ]
            pair = (claim.conversation_id, claim.opinion_group_spec_id)
            options_by_pair.setdefault(pair, []).append(
                _CheckpointCandidateOption(
                    conversation_id=claim.conversation_id,
                    opinion_group_spec_id=claim.opinion_group_spec_id,
                    snapshot_id=snapshot_id,
                    candidate_id=candidate_id,
                    group_count=candidate.group_count,
                    selection_score=None
                    if candidate.assessment is None
                    else candidate.assessment.selection_score,
                    data_generation=claim.data_generation,
                    created_at=computed_at,
                )
            )

    return options_by_pair


def _fetch_conversation_view_snapshot_state_by_id(
    session: Session,
    *,
    conversation_ids: list[int],
) -> dict[int, _ConversationViewSnapshotState]:
    if not conversation_ids:
        return {}

    rows = session.execute(
        select(
            Conversation.id,
            Conversation.current_content_id,
            Conversation.ai_labeling_enabled,
            Conversation.is_closed,
            Conversation.preferred_opinion_group_count,
        ).where(Conversation.id.in_(sorted(set(conversation_ids))))
    ).all()
    return {
        row.id: _ConversationViewSnapshotState(
            conversation_content_id=row.current_content_id,
            ai_labeling_enabled=row.ai_labeling_enabled,
            is_closed=row.is_closed,
            preferred_opinion_group_count=row.preferred_opinion_group_count,
        )
        for row in rows
    }


def _fetch_conversation_view_snapshot_counters_by_id(
    session: Session,
    *,
    conversation_ids: list[int],
) -> dict[int, _ConversationViewSnapshotCounters]:
    if not conversation_ids:
        return {}

    unique_conversation_ids = sorted(set(conversation_ids))
    counter_values_by_conversation_id: dict[int, dict[str, int]] = {
        conversation_id: {
            "opinion_count": 0,
            "total_opinion_count": 0,
            "total_vote_count": 0,
            "total_participant_count": 0,
            "moderated_opinion_count": 0,
            "hidden_opinion_count": 0,
        }
        for conversation_id in unique_conversation_ids
    }

    opinion_rows = session.execute(
        select(
            Opinion.conversation_id,
            func.count().filter(OpinionModeration.id.is_(None)).label("opinion_count"),
            func.count().label("total_opinion_count"),
            func.count()
            .filter(OpinionModeration.moderation_action == OpinionModerationAction.move)
            .label("moderated_opinion_count"),
            func.count()
            .filter(OpinionModeration.moderation_action == OpinionModerationAction.hide)
            .label("hidden_opinion_count"),
        )
        .select_from(Opinion)
        .join(User, User.id == Opinion.author_id)
        .outerjoin(OpinionModeration, OpinionModeration.opinion_id == Opinion.id)
        .where(
            and_(
                Opinion.conversation_id.in_(unique_conversation_ids),
                Opinion.current_content_id.is_not(None),
                User.is_deleted.is_(False),
            )
        )
        .group_by(Opinion.conversation_id)
    ).all()
    for row in opinion_rows:
        values = counter_values_by_conversation_id[row.conversation_id]
        values["opinion_count"] = int(row.opinion_count)
        values["total_opinion_count"] = int(row.total_opinion_count)
        values["moderated_opinion_count"] = int(row.moderated_opinion_count)
        values["hidden_opinion_count"] = int(row.hidden_opinion_count)

    vote_rows = session.execute(
        select(
            Opinion.conversation_id,
            func.count().label("total_vote_count"),
            func.count(func.distinct(Vote.author_id)).label("total_participant_count"),
        )
        .select_from(Vote)
        .join(Opinion, Opinion.id == Vote.opinion_id)
        .join(User, User.id == Vote.author_id)
        .where(
            and_(
                Opinion.conversation_id.in_(unique_conversation_ids),
                Opinion.current_content_id.is_not(None),
                Vote.current_content_id.is_not(None),
                User.is_deleted.is_(False),
            )
        )
        .group_by(Opinion.conversation_id)
    ).all()
    for row in vote_rows:
        values = counter_values_by_conversation_id[row.conversation_id]
        values["total_vote_count"] = int(row.total_vote_count)
        values["total_participant_count"] = int(row.total_participant_count)

    return {
        conversation_id: _ConversationViewSnapshotCounters(
            opinion_count=values["opinion_count"],
            total_opinion_count=values["total_opinion_count"],
            total_vote_count=values["total_vote_count"],
            total_participant_count=values["total_participant_count"],
            moderated_opinion_count=values["moderated_opinion_count"],
            hidden_opinion_count=values["hidden_opinion_count"],
        )
        for conversation_id, values in counter_values_by_conversation_id.items()
    }


def _fetch_previous_selected_view_snapshots_by_pair(
    session: Session,
    *,
    pairs: list[tuple[int, int]],
    current_view_snapshot_ids: list[int],
    checkpoint_only: bool = False,
) -> dict[tuple[int, int], _PreviousSelectedViewSnapshot]:
    if not pairs:
        return {}

    conditions = [
        tuple_(
            ConversationViewSnapshot.conversation_id,
            ConversationViewSnapshot.opinion_group_spec_id,
        ).in_(pairs),
        ConversationViewSnapshot.id.not_in(current_view_snapshot_ids),
        ConversationViewSnapshot.activated_at.is_not(None),
        AnalysisSnapshotResult.outcome == AnalysisResultOutcomeEnum.success,
        OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
        OpinionGroupCandidateAssessment.hidden_reason.is_(None),
    ]
    if checkpoint_only:
        conditions.append(
            select(ConversationViewSnapshotCheckpointReason.id)
            .where(
                ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id
                == ConversationViewSnapshot.id
            )
            .exists()
        )

    rows = session.execute(
        select(
            ConversationViewSnapshot.id,
            ConversationViewSnapshot.conversation_id,
            ConversationViewSnapshot.opinion_group_spec_id,
            ConversationViewSnapshot.analysis_snapshot_id,
            ConversationViewSnapshot.is_closed,
            ConversationViewSnapshot.created_at,
            OpinionGroupCandidate.id.label("candidate_id"),
            OpinionGroupVariant.group_count,
            OpinionGroupCandidateAssessment.selection_score,
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
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(*conditions)
        )
    ).all()

    latest_key_by_pair: dict[tuple[int, int], tuple[datetime, int]] = {}
    options_by_pair_view: dict[tuple[int, int, int], list[_CheckpointCandidateOption]] = {}
    is_closed_by_pair_view: dict[tuple[int, int, int], bool] = {}
    for row in rows:
        pair = (row.conversation_id, row.opinion_group_spec_id)
        view_key = (row.conversation_id, row.opinion_group_spec_id, row.id)
        latest_key = latest_key_by_pair.get(pair)
        next_latest_key = (row.created_at, row.id)
        if latest_key is None or next_latest_key > latest_key:
            latest_key_by_pair[pair] = next_latest_key
        is_closed_by_pair_view[view_key] = row.is_closed
        options_by_pair_view.setdefault(view_key, []).append(
            _CheckpointCandidateOption(
                conversation_id=row.conversation_id,
                opinion_group_spec_id=row.opinion_group_spec_id,
                snapshot_id=row.analysis_snapshot_id,
                candidate_id=row.candidate_id,
                group_count=row.group_count,
                selection_score=row.selection_score,
                data_generation=0,
                created_at=row.created_at,
            )
        )

    previous_by_pair: dict[tuple[int, int], _PreviousSelectedViewSnapshot] = {}
    for pair, (_created_at, view_snapshot_id) in latest_key_by_pair.items():
        view_key = (pair[0], pair[1], view_snapshot_id)
        selected = _select_checkpoint_candidate(options_by_pair_view.get(view_key, []))
        if selected is None:
            continue
        previous_by_pair[pair] = _PreviousSelectedViewSnapshot(
            is_closed=is_closed_by_pair_view[view_key],
            group_count=selected.group_count,
        )

    return previous_by_pair


def _persist_conversation_view_snapshots(
    session: Session,
    *,
    claims: list[ClaimedWorkItem],
    snapshot_id_by_conversation_id: dict[int, int],
    prepared_input_snapshots_by_conversation_id: dict[int, PreparedInputSnapshot],
    bundles_by_conversation_id: dict[int, ComputedAnalysisBundle],
    candidate_id_by_conversation_variant: dict[tuple[int, int], int],
    survey_aggregate_snapshot_id_by_conversation_id: dict[int, int],
    premium_analysis_conversation_ids: set[int],
    ai_generation_expected: bool,
) -> tuple[
    dict[tuple[int, int], _PersistedConversationViewSnapshot],
    dict[tuple[int, int], list[_CheckpointCandidateOption]],
]:
    displayable_options_by_pair = _current_checkpoint_candidate_options_by_pair(
        claims=claims,
        snapshot_id_by_conversation_id=snapshot_id_by_conversation_id,
        candidate_id_by_conversation_variant=candidate_id_by_conversation_variant,
        bundles_by_conversation_id=bundles_by_conversation_id,
        computed_at=datetime.now(UTC),
    )
    pairs = [
        (claim.conversation_id, claim.opinion_group_spec_id)
        for claim in claims
        if claim.conversation_id in snapshot_id_by_conversation_id
    ]
    if not pairs:
        return {}, {}

    state_by_conversation_id = _fetch_conversation_view_snapshot_state_by_id(
        session,
        conversation_ids=[claim.conversation_id for claim in claims],
    )
    counters_by_conversation_id = _fetch_conversation_view_snapshot_counters_by_id(
        session,
        conversation_ids=[claim.conversation_id for claim in claims],
    )
    # The view snapshot is the consistency boundary for counts and analysis.
    # A selected candidate only controls display/checkpoint/AI-label side effects.
    selected_by_pair: dict[tuple[int, int], _CheckpointCandidateOption | None] = {}
    for pair in pairs:
        options = displayable_options_by_pair.get(pair, [])
        selected = _select_checkpoint_candidate(options)
        selected_by_pair[pair] = selected

    view_snapshot_values: list[dict[str, object]] = []
    for pair, selected in selected_by_pair.items():
        conversation_id, opinion_group_spec_id = pair
        state = state_by_conversation_id[conversation_id]
        counters = counters_by_conversation_id[conversation_id]
        input_snapshot = prepared_input_snapshots_by_conversation_id[conversation_id]
        view_snapshot_values.append(
            {
                "conversation_id": conversation_id,
                "opinion_group_spec_id": opinion_group_spec_id,
                "analysis_snapshot_id": snapshot_id_by_conversation_id[conversation_id],
                "survey_aggregate_snapshot_id": (
                    survey_aggregate_snapshot_id_by_conversation_id.get(conversation_id)
                ),
                "conversation_content_id": state.conversation_content_id,
                "view_reason": ConversationViewSnapshotReasonEnum.analysis_completed,
                "preferred_opinion_group_count": state.preferred_opinion_group_count
                if conversation_id in premium_analysis_conversation_ids
                else None,
                "is_closed": state.is_closed,
                "opinion_count": counters.opinion_count,
                "vote_count": len(input_snapshot.votes),
                "participant_count": len(input_snapshot.participants),
                "total_opinion_count": counters.total_opinion_count,
                "total_vote_count": counters.total_vote_count,
                "total_participant_count": counters.total_participant_count,
                "moderated_opinion_count": counters.moderated_opinion_count,
                "hidden_opinion_count": counters.hidden_opinion_count,
                "activated_at": None
                if state.ai_labeling_enabled and ai_generation_expected and selected is not None
                else func.now(),
            }
        )

    view_rows = session.execute(
        sqlalchemy_insert(ConversationViewSnapshot)
        .values(view_snapshot_values)
        .returning(
            ConversationViewSnapshot.id,
            ConversationViewSnapshot.conversation_id,
            ConversationViewSnapshot.opinion_group_spec_id,
        )
    ).all()
    view_snapshot_id_by_pair = {
        (row.conversation_id, row.opinion_group_spec_id): row.id for row in view_rows
    }

    return {
        pair: _PersistedConversationViewSnapshot(
            view_snapshot_id=view_snapshot_id_by_pair[pair],
            selected_candidate=selected,
            conversation_state=state_by_conversation_id[pair[0]],
            opinion_count=counters_by_conversation_id[pair[0]].opinion_count,
            vote_count=len(prepared_input_snapshots_by_conversation_id[pair[0]].votes),
            participant_count=len(
                prepared_input_snapshots_by_conversation_id[pair[0]].participants
            ),
        )
        for pair, selected in selected_by_pair.items()
    }, displayable_options_by_pair


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


def _create_ai_description_locale_status_rows(
    session: Session,
    *,
    persisted_view_snapshots_by_pair: dict[tuple[int, int], _PersistedConversationViewSnapshot],
    result_id_by_conversation_id: dict[int, int],
    ai_generation_expected: bool,
    translation_expected: bool,
) -> list[int]:
    if not persisted_view_snapshots_by_pair:
        return []

    current_snapshot_id_by_pair = {
        pair: persisted.view_snapshot_id
        for pair, persisted in persisted_view_snapshots_by_pair.items()
    }
    for (
        conversation_id,
        opinion_group_spec_id,
    ), current_snapshot_id in current_snapshot_id_by_pair.items():
        session.execute(
            update(OpinionGroupDescriptionLocaleStatus)
            .where(
                and_(
                    OpinionGroupDescriptionLocaleStatus.conversation_id == conversation_id,
                    OpinionGroupDescriptionLocaleStatus.opinion_group_spec_id
                    == opinion_group_spec_id,
                    OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id
                    != current_snapshot_id,
                    OpinionGroupDescriptionLocaleStatus.conversation_view_snapshot_id.not_in(
                        select(
                            ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id
                        )
                    ),
                    OpinionGroupDescriptionLocaleStatus.next_run_at.is_not(None),
                )
            )
            .values(
                next_run_at=None,
                lease_owner=None,
                lease_token=None,
                lease_expires_at=None,
                updated_at=func.now(),
            )
        )

    locale_status_values: list[dict[str, object]] = []
    due_conversation_ids: set[int] = set()
    for pair, persisted in persisted_view_snapshots_by_pair.items():
        conversation_id, opinion_group_spec_id = pair
        if persisted.selected_candidate is None:
            continue

        if not persisted.conversation_state.ai_labeling_enabled:
            continue

        result_id = result_id_by_conversation_id[conversation_id]
        due_conversation_ids.add(conversation_id)
        for locale in SUPPORTED_DISPLAY_LANGUAGE_CODES:
            locale_status_values.append(
                {
                    "conversation_view_snapshot_id": persisted.view_snapshot_id,
                    "conversation_id": conversation_id,
                    "opinion_group_spec_id": opinion_group_spec_id,
                    "analysis_snapshot_result_id": result_id,
                    "locale": locale,
                    "status": AiDescriptionLocaleStatusEnum.pending,
                    "ai_generation_expected": ai_generation_expected,
                    "translation_expected": locale != "en" and translation_expected,
                    "next_run_at": func.now() if locale == "en" else None,
                }
            )

    if locale_status_values:
        session.execute(
            sqlalchemy_insert(OpinionGroupDescriptionLocaleStatus).values(locale_status_values)
        )

    return sorted(due_conversation_ids)


def _create_lineage_description_work_rows(
    session: Session,
    *,
    persisted_view_snapshots_by_pair: dict[tuple[int, int], _PersistedConversationViewSnapshot],
    artifact_candidate_ids_by_pair: dict[tuple[int, int], set[int]],
    ai_generation_expected: bool,
) -> None:
    if not ai_generation_expected or not persisted_view_snapshots_by_pair:
        return

    work_values_by_lineage_id: dict[int, dict[str, object]] = {}
    for pair, persisted in persisted_view_snapshots_by_pair.items():
        if persisted.selected_candidate is None:
            continue

        if not persisted.conversation_state.ai_labeling_enabled:
            continue
        conversation_id, _opinion_group_spec_id = pair
        candidate_ids = artifact_candidate_ids_by_pair.get(pair, set())
        if not candidate_ids:
            continue

        lineage_rows = session.execute(
            select(
                OpinionGroup.lineage_id,
                OpinionGroup.candidate_id,
            )
            .join(OpinionGroupLineage, OpinionGroupLineage.id == OpinionGroup.lineage_id)
            .where(
                and_(
                    OpinionGroup.candidate_id.in_(sorted(candidate_ids)),
                    OpinionGroup.lineage_id.is_not(None),
                    OpinionGroupLineage.system_description_id.is_(None),
                )
            )
            .order_by(OpinionGroup.candidate_id, OpinionGroup.id)
        ).all()
        for row in lineage_rows:
            if row.lineage_id is None or row.lineage_id in work_values_by_lineage_id:
                continue
            work_values_by_lineage_id[row.lineage_id] = {
                "lineage_id": row.lineage_id,
                "conversation_id": conversation_id,
                "source_candidate_id": row.candidate_id,
                "next_run_at": func.now(),
            }

    if not work_values_by_lineage_id:
        return

    insert_query = pg_insert(OpinionGroupLineageDescriptionWork).values(
        list(work_values_by_lineage_id.values())
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


def _fetch_existing_checkpoint_reason_rows(
    session: Session,
    *,
    pairs: list[tuple[int, int]],
) -> list[_ExistingCheckpointReason]:
    if not pairs:
        return []

    rows = session.execute(
        select(
            ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id,
            ConversationViewSnapshotCheckpointReason.conversation_id,
            ConversationViewSnapshotCheckpointReason.opinion_group_spec_id,
            ConversationViewSnapshotCheckpointReason.reason,
            ConversationViewSnapshotCheckpointReason.group_count,
            ConversationViewSnapshotCheckpointReason.participant_milestone,
            ConversationViewSnapshotCheckpointReason.vote_milestone,
        )
        .join(
            ConversationViewSnapshot,
            ConversationViewSnapshot.id
            == ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id,
        )
        .where(
            and_(
                tuple_(
                    ConversationViewSnapshotCheckpointReason.conversation_id,
                    ConversationViewSnapshotCheckpointReason.opinion_group_spec_id,
                ).in_(pairs),
                ConversationViewSnapshot.activated_at.is_not(None),
            )
        )
    ).all()
    return [
        _ExistingCheckpointReason(
            conversation_view_snapshot_id=row.conversation_view_snapshot_id,
            conversation_id=row.conversation_id,
            opinion_group_spec_id=row.opinion_group_spec_id,
            reason=row.reason,
            group_count=row.group_count,
            participant_milestone=row.participant_milestone,
            vote_milestone=row.vote_milestone,
        )
        for row in rows
    ]


def _checkpoint_reason_values(
    session: Session,
    *,
    persisted_view_snapshots_by_pair: dict[tuple[int, int], _PersistedConversationViewSnapshot],
    current_options_by_pair: dict[tuple[int, int], list[_CheckpointCandidateOption]],
) -> list[_CheckpointReasonInsertValue]:
    if not persisted_view_snapshots_by_pair:
        return []

    pairs = sorted(persisted_view_snapshots_by_pair)
    existing_rows = _fetch_existing_checkpoint_reason_rows(session, pairs=pairs)
    existing_first_displayable_pairs = {
        (row.conversation_id, row.opinion_group_spec_id)
        for row in existing_rows
        if row.reason == ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis
    }
    existing_group_count_pairs = {
        (row.conversation_id, row.opinion_group_spec_id, row.group_count)
        for row in existing_rows
        if row.reason == ConversationViewSnapshotCheckpointReasonEnum.first_group_count_available
        and row.group_count is not None
    }
    existing_participant_milestone_pairs = {
        (row.conversation_id, row.opinion_group_spec_id, row.participant_milestone)
        for row in existing_rows
        if row.reason == ConversationViewSnapshotCheckpointReasonEnum.major_participation_milestone
    }
    existing_vote_milestone_pairs = {
        (row.conversation_id, row.opinion_group_spec_id, row.vote_milestone)
        for row in existing_rows
        if row.reason == ConversationViewSnapshotCheckpointReasonEnum.major_vote_milestone
    }
    existing_default_change_view_snapshot_ids = {
        row.conversation_view_snapshot_id
        for row in existing_rows
        if row.reason == ConversationViewSnapshotCheckpointReasonEnum.default_group_count_changed
    }
    existing_closed_view_snapshot_ids = {
        row.conversation_view_snapshot_id
        for row in existing_rows
        if row.reason == ConversationViewSnapshotCheckpointReasonEnum.conversation_closed
    }
    current_view_snapshot_ids = [
        view_snapshot.view_snapshot_id
        for view_snapshot in persisted_view_snapshots_by_pair.values()
    ]
    previous_selected_by_pair = _fetch_previous_selected_view_snapshots_by_pair(
        session,
        pairs=pairs,
        current_view_snapshot_ids=current_view_snapshot_ids,
    )
    previous_checkpoint_selected_by_pair = _fetch_previous_selected_view_snapshots_by_pair(
        session,
        pairs=pairs,
        current_view_snapshot_ids=current_view_snapshot_ids,
        checkpoint_only=True,
    )
    previous_group_count_pairs = {
        (row.conversation_id, row.opinion_group_spec_id, row.group_count)
        for row in existing_rows
        if row.reason == ConversationViewSnapshotCheckpointReasonEnum.first_group_count_available
        and row.group_count is not None
    }

    reason_values: list[_CheckpointReasonInsertValue] = []
    for pair, persisted in persisted_view_snapshots_by_pair.items():
        conversation_id, opinion_group_spec_id = pair
        selected = persisted.selected_candidate
        if selected is None:
            continue
        previous_selected = previous_selected_by_pair.get(pair)

        if pair not in existing_first_displayable_pairs and pair not in previous_selected_by_pair:
            reason_values.append(
                _checkpoint_reason_insert_value(
                    conversation_view_snapshot_id=persisted.view_snapshot_id,
                    conversation_id=conversation_id,
                    opinion_group_spec_id=opinion_group_spec_id,
                    reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis,
                )
            )

        for option in current_options_by_pair.get(pair, []):
            group_count_key = (conversation_id, opinion_group_spec_id, option.group_count)
            if (
                group_count_key not in existing_group_count_pairs
                and group_count_key not in previous_group_count_pairs
            ):
                reason_values.append(
                    _checkpoint_reason_insert_value(
                        conversation_view_snapshot_id=persisted.view_snapshot_id,
                        conversation_id=conversation_id,
                        opinion_group_spec_id=opinion_group_spec_id,
                        reason=ConversationViewSnapshotCheckpointReasonEnum.first_group_count_available,
                        group_count=option.group_count,
                    )
                )

        previous_checkpoint_selected = previous_checkpoint_selected_by_pair.get(pair)
        if (
            previous_checkpoint_selected is not None
            and previous_checkpoint_selected.group_count != selected.group_count
            and persisted.view_snapshot_id not in existing_default_change_view_snapshot_ids
        ):
            reason_values.append(
                _checkpoint_reason_insert_value(
                    conversation_view_snapshot_id=persisted.view_snapshot_id,
                    conversation_id=conversation_id,
                    opinion_group_spec_id=opinion_group_spec_id,
                    reason=ConversationViewSnapshotCheckpointReasonEnum.default_group_count_changed,
                    group_count=selected.group_count,
                    previous_group_count=previous_checkpoint_selected.group_count,
                )
            )

        for participant_milestone in _checkpoint_milestones_at_or_below(
            count=persisted.participant_count,
            seeds=PARTICIPANT_MILESTONE_SEEDS,
        ):
            milestone_key = (conversation_id, opinion_group_spec_id, participant_milestone)
            if milestone_key in existing_participant_milestone_pairs:
                continue
            reason_values.append(
                _checkpoint_reason_insert_value(
                    conversation_view_snapshot_id=persisted.view_snapshot_id,
                    conversation_id=conversation_id,
                    opinion_group_spec_id=opinion_group_spec_id,
                    reason=ConversationViewSnapshotCheckpointReasonEnum.major_participation_milestone,
                    participant_count=persisted.participant_count,
                    participant_milestone=participant_milestone,
                )
            )

        for vote_milestone in _checkpoint_milestones_at_or_below(
            count=persisted.vote_count,
            seeds=VOTE_MILESTONE_SEEDS,
        ):
            milestone_key = (conversation_id, opinion_group_spec_id, vote_milestone)
            if milestone_key in existing_vote_milestone_pairs:
                continue
            reason_values.append(
                _checkpoint_reason_insert_value(
                    conversation_view_snapshot_id=persisted.view_snapshot_id,
                    conversation_id=conversation_id,
                    opinion_group_spec_id=opinion_group_spec_id,
                    reason=ConversationViewSnapshotCheckpointReasonEnum.major_vote_milestone,
                    vote_count=persisted.vote_count,
                    vote_milestone=vote_milestone,
                )
            )

        lifecycle_reason: ConversationViewSnapshotCheckpointReasonEnum | None = None
        if persisted.conversation_state.is_closed and (
            previous_selected is None or not previous_selected.is_closed
        ):
            lifecycle_reason = ConversationViewSnapshotCheckpointReasonEnum.conversation_closed

        if lifecycle_reason is not None:
            if persisted.view_snapshot_id in existing_closed_view_snapshot_ids:
                continue
            reason_values.append(
                _checkpoint_reason_insert_value(
                    conversation_view_snapshot_id=persisted.view_snapshot_id,
                    conversation_id=conversation_id,
                    opinion_group_spec_id=opinion_group_spec_id,
                    reason=lifecycle_reason,
                )
            )

    return reason_values


def _persist_checkpoint_reasons(
    session: Session,
    *,
    persisted_view_snapshots_by_pair: dict[tuple[int, int], _PersistedConversationViewSnapshot],
    current_options_by_pair: dict[tuple[int, int], list[_CheckpointCandidateOption]],
) -> None:
    reason_values = _checkpoint_reason_values(
        session,
        persisted_view_snapshots_by_pair=persisted_view_snapshots_by_pair,
        current_options_by_pair=current_options_by_pair,
    )
    if not reason_values:
        return

    session.execute(sqlalchemy_insert(ConversationViewSnapshotCheckpointReason).values(reason_values))


def _checkpoint_context_for_activated_view_snapshots(
    session: Session,
    *,
    conversation_view_snapshot_ids: list[int],
) -> tuple[
    dict[tuple[int, int], _PersistedConversationViewSnapshot],
    dict[tuple[int, int], list[_CheckpointCandidateOption]],
]:
    if not conversation_view_snapshot_ids:
        return {}, {}

    unique_view_snapshot_ids = sorted(set(conversation_view_snapshot_ids))
    rows = session.execute(
        select(
            ConversationViewSnapshot.id.label("view_snapshot_id"),
            ConversationViewSnapshot.conversation_id,
            ConversationViewSnapshot.opinion_group_spec_id,
            ConversationViewSnapshot.analysis_snapshot_id,
            ConversationViewSnapshot.conversation_content_id,
            ConversationViewSnapshot.is_closed,
            ConversationViewSnapshot.opinion_count,
            ConversationViewSnapshot.vote_count,
            ConversationViewSnapshot.participant_count,
            ConversationViewSnapshot.created_at,
            OpinionGroupCandidate.id.label("candidate_id"),
            OpinionGroupVariant.group_count,
            OpinionGroupCandidateAssessment.selection_score,
        )
        .select_from(ConversationViewSnapshot)
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
        .outerjoin(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            and_(
                ConversationViewSnapshot.id.in_(unique_view_snapshot_ids),
                ConversationViewSnapshot.activated_at.is_not(None),
                ConversationViewSnapshot.analysis_snapshot_id.is_not(None),
                AnalysisSnapshotResult.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
                OpinionGroupCandidateAssessment.hidden_reason.is_(None),
            )
        )
    ).all()

    metadata_by_pair: dict[
        tuple[int, int],
        tuple[int, _ConversationViewSnapshotState, int, int, int],
    ] = {}
    current_options_by_pair: dict[tuple[int, int], list[_CheckpointCandidateOption]] = {}
    for row in rows:
        if row.analysis_snapshot_id is None:
            continue
        pair = (row.conversation_id, row.opinion_group_spec_id)
        metadata_by_pair[pair] = (
            row.view_snapshot_id,
            _ConversationViewSnapshotState(
                conversation_content_id=row.conversation_content_id,
                ai_labeling_enabled=True,
                is_closed=row.is_closed,
                preferred_opinion_group_count=None,
            ),
            row.opinion_count,
            row.vote_count,
            row.participant_count,
        )
        current_options_by_pair.setdefault(pair, []).append(
            _CheckpointCandidateOption(
                conversation_id=row.conversation_id,
                opinion_group_spec_id=row.opinion_group_spec_id,
                snapshot_id=row.analysis_snapshot_id,
                candidate_id=row.candidate_id,
                group_count=row.group_count,
                selection_score=row.selection_score,
                data_generation=0,
                created_at=row.created_at,
            )
        )

    persisted_view_snapshots_by_pair: dict[
        tuple[int, int], _PersistedConversationViewSnapshot
    ] = {}
    for pair, options in current_options_by_pair.items():
        metadata = metadata_by_pair.get(pair)
        if metadata is None:
            continue
        view_snapshot_id, state, opinion_count, vote_count, participant_count = metadata
        persisted_view_snapshots_by_pair[pair] = _PersistedConversationViewSnapshot(
            view_snapshot_id=view_snapshot_id,
            selected_candidate=_select_checkpoint_candidate(options),
            conversation_state=state,
            opinion_count=opinion_count,
            vote_count=vote_count,
            participant_count=participant_count,
        )

    return persisted_view_snapshots_by_pair, current_options_by_pair


def materialize_checkpoint_reasons_for_activated_view_snapshots(
    session: Session,
    *,
    conversation_view_snapshot_ids: list[int],
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> None:
    if checkpoint_activation_context is None:
        persisted_view_snapshots_by_pair, current_options_by_pair = (
            _checkpoint_context_for_activated_view_snapshots(
                session,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
            )
        )
    else:
        activated_view_snapshot_ids = set(conversation_view_snapshot_ids)
        persisted_view_snapshots_by_pair = {
            pair: persisted
            for pair, persisted in (
                checkpoint_activation_context.persisted_view_snapshots_by_pair.items()
            )
            if persisted.view_snapshot_id in activated_view_snapshot_ids
        }
        current_options_by_pair = {
            pair: checkpoint_activation_context.current_options_by_pair.get(pair, [])
            for pair in persisted_view_snapshots_by_pair
        }
        missing_view_snapshot_ids = activated_view_snapshot_ids - {
            persisted.view_snapshot_id
            for persisted in persisted_view_snapshots_by_pair.values()
        }
        if missing_view_snapshot_ids:
            db_persisted_view_snapshots_by_pair, db_current_options_by_pair = (
                _checkpoint_context_for_activated_view_snapshots(
                    session,
                    conversation_view_snapshot_ids=sorted(missing_view_snapshot_ids),
                )
            )
            persisted_view_snapshots_by_pair.update(db_persisted_view_snapshots_by_pair)
            current_options_by_pair.update(db_current_options_by_pair)

    _persist_checkpoint_reasons(
        session,
        persisted_view_snapshots_by_pair=persisted_view_snapshots_by_pair,
        current_options_by_pair=current_options_by_pair,
    )


def _fetch_conversation_content_id_by_conversation_id(
    session: Session,
    *,
    conversation_ids: list[int],
) -> dict[int, int | None]:
    if not conversation_ids:
        return {}
    rows = session.execute(
        select(Conversation.id, Conversation.current_content_id).where(
            Conversation.id.in_(sorted(set(conversation_ids)))
        )
    ).all()
    return {row.id: row.current_content_id for row in rows}


def _owner_current_survey_aggregate_rows(
    *,
    aggregate: SurveyAggregateBuildResult,
) -> list[dict[str, object]]:
    question_by_key = {question.key: question for question in aggregate.questions}
    option_by_key = {option.key: option for option in aggregate.options}
    rows: list[dict[str, object]] = []

    for result in aggregate.results:
        if result.count is None:
            msg = "owner current survey aggregate row is missing count"
            raise ValueError(msg)

        question = question_by_key[result.question_key]
        option = option_by_key[result.option_key]
        rows.append(
            {
                "scope": (
                    "overall" if result.scope == SurveyAggregateScopeEnum.overall else "cluster"
                ),
                "candidateId": result.candidate_id,
                "groupId": result.group_id,
                "questionId": question.question_slug_id,
                "questionType": question.question_type.value,
                "question": question.question_text,
                "optionId": option.option_slug_id,
                "option": option.option_text,
                "count": result.count,
                "percentage": result.percentage,
            }
        )

    return rows


def _persist_owner_current_survey_aggregates(
    session: Session,
    *,
    aggregate_snapshot_id_by_conversation_id: dict[int, int],
    configs_by_conversation_id: dict[int, SurveyConfigSnapshot],
    aggregate_by_conversation_id: dict[int, SurveyAggregateBuildResult],
) -> None:
    if not aggregate_by_conversation_id:
        return

    insert_statement = pg_insert(SurveyAggregateOwnerCurrent).values(
        [
            {
                "conversation_id": conversation_id,
                "survey_aggregate_snapshot_id": (
                    aggregate_snapshot_id_by_conversation_id[conversation_id]
                ),
                "survey_config_id": configs_by_conversation_id[conversation_id].id,
                "survey_config_revision": configs_by_conversation_id[
                    conversation_id
                ].current_revision,
                "rows": _owner_current_survey_aggregate_rows(
                    aggregate=aggregate_by_conversation_id[conversation_id]
                ),
            }
            for conversation_id in aggregate_by_conversation_id
        ]
    )
    session.execute(
        insert_statement.on_conflict_do_update(
            index_elements=[SurveyAggregateOwnerCurrent.conversation_id],
            set_={
                "survey_aggregate_snapshot_id": (
                    insert_statement.excluded.survey_aggregate_snapshot_id
                ),
                "survey_config_id": insert_statement.excluded.survey_config_id,
                "survey_config_revision": (insert_statement.excluded.survey_config_revision),
                "rows": insert_statement.excluded.rows,
                "updated_at": func.now(),
            },
        )
    )


def _persist_survey_aggregate_snapshots(
    session: Session,
    *,
    claims: list[ClaimedWorkItem],
    snapshot_id_by_conversation_id: dict[int, int],
    prepared_input_snapshots_by_conversation_id: dict[int, PreparedInputSnapshot],
    bundles_by_conversation_id: dict[int, ComputedAnalysisBundle],
    candidate_id_by_conversation_variant: dict[tuple[int, int], int],
    artifact_candidate_ids_by_pair: dict[tuple[int, int], set[int]],
    group_id_by_candidate_key: dict[tuple[int, str], int],
) -> dict[int, int]:
    configs_by_conversation_id = _fetch_active_survey_configs(
        session,
        conversation_ids=[claim.conversation_id for claim in claims],
    )
    if not configs_by_conversation_id:
        return {}

    responses_by_conversation_id = _fetch_survey_responses(
        session,
        conversation_ids=list(configs_by_conversation_id),
    )
    aggregate_by_conversation_id: dict[int, SurveyAggregateBuildResult] = {}
    owner_current_aggregate_by_conversation_id: dict[int, SurveyAggregateBuildResult] = {}
    for claim in claims:
        config = configs_by_conversation_id.get(claim.conversation_id)
        if config is None:
            continue
        counted_participant_ids = {
            participant.user_id
            for participant in prepared_input_snapshots_by_conversation_id[
                claim.conversation_id
            ].participants
        }
        aggregate_by_conversation_id[claim.conversation_id] = build_suppressed_survey_aggregates(
            config=config,
            responses=[
                response
                for response in responses_by_conversation_id.get(claim.conversation_id, [])
                if response.participant_id in counted_participant_ids
            ],
            group_memberships=_survey_group_memberships(
                claim=claim,
                snapshot=prepared_input_snapshots_by_conversation_id[claim.conversation_id],
                bundle=bundles_by_conversation_id[claim.conversation_id],
                candidate_id_by_conversation_variant=(candidate_id_by_conversation_variant),
                allowed_candidate_ids=artifact_candidate_ids_by_pair.get(
                    (claim.conversation_id, claim.opinion_group_spec_id),
                    set(),
                ),
                group_id_by_candidate_key=group_id_by_candidate_key,
            ),
        )
        owner_current_aggregate_by_conversation_id[claim.conversation_id] = (
            build_full_survey_aggregates(
                config=config,
                responses=[
                    response
                    for response in responses_by_conversation_id.get(claim.conversation_id, [])
                    if response.participant_id in counted_participant_ids
                ],
                group_memberships=_survey_group_memberships(
                    claim=claim,
                    snapshot=prepared_input_snapshots_by_conversation_id[claim.conversation_id],
                    bundle=bundles_by_conversation_id[claim.conversation_id],
                    candidate_id_by_conversation_variant=(candidate_id_by_conversation_variant),
                    allowed_candidate_ids=artifact_candidate_ids_by_pair.get(
                        (claim.conversation_id, claim.opinion_group_spec_id),
                        set(),
                    ),
                    group_id_by_candidate_key=group_id_by_candidate_key,
                ),
            )
        )

    if not aggregate_by_conversation_id:
        return {}

    snapshot_rows = session.execute(
        sqlalchemy_insert(SurveyAggregateSnapshot)
        .values(
            [
                {
                    "conversation_id": conversation_id,
                    "analysis_snapshot_id": snapshot_id_by_conversation_id[conversation_id],
                    "survey_config_id": configs_by_conversation_id[conversation_id].id,
                    "survey_config_revision": configs_by_conversation_id[
                        conversation_id
                    ].current_revision,
                    "suppression_threshold": PUBLIC_SURVEY_SUPPRESSION_THRESHOLD,
                }
                for conversation_id in aggregate_by_conversation_id
            ]
        )
        .returning(SurveyAggregateSnapshot.id, SurveyAggregateSnapshot.conversation_id)
    ).all()
    aggregate_snapshot_id_by_conversation_id = {
        row.conversation_id: row.id for row in snapshot_rows
    }

    question_rows = session.execute(
        sqlalchemy_insert(SurveyAggregateQuestion)
        .values(
            [
                {
                    "survey_aggregate_snapshot_id": aggregate_snapshot_id_by_conversation_id[
                        conversation_id
                    ],
                    "survey_question_id": question.survey_question_id,
                    "question_slug_id": question.question_slug_id,
                    "question_order": question.question_order,
                    "question_type": question.question_type,
                    "question_text": question.question_text,
                    "is_required": question.is_required,
                    "question_semantic_version": question.question_semantic_version,
                }
                for conversation_id, aggregate in aggregate_by_conversation_id.items()
                for question in aggregate.questions
            ]
        )
        .returning(
            SurveyAggregateQuestion.id,
            SurveyAggregateQuestion.survey_aggregate_snapshot_id,
            SurveyAggregateQuestion.question_slug_id,
        )
    ).all()
    conversation_id_by_aggregate_snapshot_id = dict(
        (aggregate_snapshot_id, conversation_id)
        for conversation_id, aggregate_snapshot_id in (
            aggregate_snapshot_id_by_conversation_id.items()
        )
    )
    question_id_by_conversation_key = {
        (
            conversation_id_by_aggregate_snapshot_id[row.survey_aggregate_snapshot_id],
            row.question_slug_id,
        ): row.id
        for row in question_rows
    }

    option_rows = session.execute(
        sqlalchemy_insert(SurveyAggregateOption)
        .values(
            [
                {
                    "survey_aggregate_question_id": question_id_by_conversation_key[
                        (conversation_id, option.question_key)
                    ],
                    "survey_question_option_id": option.survey_question_option_id,
                    "option_slug_id": option.option_slug_id,
                    "option_order": option.option_order,
                    "option_text": option.option_text,
                }
                for conversation_id, aggregate in aggregate_by_conversation_id.items()
                for option in aggregate.options
            ]
        )
        .returning(
            SurveyAggregateOption.id,
            SurveyAggregateOption.survey_aggregate_question_id,
            SurveyAggregateOption.option_slug_id,
        )
    ).all()
    conversation_key_by_question_id = {
        question_id: conversation_key
        for conversation_key, question_id in question_id_by_conversation_key.items()
    }
    option_id_by_conversation_key = {
        (
            conversation_key_by_question_id[row.survey_aggregate_question_id][0],
            f"{conversation_key_by_question_id[row.survey_aggregate_question_id][1]}:{row.option_slug_id}",
        ): row.id
        for row in option_rows
    }

    result_values: list[dict[str, object]] = [
        {
            "survey_aggregate_snapshot_id": aggregate_snapshot_id_by_conversation_id[
                conversation_id
            ],
            "candidate_id": result.candidate_id,
            "group_id": result.group_id,
            "scope": result.scope,
            "survey_aggregate_question_id": question_id_by_conversation_key[
                (conversation_id, result.question_key)
            ],
            "survey_aggregate_option_id": option_id_by_conversation_key[
                (conversation_id, result.option_key)
            ],
            "count": result.count,
            "percentage": result.percentage,
            "is_suppressed": result.is_suppressed,
            "suppression_reason": result.suppression_reason,
        }
        for conversation_id, aggregate in aggregate_by_conversation_id.items()
        for result in aggregate.results
    ]
    if result_values:
        chunk_size = _max_rows_per_insert(column_count=10)
        if len(result_values) > chunk_size:
            log.info(
                "[MathUpdaterDB] Chunking survey aggregate results rows=%d "
                "max_rows_per_chunk=%d",
                len(result_values),
                chunk_size,
            )
        for chunk in _iter_chunks(result_values, chunk_size=chunk_size):
            session.execute(sqlalchemy_insert(SurveyAggregateResult).values(chunk))

    _persist_owner_current_survey_aggregates(
        session,
        aggregate_snapshot_id_by_conversation_id=aggregate_snapshot_id_by_conversation_id,
        configs_by_conversation_id=configs_by_conversation_id,
        aggregate_by_conversation_id=owner_current_aggregate_by_conversation_id,
    )

    return aggregate_snapshot_id_by_conversation_id


def _survey_group_memberships(
    *,
    claim: ClaimedWorkItem,
    snapshot: PreparedInputSnapshot,
    bundle: ComputedAnalysisBundle,
    candidate_id_by_conversation_variant: dict[tuple[int, int], int],
    allowed_candidate_ids: set[int],
    group_id_by_candidate_key: dict[tuple[int, str], int],
) -> list[SurveyAggregateGroupMembership]:
    user_id_by_local_index = {
        participant.local_participant_index: participant.user_id
        for participant in snapshot.participants
    }
    memberships: list[SurveyAggregateGroupMembership] = []
    for candidate in bundle.candidates:
        if not _is_visible_success_candidate(candidate):
            continue
        candidate_id = candidate_id_by_conversation_variant[
            (claim.conversation_id, candidate.opinion_group_variant_id)
        ]
        if candidate_id not in allowed_candidate_ids:
            continue
        for group in candidate.groups:
            group_id = group_id_by_candidate_key[(candidate_id, group.key)]
            memberships.append(
                SurveyAggregateGroupMembership(
                    candidate_id=candidate_id,
                    group_id=group_id,
                    user_ids=frozenset(
                        user_id_by_local_index[local_participant_index]
                        for local_participant_index in group.local_participant_indexes
                        if local_participant_index in user_id_by_local_index
                    ),
                )
            )
    return memberships


def _fetch_active_survey_configs(
    session: Session,
    *,
    conversation_ids: list[int],
) -> dict[int, SurveyConfigSnapshot]:
    if not conversation_ids:
        return {}
    config_rows = session.execute(
        select(
            SurveyConfig.id,
            SurveyConfig.conversation_id,
            SurveyConfig.current_revision,
            SurveyConfig.is_optional,
        )
        .where(
            and_(
                SurveyConfig.conversation_id.in_(sorted(set(conversation_ids))),
                SurveyConfig.deleted_at.is_(None),
            )
        )
        .order_by(SurveyConfig.conversation_id, SurveyConfig.id)
    ).all()
    config_by_conversation_id = {row.conversation_id: row for row in config_rows}
    if not config_by_conversation_id:
        return {}

    question_rows = session.execute(
        select(
            SurveyQuestion.id,
            SurveyQuestion.survey_config_id,
            SurveyQuestion.slug_id,
            SurveyQuestion.question_type,
            SurveyQuestion.current_semantic_version,
            SurveyQuestion.display_order,
            SurveyQuestion.is_required,
            SurveyQuestionContent.question_text,
            SurveyQuestionContent.constraints,
        )
        .join(
            SurveyQuestionContent,
            SurveyQuestion.current_content_id == SurveyQuestionContent.id,
        )
        .where(
            and_(
                SurveyQuestion.survey_config_id.in_(
                    [row.id for row in config_by_conversation_id.values()]
                ),
                SurveyQuestion.current_content_id.is_not(None),
            )
        )
        .order_by(SurveyQuestion.survey_config_id, SurveyQuestion.display_order)
    ).all()
    question_ids = [row.id for row in question_rows]
    options_by_question_id: dict[int, list[SurveyOptionSnapshot]] = {}
    if question_ids:
        option_rows = session.execute(
            select(
                SurveyQuestionOption.id,
                SurveyQuestionOption.survey_question_id,
                SurveyQuestionOption.slug_id,
                SurveyQuestionOption.display_order,
                SurveyQuestionOptionContent.option_text,
            )
            .join(
                SurveyQuestionOptionContent,
                SurveyQuestionOption.current_content_id == SurveyQuestionOptionContent.id,
            )
            .where(
                and_(
                    SurveyQuestionOption.survey_question_id.in_(question_ids),
                    SurveyQuestionOption.current_content_id.is_not(None),
                )
            )
            .order_by(
                SurveyQuestionOption.survey_question_id,
                SurveyQuestionOption.display_order,
            )
        ).all()

        for row in option_rows:
            options_by_question_id.setdefault(row.survey_question_id, []).append(
                SurveyOptionSnapshot(
                    id=row.id,
                    slug_id=row.slug_id,
                    display_order=row.display_order,
                    option_text=row.option_text,
                )
            )

    questions_by_config_id: dict[int, list[SurveyQuestionSnapshot]] = {}
    for row in question_rows:
        constraints = _parse_string_object_dict(row.constraints)
        questions_by_config_id.setdefault(row.survey_config_id, []).append(
            SurveyQuestionSnapshot(
                id=row.id,
                slug_id=row.slug_id,
                display_order=row.display_order,
                question_type=row.question_type,
                question_text=row.question_text,
                is_required=row.is_required,
                current_semantic_version=row.current_semantic_version,
                constraints=constraints,
                options=options_by_question_id.get(row.id, []),
            )
        )

    return {
        conversation_id: SurveyConfigSnapshot(
            id=row.id,
            current_revision=row.current_revision,
            is_optional=row.is_optional,
            questions=questions_by_config_id.get(row.id, []),
        )
        for conversation_id, row in config_by_conversation_id.items()
    }


def _fetch_survey_responses(
    session: Session,
    *,
    conversation_ids: list[int],
) -> dict[int, list[SurveyResponseSnapshot]]:
    if not conversation_ids:
        return {}
    response_rows = session.execute(
        select(
            SurveyResponse.id,
            SurveyResponse.conversation_id,
            SurveyResponse.participant_id,
            SurveyResponse.withdrawn_at,
        )
        .join(User, User.id == SurveyResponse.participant_id)
        .where(
            and_(
                SurveyResponse.conversation_id.in_(sorted(set(conversation_ids))),
                User.is_deleted.is_(False),
            )
        )
    ).all()
    response_ids = [row.id for row in response_rows]
    answers_by_response_id: dict[int, dict[int, SurveyAnswerSnapshot]] = {
        response_id: {} for response_id in response_ids
    }
    if response_ids:
        answer_rows = session.execute(
            select(
                SurveyAnswer.id,
                SurveyAnswer.survey_response_id,
                SurveyAnswer.survey_question_id,
                SurveyAnswer.answered_question_semantic_version,
                SurveyAnswer.text_value_html,
            ).where(
                and_(
                    SurveyAnswer.survey_response_id.in_(response_ids),
                    SurveyAnswer.deleted_at.is_(None),
                )
            )
        ).all()
        answer_ids = [row.id for row in answer_rows]
        option_slug_ids_by_answer_id: dict[int, list[str]] = {
            answer_id: [] for answer_id in answer_ids
        }
        if answer_ids:
            option_rows = session.execute(
                select(
                    SurveyAnswerOption.survey_answer_id,
                    SurveyQuestionOption.slug_id,
                )
                .join(
                    SurveyQuestionOption,
                    SurveyAnswerOption.survey_question_option_id == SurveyQuestionOption.id,
                )
                .where(
                    and_(
                        SurveyAnswerOption.survey_answer_id.in_(answer_ids),
                        SurveyAnswerOption.deleted_at.is_(None),
                    )
                )
            ).all()
            for row in option_rows:
                option_slug_ids_by_answer_id.setdefault(row.survey_answer_id, []).append(
                    row.slug_id
                )
        for row in answer_rows:
            answers_by_response_id.setdefault(row.survey_response_id, {})[
                row.survey_question_id
            ] = SurveyAnswerSnapshot(
                question_id=row.survey_question_id,
                answered_question_semantic_version=(row.answered_question_semantic_version),
                option_slug_ids=option_slug_ids_by_answer_id.get(row.id, []),
                text_value_html=row.text_value_html,
            )

    responses_by_conversation_id: dict[int, list[SurveyResponseSnapshot]] = {
        conversation_id: [] for conversation_id in conversation_ids
    }
    for row in response_rows:
        responses_by_conversation_id.setdefault(row.conversation_id, []).append(
            SurveyResponseSnapshot(
                participant_id=row.participant_id,
                withdrawn=row.withdrawn_at is not None,
                answers_by_question_id=answers_by_response_id.get(row.id, {}),
            )
        )
    return responses_by_conversation_id


def _parse_string_object_dict(value: object) -> dict[str, object]:
    try:
        return STRING_OBJECT_DICT_ADAPTER.validate_python(value)
    except ValidationError:
        return {}


def persist_empty_vote_matrix_results_batch(
    engine: Engine,
    *,
    claims: list[ClaimedWorkItem],
    stored_input_snapshots_by_conversation_id: dict[int, StoredInputSnapshot],
) -> list[WorkStateSchedule]:
    if not claims:
        return []

    computed_at = datetime.now(UTC)
    opinion_group_spec_ids = sorted({claim.opinion_group_spec_id for claim in claims})

    with Session(engine) as session:
        premium_analysis_conversation_ids = _fetch_premium_analysis_conversation_ids(
            session,
            conversation_ids=[claim.conversation_id for claim in claims],
            now=computed_at,
        )
        variants_by_spec_id = fetch_variants_by_spec_ids(
            session,
            opinion_group_spec_ids=opinion_group_spec_ids,
        )
        missing_variant_spec_ids = [
            spec_id for spec_id, variants in variants_by_spec_id.items() if not variants
        ]
        if missing_variant_spec_ids:
            msg = f"missing opinion-group variants for specs {missing_variant_spec_ids}"
            raise ValueError(msg)

        conversation_content_id_by_conversation_id = (
            _fetch_conversation_content_id_by_conversation_id(
                session,
                conversation_ids=[claim.conversation_id for claim in claims],
            )
        )

        snapshot_insert = (
            sqlalchemy_insert(AnalysisSnapshot)
            .values(
                [
                    {
                        "conversation_id": claim.conversation_id,
                        "conversation_content_id": conversation_content_id_by_conversation_id.get(
                            claim.conversation_id
                        ),
                        "input_snapshot_id": stored_input_snapshots_by_conversation_id[
                            claim.conversation_id
                        ].id,
                        "data_generation": claim.data_generation,
                        "computed_at": computed_at,
                    }
                    for claim in claims
                ]
            )
            .returning(AnalysisSnapshot.id, AnalysisSnapshot.conversation_id)
        )
        snapshot_rows = session.execute(snapshot_insert).all()
        snapshot_id_by_conversation_id = {row.conversation_id: row.id for row in snapshot_rows}

        result_insert = (
            sqlalchemy_insert(AnalysisSnapshotResult)
            .values(
                [
                    {
                        "conversation_id": claim.conversation_id,
                        "analysis_snapshot_id": snapshot_id_by_conversation_id[
                            claim.conversation_id
                        ],
                        "opinion_group_spec_id": claim.opinion_group_spec_id,
                        "outcome": AnalysisResultOutcomeEnum.insufficient_data,
                        "outcome_reason": AnalysisInsufficientDataReasonEnum.empty_vote_matrix,
                        "variants_enabled": claim.conversation_id
                        in premium_analysis_conversation_ids,
                    }
                    for claim in claims
                ]
            )
            .returning(
                AnalysisSnapshotResult.id,
                AnalysisSnapshotResult.analysis_snapshot_id,
                AnalysisSnapshotResult.opinion_group_spec_id,
            )
        )
        result_rows = session.execute(result_insert).all()
        snapshot_id_to_conversation_id = {
            snapshot_id: conversation_id
            for conversation_id, snapshot_id in snapshot_id_by_conversation_id.items()
        }
        result_id_by_conversation_id = {
            snapshot_id_to_conversation_id[row.analysis_snapshot_id]: row.id for row in result_rows
        }

        conversation_variant_pairs = [
            (claim.conversation_id, variant.id)
            for claim in claims
            for variant in variants_by_spec_id[claim.opinion_group_spec_id]
        ]
        scope_id_by_pair = _get_or_create_lineage_scopes(
            session,
            conversation_variant_pairs=conversation_variant_pairs,
        )

        candidate_insert = sqlalchemy_insert(OpinionGroupCandidate).values(
            [
                {
                    "snapshot_result_id": result_id_by_conversation_id[claim.conversation_id],
                    "opinion_group_variant_id": variant.id,
                    "scope_id": scope_id_by_pair[(claim.conversation_id, variant.id)],
                    "outcome": AnalysisResultOutcomeEnum.insufficient_data,
                    "outcome_reason": AnalysisInsufficientDataReasonEnum.empty_vote_matrix,
                    "raw_output": None,
                }
                for claim in claims
                for variant in variants_by_spec_id[claim.opinion_group_spec_id]
            ]
        )
        session.execute(candidate_insert)

        completed_generation = case(
            {claim.id: claim.data_generation for claim in claims},
            value=AnalysisWorkState.id,
        )
        current_generation = (
            select(Conversation.analysis_data_generation)
            .where(Conversation.id == AnalysisWorkState.conversation_id)
            .scalar_subquery()
        )
        next_run_at = case(
            (current_generation > completed_generation, func.now()),
            else_=None,
        )
        work_state_update = (
            update(AnalysisWorkState)
            .where(
                and_(
                    AnalysisWorkState.id.in_([claim.id for claim in claims]),
                    tuple_(AnalysisWorkState.id, AnalysisWorkState.lease_token).in_(
                        [(claim.id, claim.lease_token) for claim in claims]
                    ),
                    AnalysisWorkState.running_data_generation == completed_generation,
                )
            )
            .values(
                last_completed_data_generation=func.greatest(
                    AnalysisWorkState.last_completed_data_generation,
                    completed_generation,
                ),
                running_data_generation=None,
                persisted_analysis_snapshot_id=None,
                dirty_since=case(
                    (current_generation > completed_generation, func.now()),
                    else_=None,
                ),
                next_run_at=next_run_at,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner=None,
                lease_token=None,
                lease_expires_at=None,
                updated_at=func.now(),
            )
            .returning(AnalysisWorkState.conversation_id, AnalysisWorkState.next_run_at)
        )
        completed_rows = session.execute(work_state_update).all()
        session.commit()

    immediate_rerun_count = sum(1 for row in completed_rows if row.next_run_at is not None)
    if immediate_rerun_count:
        log.info(
            "[MathUpdaterDB] Empty-matrix completion scheduled immediate rerun rows=%d claims=%s",
            immediate_rerun_count,
            _format_claims_for_log(claims),
        )
    return [
        WorkStateSchedule(
            conversation_id=row.conversation_id,
            next_run_at=row.next_run_at,
        )
        for row in completed_rows
    ]


def persist_computed_analysis_results_batch(
    engine: Engine,
    *,
    claims: list[ClaimedWorkItem],
    stored_input_snapshots_by_conversation_id: dict[int, StoredInputSnapshot],
    prepared_input_snapshots_by_conversation_id: dict[int, PreparedInputSnapshot],
    bundles_by_conversation_id: dict[int, ComputedAnalysisBundle],
    ai_generation_expected: bool,
    translation_expected: bool,
) -> PersistComputedAnalysisResult:
    if not claims:
        return PersistComputedAnalysisResult(
            analysis_schedules=[],
            ai_description_due_conversation_ids=[],
            ai_description_due_view_snapshot_ids=[],
            checkpoint_activation_context=None,
        )

    computed_at = datetime.now(UTC)
    with Session(engine) as session:
        log.info(
            "[MathUpdaterDB] Persist computed batch start claims=%s",
            _format_claims_for_log(claims),
        )
        premium_analysis_conversation_ids = _fetch_premium_analysis_conversation_ids(
            session,
            conversation_ids=[claim.conversation_id for claim in claims],
            now=computed_at,
        )
        log.info(
            "[MathUpdaterDB] Premium analysis enabled for %d/%d conversation(s)",
            len(premium_analysis_conversation_ids),
            len(claims),
        )
        conversation_content_id_by_conversation_id = (
            _fetch_conversation_content_id_by_conversation_id(
                session,
                conversation_ids=[claim.conversation_id for claim in claims],
            )
        )
        snapshot_insert = (
            sqlalchemy_insert(AnalysisSnapshot)
            .values(
                [
                    {
                        "conversation_id": claim.conversation_id,
                        "conversation_content_id": conversation_content_id_by_conversation_id.get(
                            claim.conversation_id
                        ),
                        "input_snapshot_id": stored_input_snapshots_by_conversation_id[
                            claim.conversation_id
                        ].id,
                        "data_generation": claim.data_generation,
                        "computed_at": computed_at,
                    }
                    for claim in claims
                ]
            )
            .returning(AnalysisSnapshot.id, AnalysisSnapshot.conversation_id)
        )
        snapshot_rows = session.execute(snapshot_insert).all()
        log.info(
            "[MathUpdaterDB] Inserted analysis_snapshot rows=%d",
            len(snapshot_rows),
        )
        snapshot_id_by_conversation_id = {row.conversation_id: row.id for row in snapshot_rows}
        snapshot_id_to_conversation_id = {
            snapshot_id: conversation_id
            for conversation_id, snapshot_id in snapshot_id_by_conversation_id.items()
        }

        snapshot_opinion_values: list[dict[str, object]] = []
        for claim in claims:
            snapshot = prepared_input_snapshots_by_conversation_id[claim.conversation_id]
            bundle = bundles_by_conversation_id[claim.conversation_id]
            opinion_by_local_index = {
                opinion.local_opinion_index: opinion for opinion in snapshot.opinions
            }
            for metrics in bundle.snapshot_opinions:
                opinion = opinion_by_local_index[metrics.local_opinion_index]
                snapshot_opinion_values.append(
                    {
                        "analysis_snapshot_id": snapshot_id_by_conversation_id[
                            claim.conversation_id
                        ],
                        "opinion_id": opinion.opinion_id,
                        "opinion_content_id": opinion.opinion_content_id,
                        "local_opinion_index": metrics.local_opinion_index,
                        "num_agrees": metrics.num_agrees,
                        "num_disagrees": metrics.num_disagrees,
                        "num_passes": metrics.num_passes,
                        "routing_priority": metrics.routing_priority,
                    }
                )
        snapshot_opinion_id_by_conversation_local_index: dict[tuple[int, int], int] = {}
        if snapshot_opinion_values:
            log.info(
                "[MathUpdaterDB] Inserting analysis_snapshot_opinion rows=%d",
                len(snapshot_opinion_values),
            )
            chunk_size = _max_rows_per_insert(column_count=8)
            if len(snapshot_opinion_values) > chunk_size:
                log.info(
                    "[MathUpdaterDB] Chunking analysis_snapshot_opinion rows=%d "
                    "max_rows_per_chunk=%d",
                    len(snapshot_opinion_values),
                    chunk_size,
                )
            inserted_snapshot_opinion_count = 0
            for chunk in _iter_chunks(snapshot_opinion_values, chunk_size=chunk_size):
                chunk_insert = (
                    sqlalchemy_insert(AnalysisSnapshotOpinion)
                    .values(chunk)
                    .returning(
                        AnalysisSnapshotOpinion.id,
                        AnalysisSnapshotOpinion.analysis_snapshot_id,
                        AnalysisSnapshotOpinion.local_opinion_index,
                    )
                )
                chunk_rows = session.execute(chunk_insert).all()
                inserted_snapshot_opinion_count += len(chunk_rows)
                snapshot_opinion_id_by_conversation_local_index.update(
                    {
                        (
                            snapshot_id_to_conversation_id[row.analysis_snapshot_id],
                            row.local_opinion_index,
                        ): row.id
                        for row in chunk_rows
                    }
                )
            log.info(
                "[MathUpdaterDB] Inserted analysis_snapshot_opinion rows=%d",
                inserted_snapshot_opinion_count,
            )

        result_insert = (
            sqlalchemy_insert(AnalysisSnapshotResult)
            .values(
                [
                    {
                        "conversation_id": claim.conversation_id,
                        "analysis_snapshot_id": snapshot_id_by_conversation_id[
                            claim.conversation_id
                        ],
                        "opinion_group_spec_id": claim.opinion_group_spec_id,
                        "outcome": bundles_by_conversation_id[claim.conversation_id].outcome,
                        "outcome_reason": bundles_by_conversation_id[
                            claim.conversation_id
                        ].outcome_reason,
                        "variants_enabled": claim.conversation_id
                        in premium_analysis_conversation_ids,
                    }
                    for claim in claims
                ]
            )
            .returning(
                AnalysisSnapshotResult.id,
                AnalysisSnapshotResult.analysis_snapshot_id,
                AnalysisSnapshotResult.opinion_group_spec_id,
            )
        )
        result_rows = session.execute(result_insert).all()
        log.info(
            "[MathUpdaterDB] Inserted analysis_snapshot_result rows=%d",
            len(result_rows),
        )
        result_id_by_conversation_id = {
            snapshot_id_to_conversation_id[row.analysis_snapshot_id]: row.id for row in result_rows
        }

        conversation_variant_pairs = [
            (claim.conversation_id, candidate.opinion_group_variant_id)
            for claim in claims
            for candidate in bundles_by_conversation_id[claim.conversation_id].candidates
        ]
        scope_id_by_pair = _get_or_create_lineage_scopes(
            session,
            conversation_variant_pairs=conversation_variant_pairs,
        )

        candidate_values = [
            {
                "snapshot_result_id": result_id_by_conversation_id[claim.conversation_id],
                "opinion_group_variant_id": candidate.opinion_group_variant_id,
                "scope_id": scope_id_by_pair[
                    (claim.conversation_id, candidate.opinion_group_variant_id)
                ],
                "outcome": candidate.outcome,
                "outcome_reason": candidate.outcome_reason,
                "raw_output": candidate.raw_output,
            }
            for claim in claims
            for candidate in bundles_by_conversation_id[claim.conversation_id].candidates
        ]
        candidate_insert = (
            sqlalchemy_insert(OpinionGroupCandidate)
            .values(candidate_values)
            .returning(
                OpinionGroupCandidate.id,
                OpinionGroupCandidate.snapshot_result_id,
                OpinionGroupCandidate.opinion_group_variant_id,
            )
        )
        log.info(
            "[MathUpdaterDB] Inserting opinion_group_candidate rows=%d",
            len(candidate_values),
        )
        candidate_rows = session.execute(candidate_insert).all()
        log.info(
            "[MathUpdaterDB] Inserted opinion_group_candidate rows=%d",
            len(candidate_rows),
        )
        result_id_to_conversation_id = {
            result_id: conversation_id
            for conversation_id, result_id in result_id_by_conversation_id.items()
        }
        candidate_id_by_conversation_variant = {
            (
                result_id_to_conversation_id[row.snapshot_result_id],
                row.opinion_group_variant_id,
            ): row.id
            for row in candidate_rows
        }
        allowed_candidate_ids_by_pair = artifact_candidate_ids_by_pair(
            claims=claims,
            bundles_by_conversation_id=bundles_by_conversation_id,
            candidate_id_by_conversation_variant=candidate_id_by_conversation_variant,
            premium_analysis_conversation_ids=premium_analysis_conversation_ids,
        )

        candidate_opinion_metric_values: list[dict[str, object]] = []
        for claim in claims:
            bundle = bundles_by_conversation_id[claim.conversation_id]
            for candidate in bundle.candidates:
                if candidate.outcome != AnalysisResultOutcomeEnum.success:
                    continue
                candidate_id = candidate_id_by_conversation_variant[
                    (claim.conversation_id, candidate.opinion_group_variant_id)
                ]
                candidate_opinion_metric_values.extend(
                    {
                        "candidate_id": candidate_id,
                        "analysis_snapshot_opinion_id": (
                            snapshot_opinion_id_by_conversation_local_index[
                                (claim.conversation_id, metric.local_opinion_index)
                            ]
                        ),
                        "group_aware_consensus_agree": metric.group_aware_consensus_agree,
                        "group_aware_consensus_disagree": metric.group_aware_consensus_disagree,
                        "divisiveness": metric.divisiveness,
                        "majority_type": metric.majority_type,
                        "majority_probability_success": metric.majority_probability_success,
                        "agreement_rank": metric.agreement_rank,
                        "disagreement_rank": metric.disagreement_rank,
                        "divisiveness_rank": metric.divisiveness_rank,
                    }
                    for metric in candidate.opinion_metrics
                    if (
                        claim.conversation_id,
                        metric.local_opinion_index,
                    )
                    in snapshot_opinion_id_by_conversation_local_index
                )
        if candidate_opinion_metric_values:
            log.info(
                "[MathUpdaterDB] Inserting opinion_group_candidate_opinion_metrics rows=%d",
                len(candidate_opinion_metric_values),
            )
            chunk_size = _max_rows_per_insert(column_count=10)
            if len(candidate_opinion_metric_values) > chunk_size:
                log.info(
                    "[MathUpdaterDB] Chunking opinion_group_candidate_opinion_metrics "
                    "rows=%d max_rows_per_chunk=%d",
                    len(candidate_opinion_metric_values),
                    chunk_size,
                )
            for chunk in _iter_chunks(candidate_opinion_metric_values, chunk_size=chunk_size):
                session.execute(
                    sqlalchemy_insert(OpinionGroupCandidateOpinionMetrics).values(chunk)
                )

        assessment_values: list[dict[str, object]] = []
        for claim in claims:
            bundle = bundles_by_conversation_id[claim.conversation_id]
            for candidate in bundle.candidates:
                if candidate.assessment is None:
                    continue
                candidate_id = candidate_id_by_conversation_variant[
                    (claim.conversation_id, candidate.opinion_group_variant_id)
                ]
                assessment_values.append(
                    {
                        "candidate_id": candidate_id,
                        "silhouette_score": candidate.assessment.silhouette_score,
                        "coefficient_of_variation": candidate.assessment.coefficient_of_variation,
                        "balance_score": candidate.assessment.balance_score,
                        "selection_score": candidate.assessment.selection_score,
                        "hidden_reason": candidate.assessment.hidden_reason,
                    }
                )
        if assessment_values:
            log.info(
                "[MathUpdaterDB] Inserting opinion_group_candidate_assessment rows=%d",
                len(assessment_values),
            )
            session.execute(
                sqlalchemy_insert(OpinionGroupCandidateAssessment).values(assessment_values)
            )

        lineage_id_by_candidate_group_key = _assign_lineages_for_groups(
            session,
            claims=claims,
            bundles_by_conversation_id=bundles_by_conversation_id,
            prepared_input_snapshots_by_conversation_id=prepared_input_snapshots_by_conversation_id,
            candidate_id_by_conversation_variant=candidate_id_by_conversation_variant,
            scope_id_by_pair=scope_id_by_pair,
        )

        group_values: list[dict[str, object]] = []
        for claim in claims:
            bundle = bundles_by_conversation_id[claim.conversation_id]
            for candidate in bundle.candidates:
                if candidate.outcome != AnalysisResultOutcomeEnum.success:
                    continue
                candidate_id = candidate_id_by_conversation_variant[
                    (claim.conversation_id, candidate.opinion_group_variant_id)
                ]
                scope_id = scope_id_by_pair[
                    (claim.conversation_id, candidate.opinion_group_variant_id)
                ]
                for group in candidate.groups:
                    group_values.append(
                        {
                            "candidate_id": candidate_id,
                            "scope_id": scope_id,
                            "lineage_id": lineage_id_by_candidate_group_key.get(
                                (candidate_id, group.key)
                            ),
                            "key": group.key,
                            "external_id": group.external_id,
                            "num_users": len(group.local_participant_indexes),
                        }
                    )
        group_id_by_candidate_key: dict[tuple[int, str], int] = {}
        if group_values:
            log.info(
                "[MathUpdaterDB] Inserting opinion_group rows=%d",
                len(group_values),
            )
            group_insert = (
                sqlalchemy_insert(OpinionGroup)
                .values(group_values)
                .returning(OpinionGroup.id, OpinionGroup.candidate_id, OpinionGroup.key)
            )
            group_rows = session.execute(group_insert).all()
            log.info(
                "[MathUpdaterDB] Inserted opinion_group rows=%d",
                len(group_rows),
            )
            group_id_by_candidate_key = {(row.candidate_id, row.key): row.id for row in group_rows}

        group_user_values: list[dict[str, object]] = []
        group_opinion_values: list[_GroupOpinionStatsInsertValue] = []
        for claim in claims:
            snapshot = prepared_input_snapshots_by_conversation_id[claim.conversation_id]
            user_id_by_local_index = {
                participant.local_participant_index: participant.user_id
                for participant in snapshot.participants
            }
            snapshot_opinion_id_by_local_index = {
                opinion.local_opinion_index: snapshot_opinion_id
                for opinion in snapshot.opinions
                if (
                    snapshot_opinion_id := snapshot_opinion_id_by_conversation_local_index.get(
                        (claim.conversation_id, opinion.local_opinion_index)
                    )
                )
                is not None
            }
            bundle = bundles_by_conversation_id[claim.conversation_id]
            for candidate in bundle.candidates:
                if candidate.outcome != AnalysisResultOutcomeEnum.success:
                    continue
                candidate_id = candidate_id_by_conversation_variant[
                    (claim.conversation_id, candidate.opinion_group_variant_id)
                ]
                for group in candidate.groups:
                    group_id = group_id_by_candidate_key[(candidate_id, group.key)]
                    group_user_values.extend(
                        {
                            "candidate_id": candidate_id,
                            "group_id": group_id,
                            "user_id": user_id_by_local_index[local_participant_index],
                        }
                        for local_participant_index in group.local_participant_indexes
                    )
                    for opinion_stats in group.opinion_stats:
                        snapshot_opinion_id = snapshot_opinion_id_by_local_index.get(
                            opinion_stats.local_opinion_index
                        )
                        if snapshot_opinion_id is None:
                            continue
                        group_opinion_values.append(
                            _group_opinion_stats_insert_value(
                                group_id=group_id,
                                analysis_snapshot_opinion_id=snapshot_opinion_id,
                                opinion_stats=opinion_stats,
                            )
                        )
        if group_user_values:
            log.info(
                "[MathUpdaterDB] Inserting opinion_group_user rows=%d",
                len(group_user_values),
            )
            chunk_size = _max_rows_per_insert(column_count=3)
            if len(group_user_values) > chunk_size:
                log.info(
                    "[MathUpdaterDB] Chunking opinion_group_user rows=%d "
                    "max_rows_per_chunk=%d",
                    len(group_user_values),
                    chunk_size,
                )
            for chunk in _iter_chunks(group_user_values, chunk_size=chunk_size):
                session.execute(sqlalchemy_insert(OpinionGroupUser).values(chunk))
        if group_opinion_values:
            duplicates = _duplicate_group_opinion_stat_keys(group_opinion_values)
            invalid_representative_count = _invalid_representative_group_opinion_stat_count(
                group_opinion_values
            )
            if duplicates:
                log.warning(
                    "[MathUpdaterDB] Duplicate opinion_group_opinion_stats keys before insert: %s",
                    duplicates[:20],
                )
            if invalid_representative_count:
                log.warning(
                    "[MathUpdaterDB] Invalid representative stats before insert rows=%d",
                    invalid_representative_count,
                )
            log.info(
                "[MathUpdaterDB] Inserting opinion_group_opinion_stats rows=%d "
                "duplicates=%d invalid_representative=%d",
                len(group_opinion_values),
                len(duplicates),
                invalid_representative_count,
            )
            chunk_size = _max_rows_per_insert(column_count=9)
            if len(group_opinion_values) > chunk_size:
                log.info(
                    "[MathUpdaterDB] Chunking opinion_group_opinion_stats rows=%d "
                    "max_rows_per_chunk=%d",
                    len(group_opinion_values),
                    chunk_size,
                )
            for chunk in _iter_chunks(group_opinion_values, chunk_size=chunk_size):
                session.execute(
                    sqlalchemy_insert(OpinionGroupOpinionStats).values(
                        [dict(value) for value in chunk]
                    )
                )
            log.info(
                "[MathUpdaterDB] Inserted opinion_group_opinion_stats rows=%d",
                len(group_opinion_values),
            )

        survey_aggregate_snapshot_id_by_conversation_id = _persist_survey_aggregate_snapshots(
            session,
            claims=claims,
            snapshot_id_by_conversation_id=snapshot_id_by_conversation_id,
            prepared_input_snapshots_by_conversation_id=prepared_input_snapshots_by_conversation_id,
            bundles_by_conversation_id=bundles_by_conversation_id,
            candidate_id_by_conversation_variant=candidate_id_by_conversation_variant,
            artifact_candidate_ids_by_pair=allowed_candidate_ids_by_pair,
            group_id_by_candidate_key=group_id_by_candidate_key,
        )
        log.info(
            "[MathUpdaterDB] Persisted survey aggregate snapshots=%d",
            len(survey_aggregate_snapshot_id_by_conversation_id),
        )

        persisted_view_snapshots_by_pair, current_options_by_pair = (
            _persist_conversation_view_snapshots(
                session,
                claims=claims,
                snapshot_id_by_conversation_id=snapshot_id_by_conversation_id,
                prepared_input_snapshots_by_conversation_id=(
                    prepared_input_snapshots_by_conversation_id
                ),
                bundles_by_conversation_id=bundles_by_conversation_id,
                candidate_id_by_conversation_variant=candidate_id_by_conversation_variant,
                survey_aggregate_snapshot_id_by_conversation_id=(
                    survey_aggregate_snapshot_id_by_conversation_id
                ),
                premium_analysis_conversation_ids=premium_analysis_conversation_ids,
                ai_generation_expected=ai_generation_expected,
            )
        )
        log.info(
            "[MathUpdaterDB] Persisted conversation view snapshots=%d checkpoint_option_groups=%d",
            len(persisted_view_snapshots_by_pair),
            len(current_options_by_pair),
        )
        immediate_checkpoint_view_snapshots_by_pair = {
            pair: persisted
            for pair, persisted in persisted_view_snapshots_by_pair.items()
            if not (
                persisted.conversation_state.ai_labeling_enabled
                and ai_generation_expected
                and persisted.selected_candidate is not None
            )
        }
        first_pass_checkpoint_view_snapshots_by_pair = {
            pair: persisted
            for pair, persisted in persisted_view_snapshots_by_pair.items()
            if pair not in immediate_checkpoint_view_snapshots_by_pair
        }
        _persist_checkpoint_reasons(
            session,
            persisted_view_snapshots_by_pair=immediate_checkpoint_view_snapshots_by_pair,
            current_options_by_pair=current_options_by_pair,
        )
        log.info("[MathUpdaterDB] Persisted checkpoint reasons")
        _queue_conversation_analysis_updated_events_for_view_snapshots(
            session,
            conversation_view_snapshot_ids=[
                view_snapshot.view_snapshot_id
                for view_snapshot in persisted_view_snapshots_by_pair.values()
            ],
        )

        _create_lineage_description_work_rows(
            session,
            persisted_view_snapshots_by_pair=persisted_view_snapshots_by_pair,
            artifact_candidate_ids_by_pair=allowed_candidate_ids_by_pair,
            ai_generation_expected=ai_generation_expected,
        )

        ai_description_due_conversation_ids = _create_ai_description_locale_status_rows(
            session,
            persisted_view_snapshots_by_pair=persisted_view_snapshots_by_pair,
            result_id_by_conversation_id=result_id_by_conversation_id,
            ai_generation_expected=ai_generation_expected,
            translation_expected=translation_expected,
        )
        log.info(
            "[MathUpdaterDB] Created AI description locale work conversation_count=%d",
            len(ai_description_due_conversation_ids),
        )

        persisted_snapshot_id = case(
            {claim.id: snapshot_id_by_conversation_id[claim.conversation_id] for claim in claims},
            value=AnalysisWorkState.id,
        )
        persisted_marker_rows = session.execute(
            update(AnalysisWorkState)
            .where(
                and_(
                    AnalysisWorkState.id.in_([claim.id for claim in claims]),
                    tuple_(AnalysisWorkState.id, AnalysisWorkState.lease_token).in_(
                        [(claim.id, claim.lease_token) for claim in claims]
                    ),
                    AnalysisWorkState.running_data_generation
                    == case(
                        {claim.id: claim.data_generation for claim in claims},
                        value=AnalysisWorkState.id,
                    ),
                )
            )
            .values(
                persisted_analysis_snapshot_id=persisted_snapshot_id,
                updated_at=func.now(),
            )
            .returning(AnalysisWorkState.id)
        ).all()
        if len(persisted_marker_rows) != len(claims):
            msg = "failed to mark every computed analysis work item as persisted"
            raise AnalysisWorkStatePersistenceError(msg)

        session.commit()
        log.info("[MathUpdaterDB] Persist computed batch committed; enrichment first pass pending")

    return PersistComputedAnalysisResult(
        analysis_schedules=[],
        ai_description_due_conversation_ids=ai_description_due_conversation_ids,
        ai_description_due_view_snapshot_ids=[
            persisted.view_snapshot_id
            for persisted in persisted_view_snapshots_by_pair.values()
            if persisted.conversation_state.ai_labeling_enabled
        ],
        checkpoint_activation_context=CheckpointActivationContext(
            persisted_view_snapshots_by_pair=first_pass_checkpoint_view_snapshots_by_pair,
            current_options_by_pair=current_options_by_pair,
        )
        if first_pass_checkpoint_view_snapshots_by_pair
        else None,
    )


def complete_computed_analysis_work_items_batch(
    engine: Engine,
    *,
    claims: list[ClaimedWorkItem],
    require_display_safe_activation: bool = False,
) -> list[WorkStateSchedule]:
    if not claims:
        return []

    completed_generation = case(
        {claim.id: claim.data_generation for claim in claims},
        value=AnalysisWorkState.id,
    )
    current_generation = (
        select(Conversation.analysis_data_generation)
        .where(Conversation.id == AnalysisWorkState.conversation_id)
        .scalar_subquery()
    )
    next_run_at = case(
        (current_generation > completed_generation, func.now()),
        else_=None,
    )
    completion_filters: list[ColumnElement[bool]] = [
        AnalysisWorkState.id.in_([claim.id for claim in claims]),
        tuple_(AnalysisWorkState.id, AnalysisWorkState.lease_token).in_(
            [(claim.id, claim.lease_token) for claim in claims]
        ),
        AnalysisWorkState.running_data_generation == completed_generation,
    ]
    if require_display_safe_activation:
        unactivated_current_generation_snapshot_exists = (
            select(ConversationViewSnapshot.id)
            .join(
                AnalysisSnapshot,
                AnalysisSnapshot.id == ConversationViewSnapshot.analysis_snapshot_id,
            )
            .where(
                and_(
                    ConversationViewSnapshot.analysis_snapshot_id
                    == AnalysisWorkState.persisted_analysis_snapshot_id,
                    ConversationViewSnapshot.opinion_group_spec_id
                    == AnalysisWorkState.opinion_group_spec_id,
                    ConversationViewSnapshot.view_reason
                    == ConversationViewSnapshotReasonEnum.analysis_completed,
                    ConversationViewSnapshot.activated_at.is_(None),
                    AnalysisSnapshot.data_generation == completed_generation,
                )
            )
            .exists()
        )
        completion_filters.append(
            or_(
                current_generation > completed_generation,
                ~unactivated_current_generation_snapshot_exists,
            )
        )
    work_state_update = (
        update(AnalysisWorkState)
        .where(and_(*completion_filters))
        .values(
            last_completed_data_generation=case(
                (
                    AnalysisWorkState.last_completed_data_generation > completed_generation,
                    AnalysisWorkState.last_completed_data_generation,
                ),
                else_=completed_generation,
            ),
            running_data_generation=None,
            persisted_analysis_snapshot_id=None,
            dirty_since=case(
                (current_generation > completed_generation, func.now()),
                else_=None,
            ),
            next_run_at=next_run_at,
            non_retryable_generation=None,
            non_retryable_analysis_engine_epoch=None,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            last_error_code=None,
            last_error_message=None,
            updated_at=func.now(),
        )
        .returning(AnalysisWorkState.conversation_id, AnalysisWorkState.next_run_at)
    )

    with Session(engine) as session:
        completed_rows = session.execute(work_state_update).all()
        session.commit()

    immediate_rerun_count = sum(1 for row in completed_rows if row.next_run_at is not None)
    log.info(
        "[MathUpdaterDB] Completed computed analysis work rows=%d immediate_rerun=%d claims=%s",
        len(completed_rows),
        immediate_rerun_count,
        _format_claims_for_log(claims),
    )
    return [
        WorkStateSchedule(
            conversation_id=row.conversation_id,
            next_run_at=row.next_run_at,
        )
        for row in completed_rows
    ]


def retry_scheduled_work_items_batch(
    engine: Engine,
    *,
    claims: list[ClaimedWorkItem],
    retry_policy: RetryPolicy,
    error_code: str,
    error_message: str,
) -> list[WorkStateSchedule]:
    if not claims:
        return []

    now = datetime.now(UTC)
    retry_at_by_work_state_id = {
        claim.id: next_retry_at(
            now=now,
            attempt_count=claim.attempt_count,
            policy=retry_policy,
        )
        for claim in claims
    }
    claim_pairs = [(claim.id, claim.lease_token) for claim in claims]
    failed_generation = case(
        {claim.id: claim.data_generation for claim in claims},
        value=AnalysisWorkState.id,
    )
    current_generation = (
        select(Conversation.analysis_data_generation)
        .where(Conversation.id == AnalysisWorkState.conversation_id)
        .scalar_subquery()
    )
    next_run_at = case(
        (current_generation > failed_generation, func.now()),
        else_=case(retry_at_by_work_state_id, value=AnalysisWorkState.id),
    )
    query = (
        update(AnalysisWorkState)
        .where(
            and_(
                AnalysisWorkState.id.in_([claim.id for claim in claims]),
                tuple_(AnalysisWorkState.id, AnalysisWorkState.lease_token).in_(claim_pairs),
                AnalysisWorkState.running_data_generation == failed_generation,
            )
        )
        .values(
            running_data_generation=None,
            persisted_analysis_snapshot_id=None,
            next_run_at=next_run_at,
            dirty_since=case(
                (current_generation > failed_generation, func.now()),
                else_=AnalysisWorkState.dirty_since,
            ),
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            last_error_code=error_code,
            last_error_message=error_message,
            updated_at=func.now(),
        )
        .returning(AnalysisWorkState.conversation_id, AnalysisWorkState.next_run_at)
    )

    with Session(engine) as session:
        rows = session.execute(query).all()
        session.commit()

    immediate_rerun_count = sum(1 for row in rows if row.next_run_at is not None)
    if rows:
        log.info(
            "[MathUpdaterDB] Retry scheduled analysis work rows=%d immediate_rerun=%d "
            "error_code=%s claims=%s",
            len(rows),
            immediate_rerun_count,
            error_code,
            _format_claims_for_log(claims),
        )
    return [
        WorkStateSchedule(
            conversation_id=row.conversation_id,
            next_run_at=row.next_run_at,
        )
        for row in rows
    ]


def mark_non_retryable_work_items_batch(
    engine: Engine,
    *,
    claims: list[ClaimedWorkItem],
    analysis_engine_epoch: int,
    error_code: str,
    error_message: str,
) -> list[WorkStateSchedule]:
    if not claims:
        return []

    failed_generation = case(
        {claim.id: claim.data_generation for claim in claims},
        value=AnalysisWorkState.id,
    )
    current_generation = (
        select(Conversation.analysis_data_generation)
        .where(Conversation.id == AnalysisWorkState.conversation_id)
        .scalar_subquery()
    )
    newer_generation_exists = current_generation > failed_generation
    query = (
        update(AnalysisWorkState)
        .where(
            and_(
                AnalysisWorkState.id.in_([claim.id for claim in claims]),
                tuple_(AnalysisWorkState.id, AnalysisWorkState.lease_token).in_(
                    [(claim.id, claim.lease_token) for claim in claims]
                ),
                AnalysisWorkState.running_data_generation == failed_generation,
            )
        )
        .values(
            running_data_generation=None,
            persisted_analysis_snapshot_id=None,
            next_run_at=case(
                (newer_generation_exists, func.now()),
                else_=None,
            ),
            dirty_since=case(
                (newer_generation_exists, func.now()),
                else_=AnalysisWorkState.dirty_since,
            ),
            non_retryable_generation=case(
                (newer_generation_exists, None),
                else_=failed_generation,
            ),
            non_retryable_analysis_engine_epoch=case(
                (newer_generation_exists, None),
                else_=analysis_engine_epoch,
            ),
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            last_error_code=error_code,
            last_error_message=error_message,
            updated_at=func.now(),
        )
        .returning(AnalysisWorkState.conversation_id, AnalysisWorkState.next_run_at)
    )

    with Session(engine) as session:
        rows = session.execute(query).all()
        session.commit()

    immediate_rerun_count = sum(1 for row in rows if row.next_run_at is not None)
    if rows:
        log.info(
            "[MathUpdaterDB] Marked analysis work non-retryable rows=%d "
            "immediate_rerun=%d error_code=%s claims=%s",
            len(rows),
            immediate_rerun_count,
            error_code,
            _format_claims_for_log(claims),
        )
    return [
        WorkStateSchedule(
            conversation_id=row.conversation_id,
            next_run_at=row.next_run_at,
        )
        for row in rows
    ]
