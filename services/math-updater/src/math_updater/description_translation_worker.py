from __future__ import annotations

import logging
import signal
import time
import uuid
from typing import TYPE_CHECKING, cast

import valkey as valkey_lib
from sqlalchemy import create_engine

from math_updater.ai_description_work import (
    activate_pending_translation_expectations,
    fetch_due_ai_description_work_conversation_ids,
    recover_expired_ai_description_work,
)
from math_updater.config import (
    DescriptionTranslationWorkerSettings,
    MathUpdaterConfigError,
    validate_ai_description_config,
)
from math_updater.description_retry_processor import process_ai_description_conversation_ids
from math_updater.description_services import build_description_translator
from math_updater.retry_policy import RetryPolicy
from math_updater.valkey_client import (
    description_translation_queue_depth,
    now_ms,
    pop_due_description_translation_conversations,
    requeue_description_translation_conversations,
    schedule_description_translation_conversation,
)

if TYPE_CHECKING:
    from collections.abc import Callable

    from math_updater.bedrock_label_summary import ParsedLabelSummaryOutput
    from math_updater.description_input import ConversationDescriptionInput

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_running = True
LOG_PREFIX = "[DescriptionTranslationWorker]"


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("%s Received signal %d, shutting down", LOG_PREFIX, signum)
    _running = False


def _connect_to_valkey_with_retry(
    settings: DescriptionTranslationWorkerSettings,
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
        schedule_description_translation_conversation(
            vk,
            conversation_id=conversation_id,
            due_at_ms=due_at_ms,
        )


def _unused_description_generator(
    conversation: ConversationDescriptionInput,
) -> ParsedLabelSummaryOutput:
    msg = "description translation worker cannot generate English descriptions"
    raise RuntimeError(msg)


def main() -> None:
    settings = DescriptionTranslationWorkerSettings()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    worker_id = f"description-translation-worker:{uuid.uuid4()}"
    log.info(
        "%s Starting worker_id=%s pop_batch=%d claim_batch=%d translation=%d",
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

    translator_bundle = build_description_translator(settings)
    if translator_bundle is None:
        log.info("%s Description translation disabled", LOG_PREFIX)
        return
    log.info("%s Description translation mode=%s", LOG_PREFIX, translator_bundle.mode)

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
        "%s PostgreSQL connected translation_dirty_depth=%d",
        LOG_PREFIX,
        description_translation_queue_depth(vk),
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
                activated_ids = activate_pending_translation_expectations(
                    primary_engine,
                    limit=1000,
                )
                due_ids = fetch_due_ai_description_work_conversation_ids(
                    read_engine,
                    limit=1000,
                    ai_description_epoch=settings.ai_description_epoch,
                    translation_enabled=True,
                    include_lineage_descriptions=False,
                    include_translations=True,
                )
                conversation_ids = sorted({*activated_ids, *due_ids})
                _enqueue_conversation_ids(
                    vk,
                    conversation_ids=conversation_ids,
                    due_at_ms=now_ms(),
                )
                if conversation_ids:
                    log.info(
                        "%s Reconciled %d due translation conversation(s)",
                        LOG_PREFIX,
                        len(conversation_ids),
                    )
            except Exception:
                log.exception("%s Reconciliation failed", LOG_PREFIX)
            last_reconcile = monotonic_now

        if monotonic_now - last_recover >= settings.running_recovery_interval_seconds:
            try:
                recovered_ids = recover_expired_ai_description_work(
                    primary_engine,
                    translation_enabled=True,
                    include_lineage_descriptions=False,
                    include_translations=True,
                )
                _enqueue_conversation_ids(
                    vk,
                    conversation_ids=sorted(set(recovered_ids)),
                    due_at_ms=now_ms(),
                )
                if recovered_ids:
                    log.info(
                        "%s Recovered %d expired translation work items",
                        LOG_PREFIX,
                        len(recovered_ids),
                    )
            except Exception:
                log.exception("%s Running-work recovery failed", LOG_PREFIX)
            last_recover = monotonic_now

        due_items, next_due_at_ms = pop_due_description_translation_conversations(
            vk,
            count=settings.valkey_pop_batch_size,
        )
        if not due_items:
            if next_due_at_ms is None:
                time.sleep(settings.worker_poll_idle_sleep_seconds)
            else:
                sleep_ms = max(0, next_due_at_ms - now_ms())
                time.sleep(min(settings.worker_poll_idle_sleep_seconds, sleep_ms / 1000))
            continue

        claimable_due_items = due_items[: settings.db_claim_batch_size]
        overflow_due_items = due_items[settings.db_claim_batch_size :]
        requeue_description_translation_conversations(vk, conversations=overflow_due_items)
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
            description_generator=_unused_description_generator,
            description_translator=translator_bundle.translate,
            claim_lineage_descriptions=False,
            claim_translations=True,
            log_prefix=LOG_PREFIX,
        )
        if processed_count:
            log.info("%s Processed %d translation work item(s)", LOG_PREFIX, processed_count)

    primary_engine.dispose()
    read_engine.dispose()
    vk.close()
    log.info("%s Shutdown complete", LOG_PREFIX)


if __name__ == "__main__":
    main()
