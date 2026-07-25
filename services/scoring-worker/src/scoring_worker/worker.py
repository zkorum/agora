"""Solidago scoring worker.

Batch architecture:
    1. ZPOPMIN batch (filter out backed-off conversations)
    2. Acquire PostgreSQL advisory locks per conversation
    3. Batch SELECT scoring inputs from primary
    4. Parallel Solidago via ThreadPoolExecutor (no DB during scoring)
    5. Recheck inputs, then persist scores and immutable stats snapshots

Scaling (future ECS/EKS):
    Monitor ZCARD for queue depth trend. Multiple identical workers
    share the sorted set and serialize each conversation with advisory locks.
    Reconciliation should move to a dedicated service when scaling.

Run with: uv run python -m scoring_worker.worker
"""

from __future__ import annotations

import logging
import signal
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TYPE_CHECKING

import valkey as valkey_lib
from sqlalchemy import create_engine, text

from scoring_worker.config import Settings
from scoring_worker.db import (
    ComparisonRow,
    ScoredEntity,
    UserScoreEntry,
    acquire_conversation_locks,
    fetch_comparisons_batch,
    fetch_ranking_items_batch,
    fetch_scoring_input_revisions,
    persist_scoring_batch,
    reconcile_unscored_conversations,
)
from scoring_worker.observations import comparison_rows_to_maxdiff_observations
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

if TYPE_CHECKING:
    from sqlalchemy import Engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_running = True
STARTUP_RETRY_INTERVAL_SECONDS = 5.0


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("[Worker] Received signal %d, shutting down...", signum)
    _running = False


def build_participant_counts(
    comparisons: list[ComparisonRow],
    *,
    entity_ids: list[str],
) -> dict[str, int]:
    """Count distinct users per entity from comparisons."""
    user_entities: dict[str, set[int]] = {}
    observations = comparison_rows_to_maxdiff_observations(
        entity_ids=entity_ids,
        comparisons=comparisons,
    )
    for observation in observations:
        for slug_id in observation.candidate_set:
            if slug_id not in user_entities:
                user_entities[slug_id] = set()
            user_entities[slug_id].add(observation.user_id)
    return {sid: len(users) for sid, users in user_entities.items()}


def _score_one(
    *,
    entity_ids: list[str],
    comparisons: list[ComparisonRow],
) -> ConversationScoringOutput | None:
    """Score a single conversation (called in thread pool)."""
    return score_comparisons(entity_ids=entity_ids, comparisons=comparisons)


def deduplicate_batch(batch: list[DirtyConversation]) -> list[DirtyConversation]:
    """Keep one queue member per conversation, preferring its highest weight."""
    conversations: dict[int, DirtyConversation] = {}
    for item in batch:
        current = conversations.get(item.conversation_id)
        if current is None or item.weight > current.weight:
            conversations[item.conversation_id] = item
    return list(conversations.values())


def _connect_to_valkey_with_retry(settings: Settings) -> valkey_lib.Valkey | None:
    valkey_url = str(settings.valkey_url)

    while _running:
        try:
            vk = valkey_lib.from_url(valkey_url, decode_responses=True)
            vk.ping()
            log.info("[Worker] Valkey connected")
            return vk
        except Exception as error:
            log.warning(
                "[Worker] Valkey unavailable at %s (%s); retrying in %.1fs",
                valkey_url,
                error,
                settings.valkey_retry_interval_seconds,
            )
            time.sleep(settings.valkey_retry_interval_seconds)

    return None


def _sleep_before_retry(seconds: float) -> None:
    deadline = time.monotonic() + seconds
    while _running:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(min(0.5, remaining))


def _postgres_dsn(connection_string: str) -> str:
    return connection_string.replace("postgres://", "postgresql+psycopg://", 1)


def _create_engine_with_retry(
    *,
    connection_string: str,
    role: str,
    retry_interval_seconds: float,
) -> Engine | None:
    while _running:
        engine = create_engine(
            _postgres_dsn(connection_string),
            pool_pre_ping=True,
        )
        try:
            with engine.connect() as connection:
                connection.execute(text("select 1"))
            log.info("[Worker] PostgreSQL %s connection verified", role)
            return engine
        except Exception as error:
            engine.dispose()
            log.warning(
                "[Worker] PostgreSQL %s unavailable (%s); retrying in %.1fs",
                role,
                error,
                retry_interval_seconds,
            )
            _sleep_before_retry(retry_interval_seconds)
    return None


def _run_worker_once() -> None:
    settings = Settings()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    log.info(
        "[Worker] Starting (poll: %.1fs, batch: %d, workers: %d)",
        settings.poll_interval_seconds,
        settings.batch_size,
        settings.max_workers,
    )

    # Valkey
    vk = _connect_to_valkey_with_retry(settings)
    if vk is None:
        log.info("[Worker] Shutdown complete")
        return

    primary_engine = _create_engine_with_retry(
        connection_string=settings.connection_string,
        role="primary",
        retry_interval_seconds=settings.valkey_retry_interval_seconds,
    )
    if primary_engine is None:
        vk.close()
        log.info("[Worker] Shutdown complete")
        return

    log.info("[Worker] PostgreSQL connected (pool_pre_ping=True)")

    warmup()

    # Per-conversation backoff: conv_id -> monotonic time when retry is allowed
    backoff_until: dict[int, float] = {}

    last_reconcile = time.monotonic() - settings.reconcile_interval_seconds
    log.info("[Worker] Ready")

    while _running:
        # Periodic DB reconciliation
        now = time.monotonic()
        if now - last_reconcile >= settings.reconcile_interval_seconds:
            try:
                unscored = reconcile_unscored_conversations(primary_engine)
                if unscored:
                    for conv_id, slug_id in unscored:
                        mark_dirty(
                            vk,
                            member=f"{conv_id}:{slug_id}",
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
        expired = [k for k, v in backoff_until.items() if now - v > 60]
        for k in expired:
            del backoff_until[k]

        # Step 1: ZPOPMIN batch + filter backed-off conversations
        raw_batch = zpopmin_batch(vk, count=settings.batch_size)
        if not raw_batch:
            time.sleep(settings.poll_interval_seconds)
            continue

        if not _running:
            for item in raw_batch:
                mark_dirty(vk, member=item.member, weight=item.weight)
            log.info(
                "[Worker] Requeued %d unprocessed conversation(s) "
                "reason=shutdown_before_processing",
                len(raw_batch),
            )
            break

        to_process: list[DirtyConversation] = []
        for item in raw_batch:
            retry_after = backoff_until.get(item.conversation_id)
            if retry_after is not None and now < retry_after:
                # Still in backoff -- re-add to dirty, skip
                mark_dirty(vk, member=item.member, weight=item.weight)
            else:
                to_process.append(item)

        deduplicated = deduplicate_batch(to_process)
        if len(deduplicated) < len(to_process):
            log.info(
                "[Worker] Coalesced %d duplicate queue member(s)",
                len(to_process) - len(deduplicated),
            )
        to_process = deduplicated

        if not to_process:
            time.sleep(settings.poll_interval_seconds)
            continue

        conv_ids = [item.conversation_id for item in to_process]
        (
            locked_conversation_ids,
            processing_connection,
            release_conversation_locks,
        ) = acquire_conversation_locks(
            primary_engine,
            conversation_ids=conv_ids,
        )
        try:
            unlocked_items = [
                item for item in to_process if item.conversation_id not in locked_conversation_ids
            ]
            for item in unlocked_items:
                mark_dirty(vk, member=item.member, weight=item.weight)
            to_process = [
                item for item in to_process if item.conversation_id in locked_conversation_ids
            ]
            if not to_process:
                release_conversation_locks()
                time.sleep(settings.poll_interval_seconds)
                continue

            conv_ids = [item.conversation_id for item in to_process]
            log.info(
                "[Worker] Processing %d conversation(s): %s",
                len(to_process),
                ", ".join(item.slug_id for item in to_process),
            )
        except Exception:
            release_conversation_locks()
            raise

        try:
            # Step 2: Batch SELECT
            scoring_input_revisions = fetch_scoring_input_revisions(
                processing_connection,
                conversation_ids=conv_ids,
            )
            ranking_items = fetch_ranking_items_batch(
                processing_connection,
                conversation_ids=conv_ids,
            )
            active_items = {
                conversation_id: [
                    item.slug_id
                    for item in items
                    if item.lifecycle_status.value in {"active", "in_progress"}
                ]
                for conversation_id, items in ranking_items.items()
            }
            comparisons_result = fetch_comparisons_batch(
                processing_connection,
                conversation_ids=conv_ids,
            )
            comparisons = comparisons_result.comparisons
            user_idx_to_result_id = comparisons_result.user_idx_to_result_id

            # Separate: conversations with enough data vs those to clear
            to_score: list[DirtyConversation] = []
            to_clear: set[int] = set()
            for item in to_process:
                cid = item.conversation_id
                items = active_items.get(cid, [])
                comps = comparisons.get(cid, [])
                if len(items) < 2 or not comps:
                    to_clear.add(cid)
                    log.info(
                        "[Worker] %s: %d items, %d comparisons -> clear",
                        item.slug_id,
                        len(items),
                        len(comps),
                    )
                else:
                    to_score.append(item)

            # Step 3: Parallel Solidago (ThreadPoolExecutor)
            scoring_results: dict[int, tuple[list[ScoredEntity], dict[str, int]]] = {}
            all_user_score_entries: list[UserScoreEntry] = []
            failed_items: list[DirtyConversation] = []

            if to_score:
                with ThreadPoolExecutor(max_workers=settings.max_workers) as pool:
                    future_to_item = {
                        pool.submit(
                            _score_one,
                            entity_ids=active_items[item.conversation_id],
                            comparisons=comparisons[item.conversation_id],
                        ): item
                        for item in to_score
                    }

                    for future in as_completed(future_to_item):
                        item = future_to_item[future]
                        try:
                            output = future.result()
                            if output is not None:
                                pc = build_participant_counts(
                                    comparisons[item.conversation_id],
                                    entity_ids=active_items[item.conversation_id],
                                )
                                scored = [
                                    ScoredEntity(
                                        entity_slug_id=r.entity_id,
                                        score=r.score,
                                        uncertainty_left=r.uncertainty_left,
                                        uncertainty_right=r.uncertainty_right,
                                        participant_count=pc.get(r.entity_id, 0),
                                    )
                                    for r in output.global_scores
                                ]
                                scoring_results[item.conversation_id] = (scored, pc)
                                log.info(
                                    "[Worker] %s: scored %d entities, %d users",
                                    item.slug_id,
                                    len(output.global_scores),
                                    len(output.user_scores),
                                )

                                # Map per-user scores to DB entries
                                idx_map = user_idx_to_result_id.get(item.conversation_id, {})
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
                                to_clear.add(item.conversation_id)
                        except Exception:
                            log.exception(
                                "[Worker] %s: Solidago failed",
                                item.slug_id,
                            )
                            failed_items.append(item)

            # Step 4: Final revision locking and atomic publication
            snapshot_scored_entities = {
                conversation_id: result[0] for conversation_id, result in scoring_results.items()
            }
            completed_conversation_ids = [
                *scoring_results.keys(),
                *to_clear,
            ]
            published = persist_scoring_batch(
                processing_connection,
                scoring_results=scoring_results,
                user_scores=all_user_score_entries,
                conversation_ids_to_clear=list(to_clear),
                snapshot_conversation_ids=completed_conversation_ids,
                ranking_items_by_conv=ranking_items,
                comparisons_by_conv=comparisons,
                total_vote_count_by_conversation=(
                    comparisons_result.total_vote_count_by_conversation
                ),
                total_participant_count_by_conversation=(
                    comparisons_result.total_participant_count_by_conversation
                ),
                scored_entities_by_conv=snapshot_scored_entities,
                scoring_input_revisions=scoring_input_revisions,
            )
            if not published:
                for item in to_process:
                    mark_dirty(vk, member=item.member, weight=item.weight)
                log.info(
                    "[Worker] Requeued batch because scoring input revisions "
                    "changed before publication",
                )
                continue

            # Handle failures: re-add with backoff
            for item in failed_items:
                backoff_until[item.conversation_id] = time.monotonic() + settings.backoff_seconds
                mark_dirty(vk, member=item.member, weight=item.weight)

        except Exception:
            # Entire batch failed (likely DB connection issue)
            log.exception("[Worker] Batch failed, re-adding all")
            for item in to_process:
                mark_dirty(vk, member=item.member, weight=item.weight)
            time.sleep(5)
        finally:
            release_conversation_locks()

    primary_engine.dispose()
    vk.close()
    log.info("[Worker] Shutdown complete")


def main() -> None:
    while _running:
        try:
            _run_worker_once()
            return
        except Exception:
            log.exception(
                "[Worker] Worker crashed; restarting in %.1fs",
                STARTUP_RETRY_INTERVAL_SECONDS,
            )
            _sleep_before_retry(STARTUP_RETRY_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
