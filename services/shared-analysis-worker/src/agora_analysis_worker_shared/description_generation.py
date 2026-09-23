from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from types import MappingProxyType
from typing import TYPE_CHECKING, Literal

from agora_analysis_worker_shared.description_input import GroupDescriptionCorrection
from agora_analysis_worker_shared.description_language import (
    DescriptionLanguageIssue,
    EnglishDescription,
    check_description_language,
)
from agora_analysis_worker_shared.provider_errors import is_provider_timeout_error

if TYPE_CHECKING:
    from collections.abc import Callable, Mapping

    from agora_language.detection import LanguageDetectorFunction

    from agora_analysis_worker_shared.bedrock_label_summary import ParsedLabelSummaryOutput
    from agora_analysis_worker_shared.description_input import (
        ConversationDescriptionInput,
        DescriptionGroupRequest,
    )

    type RawDescriptionGenerator = Callable[
        [ConversationDescriptionInput], ParsedLabelSummaryOutput
    ]
    type DescriptionGenerator = Callable[
        [ConversationDescriptionInput], DescriptionGenerationResult
    ]

log = logging.getLogger(__name__)
MAX_DESCRIPTION_REQUESTS = 2


@dataclass(frozen=True)
class MissingDescription:
    reason: Literal["missing_output"] = "missing_output"


@dataclass(frozen=True)
class DescriptionProviderFailure:
    reason: Literal["provider_error", "provider_timeout"]
    error_type: str


type DescriptionFailure = MissingDescription | DescriptionLanguageIssue | DescriptionProviderFailure
type DescriptionOutcome = EnglishDescription | DescriptionFailure


@dataclass(frozen=True)
class DescriptionGenerationResult:
    groups: Mapping[str, DescriptionOutcome]


@dataclass(frozen=True)
class _PendingGroup:
    request: DescriptionGroupRequest
    failure: DescriptionFailure


def description_failure_message(failure: DescriptionFailure) -> str:
    if isinstance(failure, DescriptionLanguageIssue):
        return (
            f"AI description {failure.reason}: "
            f"field={failure.field} language={failure.detected_language}"
        )
    if isinstance(failure, DescriptionProviderFailure):
        return f"AI description {failure.reason}: error_type={failure.error_type}"
    return "AI description missing from provider output"


def generate_english_descriptions(
    *,
    generate: RawDescriptionGenerator,
    conversation: ConversationDescriptionInput,
    secondary_detector: LanguageDetectorFunction | None = None,
) -> DescriptionGenerationResult:
    states: dict[str, EnglishDescription | _PendingGroup] = {
        group.group_key: _PendingGroup(request=group, failure=MissingDescription())
        for group in conversation.groups
    }
    for attempt in range(1, MAX_DESCRIPTION_REQUESTS + 1):
        pending = {key: state for key, state in states.items() if isinstance(state, _PendingGroup)}
        if not pending:
            break
        request = replace(conversation, groups=[pending[key].request for key in sorted(pending)])
        try:
            output = generate(request)
        except Exception as error:
            timed_out = is_provider_timeout_error(error)
            failure = DescriptionProviderFailure(
                reason="provider_timeout" if timed_out else "provider_error",
                error_type=type(error).__name__,
            )
            for key, state in pending.items():
                states[key] = replace(state, failure=failure)
            log.warning(
                "[DescriptionGenerator] Provider attempt %d/%d failed snapshot=%s groups=%s "
                "reason=%s error_type=%s",
                attempt,
                MAX_DESCRIPTION_REQUESTS,
                conversation.analysis_snapshot_id,
                sorted(pending),
                failure.reason,
                failure.error_type,
            )
            if timed_out or attempt == MAX_DESCRIPTION_REQUESTS:
                if not any(isinstance(state, EnglishDescription) for state in states.values()):
                    raise
                break
            continue
        for key, state in pending.items():
            description = output.clusters.get(key)
            if description is None:
                states[key] = replace(state, failure=MissingDescription())
                continue
            result = check_description_language(description, secondary_detector=secondary_detector)
            if isinstance(result, EnglishDescription):
                states[key] = result
                continue
            states[key] = _PendingGroup(
                request=GroupDescriptionCorrection(group_key=key, draft=description), failure=result
            )
            log.warning(
                "[DescriptionGenerator] Output rejected snapshot=%s group=%s attempt=%d "
                "reason=%s field=%s detected_language=%s confidence=%s",
                conversation.analysis_snapshot_id,
                key,
                attempt,
                result.reason,
                result.field,
                result.detected_language,
                result.confidence,
            )
    return DescriptionGenerationResult(
        groups=MappingProxyType(
            {
                key: state.failure if isinstance(state, _PendingGroup) else state
                for key, state in states.items()
            }
        )
    )
