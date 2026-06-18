from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import pytest

from content_translation_worker.translation import (
    ContentTranslationProviderError,
    GoogleTranslationConfig,
    GoogleTranslationService,
    translate_texts,
)
from content_translation_worker.translation_model import GoogleTranslationModel

if TYPE_CHECKING:
    from collections.abc import Sequence


@dataclass(frozen=True)
class FakeTranslation:
    translated_text: str


@dataclass(frozen=True)
class FakeResponse:
    translations: Sequence[FakeTranslation]


@dataclass(frozen=True)
class CapturedCall:
    contents: list[str]
    source_language_code: str | None
    target_language_code: str
    model: str


@dataclass
class FakeTranslationClient:
    calls: list[CapturedCall] = field(default_factory=list)
    truncate_response: bool = False

    def translate_text(
        self,
        *,
        parent: str,
        contents: Sequence[str],
        mime_type: str,
        source_language_code: str | None,
        target_language_code: str,
        model: str,
        retry: object | None,
        timeout: float,
    ) -> FakeResponse:
        self.calls.append(
            CapturedCall(
                contents=list(contents),
                source_language_code=source_language_code,
                target_language_code=target_language_code,
                model=model,
            )
        )
        translations = [FakeTranslation(translated_text=f"translated:{text}") for text in contents]
        if self.truncate_response:
            translations = translations[:-1]
        return FakeResponse(translations=translations)


def test_translate_texts_skips_same_language() -> None:
    client = FakeTranslationClient()
    service = _service(client)

    result = translate_texts(
        service=service,
        texts=["Hello"],
        source_language_code="en-US",
        target_language_code="en",
        mime_type="text/plain",
    )

    assert result == ["Hello"]
    assert client.calls == []


def test_translate_texts_preserves_empty_texts_and_normalizes_target_language() -> None:
    client = FakeTranslationClient()
    service = _service(client)

    result = translate_texts(
        service=service,
        texts=["Hello", "", "World"],
        source_language_code=None,
        target_language_code="zh-Hans",
        mime_type="text/plain",
    )

    assert result == ["translated:Hello", "", "translated:World"]
    assert client.calls == [
        CapturedCall(
            contents=["Hello", "World"],
            source_language_code=None,
            target_language_code="zh-CN",
            model=(
                "projects/test-project/locations/global/models/"
                "general/translation-llm"
            ),
        )
    ]


def test_translate_texts_lets_google_auto_detect_source_language() -> None:
    client = FakeTranslationClient()
    service = _service(client)

    result = translate_texts(
        service=service,
        texts=["Guten Tag"],
        source_language_code="de",
        target_language_code="fr",
        mime_type="text/plain",
    )

    assert result == ["translated:Guten Tag"]
    assert client.calls == [
        CapturedCall(
            contents=["Guten Tag"],
            source_language_code=None,
            target_language_code="fr",
            model=(
                "projects/test-project/locations/global/models/"
                "general/translation-llm"
            ),
        )
    ]


def test_translate_texts_uses_configured_google_model() -> None:
    client = FakeTranslationClient()
    service = _service(client, model=GoogleTranslationModel.NMT)

    translate_texts(
        service=service,
        texts=["Hello"],
        source_language_code=None,
        target_language_code="fr",
        mime_type="text/plain",
    )

    assert client.calls[0].model == "projects/test-project/locations/global/models/general/nmt"


def test_translate_texts_rejects_response_length_mismatch() -> None:
    client = FakeTranslationClient(truncate_response=True)
    service = _service(client)

    with pytest.raises(ContentTranslationProviderError):
        translate_texts(
            service=service,
            texts=["Hello"],
            source_language_code=None,
            target_language_code="fr",
            mime_type="text/plain",
        )


def _service(
    client: FakeTranslationClient,
    model: GoogleTranslationModel = GoogleTranslationModel.TRANSLATION_LLM,
) -> GoogleTranslationService:
    return GoogleTranslationService(
        client=client,
        config=GoogleTranslationConfig(
            project_id="test-project",
            location="global",
            endpoint="translate.example.test",
            model=model,
            request_timeout_seconds=1.0,
        ),
    )
