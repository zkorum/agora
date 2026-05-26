from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import pandas as pd
import pytest

from agora_worker_shared.analysis_compute import RedDwarfContractError, compute_analysis_bundle
from agora_worker_shared.db import (
    OpinionGroupConfigRecord,
    OpinionGroupSpecRecord,
    OpinionGroupVariantRecord,
)
from agora_worker_shared.generated_models import (
    AnalysisInsufficientDataReasonEnum,
    AnalysisResultOutcomeEnum,
    OpinionGroupCandidateHiddenReasonEnum,
)
from agora_worker_shared.input_snapshot import VoteInputRow, prepare_input_snapshot

USER_A = UUID("00000000-0000-0000-0000-00000000000a")
USER_B = UUID("00000000-0000-0000-0000-00000000000b")
USER_C = UUID("00000000-0000-0000-0000-00000000000c")
USER_D = UUID("00000000-0000-0000-0000-00000000000d")


@dataclass(frozen=True)
class FakeRedDwarfResult:
    participants_df: pd.DataFrame
    statements_df: pd.DataFrame
    group_comment_stats: pd.DataFrame
    repness: dict[int, list[dict[str, object]]]
    consensus: dict[str, list[dict[str, object]]]


@dataclass(frozen=True)
class FakeRedDwarfSuccess:
    result: object
    outcome: str = AnalysisResultOutcomeEnum.success.value


@dataclass(frozen=True)
class FakeRedDwarfCandidateSuccess:
    group_count: int
    result: FakeRedDwarfResult
    outcome: str = AnalysisResultOutcomeEnum.success.value
    silhouette_score: float | None = None


@dataclass(frozen=True)
class FakeRedDwarfCandidatesResult:
    candidates: list[FakeRedDwarfCandidateSuccess]


def _config() -> OpinionGroupConfigRecord:
    return OpinionGroupConfigRecord(
        spec=OpinionGroupSpecRecord(
            id=1,
            min_clusterable_participants=2,
            min_votes_per_participant=2,
            max_group_count=3,
        ),
        variants=[
            OpinionGroupVariantRecord(id=20, opinion_group_spec_id=1, group_count=2),
            OpinionGroupVariantRecord(id=30, opinion_group_spec_id=1, group_count=3),
        ],
    )


def _snapshot_rows() -> list[VoteInputRow]:
    rows: list[VoteInputRow] = []
    participant_votes = [
        (USER_A, ["agree", "agree", "disagree"]),
        (USER_B, ["agree", "agree", "disagree"]),
        (USER_C, ["disagree", "disagree", "agree"]),
        (USER_D, ["disagree", "disagree", "agree"]),
    ]
    for user_id, votes in participant_votes:
        for opinion_id, vote in enumerate(votes, start=100):
            rows.append(
                VoteInputRow(
                    conversation_id=10,
                    data_generation=3,
                    user_id=user_id,
                    opinion_id=opinion_id,
                    opinion_content_id=opinion_id + 1000,
                    vote=vote,
                )
            )
    return rows


def _fake_result(group_count: int) -> FakeRedDwarfResult:
    cluster_ids = [0, 0, 1, 1] if group_count == 2 else [0, 0, 1, 2]
    participants_df = pd.DataFrame(
        {
            "x": [0.0, 0.1, 10.0, 10.1],
            "y": [0.0, 0.1, 10.0, 10.1],
            "to_cluster": [True, True, True, True],
            "cluster_id": cluster_ids,
        },
        index=pd.Index([0, 1, 2, 3], name="participant_id"),
    )
    statements_df = pd.DataFrame(
        {
            "priority": [0.9, 0.7, 0.5],
            "extremity": [0.2, 0.1, 0.3],
            "group-aware-consensus-agree": [0.8, 0.6, 0.4],
            "group-aware-consensus-disagree": [0.2, 0.4, 0.6],
        },
        index=pd.Index([0, 1, 2], name="statement_id"),
    )
    group_comment_stat_tuples = [(0, 0), (1, 1)] if group_count == 2 else [(0, 0), (1, 1), (2, 2)]
    group_comment_stats = pd.DataFrame(
        {
            "na": [2, 1] if group_count == 2 else [2, 1, 1],
            "nd": [0, 0] if group_count == 2 else [0, 1, 0],
            "ns": [2, 2] if group_count == 2 else [2, 2, 1],
            "pa": [0.75, 0.75] if group_count == 2 else [0.75, 0.75, 0.75],
        },
        index=pd.MultiIndex.from_tuples(
            group_comment_stat_tuples,
            names=["group_id", "statement_id"],
        ),
    )
    repness: dict[int, list[dict[str, object]]] = {
        0: [
            {
                "tid": 0,
                "repful-for": "agree",
                "p-success": 0.75,
                "n-success": 2,
            }
        ],
        1: [
            {
                "tid": 2,
                "repful-for": "agree",
                "p-success": 0.75,
                "n-success": 2,
            }
        ],
    }
    if group_count == 3:
        repness[2] = [
            {
                "tid": 1,
                "repful-for": "disagree",
                "p-success": 0.75,
                "n-success": 1,
            }
        ]
    return FakeRedDwarfResult(
        participants_df=participants_df,
        statements_df=statements_df,
        group_comment_stats=group_comment_stats,
        repness=repness,
        consensus={"agree": [{"tid": 0, "p-success": 0.8}], "disagree": []},
    )


def _result_with_groups(*, cluster_ids: list[int]) -> FakeRedDwarfResult:
    result = _fake_result(len(set(cluster_ids)))
    x_values = [float(cluster_id * 10) for cluster_id in cluster_ids]
    y_values = [float(cluster_id * 10) for cluster_id in cluster_ids]
    return FakeRedDwarfResult(
        participants_df=pd.DataFrame(
            {
                "x": x_values,
                "y": y_values,
                "to_cluster": [True for _cluster_id in cluster_ids],
                "cluster_id": cluster_ids,
            },
            index=pd.Index(range(len(cluster_ids)), name="participant_id"),
        ),
        statements_df=result.statements_df,
        group_comment_stats=result.group_comment_stats,
        repness=result.repness,
        consensus=result.consensus,
    )


def test_compute_analysis_bundle_is_testable_with_injected_runner() -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=3,
        rows=_snapshot_rows(),
    )
    called_candidate_group_counts: list[list[int] | None] = []

    def fake_runner(
        *,
        votes: list[dict[str, int]],
        min_user_vote_threshold: int,
        max_group_count: int,
        force_group_count: int | None = None,
        candidate_group_counts: list[int] | None = None,
    ) -> FakeRedDwarfSuccess:
        called_candidate_group_counts.append(candidate_group_counts)
        assert len(votes) == 12
        assert min_user_vote_threshold == 2
        assert max_group_count == 3
        assert force_group_count is None
        assert candidate_group_counts == [2, 3]
        return FakeRedDwarfSuccess(
            FakeRedDwarfCandidatesResult(
                candidates=[
                    FakeRedDwarfCandidateSuccess(
                        group_count=2,
                        result=_fake_result(2),
                    ),
                    FakeRedDwarfCandidateSuccess(
                        group_count=3,
                        result=_fake_result(3),
                    ),
                ],
            ),
        )

    bundle = compute_analysis_bundle(
        snapshot=snapshot,
        config=_config(),
        run_red_dwarf_pipeline=fake_runner,
    )

    assert called_candidate_group_counts == [[2, 3]]
    assert bundle.outcome == AnalysisResultOutcomeEnum.success
    assert len(bundle.candidates) == 2
    assert bundle.snapshot_opinions[0].num_agrees == 2
    assert bundle.snapshot_opinions[0].routing_priority == 0.9
    assert bundle.candidates[0].opinion_metrics[0].majority_probability_success == 0.8
    assert bundle.candidates[0].opinion_metrics[0].agreement_rank == 1
    assert bundle.candidates[0].groups[0].local_participant_indexes == [0, 1]
    assert bundle.candidates[0].groups[0].representative_opinions[0].local_opinion_index == 0
    assert bundle.candidates[0].groups[0].opinion_stats[0].num_agrees == 2
    assert bundle.candidates[0].groups[1].opinion_stats[0].num_passes == 1
    representative_opinion = bundle.candidates[0].groups[0].opinion_stats[0].representative_opinion
    assert representative_opinion is not None
    assert representative_opinion.agreement_type == "agree"


def test_compute_analysis_bundle_short_circuits_insufficient_data() -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=3,
        rows=[
            VoteInputRow(
                conversation_id=10,
                data_generation=3,
                user_id=USER_A,
                opinion_id=100,
                opinion_content_id=1100,
                vote="agree",
            )
        ],
    )

    def runner_that_should_not_be_called(
        *,
        votes: list[dict[str, int]],
        min_user_vote_threshold: int,
        max_group_count: int,
        force_group_count: int | None = None,
        candidate_group_counts: list[int] | None = None,
    ) -> FakeRedDwarfSuccess:
        raise AssertionError("red-dwarf should not run for insufficient data")

    bundle = compute_analysis_bundle(
        snapshot=snapshot,
        config=_config(),
        run_red_dwarf_pipeline=runner_that_should_not_be_called,
    )

    assert bundle.outcome == AnalysisResultOutcomeEnum.insufficient_data
    assert (
        bundle.outcome_reason
        == AnalysisInsufficientDataReasonEnum.not_enough_clusterable_participants
    )
    assert all(
        candidate.outcome == AnalysisResultOutcomeEnum.insufficient_data
        for candidate in bundle.candidates
    )


def test_singleton_group_candidates_are_recorded_but_hidden() -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=3,
        rows=_snapshot_rows(),
    )

    def fake_runner(
        *,
        votes: list[dict[str, int]],
        min_user_vote_threshold: int,
        max_group_count: int,
        force_group_count: int | None = None,
        candidate_group_counts: list[int] | None = None,
    ) -> FakeRedDwarfSuccess:
        assert force_group_count == 3
        assert candidate_group_counts is None
        return FakeRedDwarfSuccess(_fake_result(force_group_count))

    bundle = compute_analysis_bundle(
        snapshot=snapshot,
        config=OpinionGroupConfigRecord(
            spec=OpinionGroupSpecRecord(
                id=1,
                min_clusterable_participants=2,
                min_votes_per_participant=2,
                max_group_count=3,
            ),
            variants=[OpinionGroupVariantRecord(id=30, opinion_group_spec_id=1, group_count=3)],
        ),
        run_red_dwarf_pipeline=fake_runner,
    )

    assert bundle.outcome == AnalysisResultOutcomeEnum.success
    assert bundle.candidates[0].outcome == AnalysisResultOutcomeEnum.success
    assert bundle.candidates[0].assessment is not None
    assert bundle.candidates[0].assessment.selection_score is None
    assert bundle.candidates[0].assessment.hidden_reason == (
        OpinionGroupCandidateHiddenReasonEnum.singleton_group
    )


def test_candidate_assessment_records_cv_balance_and_selection_score() -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=3,
        rows=_snapshot_rows(),
    )

    def fake_runner(
        *,
        votes: list[dict[str, int]],
        min_user_vote_threshold: int,
        max_group_count: int,
        force_group_count: int | None = None,
        candidate_group_counts: list[int] | None = None,
    ) -> FakeRedDwarfSuccess:
        return FakeRedDwarfSuccess(_fake_result(force_group_count or 2))

    bundle = compute_analysis_bundle(
        snapshot=snapshot,
        config=OpinionGroupConfigRecord(
            spec=OpinionGroupSpecRecord(
                id=1,
                min_clusterable_participants=2,
                min_votes_per_participant=2,
                max_group_count=2,
            ),
            variants=[OpinionGroupVariantRecord(id=20, opinion_group_spec_id=1, group_count=2)],
        ),
        run_red_dwarf_pipeline=fake_runner,
    )

    assessment = bundle.candidates[0].assessment
    assert assessment is not None
    assert assessment.hidden_reason is None
    assert assessment.coefficient_of_variation == 0
    assert assessment.balance_score == 1
    assert assessment.silhouette_score is not None
    assert assessment.selection_score is not None


def test_imbalanced_candidate_records_cv_without_hiding() -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=3,
        rows=_snapshot_rows(),
    )

    def fake_runner(
        *,
        votes: list[dict[str, int]],
        min_user_vote_threshold: int,
        max_group_count: int,
        force_group_count: int | None = None,
        candidate_group_counts: list[int] | None = None,
    ) -> FakeRedDwarfSuccess:
        return FakeRedDwarfSuccess(_result_with_groups(cluster_ids=[0] * 40 + [1, 1]))

    bundle = compute_analysis_bundle(
        snapshot=snapshot,
        config=OpinionGroupConfigRecord(
            spec=OpinionGroupSpecRecord(
                id=1,
                min_clusterable_participants=2,
                min_votes_per_participant=2,
                max_group_count=2,
            ),
            variants=[OpinionGroupVariantRecord(id=20, opinion_group_spec_id=1, group_count=2)],
        ),
        run_red_dwarf_pipeline=fake_runner,
    )

    assessment = bundle.candidates[0].assessment
    assert assessment is not None
    assert assessment.hidden_reason is None
    assert assessment.coefficient_of_variation is not None
    assert assessment.coefficient_of_variation > 0.9
    assert assessment.selection_score is not None


def test_missing_group_representative_opinions_is_contract_error() -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=3,
        rows=_snapshot_rows(),
    )

    def fake_runner(
        *,
        votes: list[dict[str, int]],
        min_user_vote_threshold: int,
        max_group_count: int,
        force_group_count: int | None = None,
        candidate_group_counts: list[int] | None = None,
    ) -> FakeRedDwarfSuccess:
        result = _fake_result(force_group_count or 2)
        return FakeRedDwarfSuccess(
            FakeRedDwarfResult(
                participants_df=result.participants_df,
                statements_df=result.statements_df,
                group_comment_stats=result.group_comment_stats,
                repness={0: result.repness[0]},
                consensus=result.consensus,
            )
        )

    with pytest.raises(RedDwarfContractError, match="missing repness"):
        compute_analysis_bundle(
            snapshot=snapshot,
            config=OpinionGroupConfigRecord(
                spec=OpinionGroupSpecRecord(
                    id=1,
                    min_clusterable_participants=2,
                    min_votes_per_participant=2,
                    max_group_count=2,
                ),
                variants=[OpinionGroupVariantRecord(id=20, opinion_group_spec_id=1, group_count=2)],
            ),
            run_red_dwarf_pipeline=fake_runner,
        )


def test_group_comment_stats_ns_is_total_votes_not_passes() -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=3,
        rows=_snapshot_rows(),
    )

    def fake_runner(
        *,
        votes: list[dict[str, int]],
        min_user_vote_threshold: int,
        max_group_count: int,
        force_group_count: int | None = None,
        candidate_group_counts: list[int] | None = None,
    ) -> FakeRedDwarfSuccess:
        assert len(votes) == 12
        assert min_user_vote_threshold == 2
        assert max_group_count == 3
        assert force_group_count == 3
        assert candidate_group_counts is None

        cluster_ids = [0 for _index in range(10)]
        cluster_ids.extend(1 for _index in range(26))
        cluster_ids.extend(2 for _index in range(20))
        participants_df = pd.DataFrame(
            {
                "x": [float(cluster_id * 10) for cluster_id in cluster_ids],
                "y": [float(cluster_id * 10) for cluster_id in cluster_ids],
                "to_cluster": [True for _cluster_id in cluster_ids],
                "cluster_id": cluster_ids,
            },
            index=pd.Index(range(len(cluster_ids)), name="participant_id"),
        )
        statements_df = pd.DataFrame(
            {
                "priority": [0.9],
                "extremity": [0.1],
                "group-aware-consensus-agree": [0.8],
                "group-aware-consensus-disagree": [0.2],
            },
            index=pd.Index([0], name="statement_id"),
        )
        group_comment_stats = pd.DataFrame(
            {
                "na": [0, 10, 14],
                "nd": [10, 10, 3],
                "ns": [10, 26, 20],
                "pa": [0.75, 0.75, 0.75],
            },
            index=pd.MultiIndex.from_tuples(
                [(0, 0), (1, 0), (2, 0)],
                names=["group_id", "statement_id"],
            ),
        )
        repness: dict[int, list[dict[str, object]]] = {
            0: [
                {
                    "tid": 0,
                    "repful-for": "disagree",
                    "p-success": 0.75,
                    "n-success": 10,
                }
            ],
            1: [
                {
                    "tid": 0,
                    "repful-for": "agree",
                    "p-success": 0.75,
                    "n-success": 10,
                }
            ],
            2: [
                {
                    "tid": 0,
                    "repful-for": "agree",
                    "p-success": 0.75,
                    "n-success": 14,
                }
            ],
        }

        return FakeRedDwarfSuccess(
            FakeRedDwarfResult(
                participants_df=participants_df,
                statements_df=statements_df,
                group_comment_stats=group_comment_stats,
                repness=repness,
                consensus={"agree": [{"tid": 0, "p-success": 0.8}], "disagree": []},
            )
        )

    bundle = compute_analysis_bundle(
        snapshot=snapshot,
        config=OpinionGroupConfigRecord(
            spec=OpinionGroupSpecRecord(
                id=1,
                min_clusterable_participants=2,
                min_votes_per_participant=2,
                max_group_count=3,
            ),
            variants=[OpinionGroupVariantRecord(id=30, opinion_group_spec_id=1, group_count=3)],
        ),
        run_red_dwarf_pipeline=fake_runner,
    )

    group_stats = [group.opinion_stats[0] for group in bundle.candidates[0].groups]
    assert [stats.num_agrees for stats in group_stats] == [0, 10, 14]
    assert [stats.num_disagrees for stats in group_stats] == [10, 10, 3]
    assert [stats.num_passes for stats in group_stats] == [0, 6, 3]
