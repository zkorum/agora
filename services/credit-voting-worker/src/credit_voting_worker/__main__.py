from __future__ import annotations

import logging
import random
import signal
from concurrent.futures import ThreadPoolExecutor
from threading import Event
from time import monotonic
from typing import TYPE_CHECKING

from agora_analysis_worker_shared.logging_utils import (
    configure_worker_logging,
    log_worker_error_summary,
)
from agora_analysis_worker_shared.postgres_engine import create_postgres_engine
from sqlalchemy.exc import SQLAlchemyError

from credit_voting_worker.calculation_worker import run_calculations
from credit_voting_worker.config import Settings
from credit_voting_worker.stats import initialize_missing_stats, refresh_next_stats

if TYPE_CHECKING:
    from types import FrameType


def main() -> None:
    settings = Settings()
    configure_worker_logging(log_level=settings.resolved_log_level)
    logger = logging.getLogger("credit_voting_worker")
    stopping = Event()

    def stop(_signal: int, _frame: FrameType | None) -> None:
        stopping.set()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    engine = create_postgres_engine(
        settings.connection_string,
        application_name="credit-voting-worker",
        statement_timeout_seconds=settings.statement_timeout_seconds,
        idle_transaction_timeout_seconds=settings.statement_timeout_seconds,
    )
    backoff = 1.0
    executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="qv-calculation")
    calculation = executor.submit(
        run_calculations,
        engine=engine,
        stopping=stopping,
        lease_seconds=settings.calculation_lease_seconds,
    )
    # A failed calculation slot must stop the statistics loop too. Retrieving the
    # future below propagates the fatal error after resources have been closed.
    calculation.add_done_callback(lambda _: stopping.set())
    next_discovery = 0.0
    logger.info("QV live statistics worker started")
    try:
        while not stopping.is_set():
            try:
                if monotonic() >= next_discovery:
                    initialized = initialize_missing_stats(engine=engine)
                    # Drain bounded bootstrap batches, then leave discovery off
                    # the refresh hot path until the next reconciliation interval.
                    if initialized == 0:
                        next_discovery = monotonic() + settings.reconcile_seconds
                refreshed = refresh_next_stats(
                    engine=engine,
                    reconcile_seconds=settings.reconcile_seconds,
                    min_refresh_seconds=settings.min_stats_refresh_seconds,
                )
                backoff = 1.0
                if refreshed is None:
                    stopping.wait(settings.poll_interval_seconds)
            except SQLAlchemyError as error:
                # Rollback releases every claim before waiting. Durable signals
                # survive outages; no attempt budget or public Retry is involved.
                log_worker_error_summary(
                    logger=logger,
                    message="QV statistics refresh deferred",
                    error=error,
                )
                stopping.wait(backoff + random.uniform(0, backoff / 4))
                backoff = min(backoff * 2, 60.0)
    finally:
        stopping.set()
        executor.shutdown(wait=True)
        engine.dispose()
        logger.info("QV live statistics worker stopped")
    calculation.result()


if __name__ == "__main__":
    main()
