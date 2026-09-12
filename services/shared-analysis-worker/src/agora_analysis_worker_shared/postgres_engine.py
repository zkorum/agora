from __future__ import annotations

import time
from collections.abc import Callable
from functools import partial
from typing import TYPE_CHECKING

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url

from agora_analysis_worker_shared.logging_utils import database_error_summary

if TYPE_CHECKING:
    import logging


SleepFn = Callable[[float], None]
ShouldContinueFn = Callable[[], bool]


def create_postgres_engine(
    connection_string: str,
    *,
    statement_timeout_seconds: int | None = None,
    idle_transaction_timeout_seconds: int | None = None,
    application_name: str | None = None,
) -> Engine:
    url = make_url(connection_string)
    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+psycopg")

    # Pre-ping cannot bound a blocked socket. These libpq defaults also apply
    # during checkout, rollback, and lease heartbeats; DSN tuning takes precedence.
    connection_defaults = {
        "connect_timeout": "10",
        "keepalives": "1",
        "keepalives_idle": "15",
        "keepalives_interval": "5",
        "keepalives_count": "3",
        "tcp_user_timeout": "30000",
    }
    url = url.update_query_dict(
        {key: value for key, value in connection_defaults.items() if key not in url.query}
    )
    if application_name is not None and "application_name" not in url.query:
        url = url.update_query_dict({"application_name": application_name})
    server_options: list[str] = []
    if statement_timeout_seconds is not None:
        server_options.append(f"-c statement_timeout={statement_timeout_seconds * 1000}")
    if idle_transaction_timeout_seconds is not None:
        server_options.append(
            f"-c idle_in_transaction_session_timeout={idle_transaction_timeout_seconds * 1000}"
        )
    if server_options:
        existing_options = url.query.get("options", "")
        if not isinstance(existing_options, str):
            msg = "PostgreSQL options must be specified once"
            raise ValueError(msg)
        url = url.update_query_dict(
            {"options": " ".join([*server_options, existing_options]).strip()}
        )
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_timeout=10,
        hide_parameters=True,
    )


def check_postgres_engine_ready(engine: Engine) -> None:
    with engine.connect() as connection:
        connection.execute(text("select 1"))


def dispose_postgres_engine(engine: Engine) -> None:
    engine.dispose()


def create_ready_engine[EngineT](
    *,
    connection_string: str,
    role: str,
    logger: logging.Logger,
    log_prefix: str,
    retry_interval_seconds: float,
    should_continue: ShouldContinueFn,
    engine_factory: Callable[[str], EngineT],
    readiness_check: Callable[[EngineT], None],
    dispose_engine: Callable[[EngineT], None],
    sleep_fn: SleepFn = time.sleep,
) -> EngineT | None:
    while should_continue():
        engine: EngineT | None = None
        try:
            engine = engine_factory(connection_string)
            readiness_check(engine)
            logger.info("%s PostgreSQL %s connection verified", log_prefix, role)
            return engine
        except Exception as error:
            if engine is not None:
                dispose_engine(engine)
            logger.warning(
                "%s PostgreSQL %s unavailable %s; retrying in %.1fs",
                log_prefix,
                role,
                database_error_summary(error),
                retry_interval_seconds,
            )
            sleep_fn(retry_interval_seconds)
    return None


def create_ready_postgres_engine(
    *,
    connection_string: str,
    role: str,
    logger: logging.Logger,
    log_prefix: str,
    retry_interval_seconds: float,
    should_continue: ShouldContinueFn,
    sleep_fn: SleepFn = time.sleep,
    statement_timeout_seconds: int | None = None,
    idle_transaction_timeout_seconds: int | None = None,
) -> Engine | None:
    return create_ready_engine(
        connection_string=connection_string,
        role=role,
        logger=logger,
        log_prefix=log_prefix,
        retry_interval_seconds=retry_interval_seconds,
        should_continue=should_continue,
        engine_factory=partial(
            create_postgres_engine,
            statement_timeout_seconds=statement_timeout_seconds,
            idle_transaction_timeout_seconds=idle_transaction_timeout_seconds,
            application_name=f"{log_prefix.strip('[]')}:{role}",
        ),
        readiness_check=check_postgres_engine_ready,
        dispose_engine=dispose_postgres_engine,
        sleep_fn=sleep_fn,
    )
