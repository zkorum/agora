from __future__ import annotations

import time
from contextlib import contextmanager
from threading import Event, Lock, Thread
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import logging
    from collections.abc import Callable, Generator


@contextmanager
def monitor_worker_progress(
    *,
    logger: logging.Logger,
    log_prefix: str,
    interval_seconds: float = 60,
) -> Generator[Callable[[str], None]]:
    """Report the main loop's phase even while its thread is waiting on I/O."""
    stop = Event()
    lock = Lock()
    phase = "starting"
    phase_started_at = time.monotonic()

    def set_phase(next_phase: str) -> None:
        nonlocal phase, phase_started_at
        with lock:
            phase = next_phase
            phase_started_at = time.monotonic()

    def report_progress() -> None:
        while not stop.wait(interval_seconds):
            with lock:
                current_phase = phase
                elapsed = time.monotonic() - phase_started_at
            logger.info(
                "%s Status phase=%s phase_elapsed_seconds=%.1f",
                log_prefix,
                current_phase,
                elapsed,
            )

    thread = Thread(target=report_progress, name="worker-progress", daemon=True)
    thread.start()
    try:
        yield set_phase
    finally:
        stop.set()
        thread.join(timeout=1)
