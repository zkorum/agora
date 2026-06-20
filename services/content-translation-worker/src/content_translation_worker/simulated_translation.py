from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from content_translation_worker.translation import (
    ContentTranslationProviderError,
    ContentTranslationResult,
)
from content_translation_worker.translation_model import SimulatedTranslationMode

log = logging.getLogger(__name__)
SIMULATION_EVENT_SCENARIO = "content-translation-worker-simulation"


class SimulatedRetryableContentTranslationProviderError(ContentTranslationProviderError):
    pass


class SimulatedNonRetryableContentTranslationProviderError(ContentTranslationProviderError):
    pass


@dataclass
class SimulatedTranslationService:
    mode: SimulatedTranslationMode
    retryable_failure_attempts: int
    _call_count: int = 0

    def translate_texts(
        self,
        *,
        texts: list[str],
        source_language_code: str | None,
        target_language_code: str,
        mime_type: str,
    ) -> list[ContentTranslationResult]:
        self._call_count += 1
        if self.mode is SimulatedTranslationMode.RETRYABLE_ERROR:
            _emit_simulation_event(
                outcome="retryable_error",
                target_language_code=target_language_code,
                text_count=len(texts),
            )
            msg = "simulated retryable content translation failure"
            raise SimulatedRetryableContentTranslationProviderError(msg)
        if (
            self.mode is SimulatedTranslationMode.RETRYABLE_ERROR_THEN_SUCCESS
            and self._call_count <= self.retryable_failure_attempts
        ):
            _emit_simulation_event(
                outcome="retryable_error",
                target_language_code=target_language_code,
                text_count=len(texts),
            )
            msg = "simulated retryable content translation failure"
            raise SimulatedRetryableContentTranslationProviderError(msg)
        if self.mode is SimulatedTranslationMode.NON_RETRYABLE_ERROR:
            _emit_simulation_event(
                outcome="non_retryable_error",
                target_language_code=target_language_code,
                text_count=len(texts),
            )
            msg = "simulated non-retryable content translation failure"
            raise SimulatedNonRetryableContentTranslationProviderError(msg)

        _emit_simulation_event(
            outcome="success",
            target_language_code=target_language_code,
            text_count=len(texts),
        )
        return [
            ContentTranslationResult(
                translated_text=simulate_translation(
                    text=text,
                    source_language_code=source_language_code,
                    target_language_code=target_language_code,
                    mime_type=mime_type,
                ),
                source_raw_language_code=source_language_code,
                source_language_provider="google_translate"
                if source_language_code is not None
                else None,
            )
            for text in texts
        ]


def simulate_translation(
    *,
    text: str,
    source_language_code: str | None,
    target_language_code: str,
    mime_type: str,
) -> str:
    if text == "":
        return ""
    source_label = source_language_code or "auto"
    return f"[simulated {source_label}->{target_language_code} {mime_type}] {text}"


def _emit_simulation_event(
    *,
    outcome: str,
    target_language_code: str,
    text_count: int,
) -> None:
    payload = {
        "schemaVersion": 1,
        "timestamp": datetime.now(UTC).isoformat(),
        "scenario": SIMULATION_EVENT_SCENARIO,
        "phase": "simulation-provider",
        "action": "content-translation-provider",
        "outcome": outcome,
        "count": text_count,
        "metadata": {"targetLanguageCode": target_language_code},
    }
    log.info("AGORA_LOAD_EVENT %s", json.dumps(payload, separators=(",", ":")))
