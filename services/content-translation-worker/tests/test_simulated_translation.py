from __future__ import annotations

import pytest

from content_translation_worker.simulated_translation import (
    SimulatedNonRetryableContentTranslationProviderError,
    SimulatedRetryableContentTranslationProviderError,
    SimulatedTranslationService,
    simulate_translation,
)
from content_translation_worker.translation import ContentTranslationResult
from content_translation_worker.translation_model import SimulatedTranslationMode


def test_simulate_translation_is_deterministic() -> None:
    assert (
        simulate_translation(
            text="Hello",
            source_language_code="en",
            target_language_code="fr",
            mime_type="text/plain",
        )
        == "[simulated en->fr text/plain] Hello"
    )


def test_simulated_success_service_translates_all_texts() -> None:
    service = SimulatedTranslationService(
        mode=SimulatedTranslationMode.SUCCESS,
        retryable_failure_attempts=1,
    )

    result = service.translate_texts(
        texts=["Hello", "World"],
        source_language_code=None,
        target_language_code="fr",
        mime_type="text/plain",
    )

    assert result == [
        ContentTranslationResult(
            translated_text="[simulated auto->fr text/plain] Hello",
            source_raw_language_code=None,
            source_language_provider=None,
        ),
        ContentTranslationResult(
            translated_text="[simulated auto->fr text/plain] World",
            source_raw_language_code=None,
            source_language_provider=None,
        ),
    ]


def test_simulated_retry_then_success() -> None:
    service = SimulatedTranslationService(
        mode=SimulatedTranslationMode.RETRYABLE_ERROR_THEN_SUCCESS,
        retryable_failure_attempts=1,
    )

    with pytest.raises(SimulatedRetryableContentTranslationProviderError):
        service.translate_texts(
            texts=["Hello"],
            source_language_code="en",
            target_language_code="fr",
            mime_type="text/plain",
        )

    assert service.translate_texts(
        texts=["Hello"],
        source_language_code="en",
        target_language_code="fr",
        mime_type="text/plain",
    ) == [
        ContentTranslationResult(
            translated_text="[simulated en->fr text/plain] Hello",
            source_raw_language_code="en",
            source_language_provider="google_translate",
        )
    ]


def test_simulated_non_retryable_failure() -> None:
    service = SimulatedTranslationService(
        mode=SimulatedTranslationMode.NON_RETRYABLE_ERROR,
        retryable_failure_attempts=1,
    )

    with pytest.raises(SimulatedNonRetryableContentTranslationProviderError):
        service.translate_texts(
            texts=["Hello"],
            source_language_code="en",
            target_language_code="fr",
            mime_type="text/plain",
        )
