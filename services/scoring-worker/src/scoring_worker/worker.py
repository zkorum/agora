"""Solidago scoring worker.

Batch architecture:
    1. ZPOPMIN batch (filter out backed-off conversations)
    2. Batch SELECT all data for all conversations
    3. Parallel Solidago via ThreadPoolExecutor (CPU-bound, no DB)
    4. Batch WRITE all results in one transaction

Scaling (future ECS/EKS):
    Monitor ZCARD for queue depth trend. Multiple identical workers
    share the sorted set via atomic ZPOPMIN -- no coordination needed.
    Reconciliation should move to a dedicated service when scaling.

Run with: uv run python -m scoring_worker.worker
"""

from __future__ import annotations

import logging
import signal
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import valkey as valkey_lib
from sqlalchemy import create_engine

from scoring_worker.config import Settings
from scoring_worker.db import (
    ComparisonRow,
    ScoredEntity,
    UserScoreEntry,
    clear_scores_batch,
    fetch_active_items_batch,
    fetch_comparisons_batch,
    reconcile_unscored_conversations,
    update_maxdiff_counters_batch,
    write_scores_batch,
)
from scoring_worker.scoring import (
    ConversationScoringOutput,
    score_comparisons,
    warmup,
)
from scoring_worker.valkey_client import (
    DirtyConversation,
    mark_dirty,
    zpopmin_batch,
)

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


def _build_participant_counts(
    comparisons: list[ComparisonRow],
) -> dict[str, int]:
    """Count distinct users per entity from comparisons."""
    user_entities: dict[str, set[int]] = {}
    for comp in comparisons:
        for slug_id in [
            comp.best_slug_id,
            comp.worst_slug_id,
            *comp.candidate_set,
        ]:
            if slug_id not in user_entities:
                user_entities[slug_id] = set()
            user_entities[slug_id].add(comp.user_idx)
    return {sid: len(users) for sid, users in user_entities.items()}


def _score_one(
    *,
    entity_ids: list[str],
    comparisons: list[ComparisonRow],
) -> ConversationScoringOutput | None:
    """Score a single conversation (called in thread pool)."""
    return score_comparisons(
        entity_ids=entity_ids, comparisons=comparisons
    )


def main() -> None:
    settings = Settings()
    log.info(
        "[Worker] Starting (poll: %.1fs, batch: %d, workers: %d)",
        settings.poll_interval_seconds,
        settings.batch_size,
        settings.max_workers,
    )

    # Valkey
    vk = valkey_lib.from_url(settings.valkey_url, decode_responses=True)
    vk.ping()
    log.info("[Worker] Valkey connected")

    # SQLAlchemy engines (primary + read replica)
    primary_engine = create_engine(
        settings.connection_string.replace("postgres://", "postgresql+psycopg://"),
        pool_pre_ping=True,
    )
    read_engine = create_engine(
        settings.read_dsn.replace("postgres://", "postgresql+psycopg://"),
        pool_pre_ping=True,
    )
    log.info("[Worker] PostgreSQL connected (pool_pre_ping=True)")

    warmup()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    # Per-conversation backoff: conv_id -> monotonic time when retry is allowed
    backoff_until: dict[int, float] = {}

    last_reconcile = time.monotonic()
    log.info("[Worker] Ready")

    while _running:
        # Periodic DB reconciliation
        now = time.monotonic()
        if now - last_reconcile >= settings.reconcile_interval_seconds:
            try:
                unscored = reconcile_unscored_conversations(read_engine)
                if unscored:
                    for conv_id in unscored:
                        mark_dirty(
                            vk,
                            member=f"{conv_id}:reconciled",
                            weight=0,
                        )
                    log.info(
                        "[Worker] Reconciliation: %d conversations",
                        len(unscored),
                    )
            except Exception:
                log.exception("[Worker] Reconciliation failed")
            last_reconcile = now

        # Clean up old backoff entries (> 60s)
        expired = [
            k for k, v in backoff_until.items() if now - v > 60
        ]
        for k in expired:
            del backoff_until[k]

        # Step 1: ZPOPMIN batch + filter backed-off conversations
        raw_batch = zpopmin_batch(vk, count=settings.batch_size)
        if not raw_batch:
            time.sleep(settings.poll_interval_seconds)
            continue

        to_process: list[DirtyConversation] = []
        for item in raw_batch:
            retry_after = backoff_until.get(item.conversation_id)
            if retry_after is not None and now < retry_after:
                # Still in backoff -- re-add to dirty, skip
                mark_dirty(vk, member=item.member, weight=item.weight)
            else:
                to_process.append(item)

        if not to_process:
            time.sleep(settings.poll_interval_seconds)
            continue

        conv_ids = [item.conversation_id for item in to_process]
        log.info(
            "[Worker] Processing %d conversation(s): %s",
            len(to_process),
            ", ".join(item.slug_id for item in to_process),
        )

        try:
            # Step 2: Batch SELECT
            active_items = fetch_active_items_batch(
                read_engine, conversation_ids=conv_ids
            )
            comparisons_result = fetch_comparisons_batch(
                read_engine, conversation_ids=conv_ids
            )
            comparisons = comparisons_result.comparisons
            user_idx_to_result_id = comparisons_result.user_idx_to_result_id

            # Update counters
            update_maxdiff_counters_batch(
                primary_engine,
                conversation_ids=conv_ids,
                active_items_by_conv=active_items,
            )

            # Separate: conversations with enough data vs those to clear
            to_score: list[DirtyConversation] = []
            to_clear: list[int] = []
            for item in to_process:
                cid = item.conversation_id
                items = active_items.get(cid, [])
                comps = comparisons.get(cid, [])
                if len(items) < 2 or not comps:
                    to_clear.append(cid)
                    log.info(
                        "[Worker] %s: %d items, %d comparisons -> clear",
                        item.slug_id,
                        len(items),
                        len(comps),
                    )
                else:
                    to_score.append(item)

            if to_clear:
                clear_scores_batch(
                    primary_engine, conversation_ids=to_clear
                )

            # Step 3: Parallel Solidago (ThreadPoolExecutor)
            scoring_results: dict[
                int, tuple[list[ScoredEntity], dict[str, int]]
            ] = {}
            all_user_score_entries: list[UserScoreEntry] = []
            failed_items: list[DirtyConversation] = []

            if to_score:
                with ThreadPoolExecutor(
                    max_workers=settings.max_workers
                ) as pool:
                    future_to_item = {
                        pool.submit(
                            _score_one,
                            entity_ids=active_items[item.conversation_id],
                            comparisons=comparisons[
                                item.conversation_id
                            ],
                        ): item
                        for item in to_score
                    }

                    for future in as_completed(future_to_item):
                        item = future_to_item[future]
                        try:
                            output = future.result()
                            if output is not None:
                                pc = _build_participant_counts(
                                    comparisons[item.conversation_id]
                                )
                                scored = [
                                    ScoredEntity(
                                        entity_slug_id=r.entity_id,
                                        score=r.score,
                                        uncertainty_left=r.uncertainty_left,
                                        uncertainty_right=r.uncertainty_right,
                                        participant_count=pc.get(
                                            r.entity_id, 0
                                        ),
                                    )
                                    for r in output.global_scores
                                ]
                                scoring_results[
                                    item.conversation_id
                                ] = (scored, pc)
                                log.info(
                                    "[Worker] %s: scored %d entities, %d users",
                                    item.slug_id,
                                    len(output.global_scores),
                                    len(output.user_scores),
                                )

                                # Map per-user scores to DB entries
                                idx_map = user_idx_to_result_id.get(
                                    item.conversation_id, {}
                                )
                                for user_idx, user_results in output.user_scores.items():
                                    result_id = idx_map.get(user_idx)
                                    if result_id is None:
                                        continue
                                    for r in user_results:
                                        all_user_score_entries.append(
                                            UserScoreEntry(
                                                maxdiff_result_id=result_id,
                                                entity_slug_id=r.entity_id,
                                                score=r.score,
                                                uncertainty_left=r.uncertainty_left,
                                                uncertainty_right=r.uncertainty_right,
                                            )
                                        )
                            else:
                                to_clear.append(item.conversation_id)
                        except Exception:
                            log.exception(
                                "[Worker] %s: Solidago failed",
                                item.slug_id,
                            )
                            failed_items.append(item)

            # Step 4: Batch WRITE
            if scoring_results:
                write_scores_batch(
                    primary_engine,
                    results=scoring_results,
                    user_scores=all_user_score_entries,
                )

            if to_clear:
                clear_scores_batch(
                    primary_engine, conversation_ids=to_clear
                )

            # Handle failures: re-add with backoff
            for item in failed_items:
                backoff_until[item.conversation_id] = (
                    time.monotonic() + settings.backoff_seconds
                )
                mark_dirty(vk, member=item.member, weight=item.weight)

        except Exception:
            # Entire batch failed (likely DB connection issue)
            log.exception("[Worker] Batch failed, re-adding all")
            for item in to_process:
                mark_dirty(vk, member=item.member, weight=item.weight)
            time.sleep(5)

    primary_engine.dispose()
    read_engine.dispose()
    vk.close()
    log.info("[Worker] Shutdown complete")


if __name__ == "__main__":
    main()
