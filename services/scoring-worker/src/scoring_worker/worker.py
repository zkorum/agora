"""Solidago scoring worker.

Polls a Valkey sorted set for conversations needing scoring.
Processes them in batches, lightest first (ZPOPMIN).

Architecture:
    API: ZADD scoring:dirty:solidago GT <conv_id> <comparison_count>
    Worker: ZPOPMIN <batch_size> -> process each -> loop
    On error: ZADD back (retry next cycle)
    Crash recovery: DB reconciliation every 5 min

Scaling (future ECS/EKS):
    The sorted set exposes two signals for an external orchestrator:
    - ZCARD = number of pending conversations (queue depth)
    - Score = comparison count per conversation (work weight)

    Scaling strategy: monitor ZCARD trend over a sliding window.
    - ZCARD trending up (queue growing) -> add worker instances
    - ZCARD trending down (queue draining) -> hold steady
    - ZCARD stable near zero for sustained period -> remove instances

    Each worker instance is identical. ZPOPMIN is atomic, so multiple
    instances naturally distribute work without coordination.

    Orchestrator options:
    - EKS: KEDA with Valkey scaler (reads ZCARD natively)
    - ECS: CloudWatch custom metric via Lambda (ZCARD -> CloudWatch
      every 30s) + Target Tracking autoscaling policy
    - Manual: Grafana dashboard on ZCARD + human scaling

    The worker does NOT self-scale. It just processes what it grabs.

Run with: uv run python -m scoring_worker.worker
"""

from __future__ import annotations

import logging
import signal
import time

import psycopg
import valkey as valkey_lib

from scoring_worker.config import Settings
from scoring_worker.db import (
    ScoredEntity,
    clear_scores,
    fetch_active_items,
    fetch_comparisons,
    reconcile_unscored_conversations,
    update_maxdiff_counters,
    write_scores,
)
from scoring_worker.scoring import score_comparisons, warmup
from scoring_worker.valkey_client import mark_dirty, zpopmin_batch

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_running = True


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("[Worker] Received signal %d, shutting down...", signum)
    _running = False


def process_conversation(
    *,
    primary_conn: psycopg.Connection[tuple[object, ...]],
    read_conn: psycopg.Connection[tuple[object, ...]],
    conversation_id: int,
) -> None:
    """Process a single conversation: update counters + run Solidago scoring."""
    update_maxdiff_counters(primary_conn, conversation_id=conversation_id)

    active_items = fetch_active_items(read_conn, conversation_id=conversation_id)
    entity_ids = [item.slug_id for item in active_items]

    if len(entity_ids) < 2:
        log.info(
            "[Worker] Conversation %d: %d active items, clearing scores",
            conversation_id,
            len(entity_ids),
        )
        clear_scores(primary_conn, conversation_id=conversation_id)
        return

    comparisons = fetch_comparisons(read_conn, conversation_id=conversation_id)
    if not comparisons:
        log.info("[Worker] Conversation %d: no comparisons, clearing scores", conversation_id)
        clear_scores(primary_conn, conversation_id=conversation_id)
        return

    log.info(
        "[Worker] Conversation %d: scoring %d items, %d comparisons",
        conversation_id,
        len(entity_ids),
        len(comparisons),
    )
    results = score_comparisons(entity_ids=entity_ids, comparisons=comparisons)

    if not results:
        log.info("[Worker] Conversation %d: scoring returned empty, clearing", conversation_id)
        clear_scores(primary_conn, conversation_id=conversation_id)
        return

    # Build participant counts (distinct users per entity)
    user_entities: dict[str, set[int]] = {}
    for comp in comparisons:
        for slug_id in [comp.best_slug_id, comp.worst_slug_id, *comp.candidate_set]:
            if slug_id not in user_entities:
                user_entities[slug_id] = set()
            user_entities[slug_id].add(comp.user_idx)
    participant_counts = {sid: len(users) for sid, users in user_entities.items()}

    scored_entities = [
        ScoredEntity(
            entity_slug_id=r.entity_id,
            score=r.score,
            uncertainty_left=r.uncertainty_left,
            uncertainty_right=r.uncertainty_right,
            participant_count=participant_counts.get(r.entity_id, 0),
        )
        for r in results
    ]
    write_scores(
        primary_conn,
        conversation_id=conversation_id,
        scores=scored_entities,
        participant_counts=participant_counts,
    )
    log.info("[Worker] Conversation %d: scored %d entities", conversation_id, len(results))


def main() -> None:
    settings = Settings()
    log.info(
        "[Worker] Starting (poll: %.1fs, batch: %d, reconcile: %ds)",
        settings.poll_interval_seconds,
        settings.batch_size,
        settings.reconcile_interval_seconds,
    )

    log.info("[Worker] Connecting to Valkey at %s", settings.valkey_url)
    vk = valkey_lib.from_url(settings.valkey_url, decode_responses=True)
    vk.ping()
    log.info("[Worker] Valkey connected")

    log.info("[Worker] Connecting to PostgreSQL (primary)")
    primary_conn = psycopg.connect(settings.connection_string, autocommit=False)
    log.info("[Worker] Connecting to PostgreSQL (read replica)")
    read_conn = psycopg.connect(settings.read_dsn, autocommit=False)
    log.info("[Worker] PostgreSQL connected")

    warmup()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    last_reconcile = time.monotonic()
    log.info("[Worker] Ready")

    while _running:
        # Periodic DB reconciliation (safety net for crashes + missed ZADDs).
        # TODO: when running multiple workers, reconciliation should be
        # extracted to its own dedicated service/cron to avoid N workers
        # all running the same reconciliation query simultaneously.
        # For now with a single worker, this is fine.
        now = time.monotonic()
        if now - last_reconcile >= settings.reconcile_interval_seconds:
            try:
                unscored = reconcile_unscored_conversations(read_conn)
                if unscored:
                    for conv_id in unscored:
                        mark_dirty(vk, member=f"{conv_id}:reconciled", weight=0)
                    log.info(
                        "[Worker] Reconciliation: marked %d conversations dirty",
                        len(unscored),
                    )
            except Exception:
                log.exception("[Worker] Reconciliation failed")
            last_reconcile = now

        # Batch ZPOPMIN: grab up to batch_size lightest conversations
        batch = zpopmin_batch(vk, count=settings.batch_size)
        if not batch:
            time.sleep(settings.poll_interval_seconds)
            continue

        log.info("[Worker] Processing %d conversation(s)", len(batch))

        for item in batch:
            if not _running:
                mark_dirty(vk, member=item.member, weight=item.weight)
                continue

            try:
                log.info(
                    "[Worker] Conversation %s (id=%d): starting",
                    item.slug_id,
                    item.conversation_id,
                )
                process_conversation(
                    primary_conn=primary_conn,
                    read_conn=read_conn,
                    conversation_id=item.conversation_id,
                )
            except Exception:
                log.exception(
                    "[Worker] Conversation %s (id=%d): failed, re-adding",
                    item.slug_id,
                    item.conversation_id,
                )
                mark_dirty(vk, member=item.member, weight=item.weight)

    primary_conn.close()
    read_conn.close()
    vk.close()
    log.info("[Worker] Shutdown complete")


if __name__ == "__main__":
    main()
