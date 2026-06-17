from __future__ import annotations

from typing import Self

from pydantic import AliasChoices, AnyUrl, Field, TypeAdapter, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from content_translation_worker.translation_model import (
    ContentTranslationProvider,
    GoogleTranslationModel,
    SimulatedTranslationMode,
)

DEFAULT_VALKEY_URL: AnyUrl = TypeAdapter(AnyUrl).validate_python("valkey://localhost:6379")
ALLOWED_VALKEY_SCHEMES = {"valkey", "valkeys", "redis", "rediss"}


class Settings(BaseSettings):
    agora_dev_mode: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_AGORA_DEV_MODE",
            "AGORA_DEV_MODE",
        ),
    )
    connection_string: str = Field(
        default="",
        min_length=1,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_CONNECTION_STRING",
            "CONNECTION_STRING",
        ),
    )
    valkey_url: AnyUrl = Field(
        default=DEFAULT_VALKEY_URL,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_VALKEY_URL",
            "QUEUE_VALKEY_URL",
        ),
    )

    poll_interval_seconds: float = Field(default=1.0, gt=0)
    batch_size: int = Field(default=10, ge=1, le=100)
    lease_ttl_seconds: int = Field(default=120, ge=10)
    reconcile_interval_seconds: int = Field(default=60, ge=1)
    valkey_retry_interval_seconds: float = Field(default=5.0, gt=0)
    db_retry_interval_seconds: float = Field(default=5.0, gt=0)

    translation_provider: ContentTranslationProvider = Field(
        default=ContentTranslationProvider.GOOGLE,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_TRANSLATION_PROVIDER",
        ),
    )

    google_cloud_project_id: str | None = Field(
        default=None,
        min_length=1,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_PROJECT_ID",
            "GOOGLE_CLOUD_PROJECT_ID",
        ),
    )
    google_cloud_translation_endpoint: str = Field(
        default="translation.googleapis.com",
        min_length=1,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_TRANSLATION_ENDPOINT",
            "GOOGLE_CLOUD_TRANSLATION_ENDPOINT",
        ),
    )
    google_cloud_translation_location: str = Field(
        default="us-central1",
        min_length=1,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_TRANSLATION_LOCATION",
            "GOOGLE_CLOUD_TRANSLATION_LOCATION",
        ),
    )
    google_cloud_translation_model: GoogleTranslationModel = Field(
        default=GoogleTranslationModel.TRANSLATION_LLM,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_TRANSLATION_MODEL",
            "GOOGLE_CLOUD_TRANSLATION_MODEL",
        ),
    )
    google_cloud_translation_timeout_seconds: float = Field(default=30.0, gt=0)
    google_application_credentials_path: str | None = Field(
        default=None,
        min_length=1,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_GOOGLE_APPLICATION_CREDENTIALS",
            "GOOGLE_APPLICATION_CREDENTIALS",
        ),
    )

    simulation_mode: SimulatedTranslationMode = Field(
        default=SimulatedTranslationMode.SUCCESS,
        validation_alias=AliasChoices(
            "CONTENT_TRANSLATION_WORKER_SIMULATION_MODE",
        ),
    )
    simulation_retryable_failure_attempts: int = Field(default=1, ge=1)

    model_config = SettingsConfigDict(
        env_prefix="CONTENT_TRANSLATION_WORKER_",
        env_file=".env",
        extra="ignore",
        str_strip_whitespace=True,
        validate_default=True,
    )

    @field_validator("valkey_url")
    @classmethod
    def validate_valkey_url(cls, value: AnyUrl) -> AnyUrl:
        if value.scheme not in ALLOWED_VALKEY_SCHEMES:
            msg = (
                "CONTENT_TRANSLATION_WORKER_VALKEY_URL must use valkey://, valkeys://, "
                "redis://, or rediss://"
            )
            raise ValueError(msg)
        return value

    @model_validator(mode="after")
    def validate_provider_config(self) -> Self:
        if (
            self.translation_provider is ContentTranslationProvider.GOOGLE
            and self.google_application_credentials_path is None
        ):
            msg = (
                "CONTENT_TRANSLATION_WORKER_GOOGLE_APPLICATION_CREDENTIALS or "
                "GOOGLE_APPLICATION_CREDENTIALS is required when "
                "CONTENT_TRANSLATION_WORKER_TRANSLATION_PROVIDER=google"
            )
            raise ValueError(msg)
        return self
