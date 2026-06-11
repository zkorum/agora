from __future__ import annotations

import time
from collections.abc import Callable
from typing import TYPE_CHECKING

from sqlalchemy import Engine, create_engine, text

if TYPE_CHECKING:
    import logging


SleepFn = Callable[[float], None]
ShouldContinueFn = Callable[[], bool]


def create_postgres_engine(connection_string: str) -> Engine:
    return create_engine(
        connection_string.replace("postgres://", "postgresql+psycopg://"),
        pool_pre_ping=True,
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
        engine = engine_factory(connection_string)
        try:
            readiness_check(engine)
            logger.info("%s PostgreSQL %s connection verified", log_prefix, role)
            return engine
        except Exception as error:
            dispose_engine(engine)
            logger.warning(
                "%s PostgreSQL %s unavailable (%s); retrying in %.1fs",
                log_prefix,
                role,
                error,
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
) -> Engine | None:
    return create_ready_engine(
        connection_string=connection_string,
        role=role,
        logger=logger,
        log_prefix=log_prefix,
        retry_interval_seconds=retry_interval_seconds,
        should_continue=should_continue,
        engine_factory=create_postgres_engine,
        readiness_check=check_postgres_engine_ready,
        dispose_engine=dispose_postgres_engine,
        sleep_fn=sleep_fn,
    )
