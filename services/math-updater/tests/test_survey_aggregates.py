from __future__ import annotations

from uuid import UUID

from math_updater.generated_models import (
    SurveyAggregateScopeEnum,
    SurveyAggregateSuppressionReasonEnum,
    SurveyQuestionType,
)
from math_updater.survey_aggregates import (
    SurveyAggregateGroupMembership,
    SurveyAnswerSnapshot,
    SurveyConfigSnapshot,
    SurveyOptionSnapshot,
    SurveyQuestionSnapshot,
    SurveyResponseSnapshot,
    build_suppressed_survey_aggregates,
)

USER_1 = UUID("00000000-0000-0000-0000-000000000001")
USER_2 = UUID("00000000-0000-0000-0000-000000000002")
USER_3 = UUID("00000000-0000-0000-0000-000000000003")
USER_4 = UUID("00000000-0000-0000-0000-000000000004")
USER_5 = UUID("00000000-0000-0000-0000-000000000005")


def _question() -> SurveyQuestionSnapshot:
    return SurveyQuestionSnapshot(
        id=100,
        slug_id="q1",
        display_order=1,
        question_type=SurveyQuestionType.choice,
        question_text="Pick one",
        is_required=True,
        current_semantic_version=2,
        constraints={"type": "choice", "minSelections": 1, "maxSelections": 1},
        options=[
            SurveyOptionSnapshot(id=200, slug_id="a", display_order=1, option_text="A"),
            SurveyOptionSnapshot(id=201, slug_id="b", display_order=2, option_text="B"),
        ],
    )


def _config(*, is_optional: bool = False) -> SurveyConfigSnapshot:
    return SurveyConfigSnapshot(
        id=1,
        current_revision=3,
        is_optional=is_optional,
        questions=[_question()],
    )


def _response(
    *,
    participant_id: UUID,
    option_slug_ids: list[str],
    withdrawn: bool = False,
    semantic_version: int = 2,
) -> SurveyResponseSnapshot:
    return SurveyResponseSnapshot(
        participant_id=participant_id,
        withdrawn=withdrawn,
        answers_by_question_id={
            100: SurveyAnswerSnapshot(
                question_id=100,
                answered_question_semantic_version=semantic_version,
                option_slug_ids=option_slug_ids,
                text_value_html=None,
            )
        },
    )


def test_build_suppressed_survey_aggregates_suppresses_small_overall_counts() -> None:
    result = build_suppressed_survey_aggregates(
        config=_config(),
        responses=[
            _response(participant_id=USER_1, option_slug_ids=["a"]),
            _response(participant_id=USER_2, option_slug_ids=["a"]),
            _response(participant_id=USER_3, option_slug_ids=["b"]),
        ],
        group_memberships=[],
    )

    assert len(result.questions) == 1
    assert len(result.options) == 2
    assert [record.count for record in result.results] == [None, None]
    assert {record.is_suppressed for record in result.results} == {True}
    assert {record.suppression_reason for record in result.results} == {
        SurveyAggregateSuppressionReasonEnum.count_below_threshold
    }


def test_build_suppressed_survey_aggregates_persists_unsuppressed_percentages() -> None:
    result = build_suppressed_survey_aggregates(
        config=_config(),
        responses=[
            _response(participant_id=USER_1, option_slug_ids=["a"]),
            _response(participant_id=USER_2, option_slug_ids=["a"]),
            _response(participant_id=USER_3, option_slug_ids=["a"]),
            _response(participant_id=USER_4, option_slug_ids=["a"]),
            _response(participant_id=USER_5, option_slug_ids=["a"]),
        ],
        group_memberships=[],
    )

    assert [(record.count, record.percentage) for record in result.results] == [
        (5, 100.0),
        (0, 0.0),
    ]


def test_build_suppressed_survey_aggregates_adds_group_scope_rows() -> None:
    result = build_suppressed_survey_aggregates(
        config=_config(),
        responses=[
            _response(participant_id=USER_1, option_slug_ids=["a"]),
            _response(participant_id=USER_2, option_slug_ids=["a"]),
            _response(participant_id=USER_3, option_slug_ids=["a"]),
            _response(participant_id=USER_4, option_slug_ids=["a"]),
            _response(participant_id=USER_5, option_slug_ids=["a"]),
        ],
        group_memberships=[
            SurveyAggregateGroupMembership(
                candidate_id=10,
                group_id=20,
                user_ids=frozenset({USER_1, USER_2}),
            )
        ],
    )

    group_rows = [
        record
        for record in result.results
        if record.scope == SurveyAggregateScopeEnum.opinion_group
    ]
    assert len(group_rows) == 2
    assert {record.candidate_id for record in group_rows} == {10}
    assert {record.group_id for record in group_rows} == {20}
    assert {record.suppression_reason for record in group_rows} == {
        SurveyAggregateSuppressionReasonEnum.cluster_deductive_disclosure
    }


def test_build_suppressed_survey_aggregates_excludes_withdrawn_and_stale_answers() -> None:
    result = build_suppressed_survey_aggregates(
        config=_config(is_optional=True),
        responses=[
            _response(participant_id=USER_1, option_slug_ids=["a"], withdrawn=True),
            _response(participant_id=USER_2, option_slug_ids=["a"], semantic_version=1),
            _response(participant_id=USER_3, option_slug_ids=["b"]),
        ],
        group_memberships=[],
    )

    assert [record.count for record in result.results] == [None, None]
    assert {record.is_suppressed for record in result.results} == {True}
