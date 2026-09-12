from __future__ import annotations

import logging
from threading import Event
from typing import TYPE_CHECKING

from agora_analysis_worker_shared.worker_progress import monitor_worker_progress

if TYPE_CHECKING:
    import pytest


def test_progress_is_reported_while_main_thread_is_waiting(
    caplog: pytest.LogCaptureFixture,
) -> None:
    reported = Event()

    class ObserveProgress(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            if "phase=materializing-primary" in record.getMessage():
                reported.set()

    logger = logging.getLogger("worker-progress-test")
    handler = ObserveProgress()
    logger.addHandler(handler)
    try:
        with (
            caplog.at_level(logging.INFO, logger=logger.name),
            monitor_worker_progress(
                logger=logger, log_prefix="[TestWorker]", interval_seconds=0.01
            ) as set_phase,
        ):
            set_phase("materializing-primary")
            assert reported.wait(timeout=2)
        assert "phase_elapsed_seconds=" in caplog.text
    finally:
        logger.removeHandler(handler)
