from __future__ import annotations

from dataclasses import replace

import pytest
from agora_language.detection import DetectedLanguage, DetectionUnavailable, UnknownLanguage

from agora_analysis_worker_shared import description_language
from agora_analysis_worker_shared.bedrock_label_summary import (
    LabelSummary,
    ParsedLabelSummaryOutput,
)
from agora_analysis_worker_shared.description_generation import (
    DescriptionProviderFailure,
    MissingDescription,
    generate_english_descriptions,
)
from agora_analysis_worker_shared.description_input import (
    ConversationDescriptionInput,
    GroupDescriptionCorrection,
    GroupDescriptionInput,
)
from agora_analysis_worker_shared.description_language import (
    DescriptionLanguageIssue,
    EnglishDescription,
    check_description_language,
)

FRENCH = (
    "Ce groupe prône l'autorité parentale, la cohérence éducative et des limites strictes "
    "(ennui, écrans). Ils rejettent l'autonomie décisionnelle des enfants au profit "
    "d'un cadre familial structuré."
)
ENGLISH = (
    "This group supports parental authority, consistent parenting, and firm limits on screen time. "
    "They favor a structured family environment."
)


def description(summary: str) -> LabelSummary:
    return LabelSummary(reasoning=None, label="Traditionalists", summary=summary)


def conversation() -> ConversationDescriptionInput:
    return ConversationDescriptionInput(
        conversation_title="Parenting",
        conversation_body=None,
        groups=[
            GroupDescriptionInput(group_key=key, representative_opinions=[]) for key in ("0", "1")
        ],
    )


@pytest.mark.parametrize(
    "summary",
    [
        ENGLISH,
        "This group supports funding for École Polytechnique and the local schools.",
        "This group supports free public transit for all residents.",
    ],
)
def test_english_summary_with_ambiguous_label_is_accepted(summary: str) -> None:
    result = check_description_language(description(summary))
    assert result == EnglishDescription(label="Traditionalists", summary=summary)


@pytest.mark.parametrize(
    ("summary", "expected_reason"),
    [
        (FRENCH, "language_mismatch"),
        (ENGLISH + " Les enfants décident seuls.", "language_mismatch"),
        (ENGLISH + " Les enfants choisissent.", "language_mismatch"),
        (
            "Este grupo defiende la autoridad de los padres y las normas claras en la familia.",
            "language_unknown",
        ),
        (
            "Diese Gruppe unterstützt klare Regeln und eine verlässliche "
            "Erziehung durch die Eltern.",
            "language_mismatch",
        ),
    ],
)
def test_foreign_and_mixed_summaries_are_rejected(summary: str, expected_reason: str) -> None:
    result = check_description_language(description(summary))
    assert isinstance(result, DescriptionLanguageIssue)
    assert result.reason == expected_reason


def test_clear_foreign_label_is_not_hidden_by_english_summary() -> None:
    result = check_description_language(
        replace(description(ENGLISH), label="Défenseurs de l'autorité parentale")
    )
    assert isinstance(result, DescriptionLanguageIssue)
    assert result.reason == "language_mismatch"
    assert result.field == "label"


@pytest.mark.parametrize("text", ["", "   ", "x" * 1001])
def test_invalid_content_never_reaches_language_acceptance(text: str) -> None:
    result = check_description_language(description(text))
    assert isinstance(result, DescriptionLanguageIssue)
    assert result.reason == "invalid_content"


def test_secondary_detection_resolves_short_english_summary() -> None:
    calls: list[str] = []

    def secondary(text: str) -> DetectedLanguage:
        calls.append(text)
        return DetectedLanguage(language_code="en", confidence=0.99, provider="google_translate")

    result = check_description_language(
        description("Supports transit."), secondary_detector=secondary
    )
    assert isinstance(result, EnglishDescription)
    assert calls == ["Supports transit."]


def test_secondary_unknown_and_outage_remain_distinguishable() -> None:
    unknown = check_description_language(
        description("Supports transit."), secondary_detector=lambda _: UnknownLanguage()
    )
    unavailable = check_description_language(
        description("Supports transit."),
        secondary_detector=lambda _: DetectionUnavailable(TimeoutError("detection timed out")),
    )
    assert isinstance(unknown, DescriptionLanguageIssue)
    assert unknown.reason == "language_unknown"
    assert isinstance(unavailable, DescriptionLanguageIssue)
    assert unavailable.reason == "detection_unavailable"


def test_long_foreign_proper_name_is_ambiguous_and_can_use_secondary_detection() -> None:
    summary = (
        "This group supports funding for École nationale supérieure des beaux arts "
        "and better access to public education."
    )
    local_result = check_description_language(description(summary))
    assert isinstance(local_result, DescriptionLanguageIssue)
    assert local_result.reason == "language_unknown"
    verified = check_description_language(
        description(summary),
        secondary_detector=lambda _: DetectedLanguage(
            language_code="en", confidence=0.99, provider="google_translate"
        ),
    )
    assert isinstance(verified, EnglishDescription)


def test_secondary_english_remains_usable_when_local_detector_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def unavailable(_: str) -> DetectionUnavailable:
        return DetectionUnavailable(RuntimeError("local model unavailable"))

    def unavailable_spans() -> None:
        raise RuntimeError("local model unavailable")

    monkeypatch.setattr(description_language, "detect_locally", unavailable)
    monkeypatch.setattr(description_language, "local_detector", unavailable_spans)
    result = check_description_language(
        description(ENGLISH),
        secondary_detector=lambda _: DetectedLanguage(
            language_code="en", confidence=0.99, provider="google_translate"
        ),
    )
    assert isinstance(result, EnglishDescription)


def test_corrects_only_failed_group_and_preserves_successful_pair() -> None:
    requests: list[ConversationDescriptionInput] = []

    def generate(request: ConversationDescriptionInput) -> ParsedLabelSummaryOutput:
        requests.append(request)
        if len(requests) == 1:
            return ParsedLabelSummaryOutput(
                mode="strict",
                clusters={
                    "0": description(ENGLISH),
                    "1": description(FRENCH),
                },
            )
        assert [group.group_key for group in request.groups] == ["1"]
        assert request.groups == [
            GroupDescriptionCorrection(group_key="1", draft=description(FRENCH))
        ]
        return ParsedLabelSummaryOutput(mode="strict", clusters={"1": description(ENGLISH)})

    result = generate_english_descriptions(generate=generate, conversation=conversation())
    assert len(requests) == 2
    assert result.groups == {
        key: EnglishDescription(label="Traditionalists", summary=ENGLISH) for key in ("0", "1")
    }


def test_uncorrected_group_is_not_saved_as_a_label_only_result() -> None:
    calls = 0

    def generate(request: ConversationDescriptionInput) -> ParsedLabelSummaryOutput:
        nonlocal calls
        calls += 1
        return ParsedLabelSummaryOutput(
            mode="strict",
            clusters={
                group.group_key: description(ENGLISH if group.group_key == "0" else FRENCH)
                for group in request.groups
            },
        )

    result = generate_english_descriptions(generate=generate, conversation=conversation())
    assert calls == 2
    assert isinstance(result.groups["0"], EnglishDescription)
    failed = result.groups["1"]
    assert isinstance(failed, DescriptionLanguageIssue)
    assert failed.reason == "language_mismatch"


def test_provider_timeout_preserves_successful_groups_and_stops_retries() -> None:
    calls = 0

    def generate(_: ConversationDescriptionInput) -> ParsedLabelSummaryOutput:
        nonlocal calls
        calls += 1
        if calls == 1:
            return ParsedLabelSummaryOutput(mode="strict", clusters={"0": description(ENGLISH)})
        raise TimeoutError("provider timed out")

    result = generate_english_descriptions(generate=generate, conversation=conversation())
    assert isinstance(result.groups["0"], EnglishDescription)
    assert result.groups["1"] == DescriptionProviderFailure(
        reason="provider_timeout", error_type="TimeoutError"
    )
    assert calls == 2


def test_timeout_without_accepted_output_is_released_to_worker() -> None:
    calls = 0

    def generate(_: ConversationDescriptionInput) -> ParsedLabelSummaryOutput:
        nonlocal calls
        calls += 1
        raise TimeoutError("provider timed out")

    with pytest.raises(TimeoutError):
        generate_english_descriptions(generate=generate, conversation=conversation())
    assert calls == 1


def test_missing_groups_have_explicit_outcomes_after_bounded_retry() -> None:
    calls = 0

    def generate(_: ConversationDescriptionInput) -> ParsedLabelSummaryOutput:
        nonlocal calls
        calls += 1
        return ParsedLabelSummaryOutput(mode="strict", clusters={})

    result = generate_english_descriptions(generate=generate, conversation=conversation())
    assert calls == 2
    assert result.groups == {"0": MissingDescription(), "1": MissingDescription()}


def test_provider_errors_do_not_log_private_exception_details(
    caplog: pytest.LogCaptureFixture,
) -> None:
    def generate(_: ConversationDescriptionInput) -> ParsedLabelSummaryOutput:
        raise ValueError("private request content")

    with pytest.raises(ValueError):
        generate_english_descriptions(generate=generate, conversation=conversation())
    assert "error_type=ValueError" in caplog.text
    assert "private request content" not in caplog.text
