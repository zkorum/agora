from pydantic import AnyUrl, Field, TypeAdapter, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_VALKEY_URL: AnyUrl = TypeAdapter(AnyUrl).validate_python(
    "valkey://localhost:6379",
)
ALLOWED_VALKEY_SCHEMES = {"valkey", "valkeys", "redis", "rediss"}

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


class Settings(BaseSettings):
    connection_string: str = Field(default="", min_length=1)
    connection_string_read: str | None = Field(default=None, min_length=1)

    valkey_url: AnyUrl = DEFAULT_VALKEY_URL

    valkey_pop_batch_size: int = Field(default=50, ge=1)
    db_claim_batch_size: int = Field(default=8, ge=1)
    db_write_batch_size: int = Field(default=10, ge=1)
    max_compute_concurrency: int = Field(default=4, ge=1)
    lease_ttl_seconds: int = Field(default=600, ge=1)
    heartbeat_interval_seconds: int = Field(default=30, ge=1)
    worker_poll_idle_sleep_seconds: float = Field(default=0.5, gt=0)
    default_debounce_seconds: int = Field(default=5, ge=0)
    reconciliation_interval_seconds: int = Field(default=60, ge=1)
    running_recovery_interval_seconds: int = Field(default=60, ge=1)
    valkey_retry_interval_seconds: float = Field(default=5.0, gt=0)
    retry_burst_attempts: int = Field(default=10, ge=1)
    retry_burst_seconds: int = Field(default=10, ge=1)
    retry_cooldown_seconds: int = Field(default=300, ge=0)
    analysis_engine_epoch: int = Field(default=1, ge=1)
    ai_description_epoch: int = Field(default=1, ge=1)

    aws_ai_label_summary_enable: bool = False
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

    aws_secret_region: str | None = Field(default=None, min_length=1)
    google_cloud_translation_location: str = Field(default="us-central1", min_length=1)
    google_cloud_translation_endpoint: str | None = Field(
        default="translate.googleapis.com",
        min_length=1,
    )
    google_cloud_service_account_aws_secret_key: str | None = Field(default=None, min_length=1)
    google_application_credentials: str | None = Field(default=None, min_length=1)

    model_config = SettingsConfigDict(
        env_prefix="MATH_UPDATER_",
        env_file=".env",
        extra="forbid",
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

    @property
    def read_dsn(self) -> str:
        return self.connection_string_read or self.connection_string

    @property
    def google_translation_credentials_configured(self) -> bool:
        return (
            self.google_cloud_service_account_aws_secret_key is not None
            or self.google_application_credentials is not None
        )


class MathUpdaterConfigError(RuntimeError):
    pass


def validate_ai_description_config(settings: Settings) -> None:
    if (
        settings.google_translation_credentials_configured
        and not settings.aws_ai_label_summary_enable
    ):
        msg = (
            "Google Cloud Translation credentials are configured, but "
            "MATH_UPDATER_AWS_AI_LABEL_SUMMARY_ENABLE is false. "
            "Translations require AI-generated labels and summaries; either enable "
            "AI summaries or remove the translation credentials."
        )
        raise MathUpdaterConfigError(msg)
