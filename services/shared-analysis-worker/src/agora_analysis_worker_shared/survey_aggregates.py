from __future__ import annotations

import html
import logging
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

import regex

from agora_analysis_worker_shared.generated_models import (
    SurveyAggregateScopeEnum,
    SurveyAggregateSuppressionReasonEnum,
    SurveyQuestionType,
)

if TYPE_CHECKING:
    from uuid import UUID

PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD = 5
log = logging.getLogger(__name__)


@dataclass(frozen=True)
class SurveyOptionSnapshot:
    id: int
    slug_id: str
    display_order: int
    option_text: str


@dataclass(frozen=True)
class SurveyQuestionSnapshot:
    id: int
    slug_id: str
    display_order: int
    question_type: SurveyQuestionType
    question_text: str
    is_required: bool
    is_public_aggregate_suppression_enabled: bool
    current_semantic_version: int
    constraints: dict[str, object]
    options: list[SurveyOptionSnapshot]


@dataclass(frozen=True)
class SurveyConfigSnapshot:
    id: int
    current_revision: int
    is_optional: bool
    questions: list[SurveyQuestionSnapshot]


@dataclass(frozen=True)
class SurveyAnswerSnapshot:
    question_id: int
    answered_question_semantic_version: int
    option_slug_ids: list[str]
    text_value_html: str | None


@dataclass(frozen=True)
class SurveyResponseSnapshot:
    participant_id: UUID
    withdrawn: bool
    answers_by_question_id: dict[int, SurveyAnswerSnapshot]


@dataclass(frozen=True)
class SurveyAggregateGroupMembership:
    candidate_id: int
    group_id: int
    user_ids: frozenset[UUID]


@dataclass(frozen=True)
class SurveyAggregateQuestionRecord:
    key: str
    survey_question_id: int
    question_slug_id: str
    question_order: int
    question_type: SurveyQuestionType
    question_text: str
    is_required: bool
    is_public_aggregate_suppression_enabled: bool
    question_semantic_version: int


@dataclass(frozen=True)
class SurveyAggregateOptionRecord:
    question_key: str
    key: str
    survey_question_option_id: int
    option_slug_id: str
    option_order: int
    option_text: str


@dataclass(frozen=True)
class SurveyAggregateResultRecord:
    scope: SurveyAggregateScopeEnum
    candidate_id: int | None
    group_id: int | None
    question_key: str
    option_key: str
    suppressed_count: int | None
    suppressed_percentage: float | None
    full_count: int
    full_percentage: float | None
    is_suppressed: bool
    suppression_reason: SurveyAggregateSuppressionReasonEnum | None


@dataclass(frozen=True)
class SurveyAggregateBuildResult:
    questions: list[SurveyAggregateQuestionRecord]
    options: list[SurveyAggregateOptionRecord]
    results: list[SurveyAggregateResultRecord]


@dataclass(frozen=True)
class _ParticipantAnswer:
    participant_id: UUID
    answer: SurveyAnswerSnapshot


@dataclass(frozen=True)
class _OptionCount:
    option: SurveyOptionSnapshot
    count: int


def build_suppressed_survey_aggregates(
    *,
    config: SurveyConfigSnapshot,
    responses: list[SurveyResponseSnapshot],
    group_memberships: list[SurveyAggregateGroupMembership],
    suppression_threshold: int = PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
) -> SurveyAggregateBuildResult:
    return _build_survey_aggregates(
        config=config,
        responses=responses,
        group_memberships=group_memberships,
        suppression_threshold=suppression_threshold,
    )


def _build_survey_aggregates(
    *,
    config: SurveyConfigSnapshot,
    responses: list[SurveyResponseSnapshot],
    group_memberships: list[SurveyAggregateGroupMembership],
    suppression_threshold: int | None,
) -> SurveyAggregateBuildResult:
    choice_questions = sorted(
        [
            question
            for question in config.questions
            if question.question_type == SurveyQuestionType.choice
        ],
        key=lambda question: (question.display_order, question.slug_id),
    )
    counted_responses = [
        response
        for response in responses
        if not response.withdrawn
        and (config.is_optional or _is_complete_valid_response(config=config, response=response))
    ]
    questions = [_question_record(question) for question in choice_questions]
    options = [
        _option_record(question=question, option=option)
        for question in choice_questions
        for option in _sorted_options(question)
    ]
    results: list[SurveyAggregateResultRecord] = []

    for question in choice_questions:
        valid_overall_answers = _valid_answers_for_question(
            question=question,
            responses=counted_responses,
        )
        overall_counts = _option_counts(
            question=question,
            participant_answers=valid_overall_answers,
        )
        results.extend(
            _aggregate_block_records(
                scope=SurveyAggregateScopeEnum.overall,
                candidate_id=None,
                group_id=None,
                question=question,
                option_counts=overall_counts,
                denominator=len(valid_overall_answers),
                suppression_reason=(SurveyAggregateSuppressionReasonEnum.count_below_threshold),
                suppression_threshold=suppression_threshold,
            )
        )

        for membership in group_memberships:
            group_answers = [
                participant_answer
                for participant_answer in valid_overall_answers
                if participant_answer.participant_id in membership.user_ids
            ]
            results.extend(
                _aggregate_block_records(
                    scope=SurveyAggregateScopeEnum.opinion_group,
                    candidate_id=membership.candidate_id,
                    group_id=membership.group_id,
                    question=question,
                    option_counts=_option_counts(
                        question=question,
                        participant_answers=group_answers,
                    ),
                    denominator=len(group_answers),
                    suppression_reason=(
                        SurveyAggregateSuppressionReasonEnum.cluster_deductive_disclosure
                    ),
                    suppression_threshold=suppression_threshold,
                )
            )

    return SurveyAggregateBuildResult(
        questions=questions,
        options=options,
        results=results,
    )


def _question_record(question: SurveyQuestionSnapshot) -> SurveyAggregateQuestionRecord:
    return SurveyAggregateQuestionRecord(
        key=question.slug_id,
        survey_question_id=question.id,
        question_slug_id=question.slug_id,
        question_order=question.display_order,
        question_type=question.question_type,
        question_text=question.question_text,
        is_required=question.is_required,
        is_public_aggregate_suppression_enabled=(
            question.is_public_aggregate_suppression_enabled
        ),
        question_semantic_version=question.current_semantic_version,
    )


def _option_record(
    *,
    question: SurveyQuestionSnapshot,
    option: SurveyOptionSnapshot,
) -> SurveyAggregateOptionRecord:
    return SurveyAggregateOptionRecord(
        question_key=question.slug_id,
        key=f"{question.slug_id}:{option.slug_id}",
        survey_question_option_id=option.id,
        option_slug_id=option.slug_id,
        option_order=option.display_order,
        option_text=option.option_text,
    )


def _sorted_options(question: SurveyQuestionSnapshot) -> list[SurveyOptionSnapshot]:
    return sorted(question.options, key=lambda option: (option.display_order, option.slug_id))


def _valid_answers_for_question(
    *,
    question: SurveyQuestionSnapshot,
    responses: list[SurveyResponseSnapshot],
) -> list[_ParticipantAnswer]:
    valid_answers: list[_ParticipantAnswer] = []
    for response in responses:
        answer = response.answers_by_question_id.get(question.id)
        if answer is None:
            continue
        if _is_valid_choice_answer(question=question, answer=answer):
            valid_answers.append(
                _ParticipantAnswer(participant_id=response.participant_id, answer=answer)
            )
    return valid_answers


def _option_counts(
    *,
    question: SurveyQuestionSnapshot,
    participant_answers: list[_ParticipantAnswer],
) -> list[_OptionCount]:
    return [
        _OptionCount(
            option=option,
            count=sum(
                1
                for participant_answer in participant_answers
                if option.slug_id in participant_answer.answer.option_slug_ids
            ),
        )
        for option in _sorted_options(question)
    ]


def _aggregate_block_records(
    *,
    scope: SurveyAggregateScopeEnum,
    candidate_id: int | None,
    group_id: int | None,
    question: SurveyQuestionSnapshot,
    option_counts: list[_OptionCount],
    denominator: int,
    suppression_reason: SurveyAggregateSuppressionReasonEnum,
    suppression_threshold: int | None,
) -> list[SurveyAggregateResultRecord]:
    is_suppressed = False
    if suppression_threshold is not None:
        is_suppressed = any(
            0 < option_count.count < suppression_threshold for option_count in option_counts
        )
    return [
        SurveyAggregateResultRecord(
            scope=scope,
            candidate_id=candidate_id,
            group_id=group_id,
            question_key=question.slug_id,
            option_key=f"{question.slug_id}:{option_count.option.slug_id}",
            suppressed_count=None if is_suppressed else option_count.count,
            suppressed_percentage=None
            if is_suppressed
            else _format_percentage(numerator=option_count.count, denominator=denominator),
            full_count=option_count.count,
            full_percentage=_format_percentage(
                numerator=option_count.count,
                denominator=denominator,
            ),
            is_suppressed=is_suppressed,
            suppression_reason=(suppression_reason if is_suppressed else None),
        )
        for option_count in option_counts
    ]


def _format_percentage(*, numerator: int, denominator: int) -> float | None:
    if denominator == 0:
        return None
    return round((numerator / denominator) * 100, 2)


def _is_complete_valid_response(
    *,
    config: SurveyConfigSnapshot,
    response: SurveyResponseSnapshot,
) -> bool:
    return all(
        _is_question_completed(question=question, response=response)
        for question in config.questions
        if question.is_required
    )


def _is_question_completed(
    *,
    question: SurveyQuestionSnapshot,
    response: SurveyResponseSnapshot,
) -> bool:
    answer = response.answers_by_question_id.get(question.id)
    if answer is None:
        return False
    if question.question_type == SurveyQuestionType.choice:
        return _is_valid_choice_answer(question=question, answer=answer)
    return _is_valid_free_text_answer(question=question, answer=answer)


def _normalize_counted_text(value: str) -> str:
    return re.sub(r"\n+", "\n", value).strip("\n")


def _convert_html_to_counted_text(value: str) -> str:
    text_with_newlines = re.sub(
        r"</(?:p|li|div|h[1-6])>",
        "\n",
        value,
        flags=re.IGNORECASE,
    )
    text_with_newlines = re.sub(
        r"<br\s*/?>",
        "\n",
        text_with_newlines,
        flags=re.IGNORECASE,
    )
    plain_text = re.sub(r"<[^>]*>", "", text_with_newlines)
    plain_text = re.sub(r"<[^>]*$", "", plain_text)
    return _normalize_counted_text(html.unescape(plain_text))


def _convert_html_to_counted_text_fallback(value: str) -> str:
    text_with_newlines = re.sub(
        r"</(?:p|li|div|h[1-6])>",
        "\n",
        value,
        flags=re.IGNORECASE,
    )
    text_with_newlines = re.sub(
        r"<br\s*/?>",
        "\n",
        text_with_newlines,
        flags=re.IGNORECASE,
    )
    plain_text = re.sub(r"<[^>]*>", "", text_with_newlines)
    plain_text = re.sub(r"<[^>]*$", "", plain_text)
    return _normalize_counted_text(plain_text)


def _html_to_counted_text(value: str) -> str:
    try:
        return _convert_html_to_counted_text(value)
    except Exception:
        log.warning(
            "HTML-to-text conversion failed; using best-effort text (HTML length: %d)",
            len(value),
            exc_info=True,
        )
        return _convert_html_to_counted_text_fallback(value)


def _is_valid_free_text_answer(
    *,
    question: SurveyQuestionSnapshot,
    answer: SurveyAnswerSnapshot,
) -> bool:
    if answer.answered_question_semantic_version != question.current_semantic_version:
        return False
    constraints = question.constraints
    if constraints.get("type") != "free_text":
        return False
    text_value_html = answer.text_value_html or ""
    if constraints.get("inputMode") == "integer":
        if re.fullmatch(r"[0-9]+", text_value_html) is None:
            return False
        parsed_value = int(text_value_html)
        if parsed_value > 9_007_199_254_740_991:
            return False
        min_value = _optional_int(constraints.get("minValue"))
        max_value = _optional_int(constraints.get("maxValue"))
        return min_value is not None and parsed_value >= min_value and (
            max_value is None or parsed_value <= max_value
        )

    max_html_length = _optional_int(constraints.get("maxHtmlLength"))
    max_plain_text_length = _optional_int(constraints.get("maxPlainTextLength"))
    if max_html_length is None or max_plain_text_length is None:
        return False
    if len(text_value_html.encode("utf-16-le")) // 2 > max_html_length:
        return False
    plain_text = _html_to_counted_text(text_value_html)
    visible_text = regex.sub(
        r"[\p{Cc}\p{Default_Ignorable_Code_Point}]",
        "",
        plain_text,
    ).strip()
    if not visible_text:
        return False
    min_plain_text_length = max(
        _optional_int(constraints.get("minPlainTextLength")) or 0,
        1,
    )
    plain_text_length = len(regex.findall(r"\X", plain_text))
    return min_plain_text_length <= plain_text_length <= max_plain_text_length


def _is_valid_choice_answer(
    *,
    question: SurveyQuestionSnapshot,
    answer: SurveyAnswerSnapshot,
) -> bool:
    if question.question_type != SurveyQuestionType.choice:
        return False
    if answer.answered_question_semantic_version != question.current_semantic_version:
        return False
    if len(set(answer.option_slug_ids)) != len(answer.option_slug_ids):
        return False
    option_slug_ids = {option.slug_id for option in question.options}
    if any(option_slug_id not in option_slug_ids for option_slug_id in answer.option_slug_ids):
        return False

    constraints = question.constraints
    min_selections = _optional_int(constraints.get("minSelections")) or 1
    max_selections = _optional_int(constraints.get("maxSelections"))
    selected_count = len(answer.option_slug_ids)
    if selected_count < min_selections:
        return False
    return max_selections is None or selected_count <= max_selections


def _optional_int(value: object) -> int | None:
    if isinstance(value, int):
        return value
    return None
