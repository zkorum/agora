from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Protocol, TypeGuard

from botocore.config import Config
from botocore.session import get_session
from google.api_core.client_options import ClientOptions
from google.cloud import translate_v3
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from pydantic import BaseModel, ConfigDict

from math_updater.generated_shared_types import SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES

if TYPE_CHECKING:
    from collections.abc import Sequence

    from google.auth.credentials import Credentials

SOURCE_LANGUAGE = "en"
DISPLAY_LANGUAGE_TO_GOOGLE_CODE = {
    "ar": "ar",
    "en": "en",
    "es": "es",
    "fa": "fa",
    "fr": "fr",
    "he": "he",
    "ja": "ja",
    "ky": "ky",
    "ru": "ru",
    "zh-Hans": "zh-CN",
    "zh-Hant": "zh-TW",
}


class DescriptionTranslationError(RuntimeError):
    pass


class ServiceAccountJson(BaseModel):
    model_config = ConfigDict(extra="ignore")

    project_id: str
    client_email: str
    private_key: str
    token_uri: str = "https://oauth2.googleapis.com/token"


class TranslationText(Protocol):
    @property
    def translated_text(self) -> str: ...


class TranslateTextResponse(Protocol):
    @property
    def translations(self) -> Sequence[TranslationText]: ...


class TranslationClient(Protocol):
    def translate_text(
        self,
        *,
        parent: str,
        contents: Sequence[str],
        mime_type: str,
        source_language_code: str | None,
        target_language_code: str,
        model: str,
        timeout: float,
    ) -> TranslateTextResponse: ...


class SecretsManagerClient(Protocol):
    def get_secret_value(self, **kwargs: object) -> dict[str, object]: ...


class GoogleCredentialsFactory(Protocol):
    def from_service_account_info(self, info: dict[str, object]) -> Credentials: ...


@dataclass(frozen=True)
class GoogleTranslationConfig:
    project_id: str
    location: str
    request_timeout_seconds: float


@dataclass(frozen=True)
class GoogleTranslationService:
    client: TranslationClient
    config: GoogleTranslationConfig


@dataclass(frozen=True)
class DescriptionForTranslation:
    description_id: int
    label: str
    summary: str


@dataclass(frozen=True)
class DescriptionTranslation:
    description_id: int
    locale: str
    label: str
    summary: str


def initialize_google_translation_service(
    *,
    google_cloud_service_account_aws_secret_key: str | None,
    aws_secret_region: str | None,
    aws_connect_timeout_seconds: float,
    aws_read_timeout_seconds: float,
    google_application_credentials_path: str | None,
    google_cloud_translation_location: str,
    google_cloud_translation_endpoint: str | None,
    google_cloud_translation_timeout_seconds: float,
) -> GoogleTranslationService | None:
    service_account = _load_service_account_json(
        google_cloud_service_account_aws_secret_key=google_cloud_service_account_aws_secret_key,
        aws_secret_region=aws_secret_region,
        aws_connect_timeout_seconds=aws_connect_timeout_seconds,
        aws_read_timeout_seconds=aws_read_timeout_seconds,
        google_application_credentials_path=google_application_credentials_path,
    )
    if service_account is None:
        return None

    credentials = _create_google_credentials(service_account)
    return GoogleTranslationService(
        client=_create_translation_client(
            credentials=credentials,
            google_cloud_translation_endpoint=google_cloud_translation_endpoint,
        ),
        config=GoogleTranslationConfig(
            project_id=service_account.project_id,
            location=google_cloud_translation_location,
            request_timeout_seconds=google_cloud_translation_timeout_seconds,
        ),
    )


def generate_description_translations(
    *,
    service: GoogleTranslationService,
    descriptions: list[DescriptionForTranslation],
    target_language_codes: Sequence[str] = SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES,
) -> list[DescriptionTranslation]:
    translations: list[DescriptionTranslation] = []
    for target_language_code in target_language_codes:
        if _should_skip_translation(
            source_language_code=SOURCE_LANGUAGE,
            target_language_code=target_language_code,
        ):
            continue
        translated_labels = _batch_translate_texts(
            service=service,
            texts=[description.label for description in descriptions],
            source_language_code=SOURCE_LANGUAGE,
            target_language_code=target_language_code,
            content_kind="ai_label",
        )
        translated_summaries = _batch_translate_texts(
            service=service,
            texts=[description.summary for description in descriptions],
            source_language_code=SOURCE_LANGUAGE,
            target_language_code=target_language_code,
            content_kind="ai_summary",
        )
        translations.extend(
            DescriptionTranslation(
                description_id=description.description_id,
                locale=target_language_code,
                label=label,
                summary=summary,
            )
            for description, label, summary in zip(
                descriptions,
                translated_labels,
                translated_summaries,
                strict=True,
            )
        )
    return translations


def _load_service_account_json(
    *,
    google_cloud_service_account_aws_secret_key: str | None,
    aws_secret_region: str | None,
    aws_connect_timeout_seconds: float,
    aws_read_timeout_seconds: float,
    google_application_credentials_path: str | None,
) -> ServiceAccountJson | None:
    if google_cloud_service_account_aws_secret_key is not None:
        if aws_secret_region is None:
            msg = "AWS secret region is required for Google Cloud service account secret"
            raise DescriptionTranslationError(msg)
        secret_response = _create_secrets_manager_client(
            region=aws_secret_region,
            connect_timeout_seconds=aws_connect_timeout_seconds,
            read_timeout_seconds=aws_read_timeout_seconds,
        ).get_secret_value(SecretId=google_cloud_service_account_aws_secret_key)
        secret_string = secret_response.get("SecretString")
        if not isinstance(secret_string, str):
            msg = "Google Cloud service account secret did not contain SecretString"
            raise DescriptionTranslationError(msg)
        return parse_service_account_json(secret_string)

    if google_application_credentials_path is not None:
        return parse_service_account_json(
            Path(google_application_credentials_path).read_text(encoding="utf-8")
        )

    return None


def parse_service_account_json(service_account_json: str) -> ServiceAccountJson:
    return ServiceAccountJson.model_validate_json(service_account_json)


def _create_google_credentials(service_account: ServiceAccountJson) -> Credentials:
    factory: object = ServiceAccountCredentials
    if not _is_google_credentials_factory(factory):
        msg = "Google service account credentials factory is unavailable"
        raise DescriptionTranslationError(msg)
    return factory.from_service_account_info(service_account.model_dump())


def _create_translation_client(
    *,
    credentials: Credentials,
    google_cloud_translation_endpoint: str | None,
) -> TranslationClient:
    client_options = (
        ClientOptions(api_endpoint=google_cloud_translation_endpoint)
        if google_cloud_translation_endpoint is not None
        else None
    )
    client: object = translate_v3.TranslationServiceClient(
        credentials=credentials,
        client_options=client_options,
    )
    if not _is_translation_client(client):
        msg = "Google Cloud Translation client does not expose translate_text()"
        raise DescriptionTranslationError(msg)
    return client


def _create_secrets_manager_client(
    *,
    region: str,
    connect_timeout_seconds: float,
    read_timeout_seconds: float,
) -> SecretsManagerClient:
    client: object = get_session().create_client(
        "secretsmanager",
        region_name=region,
        config=Config(
            connect_timeout=connect_timeout_seconds,
            read_timeout=read_timeout_seconds,
        ),
    )
    if not _is_secrets_manager_client(client):
        msg = "AWS Secrets Manager client does not expose get_secret_value()"
        raise DescriptionTranslationError(msg)
    return client


def _batch_translate_texts(
    *,
    service: GoogleTranslationService,
    texts: list[str],
    source_language_code: str | None,
    target_language_code: str,
    content_kind: str,
) -> list[str]:
    return [
        _translate_text(
            service=service,
            text=text,
            source_language_code=source_language_code,
            target_language_code=target_language_code,
            content_kind=content_kind,
        )
        for text in texts
    ]


def _translate_text(
    *,
    service: GoogleTranslationService,
    text: str,
    source_language_code: str | None,
    target_language_code: str,
    content_kind: str,
) -> str:
    if text == "":
        return ""
    if _should_skip_translation(
        source_language_code=source_language_code,
        target_language_code=target_language_code,
    ):
        return text

    response = service.client.translate_text(
        parent=f"projects/{service.config.project_id}/locations/{service.config.location}",
        contents=[text],
        mime_type="text/plain",
        source_language_code=_normalize_source_language_code_for_google(source_language_code)
        if source_language_code is not None
        else None,
        target_language_code=_normalize_target_language_code_for_google(target_language_code),
        model=_build_model_path(
            project_id=service.config.project_id,
            location=service.config.location,
            model_name=_get_translation_model_name(content_kind=content_kind),
        ),
        timeout=service.config.request_timeout_seconds,
    )
    translated_text = response.translations[0].translated_text if response.translations else None
    if translated_text is None:
        msg = f"Translation failed: no translated text returned for {text!r}"
        raise DescriptionTranslationError(msg)
    return translated_text


def _get_translation_model_name(*, content_kind: str) -> str:
    if content_kind == "ai_label":
        return "general/nmt"
    if content_kind == "ai_summary":
        return "general/translation-llm"
    msg = f"unknown translation content kind {content_kind}"
    raise DescriptionTranslationError(msg)


def _build_model_path(*, project_id: str, location: str, model_name: str) -> str:
    return f"projects/{project_id}/locations/{location}/models/{model_name}"


def _normalize_source_language_code_for_google(language_code: str) -> str:
    if language_code in {"zh-Hans", "zh-CN"}:
        return "zh-CN"
    if language_code in {"zh-Hant", "zh-TW"}:
        return "zh-TW"
    return language_code


def _normalize_target_language_code_for_google(language_code: str) -> str:
    return DISPLAY_LANGUAGE_TO_GOOGLE_CODE.get(
        language_code,
        _normalize_source_language_code_for_google(language_code),
    )


def _language_comparison_key(language_code: str) -> str:
    normalized = _normalize_source_language_code_for_google(language_code)
    if normalized in {"zh-CN", "zh-TW"}:
        return normalized
    return normalized.split("-")[0]


def _should_skip_translation(
    *,
    source_language_code: str | None,
    target_language_code: str,
) -> bool:
    if source_language_code is None:
        return False
    return _language_comparison_key(source_language_code) == _language_comparison_key(
        target_language_code
    )


def _is_translation_client(value: object) -> TypeGuard[TranslationClient]:
    return callable(getattr(value, "translate_text", None))


def _is_secrets_manager_client(value: object) -> TypeGuard[SecretsManagerClient]:
    return callable(getattr(value, "get_secret_value", None))


def _is_google_credentials_factory(value: object) -> TypeGuard[GoogleCredentialsFactory]:
    return callable(getattr(value, "from_service_account_info", None))
