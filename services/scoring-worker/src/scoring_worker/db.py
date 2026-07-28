"""Database queries for the scoring worker.

Uses SQLAlchemy 2.0 ORM with generated models for type-safe queries.
Column name typos are caught by basedpyright at static analysis time.
"""

from __future__ import annotations

import html
import json
import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, TypedDict, cast

import regex
from sqlalchemy import and_, delete, or_, select, text, update
from sqlalchemy.orm import Session

from scoring_worker.generated_models import (
    Conversation,
    MaxdiffComparison,
    MaxdiffResult,
    MaxdiffUserEntityScore,
    RankingConversationConfig,
    RankingConversationStatsCheckpoint,
    RankingConversationStatsItem,
    RankingConversationStatsSnapshot,
    RankingItem,
    RankingItemContent,
    RankingItemExternalSource,
    RankingItemLifecycleStatus,
    RankingScore,
    RankingScoreEntity,
    RankingStatsCheckpointReasonEnum,
    RealtimeEventOutbox,
    SurveyAnswer,
    SurveyAnswerOption,
    SurveyConfig,
    SurveyQuestion,
    SurveyQuestionContent,
    SurveyQuestionOption,
    SurveyResponse,
    User,
)
from scoring_worker.pipeline_config import PIPELINE_CONFIG

log = logging.getLogger(__name__)
PARTICIPANT_MILESTONE_SEEDS = (2,)
VOTE_MILESTONE_SEEDS: tuple[int, ...] = ()
MILESTONE_MULTIPLIERS = ((1, 1), (25, 10), (5, 1))
SCORING_ADVISORY_LOCK_NAMESPACE = 1_397_705_809

if TYPE_CHECKING:
    from collections.abc import Callable
    from uuid import UUID

    from sqlalchemy import Connection, Engine


@dataclass(frozen=True)
class ComparisonRow:
    best_slug_id: str
    worst_slug_id: str
    candidate_set: list[str]
    user_idx: int


@dataclass(frozen=True)
class ScoredEntity:
    entity_slug_id: str
    score: float
    uncertainty_left: float
    uncertainty_right: float
    participant_count: int


@dataclass(frozen=True)
class RankingItemSnapshotInput:
    item_id: int
    slug_id: str
    content_id: int
    lifecycle_status: RankingItemLifecycleStatus
    external_url: str | None


class RankingCheckpointInsert(TypedDict):
    stats_snapshot_id: int
    conversation_id: int
    reason: RankingStatsCheckpointReasonEnum
    participant_milestone: int | None
    vote_milestone: int | None


class RankingStatsEventPayload(TypedDict):
    conversationSlugId: str
    rankingStatsSnapshotId: int
    checkpointChanged: bool
    opinionCount: int
    totalOpinionCount: int
    voteCount: int
    totalVoteCount: int
    participantCount: int
    totalParticipantCount: int
    moderatedOpinionCount: int
    hiddenOpinionCount: int
    isClosed: bool
    timestamp: int


def checkpoint_milestones_at_or_below(*, count: int, seeds: tuple[int, ...]) -> list[int]:
    """Return the shared 1/2.5/5 milestone sequence up to a count."""
    milestones = {seed for seed in seeds if seed <= count}
    base = 10
    while base <= count:
        for numerator, denominator in MILESTONE_MULTIPLIERS:
            milestone = (base * numerator) // denominator
            if milestone <= count:
                milestones.add(milestone)
        base *= 10
    return sorted(milestones)


def acquire_conversation_locks(
    engine: Engine,
    *,
    conversation_ids: list[int],
) -> tuple[frozenset[int], Connection, Callable[[], None]]:
    """Acquire session-level locks that serialize workers per conversation."""
    connection = engine.connect()
    locked_conversation_ids: list[int] = []
    try:
        for conversation_id in sorted(set(conversation_ids)):
            acquired = connection.execute(
                text("SELECT pg_try_advisory_lock(:namespace, :conversation_id)"),
                {
                    "namespace": SCORING_ADVISORY_LOCK_NAMESPACE,
                    "conversation_id": conversation_id,
                },
            ).scalar_one()
            if acquired:
                locked_conversation_ids.append(conversation_id)
    except Exception:
        try:
            for conversation_id in locked_conversation_ids:
                connection.execute(
                    text("SELECT pg_advisory_unlock(:namespace, :conversation_id)"),
                    {
                        "namespace": SCORING_ADVISORY_LOCK_NAMESPACE,
                        "conversation_id": conversation_id,
                    },
                )
        finally:
            connection.close()
        raise

    connection.commit()

    def release() -> None:
        try:
            for conversation_id in locked_conversation_ids:
                connection.execute(
                    text("SELECT pg_advisory_unlock(:namespace, :conversation_id)"),
                    {
                        "namespace": SCORING_ADVISORY_LOCK_NAMESPACE,
                        "conversation_id": conversation_id,
                    },
                )
        finally:
            connection.close()

    return frozenset(locked_conversation_ids), connection, release


@dataclass(frozen=True)
class SurveyQuestionAnalysisRecord:
    question_id: int
    question_type: str
    current_semantic_version: int
    is_required: bool
    constraints: dict[str, Any]
    option_slug_ids: tuple[str, ...]


@dataclass(frozen=True)
class SurveyStoredAnswerAnalysisRecord:
    answered_question_semantic_version: int
    text_value_html: str | None
    option_slug_ids: tuple[str, ...]


def _normalize_counted_text(value: str) -> str:
    return re.sub(r"\n+", "\n", value).strip("\n")


def _convert_html_to_counted_text(html_string: str) -> str:
    text_with_newlines = re.sub(
        r"</(?:p|li|div|h[1-6])>",
        "\n",
        html_string,
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
    return _normalize_counted_text(html.unescape(plain_text))


def _convert_html_to_counted_text_fallback(html_string: str) -> str:
    text_with_newlines = re.sub(
        r"</(?:p|li|div|h[1-6])>",
        "\n",
        html_string,
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
    return _normalize_counted_text(plain_text)


def _html_to_counted_text(html_string: str) -> str:
    try:
        return _convert_html_to_counted_text(html_string)
    except Exception:
        log.warning(
            "HTML-to-text conversion failed; using best-effort text (HTML length: %d)",
            len(html_string),
            exc_info=True,
        )
        return _convert_html_to_counted_text_fallback(html_string)


def _has_visible_plain_text(value: str) -> bool:
    return bool(
        regex.sub(r"[\p{Cc}\p{Default_Ignorable_Code_Point}]", "", value).strip()
    )


def _count_graphemes(value: str) -> int:
    return len(regex.findall(r"\X", value))


def _utf16_length(value: str) -> int:
    return len(value.encode("utf-16-le")) // 2


def _validate_survey_answer_for_analysis(
    *,
    question: SurveyQuestionAnalysisRecord,
    answer: SurveyStoredAnswerAnalysisRecord,
) -> bool:
    if answer.answered_question_semantic_version != question.current_semantic_version:
        return False

    if question.question_type == "free_text":
        if question.constraints["type"] != "free_text":
            return False
        text_value_html = answer.text_value_html or ""
        if question.constraints.get("inputMode") == "integer":
            if re.fullmatch(r"[0-9]+", text_value_html) is None:
                return False
            parsed_value = int(text_value_html)
            if parsed_value > 9_007_199_254_740_991:
                return False
            min_value = int(question.constraints["minValue"])
            max_value_raw = question.constraints.get("maxValue")
            max_value = int(max_value_raw) if max_value_raw is not None else None
            return parsed_value >= min_value and (
                max_value is None or parsed_value <= max_value
            )

        if _utf16_length(text_value_html) > int(question.constraints["maxHtmlLength"]):
            return False
        plain_text = _html_to_counted_text(text_value_html)
        if not _has_visible_plain_text(plain_text):
            return False
        plain_text_length = _count_graphemes(plain_text)
        min_plain_text_length = max(int(question.constraints.get("minPlainTextLength", 0)), 1)
        return (
            min_plain_text_length
            <= plain_text_length
            <= int(question.constraints["maxPlainTextLength"])
        )

    unique_option_slug_ids = set(answer.option_slug_ids)
    if len(unique_option_slug_ids) != len(answer.option_slug_ids):
        return False
    if not unique_option_slug_ids.issubset(set(question.option_slug_ids)):
        return False

    if question.question_type != "choice" or question.constraints["type"] != "choice":
        return False
    min_selections = int(question.constraints["minSelections"])
    max_selections_raw = question.constraints.get("maxSelections")
    max_selections = int(max_selections_raw) if max_selections_raw is not None else None
    if len(answer.option_slug_ids) < min_selections:
        return False
    return max_selections is None or len(answer.option_slug_ids) <= max_selections


def derive_survey_gate_status_for_analysis(
    *,
    has_survey: bool,
    questions: list[SurveyQuestionAnalysisRecord],
    answers_by_question_id: dict[int, SurveyStoredAnswerAnalysisRecord],
    withdrawn_at: datetime | None,
) -> str:
    if not has_survey:
        return "no_survey"

    required_questions = [question for question in questions if question.is_required]
    if not required_questions:
        return "complete_valid"
    if withdrawn_at is not None:
        return "withdrawn"

    valid_required_answer_count = 0
    stale_required_question_count = 0
    for question in required_questions:
        stored_answer = answers_by_question_id.get(question.question_id)
        if stored_answer is None:
            continue
        if _validate_survey_answer_for_analysis(question=question, answer=stored_answer):
            valid_required_answer_count += 1
        else:
            stale_required_question_count += 1

    if stale_required_question_count > 0:
        return "needs_update"
    if valid_required_answer_count == len(required_questions):
        return "complete_valid"
    if answers_by_question_id:
        return "in_progress"
    return "not_started"


def is_survey_gate_status_eligible_for_analysis(
    *, survey_gate_status: str, is_optional: bool = False
) -> bool:
    if is_optional:
        return True

    return survey_gate_status in {"no_survey", "complete_valid"}


def _fetch_survey_eligible_participants_batch(
    session: Session,
    *,
    conversation_ids: list[int],
    candidate_participant_ids_by_conv: dict[int, set[UUID]],
) -> dict[int, set[UUID]]:
    if not conversation_ids:
        return {}

    survey_configs = session.execute(
        select(SurveyConfig.id, SurveyConfig.conversation_id, SurveyConfig.is_optional).where(
            and_(
                SurveyConfig.conversation_id.in_(conversation_ids),
                SurveyConfig.deleted_at.is_(None),
            )
        )
    ).all()
    if not survey_configs:
        return {}

    survey_config_ids = [row.id for row in survey_configs if not row.is_optional]
    if not survey_config_ids:
        return {}

    conversation_id_by_survey_config_id = {row.id: row.conversation_id for row in survey_configs}

    question_rows = session.execute(
        select(
            SurveyQuestion.id,
            SurveyQuestion.survey_config_id,
            SurveyQuestion.question_type,
            SurveyQuestion.current_semantic_version,
            SurveyQuestion.is_required,
            SurveyQuestionContent.constraints,
        )
        .join(
            SurveyQuestionContent,
            SurveyQuestion.current_content_id == SurveyQuestionContent.id,
        )
        .where(
            and_(
                SurveyQuestion.survey_config_id.in_(survey_config_ids),
                SurveyQuestion.current_content_id.is_not(None),
            )
        )
        .order_by(SurveyQuestion.display_order)
    ).all()

    question_ids = [row.id for row in question_rows]
    option_rows = cast(
        "list[tuple[int, str]]",
        session.execute(
            select(
                SurveyQuestionOption.survey_question_id,
                SurveyQuestionOption.slug_id,
            ).where(
                and_(
                    SurveyQuestionOption.survey_question_id.in_(question_ids),
                    SurveyQuestionOption.current_content_id.is_not(None),
                )
            )
        )
        .tuples()
        .all()
        if question_ids
        else [],
    )
    option_slug_ids_by_question_id: dict[int, list[str]] = {}
    for option_row in option_rows:
        option_slug_ids_by_question_id.setdefault(option_row[0], []).append(option_row[1])

    questions_by_conversation_id: dict[int, list[SurveyQuestionAnalysisRecord]] = {}
    for question_row in question_rows:
        conversation_id = conversation_id_by_survey_config_id[question_row.survey_config_id]
        questions_by_conversation_id.setdefault(conversation_id, []).append(
            SurveyQuestionAnalysisRecord(
                question_id=question_row.id,
                question_type=str(question_row.question_type),
                current_semantic_version=question_row.current_semantic_version,
                is_required=question_row.is_required,
                constraints=dict(question_row.constraints),
                option_slug_ids=tuple(option_slug_ids_by_question_id.get(question_row.id, [])),
            )
        )

    candidate_pairs = [
        (conversation_id, participant_id)
        for conversation_id, participant_ids in candidate_participant_ids_by_conv.items()
        for participant_id in participant_ids
        if conversation_id in questions_by_conversation_id
    ]
    if not candidate_pairs:
        return {conversation_id: set() for conversation_id in questions_by_conversation_id}

    response_rows = session.execute(
        select(
            SurveyResponse.id,
            SurveyResponse.conversation_id,
            SurveyResponse.participant_id,
            SurveyResponse.withdrawn_at,
        ).where(
            and_(
                SurveyResponse.conversation_id.in_(list(questions_by_conversation_id.keys())),
                SurveyResponse.participant_id.in_([pair[1] for pair in candidate_pairs]),
            )
        )
    ).all()
    if not response_rows:
        return {conversation_id: set() for conversation_id in questions_by_conversation_id}

    response_ids = [row.id for row in response_rows]
    answer_rows = session.execute(
        select(
            SurveyAnswer.survey_response_id,
            SurveyAnswer.id,
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
    answer_option_rows = cast(
        "list[tuple[int, str]]",
        session.execute(
            select(
                SurveyAnswerOption.survey_answer_id,
                SurveyQuestionOption.slug_id,
            )
            .join(
                SurveyQuestionOption,
                SurveyAnswerOption.survey_question_option_id == SurveyQuestionOption.id,
            )
            .where(SurveyAnswerOption.survey_answer_id.in_(answer_ids))
            .where(
                and_(
                    SurveyAnswerOption.deleted_at.is_(None),
                    SurveyQuestionOption.current_content_id.is_not(None),
                )
            )
        )
        .tuples()
        .all()
        if answer_ids
        else [],
    )

    option_slug_ids_by_answer_id: dict[int, list[str]] = {}
    for row in answer_option_rows:
        option_slug_ids_by_answer_id.setdefault(row[0], []).append(row[1])

    answers_by_response_id: dict[int, dict[int, SurveyStoredAnswerAnalysisRecord]] = {}
    for row in answer_rows:
        answers_by_response_id.setdefault(row.survey_response_id, {})[row.survey_question_id] = (
            SurveyStoredAnswerAnalysisRecord(
                answered_question_semantic_version=row.answered_question_semantic_version,
                text_value_html=row.text_value_html,
                option_slug_ids=tuple(option_slug_ids_by_answer_id.get(row.id, [])),
            )
        )

    eligible_participant_ids_by_conv: dict[int, set[UUID]] = {
        conversation_id: set() for conversation_id in questions_by_conversation_id
    }
    for response_row in response_rows:
        survey_gate_status = derive_survey_gate_status_for_analysis(
            has_survey=True,
            questions=questions_by_conversation_id[response_row.conversation_id],
            answers_by_question_id=answers_by_response_id.get(response_row.id, {}),
            withdrawn_at=response_row.withdrawn_at,
        )
        if is_survey_gate_status_eligible_for_analysis(survey_gate_status=survey_gate_status):
            eligible_participant_ids_by_conv[response_row.conversation_id].add(
                response_row.participant_id
            )

    return eligible_participant_ids_by_conv


# --- Batch READ queries (one query per data type for all conversations) ---


def fetch_ranking_items_batch(
    engine: Engine | Connection,
    *,
    conversation_ids: list[int],
) -> dict[int, list[RankingItemSnapshotInput]]:
    """Fetch all current ranking items needed for scoring and snapshots."""
    if not conversation_ids:
        return {}

    stmt = (
        select(
            RankingItem.conversation_id,
            RankingItem.id.label("item_id"),
            RankingItem.slug_id,
            RankingItemContent.id.label("content_id"),
            RankingItem.lifecycle_status,
            RankingItemExternalSource.external_url,
        )
        .join(RankingItemContent, RankingItemContent.id == RankingItem.current_content_id)
        .outerjoin(
            RankingItemExternalSource,
            RankingItemExternalSource.ranking_item_id == RankingItem.id,
        )
        .where(RankingItem.conversation_id.in_(conversation_ids))
        .order_by(RankingItem.conversation_id, RankingItem.id)
    )

    result: dict[int, list[RankingItemSnapshotInput]] = {
        conversation_id: [] for conversation_id in conversation_ids
    }
    with Session(engine) as session:
        for row in session.execute(stmt):
            result[row.conversation_id].append(
                RankingItemSnapshotInput(
                    item_id=row.item_id,
                    slug_id=row.slug_id,
                    content_id=row.content_id,
                    lifecycle_status=row.lifecycle_status,
                    external_url=row.external_url,
                )
            )
    return result


def fetch_scoring_input_revisions(
    engine: Engine | Connection,
    *,
    conversation_ids: list[int],
) -> dict[int, int]:
    if not conversation_ids:
        return {}
    stmt = (
        select(
            Conversation.id,
            RankingConversationConfig.scoring_input_revision,
        )
        .join(
            RankingConversationConfig,
            RankingConversationConfig.id == Conversation.ranking_config_id,
        )
        .where(Conversation.id.in_(conversation_ids))
    )
    with Session(engine) as session:
        return {row.id: row.scoring_input_revision for row in session.execute(stmt)}


@dataclass(frozen=True)
class ComparisonsBatchResult:
    comparisons: dict[int, list[ComparisonRow]]
    # Reverse map: conv_id → {user_idx → maxdiff_result_id}
    user_idx_to_result_id: dict[int, dict[int, int]]
    total_vote_count_by_conversation: dict[int, int]
    total_participant_count_by_conversation: dict[int, int]


def fetch_comparisons_batch(
    engine: Engine | Connection,
    *,
    conversation_ids: list[int],
) -> ComparisonsBatchResult:
    """Fetch normalized comparisons grouped by conversation_id.

    Assigns a 0-based user_idx per distinct maxdiff_result_id within
    each conversation (each result = one user's session).

    Also returns a reverse mapping from user_idx to maxdiff_result.id
    for writing per-user scores back.
    """
    if not conversation_ids:
        return ComparisonsBatchResult(
            comparisons={},
            user_idx_to_result_id={},
            total_vote_count_by_conversation={},
            total_participant_count_by_conversation={},
        )

    stmt = (
        select(
            MaxdiffResult.conversation_id,
            MaxdiffComparison.maxdiff_result_id,
            MaxdiffResult.participant_id,
            MaxdiffComparison.best_slug_id,
            MaxdiffComparison.worst_slug_id,
            MaxdiffComparison.candidate_set,
            MaxdiffComparison.position,
        )
        .join(
            MaxdiffComparison,
            MaxdiffComparison.maxdiff_result_id == MaxdiffResult.id,
        )
        .join(
            User,
            User.id == MaxdiffResult.participant_id,
        )
        .where(
            and_(
                MaxdiffResult.conversation_id.in_(conversation_ids),
                MaxdiffComparison.deleted_at.is_(None),
                User.is_deleted.is_(False),
            ),
        )
        .order_by(
            MaxdiffResult.conversation_id,
            MaxdiffComparison.maxdiff_result_id,
            MaxdiffComparison.position,
        )
    )

    comparisons: dict[int, list[ComparisonRow]] = {cid: [] for cid in conversation_ids}
    # Forward: conv_id → {result_id → user_idx}
    user_idx_maps: dict[int, dict[int, int]] = {}
    # Reverse: conv_id → {user_idx → result_id}
    reverse_maps: dict[int, dict[int, int]] = {}

    with Session(engine) as session:
        raw_rows = list(session.execute(stmt))
        total_vote_count_by_conversation = {
            conversation_id: 0 for conversation_id in conversation_ids
        }
        candidate_participant_ids_by_conv: dict[int, set[UUID]] = {
            cid: set() for cid in conversation_ids
        }
        for row in raw_rows:
            total_vote_count_by_conversation[row.conversation_id] += 1
            candidate_participant_ids_by_conv[row.conversation_id].add(row.participant_id)

        eligible_participant_ids_by_conv = _fetch_survey_eligible_participants_batch(
            session,
            conversation_ids=conversation_ids,
            candidate_participant_ids_by_conv=candidate_participant_ids_by_conv,
        )

        for row in raw_rows:
            cid = row.conversation_id
            eligible_participant_ids = eligible_participant_ids_by_conv.get(cid)
            if (
                eligible_participant_ids is not None
                and row.participant_id not in eligible_participant_ids
            ):
                continue
            rid = row.maxdiff_result_id
            if cid not in user_idx_maps:
                user_idx_maps[cid] = {}
                reverse_maps[cid] = {}
            idx_map = user_idx_maps[cid]
            if rid not in idx_map:
                idx = len(idx_map)
                idx_map[rid] = idx
                reverse_maps[cid][idx] = rid

            comparisons[cid].append(
                ComparisonRow(
                    best_slug_id=row.best_slug_id,
                    worst_slug_id=row.worst_slug_id,
                    candidate_set=row.candidate_set,
                    user_idx=idx_map[rid],
                )
            )

    return ComparisonsBatchResult(
        comparisons=comparisons,
        user_idx_to_result_id=reverse_maps,
        total_vote_count_by_conversation=total_vote_count_by_conversation,
        total_participant_count_by_conversation={
            conversation_id: len(participant_ids)
            for conversation_id, participant_ids in candidate_participant_ids_by_conv.items()
        },
    )


# --- Batch WRITE ---


@dataclass(frozen=True)
class UserScoreEntry:
    maxdiff_result_id: int
    entity_slug_id: str
    score: float
    uncertainty_left: float
    uncertainty_right: float


def _write_scores_batch(
    connection: Connection,
    *,
    conversation_ids: list[int],
    results: dict[int, tuple[list[ScoredEntity], dict[str, int]]],
    user_scores: list[UserScoreEntry] | None = None,
) -> None:
    """Write scoring results for multiple conversations in one transaction.

    `results` maps conversation_id -> (scored_entities, participant_counts).
    `user_scores` is a flat list of per-user entity scores to upsert.
    Skips conversations with empty scores.
    """
    if not conversation_ids:
        return

    now = datetime.now(tz=UTC).replace(microsecond=0)

    with Session(connection, join_transaction_mode="create_savepoint") as session:
        session.execute(
            delete(MaxdiffUserEntityScore).where(
                MaxdiffUserEntityScore.maxdiff_result_id.in_(
                    select(MaxdiffResult.id).where(
                        MaxdiffResult.conversation_id.in_(conversation_ids)
                    )
                )
            )
        )
        for conv_id, (scores, participant_counts) in results.items():
            if not scores:
                continue

            # Insert ranking_score (JSONB backup + typed columns)
            ranking_score = RankingScore(
                conversation_id=conv_id,
                scores=json.dumps(
                    [
                        {
                            "entityId": s.entity_slug_id,
                            "score": s.score,
                            "uncertaintyLeft": s.uncertainty_left,
                            "uncertaintyRight": s.uncertainty_right,
                        }
                        for s in scores
                    ]
                ),
                participant_counts=json.dumps(participant_counts),
                group_sources_snapshot=None,
                user_weights_snapshot=None,
                pipeline_config=json.dumps(
                    {
                        "preferenceLearning": PIPELINE_CONFIG["preference_learning"],
                        "votingRights": PIPELINE_CONFIG["voting_rights"],
                        "aggregation": PIPELINE_CONFIG["aggregation"],
                    }
                ),
                preference_learning=PIPELINE_CONFIG["preference_learning"],
                voting_rights=PIPELINE_CONFIG["voting_rights"],
                aggregation_config=PIPELINE_CONFIG["aggregation"],
                computed_at=now,
                created_at=now,
            )
            session.add(ranking_score)
            session.flush()  # get the auto-generated ID

            # Insert normalized entity scores
            for s in scores:
                session.add(
                    RankingScoreEntity(
                        ranking_score_id=ranking_score.id,
                        entity_slug_id=s.entity_slug_id,
                        score=s.score,
                        uncertainty_left=s.uncertainty_left,
                        uncertainty_right=s.uncertainty_right,
                        participant_count=participant_counts.get(s.entity_slug_id, 0),
                    )
                )

            # Conditional update: only if our ID is newer
            session.execute(
                update(RankingConversationConfig)
                .where(
                    and_(
                        RankingConversationConfig.id == Conversation.ranking_config_id,
                        Conversation.id == conv_id,
                        (
                            RankingConversationConfig.current_ranking_score_id.is_(None)
                            | (
                                RankingConversationConfig.current_ranking_score_id
                                < ranking_score.id
                            )
                        ),
                    ),
                )
                .values(current_ranking_score_id=ranking_score.id),
            )

        # Bulk upsert per-user entity scores
        if user_scores:
            from sqlalchemy.dialects.postgresql import insert as pg_insert

            values = [
                {
                    "maxdiff_result_id": e.maxdiff_result_id,
                    "entity_slug_id": e.entity_slug_id,
                    "score": e.score,
                    "uncertainty_left": e.uncertainty_left,
                    "uncertainty_right": e.uncertainty_right,
                }
                for e in user_scores
            ]
            stmt = pg_insert(MaxdiffUserEntityScore).values(values)
            stmt = stmt.on_conflict_do_update(
                index_elements=[
                    MaxdiffUserEntityScore.maxdiff_result_id,
                    MaxdiffUserEntityScore.entity_slug_id,
                ],
                set_={
                    "score": stmt.excluded.score,
                    "uncertainty_left": stmt.excluded.uncertainty_left,
                    "uncertainty_right": stmt.excluded.uncertainty_right,
                },
            )
            session.execute(stmt)

        session.commit()


def _clear_scores_batch(
    connection: Connection,
    *,
    conversation_ids: list[int],
) -> None:
    """Clear scores for conversations with <2 active items."""
    if not conversation_ids:
        return
    with Session(connection, join_transaction_mode="create_savepoint") as session:
        session.execute(
            update(RankingConversationConfig)
            .where(
                RankingConversationConfig.id.in_(
                    select(Conversation.ranking_config_id).where(
                        Conversation.id.in_(conversation_ids)
                    )
                )
            )
            .values(current_ranking_score_id=None),
        )
        session.commit()


# --- Conversation stats ---


def _prune_unpublished_ranking_snapshots(
    session: Session,
    *,
    conversation_id: int,
    current_snapshot_id: int,
) -> None:
    """Keep only the baseline, current snapshot, and published checkpoints."""
    earliest_snapshot_id = (
        select(RankingConversationStatsSnapshot.id)
        .where(RankingConversationStatsSnapshot.conversation_id == conversation_id)
        .order_by(
            RankingConversationStatsSnapshot.created_at,
            RankingConversationStatsSnapshot.id,
        )
        .limit(1)
        .scalar_subquery()
    )
    has_checkpoint = (
        select(RankingConversationStatsCheckpoint.id)
        .where(
            RankingConversationStatsCheckpoint.stats_snapshot_id
            == RankingConversationStatsSnapshot.id
        )
        .exists()
    )
    prunable_snapshot_ids = list(
        session.scalars(
            select(RankingConversationStatsSnapshot.id).where(
                RankingConversationStatsSnapshot.conversation_id == conversation_id,
                RankingConversationStatsSnapshot.id != current_snapshot_id,
                RankingConversationStatsSnapshot.id != earliest_snapshot_id,
                ~has_checkpoint,
            )
        )
    )
    if not prunable_snapshot_ids:
        return
    session.execute(
        delete(RankingConversationStatsItem).where(
            RankingConversationStatsItem.stats_snapshot_id.in_(prunable_snapshot_ids)
        )
    )
    session.execute(
        delete(RankingConversationStatsSnapshot).where(
            RankingConversationStatsSnapshot.id.in_(prunable_snapshot_ids)
        )
    )


def _update_ranking_stats_batch(
    connection: Connection,
    *,
    conversation_ids: list[int],
    ranking_items_by_conv: dict[int, list[RankingItemSnapshotInput]],
    comparisons_by_conv: dict[int, list[ComparisonRow]],
    total_vote_count_by_conversation: dict[int, int],
    total_participant_count_by_conversation: dict[int, int],
    scored_entities_by_conv: dict[int, list[ScoredEntity]],
    scoring_input_revisions: dict[int, int],
) -> None:
    """Persist current ranking counts, immutable snapshots, and SSE outbox events."""
    if not conversation_ids:
        return

    with Session(connection, join_transaction_mode="create_savepoint") as session:
        for conversation_id in conversation_ids:
            conversation = session.execute(
                select(
                    Conversation.slug_id,
                    Conversation.is_closed,
                    Conversation.ranking_config_id,
                )
                .join(
                    RankingConversationConfig,
                    RankingConversationConfig.id == Conversation.ranking_config_id,
                )
                .where(Conversation.id == conversation_id)
            ).one()
            ranking_items = ranking_items_by_conv.get(conversation_id, [])
            active_items = [
                item
                for item in ranking_items
                if item.lifecycle_status
                in {
                    RankingItemLifecycleStatus.active,
                    RankingItemLifecycleStatus.in_progress,
                }
            ]
            active_slugs = {item.slug_id for item in active_items}
            active_comparisons = [
                comparison
                for comparison in comparisons_by_conv.get(conversation_id, [])
                if comparison.best_slug_id in active_slugs
                and comparison.worst_slug_id in active_slugs
            ]
            participant_count = len({comparison.user_idx for comparison in active_comparisons})
            vote_count = len(active_comparisons)
            total_vote_count = total_vote_count_by_conversation.get(conversation_id, 0)
            total_participant_count = total_participant_count_by_conversation.get(
                conversation_id, 0
            )
            previous_snapshot = session.execute(
                select(RankingConversationStatsSnapshot.is_closed)
                .where(RankingConversationStatsSnapshot.conversation_id == conversation_id)
                .order_by(
                    RankingConversationStatsSnapshot.created_at.desc(),
                    RankingConversationStatsSnapshot.id.desc(),
                )
                .limit(1)
            ).one_or_none()
            session.execute(
                update(RankingConversationConfig)
                .where(RankingConversationConfig.id == conversation.ranking_config_id)
                .values(
                    item_count=len(active_items),
                    total_item_count=len(ranking_items),
                    vote_count=vote_count,
                    total_vote_count=total_vote_count,
                    participant_count=participant_count,
                    total_participant_count=total_participant_count,
                    processed_scoring_input_revision=scoring_input_revisions[conversation_id],
                )
            )
            snapshot = RankingConversationStatsSnapshot(
                conversation_id=conversation_id,
                item_count=len(active_items),
                total_item_count=len(ranking_items),
                vote_count=vote_count,
                total_vote_count=total_vote_count,
                participant_count=participant_count,
                total_participant_count=total_participant_count,
                scoring_input_revision=scoring_input_revisions[conversation_id],
                is_closed=conversation.is_closed,
                created_at=datetime.now(tz=UTC).replace(microsecond=0),
            )
            session.add(snapshot)
            session.flush()

            scored_entities = scored_entities_by_conv.get(conversation_id, [])
            normalized_scores_by_slug: dict[str, tuple[float, int, int]] = {}
            if scored_entities:
                minimum_score = min(item.score for item in scored_entities)
                maximum_score = max(item.score for item in scored_entities)
                score_range = maximum_score - minimum_score
                for rank, item in enumerate(scored_entities, start=1):
                    normalized_score = (
                        0.5 if score_range < 1e-6 else (item.score - minimum_score) / score_range
                    )
                    normalized_scores_by_slug[item.entity_slug_id] = (
                        normalized_score,
                        rank,
                        item.participant_count,
                    )

            for item in active_items:
                score_data = normalized_scores_by_slug.get(item.slug_id)
                session.add(
                    RankingConversationStatsItem(
                        stats_snapshot_id=snapshot.id,
                        conversation_id=conversation_id,
                        ranking_item_id=item.item_id,
                        ranking_item_content_id=item.content_id,
                        lifecycle_status=item.lifecycle_status,
                        score=None if score_data is None else score_data[0],
                        rank=None if score_data is None else score_data[1],
                        participant_count=0 if score_data is None else score_data[2],
                        external_url=item.external_url,
                    )
                )

            checkpoint_values: list[RankingCheckpointInsert] = []
            for milestone in checkpoint_milestones_at_or_below(
                count=participant_count,
                seeds=PARTICIPANT_MILESTONE_SEEDS,
            ):
                checkpoint_values.append(
                    {
                        "stats_snapshot_id": snapshot.id,
                        "conversation_id": conversation_id,
                        "reason": (RankingStatsCheckpointReasonEnum.major_participation_milestone),
                        "participant_milestone": milestone,
                        "vote_milestone": None,
                    }
                )
            if conversation.is_closed and (
                previous_snapshot is None or not previous_snapshot.is_closed
            ):
                checkpoint_values.append(
                    {
                        "stats_snapshot_id": snapshot.id,
                        "conversation_id": conversation_id,
                        "reason": RankingStatsCheckpointReasonEnum.conversation_closed,
                        "participant_milestone": None,
                        "vote_milestone": None,
                    }
                )
            for milestone in checkpoint_milestones_at_or_below(
                count=vote_count,
                seeds=VOTE_MILESTONE_SEEDS,
            ):
                checkpoint_values.append(
                    {
                        "stats_snapshot_id": snapshot.id,
                        "conversation_id": conversation_id,
                        "reason": RankingStatsCheckpointReasonEnum.major_vote_milestone,
                        "participant_milestone": None,
                        "vote_milestone": milestone,
                    }
                )
            checkpoint_changed = previous_snapshot is None
            if checkpoint_values:
                from sqlalchemy.dialects.postgresql import insert as pg_insert

                inserted_checkpoints = session.execute(
                    pg_insert(RankingConversationStatsCheckpoint)
                    .values(checkpoint_values)
                    .on_conflict_do_nothing()
                    .returning(RankingConversationStatsCheckpoint.id)
                ).all()
                checkpoint_changed = checkpoint_changed or len(inserted_checkpoints) > 0
            _prune_unpublished_ranking_snapshots(
                session,
                conversation_id=conversation_id,
                current_snapshot_id=snapshot.id,
            )
            event_payload: RankingStatsEventPayload = {
                "conversationSlugId": conversation.slug_id,
                "rankingStatsSnapshotId": snapshot.id,
                "checkpointChanged": checkpoint_changed,
                "opinionCount": len(active_items),
                "totalOpinionCount": len(ranking_items),
                "voteCount": vote_count,
                "totalVoteCount": total_vote_count,
                "participantCount": participant_count,
                "totalParticipantCount": total_participant_count,
                "moderatedOpinionCount": 0,
                "hiddenOpinionCount": 0,
                "isClosed": conversation.is_closed,
                "timestamp": int(datetime.now(tz=UTC).timestamp() * 1000),
            }
            session.add(
                RealtimeEventOutbox(
                    event_type="conversation_ranking_stats_updated",
                    payload=event_payload,
                    created_at=datetime.now(tz=UTC).replace(microsecond=0),
                )
            )

        session.commit()


def persist_scoring_batch(
    connection: Connection,
    *,
    scoring_results: dict[int, tuple[list[ScoredEntity], dict[str, int]]],
    user_scores: list[UserScoreEntry],
    conversation_ids_to_clear: list[int],
    snapshot_conversation_ids: list[int],
    ranking_items_by_conv: dict[int, list[RankingItemSnapshotInput]],
    comparisons_by_conv: dict[int, list[ComparisonRow]],
    total_vote_count_by_conversation: dict[int, int],
    total_participant_count_by_conversation: dict[int, int],
    scored_entities_by_conv: dict[int, list[ScoredEntity]],
    scoring_input_revisions: dict[int, int],
) -> bool:
    """Atomically publish scores, immutable snapshots, checkpoints, and SSE."""
    with connection.begin():
        with Session(
            connection,
            join_transaction_mode="create_savepoint",
        ) as session:
            revision_rows = session.execute(
                select(
                    Conversation.id,
                    RankingConversationConfig.scoring_input_revision,
                )
                .join(
                    RankingConversationConfig,
                    RankingConversationConfig.id == Conversation.ranking_config_id,
                )
                .where(Conversation.id.in_(snapshot_conversation_ids))
                .order_by(Conversation.id)
                .with_for_update(of=RankingConversationConfig)
            ).all()
            if len(revision_rows) != len(snapshot_conversation_ids) or any(
                scoring_input_revisions.get(row.id) != row.scoring_input_revision
                for row in revision_rows
            ):
                return False
            session.commit()
        _write_scores_batch(
            connection,
            conversation_ids=snapshot_conversation_ids,
            results=scoring_results,
            user_scores=user_scores,
        )
        _clear_scores_batch(
            connection,
            conversation_ids=conversation_ids_to_clear,
        )
        _update_ranking_stats_batch(
            connection,
            conversation_ids=snapshot_conversation_ids,
            ranking_items_by_conv=ranking_items_by_conv,
            comparisons_by_conv=comparisons_by_conv,
            total_vote_count_by_conversation=total_vote_count_by_conversation,
            total_participant_count_by_conversation=(total_participant_count_by_conversation),
            scored_entities_by_conv=scored_entities_by_conv,
            scoring_input_revisions=scoring_input_revisions,
        )
    return True


# --- Reconciliation ---


def reconcile_unscored_conversations(engine: Engine) -> list[tuple[int, str]]:
    """Find conversations needing scoring (safety net for missed ZADDs)."""
    latest_snapshot_is_closed = (
        select(RankingConversationStatsSnapshot.is_closed)
        .where(RankingConversationStatsSnapshot.conversation_id == Conversation.id)
        .order_by(
            RankingConversationStatsSnapshot.created_at.desc(),
            RankingConversationStatsSnapshot.id.desc(),
        )
        .limit(1)
        .scalar_subquery()
    )
    stmt = (
        select(Conversation.id, Conversation.slug_id)
        .join(
            RankingConversationConfig,
            RankingConversationConfig.id == Conversation.ranking_config_id,
        )
        .where(
            and_(
                Conversation.conversation_type == "ranking",
                RankingConversationConfig.ranking_mode == "bws",
                or_(
                    ~select(RankingConversationStatsSnapshot.id)
                    .where(RankingConversationStatsSnapshot.conversation_id == Conversation.id)
                    .exists(),
                    latest_snapshot_is_closed != Conversation.is_closed,
                    RankingConversationConfig.scoring_input_revision
                    > RankingConversationConfig.processed_scoring_input_revision,
                ),
            ),
        )
    )
    with Session(engine) as session:
        return [(row.id, row.slug_id) for row in session.execute(stmt)]
