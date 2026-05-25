from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from pydantic import ValidationError

from math_updater.config import (
    MATH_UPDATER_ENV_PREFIX,
    SHARED_PYTHON_WORKER_ENV_PREFIX,
    AiDescriptionWorkerSettings,
    DescriptionTranslationWorkerSettings,
    MathUpdaterConfigError,
    Settings,
    validate_ai_description_config,
)

if TYPE_CHECKING:
    from pathlib import Path

VALID_DSN = "postgresql://user:password@localhost:5432/agora"
ENV_PREFIX = MATH_UPDATER_ENV_PREFIX
WORKER_ENV_PREFIXES = [
    "AI_DESCRIPTION_WORKER_",
    "DESCRIPTION_TRANSLATION_WORKER_",
    SHARED_PYTHON_WORKER_ENV_PREFIX,
    MATH_UPDATER_ENV_PREFIX,
]


def isolate_settings_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("AGORA_DEV_MODE", raising=False)
    for prefix in WORKER_ENV_PREFIXES:
        for field_name in Settings.model_fields:
            monkeypatch.delenv(f"{prefix}{field_name.upper()}", raising=False)


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
    assert settings.agora_dev_mode is False
    assert settings.simulation_providers_enable is False
    assert settings.ai_description_simulation_mode == "off"
    assert settings.description_translation_simulation_mode == "off"


def test_ai_description_config_allows_normal_non_dev_mode(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(connection_string=VALID_DSN)

    validate_ai_description_config(settings)


def test_ai_description_config_allows_real_ai_without_dev_mode(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(
        connection_string=VALID_DSN,
        aws_ai_label_summary_enable=True,
    )

    validate_ai_description_config(settings)


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


def test_ai_description_config_rejects_bedrock_translation_without_ai(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(
        connection_string=VALID_DSN,
        aws_description_translation_enable=True,
    )

    with pytest.raises(MathUpdaterConfigError):
        validate_ai_description_config(settings)


def test_ai_description_config_allows_bedrock_translation_with_ai(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(
        connection_string=VALID_DSN,
        aws_ai_label_summary_enable=True,
        aws_description_translation_enable=True,
    )

    validate_ai_description_config(settings)


def test_ai_description_config_rejects_simulation_outside_dev(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(
        connection_string=VALID_DSN,
        simulation_providers_enable=True,
        ai_description_simulation_mode="success",
    )

    with pytest.raises(MathUpdaterConfigError):
        validate_ai_description_config(settings)


def test_ai_description_config_allows_simulation_in_dev(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(
        agora_dev_mode=True,
        connection_string=VALID_DSN,
        simulation_providers_enable=True,
        ai_description_simulation_mode="success",
        description_translation_simulation_mode="success",
    )

    validate_ai_description_config(settings)


def test_ai_description_config_rejects_simulation_mode_without_enable(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(
        agora_dev_mode=True,
        connection_string=VALID_DSN,
        ai_description_simulation_mode="success",
    )

    with pytest.raises(MathUpdaterConfigError):
        validate_ai_description_config(settings)


def test_ai_description_config_rejects_mixed_real_and_simulated_ai(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    settings = Settings(
        agora_dev_mode=True,
        connection_string=VALID_DSN,
        aws_ai_label_summary_enable=True,
        simulation_providers_enable=True,
        ai_description_simulation_mode="success",
    )

    with pytest.raises(MathUpdaterConfigError):
        validate_ai_description_config(settings)


def test_ai_description_config_reads_global_dev_mode_env(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    monkeypatch.setenv("AGORA_DEV_MODE", "true")
    monkeypatch.setenv(f"{MATH_UPDATER_ENV_PREFIX}CONNECTION_STRING", VALID_DSN)

    settings = Settings()

    assert settings.agora_dev_mode is True


def test_ai_description_config_reads_global_dev_mode_dotenv(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    tmp_path.joinpath(".env").write_text(
        "AGORA_DEV_MODE=true\n"
        f"{MATH_UPDATER_ENV_PREFIX}CONNECTION_STRING={VALID_DSN}\n",
        encoding="utf-8",
    )

    settings = Settings()

    assert settings.agora_dev_mode is True


def test_worker_settings_read_shared_python_worker_prefix(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    tmp_path.joinpath(".env").write_text(
        f"{SHARED_PYTHON_WORKER_ENV_PREFIX}CONNECTION_STRING={VALID_DSN}\n"
        f"{SHARED_PYTHON_WORKER_ENV_PREFIX}AWS_AI_LABEL_SUMMARY_ENABLE=true\n",
        encoding="utf-8",
    )

    settings = AiDescriptionWorkerSettings()

    assert settings.connection_string == VALID_DSN
    assert settings.aws_ai_label_summary_enable is True


def test_worker_specific_prefix_overrides_shared_python_worker_prefix(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    shared_dsn = "postgresql://shared:password@localhost:5432/agora"
    worker_dsn = "postgresql://worker:password@localhost:5432/agora"
    tmp_path.joinpath(".env").write_text(
        f"{SHARED_PYTHON_WORKER_ENV_PREFIX}CONNECTION_STRING={shared_dsn}\n"
        f"DESCRIPTION_TRANSLATION_WORKER_CONNECTION_STRING={worker_dsn}\n",
        encoding="utf-8",
    )

    settings = DescriptionTranslationWorkerSettings()

    assert settings.connection_string == worker_dsn


def test_worker_settings_fallback_to_math_updater_prefix(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    isolate_settings_env(monkeypatch, tmp_path)
    tmp_path.joinpath(".env").write_text(
        f"{MATH_UPDATER_ENV_PREFIX}CONNECTION_STRING={VALID_DSN}\n",
        encoding="utf-8",
    )

    settings = AiDescriptionWorkerSettings()

    assert settings.connection_string == VALID_DSN
