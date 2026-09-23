from __future__ import annotations

import json
from dataclasses import dataclass
from typing import TYPE_CHECKING

from agora_language.detection import DetectedLanguage, DetectionUnavailable

from agora_analysis_worker_shared import description_services
from agora_analysis_worker_shared.config import Settings
from agora_analysis_worker_shared.description_input import (
    ConversationDescriptionInput,
    GroupDescriptionInput,
)
from agora_analysis_worker_shared.description_language import EnglishDescription
from agora_analysis_worker_shared.description_translation import (
    GoogleTranslationConfig,
    GoogleTranslationService,
)

if TYPE_CHECKING:
    from pathlib import Path

    import pytest


@dataclass(frozen=True)
class _DetectedLanguage:
    language_code: str = "en"
    confidence: float = 0.99


@dataclass(frozen=True)
class _DetectionResponse:
    languages: tuple[_DetectedLanguage, ...] = (_DetectedLanguage(),)


@dataclass(frozen=True)
class _TranslationResponse:
    translations: tuple[()] = ()


class _GoogleClient:
    def detect_language(self, **kwargs: object) -> _DetectionResponse:
        return _DetectionResponse()

    def translate_text(self, **kwargs: object) -> _TranslationResponse:
        return _TranslationResponse()


def test_optional_detector_initialization_is_lazy_retryable_and_reused(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    settings = Settings(
        connection_string="postgresql://test/db",
        google_application_credentials="test-credentials.json",
    )
    calls = 0

    def initialize(_: Settings) -> GoogleTranslationService:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RuntimeError("credentials temporarily unavailable")
        return GoogleTranslationService(
            client=_GoogleClient(),
            config=GoogleTranslationConfig(
                project_id="test", location="global", request_timeout_seconds=1
            ),
        )

    monkeypatch.setattr(description_services, "_build_google_translation_service", initialize)
    detect = description_services.build_description_language_detector(settings)
    assert detect is not None
    assert calls == 0
    assert isinstance(detect("Short summary"), DetectionUnavailable)
    assert calls == 1
    assert isinstance(detect("Short summary"), DetectedLanguage)
    assert isinstance(detect("Another short summary"), DetectedLanguage)
    assert calls == 2


class _BedrockClient:
    def converse(self, **kwargs: object) -> object:
        clusters = {
            "0": {
                "reasoning": "The group supports parental authority.",
                "label": "Traditionalists",
                "summary": (
                    "This group supports parental authority, consistent parenting, "
                    "and firm limits on screen time."
                ),
            }
        }
        content = {"text": json.dumps({"clusters": clusters})}
        return {"output": {"message": {"content": [content]}}}


def test_bedrock_client_is_lazy_and_reused_across_generation_calls(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    calls = 0

    def create_client(
        *,
        region: str,
        connect_timeout_seconds: float,
        read_timeout_seconds: float,
    ) -> _BedrockClient:
        nonlocal calls
        calls += 1
        return _BedrockClient()

    monkeypatch.setattr(description_services, "create_bedrock_converse_client", create_client)
    generate = description_services.build_description_generator(
        Settings(connection_string="postgresql://test/db"), secondary_detector=None
    )
    assert generate is not None
    assert calls == 0
    request = ConversationDescriptionInput(
        conversation_title="Parenting",
        conversation_body=None,
        groups=[GroupDescriptionInput(group_key="0", representative_opinions=[])],
    )
    assert isinstance(generate(request).groups["0"], EnglishDescription)
    assert isinstance(generate(request).groups["0"], EnglishDescription)
    assert calls == 1
