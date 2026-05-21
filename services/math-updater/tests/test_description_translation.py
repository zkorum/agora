from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Sequence

from math_updater.description_translation import (
    DescriptionForTranslation,
    GoogleTranslationConfig,
    GoogleTranslationService,
    generate_description_translations,
    parse_service_account_json,
)


@dataclass(frozen=True)
class FakeTranslationText:
    translated_text: str


@dataclass(frozen=True)
class FakeTranslateTextResponse:
    translations: list[FakeTranslationText]


@dataclass
class FakeTranslationClient:
    requests: list[_Request] = field(default_factory=list)

    def translate_text(
        self,
        *,
        parent: str,
        contents: Sequence[str],
        mime_type: str,
        source_language_code: str | None,
        target_language_code: str,
        model: str,
    ) -> FakeTranslateTextResponse:
        request = _Request(
            parent=parent,
            contents=list(contents),
            mime_type=mime_type,
            source_language_code=source_language_code,
            target_language_code=target_language_code,
            model=model,
        )
        self.requests.append(request)
        return FakeTranslateTextResponse(
            translations=[FakeTranslationText(f"{target_language_code}:{contents[0]}")]
        )


@dataclass(frozen=True)
class _Request:
    parent: str
    contents: list[str]
    mime_type: str
    source_language_code: str | None
    target_language_code: str
    model: str


def test_parse_service_account_json_ignores_extra_fields() -> None:
    parsed = parse_service_account_json(
        """
        {
            "project_id": "agora-project",
            "client_email": "service@example.com",
            "private_key": "private-key",
            "ignored": true
        }
        """
    )

    assert parsed.project_id == "agora-project"
    assert parsed.client_email == "service@example.com"
    assert parsed.private_key == "private-key"


def test_generate_description_translations_maps_display_language_codes() -> None:
    client = FakeTranslationClient()
    service = GoogleTranslationService(
        client=client,
        config=GoogleTranslationConfig(project_id="project", location="us-central1"),
    )

    translations = generate_description_translations(
        service=service,
        descriptions=[
            DescriptionForTranslation(
                description_id=10,
                label="Transitists",
                summary="Supports transit.",
            )
        ],
        target_language_codes=["es", "zh-Hant", "zh-Hans"],
    )

    assert [(translation.locale, translation.label) for translation in translations] == [
        ("es", "es:Transitists"),
        ("zh-Hant", "zh-TW:Transitists"),
        ("zh-Hans", "zh-CN:Transitists"),
    ]
    assert [request.target_language_code for request in client.requests] == [
        "es",
        "es",
        "zh-TW",
        "zh-TW",
        "zh-CN",
        "zh-CN",
    ]
    assert client.requests[0].model.endswith("/models/general/nmt")
    assert client.requests[1].model.endswith("/models/general/translation-llm")


def test_generate_description_translations_skips_source_language() -> None:
    client = FakeTranslationClient()
    service = GoogleTranslationService(
        client=client,
        config=GoogleTranslationConfig(project_id="project", location="us-central1"),
    )

    translations = generate_description_translations(
        service=service,
        descriptions=[
            DescriptionForTranslation(
                description_id=10,
                label="Transitists",
                summary="Supports transit.",
            )
        ],
        target_language_codes=["en"],
    )

    assert translations == []
    assert client.requests == []
