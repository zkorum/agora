from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from pydantic import ValidationError

from scoring_worker.config import Settings

if TYPE_CHECKING:
    from pathlib import Path

VALID_DSN = "postgresql://user:password@localhost:5432/agora"
ENV_PREFIX = "SCORING_WORKER_"


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
        f"{ENV_PREFIX}CONNECTION_STRING={VALID_DSN}\n{ENV_PREFIX}LEGACY_OPTION=stale\n",
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
            batch_size=0,
        )

    assert exc_info.value.errors()[0]["type"] == "greater_than_equal"


def test_settings_accepts_valid_minimal_config(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(connection_string=VALID_DSN)

    assert settings.read_dsn == VALID_DSN
