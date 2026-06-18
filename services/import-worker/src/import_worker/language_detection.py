from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from lingua import Language, LanguageDetectorBuilder

LINGUA_MINIMUM_RELATIVE_DISTANCE = 0.2
LINGUA_MINIMUM_LANGUAGE_CONFIDENCE = 0.5
GOOGLE_MINIMUM_LANGUAGE_CONFIDENCE = 0.5
MEANINGFUL_CYRILLIC_LETTER_COUNT = 12
MEANINGFUL_CYRILLIC_LETTER_RATIO = 0.4


@dataclass(frozen=True)
class SourceLanguageMetadata:
    language_code: str | None
    confidence: float | None


class GoogleLanguageDetector(Protocol):
    def __call__(self, text: str) -> SourceLanguageMetadata: ...


_detector = (
    LanguageDetectorBuilder.from_all_spoken_languages()
    .with_minimum_relative_distance(LINGUA_MINIMUM_RELATIVE_DISTANCE)
    .build()
)


def detect_source_language_with_lingua(text: str) -> SourceLanguageMetadata:
    cleaned_text = text.strip()
    if cleaned_text == "":
        return SourceLanguageMetadata(language_code=None, confidence=None)

    return _detect_source_language_with_lingua_cleaned(cleaned_text)


def detect_source_language(
    text: str,
    *,
    google_detector: GoogleLanguageDetector | None = None,
) -> SourceLanguageMetadata:
    cleaned_text = text.strip()
    if cleaned_text == "":
        return SourceLanguageMetadata(language_code=None, confidence=None)

    if google_detector is not None and _has_meaningful_cyrillic_text(cleaned_text):
        return _detect_source_language_with_google(
            cleaned_text,
            google_detector=google_detector,
        )

    local_metadata = _detect_source_language_with_lingua_cleaned(cleaned_text)
    if local_metadata.language_code is not None:
        return local_metadata

    if google_detector is None:
        return local_metadata

    return _detect_source_language_with_google(
        cleaned_text,
        google_detector=google_detector,
    )


def _detect_source_language_with_lingua_cleaned(cleaned_text: str) -> SourceLanguageMetadata:
    detected_language = _detector.detect_language_of(cleaned_text)
    if detected_language is None:
        return SourceLanguageMetadata(language_code=None, confidence=None)

    language_code = _language_to_code(detected_language)
    confidence = _detector.compute_language_confidence(cleaned_text, detected_language)
    if confidence < LINGUA_MINIMUM_LANGUAGE_CONFIDENCE:
        return SourceLanguageMetadata(language_code=None, confidence=None)
    return SourceLanguageMetadata(language_code=language_code, confidence=confidence)


def _detect_source_language_with_google(
    text: str,
    *,
    google_detector: GoogleLanguageDetector,
) -> SourceLanguageMetadata:
    try:
        metadata = google_detector(text)
    except Exception:
        return SourceLanguageMetadata(language_code=None, confidence=None)

    if metadata.confidence is None or metadata.confidence < GOOGLE_MINIMUM_LANGUAGE_CONFIDENCE:
        return SourceLanguageMetadata(language_code=None, confidence=None)
    return metadata


def _has_meaningful_cyrillic_text(text: str) -> bool:
    cyrillic_letters = 0
    letters = 0
    for character in text:
        if character.isalpha():
            letters += 1
        if "\u0400" <= character <= "\u04ff" or "\u0500" <= character <= "\u052f":
            cyrillic_letters += 1

    return (
        cyrillic_letters >= MEANINGFUL_CYRILLIC_LETTER_COUNT
        and letters > 0
        and cyrillic_letters / letters >= MEANINGFUL_CYRILLIC_LETTER_RATIO
    )


def _language_to_code(language: Language) -> str:
    iso_code = language.iso_code_639_1
    return iso_code.name.lower().replace("_", "-")
