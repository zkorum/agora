from __future__ import annotations

import logging
import signal
import time
import uuid
from typing import TYPE_CHECKING, cast

import valkey as valkey_lib
from agora_worker_shared.ai_description_work import (
    fetch_due_ai_description_work_conversation_ids,
    recover_expired_ai_description_work,
)
from agora_worker_shared.config import (
    AiDescriptionWorkerSettings,
    MathUpdaterConfigError,
    validate_ai_description_config,
)
from agora_worker_shared.description_retry_processor import process_ai_description_conversation_ids
from agora_worker_shared.description_services import build_description_generator
from agora_worker_shared.retry_policy import RetryPolicy
from agora_worker_shared.simulation_providers import (
    build_simulation_runtime,
    log_simulation_startup,
)
from agora_worker_shared.valkey_client import (
    ai_description_queue_depth,
    format_queue_lag_ms,
    now_ms,
    pop_due_ai_description_conversations,
    requeue_ai_description_conversations,
    schedule_ai_description_conversation,
)
from sqlalchemy import create_engine

if TYPE_CHECKING:
    from collections.abc import Callable

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_running = True
LOG_PREFIX = "[AiDescriptionRetryWorker]"


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("%s Received signal %d, shutting down", LOG_PREFIX, signum)
    _running = False


def _connect_to_valkey_with_retry(
    settings: AiDescriptionWorkerSettings,
) -> valkey_lib.Valkey | None:
    valkey_url = str(settings.valkey_url)
    while _running:
        try:
            from_url = cast("Callable[..., object]", valkey_lib.from_url)
            vk = cast(
                "valkey_lib.Valkey",
                from_url(valkey_url, decode_responses=True),
            )
            ping = cast("Callable[[], object]", vk.ping)
            ping()
            log.info("%s Valkey connected", LOG_PREFIX)
            return vk
        except Exception as error:
            log.warning(
                "%s Valkey unavailable at %s (%s); retrying in %.1fs",
                LOG_PREFIX,
                valkey_url,
                error,
                settings.valkey_retry_interval_seconds,
            )
            time.sleep(settings.valkey_retry_interval_seconds)
    return None


def _enqueue_conversation_ids(
    vk: valkey_lib.Valkey,
    *,
    conversation_ids: list[int],
    due_at_ms: int,
) -> None:
    for conversation_id in conversation_ids:
        schedule_ai_description_conversation(
            vk,
            conversation_id=conversation_id,
            due_at_ms=due_at_ms,
        )


def main() -> None:
    settings = AiDescriptionWorkerSettings()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    worker_id = f"ai-description-retry-worker:{uuid.uuid4()}"
    log.info(
        "%s Starting worker_id=%s pop_batch=%d claim_batch=%d ai=%d",
        LOG_PREFIX,
        worker_id,
        settings.valkey_pop_batch_size,
        settings.db_claim_batch_size,
        settings.max_ai_description_concurrency,
    )

    try:
        validate_ai_description_config(settings)
    except MathUpdaterConfigError as error:
        log.error("%s Configuration error: %s", LOG_PREFIX, error)
        raise SystemExit(1) from error
    log_simulation_startup(settings)
    simulation_runtime = build_simulation_runtime(settings)

    description_generator = build_description_generator(settings)
    if description_generator is None:
        log.info("%s AI description generation disabled", LOG_PREFIX)
        return
    log.info(
        "%s AI description generation enabled provider_mode=%s",
        LOG_PREFIX,
        "simulation" if settings.ai_description_simulation_enabled else "bedrock",
    )

    vk = _connect_to_valkey_with_retry(settings)
    if vk is None:
        log.info("%s Shutdown complete", LOG_PREFIX)
        return

    primary_engine = create_engine(
        settings.connection_string.replace("postgres://", "postgresql+psycopg://"),
        pool_pre_ping=True,
        hide_parameters=True,
    )
    read_engine = create_engine(
        settings.read_dsn.replace("postgres://", "postgresql+psycopg://"),
        pool_pre_ping=True,
        hide_parameters=True,
    )
    log.info(
        "%s PostgreSQL connected ai_description_dirty_depth=%d",
        LOG_PREFIX,
        ai_description_queue_depth(vk),
    )
    retry_policy = RetryPolicy(
        burst_attempts=settings.retry_burst_attempts,
        burst_interval_seconds=settings.retry_burst_seconds,
        cooldown_seconds=settings.retry_cooldown_seconds,
    )

    last_reconcile = time.monotonic()
    last_recover = time.monotonic()

    while _running:
        monotonic_now = time.monotonic()

        if monotonic_now - last_reconcile >= settings.reconciliation_interval_seconds:
            try:
                due_ids = fetch_due_ai_description_work_conversation_ids(
                    read_engine,
                    limit=1000,
                    ai_description_epoch=settings.ai_description_epoch,
                    translation_enabled=False,
                    include_lineage_descriptions=True,
                    include_translations=False,
                )
                _enqueue_conversation_ids(
                    vk,
                    conversation_ids=sorted(set(due_ids)),
                    due_at_ms=now_ms(),
                )
                if due_ids:
                    log.info("%s Reconciled %d due conversations", LOG_PREFIX, len(due_ids))
            except Exception:
                log.exception("%s Reconciliation failed", LOG_PREFIX)
            last_reconcile = monotonic_now

        if monotonic_now - last_recover >= settings.running_recovery_interval_seconds:
            try:
                recovered_ids = recover_expired_ai_description_work(
                    primary_engine,
                    translation_enabled=False,
                    include_lineage_descriptions=True,
                    include_translations=False,
                )
                _enqueue_conversation_ids(
                    vk,
                    conversation_ids=sorted(set(recovered_ids)),
                    due_at_ms=now_ms(),
                )
                if recovered_ids:
                    log.info(
                        "%s Recovered %d expired lineage work items",
                        LOG_PREFIX,
                        len(recovered_ids),
                    )
            except Exception:
                log.exception("%s Running-work recovery failed", LOG_PREFIX)
            last_recover = monotonic_now

        pop_current_ms = now_ms()
        due_items, next_due_at_ms = pop_due_ai_description_conversations(
            vk,
            count=settings.valkey_pop_batch_size,
            current_time_ms=pop_current_ms,
        )
        if not due_items:
            if next_due_at_ms is None:
                time.sleep(settings.worker_poll_idle_sleep_seconds)
            else:
                sleep_ms = max(0, next_due_at_ms - now_ms())
                time.sleep(min(settings.worker_poll_idle_sleep_seconds, sleep_ms / 1000))
            continue

        log.info(
            "%s Popped %d due lineage conversation(s) queue_lag_ms=%s",
            LOG_PREFIX,
            len(due_items),
            format_queue_lag_ms(due_items, current_time_ms=pop_current_ms),
        )

        batch_started_at = time.perf_counter()
        claimable_due_items = due_items[: settings.db_claim_batch_size]
        overflow_due_items = due_items[settings.db_claim_batch_size :]
        requeue_ai_description_conversations(vk, conversations=overflow_due_items)
        if overflow_due_items:
            log.info(
                "%s Requeued %d overflow lineage conversation(s)",
                LOG_PREFIX,
                len(overflow_due_items),
            )
        processed_count = process_ai_description_conversation_ids(
            primary_engine=primary_engine,
            vk=vk,
            worker_id=worker_id,
            conversation_ids=[item.conversation_id for item in claimable_due_items],
            lease_ttl_seconds=settings.lease_ttl_seconds,
            claim_limit=settings.db_claim_batch_size,
            max_workers=settings.max_ai_description_concurrency,
            ai_description_epoch=settings.ai_description_epoch,
            retry_policy=retry_policy,
            description_generator=description_generator,
            description_translator=None,
            claim_lineage_descriptions=True,
            claim_translations=False,
            simulation_runtime=simulation_runtime,
            log_prefix=LOG_PREFIX,
        )
        if processed_count:
            log.info(
                "%s Processed %d lineage work item(s) batch_ms=%.1f",
                LOG_PREFIX,
                processed_count,
                (time.perf_counter() - batch_started_at) * 1000,
            )
        else:
            log.info(
                "%s No lineage work item processed conversation_count=%d batch_ms=%.1f",
                LOG_PREFIX,
                len(claimable_due_items),
                (time.perf_counter() - batch_started_at) * 1000,
            )

    primary_engine.dispose()
    read_engine.dispose()
    vk.close()
    log.info("%s Shutdown complete", LOG_PREFIX)


if __name__ == "__main__":
    main()
