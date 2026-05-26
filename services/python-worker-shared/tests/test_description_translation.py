from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from collections.abc import Sequence

from agora_worker_shared.description_translation import (
    BedrockTranslationConfig,
    DescriptionForTranslation,
    DescriptionTranslationError,
    GoogleTranslationConfig,
    GoogleTranslationService,
    TranslationRepresentativeOpinion,
    build_bedrock_translation_converse_payload,
    generate_description_translations,
    parse_description_translation_output,
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
        timeout: float,
    ) -> FakeTranslateTextResponse:
        request = _Request(
            parent=parent,
            contents=list(contents),
            mime_type=mime_type,
            source_language_code=source_language_code,
            target_language_code=target_language_code,
            model=model,
            timeout=timeout,
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
    timeout: float


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
        config=GoogleTranslationConfig(
            project_id="project",
            location="us-central1",
            request_timeout_seconds=5.0,
        ),
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
    assert {request.timeout for request in client.requests} == {5.0}


def test_generate_description_translations_skips_source_language() -> None:
    client = FakeTranslationClient()
    service = GoogleTranslationService(
        client=client,
        config=GoogleTranslationConfig(
            project_id="project",
            location="us-central1",
            request_timeout_seconds=5.0,
        ),
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


def test_parse_description_translation_output_requires_reasoning_and_expected_ids() -> None:
    translations = parse_description_translation_output(
        {
            "translations": [
                {
                    "descriptionId": 10,
                    "locale": "fr",
                    "reasoning": "Skeptics is best translated as Sceptiques here.",
                    "label": "Sceptiques",
                    "summary": "Ce groupe rejette les affirmations trop optimistes.",
                }
            ]
        },
        expected_description_ids={10},
        expected_locale="fr",
    )

    assert [(translation.description_id, translation.locale) for translation in translations] == [
        (10, "fr")
    ]


def test_parse_description_translation_output_rejects_missing_reasoning() -> None:
    with pytest.raises(DescriptionTranslationError):
        parse_description_translation_output(
            {
                "translations": [
                    {
                        "descriptionId": 10,
                        "locale": "fr",
                        "label": "Sceptiques",
                        "summary": "Ce groupe rejette les affirmations trop optimistes.",
                    }
                ]
            },
            expected_description_ids={10},
            expected_locale="fr",
        )


def test_parse_description_translation_output_rejects_duplicate_ids() -> None:
    with pytest.raises(DescriptionTranslationError):
        parse_description_translation_output(
            {
                "translations": [
                    {
                        "descriptionId": 10,
                        "locale": "fr",
                        "reasoning": "First translation.",
                        "label": "Sceptiques",
                        "summary": "Ce groupe rejette les affirmations trop optimistes.",
                    },
                    {
                        "descriptionId": 10,
                        "locale": "fr",
                        "reasoning": "Duplicate translation.",
                        "label": "Critiques",
                        "summary": "Ce groupe rejette les affirmations trop optimistes.",
                    },
                ]
            },
            expected_description_ids={10},
            expected_locale="fr",
        )


def test_bedrock_translation_payload_uses_title_and_representative_opinions() -> None:
    payload = build_bedrock_translation_converse_payload(
        descriptions=[
            DescriptionForTranslation(
                description_id=10,
                label="Skeptics",
                summary="This cluster rejects uncritical technology claims.",
                conversation_title="How should society govern technology?",
                representative_opinions=[
                    TranslationRepresentativeOpinion(
                        opinion_id=7,
                        stance="disagree",
                        content="Technology always improves society",
                    )
                ],
            )
        ],
        target_language_code="fr",
        config=BedrockTranslationConfig(
            region="us-east-1",
            model_id="model",
            temperature=0.1,
            top_p=0.9,
            max_tokens=1024,
            prompt="Translate",
            connect_timeout_seconds=2.0,
            read_timeout_seconds=12.0,
        ),
    )

    messages = payload.get("messages")
    assert messages is not None
    content = messages[0].get("content")
    assert content is not None
    user_payload = content[0].get("text")
    assert isinstance(user_payload, str)

    assert '"targetLocale":"fr"' in user_payload
    assert '"conversationTitle":"How should society govern technology?"' in user_payload
    assert "conversationBody" not in user_payload
    assert '"stance":"disagree"' in user_payload
