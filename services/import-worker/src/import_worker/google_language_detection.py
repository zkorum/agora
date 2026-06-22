from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Protocol, TypeGuard

from google.api_core.client_options import ClientOptions
from google.cloud import translate_v3
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from pydantic import BaseModel, ConfigDict

from import_worker.language_detection import SourceLanguageMetadata, normalize_source_language_code

if TYPE_CHECKING:
    from collections.abc import Sequence

    from google.auth.credentials import Credentials

LOGGER = logging.getLogger(__name__)
LANGUAGE_CODE_PATTERN = re.compile(r"^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$")
DEPRECATED_LANGUAGE_CODES = {
    "iw": "he",
    "in": "id",
    "ji": "yi",
}


class GoogleLanguageDetectionError(RuntimeError):
    pass


class ServiceAccountJson(BaseModel):
    model_config = ConfigDict(extra="ignore")

    project_id: str
    client_email: str
    private_key: str
    token_uri: str = "https://oauth2.googleapis.com/token"


class DetectedLanguage(Protocol):
    @property
    def language_code(self) -> str: ...

    @property
    def confidence(self) -> float: ...


class DetectLanguageResponse(Protocol):
    @property
    def languages(self) -> Sequence[DetectedLanguage]: ...


class LanguageDetectionClient(Protocol):
    def detect_language(
        self,
        *,
        parent: str,
        content: str,
        mime_type: str,
        retry: object | None,
        timeout: float,
    ) -> DetectLanguageResponse: ...


class GoogleCredentialsFactory(Protocol):
    def from_service_account_info(self, info: dict[str, object]) -> Credentials: ...


@dataclass(frozen=True)
class GoogleLanguageDetectionConfig:
    project_id: str
    location: str
    endpoint: str
    request_timeout_seconds: float


@dataclass(frozen=True)
class GoogleLanguageDetectionService:
    client: LanguageDetectionClient
    config: GoogleLanguageDetectionConfig

    def __call__(self, text: str) -> SourceLanguageMetadata:
        return detect_language_with_google(service=self, text=text)


def initialize_google_language_detection_service(
    *,
    google_application_credentials_path: str,
    google_cloud_project_id: str | None,
    google_cloud_translation_location: str,
    google_cloud_translation_endpoint: str,
    google_cloud_translation_timeout_seconds: float,
) -> GoogleLanguageDetectionService:
    service_account = _load_service_account_json(
        google_application_credentials_path=google_application_credentials_path,
    )
    credentials_factory: object = ServiceAccountCredentials
    if not _is_google_credentials_factory(credentials_factory):
        msg = "Google service account credentials factory is unavailable"
        raise GoogleLanguageDetectionError(msg)
    credentials = credentials_factory.from_service_account_info(service_account.model_dump())
    client: object = translate_v3.TranslationServiceClient(
        credentials=credentials,
        client_options=ClientOptions(api_endpoint=google_cloud_translation_endpoint),
    )
    if not _is_language_detection_client(client):
        msg = "Google Cloud Translation client does not expose detect_language()"
        raise GoogleLanguageDetectionError(msg)
    project_id = google_cloud_project_id or service_account.project_id
    LOGGER.info(
        "[Language Detection] Google Cloud Translation initialized "
        "project=%s location=%s endpoint=%s",
        project_id,
        google_cloud_translation_location,
        google_cloud_translation_endpoint,
    )
    return GoogleLanguageDetectionService(
        client=client,
        config=GoogleLanguageDetectionConfig(
            project_id=project_id,
            location=google_cloud_translation_location,
            endpoint=google_cloud_translation_endpoint,
            request_timeout_seconds=google_cloud_translation_timeout_seconds,
        ),
    )


def detect_language_with_google(
    *,
    service: GoogleLanguageDetectionService,
    text: str,
) -> SourceLanguageMetadata:
    if text.strip() == "":
        return SourceLanguageMetadata(language_code=None, confidence=None)

    response = service.client.detect_language(
        parent=f"projects/{service.config.project_id}/locations/{service.config.location}",
        content=text,
        mime_type="text/plain",
        retry=None,
        timeout=service.config.request_timeout_seconds,
    )
    detected_language = response.languages[0] if len(response.languages) > 0 else None
    if detected_language is None:
        return SourceLanguageMetadata(language_code=None, confidence=None)

    raw_language_code = detected_language.language_code
    language_code = normalize_source_language_code(
        _canonicalize_language_code(raw_language_code) or raw_language_code,
        text=text,
    )
    return SourceLanguageMetadata(
        language_code=language_code,
        raw_language_code=raw_language_code,
        provider="google_translate",
        confidence=detected_language.confidence,
    )


def _load_service_account_json(*, google_application_credentials_path: str) -> ServiceAccountJson:
    credentials_path = Path(google_application_credentials_path)
    return ServiceAccountJson.model_validate_json(credentials_path.read_text(encoding="utf-8"))


def _canonicalize_language_code(language_code: str) -> str | None:
    trimmed_language_code = language_code.strip().replace("_", "-")
    if (
        trimmed_language_code == ""
        or LANGUAGE_CODE_PATTERN.fullmatch(trimmed_language_code) is None
    ):
        return None

    parts = trimmed_language_code.split("-")
    primary_language = DEPRECATED_LANGUAGE_CODES.get(parts[0].lower(), parts[0].lower())
    canonical_parts = [primary_language]
    for part in parts[1:]:
        if len(part) == 2 and part.isalpha():
            canonical_parts.append(part.upper())
        elif len(part) == 4 and part.isalpha():
            canonical_parts.append(part.title())
        else:
            canonical_parts.append(part.lower())
    return "-".join(canonical_parts)


def _is_google_credentials_factory(value: object) -> TypeGuard[GoogleCredentialsFactory]:
    return callable(getattr(value, "from_service_account_info", None))


def _is_language_detection_client(value: object) -> TypeGuard[LanguageDetectionClient]:
    return callable(getattr(value, "detect_language", None))
