from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from pydantic import ValidationError

from content_translation_worker.config import Settings
from content_translation_worker.translation_model import (
    ContentTranslationProvider,
    GoogleTranslationModel,
    SimulatedTranslationMode,
)

if TYPE_CHECKING:
    from pathlib import Path


REQUIRED_ENV = {
    "CONTENT_TRANSLATION_WORKER_CONNECTION_STRING": "postgresql://postgres:postgres@localhost/agora",
    "CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_TRANSLATION_ENDPOINT": "translation.googleapis.com",
    "CONTENT_TRANSLATION_WORKER_GOOGLE_APPLICATION_CREDENTIALS": "/tmp/google.json",
}


def test_settings_default_to_google_translation_llm(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    for key, value in REQUIRED_ENV.items():
        monkeypatch.setenv(key, value)
    monkeypatch.delenv("CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_TRANSLATION_MODEL", raising=False)
    monkeypatch.delenv("GOOGLE_CLOUD_TRANSLATION_MODEL", raising=False)

    settings = Settings()

    assert settings.google_cloud_translation_model is GoogleTranslationModel.TRANSLATION_LLM


def test_settings_accept_google_translation_model_override(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    for key, value in REQUIRED_ENV.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv(
        "CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_TRANSLATION_MODEL",
        GoogleTranslationModel.NMT.value,
    )

    settings = Settings()

    assert settings.google_cloud_translation_model is GoogleTranslationModel.NMT


def test_settings_reject_invalid_google_translation_model(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    for key, value in REQUIRED_ENV.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv(
        "CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_TRANSLATION_MODEL",
        "general/gemini-pro",
    )

    with pytest.raises(ValidationError):
        Settings()


def test_settings_accept_simulated_provider_without_google_credentials(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv(
        "CONTENT_TRANSLATION_WORKER_CONNECTION_STRING",
        "postgresql://postgres:postgres@localhost/agora",
    )
    monkeypatch.setenv(
        "CONTENT_TRANSLATION_WORKER_TRANSLATION_PROVIDER",
        ContentTranslationProvider.SIMULATED.value,
    )
    monkeypatch.setenv(
        "CONTENT_TRANSLATION_WORKER_SIMULATION_MODE",
        SimulatedTranslationMode.NON_RETRYABLE_ERROR.value,
    )
    monkeypatch.delenv("CONTENT_TRANSLATION_WORKER_GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)

    settings = Settings()

    assert settings.translation_provider is ContentTranslationProvider.SIMULATED
    assert settings.simulation_mode is SimulatedTranslationMode.NON_RETRYABLE_ERROR


def test_settings_reject_google_provider_without_credentials(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv(
        "CONTENT_TRANSLATION_WORKER_CONNECTION_STRING",
        "postgresql://postgres:postgres@localhost/agora",
    )
    monkeypatch.setenv(
        "CONTENT_TRANSLATION_WORKER_TRANSLATION_PROVIDER",
        ContentTranslationProvider.GOOGLE.value,
    )
    monkeypatch.delenv("CONTENT_TRANSLATION_WORKER_GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)

    with pytest.raises(ValidationError):
        Settings()


def test_settings_reject_invalid_translation_provider(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv(
        "CONTENT_TRANSLATION_WORKER_CONNECTION_STRING",
        "postgresql://postgres:postgres@localhost/agora",
    )
    monkeypatch.setenv("CONTENT_TRANSLATION_WORKER_TRANSLATION_PROVIDER", "mock")

    with pytest.raises(ValidationError):
        Settings()
