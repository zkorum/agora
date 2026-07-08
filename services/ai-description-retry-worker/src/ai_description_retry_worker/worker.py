from __future__ import annotations

import logging
import signal
import time
import uuid

from agora_analysis_worker_shared.ai_description_work import (
    fetch_claimable_ai_description_work_conversation_ids,
    materialize_requested_lineage_description_work,
    recover_expired_ai_description_work,
)
from agora_analysis_worker_shared.config import (
    AiDescriptionWorkerSettings,
    MathUpdaterConfigError,
    validate_ai_description_config,
)
from agora_analysis_worker_shared.description_retry_processor import (
    process_ai_description_conversation_ids,
)
from agora_analysis_worker_shared.description_services import build_description_generator
from agora_analysis_worker_shared.logging_utils import (
    LOG_FORMAT,
    configure_worker_logging,
    log_database_error,
)
from agora_analysis_worker_shared.postgres_engine import create_ready_postgres_engine
from agora_analysis_worker_shared.simulation_providers import (
    build_simulation_runtime,
    log_simulation_startup,
)
from sqlalchemy.exc import SQLAlchemyError

logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
)
log = logging.getLogger(__name__)

_running = True
LOG_PREFIX = "[AiDescriptionRetryWorker]"
NO_CLAIM_LOG_INTERVAL_SECONDS = 60.0


def _sleep_before_retry(seconds: float) -> None:
    deadline = time.monotonic() + seconds
    while _running:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(min(0.5, remaining))


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("%s Received signal %d, shutting down", LOG_PREFIX, signum)
    _running = False


def main() -> None:
    settings = AiDescriptionWorkerSettings()
    configure_worker_logging(log_level=settings.effective_log_level)

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    worker_id = f"ai-desc:{uuid.uuid4()}"
    log.info(
        "%s Starting worker_id=%s claim_batch=%d ai=%d lease_ttl=%ds "
        "heartbeat=%ds recovery=%ds retry_cooldown=%ds",
        LOG_PREFIX,
        worker_id,
        settings.db_claim_batch_size,
        settings.max_ai_description_concurrency,
        settings.lease_ttl_seconds,
        settings.heartbeat_interval_seconds,
        settings.running_recovery_interval_seconds,
        settings.retry_cooldown_seconds,
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
        "%s AI description generation enabled provider_mode=%s model=%s region=%s "
        "connect_timeout=%ss read_timeout=%ss max_tokens=%d concurrency=%d",
        LOG_PREFIX,
        "simulation" if settings.ai_description_simulation_enabled else "bedrock",
        settings.aws_ai_label_summary_model_id,
        settings.aws_ai_label_summary_region,
        settings.aws_client_connect_timeout_seconds,
        settings.aws_ai_label_summary_read_timeout_seconds,
        settings.aws_ai_label_summary_max_tokens,
        settings.max_ai_description_concurrency,
    )

    primary_engine = create_ready_postgres_engine(
        connection_string=settings.connection_string,
        role="primary",
        logger=log,
        log_prefix=LOG_PREFIX,
        retry_interval_seconds=settings.valkey_retry_interval_seconds,
        should_continue=lambda: _running,
        sleep_fn=_sleep_before_retry,
    )
    if primary_engine is None:
        log.info("%s Shutdown complete", LOG_PREFIX)
        return
    read_engine = create_ready_postgres_engine(
        connection_string=settings.read_dsn,
        role="read",
        logger=log,
        log_prefix=LOG_PREFIX,
        retry_interval_seconds=settings.valkey_retry_interval_seconds,
        should_continue=lambda: _running,
        sleep_fn=_sleep_before_retry,
    )
    if read_engine is None:
        primary_engine.dispose()
        log.info("%s Shutdown complete", LOG_PREFIX)
        return
    log.info("%s PostgreSQL connected", LOG_PREFIX)
    monotonic_start = time.monotonic()
    last_recover = monotonic_start - settings.running_recovery_interval_seconds
    last_no_claim_warning = monotonic_start - NO_CLAIM_LOG_INTERVAL_SECONDS

    while _running:
        monotonic_now = time.monotonic()

        if monotonic_now - last_recover >= settings.running_recovery_interval_seconds:
            try:
                recovered_ids = recover_expired_ai_description_work(
                    primary_engine,
                    translation_enabled=False,
                    include_lineage_descriptions=True,
                    include_translations=False,
                    require_activated_view_snapshot=True,
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

        materialized_ids: list[int] = []
        try:
            materialized_ids = materialize_requested_lineage_description_work(
                primary_engine,
                limit=settings.db_claim_batch_size,
                require_activated_view_snapshot=True,
                include_checkpoints=True,
            )
            if materialized_ids:
                log.info(
                    "%s Materialized requested lineage work for %d conversation(s)",
                    LOG_PREFIX,
                    len(materialized_ids),
                )
            read_scan_ids = fetch_claimable_ai_description_work_conversation_ids(
                read_engine,
                limit=settings.db_claim_batch_size,
                ai_description_epoch=settings.ai_description_epoch,
                translation_enabled=False,
                include_lineage_descriptions=True,
                include_translations=False,
                require_activated_view_snapshot=True,
                retry_cooldown_seconds=settings.retry_cooldown_seconds,
            )
            primary_scan_ids: list[int] = []
            if materialized_ids:
                primary_scan_ids = fetch_claimable_ai_description_work_conversation_ids(
                    primary_engine,
                    limit=settings.db_claim_batch_size,
                    ai_description_epoch=settings.ai_description_epoch,
                    translation_enabled=False,
                    include_lineage_descriptions=True,
                    include_translations=False,
                    require_activated_view_snapshot=True,
                    retry_cooldown_seconds=settings.retry_cooldown_seconds,
                )
            claimable_ids = sorted({*read_scan_ids, *primary_scan_ids})[
                : settings.db_claim_batch_size
            ]
        except Exception:
            log.exception("%s Claimable lineage scan failed", LOG_PREFIX)
            time.sleep(settings.worker_poll_idle_sleep_seconds)
            continue
        if not claimable_ids:
            time.sleep(settings.worker_poll_idle_sleep_seconds)
            continue

        log.debug(
            "%s Found claimable lineage conversation(s) read_scan_count=%d "
            "primary_scan_count=%d materialized_count=%d selected_count=%d selected_ids=%s",
            LOG_PREFIX,
            len(read_scan_ids),
            len(primary_scan_ids),
            len(materialized_ids),
            len(claimable_ids),
            ",".join(str(conversation_id) for conversation_id in claimable_ids),
        )

        batch_started_at = time.perf_counter()
        try:
            processed_count = process_ai_description_conversation_ids(
                primary_engine=primary_engine,
                worker_id=worker_id,
                conversation_ids=claimable_ids,
                lease_ttl_seconds=settings.lease_ttl_seconds,
                heartbeat_interval_seconds=settings.heartbeat_interval_seconds,
                claim_limit=settings.db_claim_batch_size,
                max_workers=settings.max_ai_description_concurrency,
                ai_description_epoch=settings.ai_description_epoch,
                retry_cooldown_seconds=settings.retry_cooldown_seconds,
                description_generator=description_generator,
                description_translator=None,
                claim_lineage_descriptions=True,
                claim_translations=False,
                simulation_runtime=simulation_runtime,
                log_prefix=LOG_PREFIX,
            )
        except SQLAlchemyError as error:
            log_database_error(
                logger=log,
                message=f"{LOG_PREFIX} Lineage processing failed; retrying later",
                error=error,
                context={
                    "conversation_count": len(claimable_ids),
                    "ids": ",".join(str(conversation_id) for conversation_id in claimable_ids),
                },
            )
            _sleep_before_retry(settings.worker_poll_idle_sleep_seconds)
            continue
        if processed_count:
            log.info(
                "%s Processed %d lineage work item(s) batch_ms=%.1f",
                LOG_PREFIX,
                processed_count,
                (time.perf_counter() - batch_started_at) * 1000,
            )
        else:
            elapsed_ms = (time.perf_counter() - batch_started_at) * 1000
            if monotonic_now - last_no_claim_warning >= NO_CLAIM_LOG_INTERVAL_SECONDS:
                log.warning(
                    "%s Claimable lineage conversations yielded no claimed work; "
                    "sleeping idle interval conversation_count=%d ids=%s batch_ms=%.1f",
                    LOG_PREFIX,
                    len(claimable_ids),
                    ",".join(str(conversation_id) for conversation_id in claimable_ids),
                    elapsed_ms,
                )
                last_no_claim_warning = monotonic_now
            else:
                log.debug(
                    "%s No lineage work item processed conversation_count=%d ids=%s batch_ms=%.1f",
                    LOG_PREFIX,
                    len(claimable_ids),
                    ",".join(str(conversation_id) for conversation_id in claimable_ids),
                    elapsed_ms,
                )
            _sleep_before_retry(settings.worker_poll_idle_sleep_seconds)

    primary_engine.dispose()
    read_engine.dispose()
    log.info("%s Shutdown complete", LOG_PREFIX)


if __name__ == "__main__":
    main()
