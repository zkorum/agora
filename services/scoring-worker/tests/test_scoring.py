"""Tests for score_comparisons with trust_scores and group_sources (COCM)."""

from __future__ import annotations

from dataclasses import dataclass

from scoring_worker.cocm_voting import GroupSource, UserGroupEntry
from scoring_worker.scoring import score_comparisons


@dataclass(frozen=True)
class FakeRow:
    """Stand-in for ComparisonRow (avoids DB import)."""

    user_idx: int
    best_slug_id: str
    worst_slug_id: str
    candidate_set: list[str]


def _row(
    user: int, best: str, worst: str, items: list[str],
) -> FakeRow:
    return FakeRow(
        user_idx=user,
        best_slug_id=best,
        worst_slug_id=worst,
        candidate_set=items,
    )


# 3 users, 4 items. Users 0,2 agree (B>C), user 1 disagrees (C>B).
IDS = ["A", "B", "C", "D"]
COMPS: list[FakeRow] = [
    _row(0, "A", "D", IDS),
    _row(0, "B", "C", ["B", "C", "D"]),
    _row(1, "A", "D", IDS),
    _row(1, "C", "B", ["B", "C", "D"]),
    _row(2, "A", "D", IDS),
    _row(2, "B", "C", ["B", "C", "D"]),
]

COLLUDING_GROUPS = [
    GroupSource(
        source_id="org",
        memberships=[
            UserGroupEntry(user_id=0, group_id=1),
            UserGroupEntry(user_id=2, group_id=1),
            UserGroupEntry(user_id=1, group_id=2),
        ],
    ),
]


def _score(**kw):  # type: ignore[no-untyped-def]
    return {
        r.entity_id: r.score
        for r in score_comparisons(
            entity_ids=kw.pop("entity_ids", IDS),
            comparisons=kw.pop("comparisons", COMPS),
            **kw,
        )
    }


def _score_raw(**kw):  # type: ignore[no-untyped-def]
    return score_comparisons(
        entity_ids=kw.pop("entity_ids", IDS),
        comparisons=kw.pop("comparisons", COMPS),
        **kw,
    )


# --- Edge cases ---


class TestEdgeCases:
    def test_empty_comparisons(self) -> None:
        assert _score_raw(comparisons=[]) == []

    def test_single_entity(self) -> None:
        assert _score_raw(entity_ids=["A"]) == []

    def test_comparisons_reference_unknown_items(self) -> None:
        assert _score_raw(entity_ids=["X", "Y"]) == []

    def test_two_items_one_vote(self) -> None:
        comps = [_row(0, "X", "Y", ["X", "Y"])]
        results = score_comparisons(
            entity_ids=["X", "Y"], comparisons=comps,
        )
        assert len(results) == 2
        assert results[0].entity_id == "X"
        assert results[0].score == 1.0
        assert results[1].score == 0.0

    def test_single_user(self) -> None:
        comps = [_row(0, "A", "B", ["A", "B"])]
        results = score_comparisons(
            entity_ids=["A", "B"], comparisons=comps,
        )
        assert len(results) == 2
        assert results[0].score > results[1].score


# --- Default pipeline ---


class TestDefault:
    def test_shape_and_invariants(self) -> None:
        results = _score_raw()
        assert len(results) == 4
        assert {r.entity_id for r in results} == set(IDS)
        scores = [r.score for r in results]
        assert all(0.0 <= s <= 1.0 for s in scores)
        assert scores == sorted(scores, reverse=True)

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
        assert (
            weighted["C"] - weighted["B"]
            > uniform["C"] - uniform["B"]
        )

    def test_missing_users_default_to_one(self) -> None:
        scores = _score(trust_scores={0: 1.0})
        assert len(scores) == 4


# --- COCM ---


class TestCOCM:
    def test_colluding_group_attenuated(self) -> None:
        """Users 0,2 collude (same group, agree B>C).
        COCM attenuates them, shifting C up relative to B."""
        no_cocm = _score()
        with_cocm = _score(group_sources=COLLUDING_GROUPS)
        assert (
            with_cocm["C"] - with_cocm["B"]
            > no_cocm["C"] - no_cocm["B"]
        )

    def test_trust_and_cocm_compose(self) -> None:
        scores = _score(
            trust_scores={0: 2.0, 1: 1.0, 2: 2.0},
            group_sources=COLLUDING_GROUPS,
        )
        assert len(scores) == 4
        assert all(0.0 <= s <= 1.0 for s in scores.values())

    def test_empty_group_sources_matches_default(self) -> None:
        default = _score_raw()
        empty = _score_raw(group_sources=[])
        for d, e in zip(default, empty, strict=True):
            assert d.entity_id == e.entity_id
            assert abs(d.score - e.score) < 0.01
