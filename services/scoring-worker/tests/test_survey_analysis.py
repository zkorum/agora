from __future__ import annotations

from scoring_worker.db import (
    SurveyQuestionAnalysisRecord,
    SurveyStoredAnswerAnalysisRecord,
    derive_survey_gate_status_for_analysis,
    is_survey_gate_status_eligible_for_analysis,
)


def test_derive_survey_gate_status_marks_invalidated_answers_as_needs_update() -> None:
    question = SurveyQuestionAnalysisRecord(
        question_id=1,
        question_type="choice",
        current_semantic_version=2,
        is_required=True,
        constraints={"type": "choice", "minSelections": 1, "maxSelections": 1},
        option_slug_ids=("yes", "no"),
    )

    status = derive_survey_gate_status_for_analysis(
        has_survey=True,
        questions=[question],
        answers_by_question_id={
            1: SurveyStoredAnswerAnalysisRecord(
                answered_question_semantic_version=1,
                text_value_html=None,
                option_slug_ids=("yes",),
            )
        },
        withdrawn_at=None,
    )

    assert status == "needs_update"


def test_withdrawn_survey_is_not_eligible_for_analysis() -> None:
    assert not is_survey_gate_status_eligible_for_analysis(survey_gate_status="withdrawn")
    assert is_survey_gate_status_eligible_for_analysis(survey_gate_status="complete_valid")


def test_optional_survey_is_eligible_regardless_of_status() -> None:
    assert is_survey_gate_status_eligible_for_analysis(
        survey_gate_status="withdrawn",
        is_optional=True,
    )
    assert is_survey_gate_status_eligible_for_analysis(
        survey_gate_status="needs_update",
        is_optional=True,
    )


def test_optional_only_survey_is_analysis_eligible_without_response() -> None:
    question = SurveyQuestionAnalysisRecord(
        question_id=2,
        question_type="choice",
        current_semantic_version=1,
        is_required=False,
        constraints={"type": "choice", "minSelections": 1, "maxSelections": 1},
        option_slug_ids=("a", "b"),
    )

    status = derive_survey_gate_status_for_analysis(
        has_survey=True,
        questions=[question],
        answers_by_question_id={},
        withdrawn_at=None,
    )

    assert status == "complete_valid"
