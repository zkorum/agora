from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING

import pytest

from agora_analysis_worker_shared.description_generation import DescriptionGenerationResult
from agora_analysis_worker_shared.description_language import EnglishDescription
from agora_analysis_worker_shared.description_repair import LiveDescription, RepairLineage
from agora_analysis_worker_shared.description_repair_service import (
    AcceptedDescriptionReport,
    ApplyDescriptionRepairs,
    ChangedDescriptionReport,
    FailedDescriptionReport,
    InspectDescriptions,
    RepairedDescriptionReport,
    UnrepairedDescriptionReport,
    WrongLocaleReport,
    inspect_or_repair_description,
)
from agora_analysis_worker_shared.generated_models import DisplayLanguageCode

if TYPE_CHECKING:
    from agora_analysis_worker_shared.description_input import ConversationDescriptionInput

ENGLISH = (
    "This group supports parental authority, consistent parenting, and firm limits on screen time."
)
FRENCH = "Ce groupe défend une éducation structurée, des règles claires et la cohérence parentale."


def original(
    *, summary: str, locale: DisplayLanguageCode = DisplayLanguageCode.en
) -> LiveDescription:
    return LiveDescription(
        description_id=501,
        locale=locale,
        label="Traditionalists",
        summary=summary,
        lineages=(
            RepairLineage(lineage_id=301, conversation_id=10, conversation_slug_id="example"),
        ),
    )


def unexpected_generation(_: ConversationDescriptionInput) -> DescriptionGenerationResult:
    pytest.fail("This description must not trigger generation")


def unexpected_replacement(*, original: LiveDescription, replacement: EnglishDescription) -> int:
    pytest.fail("This description must not be replaced")


def test_report_mode_contains_metadata_but_no_original_text() -> None:
    report = inspect_or_repair_description(
        original(summary=FRENCH), mode=InspectDescriptions(), secondary_detector=None
    )
    assert isinstance(report, UnrepairedDescriptionReport)
    assert report.status == "wrong_language"
    assert FRENCH not in str(asdict(report))


def test_accepted_description_does_not_invoke_provider_or_database() -> None:
    report = inspect_or_repair_description(
        original(summary=ENGLISH),
        mode=ApplyDescriptionRepairs(
            generate=unexpected_generation, replace=unexpected_replacement
        ),
        secondary_detector=None,
    )
    assert isinstance(report, AcceptedDescriptionReport)


def test_ambiguous_description_is_reported_without_rewriting_it() -> None:
    report = inspect_or_repair_description(
        original(summary="Supports transit."),
        mode=ApplyDescriptionRepairs(
            generate=unexpected_generation, replace=unexpected_replacement
        ),
        secondary_detector=None,
    )
    assert isinstance(report, UnrepairedDescriptionReport)
    assert report.status == "unresolved"


def test_wrong_locale_is_corrected_without_an_llm_call() -> None:
    source = original(summary=ENGLISH, locale=DisplayLanguageCode.fr)
    inspection = inspect_or_repair_description(
        source, mode=InspectDescriptions(), secondary_detector=None
    )
    assert isinstance(inspection, WrongLocaleReport)
    calls: list[int] = []

    def replace_description(*, original: LiveDescription, replacement: EnglishDescription) -> int:
        calls.append(original.description_id)
        assert replacement.summary == ENGLISH
        return 502

    report = inspect_or_repair_description(
        source,
        mode=ApplyDescriptionRepairs(generate=unexpected_generation, replace=replace_description),
        secondary_detector=None,
    )
    assert isinstance(report, RepairedDescriptionReport)
    assert report.replacement_description_id == 502
    assert calls == [501]


def test_failed_correction_never_replaces_the_original() -> None:
    report = inspect_or_repair_description(
        original(summary=FRENCH),
        mode=ApplyDescriptionRepairs(
            generate=lambda _: DescriptionGenerationResult(groups={}),
            replace=unexpected_replacement,
        ),
        secondary_detector=None,
    )
    assert isinstance(report, FailedDescriptionReport)
    assert report.status == "correction_failed"


def test_concurrent_change_is_reported_as_skipped() -> None:
    def replace_description(*, original: LiveDescription, replacement: EnglishDescription) -> None:
        return None

    report = inspect_or_repair_description(
        original(summary=FRENCH),
        mode=ApplyDescriptionRepairs(
            generate=lambda _: DescriptionGenerationResult(
                groups={"0": EnglishDescription(label="Traditionalists", summary=ENGLISH)}
            ),
            replace=replace_description,
        ),
        secondary_detector=None,
    )
    assert isinstance(report, ChangedDescriptionReport)


def test_provider_exception_details_are_not_logged_or_reported(
    caplog: pytest.LogCaptureFixture,
) -> None:
    def generate(_: ConversationDescriptionInput) -> DescriptionGenerationResult:
        raise RuntimeError("private request text and connection credentials")

    report = inspect_or_repair_description(
        original(summary=FRENCH),
        mode=ApplyDescriptionRepairs(generate=generate, replace=unexpected_replacement),
        secondary_detector=None,
    )
    assert isinstance(report, FailedDescriptionReport)
    assert report.reason == "RuntimeError"
    assert "private request text" not in caplog.text
    assert "connection credentials" not in str(asdict(report))
