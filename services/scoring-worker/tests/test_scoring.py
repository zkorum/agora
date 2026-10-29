"""Tests for the standard BWS and pairwise scoring pipelines."""

from __future__ import annotations

from scoring_worker.db import ComparisonRow
from scoring_worker.entity_mapping import SolidagoEntityScore
from scoring_worker.observations import PairwiseObservation
from scoring_worker.scoring import (
    ConversationScoringOutput,
    score_comparisons,
    score_pairwise_observations,
    to_scoring_results,
)


def _row(
    user: int,
    best: str,
    worst: str,
    items: list[str],
) -> ComparisonRow:
    return ComparisonRow(
        user_idx=user,
        best_slug_id=best,
        worst_slug_id=worst,
        candidate_set=items,
    )


# 3 users, 4 items. Users 0,2 agree (B>C), user 1 disagrees (C>B).
IDS = ["A", "B", "C", "D"]
COMPS: list[ComparisonRow] = [
    _row(0, "A", "D", IDS),
    _row(0, "B", "C", ["B", "C", "D"]),
    _row(1, "A", "D", IDS),
    _row(1, "C", "B", ["B", "C", "D"]),
    _row(2, "A", "D", IDS),
    _row(2, "B", "C", ["B", "C", "D"]),
]


def _score(
    *,
    entity_ids: list[str] = IDS,
    comparisons: list[ComparisonRow] = COMPS,
    trust_scores: dict[int, float] | None = None,
) -> dict[str, float]:
    output = _score_raw(
        entity_ids=entity_ids,
        comparisons=comparisons,
        trust_scores=trust_scores,
    )
    assert output is not None
    return {r.entity_id: r.score for r in output.global_scores}


def _score_raw(
    *,
    entity_ids: list[str] = IDS,
    comparisons: list[ComparisonRow] = COMPS,
    trust_scores: dict[int, float] | None = None,
) -> ConversationScoringOutput | None:
    return score_comparisons(
        entity_ids=entity_ids,
        comparisons=comparisons,
        trust_scores=trust_scores,
    )


# --- Edge cases ---


class TestEdgeCases:
    def test_empty_comparisons(self) -> None:
        assert _score_raw(comparisons=[]) is None

    def test_single_entity(self) -> None:
        assert _score_raw(entity_ids=["A"]) is None

    def test_comparisons_reference_unknown_items(self) -> None:
        assert _score_raw(entity_ids=["X", "Y"]) is None

    def test_two_items_one_vote(self) -> None:
        comps = [_row(0, "X", "Y", ["X", "Y"])]
        output = score_comparisons(
            entity_ids=["X", "Y"],
            comparisons=comps,
        )
        assert output is not None
        results = output.global_scores
        assert len(results) == 2
        assert results[0].entity_id == "X"
        assert results[0].score > results[1].score
        # Per-user scores should also be present
        assert len(output.user_scores) == 1
        assert 0 in output.user_scores

    def test_single_user(self) -> None:
        comps = [_row(0, "A", "B", ["A", "B"])]
        output = score_comparisons(
            entity_ids=["A", "B"],
            comparisons=comps,
        )
        assert output is not None
        results = output.global_scores
        assert len(results) == 2
        assert results[0].score > results[1].score


# --- Default pipeline ---


class TestDefault:
    def test_shape_and_invariants(self) -> None:
        output = _score_raw()
        assert output is not None
        results = output.global_scores
        assert len(results) == 4
        assert {r.entity_id for r in results} == set(IDS)
        assert [r.score for r in results] == sorted((r.score for r in results), reverse=True)
        # Per-user scores: 3 users
        assert len(output.user_scores) == 3

    def test_majority_preference_wins(self) -> None:
        """2 users prefer B>C, 1 prefers C>B. B should rank above C."""
        scores = _score()
        assert scores["B"] > scores["C"]

    def test_unanimous_top_and_bottom(self) -> None:
        """All users agree A is best and D is worst."""
        scores = _score()
        assert scores["A"] == max(scores.values())
        assert scores["D"] == min(scores.values())


# --- Trust scores ---


class TestTrustScores:
    def test_high_trust_shifts_ranking(self) -> None:
        """User 1 (C>B) with 100x trust should shift C up vs B."""
        uniform = _score()
        weighted = _score(trust_scores={0: 0.1, 1: 10.0, 2: 0.1})
        assert weighted["C"] - weighted["B"] > uniform["C"] - uniform["B"]

    def test_missing_users_default_to_one(self) -> None:
        scores = _score(trust_scores={0: 1.0})
        assert len(scores) == 4


class TestPairwiseIntegration:
    def test_pairwise_observations_score_with_majority_preference(self) -> None:
        output = score_pairwise_observations(
            entity_ids=["A", "B", "C"],
            observations=[
                PairwiseObservation(
                    user_id=0,
                    option_a_slug_id="A",
                    option_b_slug_id="B",
                    comparison=-1.0,
                    comparison_max=1.0,
                ),
                PairwiseObservation(
                    user_id=1,
                    option_a_slug_id="A",
                    option_b_slug_id="B",
                    comparison=-1.0,
                    comparison_max=1.0,
                ),
                PairwiseObservation(
                    user_id=2,
                    option_a_slug_id="A",
                    option_b_slug_id="C",
                    comparison=-1.0,
                    comparison_max=1.0,
                ),
            ],
        )

        assert output is not None
        scores = {result.entity_id: result.score for result in output.global_scores}
        assert scores["A"] == max(scores.values())


class TestScoreNormalization:
    def test_raw_conversion_preserves_units(self) -> None:
        results = to_scoring_results(
            [
                SolidagoEntityScore(
                    entity_id="A",
                    score=10.0,
                    uncertainty_left=2.0,
                    uncertainty_right=4.0,
                ),
                SolidagoEntityScore(
                    entity_id="B",
                    score=5.0,
                    uncertainty_left=1.0,
                    uncertainty_right=1.5,
                ),
            ]
        )

        result_by_id = {result.entity_id: result for result in results}
        assert result_by_id["A"].score == 10.0
        assert result_by_id["B"].score == 5.0
        assert result_by_id["A"].uncertainty_left == 2.0
        assert result_by_id["A"].uncertainty_right == 4.0
