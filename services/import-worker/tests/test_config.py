from pathlib import Path

import pytest
from pydantic import ValidationError

from import_worker.config import Settings

IMPORT_WORKER_ENV_KEYS = (
    "IMPORT_WORKER_CONNECTION_STRING",
    "IMPORT_WORKER_CONNECTION_STRING_READ",
    "IMPORT_WORKER_VALKEY_URL",
    "IMPORT_WORKER_FLUSH_INTERVAL_MS",
    "IMPORT_WORKER_MAX_BATCH_SIZE",
    "IMPORT_WORKER_MAX_CONCURRENCY",
    "IMPORT_WORKER_STALE_THRESHOLD_MS",
    "IMPORT_WORKER_STALE_CLEANUP_EVERY_N_FLUSHES",
)


def build_settings(
    raw_settings: dict[str, object],
    *,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> Settings:
    monkeypatch.chdir(tmp_path)
    for key in IMPORT_WORKER_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    return Settings.model_validate(raw_settings)


def test_read_dsn_defaults_to_primary_connection_string(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = build_settings(
        {"connection_string": "postgresql://primary.example/agora"},
        monkeypatch=monkeypatch,
        tmp_path=tmp_path,
    )

    assert settings.read_dsn == "postgresql://primary.example/agora"


def test_read_dsn_uses_read_connection_string_when_configured(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = build_settings(
        {
            "connection_string": "postgresql://primary.example/agora",
            "connection_string_read": "postgresql://replica.example/agora",
        },
        monkeypatch=monkeypatch,
        tmp_path=tmp_path,
    )

    assert settings.read_dsn == "postgresql://replica.example/agora"


def test_settings_reject_empty_primary_connection_string(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with pytest.raises(ValidationError):
        build_settings(
            {"connection_string": ""},
            monkeypatch=monkeypatch,
            tmp_path=tmp_path,
        )


def test_settings_reject_unknown_keys(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with pytest.raises(ValidationError):
        build_settings(
            {
                "connection_string": "postgresql://primary.example/agora",
                "old_setting": "stale",
            },
            monkeypatch=monkeypatch,
            tmp_path=tmp_path,
        )


def test_settings_reject_invalid_valkey_scheme(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with pytest.raises(ValidationError):
        build_settings(
            {
                "connection_string": "postgresql://primary.example/agora",
                "valkey_url": "https://localhost:6379",
            },
            monkeypatch=monkeypatch,
            tmp_path=tmp_path,
        )


def test_settings_reject_zero_batch_size(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with pytest.raises(ValidationError):
        build_settings(
            {
                "connection_string": "postgresql://primary.example/agora",
                "max_batch_size": 0,
            },
            monkeypatch=monkeypatch,
            tmp_path=tmp_path,
        )
