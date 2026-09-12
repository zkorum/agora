from __future__ import annotations

from content_translation_worker.generated_models import LanguageDetectionProvider
from content_translation_worker.models import TranslationSourceDecision


def choose_user_content_translation_source(
    *,
    source_language_code: str | None,
    source_language_provider: LanguageDetectionProvider | None,
    source_language_confidence: float | None,
) -> TranslationSourceDecision:
    trusted_source = source_language_code is not None and (
        source_language_provider == LanguageDetectionProvider.google_translate
        or (
            source_language_provider == LanguageDetectionProvider.lingua
            and source_language_confidence is not None
            and source_language_confidence >= 0.8
        )
    )
    return TranslationSourceDecision(
        source_language_code_for_translation=source_language_code if trusted_source else None,
        use_google_detected_source=not trusted_source,
    )
