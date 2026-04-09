"""Database queries for the scoring worker.

Uses SQLAlchemy 2.0 ORM with generated models for type-safe queries.
Column name typos are caught by basedpyright at static analysis time.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy import and_, func, select, update
from sqlalchemy.orm import Session

from scoring_worker.generated_models import (
    Conversation,
    MaxdiffComparison,
    MaxdiffItem,
    MaxdiffLifecycleStatus,
    MaxdiffResult,
    MaxdiffUserEntityScore,
    RankingScore,
    RankingScoreEntity,
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

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy import Engine


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


def _html_to_counted_text(html_string: str) -> str:
    plain_text = (
        html_string.replace("&nbsp;", " ")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        .replace("</p>", "\n")
        .replace("</div>", "\n")
    )
    import re

    plain_text = re.sub(r"</h[1-6]>", "\n", plain_text, flags=re.IGNORECASE)
    plain_text = re.sub(r"</li>", "\n", plain_text, flags=re.IGNORECASE)
    plain_text = re.sub(r"<li>", "- ", plain_text, flags=re.IGNORECASE)
    plain_text = re.sub(r"<[^>]*>", "", plain_text)
    plain_text = re.sub(r"\n{2,}", "\n", plain_text).strip()
    plain_text = re.sub(r"<[^>]*$", "", plain_text)
    return plain_text.removesuffix("\n")


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
        if len(text_value_html) > int(question.constraints["maxHtmlLength"]):
            return False
        plain_text_length = len(_html_to_counted_text(text_value_html))
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

    if question.question_type in {"mono_choice", "select"}:
        return len(answer.option_slug_ids) == 1

    if question.constraints["type"] != "multi_choice":
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


def is_survey_gate_status_eligible_for_analysis(*, survey_gate_status: str) -> bool:
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
        select(SurveyConfig.id, SurveyConfig.conversation_id).where(
            and_(
                SurveyConfig.conversation_id.in_(conversation_ids),
                SurveyConfig.deleted_at.is_(None),
            )
        )
    ).all()
    if not survey_configs:
        return {}

    survey_config_ids = [row.id for row in survey_configs]
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
        .where(SurveyQuestion.survey_config_id.in_(survey_config_ids))
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
        ).where(SurveyAnswer.survey_response_id.in_(response_ids))
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


def fetch_active_items_batch(
    engine: Engine,
    *,
    conversation_ids: list[int],
) -> dict[int, list[str]]:
    """Fetch active item slugIds grouped by conversation_id."""
    if not conversation_ids:
        return {}

    stmt = select(MaxdiffItem.conversation_id, MaxdiffItem.slug_id).where(
        and_(
            MaxdiffItem.conversation_id.in_(conversation_ids),
            MaxdiffItem.current_content_id.is_not(None),
            MaxdiffItem.lifecycle_status.in_(
                [
                    MaxdiffLifecycleStatus.active,
                    MaxdiffLifecycleStatus.in_progress,
                ]
            ),
        ),
    )

    result: dict[int, list[str]] = {cid: [] for cid in conversation_ids}
    with Session(engine) as session:
        for row in session.execute(stmt):
            result[row.conversation_id].append(row.slug_id)
    return result


@dataclass(frozen=True)
class ComparisonsBatchResult:
    comparisons: dict[int, list[ComparisonRow]]
    # Reverse map: conv_id → {user_idx → maxdiff_result_id}
    user_idx_to_result_id: dict[int, dict[int, int]]


def fetch_comparisons_batch(
    engine: Engine,
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
        candidate_participant_ids_by_conv: dict[int, set[UUID]] = {
            cid: set() for cid in conversation_ids
        }
        for row in raw_rows:
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
    )


# --- Batch WRITE ---


@dataclass(frozen=True)
class UserScoreEntry:
    maxdiff_result_id: int
    entity_slug_id: str
    score: float
    uncertainty_left: float
    uncertainty_right: float


def write_scores_batch(
    engine: Engine,
    *,
    results: dict[int, tuple[list[ScoredEntity], dict[str, int]]],
    user_scores: list[UserScoreEntry] | None = None,
) -> None:
    """Write scoring results for multiple conversations in one transaction.

    `results` maps conversation_id -> (scored_entities, participant_counts).
    `user_scores` is a flat list of per-user entity scores to upsert.
    Skips conversations with empty scores.
    """
    if not results:
        return

    now = datetime.now(tz=UTC).replace(microsecond=0)

    with Session(engine) as session:
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
                update(Conversation)
                .where(
                    and_(
                        Conversation.id == conv_id,
                        (
                            Conversation.current_ranking_score_id.is_(None)
                            | (Conversation.current_ranking_score_id < ranking_score.id)
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


def clear_scores_batch(
    engine: Engine,
    *,
    conversation_ids: list[int],
) -> None:
    """Clear scores for conversations with <2 active items."""
    if not conversation_ids:
        return
    with Session(engine) as session:
        session.execute(
            update(Conversation)
            .where(Conversation.id.in_(conversation_ids))
            .values(current_ranking_score_id=None),
        )
        session.commit()


# --- Counter update ---


def update_maxdiff_counters_batch(
    engine: Engine,
    *,
    conversation_ids: list[int],
    active_items_by_conv: dict[int, list[str]],
) -> None:
    """Update conversation-level MaxDiff counters for a batch.

    Single source of truth for MaxDiff counters (API no longer computes these):
    - total_participant_count: distinct users with any comparisons
    - total_vote_count: total comparison rows across all users
    - participant_count: distinct users with comparisons where both best
      AND worst are active items
    - vote_count: comparison rows where both best AND worst are active items
    """
    if not conversation_ids:
        return

    with Session(engine) as session:
        candidate_participant_rows = session.execute(
            select(MaxdiffResult.conversation_id, MaxdiffResult.participant_id)
            .join(User, User.id == MaxdiffResult.participant_id)
            .where(
                and_(
                    MaxdiffResult.conversation_id.in_(conversation_ids),
                    User.is_deleted.is_(False),
                )
            )
        ).all()
        candidate_participant_ids_by_conv: dict[int, set[UUID]] = {
            cid: set() for cid in conversation_ids
        }
        for row in candidate_participant_rows:
            candidate_participant_ids_by_conv[row.conversation_id].add(row.participant_id)

        eligible_participant_ids_by_conv = _fetch_survey_eligible_participants_batch(
            session,
            conversation_ids=conversation_ids,
            candidate_participant_ids_by_conv=candidate_participant_ids_by_conv,
        )

        for conv_id in conversation_ids:
            active_slugs = set(active_items_by_conv.get(conv_id, []))
            eligible_participant_ids = eligible_participant_ids_by_conv.get(conv_id)

            # Total counts (all comparisons, excluding deleted users + soft-deleted rows)
            total_row = session.execute(
                select(
                    func.count(func.distinct(MaxdiffResult.participant_id)).label(
                        "total_participants"
                    ),
                    func.count().label("total_votes"),
                )
                .select_from(MaxdiffComparison)
                .join(
                    MaxdiffResult,
                    MaxdiffResult.id == MaxdiffComparison.maxdiff_result_id,
                )
                .join(
                    User,
                    User.id == MaxdiffResult.participant_id,
                )
                .where(
                    and_(
                        MaxdiffResult.conversation_id == conv_id,
                        User.is_deleted.is_(False),
                        MaxdiffComparison.deleted_at.is_(None),
                    ),
                ),
            ).one()

            if not active_slugs:
                session.execute(
                    update(Conversation)
                    .where(Conversation.id == conv_id)
                    .values(
                        participant_count=0,
                        total_participant_count=total_row.total_participants,
                        vote_count=0,
                        total_vote_count=total_row.total_votes,
                    ),
                )
                continue

            if eligible_participant_ids is not None and not eligible_participant_ids:
                session.execute(
                    update(Conversation)
                    .where(Conversation.id == conv_id)
                    .values(
                        participant_count=0,
                        total_participant_count=total_row.total_participants,
                        vote_count=0,
                        total_vote_count=total_row.total_votes,
                    ),
                )
                continue

            # Filtered counts (only active items, excluding deleted users + soft-deleted rows)
            filtered_conditions = [
                MaxdiffResult.conversation_id == conv_id,
                User.is_deleted.is_(False),
                MaxdiffComparison.deleted_at.is_(None),
                MaxdiffComparison.best_slug_id.in_(active_slugs),
                MaxdiffComparison.worst_slug_id.in_(active_slugs),
            ]
            if eligible_participant_ids is not None:
                filtered_conditions.append(
                    MaxdiffResult.participant_id.in_(eligible_participant_ids)
                )

            filtered_row = session.execute(
                select(
                    func.count(func.distinct(MaxdiffResult.participant_id)).label("participants"),
                    func.count().label("votes"),
                )
                .select_from(MaxdiffComparison)
                .join(
                    MaxdiffResult,
                    MaxdiffResult.id == MaxdiffComparison.maxdiff_result_id,
                )
                .join(
                    User,
                    User.id == MaxdiffResult.participant_id,
                )
                .where(and_(*filtered_conditions)),
            ).one()

            session.execute(
                update(Conversation)
                .where(Conversation.id == conv_id)
                .values(
                    participant_count=filtered_row.participants,
                    total_participant_count=total_row.total_participants,
                    vote_count=filtered_row.votes,
                    total_vote_count=total_row.total_votes,
                ),
            )

        session.commit()


# --- Reconciliation ---


def reconcile_unscored_conversations(engine: Engine) -> list[int]:
    """Find conversations needing scoring (safety net for missed ZADDs)."""
    stmt = (
        select(func.distinct(MaxdiffResult.conversation_id))
        .join(
            Conversation,
            Conversation.id == MaxdiffResult.conversation_id,
        )
        .outerjoin(
            RankingScore,
            RankingScore.id == Conversation.current_ranking_score_id,
        )
        .where(
            and_(
                Conversation.conversation_type == "maxdiff",
                (
                    RankingScore.computed_at.is_(None)
                    | (MaxdiffResult.updated_at > RankingScore.computed_at)
                ),
            ),
        )
    )
    with Session(engine) as session:
        return [row[0] for row in session.execute(stmt)]
