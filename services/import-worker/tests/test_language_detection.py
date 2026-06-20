from __future__ import annotations

from import_worker import language_detection
from import_worker.language_detection import (
    MANUAL_MAIN_LANGUAGE_HINT_WEIGHT,
    SourceLanguageHint,
    SourceLanguageMetadata,
    detect_source_language_with_lingua,
)


def test_lingua_detection_returns_unknown_for_empty_text() -> None:
    metadata = detect_source_language_with_lingua("   ")

    assert metadata.language_code is None
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
    assert metadata.confidence is None


def test_lingua_detection_returns_unknown_instead_of_low_confidence_misattribution() -> None:
    metadata = detect_source_language_with_lingua(
        "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o ko kakou kulanakauhale?"
    )

    assert metadata.language_code is None
    assert metadata.confidence is None


def test_lingua_detection_detects_supported_non_display_language() -> None:
    metadata = detect_source_language_with_lingua(
        "Wie koennen wir den oeffentlichen Nahverkehr in unserer Stadt verbessern "
        "und bezahlbar halten?"
    )

    assert metadata.language_code == "de"
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
