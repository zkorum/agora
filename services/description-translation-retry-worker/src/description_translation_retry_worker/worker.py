from __future__ import annotations

import logging
import signal
import time
import uuid
from typing import TYPE_CHECKING

from agora_worker_shared.ai_description_work import (
    activate_pending_translation_expectations,
    fetch_due_ai_description_work_conversation_ids,
    recover_expired_ai_description_work,
)
from agora_worker_shared.config import (
    DescriptionTranslationWorkerSettings,
    MathUpdaterConfigError,
    validate_ai_description_config,
)
from agora_worker_shared.description_retry_processor import process_ai_description_conversation_ids
from agora_worker_shared.description_services import build_description_translator
from agora_worker_shared.retry_policy import RetryPolicy
from agora_worker_shared.simulation_providers import (
    build_simulation_runtime,
    log_simulation_startup,
)
from sqlalchemy import create_engine

if TYPE_CHECKING:
    from agora_worker_shared.bedrock_label_summary import ParsedLabelSummaryOutput
    from agora_worker_shared.description_input import ConversationDescriptionInput

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_running = True
LOG_PREFIX = "[DescriptionTranslationRetryWorker]"


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("%s Received signal %d, shutting down", LOG_PREFIX, signum)
    _running = False


def _unused_description_generator(
    conversation: ConversationDescriptionInput,
) -> ParsedLabelSummaryOutput:
    msg = "description translation retry worker cannot generate English descriptions"
    raise RuntimeError(msg)


def main() -> None:
    settings = DescriptionTranslationWorkerSettings()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    worker_id = f"desc-trans:{uuid.uuid4()}"
    log.info(
        "%s Starting worker_id=%s claim_batch=%d translation=%d "
        "lease_ttl=%ds recovery=%ds",
        LOG_PREFIX,
        worker_id,
        settings.db_claim_batch_size,
        settings.max_ai_description_concurrency,
        settings.lease_ttl_seconds,
        settings.running_recovery_interval_seconds,
    )

    try:
        validate_ai_description_config(settings)
    except MathUpdaterConfigError as error:
        log.error("%s Configuration error: %s", LOG_PREFIX, error)
        raise SystemExit(1) from error
    log_simulation_startup(settings)
    simulation_runtime = build_simulation_runtime(settings)

    translator_bundle = build_description_translator(settings)
    if translator_bundle is None:
        log.info("%s Description translation disabled", LOG_PREFIX)
        return
    log.info("%s Description translation mode=%s", LOG_PREFIX, translator_bundle.mode)

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
    log.info("%s PostgreSQL connected", LOG_PREFIX)
    retry_policy = RetryPolicy(
        burst_attempts=settings.retry_burst_attempts,
        burst_interval_seconds=settings.retry_burst_seconds,
        cooldown_seconds=settings.retry_cooldown_seconds,
    )

    monotonic_start = time.monotonic()
    last_recover = monotonic_start - settings.running_recovery_interval_seconds

    while _running:
        monotonic_now = time.monotonic()

        if monotonic_now - last_recover >= settings.running_recovery_interval_seconds:
            try:
                recovered_ids = recover_expired_ai_description_work(
                    primary_engine,
                    translation_enabled=True,
                    include_lineage_descriptions=False,
                    include_translations=True,
                    require_activated_view_snapshot=True,
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

        try:
            activated_ids = activate_pending_translation_expectations(
                primary_engine,
                limit=settings.db_claim_batch_size,
                require_activated_view_snapshot=True,
            )
            if activated_ids:
                log.info(
                    "%s Activated translation expectations for %d conversation(s)",
                    LOG_PREFIX,
                    len(activated_ids),
                )
        except Exception:
            log.exception("%s Translation expectation activation failed", LOG_PREFIX)

        try:
            due_ids = fetch_due_ai_description_work_conversation_ids(
                read_engine,
                limit=settings.db_claim_batch_size,
                ai_description_epoch=settings.ai_description_epoch,
                translation_enabled=True,
                include_lineage_descriptions=False,
                include_translations=True,
                require_activated_view_snapshot=True,
            )
        except Exception:
            log.exception("%s Due translation scan failed", LOG_PREFIX)
            time.sleep(settings.worker_poll_idle_sleep_seconds)
            continue
        if not due_ids:
            time.sleep(settings.worker_poll_idle_sleep_seconds)
            continue

        log.info(
            "%s Found due translation conversation(s) source=read_replica count=%d ids=%s",
            LOG_PREFIX,
            len(due_ids),
            ",".join(str(conversation_id) for conversation_id in due_ids),
        )

        batch_started_at = time.perf_counter()
        processed_count = process_ai_description_conversation_ids(
            primary_engine=primary_engine,
            worker_id=worker_id,
            conversation_ids=due_ids,
            lease_ttl_seconds=settings.lease_ttl_seconds,
            claim_limit=settings.db_claim_batch_size,
            max_workers=settings.max_ai_description_concurrency,
            ai_description_epoch=settings.ai_description_epoch,
            retry_policy=retry_policy,
            description_generator=_unused_description_generator,
            description_translator=translator_bundle.translate,
            claim_lineage_descriptions=False,
            claim_translations=True,
            simulation_runtime=simulation_runtime,
            log_prefix=LOG_PREFIX,
        )
        if processed_count:
            log.info(
                "%s Processed %d translation work item(s) batch_ms=%.1f",
                LOG_PREFIX,
                processed_count,
                (time.perf_counter() - batch_started_at) * 1000,
            )
        else:
            log.info(
                "%s No translation work item processed conversation_count=%d ids=%s batch_ms=%.1f",
                LOG_PREFIX,
                len(due_ids),
                ",".join(str(conversation_id) for conversation_id in due_ids),
                (time.perf_counter() - batch_started_at) * 1000,
            )

    primary_engine.dispose()
    read_engine.dispose()
    log.info("%s Shutdown complete", LOG_PREFIX)


if __name__ == "__main__":
    main()
