from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    connection_string: str
    connection_string_read: str = ""  # read replica; falls back to primary

    # Valkey
    valkey_url: str = "valkey://localhost:6379"

    # Worker tuning
    poll_interval_seconds: float = 1.0
    # TODO: when scaling to multiple workers, reconciliation should move
    # to a dedicated service to avoid redundant DB queries from every worker.
    reconcile_interval_seconds: int = 300
    batch_size: int = 50  # max conversations to ZPOPMIN per cycle
    max_workers: int = 4  # ThreadPoolExecutor size for parallel Solidago
    backoff_seconds: float = 10.0  # per-conversation retry delay after failure

    model_config = {"env_prefix": "SCORING_WORKER_", "env_file": ".env"}

    @property
    def read_dsn(self) -> str:
        return self.connection_string_read or self.connection_string
