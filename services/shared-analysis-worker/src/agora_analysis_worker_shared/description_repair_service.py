from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal, Protocol

from agora_analysis_worker_shared.bedrock_label_summary import LabelSummary
from agora_analysis_worker_shared.description_generation import (
    MissingDescription,
    description_failure_message,
)
from agora_analysis_worker_shared.description_language import (
    CANONICAL_DESCRIPTION_LOCALE,
    DescriptionLanguageIssue,
    EnglishDescription,
    check_description_language,
)

if TYPE_CHECKING:
    from agora_language.detection import LanguageDetectorFunction

    from agora_analysis_worker_shared.description_generation import DescriptionGenerator
    from agora_analysis_worker_shared.description_repair import LiveDescription, RepairLineage
    from agora_analysis_worker_shared.generated_models import DisplayLanguageCode

log = logging.getLogger(__name__)


class DescriptionReplacer(Protocol):
    def __call__(
        self, *, original: LiveDescription, replacement: EnglishDescription
    ) -> int | None: ...


@dataclass(frozen=True)
class InspectDescriptions:
    pass


@dataclass(frozen=True)
class ApplyDescriptionRepairs:
    generate: DescriptionGenerator
    replace: DescriptionReplacer


type DescriptionRepairMode = InspectDescriptions | ApplyDescriptionRepairs


@dataclass(frozen=True, kw_only=True)
class _ReportIdentity:
    description_id: int
    lineages: tuple[RepairLineage, ...]


@dataclass(frozen=True, kw_only=True)
class AcceptedDescriptionReport(_ReportIdentity):
    status: Literal["accepted"] = field(default="accepted", init=False)


@dataclass(frozen=True, kw_only=True)
class UnrepairedDescriptionReport(_ReportIdentity):
    status: Literal["wrong_language", "unresolved"]
    issue: DescriptionLanguageIssue


@dataclass(frozen=True, kw_only=True)
class WrongLocaleReport(_ReportIdentity):
    status: Literal["wrong_locale"] = field(default="wrong_locale", init=False)
    locale: DisplayLanguageCode


@dataclass(frozen=True, kw_only=True)
class RepairedDescriptionReport(_ReportIdentity):
    status: Literal["repaired"] = field(default="repaired", init=False)
    replacement_description_id: int


@dataclass(frozen=True, kw_only=True)
class ChangedDescriptionReport(_ReportIdentity):
    status: Literal["changed_since_scan"] = field(default="changed_since_scan", init=False)


@dataclass(frozen=True, kw_only=True)
class FailedDescriptionReport(_ReportIdentity):
    status: Literal["correction_failed", "repair_failed"]
    reason: str


type DescriptionRepairReport = (
    AcceptedDescriptionReport
    | UnrepairedDescriptionReport
    | WrongLocaleReport
    | RepairedDescriptionReport
    | ChangedDescriptionReport
    | FailedDescriptionReport
)


def inspect_or_repair_description(
    original: LiveDescription,
    *,
    mode: DescriptionRepairMode,
    secondary_detector: LanguageDetectorFunction | None,
) -> DescriptionRepairReport:
    result = check_description_language(
        LabelSummary(reasoning=None, label=original.label, summary=original.summary),
        secondary_detector=secondary_detector,
    )
    if isinstance(result, EnglishDescription):
        if original.locale == CANONICAL_DESCRIPTION_LOCALE:
            return AcceptedDescriptionReport(
                description_id=original.description_id, lineages=original.lineages
            )
        if isinstance(mode, InspectDescriptions):
            return WrongLocaleReport(
                description_id=original.description_id,
                lineages=original.lineages,
                locale=original.locale,
            )
        replacement = result
    else:
        if result.reason != "language_mismatch" or isinstance(mode, InspectDescriptions):
            return UnrepairedDescriptionReport(
                description_id=original.description_id,
                lineages=original.lineages,
                status="wrong_language" if result.reason == "language_mismatch" else "unresolved",
                issue=result,
            )
        try:
            output = mode.generate(original.correction_request())
        except Exception as error:
            return _failed_report(original=original, error=error)
        replacement = output.groups.get("0", MissingDescription())
        if not isinstance(replacement, EnglishDescription):
            return FailedDescriptionReport(
                description_id=original.description_id,
                lineages=original.lineages,
                status="correction_failed",
                reason=description_failure_message(replacement),
            )

    try:
        new_id = mode.replace(original=original, replacement=replacement)
    except Exception as error:
        return _failed_report(original=original, error=error)
    if new_id is None:
        return ChangedDescriptionReport(
            description_id=original.description_id, lineages=original.lineages
        )
    return RepairedDescriptionReport(
        description_id=original.description_id,
        lineages=original.lineages,
        replacement_description_id=new_id,
    )


def _failed_report(*, original: LiveDescription, error: Exception) -> FailedDescriptionReport:
    # Provider/database exceptions can contain request text or connection details.
    error_type = type(error).__name__
    log.error(
        "Description repair failed description_id=%d error_type=%s",
        original.description_id,
        error_type,
    )
    return FailedDescriptionReport(
        description_id=original.description_id,
        lineages=original.lineages,
        status="repair_failed",
        reason=error_type,
    )
