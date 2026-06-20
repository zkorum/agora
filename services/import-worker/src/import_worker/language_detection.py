from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from lingua import Language, LanguageDetectorBuilder

LINGUA_MINIMUM_RELATIVE_DISTANCE = 0.2
LINGUA_MINIMUM_LANGUAGE_CONFIDENCE = 0.5
HIGH_GLOBAL_LANGUAGE_CONFIDENCE = 0.55
MINIMUM_HINT_LANGUAGE_CONFIDENCE = 0.5
MINIMUM_HINT_WITHOUT_GLOBAL_LANGUAGE_CONFIDENCE = 0.55
MINIMUM_HINT_CONFIDENCE_MARGIN = 0.15
HINT_CAN_OVERRIDE_GLOBAL_CONFIDENCE_DELTA = 0.1
MANUAL_MAIN_LANGUAGE_HINT_WEIGHT = 0.08
AUTO_MAIN_LANGUAGE_HINT_WEIGHT = 0.04
ADDITIONAL_LANGUAGE_HINT_WEIGHT = 0.0
GOOGLE_MINIMUM_LANGUAGE_CONFIDENCE = 0.5
MEANINGFUL_CYRILLIC_LETTER_COUNT = 12
MEANINGFUL_CYRILLIC_LETTER_RATIO = 0.4


@dataclass(frozen=True)
class SourceLanguageMetadata:
    language_code: str | None
    confidence: float | None


@dataclass(frozen=True)
class SourceLanguageHint:
    language_code: str
    weight: float


class GoogleLanguageDetector(Protocol):
    def __call__(self, text: str) -> SourceLanguageMetadata: ...


_detector = (
    LanguageDetectorBuilder.from_all_spoken_languages()
    .with_minimum_relative_distance(LINGUA_MINIMUM_RELATIVE_DISTANCE)
    .build()
)

_LANGUAGE_CODE_TO_LINGUA_LANGUAGE: dict[str, Language] = {
    "ar": Language.ARABIC,
    "en": Language.ENGLISH,
    "es": Language.SPANISH,
    "fa": Language.PERSIAN,
    "fr": Language.FRENCH,
    "he": Language.HEBREW,
    "ja": Language.JAPANESE,
    "ru": Language.RUSSIAN,
    "zh-Hans": Language.CHINESE,
    "zh-Hant": Language.CHINESE,
}


def detect_source_language_with_lingua(text: str) -> SourceLanguageMetadata:
    cleaned_text = text.strip()
    if cleaned_text == "":
        return SourceLanguageMetadata(language_code=None, confidence=None)

    return _detect_source_language_with_lingua_cleaned(cleaned_text)


def detect_source_language(
    text: str,
    *,
    google_detector: GoogleLanguageDetector | None = None,
    language_hints: list[SourceLanguageHint] | None = None,
) -> SourceLanguageMetadata:
    cleaned_text = text.strip()
    if cleaned_text == "":
        return SourceLanguageMetadata(language_code=None, confidence=None)

    if google_detector is not None and _has_meaningful_cyrillic_text(cleaned_text):
        return _detect_source_language_with_google(
            cleaned_text,
            google_detector=google_detector,
        )

    hints = language_hints or []
    local_metadata = _detect_source_language_with_lingua_cleaned(cleaned_text)
    hinted_metadata = resolve_hinted_source_language(
        cleaned_text,
        global_metadata=local_metadata,
        language_hints=hints,
    )
    if hinted_metadata.language_code is not None:
        return hinted_metadata

    if google_detector is None:
        return hinted_metadata

    return _detect_source_language_with_google(
        cleaned_text,
        google_detector=google_detector,
    )


def _confidence_value(metadata: SourceLanguageMetadata) -> float:
    return metadata.confidence or 0.0


def resolve_hinted_source_language(
    text: str,
    *,
    global_metadata: SourceLanguageMetadata,
    language_hints: list[SourceLanguageHint],
) -> SourceLanguageMetadata:
    hinted_metadata = _compute_hinted_source_languages(text, language_hints=language_hints)
    best_hint = hinted_metadata[0] if len(hinted_metadata) > 0 else None
    second_best_hint = hinted_metadata[1] if len(hinted_metadata) > 1 else None

    if global_metadata.language_code is not None:
        global_confidence = _confidence_value(global_metadata)
        if global_confidence >= HIGH_GLOBAL_LANGUAGE_CONFIDENCE:
            return global_metadata
        if best_hint is not None and best_hint[0].language_code == global_metadata.language_code:
            return global_metadata
        if (
            best_hint is not None
            and _confidence_value(best_hint[0]) >= MINIMUM_HINT_LANGUAGE_CONFIDENCE
            and _hint_has_enough_margin(best_hint, second_best_hint)
            and best_hint[1] >= global_confidence - HINT_CAN_OVERRIDE_GLOBAL_CONFIDENCE_DELTA
        ):
            return best_hint[0]
        return global_metadata

    if (
        best_hint is not None
        and _confidence_value(best_hint[0]) >= MINIMUM_HINT_WITHOUT_GLOBAL_LANGUAGE_CONFIDENCE
        and _hint_has_enough_margin(best_hint, second_best_hint)
    ):
        return best_hint[0]

    return global_metadata


def _hint_has_enough_margin(
    best_hint: tuple[SourceLanguageMetadata, float],
    second_best_hint: tuple[SourceLanguageMetadata, float] | None,
) -> bool:
    if second_best_hint is None:
        return True
    return best_hint[1] - second_best_hint[1] >= MINIMUM_HINT_CONFIDENCE_MARGIN


def _compute_hinted_source_languages(
    text: str,
    *,
    language_hints: list[SourceLanguageHint],
) -> list[tuple[SourceLanguageMetadata, float]]:
    seen_languages: set[Language] = set()
    hinted_metadata: list[tuple[SourceLanguageMetadata, float]] = []
    for hint in language_hints:
        language = _LANGUAGE_CODE_TO_LINGUA_LANGUAGE.get(hint.language_code)
        if language is None or language in seen_languages:
            continue
        seen_languages.add(language)
        confidence = _detector.compute_language_confidence(text, language)
        metadata = SourceLanguageMetadata(
            language_code=_language_to_code(language),
            confidence=confidence,
        )
        hinted_metadata.append((metadata, _confidence_value(metadata) + hint.weight))
    return sorted(hinted_metadata, key=lambda item: item[1], reverse=True)


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
