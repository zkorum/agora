from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from itertools import combinations
from math import isclose, isfinite
from random import Random

import pytest

from scoring_worker.db import ComparisonRow
from scoring_worker.scoring import score_comparisons


def binary_votes(
    *, supporters: int, opponents: int, opponent_repetitions: int = 1
) -> list[ComparisonRow]:
    return [
        ComparisonRow(
            user_idx=user,
            best_slug_id="a" if user < supporters else "b",
            worst_slug_id="b" if user < supporters else "a",
            candidate_set=["a", "b"],
        )
        for user in range(supporters + opponents)
        for _ in range(1 if user < supporters else opponent_repetitions)
    ]


def community_scores(*, items: list[str], votes: list[ComparisonRow]) -> dict[str, float]:
    output = score_comparisons(entity_ids=items, comparisons=votes)
    assert output is not None
    for score in output.global_scores:
        assert isfinite(score.score)
        assert isfinite(score.uncertainty_left) and score.uncertainty_left >= 0
        assert isfinite(score.uncertainty_right) and score.uncertainty_right >= 0
    return {score.entity_id: score.score for score in output.global_scores}


@pytest.mark.parametrize("supporters", [0, 1, 20, 49, 50, 51, 80, 99, 100])
def test_two_item_community_follows_participant_majority(supporters: int) -> None:
    scores = community_scores(
        items=["a", "b"], votes=binary_votes(supporters=supporters, opponents=100 - supporters)
    )
    if supporters == 50:
        assert isclose(scores["a"], scores["b"], rel_tol=0, abs_tol=1e-6)
    elif supporters > 50:
        assert scores["a"] > scores["b"]
    else:
        assert scores["a"] < scores["b"]


@pytest.mark.parametrize("reverse", [False, True])
def test_balanced_complete_evidence_recovers_unanimous_order(reverse: bool) -> None:
    items = [f"i{index}" for index in range(6)]
    votes = [
        ComparisonRow(
            user_idx=user,
            best_slug_id=task[-1] if reverse else task[0],
            worst_slug_id=task[0] if reverse else task[-1],
            candidate_set=list(task),
        )
        for user in range(12)
        for task in combinations(items, 3)
    ]
    scores = community_scores(items=items, votes=votes)
    assert sorted(items, key=lambda item: scores[item], reverse=True) == (
        items[::-1] if reverse else items
    )


def test_repeated_tasks_do_not_turn_one_opponent_into_a_hundred_participants() -> None:
    scores = community_scores(
        items=["a", "b"], votes=binary_votes(supporters=99, opponents=1, opponent_repetitions=1000)
    )
    assert scores["a"] > scores["b"]


def test_entity_and_user_ids_and_task_order_do_not_determine_scores() -> None:
    items = [f"i{index}" for index in range(8)]
    rng = Random(20260915)
    votes: list[ComparisonRow] = []
    for user in range(16):
        for _ in range(12):
            task = sorted(rng.sample(items, 4))
            votes.append(
                ComparisonRow(
                    user_idx=user, best_slug_id=task[0], worst_slug_id=task[-1], candidate_set=task
                )
            )
    expected = community_scores(items=items, votes=votes)
    names = {item: f"renamed-{len(items) - index}" for index, item in enumerate(items)}
    transformed = community_scores(
        items=[names[item] for item in reversed(items)],
        votes=[
            ComparisonRow(
                user_idx=1000 - vote.user_idx,
                best_slug_id=names[vote.best_slug_id],
                worst_slug_id=names[vote.worst_slug_id],
                candidate_set=[names[item] for item in reversed(vote.candidate_set)],
            )
            for vote in reversed(votes)
        ],
    )
    for item in items:
        assert isclose(transformed[names[item]], expected[item], rel_tol=0, abs_tol=2e-3)


def test_recomputation_does_not_retain_removed_participants() -> None:
    votes = binary_votes(supporters=10, opponents=0)
    expected = community_scores(items=["a", "b"], votes=votes)
    community_scores(items=["a", "b"], votes=binary_votes(supporters=10, opponents=30))
    restored = community_scores(items=["a", "b"], votes=votes)
    for item in expected:
        assert isclose(restored[item], expected[item], rel_tol=0, abs_tol=1e-9)


def test_parallel_conversations_do_not_share_scoring_state() -> None:
    with ThreadPoolExecutor(max_workers=2) as pool:
        positive = pool.submit(
            community_scores, items=["a", "b"], votes=binary_votes(supporters=20, opponents=0)
        )
        negative = pool.submit(
            community_scores, items=["a", "b"], votes=binary_votes(supporters=0, opponents=20)
        )
        first, second = positive.result(), negative.result()
    assert first["a"] > first["b"]
    assert second["b"] > second["a"]
