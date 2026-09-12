from __future__ import annotations

from typing import TYPE_CHECKING

from content_translation_worker.models import (
    ConversationSource,
    ConversationTranslationBundle,
    OpinionSource,
    OpinionTranslationBundle,
    ProjectSource,
    ProjectTranslation,
    ProjectTranslationBundle,
    RankingItemSource,
    RankingItemTranslationBundle,
    SurveyOptionTranslation,
    SurveyTranslation,
    SurveyTranslationBundle,
    TitleBodyTranslation,
)
from content_translation_worker.source_language import choose_user_content_translation_source
from content_translation_worker.translation import translate_text_for_claim_target
from content_translation_worker.work_policy import translation_target_languages

if TYPE_CHECKING:
    from collections.abc import Callable

    from content_translation_worker.generated_models import DisplayLanguageCode
    from content_translation_worker.models import PreparedContentTranslation, TranslationBundle
    from content_translation_worker.translation import (
        ContentTranslationResult,
        ContentTranslationService,
    )


def generate_translation_bundle(
    *,
    prepared: PreparedContentTranslation,
    translation_service: ContentTranslationService,
    check_active: Callable[[], None],
) -> TranslationBundle:
    """Generate a complete revision-bound bundle without a database session or connection."""
    source = prepared.source
    target = prepared.claim.display_language_code
    languages = translation_target_languages(target)

    def translate_field(
        *, value: str, source_language: str | None, mime_type: str
    ) -> dict[DisplayLanguageCode, ContentTranslationResult]:
        check_active()
        results = translate_text_for_claim_target(
            translation_service=translation_service,
            text_value=value,
            source_language_code=source_language,
            target_language_code=target,
            mime_type=mime_type,
        )
        check_active()
        return {result.display_language_code: result.result for result in results}

    def translate_optional(
        *, value: str | None, source_language: str | None, mime_type: str
    ) -> dict[DisplayLanguageCode, ContentTranslationResult | None]:
        if value is None:
            return dict.fromkeys(languages)
        return {
            language: result
            for language, result in translate_field(
                value=value, source_language=source_language, mime_type=mime_type
            ).items()
        }

    if isinstance(source, OpinionSource):
        decision = choose_user_content_translation_source(
            source_language_code=source.source_language_code,
            source_language_provider=source.source_language_provider,
            source_language_confidence=source.source_language_confidence,
        )
        check_active()
        results = translate_text_for_claim_target(
            translation_service=translation_service,
            text_value=source.content,
            source_language_code=decision.source_language_code_for_translation,
            target_language_code=target,
            mime_type="text/html",
        )
        check_active()
        return OpinionTranslationBundle(
            source=source, translations=tuple(results), source_decision=decision
        )

    if isinstance(source, RankingItemSource):
        decision = choose_user_content_translation_source(
            source_language_code=source.source_language_code,
            source_language_provider=source.source_language_provider,
            source_language_confidence=source.source_language_confidence,
        )
        titles = translate_field(
            value=source.title,
            source_language=decision.source_language_code_for_translation,
            mime_type="text/html",
        )
        bodies = translate_optional(
            value=source.body_html,
            source_language=decision.source_language_code_for_translation,
            mime_type="text/html",
        )
        return RankingItemTranslationBundle(
            source=source,
            source_decision=decision,
            translations=tuple(
                TitleBodyTranslation(
                    language=language, title=titles[language], body=bodies[language]
                )
                for language in languages
            ),
        )

    if isinstance(source, ConversationSource):
        titles = translate_field(
            value=source.title, source_language=source.source_language_code, mime_type="text/plain"
        )
        bodies = translate_optional(
            value=source.body, source_language=source.source_language_code, mime_type="text/html"
        )
        return ConversationTranslationBundle(
            source=source,
            translations=tuple(
                TitleBodyTranslation(
                    language=language, title=titles[language], body=bodies[language]
                )
                for language in languages
            ),
        )

    if isinstance(source, ProjectSource):
        titles = translate_field(
            value=source.title, source_language=source.source_language_code, mime_type="text/plain"
        )
        subtitles = translate_optional(
            value=source.subtitle,
            source_language=source.source_language_code,
            mime_type="text/plain",
        )
        bodies = translate_optional(
            value=source.body, source_language=source.source_language_code, mime_type="text/html"
        )
        return ProjectTranslationBundle(
            source=source,
            translations=tuple(
                ProjectTranslation(
                    language=language,
                    title=titles[language],
                    subtitle=subtitles[language],
                    body=bodies[language],
                )
                for language in languages
            ),
        )

    questions = translate_field(
        value=source.question_text,
        source_language=source.source_language_code,
        mime_type="text/plain",
    )
    options = tuple(
        (
            option,
            translate_field(
                value=option.option_text,
                source_language=option.source_language_code,
                mime_type="text/plain",
            ),
        )
        for option in source.options
    )
    return SurveyTranslationBundle(
        source=source,
        translations=tuple(
            SurveyTranslation(
                language=language,
                question=questions[language],
                options=tuple(
                    SurveyOptionTranslation(source=option, result=results[language])
                    for option, results in options
                ),
            )
            for language in languages
        ),
    )
