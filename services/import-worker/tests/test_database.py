from datetime import UTC, datetime, timedelta, timezone

from import_worker.database import database_timestamp_to_utc, use_psycopg_driver


def test_notification_database_timestamp_gets_an_explicit_utc_offset() -> None:
    naive = datetime(2026, 10, 4, 12)
    utc = datetime(2026, 10, 4, 12, tzinfo=UTC)
    offset = datetime(2026, 10, 4, 14, tzinfo=timezone(timedelta(hours=2)))

    for value in (naive, utc, offset):
        assert database_timestamp_to_utc(value) == utc
        assert database_timestamp_to_utc(value).isoformat() == "2026-10-04T12:00:00+00:00"


def test_postgresql_url_uses_psycopg_driver() -> None:
    dsn = use_psycopg_driver("postgresql://user:password@localhost:5432/agora")

    assert dsn == "postgresql+psycopg://user:password@localhost:5432/agora"


def test_postgres_url_uses_psycopg_driver() -> None:
    dsn = use_psycopg_driver("postgres://user:password@localhost:5432/agora")

    assert dsn == "postgresql+psycopg://user:password@localhost:5432/agora"


def test_explicit_psycopg_url_is_preserved() -> None:
    dsn = use_psycopg_driver("postgresql+psycopg://user:password@localhost:5432/agora")

    assert dsn == "postgresql+psycopg://user:password@localhost:5432/agora"
