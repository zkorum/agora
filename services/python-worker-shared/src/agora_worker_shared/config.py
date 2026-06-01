import logging
from typing import ClassVar, Literal, Self

from pydantic import AliasChoices, AnyUrl, Field, TypeAdapter, field_validator, model_validator
from pydantic_settings import (
    BaseSettings,
    DotEnvSettingsSource,
    EnvSettingsSource,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

DEFAULT_VALKEY_URL: AnyUrl = TypeAdapter(AnyUrl).validate_python(
    "valkey://localhost:6379",
)
log = logging.getLogger(__name__)
ALLOWED_VALKEY_SCHEMES = {"valkey", "valkeys", "redis", "rediss"}
MATH_UPDATER_ENV_PREFIX = "MATH_UPDATER_"
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
SimulationMode = Literal[
    "off",
    "success",
    "retryable_error",
    "retryable_error_then_success",
    "non_retryable_error",
]

DEFAULT_AWS_AI_LABEL_SUMMARY_PROMPT = """\
You are analyzing opinion clusters from a group conversation.
Output only raw JSON, no extra text or markdown.

## Output Format
{
  "clusters": {
    "0": {
      "reasoning": "Analyze supports and rejections, then derive the label",
      "label": "1-2 word neutral label (-ists, -ers, -ians)",
      "summary": "≤300 chars describing cluster's perspective"
    },
    "1": { "reasoning": "...", "label": "...", "summary": "..." },
    "2": { "reasoning": "...", "label": "...", "summary": "..." },
    "3": { "reasoning": "...", "label": "...", "summary": "..." },
    "4": { "reasoning": "...", "label": "...", "summary": "..." },
    "5": { "reasoning": "...", "label": "...", "summary": "..." }
  }
}

## Input Format
{
  "conversationTitle": "string",
  "conversationBody": "string (optional)",
  "clusters": {
    "0": { "agreesWith": [...], "disagreesWith": [...] },
    ...
  }
}

## Reasoning Steps (MUST follow in the reasoning field)
For each cluster:
1. List what opinions are in agreesWith - these are opinions the cluster SUPPORTS
2. List what opinions are in disagreesWith - these are opinions the cluster REJECTS/OPPOSES
3. Interpret: "Since they reject [X], they believe [opposite of X]"
4. Derive the label from the interpretation
5. Write summary based on what they support AND what they reject

## Example
Input cluster "0":
  "agreesWith": [],
  "disagreesWith": ["Technology always improves society", "Innovation is always beneficial"]

Correct reasoning and output:
{
  "reasoning": "No explicit support. They reject pro-technology optimism.",
  "label": "Skeptics",
  "summary": "This cluster rejects uncritical claims that technology always helps."
}

WRONG (do not do this):
{
  "reasoning": "They believe technology improves society",
  "label": "Technologists",
  "summary": "This cluster believes technology always improves society."
}
The above is WRONG because "Technology always improves society" is in disagreesWith,
meaning they REJECT it, not believe it.

## Label Guidelines
- 1-2 words, ≤30 chars, neutral agentive nouns (-ists, -ers, -ians)
- Focus on intellectual traditions or philosophical approaches
- Avoid policy-specific terms or geographic references
- Good: "Redistributionists", "Decentralists", "Humanists", "Skeptics", "Technologists", "Critics"
- Bad: "Regional Advocates", "AI Tool Users", "Naysayers", "Plastic Ban Advocates"

## Summary Guidelines
- ≤300 chars, neutral, concise
- Grounded in what the cluster SUPPORTS (agreesWith) and REJECTS (disagreesWith)
- Must accurately reflect the cluster's perspective based on reasoning

Generate labels and summaries for all clusters in the input, using the reasoning field to
show your analysis.
"""

DEFAULT_AWS_DESCRIPTION_TRANSLATION_PROMPT = """\
Translate concise opinion-group labels and summaries for a civic conversation.
Return only raw JSON.

## Output
Return this shape, with one item per input description:

translations[]:
- descriptionId: copy from input descriptionId
- locale: copy from input targetLocale
- reasoning: brief translation rationale
- label: translated label
- summary: translated summary

## Example
Example input:
{
  "sourceLocale": "en",
  "targetLocale": "fr",
  "descriptions": [
    {
      "descriptionId": 501,
      "label": "Skeptics",
      "summary": "This cluster rejects uncritical claims that technology always helps.",
      "conversationTitle": "How should society govern technology?",
      "representativeOpinions": [
        {"opinionId": 10, "stance": "disagree", "content": "Technology always improves society"}
      ]
    },
    {
      "descriptionId": 502,
      "label": "Stewards",
      "summary": "This cluster supports careful oversight so technology serves public goals.",
      "conversationTitle": "How should society govern technology?",
      "representativeOpinions": [
        {"opinionId": 11, "stance": "agree", "content": "Technology should serve public goals"}
      ]
    }
  ]
}

Correct output for that example:
{
  "translations": [
    {
      "descriptionId": 501,
      "locale": "fr",
      "reasoning": "The group rejects an overly positive tech claim; keep that neutral stance.",
      "label": "Sceptiques",
      "summary": "Ce groupe rejette l'idée que la technologie aide toujours la société."
    },
    {
      "descriptionId": 502,
      "locale": "fr",
      "reasoning": "The group favors responsible stewardship; emphasize public-interest oversight.",
      "label": "Gardiens",
      "summary": "Ce groupe veut que la technologie serve des objectifs publics."
    }
  ]
}

The example descriptionId is illustrative. In real output, copy each actual input
descriptionId exactly.

## Rules
- Translate only into targetLocale; echo targetLocale and each descriptionId exactly.
- Prioritize faithful, idiomatic translation of the English label and summary.
- Use reasoning to avoid literal translations that sound unnatural or change the tone.
- Label guidance: short, neutral group names; prefer natural agentive nouns or concise
  intellectual-tradition labels; avoid pejoratives, slang, policy-specific names,
  geography, and awkward calques.
- Summary guidance: neutral, concise, grounded in what the group supports and rejects.
- If stance is "disagree", the group rejects that opinion; do not make it sound like
  the group's belief.
- Use title and representative opinions only for tone, ambiguity, and terminology.
- Do not include fields outside the output shape.
"""


class Settings(BaseSettings):
    agora_dev_mode: bool = Field(
        default=False,
        validation_alias=AliasChoices("AGORA_DEV_MODE", "MATH_UPDATER_AGORA_DEV_MODE"),
    )
    log_level: LogLevel | None = None
    connection_string: str = Field(default="", min_length=1)
    connection_string_read: str | None = Field(default=None, min_length=1)

    valkey_url: AnyUrl = DEFAULT_VALKEY_URL

    db_claim_batch_size: int = Field(default=8, ge=1)
    db_write_batch_size: int = Field(default=10, ge=1)
    max_compute_concurrency: int = Field(default=4, ge=1)
    max_ai_description_concurrency: int = Field(default=4, ge=1)
    lease_ttl_seconds: int = Field(default=45, ge=1)
    heartbeat_interval_seconds: int = Field(default=15, ge=1)
    worker_poll_idle_sleep_seconds: float = Field(default=0.5, gt=0)
    default_debounce_seconds: int = Field(default=5, ge=0)
    reconciliation_interval_seconds: int = Field(default=60, ge=1)
    running_recovery_interval_seconds: int = Field(default=10, ge=1)
    valkey_retry_interval_seconds: float = Field(default=5.0, gt=0)
    retry_burst_attempts: int = Field(default=10, ge=1)
    retry_burst_seconds: int = Field(default=10, ge=1)
    retry_cooldown_seconds: int = Field(default=300, ge=0)
    analysis_engine_epoch: int = Field(default=1, ge=1)
    ai_description_epoch: int = Field(default=1, ge=1)

    simulation_providers_enable: bool = False
    ai_description_simulation_mode: SimulationMode = "off"
    description_translation_simulation_mode: SimulationMode = "off"
    simulation_retryable_failure_attempts: int = Field(default=1, ge=1)

    aws_ai_label_summary_enable: bool = True
    aws_ai_label_summary_region: str = Field(default="us-east-1", min_length=1)
    aws_ai_label_summary_model_id: str = Field(
        default="mistral.mistral-large-3-675b-instruct",
        min_length=1,
    )
    aws_ai_label_summary_temperature: float = Field(default=0.15, ge=0, le=2)
    aws_ai_label_summary_top_p: float = Field(default=0.9, gt=0, le=1)
    aws_ai_label_summary_max_tokens: int = Field(default=8192, ge=1)
    aws_ai_label_summary_prompt: str = Field(
        default=DEFAULT_AWS_AI_LABEL_SUMMARY_PROMPT,
        min_length=1,
    )
    aws_description_translation_enable: bool = True
    aws_description_translation_region: str = Field(default="us-east-1", min_length=1)
    aws_description_translation_model_id: str = Field(
        default="mistral.mistral-large-3-675b-instruct",
        min_length=1,
    )
    aws_description_translation_temperature: float = Field(default=0.1, ge=0, le=2)
    aws_description_translation_top_p: float = Field(default=0.9, gt=0, le=1)
    aws_description_translation_max_tokens: int = Field(default=4096, ge=1)
    aws_description_translation_prompt: str = Field(
        default=DEFAULT_AWS_DESCRIPTION_TRANSLATION_PROMPT,
        min_length=1,
    )
    aws_client_connect_timeout_seconds: float = Field(default=2.0, gt=0)
    aws_ai_label_summary_read_timeout_seconds: float = Field(default=12.0, gt=0)
    aws_description_translation_read_timeout_seconds: float = Field(default=12.0, gt=0)
    aws_secret_read_timeout_seconds: float = Field(default=5.0, gt=0)

    aws_secret_region: str | None = Field(default=None, min_length=1)
    google_cloud_translation_location: str = Field(default="us-central1", min_length=1)
    google_cloud_translation_endpoint: str | None = Field(
        default="translate.googleapis.com",
        min_length=1,
    )
    google_cloud_translation_timeout_seconds: float = Field(default=10.0, gt=0)
    google_cloud_service_account_aws_secret_key: str | None = Field(default=None, min_length=1)
    google_application_credentials: str | None = Field(default=None, min_length=1)

    model_config = SettingsConfigDict(
        env_prefix=MATH_UPDATER_ENV_PREFIX,
        env_file=".env",
        extra="forbid",
        populate_by_name=True,
        str_strip_whitespace=True,
        validate_default=True,
    )

    @field_validator("valkey_url")
    @classmethod
    def validate_valkey_url(cls, value: AnyUrl) -> AnyUrl:
        if value.scheme not in ALLOWED_VALKEY_SCHEMES:
            msg = "MATH_UPDATER_VALKEY_URL must use valkey://, valkeys://, redis://, or rediss://"
            raise ValueError(msg)
        return value

    @model_validator(mode="after")
    def validate_lease_heartbeat_interval(self) -> Self:
        if self.heartbeat_interval_seconds >= self.lease_ttl_seconds:
            msg = "HEARTBEAT_INTERVAL_SECONDS must be shorter than LEASE_TTL_SECONDS"
            raise ValueError(msg)
        return self

    @property
    def read_dsn(self) -> str:
        return self.connection_string_read or self.connection_string

    @property
    def effective_log_level(self) -> LogLevel:
        if self.log_level is not None:
            return self.log_level
        return "DEBUG" if self.agora_dev_mode else "INFO"

    @property
    def google_translation_credentials_configured(self) -> bool:
        return (
            self.google_cloud_service_account_aws_secret_key is not None
            or self.google_application_credentials is not None
        )

    @property
    def bedrock_label_summary_configured(self) -> bool:
        return self.aws_ai_label_summary_enable

    @property
    def bedrock_description_translation_configured(self) -> bool:
        return self.aws_description_translation_enable

    @property
    def ai_description_simulation_enabled(self) -> bool:
        return (
            self.simulation_providers_enable
            and self.ai_description_simulation_mode != "off"
        )

    @property
    def description_translation_simulation_enabled(self) -> bool:
        return (
            self.simulation_providers_enable
            and self.description_translation_simulation_mode != "off"
        )


class MathUpdaterConfigError(RuntimeError):
    pass


class _LayeredPythonWorkerSettings(Settings):
    worker_env_prefix: ClassVar[str]

    model_config = SettingsConfigDict(
        env_prefix="",
        env_file=".env",
        extra="ignore",
        str_strip_whitespace=True,
        validate_default=True,
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            EnvSettingsSource(settings_cls, env_prefix=cls.worker_env_prefix),
            DotEnvSettingsSource(settings_cls, env_prefix=cls.worker_env_prefix),
            file_secret_settings,
        )


class AiDescriptionWorkerSettings(_LayeredPythonWorkerSettings):
    worker_env_prefix: ClassVar[str] = "AI_DESCRIPTION_RETRY_WORKER_"


class DescriptionTranslationWorkerSettings(_LayeredPythonWorkerSettings):
    worker_env_prefix: ClassVar[str] = "DESCRIPTION_TRANSLATION_RETRY_WORKER_"


def validate_ai_description_config(settings: Settings) -> None:
    simulation_mode_enabled = (
        settings.ai_description_simulation_mode != "off"
        or settings.description_translation_simulation_mode != "off"
    )
    if settings.simulation_providers_enable and not settings.agora_dev_mode:
        log.error(
            "[MathUpdaterConfig] Refusing simulation providers outside dev mode "
            "dev_mode=%s simulation_providers_enable=%s ai_mode=%s translation_mode=%s",
            settings.agora_dev_mode,
            settings.simulation_providers_enable,
            settings.ai_description_simulation_mode,
            settings.description_translation_simulation_mode,
        )
        msg = (
            "Simulation providers are dev-only. Refusing to start because "
            "AGORA_DEV_MODE=true is not set."
        )
        raise MathUpdaterConfigError(msg)
    if simulation_mode_enabled and not settings.simulation_providers_enable:
        msg = (
            "Simulation provider modes require "
            "MATH_UPDATER_SIMULATION_PROVIDERS_ENABLE=true."
        )
        raise MathUpdaterConfigError(msg)
    if settings.ai_description_simulation_enabled and settings.bedrock_label_summary_configured:
        msg = "AI description simulation cannot be enabled with real AI summaries."
        raise MathUpdaterConfigError(msg)
    real_translation_configured = (
        settings.bedrock_description_translation_configured
        or settings.google_translation_credentials_configured
    )
    if settings.description_translation_simulation_enabled and real_translation_configured:
        msg = (
            "Description translation simulation cannot be enabled with real "
            "translation providers."
        )
        raise MathUpdaterConfigError(msg)

    ai_generation_available = (
        settings.bedrock_label_summary_configured
        or settings.ai_description_simulation_enabled
    )
    is_translation_retry_worker = isinstance(settings, DescriptionTranslationWorkerSettings)
    if (
        settings.bedrock_description_translation_configured
        and not ai_generation_available
        and not is_translation_retry_worker
    ):
        msg = (
            "AWS description translation is enabled, but "
            "AWS_AI_LABEL_SUMMARY_ENABLE is false. Translations require AI-generated "
            "labels and summaries; either enable AI summaries or disable description "
            "translation."
        )
        raise MathUpdaterConfigError(msg)
    if (
        settings.google_translation_credentials_configured
        and not ai_generation_available
        and not is_translation_retry_worker
    ):
        msg = (
            "Google Cloud Translation credentials are configured, but "
            "MATH_UPDATER_AWS_AI_LABEL_SUMMARY_ENABLE is false. "
            "Translations require AI-generated labels and summaries; either enable "
            "AI summaries or remove the translation credentials."
        )
        raise MathUpdaterConfigError(msg)
