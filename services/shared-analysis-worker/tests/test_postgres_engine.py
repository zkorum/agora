from __future__ import annotations

import logging
import os
import socket
import time
from dataclasses import dataclass
from threading import Event, Thread
from typing import TYPE_CHECKING

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, OperationalError

from agora_analysis_worker_shared.postgres_engine import create_postgres_engine, create_ready_engine

if TYPE_CHECKING:
    from collections.abc import Generator

    from sqlalchemy import Engine


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


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+psycopg"])
def test_postgres_dsn_preserves_credentials_tls_and_explicit_tuning(scheme: str) -> None:
    engine = create_postgres_engine(
        f"{scheme}://user:postgres%3A%2F%2Fsecret@localhost/db"
        "?sslmode=verify-full&sslrootcert=%2Ftmp%2Fca.pem&connect_timeout=4"
        "&options=-c%20statement_timeout%3D9000",
        statement_timeout_seconds=30,
        idle_transaction_timeout_seconds=60,
        application_name="ai-retry-test",
    )
    try:
        assert engine.dialect.driver == "psycopg"
        assert engine.url.password == "postgres://secret"
        assert engine.url.query["sslmode"] == "verify-full"
        assert engine.url.query["sslrootcert"] == "/tmp/ca.pem"
        assert engine.url.query["connect_timeout"] == "4"
        assert engine.url.query["tcp_user_timeout"] == "30000"
        assert engine.url.query["application_name"] == "ai-retry-test"
        assert engine.url.query["options"] == (
            "-c statement_timeout=30000 -c idle_in_transaction_session_timeout=60000 "
            "-c statement_timeout=9000"
        )
    finally:
        engine.dispose()


def test_postgres_connect_times_out_when_server_never_completes_handshake() -> None:
    stop = Event()
    accepted = Event()
    with socket.create_server(("127.0.0.1", 0)) as server:
        server.settimeout(5)
        port: int = server.getsockname()[1]

        def blackhole() -> None:
            connection, _ = server.accept()
            with connection:
                accepted.set()
                stop.wait(10)

        thread = Thread(target=blackhole, daemon=True)
        thread.start()
        engine = create_postgres_engine(
            f"postgresql://user:password@127.0.0.1:{port}/db?connect_timeout=2&sslmode=require"
        )
        started = time.monotonic()
        try:
            with pytest.raises(OperationalError), engine.connect():
                pytest.fail("A server that never responds cannot establish a connection")
            assert accepted.is_set()
            assert time.monotonic() - started < 8
        finally:
            stop.set()
            thread.join(timeout=6)
            engine.dispose()


@pytest.fixture
def timeout_postgres_engine() -> Generator[Engine]:
    dsn = os.getenv("AGORA_TEST_POSTGRES_DSN")
    if dsn is None:
        pytest.skip("Set AGORA_TEST_POSTGRES_DSN to run PostgreSQL timeout/reconnection tests")
    engine = create_postgres_engine(
        dsn,
        statement_timeout_seconds=1,
        idle_transaction_timeout_seconds=1,
        application_name="ai-retry-timeout-test",
    )
    try:
        yield engine
    finally:
        engine.dispose()


def test_postgres_statement_timeout_allows_next_transaction(
    timeout_postgres_engine: Engine,
) -> None:
    with timeout_postgres_engine.connect() as connection:
        assert connection.execute(text("SHOW application_name")).scalar_one() == (
            "ai-retry-timeout-test"
        )
        started = time.monotonic()
        with pytest.raises(OperationalError) as error:
            connection.execute(text("SELECT pg_sleep(10)"))
        assert not error.value.connection_invalidated
        assert time.monotonic() - started < 5
        connection.rollback()
        assert connection.execute(text("SELECT 1")).scalar_one() == 1


def test_postgres_idle_transaction_timeout_invalidates_and_reconnects(
    timeout_postgres_engine: Engine,
) -> None:
    with timeout_postgres_engine.connect() as connection:
        connection.execute(text("SELECT 1"))
        time.sleep(1.5)
        with pytest.raises(DBAPIError) as error:
            connection.execute(text("SELECT 1"))
        assert error.value.connection_invalidated
    with timeout_postgres_engine.connect() as connection:
        assert connection.execute(text("SELECT 1")).scalar_one() == 1
