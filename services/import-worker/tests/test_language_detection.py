from __future__ import annotations

from import_worker.language_detection import detect_source_language_with_lingua


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
