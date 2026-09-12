from __future__ import annotations

import logging
import signal
import time
import uuid
from contextlib import ExitStack
from threading import Event
from typing import TYPE_CHECKING

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
from agora_analysis_worker_shared.worker_progress import monitor_worker_progress
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

if TYPE_CHECKING:
    from collections.abc import Callable

    from agora_analysis_worker_shared.description_retry_processor import DescriptionGenerator
    from agora_analysis_worker_shared.simulation_providers import SimulationRuntime

log = logging.getLogger(__name__)
LOG_PREFIX = "[AiDescriptionRetryWorker]"
NO_CLAIM_LOG_INTERVAL_SECONDS = 60.0
DATABASE_RETRY_INITIAL_SECONDS = 5.0
DATABASE_RETRY_MAX_SECONDS = 60.0
IDLE_BACKOFF_MAX_SECONDS = 5.0


def run_worker(
    *,
    settings: AiDescriptionWorkerSettings,
    worker_id: str,
    description_generator: DescriptionGenerator,
    simulation_runtime: SimulationRuntime | None,
    should_continue: Callable[[], bool],
    sleep: Callable[[float], None],
) -> None:
    with (
        monitor_worker_progress(logger=log, log_prefix=LOG_PREFIX) as report_phase,
        ExitStack() as resources,
    ):
        phase = "connecting-primary"

        def set_phase(next_phase: str) -> None:
            nonlocal phase
            phase = next_phase
            report_phase(next_phase)

        set_phase("connecting-primary")
        primary_engine = create_ready_postgres_engine(
            connection_string=settings.connection_string,
            role="primary",
            logger=log,
            log_prefix=LOG_PREFIX,
            retry_interval_seconds=DATABASE_RETRY_INITIAL_SECONDS,
            should_continue=should_continue,
            sleep_fn=sleep,
            statement_timeout_seconds=settings.db_statement_timeout_seconds,
            idle_transaction_timeout_seconds=settings.db_idle_transaction_timeout_seconds,
        )
        if primary_engine is None:
            return
        resources.callback(primary_engine.dispose)
        read_engine = primary_engine
        if settings.read_dsn != settings.connection_string:
            set_phase("connecting-read")
            read_engine = create_ready_postgres_engine(
                connection_string=settings.read_dsn,
                role="read",
                logger=log,
                log_prefix=LOG_PREFIX,
                retry_interval_seconds=DATABASE_RETRY_INITIAL_SECONDS,
                should_continue=should_continue,
                sleep_fn=sleep,
                statement_timeout_seconds=settings.db_statement_timeout_seconds,
                idle_transaction_timeout_seconds=settings.db_idle_transaction_timeout_seconds,
            )
            if read_engine is None:
                return
            resources.callback(read_engine.dispose)
        log.info(
            "%s PostgreSQL connected statement_timeout_default_seconds=%d "
            "idle_transaction_timeout_default_seconds=%d materialization_interval_seconds=%.1f",
            LOG_PREFIX,
            settings.db_statement_timeout_seconds,
            settings.db_idle_transaction_timeout_seconds,
            settings.db_materialization_interval_seconds,
        )

        last_recover = time.monotonic() - settings.running_recovery_interval_seconds
        last_materialize = time.monotonic() - settings.db_materialization_interval_seconds
        last_no_claim_warning = time.monotonic() - NO_CLAIM_LOG_INTERVAL_SECONDS
        consecutive_failures = 0
        retry_delay = DATABASE_RETRY_INITIAL_SECONDS
        idle_delay = settings.worker_poll_idle_sleep_seconds

        while should_continue():
            cycle_started_at = time.monotonic()
            try:
                if cycle_started_at - last_recover >= settings.running_recovery_interval_seconds:
                    set_phase("recovering-primary")
                    recovered_ids = recover_expired_ai_description_work(
                        primary_engine,
                        translation_enabled=False,
                        include_lineage_descriptions=True,
                        include_translations=False,
                        require_activated_view_snapshot=True,
                    )
                    if recovered_ids:
                        log.info(
                            "%s Recovered expired lineage work for %d conversation(s)",
                            LOG_PREFIX,
                            len(recovered_ids),
                        )
                    last_recover = time.monotonic()

                materialized_ids: list[int] = []
                if (
                    time.monotonic() - last_materialize
                    >= settings.db_materialization_interval_seconds
                ):
                    set_phase("materializing-primary")
                    materialized_ids = materialize_requested_lineage_description_work(
                        primary_engine,
                        limit=settings.db_claim_batch_size,
                        require_activated_view_snapshot=True,
                        include_checkpoints=True,
                    )
                    last_materialize = time.monotonic()
                    if materialized_ids:
                        log.info(
                            "%s Materialized requested lineage work for %d conversation(s)",
                            LOG_PREFIX,
                            len(materialized_ids),
                        )

                # A materialization just committed on the writer. Scan that same
                # database view rather than waiting for replica replay.
                scan_engine = primary_engine if materialized_ids else read_engine
                set_phase("scanning-primary" if scan_engine is primary_engine else "scanning-read")
                claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
                    scan_engine,
                    limit=settings.db_claim_batch_size,
                    ai_description_epoch=settings.ai_description_epoch,
                    translation_enabled=False,
                    include_lineage_descriptions=True,
                    include_translations=False,
                    require_activated_view_snapshot=True,
                    retry_cooldown_seconds=settings.retry_cooldown_seconds,
                )
                if not should_continue():
                    return
                processed_count = 0
                if claimable_ids:
                    set_phase("processing-lineages")
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
                consecutive_failures += 1
                log_database_error(
                    logger=log,
                    message=f"{LOG_PREFIX} Database operation failed; retrying",
                    error=error,
                    context={
                        "phase": phase,
                        "consecutive_failures": consecutive_failures,
                        "cycle_seconds": round(time.monotonic() - cycle_started_at, 1),
                        "retry_seconds": retry_delay,
                    },
                )
                set_phase("database-backoff")
                sleep(retry_delay)
                retry_delay = min(retry_delay * 2, DATABASE_RETRY_MAX_SECONDS)
                continue

            if consecutive_failures:
                log.info(
                    "%s Database polling recovered after %d failed cycle(s) claimable_count=%d",
                    LOG_PREFIX,
                    consecutive_failures,
                    len(claimable_ids),
                )
                consecutive_failures = 0
                retry_delay = DATABASE_RETRY_INITIAL_SECONDS

            cycle_seconds = time.monotonic() - cycle_started_at
            if processed_count:
                idle_delay = settings.worker_poll_idle_sleep_seconds
                log.info(
                    "%s Processed %d lineage work item(s) cycle_seconds=%.1f",
                    LOG_PREFIX,
                    processed_count,
                    cycle_seconds,
                )
            else:
                now = time.monotonic()
                if claimable_ids and now - last_no_claim_warning >= NO_CLAIM_LOG_INTERVAL_SECONDS:
                    log.warning(
                        "%s Claimable lineage conversations yielded no claimed work; "
                        "conversation_count=%d cycle_seconds=%.1f",
                        LOG_PREFIX,
                        len(claimable_ids),
                        cycle_seconds,
                    )
                    last_no_claim_warning = now
                set_phase("idle")
                sleep(idle_delay)
                idle_delay = min(
                    idle_delay * 2,
                    max(IDLE_BACKOFF_MAX_SECONDS, settings.worker_poll_idle_sleep_seconds),
                )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
    try:
        settings = AiDescriptionWorkerSettings()
    except ValidationError:
        log.error("%s Invalid configuration errorType=ValidationError", LOG_PREFIX)
        raise SystemExit(1) from None
    configure_worker_logging(log_level=settings.effective_log_level)
    stop = Event()

    def handle_signal(signum: int, frame: object) -> None:
        log.info("%s Received signal %d, shutting down", LOG_PREFIX, signum)
        stop.set()

    def sleep(seconds: float) -> None:
        stop.wait(seconds)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
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
    except MathUpdaterConfigError:
        log.error("%s Configuration errorType=MathUpdaterConfigError", LOG_PREFIX)
        raise SystemExit(1) from None
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
    run_worker(
        settings=settings,
        worker_id=worker_id,
        description_generator=description_generator,
        simulation_runtime=simulation_runtime,
        should_continue=lambda: not stop.is_set(),
        sleep=sleep,
    )
    log.info("%s Shutdown complete", LOG_PREFIX)


if __name__ == "__main__":
    main()
