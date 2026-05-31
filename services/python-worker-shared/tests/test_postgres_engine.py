from __future__ import annotations

import logging
from dataclasses import dataclass

from agora_worker_shared.postgres_engine import create_ready_engine


@dataclass
class FakeEngine:
    should_fail: bool
    disposed: bool = False


def check_fake_engine_ready(engine: FakeEngine) -> None:
    if engine.should_fail:
        msg = "postgres unavailable"
        raise RuntimeError(msg)


def dispose_fake_engine(engine: FakeEngine) -> None:
    engine.disposed = True


def test_create_ready_engine_retries_until_select_succeeds() -> None:
    logger = logging.getLogger("test_create_ready_engine_retries")
    attempts = [FakeEngine(should_fail=True), FakeEngine(should_fail=False)]
    sleeps: list[float] = []

    def engine_factory(connection_string: str) -> FakeEngine:
        assert connection_string == "postgres://example"
        return attempts.pop(0)

    engine = create_ready_engine(
        connection_string="postgres://example",
        role="primary",
        logger=logger,
        log_prefix="[TestWorker]",
        retry_interval_seconds=5.0,
        should_continue=lambda: True,
        engine_factory=engine_factory,
        readiness_check=check_fake_engine_ready,
        dispose_engine=dispose_fake_engine,
        sleep_fn=sleeps.append,
    )

    assert engine is not None
    assert not engine.should_fail
    assert sleeps == [5.0]


def test_create_ready_engine_disposes_failed_engine() -> None:
    logger = logging.getLogger("test_create_ready_engine_disposes")
    failed_engine = FakeEngine(should_fail=True)
    successful_engine = FakeEngine(should_fail=False)
    attempts = [failed_engine, successful_engine]

    def engine_factory(connection_string: str) -> FakeEngine:
        return attempts.pop(0)

    create_ready_engine(
        connection_string="postgres://example",
        role="primary",
        logger=logger,
        log_prefix="[TestWorker]",
        retry_interval_seconds=5.0,
        should_continue=lambda: True,
        engine_factory=engine_factory,
        readiness_check=check_fake_engine_ready,
        dispose_engine=dispose_fake_engine,
        sleep_fn=lambda seconds: None,
    )

    assert failed_engine.disposed
    assert not successful_engine.disposed


def test_create_ready_engine_returns_none_when_stopped() -> None:
    logger = logging.getLogger("test_create_ready_engine_stopped")
    engine = create_ready_engine(
        connection_string="postgres://example",
        role="primary",
        logger=logger,
        log_prefix="[TestWorker]",
        retry_interval_seconds=5.0,
        should_continue=lambda: False,
        engine_factory=lambda connection_string: FakeEngine(should_fail=False),
        readiness_check=check_fake_engine_ready,
        dispose_engine=dispose_fake_engine,
    )

    assert engine is None
