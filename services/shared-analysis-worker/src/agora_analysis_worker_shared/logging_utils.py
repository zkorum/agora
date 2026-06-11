from __future__ import annotations

import logging
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


def _first_line(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text.splitlines()[0]


def _diagnostic_value(error: object, name: str) -> str | None:
    value = getattr(error, name, None)
    return _first_line(value)


def database_error_summary(error: BaseException) -> str:
    parts = [f"type={type(error).__name__}"]

    if isinstance(error, DBAPIError):
        original = error.orig
        parts.append(f"dbapi_type={type(original).__name__}")

        sqlstate = _diagnostic_value(original, "sqlstate") or _diagnostic_value(
            original,
            "pgcode",
        )
        if sqlstate is not None:
            parts.append(f"sqlstate={sqlstate}")

        diagnostic = getattr(original, "diag", None)
        if diagnostic is not None:
            for label, attr_name in (
                ("message", "message_primary"),
                ("constraint", "constraint_name"),
                ("table", "table_name"),
                ("schema", "schema_name"),
            ):
                value = _diagnostic_value(diagnostic, attr_name)
                if value is not None:
                    parts.append(f"{label}={value}")

        original_message = _first_line(original)
        if original_message is not None:
            parts.append(f"original={original_message}")

    elif isinstance(error, SQLAlchemyError):
        # SQLAlchemy's string form includes generated SQL and parameters for many
        # exceptions. Keep logs actionable without dumping user data or huge rows.
        parts.append("message=SQLAlchemy error; details omitted")
    else:
        message = _first_line(error)
        if message is not None:
            parts.append(f"message={message}")

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
