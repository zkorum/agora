from __future__ import annotations

from dataclasses import dataclass

from lingua import Language, LanguageDetectorBuilder

LINGUA_MINIMUM_RELATIVE_DISTANCE = 0.2


@dataclass(frozen=True)
class SourceLanguageMetadata:
    language_code: str | None
    confidence: float | None


_detector = (
    LanguageDetectorBuilder.from_all_spoken_languages()
    .with_minimum_relative_distance(LINGUA_MINIMUM_RELATIVE_DISTANCE)
    .build()
)


def detect_source_language_with_lingua(text: str) -> SourceLanguageMetadata:
    cleaned_text = text.strip()
    if cleaned_text == "":
        return SourceLanguageMetadata(language_code=None, confidence=None)

    detected_language = _detector.detect_language_of(cleaned_text)
    if detected_language is None:
        return SourceLanguageMetadata(language_code=None, confidence=None)

    language_code = _language_to_code(detected_language)
    confidence = _detector.compute_language_confidence(cleaned_text, detected_language)
    return SourceLanguageMetadata(language_code=language_code, confidence=confidence)


def _language_to_code(language: Language) -> str:
    iso_code = language.iso_code_639_1
    return iso_code.name.lower().replace("_", "-")
