from __future__ import annotations

from dataclasses import dataclass
from functools import cache
from typing import TYPE_CHECKING, Literal, Protocol, TypeGuard

from lingua import LanguageDetectorBuilder

if TYPE_CHECKING:
    from collections.abc import Sequence

    from lingua import LanguageDetector

MINIMUM_RELATIVE_DISTANCE = 0.2
HIGH_GLOBAL_LANGUAGE_CONFIDENCE = 0.55


@dataclass(frozen=True)
class DetectedLanguage:
    language_code: str
    confidence: float
    provider: Literal["lingua", "google_translate"]


@dataclass(frozen=True)
class UnknownLanguage:
    pass


@dataclass(frozen=True)
class DetectionUnavailable:
    error: Exception


type DetectionOutcome = DetectedLanguage | UnknownLanguage | DetectionUnavailable


class LanguageDetectorFunction(Protocol):
    def __call__(self, text: str, /) -> DetectionOutcome: ...


@cache
def local_detector() -> LanguageDetector:
    return (
        LanguageDetectorBuilder.from_all_spoken_languages()
        .with_minimum_relative_distance(MINIMUM_RELATIVE_DISTANCE)
        .build()
    )


def detect_locally(text: str) -> DetectionOutcome:
    if not text.strip():
        return UnknownLanguage()
    try:
        detector = local_detector()
        language = detector.detect_language_of(text)
        if language is None:
            return UnknownLanguage()
        return DetectedLanguage(
            language_code=language.iso_code_639_1.name.lower(),
            confidence=detector.compute_language_confidence(text, language),
            provider="lingua",
        )
    except Exception as error:
        return DetectionUnavailable(error)


class GoogleDetectedLanguage(Protocol):
    @property
    def language_code(self) -> str: ...

    @property
    def confidence(self) -> float: ...


class GoogleDetectionResponse(Protocol):
    @property
    def languages(self) -> Sequence[GoogleDetectedLanguage]: ...


class GoogleDetectionClient(Protocol):
    def detect_language(
        self,
        *,
        parent: str,
        content: str,
        mime_type: str,
        retry: object | None,
        timeout: float,
    ) -> GoogleDetectionResponse: ...


def is_google_detection_client(client: object) -> TypeGuard[GoogleDetectionClient]:
    return callable(getattr(client, "detect_language", None))


def detect_with_google(
    *,
    client: GoogleDetectionClient,
    parent: str,
    text: str,
    timeout: float,
) -> DetectionOutcome:
    if not text.strip():
        return UnknownLanguage()
    try:
        response = client.detect_language(
            parent=parent, content=text, mime_type="text/plain", retry=None, timeout=timeout
        )
        if not response.languages:
            return UnknownLanguage()
        language = response.languages[0]
        return DetectedLanguage(
            language_code=language.language_code,
            confidence=language.confidence,
            provider="google_translate",
        )
    except Exception as error:
        return DetectionUnavailable(error)
