from __future__ import annotations

from enum import StrEnum


class ContentTranslationProvider(StrEnum):
    GOOGLE = "google"
    SIMULATED = "simulated"


class GoogleTranslationModel(StrEnum):
    NMT = "general/nmt"
    TRANSLATION_LLM = "general/translation-llm"


class SimulatedTranslationMode(StrEnum):
    SUCCESS = "success"
    RETRYABLE_ERROR = "retryable_error"
    RETRYABLE_ERROR_THEN_SUCCESS = "retryable_error_then_success"
    NON_RETRYABLE_ERROR = "non_retryable_error"


def build_google_translation_model_path(
    *,
    project_id: str,
    location: str,
    model: GoogleTranslationModel,
) -> str:
    return f"projects/{project_id}/locations/{location}/models/{model.value}"
