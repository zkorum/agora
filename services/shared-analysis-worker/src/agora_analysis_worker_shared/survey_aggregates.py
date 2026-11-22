from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from typing import TYPE_CHECKING

import regex

from agora_analysis_worker_shared.generated_models import (
    SurveyAggregateScopeEnum,
    SurveyAggregateSuppressionReasonEnum,
    SurveyQuestionType,
)

if TYPE_CHECKING:
    from collections.abc import Callable, Iterable, Mapping, Sequence
    from uuid import UUID

PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD = 5


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
    text_value_plain_text: str | None


@dataclass(frozen=True)
class SurveyResponseSnapshot:
    participant_id: UUID
    withdrawn: bool
    answers_by_question_id: dict[int, SurveyAnswerSnapshot]


@dataclass(frozen=True)
class SurveyAggregateGroupMembership[ParticipantKey]:
    candidate_id: int
    group_id: int
    participant_keys: frozenset[ParticipantKey]


@dataclass(frozen=True)
class SurveyAggregatePopulation:
    local_index_by_user_id: Mapping[UUID, int]
    group_memberships: tuple[SurveyAggregateGroupMembership[UUID], ...]


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
class SurveyChoiceAnswer[ParticipantKey]:
    participant_key: ParticipantKey
    question_slug_id: str
    option_slug_ids: tuple[str, ...]


@dataclass(frozen=True)
class _OptionCount:
    option_slug_id: str
    count: int


def prepare_survey_choice_answers[ParticipantKey](
    *,
    config: SurveyConfigSnapshot,
    responses: Iterable[SurveyResponseSnapshot],
    participant_key_for: Callable[[UUID], ParticipantKey | None],
) -> list[SurveyChoiceAnswer[ParticipantKey]]:
    """Apply capture-time eligibility, then retain only choices under the selected key."""
    questions = [
        question
        for question in config.questions
        if question.question_type == SurveyQuestionType.choice
    ]
    answers: list[SurveyChoiceAnswer[ParticipantKey]] = []
    for response in responses:
        participant_key = participant_key_for(response.participant_id)
        if participant_key is None or response.withdrawn:
            continue
        if not config.is_optional and not is_survey_response_complete_valid(
            config=config, response=response
        ):
            continue
        for question in questions:
            answer = response.answers_by_question_id.get(question.id)
            if answer is not None and _is_valid_choice_answer(question=question, answer=answer):
                answers.append(
                    SurveyChoiceAnswer(
                        participant_key=participant_key,
                        question_slug_id=question.slug_id,
                        option_slug_ids=tuple(answer.option_slug_ids),
                    )
                )
    return answers


def _choice_questions(questions: Sequence[SurveyQuestionSnapshot]) -> list[SurveyQuestionSnapshot]:
    return sorted(
        (question for question in questions if question.question_type == SurveyQuestionType.choice),
        key=lambda question: (question.display_order, question.slug_id),
    )


def build_suppressed_survey_choice_aggregates[ParticipantKey](
    *,
    questions: Sequence[SurveyQuestionSnapshot],
    answers: Sequence[SurveyChoiceAnswer[ParticipantKey]],
    group_memberships: Sequence[SurveyAggregateGroupMembership[ParticipantKey]],
    suppression_threshold: int = PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
) -> SurveyAggregateBuildResult:
    choice_questions = _choice_questions(questions)
    question_records = [_question_record(question) for question in choice_questions]
    options = [
        _option_record(question=question, option=option)
        for question in choice_questions
        for option in _sorted_options(question)
    ]
    return SurveyAggregateBuildResult(
        questions=question_records,
        options=options,
        results=build_suppressed_survey_choice_results(
            option_slugs_by_question={
                question.slug_id: tuple(option.slug_id for option in _sorted_options(question))
                for question in choice_questions
            },
            answers=answers,
            group_memberships=group_memberships,
            suppression_threshold=suppression_threshold,
            include_overall=True,
        ),
    )


def build_suppressed_survey_choice_results[ParticipantKey](
    *,
    option_slugs_by_question: Mapping[str, Sequence[str]],
    answers: Sequence[SurveyChoiceAnswer[ParticipantKey]],
    group_memberships: Sequence[SurveyAggregateGroupMembership[ParticipantKey]],
    suppression_threshold: int,
    include_overall: bool,
) -> list[SurveyAggregateResultRecord]:
    results: list[SurveyAggregateResultRecord] = []
    answers_by_question: dict[str, list[SurveyChoiceAnswer[ParticipantKey]]] = {}
    for answer in answers:
        answers_by_question.setdefault(answer.question_slug_id, []).append(answer)

    for question_slug, option_slugs in option_slugs_by_question.items():
        valid_overall_answers = answers_by_question.get(question_slug, [])
        if include_overall:
            results.extend(
                _aggregate_block_records(
                    scope=SurveyAggregateScopeEnum.overall,
                    candidate_id=None,
                    group_id=None,
                    question_slug=question_slug,
                    option_counts=_option_counts(
                        option_slugs=option_slugs,
                        participant_answers=valid_overall_answers,
                    ),
                    denominator=len(valid_overall_answers),
                    suppression_reason=SurveyAggregateSuppressionReasonEnum.count_below_threshold,
                    suppression_threshold=suppression_threshold,
                )
            )

        for membership in group_memberships:
            group_answers = [
                participant_answer
                for participant_answer in valid_overall_answers
                if participant_answer.participant_key in membership.participant_keys
            ]
            results.extend(
                _aggregate_block_records(
                    scope=SurveyAggregateScopeEnum.opinion_group,
                    candidate_id=membership.candidate_id,
                    group_id=membership.group_id,
                    question_slug=question_slug,
                    option_counts=_option_counts(
                        option_slugs=option_slugs,
                        participant_answers=group_answers,
                    ),
                    denominator=len(group_answers),
                    suppression_reason=(
                        SurveyAggregateSuppressionReasonEnum.cluster_deductive_disclosure
                    ),
                    suppression_threshold=suppression_threshold,
                )
            )

    return results


def _question_record(question: SurveyQuestionSnapshot) -> SurveyAggregateQuestionRecord:
    return SurveyAggregateQuestionRecord(
        key=question.slug_id,
        survey_question_id=question.id,
        question_slug_id=question.slug_id,
        question_order=question.display_order,
        question_type=question.question_type,
        question_text=question.question_text,
        is_required=question.is_required,
        is_public_aggregate_suppression_enabled=(question.is_public_aggregate_suppression_enabled),
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


def _option_counts[ParticipantKey](
    *,
    option_slugs: Sequence[str],
    participant_answers: Sequence[SurveyChoiceAnswer[ParticipantKey]],
) -> list[_OptionCount]:
    counts = Counter(option for answer in participant_answers for option in answer.option_slug_ids)
    return [
        _OptionCount(option_slug_id=option_slug, count=counts[option_slug])
        for option_slug in option_slugs
    ]


def _aggregate_block_records(
    *,
    scope: SurveyAggregateScopeEnum,
    candidate_id: int | None,
    group_id: int | None,
    question_slug: str,
    option_counts: list[_OptionCount],
    denominator: int,
    suppression_reason: SurveyAggregateSuppressionReasonEnum,
    suppression_threshold: int,
) -> list[SurveyAggregateResultRecord]:
    is_suppressed = any(
        0 < option_count.count < suppression_threshold for option_count in option_counts
    )
    return [
        SurveyAggregateResultRecord(
            scope=scope,
            candidate_id=candidate_id,
            group_id=group_id,
            question_key=question_slug,
            option_key=f"{question_slug}:{option_count.option_slug_id}",
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


def is_survey_response_complete_valid(
    *,
    config: SurveyConfigSnapshot,
    response: SurveyResponseSnapshot,
) -> bool:
    return not response.withdrawn and all(
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
        return (
            min_value is not None
            and parsed_value >= min_value
            and (max_value is None or parsed_value <= max_value)
        )

    max_html_length = _optional_int(constraints.get("maxHtmlLength"))
    max_plain_text_length = _optional_int(constraints.get("maxPlainTextLength"))
    if max_html_length is None or max_plain_text_length is None:
        return False
    if len(text_value_html.encode("utf-16-le")) // 2 > max_html_length:
        return False
    plain_text = answer.text_value_plain_text or ""
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
    if constraints.get("type") != "choice":
        return False
    min_selections = _optional_int(constraints.get("minSelections"))
    if min_selections is None or min_selections < 1:
        return False
    max_selections = _optional_int(constraints.get("maxSelections"))
    if constraints.get("maxSelections") is not None and max_selections is None:
        return False
    selected_count = len(answer.option_slug_ids)
    if selected_count < min_selections:
        return False
    return max_selections is None or selected_count <= max_selections


def _optional_int(value: object) -> int | None:
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    return None
