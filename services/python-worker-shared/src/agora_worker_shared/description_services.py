from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from agora_worker_shared.bedrock_label_summary import (
    BedrockLabelSummaryConfig,
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
        return generate_label_summaries_with_bedrock(
            conversation=conversation,
            config=config,
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
            read_timeout_seconds=settings.aws_ai_label_summary_read_timeout_seconds,
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
                return _retry_translation_provider(
                    provider_name="Bedrock",
                    attempts=2,
                    call=lambda: generate_description_translations_with_bedrock(
                        config=bedrock_config,
                        descriptions=descriptions,
                        target_language_codes=target_language_codes,
                    ),
                )
            except Exception:
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
            return _retry_translation_provider(
                provider_name="Bedrock",
                attempts=2,
                call=lambda: generate_description_translations_with_bedrock(
                    config=bedrock_config,
                    descriptions=descriptions,
                    target_language_codes=target_language_codes,
                ),
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
            log.warning(
                "[DescriptionTranslator] %s translation attempt %d/%d failed",
                provider_name,
                attempt,
                attempts,
                exc_info=True,
            )
    msg = f"{provider_name} translation failed after {attempts} attempt(s)"
    raise DescriptionTranslationError(msg) from last_error
