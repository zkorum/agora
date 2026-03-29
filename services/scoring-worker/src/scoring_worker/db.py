"""Database queries for the scoring worker.

Uses SQLAlchemy 2.0 ORM with generated models for type-safe queries.
Column name typos are caught by basedpyright at static analysis time.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import and_, func, select, update
from sqlalchemy.orm import Session

from scoring_worker.generated_models import (
    Conversation,
    MaxdiffComparison,
    MaxdiffItem,
    MaxdiffLifecycleStatus,
    MaxdiffResult,
    RankingScore,
    RankingScoreEntity,
    User,
)

if TYPE_CHECKING:
    from sqlalchemy import Engine


# Pipeline config (single source of truth for JSONB blob + typed columns)
PIPELINE_CONFIG = {
    "preference_learning": "LBFGSUniformGBT",
    "voting_rights": "AffineOvertrust",
    "aggregation": "EntitywiseQrQuantile(quantile=0.5)",
}


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


# --- Batch READ queries (one query per data type for all conversations) ---


def fetch_active_items_batch(
    engine: Engine,
    *,
    conversation_ids: list[int],
) -> dict[int, list[str]]:
    """Fetch active item slugIds grouped by conversation_id."""
    if not conversation_ids:
        return {}

    stmt = (
        select(MaxdiffItem.conversation_id, MaxdiffItem.slug_id)
        .where(
            and_(
                MaxdiffItem.conversation_id.in_(conversation_ids),
                MaxdiffItem.current_content_id.is_not(None),
                MaxdiffItem.lifecycle_status.in_([
                    MaxdiffLifecycleStatus.active,
                    MaxdiffLifecycleStatus.in_progress,
                ]),
            ),
        )
    )

    result: dict[int, list[str]] = {cid: [] for cid in conversation_ids}
    with Session(engine) as session:
        for row in session.execute(stmt):
            result[row.conversation_id].append(row.slug_id)
    return result


def fetch_comparisons_batch(
    engine: Engine,
    *,
    conversation_ids: list[int],
) -> dict[int, list[ComparisonRow]]:
    """Fetch normalized comparisons grouped by conversation_id.

    Assigns a 0-based user_idx per distinct maxdiff_result_id within
    each conversation (each result = one user's session).
    """
    if not conversation_ids:
        return {}

    stmt = (
        select(
            MaxdiffResult.conversation_id,
            MaxdiffComparison.maxdiff_result_id,
            MaxdiffComparison.best_slug_id,
            MaxdiffComparison.worst_slug_id,
            MaxdiffComparison.candidate_set,
            MaxdiffComparison.position,
        )
        .join(
            MaxdiffComparison,
            MaxdiffComparison.maxdiff_result_id == MaxdiffResult.id,
        )
        .where(MaxdiffResult.conversation_id.in_(conversation_ids))
        .order_by(
            MaxdiffResult.conversation_id,
            MaxdiffComparison.maxdiff_result_id,
            MaxdiffComparison.position,
        )
    )

    result: dict[int, list[ComparisonRow]] = {
        cid: [] for cid in conversation_ids
    }

    with Session(engine) as session:
        # Assign user_idx per conversation
        user_idx_maps: dict[int, dict[int, int]] = {}
        for row in session.execute(stmt):
            cid = row.conversation_id
            rid = row.maxdiff_result_id
            if cid not in user_idx_maps:
                user_idx_maps[cid] = {}
            idx_map = user_idx_maps[cid]
            if rid not in idx_map:
                idx_map[rid] = len(idx_map)

            result[cid].append(ComparisonRow(
                best_slug_id=row.best_slug_id,
                worst_slug_id=row.worst_slug_id,
                candidate_set=row.candidate_set,
                user_idx=idx_map[rid],
            ))

    return result


# --- Batch WRITE ---


def write_scores_batch(
    engine: Engine,
    *,
    results: dict[int, tuple[list[ScoredEntity], dict[str, int]]],
) -> None:
    """Write scoring results for multiple conversations in one transaction.

    `results` maps conversation_id -> (scored_entities, participant_counts).
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
                scores=json.dumps([{
                    "entityId": s.entity_slug_id,
                    "score": s.score,
                    "uncertaintyLeft": s.uncertainty_left,
                    "uncertaintyRight": s.uncertainty_right,
                } for s in scores]),
                participant_counts=json.dumps(participant_counts),
                group_sources_snapshot=None,
                user_weights_snapshot=None,
                pipeline_config=json.dumps({
                    "preferenceLearning": PIPELINE_CONFIG[
                        "preference_learning"
                    ],
                    "votingRights": PIPELINE_CONFIG["voting_rights"],
                    "aggregation": PIPELINE_CONFIG["aggregation"],
                }),
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
                session.add(RankingScoreEntity(
                    ranking_score_id=ranking_score.id,
                    entity_slug_id=s.entity_slug_id,
                    score=s.score,
                    uncertainty_left=s.uncertainty_left,
                    uncertainty_right=s.uncertainty_right,
                    participant_count=participant_counts.get(
                        s.entity_slug_id, 0
                    ),
                ))

            # Conditional update: only if our ID is newer
            session.execute(
                update(Conversation)
                .where(
                    and_(
                        Conversation.id == conv_id,
                        (
                            Conversation.current_ranking_score_id.is_(None)
                            | (
                                Conversation.current_ranking_score_id
                                < ranking_score.id
                            )
                        ),
                    ),
                )
                .values(current_ranking_score_id=ranking_score.id),
            )

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
        for conv_id in conversation_ids:
            active_slugs = set(active_items_by_conv.get(conv_id, []))

            # Total counts (all comparisons, excluding deleted users)
            total_row = session.execute(
                select(
                    func.count(
                        func.distinct(MaxdiffResult.participant_id)
                    ).label("total_participants"),
                    func.count().label("total_votes"),
                )
                .select_from(MaxdiffComparison)
                .join(
                    MaxdiffResult,
                    MaxdiffResult.id
                    == MaxdiffComparison.maxdiff_result_id,
                )
                .join(
                    User,
                    User.id == MaxdiffResult.participant_id,
                )
                .where(
                    and_(
                        MaxdiffResult.conversation_id == conv_id,
                        User.is_deleted.is_(False),
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

            # Filtered counts (only active items, excluding deleted users)
            filtered_row = session.execute(
                select(
                    func.count(
                        func.distinct(MaxdiffResult.participant_id)
                    ).label("participants"),
                    func.count().label("votes"),
                )
                .select_from(MaxdiffComparison)
                .join(
                    MaxdiffResult,
                    MaxdiffResult.id
                    == MaxdiffComparison.maxdiff_result_id,
                )
                .join(
                    User,
                    User.id == MaxdiffResult.participant_id,
                )
                .where(
                    and_(
                        MaxdiffResult.conversation_id == conv_id,
                        User.is_deleted.is_(False),
                        MaxdiffComparison.best_slug_id.in_(active_slugs),
                        MaxdiffComparison.worst_slug_id.in_(active_slugs),
                    ),
                ),
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
