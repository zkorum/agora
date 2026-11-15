from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from agora_analysis_worker_shared.logging_utils import log_worker_error_summary
from sqlalchemy.exc import DataError, IntegrityError, SQLAlchemyError

from credit_voting_worker.capture import capture_inputs
from credit_voting_worker.tally import compute_results, publish_results
from credit_voting_worker.work import InvalidInputError, claim_next, release_failed_claim

if TYPE_CHECKING:
    from threading import Event

    from sqlalchemy import Engine


def run_calculations(*, engine: Engine, stopping: Event, lease_seconds: int) -> None:
    """One bounded calculation slot per process, independent of live-statistics SQL."""
    logger = logging.getLogger("credit_voting_worker.calculation")
    while not stopping.is_set():
        claim = None
        try:
            claim = claim_next(engine=engine, lease_seconds=lease_seconds)
            if claim is None:
                stopping.wait(1)
                continue
            snapshot_id = capture_inputs(
                engine=engine, claim=claim, lease_seconds=lease_seconds, should_stop=stopping.is_set
            )
            if snapshot_id is None:
                continue
            if stopping.is_set():
                raise InterruptedError("QV calculation stopped")
            results = compute_results(
                engine=engine, claim=claim, snapshot_id=snapshot_id, lease_seconds=lease_seconds
            )
            if results is not None and not stopping.is_set():
                publish_results(
                    engine=engine, claim=claim, snapshot_id=snapshot_id, results=results
                )
            elif stopping.is_set():
                raise InterruptedError("QV calculation stopped")
        except (SQLAlchemyError, InvalidInputError, TimeoutError, InterruptedError) as error:
            permanent = isinstance(error, (InvalidInputError, IntegrityError, DataError))
            log_worker_error_summary(logger=logger, message="QV calculation deferred", error=error)
            if claim is not None:
                try:
                    release_failed_claim(engine=engine, claim=claim, permanent=permanent)
                except SQLAlchemyError as release_error:
                    log_worker_error_summary(
                        logger=logger,
                        message="QV claim release deferred to lease recovery",
                        error=release_error,
                    )
            # Per-job retry timestamps release this slot for other conversations.
            # When the database itself is unavailable, also avoid a process-wide spin.
            if isinstance(error, SQLAlchemyError) and (claim is None or not permanent):
                stopping.wait(5)
