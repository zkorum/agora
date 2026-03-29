"""Database queries for the scoring worker.

Uses psycopg3 with class_row for typed query results.
Read queries use the read replica; writes use the primary.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from psycopg import Connection


@dataclass(frozen=True)
class ActiveItem:
    slug_id: str


@dataclass(frozen=True)
class ComparisonRow:
    best_slug_id: str
    worst_slug_id: str
    candidate_set: list[str]
    user_idx: int  # 0-based index per user within conversation


@dataclass(frozen=True)
class ConversationSlug:
    slug_id: str


@dataclass(frozen=True)
class ScoredEntity:
    entity_slug_id: str
    score: float
    uncertainty_left: float
    uncertainty_right: float
    participant_count: int


def fetch_active_items(
    conn: Connection[tuple[object, ...]],
    *,
    conversation_id: int,
) -> list[ActiveItem]:
    """Fetch active MaxDiff items for a conversation (read replica)."""
    from psycopg.rows import class_row

    with conn.cursor(row_factory=class_row(ActiveItem)) as cur:
        cur.execute(
            """
            SELECT slug_id
            FROM maxdiff_item
            WHERE conversation_id = %s
              AND current_content_id IS NOT NULL
              AND lifecycle_status IN ('active', 'in_progress')
            """,
            (conversation_id,),
        )
        return cur.fetchall()


def fetch_comparisons(
    conn: Connection[tuple[object, ...]],
    *,
    conversation_id: int,
) -> list[ComparisonRow]:
    """Fetch all normalized comparisons for a conversation (read replica).

    Returns comparisons with a 0-based user_idx assigned per distinct
    maxdiff_result_id (each result = one user's session).
    """
    from psycopg.rows import class_row

    with conn.cursor(row_factory=class_row(ComparisonRow)) as cur:
        cur.execute(
            """
            SELECT
                mc.best_slug_id,
                mc.worst_slug_id,
                mc.candidate_set,
                (DENSE_RANK() OVER (ORDER BY mc.maxdiff_result_id) - 1)::int AS user_idx
            FROM maxdiff_comparison mc
            JOIN maxdiff_result mr ON mr.id = mc.maxdiff_result_id
            WHERE mr.conversation_id = %s
            ORDER BY mc.maxdiff_result_id, mc.position
            """,
            (conversation_id,),
        )
        return cur.fetchall()


def fetch_conversation_slug(
    conn: Connection[tuple[object, ...]],
    *,
    conversation_id: int,
) -> str | None:
    """Fetch the slug_id for a conversation."""
    from psycopg.rows import class_row

    with conn.cursor(row_factory=class_row(ConversationSlug)) as cur:
        cur.execute(
            "SELECT slug_id FROM conversation WHERE id = %s",
            (conversation_id,),
        )
        row = cur.fetchone()
        return row.slug_id if row else None


# Pipeline config (single source of truth for both JSONB blob and typed columns)
PIPELINE_CONFIG = {
    "preference_learning": "LBFGSUniformGBT",
    "voting_rights": "AffineOvertrust",
    "aggregation": "EntitywiseQrQuantile(quantile=0.5)",
}


def write_scores(
    conn: Connection[tuple[object, ...]],
    *,
    conversation_id: int,
    scores: list[ScoredEntity],
    participant_counts: dict[str, int],
) -> None:
    """Write scoring results to DB (primary connection).

    Inserts into ranking_score (with JSONB backup) and ranking_score_entity
    (normalized), then updates conversation.current_ranking_score_id.

    Skips entirely if scores is empty (avoids orphaned ranking_score rows).
    """
    if not scores:
        return

    import json
    from datetime import datetime

    now = datetime.now(tz=UTC).replace(microsecond=0)

    scores_jsonb = json.dumps([
        {
            "entityId": s.entity_slug_id,
            "score": s.score,
            "uncertaintyLeft": s.uncertainty_left,
            "uncertaintyRight": s.uncertainty_right,
        }
        for s in scores
    ])
    participant_counts_jsonb = json.dumps(participant_counts)
    pipeline_config_jsonb = json.dumps({
        "preferenceLearning": PIPELINE_CONFIG["preference_learning"],
        "votingRights": PIPELINE_CONFIG["voting_rights"],
        "aggregation": PIPELINE_CONFIG["aggregation"],
    })

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ranking_score (
                conversation_id, scores, participant_counts,
                group_sources_snapshot, user_weights_snapshot,
                pipeline_config, preference_learning, voting_rights,
                aggregation_config, computed_at
            ) VALUES (
                %s, %s::jsonb, %s::jsonb,
                NULL, NULL,
                %s::jsonb, %s, %s,
                %s, %s
            ) RETURNING id
            """,
            (
                conversation_id,
                scores_jsonb,
                participant_counts_jsonb,
                pipeline_config_jsonb,
                PIPELINE_CONFIG["preference_learning"],
                PIPELINE_CONFIG["voting_rights"],
                PIPELINE_CONFIG["aggregation"],
                now,
            ),
        )
        row = cur.fetchone()
        if row is None:
            msg = f"Failed to insert ranking_score for conversation {conversation_id}"
            raise RuntimeError(msg)
        ranking_score_id: int = row[0]

        # Insert normalized entity scores using executemany (safe, no f-string)
        cur.executemany(
            """
            INSERT INTO ranking_score_entity (
                ranking_score_id, entity_slug_id, score,
                uncertainty_left, uncertainty_right, participant_count
            ) VALUES (%s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    ranking_score_id,
                    s.entity_slug_id,
                    s.score,
                    s.uncertainty_left,
                    s.uncertainty_right,
                    participant_counts.get(s.entity_slug_id, 0),
                )
                for s in scores
            ],
        )

        # Conditional update: only if our score ID is newer than the current one.
        cur.execute(
            """
            UPDATE conversation
            SET current_ranking_score_id = %s
            WHERE id = %s
              AND (current_ranking_score_id IS NULL
                   OR current_ranking_score_id < %s)
            """,
            (ranking_score_id, conversation_id, ranking_score_id),
        )

    conn.commit()


def clear_scores(
    conn: Connection[tuple[object, ...]],
    *,
    conversation_id: int,
) -> None:
    """Clear scores for a conversation (when <2 active items)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE conversation
            SET current_ranking_score_id = NULL
            WHERE id = %s
            """,
            (conversation_id,),
        )
    conn.commit()


def reconcile_unscored_conversations(
    conn: Connection[tuple[object, ...]],
) -> list[int]:
    """Find conversations with comparisons newer than their latest scores.

    Safety net for missed Valkey SADDs.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT mr.conversation_id
            FROM maxdiff_result mr
            JOIN conversation c ON c.id = mr.conversation_id
            LEFT JOIN ranking_score rs
                ON rs.id = c.current_ranking_score_id
            WHERE c.conversation_type = 'maxdiff'
              AND (rs.computed_at IS NULL OR mr.updated_at > rs.computed_at)
            """
        )
        return [row[0] for row in cur.fetchall()]


def update_maxdiff_counters(
    conn: Connection[tuple[object, ...]],
    *,
    conversation_id: int,
) -> None:
    """Update conversation-level MaxDiff counters (participant count, etc.).

    Mirrors the TypeScript updateMaxdiffCounters in conversationCounters.ts.
    """
    with conn.cursor() as cur:
        # Count distinct participants who have at least one comparison
        cur.execute(
            """
            UPDATE conversation
            SET participant_count = sub.cnt
            FROM (
                SELECT COUNT(DISTINCT mr.participant_id) AS cnt
                FROM maxdiff_result mr
                WHERE mr.conversation_id = %s
            ) sub
            WHERE conversation.id = %s
            """,
            (conversation_id, conversation_id),
        )

        # Count total comparisons across all participants
        cur.execute(
            """
            UPDATE conversation
            SET vote_count = sub.cnt,
                total_vote_count = sub.cnt
            FROM (
                SELECT COUNT(*) AS cnt
                FROM maxdiff_comparison mc
                JOIN maxdiff_result mr ON mr.id = mc.maxdiff_result_id
                WHERE mr.conversation_id = %s
            ) sub
            WHERE conversation.id = %s
            """,
            (conversation_id, conversation_id),
        )

    conn.commit()
