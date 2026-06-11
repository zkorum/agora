from __future__ import annotations

import json
import logging
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Protocol, TypeGuard

from botocore.config import Config
from botocore.session import get_session
from google.api_core.client_options import ClientOptions
from google.cloud import translate_v3
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from pydantic import BaseModel, ConfigDict

from agora_analysis_worker_shared.bedrock_label_summary import (
    BedrockConverseClient,
    create_bedrock_converse_client,
    extract_text_content_from_response,
    iter_llm_output_json_candidates,
)
from agora_analysis_worker_shared.generated_shared_types import (
    SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES,
)

if TYPE_CHECKING:
    from google.auth.credentials import Credentials
    from mypy_boto3_bedrock_runtime.type_defs import ConverseRequestTypeDef

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
log = logging.getLogger(__name__)
GOOGLE_TRANSLATE_MAX_TEXT_CODEPOINTS = 1024
GOOGLE_TRANSLATE_MAX_REQUEST_CODEPOINTS = 25_000


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
        retry: object | None,
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
class BedrockTranslationConfig:
    region: str
    model_id: str
    temperature: float
    top_p: float
    max_tokens: int
    prompt: str
    connect_timeout_seconds: float
    read_timeout_seconds: float


@dataclass(frozen=True)
class TranslationRepresentativeOpinion:
    opinion_id: int
    stance: str
    content: str


@dataclass(frozen=True)
class DescriptionForTranslation:
    description_id: int
    label: str
    summary: str
    conversation_title: str | None = None
    representative_opinions: list[TranslationRepresentativeOpinion] = field(default_factory=list)


@dataclass(frozen=True)
class DescriptionTranslation:
    description_id: int
    locale: str
    label: str
    summary: str


@dataclass(frozen=True)
class _TranslationRequestItem:
    index: int
    text: str


@dataclass(frozen=True)
class _TranslationRequestChunk:
    items: list[_TranslationRequestItem]

    @property
    def texts(self) -> list[str]:
        return [item.text for item in self.items]

    @property
    def indices(self) -> list[int]:
        return [item.index for item in self.items]


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
    description_ids = [description.description_id for description in descriptions]
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
            element_ids=description_ids,
        )
        translated_summaries = _batch_translate_texts(
            service=service,
            texts=[description.summary for description in descriptions],
            source_language_code=SOURCE_LANGUAGE,
            target_language_code=target_language_code,
            content_kind="ai_summary",
            element_ids=description_ids,
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


def generate_description_translations_with_bedrock(
    *,
    config: BedrockTranslationConfig,
    descriptions: list[DescriptionForTranslation],
    target_language_codes: Sequence[str] = SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES,
    client: BedrockConverseClient | None = None,
) -> list[DescriptionTranslation]:
    bedrock_client = client or create_bedrock_converse_client(
        region=config.region,
        connect_timeout_seconds=config.connect_timeout_seconds,
        read_timeout_seconds=config.read_timeout_seconds,
    )
    translations: list[DescriptionTranslation] = []
    for target_language_code in target_language_codes:
        if _should_skip_translation(
            source_language_code=SOURCE_LANGUAGE,
            target_language_code=target_language_code,
        ):
            continue
        command_payload = build_bedrock_translation_converse_payload(
            descriptions=descriptions,
            target_language_code=target_language_code,
            config=config,
        )
        description_ids = [description.description_id for description in descriptions]
        log.info(
            "[DescriptionTranslator] Bedrock translation request "
            "model_id=%s target_locale=%s description_ids=%s system_prompt_json=%s "
            "user_prompt=%s",
            config.model_id,
            target_language_code,
            description_ids,
            json.dumps(config.prompt, ensure_ascii=False),
            _bedrock_translation_payload_json(
                descriptions=descriptions,
                target_language_code=target_language_code,
            ),
        )
        response = bedrock_client.converse(**command_payload)
        model_response_text = extract_text_content_from_response(response)
        log.info(
            "[DescriptionTranslator] Bedrock translation response "
            "model_id=%s target_locale=%s description_ids=%s response_text_json=%s",
            config.model_id,
            target_language_code,
            description_ids,
            json.dumps(model_response_text, ensure_ascii=False),
        )
        if model_response_text is None:
            msg = "unable to extract text content from Bedrock translation response"
            raise DescriptionTranslationError(msg)
        parsed_translations = parse_bedrock_translation_text(
            model_response_text,
            expected_description_ids={description.description_id for description in descriptions},
            expected_locale=target_language_code,
            allow_partial=True,
        )
        log.info(
            "[DescriptionTranslator] Bedrock translation parsed "
            "model_id=%s target_locale=%s description_ids=%s output_count=%d translations=%s",
            config.model_id,
            target_language_code,
            description_ids,
            len(parsed_translations),
            _description_translations_json(parsed_translations),
        )
        translations.extend(parsed_translations)
    return translations


def build_bedrock_translation_converse_payload(
    *,
    descriptions: list[DescriptionForTranslation],
    target_language_code: str,
    config: BedrockTranslationConfig,
) -> ConverseRequestTypeDef:
    user_prompt = _bedrock_translation_payload_json(
        descriptions=descriptions,
        target_language_code=target_language_code,
    )
    return {
        "modelId": config.model_id,
        "system": [{"text": json.dumps(config.prompt, ensure_ascii=False)}],
        "messages": [
            {
                "role": "user",
                "content": [{"text": user_prompt}],
            }
        ],
        "inferenceConfig": {
            "maxTokens": config.max_tokens,
            "temperature": config.temperature,
            "topP": config.top_p,
        },
    }


def parse_bedrock_translation_response(
    response: object,
    *,
    expected_description_ids: set[int] | None = None,
    expected_locale: str | None = None,
    allow_partial: bool = False,
) -> list[DescriptionTranslation]:
    model_response_text = extract_text_content_from_response(response)
    if model_response_text is None:
        msg = "unable to extract text content from Bedrock translation response"
        raise DescriptionTranslationError(msg)
    return parse_bedrock_translation_text(
        model_response_text,
        expected_description_ids=expected_description_ids,
        expected_locale=expected_locale,
        allow_partial=allow_partial,
    )


def parse_bedrock_translation_text(
    model_response_text: str,
    *,
    expected_description_ids: set[int] | None = None,
    expected_locale: str | None = None,
    allow_partial: bool = False,
) -> list[DescriptionTranslation]:
    last_error: DescriptionTranslationError | None = None
    for model_response in iter_llm_output_json_candidates(model_response_text):
        try:
            return parse_description_translation_output(
                model_response,
                expected_description_ids=expected_description_ids,
                expected_locale=expected_locale,
                allow_partial=allow_partial,
            )
        except DescriptionTranslationError as error:
            last_error = error
    msg = "unable to parse Bedrock translation output from any JSON object"
    raise DescriptionTranslationError(msg) from last_error


def parse_description_translation_output(
    model_response: dict[str, object],
    *,
    expected_description_ids: set[int] | None = None,
    expected_locale: str | None = None,
    allow_partial: bool = False,
) -> list[DescriptionTranslation]:
    raw_translations = model_response.get("translations")
    if not _is_object_sequence(raw_translations):
        msg = "unable to parse Bedrock translation output"
        raise DescriptionTranslationError(msg)

    translations: list[DescriptionTranslation] = []
    seen_description_ids: set[int] = set()
    for raw_translation in raw_translations:
        try:
            translation = _parse_description_translation_item(
                raw_translation,
                expected_description_ids=expected_description_ids,
                expected_locale=expected_locale,
                seen_description_ids=seen_description_ids,
            )
        except DescriptionTranslationError:
            if allow_partial:
                continue
            raise
        description_id = translation.description_id
        seen_description_ids.add(description_id)
        translations.append(translation)

    if not translations:
        msg = "Bedrock translation output did not include any valid translations"
        raise DescriptionTranslationError(msg)

    if (
        not allow_partial
        and expected_description_ids is not None
        and seen_description_ids != expected_description_ids
    ):
        msg = "Bedrock translation output did not include exactly the expected descriptions"
        raise DescriptionTranslationError(msg)
    return translations


def _parse_description_translation_item(
    raw_translation: object,
    *,
    expected_description_ids: set[int] | None,
    expected_locale: str | None,
    seen_description_ids: set[int],
) -> DescriptionTranslation:
    if not _is_string_key_mapping(raw_translation):
        msg = "unable to parse Bedrock translation item"
        raise DescriptionTranslationError(msg)
    description_id = raw_translation.get("descriptionId")
    locale = raw_translation.get("locale")
    reasoning = raw_translation.get("reasoning")
    label = raw_translation.get("label")
    summary = raw_translation.get("summary")
    if (
        not isinstance(description_id, int)
        or not isinstance(locale, str)
        or not isinstance(reasoning, str)
        or not isinstance(label, str)
        or not isinstance(summary, str)
    ):
        msg = "Bedrock translation item has invalid fields"
        raise DescriptionTranslationError(msg)
    if expected_description_ids is not None and description_id not in expected_description_ids:
        msg = f"unexpected Bedrock translation output for description {description_id}"
        raise DescriptionTranslationError(msg)
    if len(reasoning) > 2000:
        msg = "Bedrock translation reasoning exceeds parser limits"
        raise DescriptionTranslationError(msg)
    if expected_locale is not None and locale != expected_locale:
        msg = f"Bedrock translation locale mismatch: expected {expected_locale}, got {locale}"
        raise DescriptionTranslationError(msg)
    if len(label) > 100 or len(summary) > 1000:
        msg = "Bedrock translation output exceeds storage limits"
        raise DescriptionTranslationError(msg)
    if description_id in seen_description_ids:
        msg = f"Bedrock translation output duplicated description {description_id}"
        raise DescriptionTranslationError(msg)
    return DescriptionTranslation(
        description_id=description_id,
        locale=locale,
        label=label,
        summary=summary,
    )


def _bedrock_translation_payload(
    *,
    descriptions: list[DescriptionForTranslation],
    target_language_code: str,
) -> dict[str, object]:
    return {
        "sourceLocale": SOURCE_LANGUAGE,
        "targetLocale": target_language_code,
        "descriptions": [
            {
                "descriptionId": description.description_id,
                "label": description.label,
                "summary": description.summary,
                "conversationTitle": description.conversation_title,
                "representativeOpinions": [
                    {
                        "opinionId": opinion.opinion_id,
                        "stance": opinion.stance,
                        "content": opinion.content,
                    }
                    for opinion in description.representative_opinions
                ],
            }
            for description in descriptions
        ],
    }


def _bedrock_translation_payload_json(
    *,
    descriptions: list[DescriptionForTranslation],
    target_language_code: str,
) -> str:
    return json.dumps(
        _bedrock_translation_payload(
            descriptions=descriptions,
            target_language_code=target_language_code,
        ),
        ensure_ascii=False,
        separators=(",", ":"),
    )


def _description_translations_json(translations: list[DescriptionTranslation]) -> str:
    return json.dumps(
        [
            {
                "descriptionId": translation.description_id,
                "locale": translation.locale,
                "label": translation.label,
                "summary": translation.summary,
            }
            for translation in translations
        ],
        ensure_ascii=False,
        separators=(",", ":"),
    )


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
            retries={"total_max_attempts": 1},
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
    element_ids: list[int],
) -> list[str]:
    model_name = _get_translation_model_name(content_kind=content_kind)
    log.debug(
        "[DescriptionTranslator] Google translation request "
        "element_ids=%s source_locale=%s target_locale=%s content_kind=%s model=%s",
        element_ids,
        source_language_code,
        target_language_code,
        content_kind,
        model_name,
    )
    if _should_skip_translation(
        source_language_code=source_language_code,
        target_language_code=target_language_code,
    ):
        return texts

    translated_texts = list(texts)
    request_items = [
        _TranslationRequestItem(index=index, text=text)
        for index, text in enumerate(texts)
        if text != ""
    ]
    for chunk in _translation_request_chunks(request_items):
        chunk_translations = _translate_text_chunk(
            service=service,
            texts=chunk.texts,
            source_language_code=source_language_code,
            target_language_code=target_language_code,
            content_kind=content_kind,
            model_name=model_name,
        )
        for item, translated_text in zip(chunk.items, chunk_translations, strict=True):
            translated_texts[item.index] = translated_text
    return translated_texts


def _translate_text_chunk(
    *,
    service: GoogleTranslationService,
    texts: list[str],
    source_language_code: str | None,
    target_language_code: str,
    content_kind: str,
    model_name: str,
) -> list[str]:
    if not texts:
        return []

    response = service.client.translate_text(
        parent=f"projects/{service.config.project_id}/locations/{service.config.location}",
        contents=texts,
        mime_type="text/plain",
        source_language_code=_normalize_source_language_code_for_google(source_language_code)
        if source_language_code is not None
        else None,
        target_language_code=_normalize_target_language_code_for_google(target_language_code),
        model=_build_model_path(
            project_id=service.config.project_id,
            location=service.config.location,
            model_name=model_name or _get_translation_model_name(content_kind=content_kind),
        ),
        retry=None,
        timeout=service.config.request_timeout_seconds,
    )
    translated_texts = [translation.translated_text for translation in response.translations]
    if len(translated_texts) != len(texts):
        msg = (
            "Translation failed: expected "
            f"{len(texts)} translated text(s), got {len(translated_texts)}"
        )
        raise DescriptionTranslationError(msg)
    return translated_texts


def _translation_request_chunks(
    items: list[_TranslationRequestItem],
) -> list[_TranslationRequestChunk]:
    chunks: list[_TranslationRequestChunk] = []
    current_items: list[_TranslationRequestItem] = []
    current_codepoints = 0
    for item in items:
        item_codepoints = len(item.text)
        if item_codepoints > GOOGLE_TRANSLATE_MAX_TEXT_CODEPOINTS:
            msg = (
                "Google translation text exceeds max codepoints "
                f"index={item.index} codepoints={item_codepoints} "
                f"max={GOOGLE_TRANSLATE_MAX_TEXT_CODEPOINTS}"
            )
            raise DescriptionTranslationError(msg)
        would_exceed_request = (
            current_items
            and current_codepoints + item_codepoints
            > GOOGLE_TRANSLATE_MAX_REQUEST_CODEPOINTS
        )
        if would_exceed_request:
            chunks.append(_TranslationRequestChunk(items=current_items))
            current_items = []
            current_codepoints = 0
        current_items.append(item)
        current_codepoints += item_codepoints
    if current_items:
        chunks.append(_TranslationRequestChunk(items=current_items))
    return chunks


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


def _is_string_key_mapping(value: object) -> TypeGuard[dict[str, object]]:
    return isinstance(value, dict)


def _is_object_sequence(value: object) -> TypeGuard[Sequence[object]]:
    return isinstance(value, Sequence) and not isinstance(value, str | bytes | bytearray)
