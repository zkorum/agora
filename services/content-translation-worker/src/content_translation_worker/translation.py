from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Literal, Protocol, TypeGuard

from google.api_core.client_options import ClientOptions
from google.cloud import translate_v3
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from pydantic import BaseModel, ConfigDict

from content_translation_worker.translation_model import (
    GoogleTranslationModel,
    build_google_translation_model_path,
)

if TYPE_CHECKING:
    from collections.abc import Sequence

    from google.auth.credentials import Credentials

log = logging.getLogger(__name__)

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
GOOGLE_TRANSLATE_MAX_TEXT_CODEPOINTS = 30_000
GOOGLE_TRANSLATE_MAX_REQUEST_CODEPOINTS = 25_000


class ContentTranslationProviderError(RuntimeError):
    pass


@dataclass(frozen=True)
class ContentTranslationResult:
    translated_text: str
    source_raw_language_code: str | None
    source_language_provider: Literal["google_translate"] | None


class ServiceAccountJson(BaseModel):
    model_config = ConfigDict(extra="ignore")

    project_id: str
    client_email: str
    private_key: str
    token_uri: str = "https://oauth2.googleapis.com/token"


class TranslationText(Protocol):
    @property
    def translated_text(self) -> str: ...

    @property
    def detected_language_code(self) -> str: ...


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


class GoogleCredentialsFactory(Protocol):
    def from_service_account_info(self, info: dict[str, object]) -> Credentials: ...


@dataclass(frozen=True)
class GoogleTranslationConfig:
    project_id: str
    location: str
    endpoint: str
    model: GoogleTranslationModel
    request_timeout_seconds: float


@dataclass(frozen=True)
class GoogleTranslationService:
    client: TranslationClient
    config: GoogleTranslationConfig

    def translate_texts(
        self,
        *,
        texts: list[str],
        source_language_code: str | None,
        target_language_code: str,
        mime_type: str,
    ) -> list[ContentTranslationResult]:
        return translate_texts(
            service=self,
            texts=texts,
            source_language_code=source_language_code,
            target_language_code=target_language_code,
            mime_type=mime_type,
        )


class ContentTranslationService(Protocol):
    def translate_texts(
        self,
        *,
        texts: list[str],
        source_language_code: str | None,
        target_language_code: str,
        mime_type: str,
    ) -> list[ContentTranslationResult]: ...


def initialize_google_translation_service(
    *,
    google_application_credentials_path: str,
    google_cloud_project_id: str | None,
    google_cloud_translation_location: str,
    google_cloud_translation_endpoint: str,
    google_cloud_translation_model: GoogleTranslationModel,
    google_cloud_translation_timeout_seconds: float,
) -> GoogleTranslationService:
    service_account = _load_service_account_json(
        google_application_credentials_path=google_application_credentials_path,
    )
    credentials_factory: object = ServiceAccountCredentials
    if not _is_google_credentials_factory(credentials_factory):
        msg = "Google service account credentials factory is unavailable"
        raise ContentTranslationProviderError(msg)
    credentials = credentials_factory.from_service_account_info(service_account.model_dump())
    client: object = translate_v3.TranslationServiceClient(
        credentials=credentials,
        client_options=ClientOptions(api_endpoint=google_cloud_translation_endpoint),
    )
    if not _is_translation_client(client):
        msg = "Google Cloud Translation client does not expose translate_text()"
        raise ContentTranslationProviderError(msg)
    project_id = google_cloud_project_id or service_account.project_id
    log.info(
        "[Translator] Google Cloud Translation initialized project=%s location=%s endpoint=%s",
        project_id,
        google_cloud_translation_location,
        google_cloud_translation_endpoint,
    )
    return GoogleTranslationService(
        client=client,
        config=GoogleTranslationConfig(
            project_id=project_id,
            location=google_cloud_translation_location,
            endpoint=google_cloud_translation_endpoint,
            model=google_cloud_translation_model,
            request_timeout_seconds=google_cloud_translation_timeout_seconds,
        ),
    )


def translate_texts(
    *,
    service: GoogleTranslationService,
    texts: list[str],
    source_language_code: str | None,
    target_language_code: str,
    mime_type: str,
) -> list[ContentTranslationResult]:
    if _should_skip_translation(
        source_language_code=source_language_code,
        target_language_code=target_language_code,
    ):
        return [
            ContentTranslationResult(
                translated_text=text,
                source_raw_language_code=source_language_code,
                source_language_provider=None,
            )
            for text in texts
        ]

    translated_results = [
        ContentTranslationResult(
            translated_text=text,
            source_raw_language_code=None,
            source_language_provider=None,
        )
        for text in texts
    ]
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
            mime_type=mime_type,
        )
        for item, result in zip(chunk.items, chunk_translations, strict=True):
            translated_results[item.index] = result
    return translated_results


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


def _load_service_account_json(
    *,
    google_application_credentials_path: str,
) -> ServiceAccountJson:
    return ServiceAccountJson.model_validate_json(
        Path(google_application_credentials_path).read_text(encoding="utf-8")
    )


def _translate_text_chunk(
    *,
    service: GoogleTranslationService,
    texts: list[str],
    source_language_code: str | None,
    target_language_code: str,
    mime_type: str,
) -> list[ContentTranslationResult]:
    response = service.client.translate_text(
        parent=f"projects/{service.config.project_id}/locations/{service.config.location}",
        contents=texts,
        mime_type=mime_type,
        source_language_code=None,
        target_language_code=_normalize_target_language_code_for_google(target_language_code),
        model=build_google_translation_model_path(
            project_id=service.config.project_id,
            location=service.config.location,
            model=service.config.model,
        ),
        retry=None,
        timeout=service.config.request_timeout_seconds,
    )
    translated_results = [
        ContentTranslationResult(
            translated_text=translation.translated_text,
            source_raw_language_code=translation.detected_language_code or None,
            source_language_provider="google_translate"
            if translation.detected_language_code
            else None,
        )
        for translation in response.translations
    ]
    if len(translated_results) != len(texts):
        msg = (
            f"Translation failed: expected {len(texts)} translated text(s), "
            f"got {len(translated_results)}"
        )
        raise ContentTranslationProviderError(msg)
    return translated_results


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
            raise ContentTranslationProviderError(msg)
        would_exceed_request = (
            current_items
            and current_codepoints + item_codepoints > GOOGLE_TRANSLATE_MAX_REQUEST_CODEPOINTS
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


def _is_google_credentials_factory(value: object) -> TypeGuard[GoogleCredentialsFactory]:
    return callable(getattr(value, "from_service_account_info", None))
