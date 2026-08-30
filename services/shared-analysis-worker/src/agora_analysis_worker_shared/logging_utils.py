from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

from sqlalchemy.exc import DBAPIError, SQLAlchemyError

if TYPE_CHECKING:
    from collections.abc import Mapping

    from agora_analysis_worker_shared.config import LogLevel


LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"


def configure_worker_logging(*, log_level: LogLevel) -> None:
    logging.basicConfig(
        level=getattr(logging, log_level),
        format=LOG_FORMAT,
        force=True,
    )


_SAFE_DATABASE_CODE = re.compile(r"[0-9A-Z_]{2,32}")


def _safe_database_code(error: object, name: str) -> str | None:
    value = getattr(error, name, None)
    return value if isinstance(value, str) and _SAFE_DATABASE_CODE.fullmatch(value) else None


def database_error_summary(error: BaseException) -> str:
    parts = [f"type={type(error).__name__}"]

    if isinstance(error, DBAPIError):
        original = error.orig
        parts.append(f"dbapi_type={type(original).__name__}")

        sqlstate = _safe_database_code(original, "sqlstate") or _safe_database_code(
            original,
            "pgcode",
        )
        if sqlstate is not None:
            parts.append(f"sqlstate={sqlstate}")

    elif isinstance(error, SQLAlchemyError):
        # SQLAlchemy's string form includes generated SQL and parameters for many
        # exceptions. Keep logs actionable without dumping user data or huge rows.
        parts.append("message=SQLAlchemy error; details omitted")
    else:
        parts.append("message=database error; details omitted")

    return " ".join(parts)


def log_database_error(
    *,
    logger: logging.Logger,
    message: str,
    error: BaseException,
    context: Mapping[str, object] | None = None,
) -> None:
    context_parts = []
    if context is not None:
        context_parts = [f"{key}={value}" for key, value in context.items()]

    logger.error(
        "%s%s: %s",
        message,
        f" ({' '.join(context_parts)})" if context_parts else "",
        database_error_summary(error),
    )
