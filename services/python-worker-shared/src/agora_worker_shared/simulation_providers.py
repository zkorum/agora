from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from agora_worker_shared.ai_description_work import (
    ClaimedDescriptionTranslationWorkItem,
    ClaimedLineageDescriptionWorkItem,
)
from agora_worker_shared.bedrock_label_summary import LabelSummary, ParsedLabelSummaryOutput
from agora_worker_shared.description_input import DescriptionInputError
from agora_worker_shared.description_translation import DescriptionTranslation

if TYPE_CHECKING:
    from agora_worker_shared.ai_description_work import ClaimedAiDescriptionLocaleWorkItem
    from agora_worker_shared.config import Settings, SimulationMode
    from agora_worker_shared.description_input import ConversationDescriptionInput
    from agora_worker_shared.description_translation import DescriptionForTranslation

log = logging.getLogger(__name__)
SIMULATION_LOG_PREFIX = "[SimulationProvider]"
DEFAULT_EVENT_SCENARIO = "python-worker"
SIMULATION_EVENT_SCENARIO = "python-worker-simulation"


@dataclass(frozen=True)
class SimulationRuntime:
    ai_description_mode: SimulationMode
    description_translation_mode: SimulationMode
    retryable_failure_attempts: int


class SimulatedRetryableError(RuntimeError):
    pass


def build_simulation_runtime(settings: Settings) -> SimulationRuntime | None:
    if not settings.simulation_providers_enable:
        return None
    return SimulationRuntime(
        ai_description_mode=settings.ai_description_simulation_mode,
        description_translation_mode=settings.description_translation_simulation_mode,
        retryable_failure_attempts=settings.simulation_retryable_failure_attempts,
    )


def log_simulation_startup(settings: Settings) -> None:
    if not settings.simulation_providers_enable:
        return
    log.info(
        "%s enabled ai_mode=%s translation_mode=%s retryable_failure_attempts=%d dev_mode=%s",
        SIMULATION_LOG_PREFIX,
        settings.ai_description_simulation_mode,
        settings.description_translation_simulation_mode,
        settings.simulation_retryable_failure_attempts,
        settings.agora_dev_mode,
    )
    emit_load_event(
        phase="simulation-provider",
        action="startup",
        outcome="info",
        scenario=SIMULATION_EVENT_SCENARIO,
        metadata={
            "aiMode": settings.ai_description_simulation_mode,
            "translationMode": settings.description_translation_simulation_mode,
            "retryableFailureAttempts": settings.simulation_retryable_failure_attempts,
            "devMode": settings.agora_dev_mode,
        },
    )


def maybe_raise_simulated_claim_error(
    *,
    runtime: SimulationRuntime | None,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    phase: str,
) -> None:
    if runtime is None:
        return
    mode = _mode_for_claim(runtime=runtime, claim=claim)
    if mode == "off" or mode == "success":
        return

    action = _action_for_claim(claim)
    metadata = _claim_metadata(claim)
    metadata["mode"] = mode
    metadata["phase"] = phase

    if mode == "retryable_error_then_success":
        if claim.attempt_count > runtime.retryable_failure_attempts:
            target_name, target_id = _claim_target_for_log(claim)
            log.info(
                "%s %s outcome=success_after_retry conversationSlugId=%s "
                "locale=%s %s=%d attemptCount=%d threshold=%d",
                SIMULATION_LOG_PREFIX,
                action,
                claim.conversation_slug_id,
                claim.locale,
                target_name,
                target_id,
                claim.attempt_count,
                runtime.retryable_failure_attempts,
            )
            emit_load_event(
                phase=phase,
                action=action,
                outcome="success",
                conversation_slug_id=claim.conversation_slug_id,
                scenario=SIMULATION_EVENT_SCENARIO,
                metadata=metadata,
            )
            return
        _log_simulated_failure(
            phase=phase,
            action=action,
            outcome="retryable_error",
            claim=claim,
            metadata=metadata,
        )
        msg = f"simulated retryable {action} failure"
        raise SimulatedRetryableError(msg)

    if mode == "retryable_error":
        _log_simulated_failure(
            phase=phase,
            action=action,
            outcome="retryable_error",
            claim=claim,
            metadata=metadata,
        )
        msg = f"simulated retryable {action} failure"
        raise SimulatedRetryableError(msg)

    _log_simulated_failure(
        phase=phase,
        action=action,
        outcome="non_retryable_error",
        claim=claim,
        metadata=metadata,
    )
    msg = f"simulated non-retryable {action} failure"
    raise DescriptionInputError(msg)


def generate_simulated_label_summaries(
    conversation: ConversationDescriptionInput,
) -> ParsedLabelSummaryOutput:
    clusters: dict[str, LabelSummary] = {}
    snapshot_label = (
        f" snapshot {conversation.analysis_snapshot_id}"
        if conversation.analysis_snapshot_id is not None
        else ""
    )
    for group in conversation.groups:
        clusters[group.group_key] = LabelSummary(
            reasoning="Simulated AI description provider output.",
            label=f"Sim Group {group.group_key}{snapshot_label}",
            summary=f"Simulated description for group {group.group_key}{snapshot_label}.",
        )
    log.info(
        "%s ai_generate outcome=success group_count=%d title_length=%d",
        SIMULATION_LOG_PREFIX,
        len(conversation.groups),
        len(conversation.conversation_title),
    )
    emit_load_event(
        phase="simulation-provider",
        action="ai-generate-provider",
        outcome="success",
        count=len(conversation.groups),
        scenario=SIMULATION_EVENT_SCENARIO,
        metadata={"titleLength": len(conversation.conversation_title)},
    )
    return ParsedLabelSummaryOutput(mode="simulation", clusters=clusters)


def generate_simulated_description_translations(
    descriptions: list[DescriptionForTranslation],
    target_language_codes: list[str],
) -> list[DescriptionTranslation]:
    translations = [
        DescriptionTranslation(
            description_id=description.description_id,
            locale=target_language_code,
            label=f"Sim {target_language_code} {description.label}",
            summary=(
                f"Simulated {target_language_code} translation for "
                f"description {description.description_id}."
            ),
        )
        for target_language_code in target_language_codes
        for description in descriptions
    ]
    log.info(
        "%s translation outcome=success description_count=%d locale_count=%d output_count=%d",
        SIMULATION_LOG_PREFIX,
        len(descriptions),
        len(target_language_codes),
        len(translations),
    )
    emit_load_event(
        phase="simulation-provider",
        action="translation-provider",
        outcome="success",
        count=len(translations),
        scenario=SIMULATION_EVENT_SCENARIO,
        metadata={
            "descriptionCount": len(descriptions),
            "localeCount": len(target_language_codes),
        },
    )
    return translations


def emit_load_event(
    *,
    phase: str,
    action: str,
    outcome: str,
    conversation_slug_id: str | None = None,
    count: int | None = None,
    metadata: dict[str, str | int | bool | None] | None = None,
    scenario: str = DEFAULT_EVENT_SCENARIO,
) -> None:
    payload: dict[str, object] = {
        "schemaVersion": 1,
        "timestamp": datetime.now(UTC).isoformat(),
        "scenario": scenario,
        "phase": phase,
        "action": action,
        "outcome": outcome,
    }
    if conversation_slug_id is not None:
        payload["conversationSlugId"] = conversation_slug_id
    if count is not None:
        payload["count"] = count
    if metadata is not None:
        payload["metadata"] = metadata
    log.info("AGORA_LOAD_EVENT %s", json.dumps(payload, separators=(",", ":")))


def _mode_for_claim(
    *,
    runtime: SimulationRuntime,
    claim: ClaimedAiDescriptionLocaleWorkItem,
) -> SimulationMode:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        return runtime.ai_description_mode
    return runtime.description_translation_mode


def _action_for_claim(claim: ClaimedAiDescriptionLocaleWorkItem) -> str:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        return "ai-generate"
    return "translation"


def _claim_metadata(
    claim: ClaimedAiDescriptionLocaleWorkItem,
) -> dict[str, str | int | bool | None]:
    metadata: dict[str, str | int | bool | None] = {
        "conversationId": claim.conversation_id,
        "locale": claim.locale,
        "attemptCount": claim.attempt_count,
    }
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        metadata["lineageId"] = claim.lineage_id
    if isinstance(claim, ClaimedDescriptionTranslationWorkItem):
        metadata["descriptionId"] = claim.description_id
    return metadata


def _claim_target_for_log(claim: ClaimedAiDescriptionLocaleWorkItem) -> tuple[str, int]:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        return "lineageId", claim.lineage_id
    return "descriptionId", claim.description_id


def _log_simulated_failure(
    *,
    phase: str,
    action: str,
    outcome: str,
    claim: ClaimedAiDescriptionLocaleWorkItem,
    metadata: dict[str, str | int | bool | None],
) -> None:
    target_name, target_id = _claim_target_for_log(claim)
    log.info(
        "%s %s outcome=%s conversationSlugId=%s locale=%s %s=%d attemptCount=%d",
        SIMULATION_LOG_PREFIX,
        action,
        outcome,
        claim.conversation_slug_id,
        claim.locale,
        target_name,
        target_id,
        claim.attempt_count,
    )
    emit_load_event(
        phase=phase,
        action=action,
        outcome=outcome,
        conversation_slug_id=claim.conversation_slug_id,
        scenario=SIMULATION_EVENT_SCENARIO,
        metadata=metadata,
    )
