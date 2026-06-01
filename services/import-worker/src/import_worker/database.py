from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import TypeAdapter
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

if TYPE_CHECKING:
    from sqlalchemy.engine import Connection, Engine

STRING_RESULT = TypeAdapter(str)


def use_psycopg_driver(connection_string: str) -> str:
    if connection_string.startswith("postgresql://"):
        return connection_string.replace("postgresql://", "postgresql+psycopg://", 1)
    if connection_string.startswith("postgres://"):
        return connection_string.replace("postgres://", "postgresql+psycopg://", 1)
    return connection_string


def _is_transaction_read_only(connection: Connection) -> bool:
    result = connection.execute(text("show transaction_read_only")).scalar_one()
    return STRING_RESULT.validate_python(result) == "on"


def create_primary_engine(connection_string: str) -> Engine:
    if not connection_string:
        raise ValueError("IMPORT_WORKER_CONNECTION_STRING is required")
    engine = create_engine(use_psycopg_driver(connection_string), pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("select 1"))
            if _is_transaction_read_only(connection):
                msg = (
                    "IMPORT_WORKER_CONNECTION_STRING points to a read-only database; "
                    "use the primary writer DSN for IMPORT_WORKER_CONNECTION_STRING "
                    "and the replica DSN for IMPORT_WORKER_CONNECTION_STRING_READ"
                )
                raise ValueError(msg)
    except Exception:
        engine.dispose()
        raise
    return engine


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, expire_on_commit=False)
