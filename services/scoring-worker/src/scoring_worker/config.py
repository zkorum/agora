from pydantic import AnyUrl, TypeAdapter, field_validator
from pydantic_settings import BaseSettings

DEFAULT_VALKEY_URL: AnyUrl = TypeAdapter(AnyUrl).validate_python(
    "valkey://localhost:6379",
)
ALLOWED_VALKEY_SCHEMES = {"valkey", "valkeys", "redis", "rediss"}


class Settings(BaseSettings):
    # Database
    connection_string: str = ""
    connection_string_read: str = ""  # read replica; falls back to primary

    # Valkey
    valkey_url: AnyUrl = DEFAULT_VALKEY_URL

    # Worker tuning
    poll_interval_seconds: float = 1.0
    # TODO: when scaling to multiple workers, reconciliation should move
    # to a dedicated service to avoid redundant DB queries from every worker.
    reconcile_interval_seconds: int = 300
    batch_size: int = 50  # max conversations to ZPOPMIN per cycle
    max_workers: int = 4  # ThreadPoolExecutor size for parallel Solidago
    backoff_seconds: float = 10.0  # per-conversation retry delay after failure
    valkey_retry_interval_seconds: float = 5.0

    model_config = {"env_prefix": "SCORING_WORKER_", "env_file": ".env"}

    @field_validator("valkey_url")
    @classmethod
    def validate_valkey_url(cls, value: AnyUrl) -> AnyUrl:
        if value.scheme not in ALLOWED_VALKEY_SCHEMES:
            msg = "SCORING_WORKER_VALKEY_URL must use valkey://, valkeys://, redis://, or rediss://"
            raise ValueError(msg)
        return value

    @property
    def read_dsn(self) -> str:
        return self.connection_string_read or self.connection_string
