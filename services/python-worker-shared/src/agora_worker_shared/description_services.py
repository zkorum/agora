from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from botocore.exceptions import ConnectTimeoutError, ReadTimeoutError
from google.api_core.exceptions import DeadlineExceeded
from google.api_core.exceptions import RetryError as GoogleRetryError

from agora_worker_shared.bedrock_label_summary import (
    BedrockLabelSummaryConfig,
    BedrockLabelSummaryError,
    generate_label_summaries_with_bedrock,
)
from agora_worker_shared.description_translation import (
    BedrockTranslationConfig,
    DescriptionTranslationError,
    generate_description_translations,
    generate_description_translations_with_bedrock,
    initialize_google_translation_service,
)
from agora_worker_shared.simulation_providers import (
    generate_simulated_description_translations,
    generate_simulated_label_summaries,
)

if TYPE_CHECKING:
    from collections.abc import Callable

    from agora_worker_shared.bedrock_label_summary import ParsedLabelSummaryOutput
    from agora_worker_shared.config import Settings
    from agora_worker_shared.description_input import ConversationDescriptionInput
    from agora_worker_shared.description_translation import (
        DescriptionForTranslation,
        DescriptionTranslation,
        GoogleTranslationService,
    )

    DescriptionGenerator = Callable[[ConversationDescriptionInput], ParsedLabelSummaryOutput]
    DescriptionTranslator = Callable[
        [list[DescriptionForTranslation], list[str]],
        list[DescriptionTranslation],
    ]

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class DescriptionTranslatorBundle:
    mode: str
    translate: DescriptionTranslator


def build_description_generator(settings: Settings) -> DescriptionGenerator | None:
    if settings.ai_description_simulation_enabled:
        return generate_simulated_label_summaries

    if not settings.aws_ai_label_summary_enable:
        return None

    config = BedrockLabelSummaryConfig(
        region=settings.aws_ai_label_summary_region,
        model_id=settings.aws_ai_label_summary_model_id,
        temperature=settings.aws_ai_label_summary_temperature,
        top_p=settings.aws_ai_label_summary_top_p,
        max_tokens=settings.aws_ai_label_summary_max_tokens,
        prompt=settings.aws_ai_label_summary_prompt,
        connect_timeout_seconds=settings.aws_client_connect_timeout_seconds,
        read_timeout_seconds=settings.aws_ai_label_summary_read_timeout_seconds,
    )

    def generate(
        conversation: ConversationDescriptionInput,
    ) -> ParsedLabelSummaryOutput:
        return _retry_description_provider(
            provider_name="Bedrock",
            attempts=2,
            call=lambda: generate_label_summaries_with_bedrock(
                conversation=conversation,
                config=config,
            ),
        )

    return generate


def build_description_translator(settings: Settings) -> DescriptionTranslatorBundle | None:
    if settings.description_translation_simulation_enabled:
        return DescriptionTranslatorBundle(
            mode="simulation",
            translate=generate_simulated_description_translations,
        )

    bedrock_config = (
        BedrockTranslationConfig(
            region=settings.aws_description_translation_region,
            model_id=settings.aws_description_translation_model_id,
            temperature=settings.aws_description_translation_temperature,
            top_p=settings.aws_description_translation_top_p,
            max_tokens=settings.aws_description_translation_max_tokens,
            prompt=settings.aws_description_translation_prompt,
            connect_timeout_seconds=settings.aws_client_connect_timeout_seconds,
            read_timeout_seconds=settings.aws_description_translation_read_timeout_seconds,
        )
        if settings.aws_description_translation_enable
        else None
    )
    google_service = _build_google_translation_service(settings)

    if bedrock_config is None and google_service is None:
        return None

    if bedrock_config is not None and google_service is not None:

        def translate_with_bedrock_then_google(
            descriptions: list[DescriptionForTranslation],
            target_language_codes: list[str],
        ) -> list[DescriptionTranslation]:
            try:
                bedrock_translations = _generate_bedrock_translations_with_partial_retries(
                    config=bedrock_config,
                    descriptions=descriptions,
                    target_language_codes=target_language_codes,
                    attempts=2,
                )
                return fill_missing_translations_with_google(
                    google_service=google_service,
                    descriptions=descriptions,
                    target_language_codes=target_language_codes,
                    translations=bedrock_translations,
                )
            except Exception as error:
                if _is_timeout_error(error):
                    raise
                log.warning(
                    "[DescriptionTranslator] Bedrock translation exhausted; falling back to Google",
                    exc_info=True,
                )
                translations = _retry_translation_provider(
                    provider_name="Google",
                    attempts=2,
                    call=lambda: _generate_google_translations(
                        google_service=google_service,
                        descriptions=descriptions,
                        target_language_codes=target_language_codes,
                    ),
                )
                log.info(
                    "[DescriptionTranslator] Google fallback translation succeeded "
                    "description_count=%d locale_count=%d output_count=%d",
                    len(descriptions),
                    len(target_language_codes),
                    len(translations),
                )
                return translations

        return DescriptionTranslatorBundle(
            mode="bedrock_with_google_fallback",
            translate=translate_with_bedrock_then_google,
        )

    if bedrock_config is not None:

        def translate_with_bedrock(
            descriptions: list[DescriptionForTranslation],
            target_language_codes: list[str],
        ) -> list[DescriptionTranslation]:
            return _generate_bedrock_translations_with_partial_retries(
                config=bedrock_config,
                descriptions=descriptions,
                target_language_codes=target_language_codes,
                attempts=2,
            )

        return DescriptionTranslatorBundle(mode="bedrock", translate=translate_with_bedrock)

    if google_service is None:
        return None

    def translate_with_google(
        descriptions: list[DescriptionForTranslation],
        target_language_codes: list[str],
    ) -> list[DescriptionTranslation]:
        return _retry_translation_provider(
            provider_name="Google",
            attempts=2,
            call=lambda: _generate_google_translations(
                google_service=google_service,
                descriptions=descriptions,
                target_language_codes=target_language_codes,
            ),
        )

    return DescriptionTranslatorBundle(mode="google", translate=translate_with_google)


def _build_google_translation_service(settings: Settings) -> GoogleTranslationService | None:
    try:
        return initialize_google_translation_service(
            google_cloud_service_account_aws_secret_key=(
                settings.google_cloud_service_account_aws_secret_key
            ),
            aws_secret_region=settings.aws_secret_region,
            aws_connect_timeout_seconds=settings.aws_client_connect_timeout_seconds,
            aws_read_timeout_seconds=settings.aws_secret_read_timeout_seconds,
            google_application_credentials_path=settings.google_application_credentials,
            google_cloud_translation_location=settings.google_cloud_translation_location,
            google_cloud_translation_endpoint=settings.google_cloud_translation_endpoint,
            google_cloud_translation_timeout_seconds=(
                settings.google_cloud_translation_timeout_seconds
            ),
        )
    except Exception as error:
        if settings.google_translation_credentials_configured:
            msg = "Google Cloud Translation is configured but could not be initialized"
            raise DescriptionTranslationError(msg) from error
        log.warning(
            "[DescriptionTranslator] Failed to initialize Google Cloud Translation; continuing",
            exc_info=True,
        )
        return None


def _generate_google_translations(
    *,
    google_service: GoogleTranslationService,
    descriptions: list[DescriptionForTranslation],
    target_language_codes: list[str],
) -> list[DescriptionTranslation]:
    return generate_description_translations(
        service=google_service,
        descriptions=descriptions,
        target_language_codes=target_language_codes,
    )


def _generate_bedrock_translations_with_partial_retries(
    *,
    config: BedrockTranslationConfig,
    descriptions: list[DescriptionForTranslation],
    target_language_codes: list[str],
    attempts: int,
) -> list[DescriptionTranslation]:
    translations: list[DescriptionTranslation] = []
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        missing_requests = _missing_translation_requests(
            descriptions=descriptions,
            target_language_codes=target_language_codes,
            translations=translations,
        )
        if not missing_requests:
            return translations
        try:
            attempt_translations: list[DescriptionTranslation] = []
            for target_language_code, missing_descriptions in missing_requests:
                attempt_translations.extend(
                    generate_description_translations_with_bedrock(
                        config=config,
                        descriptions=missing_descriptions,
                        target_language_codes=[target_language_code],
                    )
                )
            translations = _merge_description_translations(
                existing_translations=translations,
                new_translations=attempt_translations,
            )
        except Exception as error:
            last_error = error
            if _is_timeout_error(error):
                log.warning(
                    "[DescriptionTranslator] Bedrock translation attempt %d/%d timed out",
                    attempt,
                    attempts,
                    exc_info=True,
                )
                raise
            log.warning(
                "[DescriptionTranslator] Bedrock translation attempt %d/%d failed",
                attempt,
                attempts,
                exc_info=True,
            )

    if translations:
        return translations
    msg = f"Bedrock translation failed after {attempts} attempt(s)"
    raise DescriptionTranslationError(msg) from last_error


def fill_missing_translations_with_google(
    *,
    google_service: GoogleTranslationService,
    descriptions: list[DescriptionForTranslation],
    target_language_codes: list[str],
    translations: list[DescriptionTranslation],
) -> list[DescriptionTranslation]:
    translation_keys = {
        (translation.description_id, translation.locale) for translation in translations
    }
    missing_translations: list[DescriptionTranslation] = []
    for target_language_code in target_language_codes:
        missing_descriptions = [
            description
            for description in descriptions
            if (description.description_id, target_language_code) not in translation_keys
        ]
        if not missing_descriptions:
            continue
        log.info(
            "[DescriptionTranslator] Bedrock translation returned partial output; "
            "filling missing descriptions with Google target_locale=%s description_ids=%s",
            target_language_code,
            [description.description_id for description in missing_descriptions],
        )
        google_translations = _retry_translation_provider(
            provider_name="Google",
            attempts=2,
            call=lambda descriptions_for_locale=missing_descriptions, locale=target_language_code: (
                _generate_google_translations(
                    google_service=google_service,
                    descriptions=descriptions_for_locale,
                    target_language_codes=[locale],
                )
            ),
        )
        missing_translations.extend(google_translations)
        translation_keys.update(
            (translation.description_id, translation.locale)
            for translation in google_translations
        )
    if not missing_translations:
        return translations
    return [*translations, *missing_translations]


def _missing_translation_requests(
    *,
    descriptions: list[DescriptionForTranslation],
    target_language_codes: list[str],
    translations: list[DescriptionTranslation],
) -> list[tuple[str, list[DescriptionForTranslation]]]:
    translation_keys = {
        (translation.description_id, translation.locale) for translation in translations
    }
    requests: list[tuple[str, list[DescriptionForTranslation]]] = []
    for target_language_code in target_language_codes:
        missing_descriptions = [
            description
            for description in descriptions
            if (description.description_id, target_language_code) not in translation_keys
        ]
        if missing_descriptions:
            requests.append((target_language_code, missing_descriptions))
    return requests


def _merge_description_translations(
    *,
    existing_translations: list[DescriptionTranslation],
    new_translations: list[DescriptionTranslation],
) -> list[DescriptionTranslation]:
    translation_by_key: dict[tuple[int, str], DescriptionTranslation] = {}
    for translation in [*existing_translations, *new_translations]:
        translation_by_key.setdefault(
            (translation.description_id, translation.locale),
            translation,
        )
    return list(translation_by_key.values())


def _retry_translation_provider(
    *,
    provider_name: str,
    attempts: int,
    call: Callable[[], list[DescriptionTranslation]],
) -> list[DescriptionTranslation]:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return call()
        except Exception as error:
            last_error = error
            if _is_timeout_error(error):
                log.warning(
                    "[DescriptionTranslator] %s translation attempt %d/%d timed out",
                    provider_name,
                    attempt,
                    attempts,
                    exc_info=True,
                )
                raise
            log.warning(
                "[DescriptionTranslator] %s translation attempt %d/%d failed",
                provider_name,
                attempt,
                attempts,
                exc_info=True,
            )
    msg = f"{provider_name} translation failed after {attempts} attempt(s)"
    raise DescriptionTranslationError(msg) from last_error


def _retry_description_provider(
    *,
    provider_name: str,
    attempts: int,
    call: Callable[[], ParsedLabelSummaryOutput],
) -> ParsedLabelSummaryOutput:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return call()
        except Exception as error:
            last_error = error
            log.warning(
                "[DescriptionGenerator] %s description attempt %d/%d failed",
                provider_name,
                attempt,
                attempts,
                exc_info=True,
            )
    msg = f"{provider_name} description generation failed after {attempts} attempt(s)"
    raise BedrockLabelSummaryError(msg) from last_error


def _is_timeout_error(error: BaseException) -> bool:
    seen: set[int] = set()
    stack: list[BaseException] = [error]
    while stack:
        current = stack.pop()
        current_id = id(current)
        if current_id in seen:
            continue
        seen.add(current_id)

        if isinstance(
            current,
            TimeoutError | ConnectTimeoutError | DeadlineExceeded | ReadTimeoutError,
        ):
            return True

        if isinstance(current, GoogleRetryError):
            cause = current.cause
            if isinstance(cause, BaseException):
                stack.append(cause)

        if current.__cause__ is not None:
            stack.append(current.__cause__)
        if current.__context__ is not None:
            stack.append(current.__context__)

    return False
