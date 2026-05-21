from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from pydantic import ValidationError

from math_updater.config import MathUpdaterConfigError, Settings, validate_ai_description_config

if TYPE_CHECKING:
    from pathlib import Path

VALID_DSN = "postgresql://user:password@localhost:5432/agora"
ENV_PREFIX = "MATH_UPDATER_"


def isolate_settings_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.chdir(tmp_path)
    for field_name in Settings.model_fields:
        monkeypatch.delenv(f"{ENV_PREFIX}{field_name.upper()}", raising=False)


def test_settings_requires_primary_connection_string(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)

    with pytest.raises(ValidationError) as exc_info:
        Settings()

    assert exc_info.value.errors()[0]["type"] == "string_too_short"


def test_settings_rejects_unknown_config_keys(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    tmp_path.joinpath(".env").write_text(
        f"{ENV_PREFIX}CONNECTION_STRING={VALID_DSN}\n"
        f"{ENV_PREFIX}POLIS_BASE_URL=http://localhost:5001\n",
        encoding="utf-8",
    )

    with pytest.raises(ValidationError) as exc_info:
        Settings()

    assert exc_info.value.errors()[0]["type"] == "extra_forbidden"


def test_settings_rejects_empty_optional_strings(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)

    with pytest.raises(ValidationError) as exc_info:
        Settings(
            connection_string=VALID_DSN,
            connection_string_read="",
        )

    assert exc_info.value.errors()[0]["type"] == "string_too_short"


def test_settings_rejects_invalid_tuning_values(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)

    with pytest.raises(ValidationError) as exc_info:
        Settings(
            connection_string=VALID_DSN,
            db_claim_batch_size=0,
        )

    assert exc_info.value.errors()[0]["type"] == "greater_than_equal"


def test_settings_accepts_valid_minimal_config(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(connection_string=VALID_DSN)

    assert settings.read_dsn == VALID_DSN
    assert settings.aws_ai_label_summary_enable is False


def test_ai_description_config_rejects_translation_without_ai(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(
        connection_string=VALID_DSN,
        google_application_credentials="/tmp/google-service-account.json",
    )

    with pytest.raises(MathUpdaterConfigError):
        validate_ai_description_config(settings)


def test_ai_description_config_allows_translation_with_ai(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(
        connection_string=VALID_DSN,
        aws_ai_label_summary_enable=True,
        google_application_credentials="/tmp/google-service-account.json",
    )

    validate_ai_description_config(settings)
