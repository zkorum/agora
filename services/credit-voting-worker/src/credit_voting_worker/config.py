from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    connection_string: str = Field(default="", min_length=1)
    poll_interval_seconds: float = Field(default=1.0, gt=0)
    reconcile_seconds: int = Field(default=60, ge=1)
    min_stats_refresh_seconds: float = Field(default=1.0, ge=0)
    statement_timeout_seconds: int = Field(default=30, ge=1)
    calculation_lease_seconds: int = Field(default=120, ge=10)
    agora_dev_mode: bool = Field(default=False, validation_alias="AGORA_DEV_MODE")
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] | None = None

    model_config = SettingsConfigDict(
        env_prefix="CREDIT_VOTING_WORKER_",
        env_file=".env",
        extra="forbid",
    )

    @property
    def resolved_log_level(self) -> Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
        return self.log_level or ("DEBUG" if self.agora_dev_mode else "INFO")
