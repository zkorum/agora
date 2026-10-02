from __future__ import annotations

from dataclasses import replace
from typing import Literal

import pytest
from sqlalchemy import DefaultClause, MetaData, create_engine, func, select
from sqlalchemy.orm import Session

from agora_analysis_worker_shared.analysis_compute import ComputedAnalysisBundle
from agora_analysis_worker_shared.db import ClaimedWorkItem, persist_survey_aggregate_snapshots
from agora_analysis_worker_shared.generated_models import (
    AnalysisResultOutcomeEnum,
    Base,
    SurveyAggregateOption,
    SurveyAggregateQuestion,
    SurveyAggregateResult,
    SurveyAggregateSnapshot,
    SurveyQuestionType,
)
from agora_analysis_worker_shared.input_snapshot import prepare_input_snapshot
from agora_analysis_worker_shared.survey_aggregates import (
    SurveyConfigSnapshot,
    SurveyOptionSnapshot,
    SurveyQuestionSnapshot,
    SurveyResponseSnapshot,
)


@pytest.mark.parametrize("scenario", ["free_text", "empty", "no_options", "choice", "mixed"])
def test_survey_aggregates_commit_without_default_row_inserts(
    monkeypatch: pytest.MonkeyPatch,
    scenario: Literal["free_text", "empty", "no_options", "choice", "mixed"],
) -> None:
    engine = create_engine("sqlite:///:memory:")
    metadata = MetaData()
    for name in (
        "survey_aggregate_snapshot",
        "survey_aggregate_question",
        "survey_aggregate_option",
        "survey_aggregate_result",
    ):
        table = Base.metadata.tables[name].to_metadata(metadata)
        # Generated models omit PostgreSQL timestamp defaults; reproduce those in SQLite.
        table.c.created_at.server_default = DefaultClause(func.current_timestamp())
    metadata.create_all(engine)

    free_text_question = SurveyQuestionSnapshot(
        id=1,
        slug_id="question",
        display_order=1,
        question_type=SurveyQuestionType.free_text,
        question_text="What do you think?",
        is_required=False,
        is_public_aggregate_suppression_enabled=True,
        current_semantic_version=1,
        constraints={},
        options=[],
    )
    choice_question = replace(
        free_text_question,
        question_type=SurveyQuestionType.choice,
        options=[SurveyOptionSnapshot(id=1, slug_id="option01", display_order=1, option_text="A")],
    )
    config = SurveyConfigSnapshot(id=1, current_revision=1, is_optional=True, questions=[])
    configs = {10: replace(config, questions=[free_text_question])}
    expected_questions = 0
    expected_options = 0
    if scenario == "empty":
        configs[10] = config
    elif scenario == "no_options":
        configs[10] = replace(config, questions=[replace(choice_question, options=[])])
        expected_questions = 1
    elif scenario == "choice":
        configs[10] = replace(config, questions=[choice_question])
        expected_questions = 1
        expected_options = 1
    elif scenario == "mixed":
        configs[20] = replace(config, id=2, questions=[choice_question])
        expected_questions = 1
        expected_options = 1

    def fetch_configs(
        _session: Session, *, conversation_ids: list[int]
    ) -> dict[int, SurveyConfigSnapshot]:
        return {conversation_id: configs[conversation_id] for conversation_id in conversation_ids}

    def fetch_responses(
        _session: Session, *, conversation_ids: list[int]
    ) -> dict[int, list[SurveyResponseSnapshot]]:
        return {}

    monkeypatch.setattr(
        "agora_analysis_worker_shared.db._fetch_active_survey_configs", fetch_configs
    )
    monkeypatch.setattr("agora_analysis_worker_shared.db._fetch_survey_responses", fetch_responses)
    claims = [
        ClaimedWorkItem(
            id=conversation_id,
            conversation_id=conversation_id,
            conversation_slug_id=f"test{conversation_id}",
            opinion_group_spec_id=1,
            data_generation=1,
            attempt_count=1,
            lease_token="test-lease",
            persisted_analysis_snapshot_id=None,
        )
        for conversation_id in configs
    ]
    prepared = {
        conversation_id: prepare_input_snapshot(
            conversation_id=conversation_id, data_generation=1, rows=[]
        )
        for conversation_id in configs
    }
    bundles = {
        conversation_id: ComputedAnalysisBundle(
            conversation_id=conversation_id,
            data_generation=1,
            outcome=AnalysisResultOutcomeEnum.insufficient_data,
            outcome_reason=None,
            candidates=[],
            snapshot_opinions=[],
        )
        for conversation_id in configs
    }
    with Session(engine) as session:
        snapshot_ids = persist_survey_aggregate_snapshots(
            session,
            claims=claims,
            snapshot_id_by_conversation_id={conversation_id: 1 for conversation_id in configs},
            prepared_input_snapshots_by_conversation_id=prepared,
            bundles_by_conversation_id=bundles,
            candidate_id_by_conversation_variant={},
            artifact_candidate_ids_by_pair={},
            group_id_by_candidate_key={},
        )
        session.commit()

    with Session(engine) as session:
        assert set(snapshot_ids) == set(configs)
        assert session.scalar(select(func.count()).select_from(SurveyAggregateSnapshot)) == len(
            configs
        )
        assert session.scalar(select(func.count()).select_from(SurveyAggregateQuestion)) == (
            expected_questions
        )
        assert session.scalar(select(func.count()).select_from(SurveyAggregateOption)) == (
            expected_options
        )
        results = session.scalars(select(SurveyAggregateResult)).all()
        assert len(results) == expected_options
        for result in results:
            assert result.full_count == 0
            assert result.full_percentage is None
            assert result.candidate_id is None
            assert result.group_id is None
        for question in session.scalars(select(SurveyAggregateQuestion)):
            expected_conversation_id = 20 if scenario == "mixed" else 10
            assert question.survey_aggregate_snapshot_id == snapshot_ids[expected_conversation_id]
    engine.dispose()
