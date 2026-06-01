from import_worker.database import use_psycopg_driver


def test_postgresql_url_uses_psycopg_driver() -> None:
    dsn = use_psycopg_driver("postgresql://user:password@localhost:5432/agora")

    assert dsn == "postgresql+psycopg://user:password@localhost:5432/agora"


def test_postgres_url_uses_psycopg_driver() -> None:
    dsn = use_psycopg_driver("postgres://user:password@localhost:5432/agora")

    assert dsn == "postgresql+psycopg://user:password@localhost:5432/agora"


def test_explicit_psycopg_url_is_preserved() -> None:
    dsn = use_psycopg_driver("postgresql+psycopg://user:password@localhost:5432/agora")

    assert dsn == "postgresql+psycopg://user:password@localhost:5432/agora"
