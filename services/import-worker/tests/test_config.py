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
    "IMPORT_WORKER_POLIS_FETCH_TIMEOUT_SECONDS",
    "IMPORT_WORKER_GOOGLE_CLOUD_PROJECT_ID",
    "IMPORT_WORKER_GOOGLE_CLOUD_TRANSLATION_ENDPOINT",
    "IMPORT_WORKER_GOOGLE_CLOUD_TRANSLATION_LOCATION",
    "IMPORT_WORKER_GOOGLE_CLOUD_TRANSLATION_TIMEOUT_SECONDS",
    "IMPORT_WORKER_GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_CLOUD_PROJECT_ID",
    "GOOGLE_CLOUD_TRANSLATION_ENDPOINT",
    "GOOGLE_CLOUD_TRANSLATION_LOCATION",
    "GOOGLE_APPLICATION_CREDENTIALS",
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


def test_settings_reject_invalid_polis_fetch_timeout(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with pytest.raises(ValidationError):
        build_settings(
            {
                "connection_string": "postgresql://primary.example/agora",
                "polis_fetch_timeout_seconds": 0,
            },
            monkeypatch=monkeypatch,
            tmp_path=tmp_path,
        )


def test_google_language_detection_settings_are_optional(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = build_settings(
        {"connection_string": "postgresql://primary.example/agora"},
        monkeypatch=monkeypatch,
        tmp_path=tmp_path,
    )

    assert settings.google_application_credentials_path is None
    assert settings.google_cloud_project_id is None
    assert settings.google_cloud_translation_location == "us-central1"
    assert settings.google_cloud_translation_endpoint == "translate.googleapis.com"


def test_google_language_detection_settings_accept_google_env_aliases(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    for key in IMPORT_WORKER_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", "/secrets/google.json")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT_ID", "google-project")
    monkeypatch.setenv("GOOGLE_CLOUD_TRANSLATION_LOCATION", "europe-west1")
    monkeypatch.setenv("GOOGLE_CLOUD_TRANSLATION_ENDPOINT", "translate-eu.googleapis.com")

    settings = Settings.model_validate(
        {"connection_string": "postgresql://primary.example/agora"},
    )

    assert settings.google_application_credentials_path == "/secrets/google.json"
    assert settings.google_cloud_project_id == "google-project"
    assert settings.google_cloud_translation_location == "europe-west1"
    assert settings.google_cloud_translation_endpoint == "translate-eu.googleapis.com"
