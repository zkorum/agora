from __future__ import annotations

import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, TypeGuard

from psycopg.errors import UndefinedColumn, UndefinedTable
from sqlalchemy.exc import ProgrammingError

if TYPE_CHECKING:
    import logging


@dataclass(frozen=True)
class StartupSchemaRetryState:
    has_successful_poll: bool = False
    last_log_at: float | None = None


@dataclass(frozen=True)
class StartupSchemaRetryDecision:
    should_retry: bool
    state: StartupSchemaRetryState


def is_schema_not_ready_error(error: BaseException) -> bool:
    if _is_psycopg_schema_not_ready_error(error):
        return True
    if not isinstance(error, ProgrammingError):
        return False
    return _is_psycopg_schema_not_ready_error(error.orig)


def mark_startup_schema_ready(
    *,
    state: StartupSchemaRetryState,
) -> StartupSchemaRetryState:
    if state.has_successful_poll:
        return state
    return StartupSchemaRetryState(
        has_successful_poll=True,
        last_log_at=state.last_log_at,
    )


def handle_startup_schema_retry(
    *,
    state: StartupSchemaRetryState,
    error: BaseException,
    logger: logging.Logger,
    log_prefix: str,
    log_interval_seconds: float = 30.0,
    now: float | None = None,
) -> StartupSchemaRetryDecision:
    if state.has_successful_poll or not is_schema_not_ready_error(error):
        return StartupSchemaRetryDecision(should_retry=False, state=state)

    current_time = time.monotonic() if now is None else now
    should_log = (
        state.last_log_at is None
        or current_time - state.last_log_at >= log_interval_seconds
    )
    next_state = StartupSchemaRetryState(
        has_successful_poll=False,
        last_log_at=current_time if should_log else state.last_log_at,
    )
    if should_log:
        logger.warning(
            "%s PostgreSQL schema is not ready yet; retrying error=%s",
            log_prefix,
            error,
        )
    return StartupSchemaRetryDecision(should_retry=True, state=next_state)


def _is_psycopg_schema_not_ready_error(
    error: object,
) -> TypeGuard[UndefinedTable | UndefinedColumn]:
    return isinstance(error, UndefinedTable | UndefinedColumn)
