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
    MaxdiffUserEntityScore,
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
            MaxdiffComparison.best_slug_id,
            MaxdiffComparison.worst_slug_id,
            MaxdiffComparison.candidate_set,
            MaxdiffComparison.position,
        )
        .join(
            MaxdiffComparison,
            MaxdiffComparison.maxdiff_result_id == MaxdiffResult.id,
        )
        .where(
            and_(
                MaxdiffResult.conversation_id.in_(conversation_ids),
                MaxdiffComparison.deleted_at.is_(None),
            ),
        )
        .order_by(
            MaxdiffResult.conversation_id,
            MaxdiffComparison.maxdiff_result_id,
            MaxdiffComparison.position,
        )
    )

    comparisons: dict[int, list[ComparisonRow]] = {
        cid: [] for cid in conversation_ids
    }
    # Forward: conv_id → {result_id → user_idx}
    user_idx_maps: dict[int, dict[int, int]] = {}
    # Reverse: conv_id → {user_idx → result_id}
    reverse_maps: dict[int, dict[int, int]] = {}

    with Session(engine) as session:
        for row in session.execute(stmt):
            cid = row.conversation_id
            rid = row.maxdiff_result_id
            if cid not in user_idx_maps:
                user_idx_maps[cid] = {}
                reverse_maps[cid] = {}
            idx_map = user_idx_maps[cid]
            if rid not in idx_map:
                idx = len(idx_map)
                idx_map[rid] = idx
                reverse_maps[cid][idx] = rid

            comparisons[cid].append(ComparisonRow(
                best_slug_id=row.best_slug_id,
                worst_slug_id=row.worst_slug_id,
                candidate_set=row.candidate_set,
                user_idx=idx_map[rid],
            ))

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
        for conv_id in conversation_ids:
            active_slugs = set(active_items_by_conv.get(conv_id, []))

            # Total counts (all comparisons, excluding deleted users + soft-deleted rows)
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

            # Filtered counts (only active items, excluding deleted users + soft-deleted rows)
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
                        MaxdiffComparison.deleted_at.is_(None),
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
