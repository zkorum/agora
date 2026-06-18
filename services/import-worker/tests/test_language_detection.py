from __future__ import annotations

from import_worker import language_detection
from import_worker.language_detection import (
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
        "Wie koennen wir den oeffentlichen Nahverkehr in unserer Stadt verbessern und bezahlbar halten?"
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
