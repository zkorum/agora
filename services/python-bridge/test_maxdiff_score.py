"""TDD tests for the /maxdiff-score endpoint.

Tests the full scoring pipeline: BWS/pairwise input → entity mapping →
Solidago pipeline → normalized scores with string entity IDs.

Tests written FIRST per TDD methodology.
"""

import pytest
import json
from flask import Flask

from main import app as flask_app


@pytest.fixture()
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def score_request(
    client,
    *,
    entity_ids: list[str],
    bws_comparisons: list[dict] | None = None,
    pairwise_comparisons: list[dict] | None = None,
    user_weights: list[dict] | None = None,
    group_sources: list[dict] | None = None,
    group_combination_strategy: str = "composite",
) -> tuple[int, dict]:
    """POST to /maxdiff-score and return (status_code, json_body)."""
    body: dict = {
        "conversation_slug_id": "test-convo",
        "entity_ids": entity_ids,
    }
    if bws_comparisons is not None:
        body["bws_comparisons"] = bws_comparisons
    if pairwise_comparisons is not None:
        body["pairwise_comparisons"] = pairwise_comparisons
    if user_weights is not None:
        body["user_weights"] = user_weights
    if group_sources is not None:
        body["group_sources"] = group_sources
        body["group_combination_strategy"] = group_combination_strategy

    resp = client.post(
        "/maxdiff-score",
        data=json.dumps(body),
        content_type="application/json",
    )
    return resp.status_code, resp.get_json()


# ===========================================================================
# Input validation
# ===========================================================================


class TestInputValidation:
    def test_rejects_neither_bws_nor_pairwise(self, client) -> None:
        status, body = score_request(client, entity_ids=["A", "B"])
        assert status == 400

    def test_rejects_both_bws_and_pairwise(self, client) -> None:
        status, body = score_request(
            client,
            entity_ids=["A", "B"],
            bws_comparisons=[{"user_id": 0, "best": "A", "worst": "B", "candidate_set": ["A", "B"]}],
            pairwise_comparisons=[{"user_id": 0, "entity_a": "A", "entity_b": "B", "comparison": 1.0, "comparison_max": 1.0}],
        )
        assert status == 400


# ===========================================================================
# BWS input mode
# ===========================================================================


class TestBWSScoring:
    def test_basic_bws_scoring(self, client) -> None:
        """Two items, one BWS vote: A>B. A should score higher."""
        status, body = score_request(
            client,
            entity_ids=["A", "B"],
            bws_comparisons=[
                {"user_id": 0, "best": "A", "worst": "B", "candidate_set": ["A", "B"]},
            ],
        )
        assert status == 200
        scores = body["scores"]
        assert len(scores) == 2
        score_by_id = {s["entity_id"]: s["score"] for s in scores}
        assert score_by_id["A"] > score_by_id["B"]

    def test_scores_are_normalized_0_to_1(self, client) -> None:
        status, body = score_request(
            client,
            entity_ids=["A", "B", "C"],
            bws_comparisons=[
                {"user_id": 0, "best": "A", "worst": "C", "candidate_set": ["A", "B", "C"]},
            ],
        )
        assert status == 200
        for s in body["scores"]:
            assert 0.0 <= s["score"] <= 1.0

    def test_scores_sorted_descending(self, client) -> None:
        status, body = score_request(
            client,
            entity_ids=["A", "B", "C"],
            bws_comparisons=[
                {"user_id": 0, "best": "A", "worst": "C", "candidate_set": ["A", "B", "C"]},
            ],
        )
        assert status == 200
        scores = [s["score"] for s in body["scores"]]
        assert scores == sorted(scores, reverse=True)

    def test_response_has_uncertainty(self, client) -> None:
        status, body = score_request(
            client,
            entity_ids=["A", "B"],
            bws_comparisons=[
                {"user_id": 0, "best": "A", "worst": "B", "candidate_set": ["A", "B"]},
            ],
        )
        assert status == 200
        for s in body["scores"]:
            assert "uncertainty_left" in s
            assert "uncertainty_right" in s
            assert isinstance(s["uncertainty_left"], (int, float))
            assert isinstance(s["uncertainty_right"], (int, float))

    def test_entity_ids_are_strings(self, client) -> None:
        """Output entity_ids must be the original string slugIds, not ints."""
        status, body = score_request(
            client,
            entity_ids=["y4c2yrE", "bdw35_M"],
            bws_comparisons=[
                {"user_id": 0, "best": "y4c2yrE", "worst": "bdw35_M",
                 "candidate_set": ["y4c2yrE", "bdw35_M"]},
            ],
        )
        assert status == 200
        ids = {s["entity_id"] for s in body["scores"]}
        assert ids == {"y4c2yrE", "bdw35_M"}

    def test_multi_user_bws(self, client) -> None:
        """Multiple users with opposing preferences. Score should reflect majority."""
        status, body = score_request(
            client,
            entity_ids=["A", "B"],
            bws_comparisons=[
                # 3 users prefer A
                {"user_id": 0, "best": "A", "worst": "B", "candidate_set": ["A", "B"]},
                {"user_id": 1, "best": "A", "worst": "B", "candidate_set": ["A", "B"]},
                {"user_id": 2, "best": "A", "worst": "B", "candidate_set": ["A", "B"]},
                # 1 user prefers B
                {"user_id": 3, "best": "B", "worst": "A", "candidate_set": ["A", "B"]},
            ],
        )
        assert status == 200
        score_by_id = {s["entity_id"]: s["score"] for s in body["scores"]}
        assert score_by_id["A"] > score_by_id["B"]

    def test_empty_comparisons_returns_empty(self, client) -> None:
        status, body = score_request(
            client,
            entity_ids=["A", "B"],
            bws_comparisons=[],
        )
        assert status == 200
        assert body["scores"] == []


# ===========================================================================
# Pairwise input mode (future UX)
# ===========================================================================


class TestPairwiseScoring:
    def test_basic_pairwise_scoring(self, client) -> None:
        status, body = score_request(
            client,
            entity_ids=["A", "B"],
            pairwise_comparisons=[
                {"user_id": 0, "entity_a": "A", "entity_b": "B",
                 "comparison": 1.0, "comparison_max": 1.0},
            ],
        )
        assert status == 200
        score_by_id = {s["entity_id"]: s["score"] for s in body["scores"]}
        assert score_by_id["A"] > score_by_id["B"]

    def test_pairwise_multi_user(self, client) -> None:
        status, body = score_request(
            client,
            entity_ids=["A", "B"],
            pairwise_comparisons=[
                {"user_id": 0, "entity_a": "A", "entity_b": "B", "comparison": 1.0, "comparison_max": 1.0},
                {"user_id": 1, "entity_a": "B", "entity_b": "A", "comparison": 1.0, "comparison_max": 1.0},
            ],
        )
        assert status == 200
        # Tied: scores should be equal (or very close)
        score_by_id = {s["entity_id"]: s["score"] for s in body["scores"]}
        assert abs(score_by_id["A"] - score_by_id["B"]) < 0.1


# ===========================================================================
# Trust weights
# ===========================================================================


class TestTrustWeights:
    def test_higher_trust_user_has_more_influence(self, client) -> None:
        """User 0 (trust=10) prefers A, user 1 (trust=1) prefers B. A should win."""
        status, body = score_request(
            client,
            entity_ids=["A", "B"],
            bws_comparisons=[
                {"user_id": 0, "best": "A", "worst": "B", "candidate_set": ["A", "B"]},
                {"user_id": 1, "best": "B", "worst": "A", "candidate_set": ["A", "B"]},
            ],
            user_weights=[
                {"user_id": 0, "weight": 10.0},
                {"user_id": 1, "weight": 1.0},
            ],
        )
        assert status == 200
        score_by_id = {s["entity_id"]: s["score"] for s in body["scores"]}
        assert score_by_id["A"] > score_by_id["B"]

    def test_equal_weights_is_default(self, client) -> None:
        """Without user_weights, all users have equal influence."""
        # Tied: 1 user prefers A, 1 prefers B
        status, body = score_request(
            client,
            entity_ids=["A", "B"],
            bws_comparisons=[
                {"user_id": 0, "best": "A", "worst": "B", "candidate_set": ["A", "B"]},
                {"user_id": 1, "best": "B", "worst": "A", "candidate_set": ["A", "B"]},
            ],
        )
        assert status == 200
        score_by_id = {s["entity_id"]: s["score"] for s in body["scores"]}
        assert abs(score_by_id["A"] - score_by_id["B"]) < 0.1
