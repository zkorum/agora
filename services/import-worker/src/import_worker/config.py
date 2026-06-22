from pydantic import AliasChoices, AnyUrl, Field, TypeAdapter, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_VALKEY_URL: AnyUrl = TypeAdapter(AnyUrl).validate_python(
    "valkey://localhost:6379",
)
ALLOWED_VALKEY_SCHEMES = {"valkey", "valkeys", "redis", "rediss"}


class Settings(BaseSettings):
    connection_string: str = Field(default="", min_length=1)
    connection_string_read: str | None = Field(default=None, min_length=1)
    valkey_url: AnyUrl = DEFAULT_VALKEY_URL

    flush_interval_ms: int = Field(default=1000, ge=1)
    max_batch_size: int = Field(default=4, ge=1)
    max_concurrency: int = Field(default=2, ge=1)
    stale_threshold_ms: int = Field(default=300000, ge=1)
    stale_cleanup_every_n_flushes: int = Field(default=60, ge=1)

    google_cloud_project_id: str | None = Field(
        default=None,
        min_length=1,
        validation_alias=AliasChoices(
            "google_cloud_project_id",
            "IMPORT_WORKER_GOOGLE_CLOUD_PROJECT_ID",
            "GOOGLE_CLOUD_PROJECT_ID",
        ),
    )
    google_cloud_translation_endpoint: str = Field(
        default="translate.googleapis.com",
        min_length=1,
        validation_alias=AliasChoices(
            "google_cloud_translation_endpoint",
            "IMPORT_WORKER_GOOGLE_CLOUD_TRANSLATION_ENDPOINT",
            "GOOGLE_CLOUD_TRANSLATION_ENDPOINT",
        ),
    )
    google_cloud_translation_location: str = Field(
        default="us-central1",
        min_length=1,
        validation_alias=AliasChoices(
            "google_cloud_translation_location",
            "IMPORT_WORKER_GOOGLE_CLOUD_TRANSLATION_LOCATION",
            "GOOGLE_CLOUD_TRANSLATION_LOCATION",
        ),
    )
    google_cloud_translation_timeout_seconds: float = Field(default=30.0, gt=0)
    google_application_credentials_path: str | None = Field(
        default=None,
        min_length=1,
        validation_alias=AliasChoices(
            "google_application_credentials_path",
            "IMPORT_WORKER_GOOGLE_APPLICATION_CREDENTIALS",
            "GOOGLE_APPLICATION_CREDENTIALS",
        ),
    )

    model_config = SettingsConfigDict(
        env_prefix="IMPORT_WORKER_",
        env_file=".env",
        extra="forbid",
        str_strip_whitespace=True,
        validate_default=True,
    )

    @field_validator("valkey_url")
    @classmethod
    def validate_valkey_url(cls, value: AnyUrl) -> AnyUrl:
        if value.scheme not in ALLOWED_VALKEY_SCHEMES:
            msg = "IMPORT_WORKER_VALKEY_URL must use valkey://, valkeys://, redis://, or rediss://"
            raise ValueError(msg)
        return value

    @property
    def read_dsn(self) -> str:
        return self.connection_string_read or self.connection_string
