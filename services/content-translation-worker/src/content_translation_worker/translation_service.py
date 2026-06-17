from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from content_translation_worker.simulated_translation import SimulatedTranslationService
from content_translation_worker.translation import (
    ContentTranslationProviderError,
    ContentTranslationService,
    initialize_google_translation_service,
)
from content_translation_worker.translation_model import ContentTranslationProvider

if TYPE_CHECKING:
    from content_translation_worker.config import Settings

log = logging.getLogger(__name__)


def build_content_translation_service(settings: Settings) -> ContentTranslationService:
    if settings.translation_provider is ContentTranslationProvider.SIMULATED:
        log.info(
            "[Translator] Simulated content translation initialized mode=%s "
            "retryable_failure_attempts=%d",
            settings.simulation_mode.value,
            settings.simulation_retryable_failure_attempts,
        )
        return SimulatedTranslationService(
            mode=settings.simulation_mode,
            retryable_failure_attempts=settings.simulation_retryable_failure_attempts,
        )

    if settings.google_application_credentials_path is None:
        msg = "Google application credentials are required for Google translation"
        raise ContentTranslationProviderError(msg)
    return initialize_google_translation_service(
        google_application_credentials_path=settings.google_application_credentials_path,
        google_cloud_project_id=settings.google_cloud_project_id,
        google_cloud_translation_location=settings.google_cloud_translation_location,
        google_cloud_translation_endpoint=settings.google_cloud_translation_endpoint,
        google_cloud_translation_model=settings.google_cloud_translation_model,
        google_cloud_translation_timeout_seconds=settings.google_cloud_translation_timeout_seconds,
    )
