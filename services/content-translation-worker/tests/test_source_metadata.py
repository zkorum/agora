from __future__ import annotations

from content_translation_worker.db import (
    TranslationSourceDecision,
    TranslationSourceMetadata,
    build_translation_source_metadata_from_results,
    choose_user_content_translation_source,
    should_promote_google_source_metadata,
)
from content_translation_worker.generated_models import (
    LanguageDetectionProvider,
    SpokenLanguageCode,
)
from content_translation_worker.translation import ContentTranslationResult


def test_google_detected_source_is_used_when_enabled() -> None:
    metadata = build_translation_source_metadata_from_results(
        [
            ContentTranslationResult(
                translated_text="translated",
                source_raw_language_code="en-US",
                source_language_provider="google_translate",
            )
        ],
        use_google_detected_source=True,
        fallback_source_language_code=None,
        fallback_source_raw_language_code=None,
        fallback_source_language_provider=None,
        fallback_source_language_confidence=None,
    )

    assert metadata == TranslationSourceMetadata(
        source_language_code=SpokenLanguageCode.en,
        source_raw_language_code="en-US",
        source_language_provider=LanguageDetectionProvider.google_translate,
        source_language_confidence=None,
    )


def test_google_detected_source_is_ignored_when_disabled() -> None:
    metadata = build_translation_source_metadata_from_results(
        [
            ContentTranslationResult(
                translated_text="translated",
                source_raw_language_code="en-US",
                source_language_provider="google_translate",
            )
        ],
        use_google_detected_source=False,
        fallback_source_language_code="fr",
        fallback_source_raw_language_code="FRENCH",
        fallback_source_language_provider=LanguageDetectionProvider.lingua,
        fallback_source_language_confidence=0.72,
    )

    assert metadata == TranslationSourceMetadata(
        source_language_code=SpokenLanguageCode.fr,
        source_raw_language_code="FRENCH",
        source_language_provider=LanguageDetectionProvider.lingua,
        source_language_confidence=0.72,
    )


def test_google_detected_source_requires_single_consistent_language() -> None:
    metadata = build_translation_source_metadata_from_results(
        [
            ContentTranslationResult(
                translated_text="translated title",
                source_raw_language_code="en",
                source_language_provider="google_translate",
            ),
            ContentTranslationResult(
                translated_text="translated body",
                source_raw_language_code="fr",
                source_language_provider="google_translate",
            ),
        ],
        use_google_detected_source=True,
        fallback_source_language_code=None,
        fallback_source_raw_language_code=None,
        fallback_source_language_provider=None,
        fallback_source_language_confidence=None,
    )

    assert metadata == TranslationSourceMetadata(
        source_language_code=None,
        source_raw_language_code=None,
        source_language_provider=None,
        source_language_confidence=None,
    )


def test_google_source_metadata_can_promote_unknown_or_lingua_sources() -> None:
    metadata = TranslationSourceMetadata(
        source_language_code=SpokenLanguageCode.ky,
        source_raw_language_code="ky",
        source_language_provider=LanguageDetectionProvider.google_translate,
    )

    assert should_promote_google_source_metadata(
        source_metadata=metadata,
        current_source_language_provider=None,
    )
    assert should_promote_google_source_metadata(
        source_metadata=metadata,
        current_source_language_provider=LanguageDetectionProvider.lingua,
    )
    assert not should_promote_google_source_metadata(
        source_metadata=metadata,
        current_source_language_provider=LanguageDetectionProvider.google_translate,
    )


def test_non_google_or_unrecognized_source_metadata_is_not_promoted() -> None:
    assert not should_promote_google_source_metadata(
        source_metadata=TranslationSourceMetadata(
            source_language_code=SpokenLanguageCode.en,
            source_raw_language_code="ENGLISH",
            source_language_provider=LanguageDetectionProvider.lingua,
        ),
        current_source_language_provider=LanguageDetectionProvider.lingua,
    )
    assert not should_promote_google_source_metadata(
        source_metadata=TranslationSourceMetadata(
            source_language_code=None,
            source_raw_language_code="unknown",
            source_language_provider=LanguageDetectionProvider.google_translate,
        ),
        current_source_language_provider=LanguageDetectionProvider.lingua,
    )


def test_unknown_user_content_source_uses_google_auto_detection() -> None:
    assert choose_user_content_translation_source(
        source_language_code=None,
        source_language_provider=None,
        source_language_confidence=None,
    ) == TranslationSourceDecision(
        source_language_code_for_translation=None,
        use_google_detected_source=True,
    )


def test_google_user_content_source_is_passed_without_repromotion() -> None:
    assert choose_user_content_translation_source(
        source_language_code="ky",
        source_language_provider=LanguageDetectionProvider.google_translate,
        source_language_confidence=None,
    ) == TranslationSourceDecision(
        source_language_code_for_translation="ky",
        use_google_detected_source=False,
    )


def test_high_confidence_lingua_user_content_source_is_passed_without_repromotion() -> None:
    assert choose_user_content_translation_source(
        source_language_code="fr",
        source_language_provider=LanguageDetectionProvider.lingua,
        source_language_confidence=0.8,
    ) == TranslationSourceDecision(
        source_language_code_for_translation="fr",
        use_google_detected_source=False,
    )


def test_low_confidence_lingua_user_content_source_uses_google_auto_detection() -> None:
    assert choose_user_content_translation_source(
        source_language_code="kk",
        source_language_provider=LanguageDetectionProvider.lingua,
        source_language_confidence=0.79,
    ) == TranslationSourceDecision(
        source_language_code_for_translation=None,
        use_google_detected_source=True,
    )


def test_unattributed_user_content_source_uses_google_auto_detection() -> None:
    assert choose_user_content_translation_source(
        source_language_code="en",
        source_language_provider=None,
        source_language_confidence=None,
    ) == TranslationSourceDecision(
        source_language_code_for_translation=None,
        use_google_detected_source=True,
    )
