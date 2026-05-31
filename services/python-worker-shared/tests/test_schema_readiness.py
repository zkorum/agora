from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from psycopg.errors import UndefinedColumn, UndefinedTable
from sqlalchemy.exc import ProgrammingError

from agora_worker_shared.schema_readiness import (
    StartupSchemaRetryState,
    handle_startup_schema_retry,
    is_schema_not_ready_error,
    mark_startup_schema_ready,
)

if TYPE_CHECKING:
    from _pytest.logging import LogCaptureFixture


def test_is_schema_not_ready_error_recognizes_wrapped_psycopg_errors() -> None:
    error = ProgrammingError("select 1", {}, UndefinedTable("missing table"))

    assert is_schema_not_ready_error(error)


def test_is_schema_not_ready_error_recognizes_direct_psycopg_errors() -> None:
    assert is_schema_not_ready_error(UndefinedColumn("missing column"))


def test_startup_schema_retry_logs_once_per_interval(
    caplog: LogCaptureFixture,
) -> None:
    logger = logging.getLogger("test_startup_schema_retry_logs_once_per_interval")
    state = StartupSchemaRetryState()
    error = ProgrammingError("select 1", {}, UndefinedTable("missing table"))

    with caplog.at_level(logging.WARNING, logger=logger.name):
        first_decision = handle_startup_schema_retry(
            state=state,
            error=error,
            logger=logger,
            log_prefix="[TestWorker]",
            log_interval_seconds=30.0,
            now=100.0,
        )
        second_decision = handle_startup_schema_retry(
            state=first_decision.state,
            error=error,
            logger=logger,
            log_prefix="[TestWorker]",
            log_interval_seconds=30.0,
            now=110.0,
        )
        third_decision = handle_startup_schema_retry(
            state=second_decision.state,
            error=error,
            logger=logger,
            log_prefix="[TestWorker]",
            log_interval_seconds=30.0,
            now=130.0,
        )

    assert first_decision.should_retry
    assert second_decision.should_retry
    assert third_decision.should_retry
    assert len(caplog.messages) == 2
    for message in caplog.messages:
        assert message.startswith(
            "[TestWorker] PostgreSQL schema is not ready yet; retrying "
            "error=(psycopg.errors.UndefinedTable) missing table\n[SQL: select 1]"
        )


def test_startup_schema_retry_stops_after_ready(caplog: LogCaptureFixture) -> None:
    logger = logging.getLogger("test_startup_schema_retry_stops_after_ready")
    ready_state = mark_startup_schema_ready(state=StartupSchemaRetryState())
    error = ProgrammingError("select 1", {}, UndefinedTable("missing table"))

    with caplog.at_level(logging.WARNING, logger=logger.name):
        decision = handle_startup_schema_retry(
            state=ready_state,
            error=error,
            logger=logger,
            log_prefix="[TestWorker]",
            now=100.0,
        )

    assert not decision.should_retry
    assert decision.state.has_successful_poll
    assert caplog.messages == []
