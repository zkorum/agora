from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal, TypeGuard

from agora_language.detection import (
    HIGH_GLOBAL_LANGUAGE_CONFIDENCE,
    DetectedLanguage,
    DetectionUnavailable,
    detect_locally,
    local_detector,
)

if TYPE_CHECKING:
    from agora_language.detection import DetectionOutcome, LanguageDetectorFunction

    from agora_analysis_worker_shared.bedrock_label_summary import LabelSummary

CANONICAL_DESCRIPTION_LOCALE = "en"
LOCAL_SUMMARY_CONFIDENCE = HIGH_GLOBAL_LANGUAGE_CONFIDENCE
LOCAL_MISMATCH_CONFIDENCE = 0.9
GOOGLE_SUMMARY_CONFIDENCE = 0.5
LABEL_MISMATCH_CONFIDENCE = 0.9
SENTENCE_ENDINGS = frozenset(".!?。؟\n\N{FULLWIDTH EXCLAMATION MARK}\N{FULLWIDTH QUESTION MARK}")


@dataclass(frozen=True)
class EnglishDescription:
    label: str
    summary: str


@dataclass(frozen=True)
class DescriptionLanguageIssue:
    reason: Literal[
        "invalid_content", "language_mismatch", "language_unknown", "detection_unavailable"
    ]
    field: Literal["label", "summary"]
    detected_language: str | None = None
    confidence: float | None = None


type DescriptionAcceptance = EnglishDescription | DescriptionLanguageIssue


def _is_confident(detection: DetectionOutcome) -> TypeGuard[DetectedLanguage]:
    if not isinstance(detection, DetectedLanguage):
        return False
    if detection.provider == "google_translate":
        return detection.confidence >= GOOGLE_SUMMARY_CONFIDENCE
    threshold = LOCAL_SUMMARY_CONFIDENCE if _is_english(detection) else LOCAL_MISMATCH_CONFIDENCE
    return detection.confidence >= threshold


def _is_english(detection: DetectedLanguage) -> bool:
    return detection.language_code.lower().replace("_", "-").split("-")[0] == "en"


def check_description_language(
    description: LabelSummary,
    *,
    secondary_detector: LanguageDetectorFunction | None = None,
) -> DescriptionAcceptance:
    fields: tuple[tuple[Literal["label", "summary"], str, int], ...] = (
        ("label", description.label, 100),
        ("summary", description.summary, 1000),
    )
    for field, text, limit in fields:
        if not text.strip() or len(text) > limit:
            return DescriptionLanguageIssue(reason="invalid_content", field=field)

    label_detection = detect_locally(description.label)
    if (
        isinstance(label_detection, DetectedLanguage)
        and label_detection.confidence >= LABEL_MISMATCH_CONFIDENCE
        and not _is_english(label_detection)
    ):
        return DescriptionLanguageIssue(
            reason="language_mismatch",
            field="label",
            detected_language=label_detection.language_code,
            confidence=label_detection.confidence,
        )

    detection = detect_locally(description.summary)
    if not _is_confident(detection) and secondary_detector is not None:
        detection = secondary_detector(description.summary)
    if isinstance(detection, DetectionUnavailable):
        return DescriptionLanguageIssue(reason="detection_unavailable", field="summary")
    if not _is_confident(detection):
        return DescriptionLanguageIssue(
            reason="language_unknown",
            field="summary",
            detected_language=detection.language_code
            if isinstance(detection, DetectedLanguage)
            else None,
            confidence=detection.confidence if isinstance(detection, DetectedLanguage) else None,
        )
    if not _is_english(detection):
        return DescriptionLanguageIssue(
            reason="language_mismatch",
            field="summary",
            detected_language=detection.language_code,
            confidence=detection.confidence,
        )

    accepted = EnglishDescription(label=description.label, summary=description.summary)
    # Dominant-language scores can conceal foreign sentences. Check sentence-sized
    # spans, not arbitrary word counts that mistake embedded proper names for prose.
    try:
        spans = local_detector().detect_multiple_languages_of(description.summary)
    except Exception:
        if detection.provider == "google_translate":
            return accepted
        return DescriptionLanguageIssue(reason="detection_unavailable", field="summary")
    for span in spans:
        if span.language.iso_code_639_1.name.lower() == "en":
            continue
        prefix = description.summary[: span.start_index].rstrip(" \t")
        text = description.summary[span.start_index : span.end_index].strip()
        suffix = description.summary[span.end_index :].strip()
        if not text or (prefix and prefix[-1] not in SENTENCE_ENDINGS):
            continue
        if suffix and text[-1] not in SENTENCE_ENDINGS:
            continue
        span_detection = detect_locally(text)
        if _is_confident(span_detection) and not _is_english(span_detection):
            return DescriptionLanguageIssue(
                reason="language_mismatch",
                field="summary",
                detected_language=span_detection.language_code,
                confidence=span_detection.confidence,
            )

    return accepted
