from __future__ import annotations

from import_worker import language_detection
from import_worker.google_language_detection import (
    GoogleLanguageDetectionConfig,
    GoogleLanguageDetectionService,
    detect_language_with_google,
)
from import_worker.importer import (
    google_detector_for_import,
    imported_opinion_source_language_metadata,
)
from import_worker.language_detection import (
    MANUAL_MAIN_LANGUAGE_HINT_WEIGHT,
    SourceLanguageHint,
    SourceLanguageMetadata,
    detect_source_language_with_lingua,
    infer_chinese_script_language,
)
from import_worker.queue import IMPORT_REQUEST_ADAPTER, ImportRequest


class FakeDetectedLanguage:
    def __init__(self, *, language_code: str, confidence: float) -> None:
        self.language_code = language_code
        self.confidence = confidence


class FakeDetectLanguageResponse:
    def __init__(self, *, languages: list[FakeDetectedLanguage]) -> None:
        self.languages = languages


class FakeLanguageDetectionClient:
    def __init__(self) -> None:
        self.requests: list[dict[str, object]] = []

    def detect_language(
        self,
        *,
        parent: str,
        content: str,
        mime_type: str,
        retry: object | None,
        timeout: float,
    ) -> FakeDetectLanguageResponse:
        self.requests.append(
            {
                "parent": parent,
                "content": content,
                "mime_type": mime_type,
                "retry": retry,
                "timeout": timeout,
            },
        )
        return FakeDetectLanguageResponse(
            languages=[FakeDetectedLanguage(language_code="zh_cn", confidence=0.87)],
        )


def _build_import_request(*, dynamic_translation_enabled: bool) -> ImportRequest:
    return IMPORT_REQUEST_ADAPTER.validate_python(
        {
            "importSlugId": "import-1",
            "userId": "user-1",
            "actorUserId": "user-1",
            "projectId": 1,
            "formData": {
                "participationMode": "guest",
                "isIndexed": True,
                "languageSetting": {"mode": "auto"},
                "multilingualSetting": {
                    "additionalLanguageCodes": ["fr"],
                    "dynamicTranslationEnabled": dynamic_translation_enabled,
                },
                "languageSettingsSource": "conversation_override",
            },
            "didWrite": "did:key:test",
            "type": "url",
            "polisUrl": "https://pol.is/example",
        },
    )


def test_lingua_detection_returns_unknown_for_empty_text() -> None:
    metadata = detect_source_language_with_lingua("   ")

    assert metadata.language_code is None
    assert metadata.raw_language_code is None
    assert metadata.provider is None
    assert metadata.confidence is None


def test_lingua_detection_detects_english_text() -> None:
    metadata = detect_source_language_with_lingua(
        "This is a public conversation about parks, libraries, and local civic life."
    )

    assert metadata.language_code == "en"
    assert metadata.confidence is not None


def test_lingua_detection_returns_unknown_for_unsupported_language() -> None:
    metadata = detect_source_language_with_lingua(
        "jan ale li kama pona. mi wile e ni: jan li toki pona li pali pona lon ma tomo."
    )

    assert metadata.language_code is None
    assert metadata.raw_language_code is None
    assert metadata.provider is None
    assert metadata.confidence is None


def test_lingua_detection_returns_unknown_instead_of_low_confidence_misattribution() -> None:
    metadata = detect_source_language_with_lingua(
        "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o ko kakou kulanakauhale?"
    )

    assert metadata.language_code is None
    assert metadata.raw_language_code == "SOTHO"
    assert metadata.provider == "lingua"
    assert metadata.confidence is not None


def test_lingua_detection_detects_supported_non_display_language() -> None:
    metadata = detect_source_language_with_lingua(
        "Wie koennen wir den oeffentlichen Nahverkehr in unserer Stadt verbessern "
        "und bezahlbar halten?"
    )

    assert metadata.language_code == "de"
    assert metadata.confidence is not None


def test_lingua_detection_detects_catalan() -> None:
    metadata = detect_source_language_with_lingua(
        "Com podem millorar el transport public de la ciutat i mantenir-lo "
        "assequible per a tothom?"
    )

    assert metadata.language_code == "ca"
    assert metadata.confidence is not None


def test_lingua_detection_keeps_haitian_creole_unknown() -> None:
    metadata = detect_source_language_with_lingua(
        "Kijan nou ka amelyore transpo piblik nan vil la epi kenbe li abodab "
        "pou tout moun?"
    )

    assert metadata.language_code is None
    if metadata.raw_language_code is not None:
        assert metadata.provider == "lingua"
        assert metadata.confidence is not None


def test_source_language_detection_falls_back_to_google_for_hawaiian() -> None:
    def google_detector(text: str) -> SourceLanguageMetadata:
        assert text.strip() != ""
        return SourceLanguageMetadata(language_code="haw", confidence=0.91)

    metadata = language_detection.detect_source_language(
        "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o ko kakou kulanakauhale?",
        google_detector=google_detector,
    )

    assert metadata.language_code == "haw"
    assert metadata.confidence == 0.91


def test_source_language_detection_falls_back_to_google_for_kyrgyz_cyrillic() -> None:
    def google_detector(text: str) -> SourceLanguageMetadata:
        assert text.strip() != ""
        return SourceLanguageMetadata(language_code="ky", confidence=0.92)

    metadata = language_detection.detect_source_language(
        "Шаарыбыздагы коомдук транспортту кантип жакшырта алабыз?",
        google_detector=google_detector,
    )

    assert metadata.language_code == "ky"
    assert metadata.confidence == 0.92


def test_lingua_detection_returns_unknown_for_kyrgyz_cyrillic() -> None:
    metadata = detect_source_language_with_lingua(
        "Шаарыбыздагы коомдук транспортту кантип жакшырта алабыз?",
    )

    assert metadata == SourceLanguageMetadata(language_code=None, confidence=None)


def test_source_language_detection_returns_unknown_for_cyrillic_without_google() -> None:
    metadata = language_detection.detect_source_language(
        "Шаарыбыздагы коомдук транспортту кантип жакшырта алабыз?",
    )

    assert metadata == SourceLanguageMetadata(language_code=None, confidence=None)


def test_source_language_detection_returns_unknown_when_google_fails_for_cyrillic() -> None:
    def google_detector(text: str) -> SourceLanguageMetadata:
        assert text.strip() != ""
        raise RuntimeError("google unavailable")

    metadata = language_detection.detect_source_language(
        "Шаарыбыздагы коомдук транспортту кантип жакшырта алабыз?",
        google_detector=google_detector,
    )

    assert metadata == SourceLanguageMetadata(language_code=None, confidence=None)


def test_chinese_script_inference_matches_api_special_case() -> None:
    assert infer_chinese_script_language("学国会说过还这里") == "zh-Hans"
    assert infer_chinese_script_language("學國會說過還這裡") == "zh-Hant"
    assert infer_chinese_script_language("公共交通") is None


def test_hinted_source_language_keeps_strong_global_result() -> None:
    metadata = language_detection.resolve_hinted_source_language(
        "This is a public conversation about parks, libraries, and civic life.",
        global_metadata=SourceLanguageMetadata(language_code="fr", confidence=0.7),
        language_hints=[
            SourceLanguageHint(
                language_code="en",
                weight=MANUAL_MAIN_LANGUAGE_HINT_WEIGHT,
            ),
        ],
    )

    assert metadata == SourceLanguageMetadata(language_code="fr", confidence=0.7)


def test_hinted_source_language_uses_weight_to_break_ambiguous_global_result() -> None:
    metadata = language_detection.resolve_hinted_source_language(
        "This is a public conversation about parks, libraries, and civic life.",
        global_metadata=SourceLanguageMetadata(language_code="nl", confidence=0.49),
        language_hints=[
            SourceLanguageHint(
                language_code="en",
                weight=MANUAL_MAIN_LANGUAGE_HINT_WEIGHT,
            ),
        ],
    )

    assert metadata.language_code == "en"
    assert metadata.confidence is not None
    assert metadata.confidence >= 0.5


def test_source_language_detection_does_not_fallback_to_hint_for_unknown_text() -> None:
    metadata = language_detection.detect_source_language(
        "2323",
        language_hints=[
            SourceLanguageHint(
                language_code="en",
                weight=MANUAL_MAIN_LANGUAGE_HINT_WEIGHT,
            ),
        ],
    )

    assert metadata == SourceLanguageMetadata(language_code=None, confidence=None)


def test_google_language_detection_parses_first_result() -> None:
    client = FakeLanguageDetectionClient()
    service = GoogleLanguageDetectionService(
        client=client,
        config=GoogleLanguageDetectionConfig(
            project_id="project-1",
            location="us-central1",
            endpoint="translate.googleapis.com",
            request_timeout_seconds=12.0,
        ),
    )

    metadata = detect_language_with_google(service=service, text="你好, 世界")

    assert metadata == SourceLanguageMetadata(
        language_code="zh-Hans",
        raw_language_code="zh_cn",
        provider="google_translate",
        confidence=0.87,
    )
    assert client.requests == [
        {
            "parent": "projects/project-1/locations/us-central1",
            "content": "你好, 世界",
            "mime_type": "text/plain",
            "retry": None,
            "timeout": 12.0,
        },
    ]


def test_imported_non_seed_opinion_uses_lingua_only() -> None:
    google_calls = 0

    def google_detector(text: str) -> SourceLanguageMetadata:
        nonlocal google_calls
        google_calls += 1
        return SourceLanguageMetadata(language_code="haw", confidence=0.91)

    metadata = imported_opinion_source_language_metadata(
        content_plain_text=(
            "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o "
            "ko kakou kulanakauhale?"
        ),
        is_seed=False,
        content_language_hints=[],
        google_detector=google_detector,
    )

    assert metadata.language_code is None
    assert metadata.raw_language_code == "SOTHO"
    assert metadata.provider == "lingua"
    assert metadata.confidence is not None
    assert google_calls == 0


def test_imported_seed_opinion_can_use_google_when_available() -> None:
    google_calls = 0

    def google_detector(text: str) -> SourceLanguageMetadata:
        nonlocal google_calls
        google_calls += 1
        assert text.strip() != ""
        return SourceLanguageMetadata(language_code="haw", confidence=0.91)

    metadata = imported_opinion_source_language_metadata(
        content_plain_text=(
            "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o "
            "ko kakou kulanakauhale?"
        ),
        is_seed=True,
        content_language_hints=[],
        google_detector=google_detector,
    )

    assert metadata == SourceLanguageMetadata(
        language_code="haw",
        raw_language_code="haw",
        provider="google_translate",
        confidence=0.91,
    )
    assert google_calls == 1


def test_import_google_detector_is_enabled_only_for_dynamic_translation() -> None:
    def google_detector(text: str) -> SourceLanguageMetadata:
        return SourceLanguageMetadata(language_code=text, confidence=1.0)

    enabled_request = _build_import_request(dynamic_translation_enabled=True)
    disabled_request = _build_import_request(dynamic_translation_enabled=False)

    assert (
        google_detector_for_import(
            request=enabled_request,
            google_detector=google_detector,
        )
        is google_detector
    )
    assert (
        google_detector_for_import(
            request=disabled_request,
            google_detector=google_detector,
        )
        is None
    )
