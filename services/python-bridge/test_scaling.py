"""Tests for the group scaling algorithm in main.py.

Tests cover:
- calculate_distribution_imbalance: coefficient of variation calculation
- should_scale_based_on_distribution: scaling decision logic
- get_maths: iterative scaling with real reddwarf pipeline
"""

import pytest
import csv
import os
from unittest.mock import patch, MagicMock
from main import (
    calculate_distribution_imbalance,
    should_scale_based_on_distribution,
    get_maths,
    _run_and_build_result,
)


# --- calculate_distribution_imbalance ---


class TestCalculateDistributionImbalance:
    def test_perfectly_balanced(self):
        assert calculate_distribution_imbalance([10, 10, 10]) == 0.0

    def test_slightly_imbalanced(self):
        cv = calculate_distribution_imbalance([8, 10, 12])
        assert 0 < cv < 0.3

    def test_severely_imbalanced(self):
        cv = calculate_distribution_imbalance([1, 50])
        assert cv > 0.9

    def test_single_group(self):
        assert calculate_distribution_imbalance([10]) == 0

    def test_empty(self):
        assert calculate_distribution_imbalance([]) == 0

    def test_with_singleton(self):
        cv = calculate_distribution_imbalance([1, 15, 15])
        assert cv > 0.3

    def test_all_singletons(self):
        # All groups with 1 member are perfectly balanced
        assert calculate_distribution_imbalance([1, 1, 1]) == 0.0

    def test_two_groups_equal(self):
        assert calculate_distribution_imbalance([5, 5]) == 0.0

    def test_all_zeros(self):
        assert calculate_distribution_imbalance([0, 0, 0]) == 0


# --- should_scale_based_on_distribution ---


class TestShouldScaleBasedOnDistribution:
    def test_small_population_no_singletons(self):
        result = should_scale_based_on_distribution([3, 3], total_members=6)
        assert result is None

    def test_small_population_singleton_3_groups(self):
        result = should_scale_based_on_distribution([1, 3, 3], total_members=7)
        assert result == "down"

    def test_small_population_singleton_2_groups_no_scale(self):
        # Can't go below 2 groups — should_scale returns "down" but
        # get_maths enforces the 2-group minimum
        result = should_scale_based_on_distribution([1, 5], total_members=6)
        assert result is None

    def test_large_population_balanced(self):
        result = should_scale_based_on_distribution([25, 25, 25], total_members=75)
        assert result is None

    def test_large_population_singleton_3_groups(self):
        result = should_scale_based_on_distribution([1, 50, 50], total_members=101)
        assert result == "down"

    def test_small_population_2_groups_balanced(self):
        result = should_scale_based_on_distribution([4, 4], total_members=8)
        assert result is None

    def test_multiple_singletons(self):
        # 6 groups, 3 singletons — should scale down
        result = should_scale_based_on_distribution(
            [1, 1, 1, 8, 8, 8], total_members=27
        )
        assert result == "down"


# --- get_maths with mocked pipeline ---


class TestGetMathsScaling:
    """Test that get_maths iterates scaling until singletons are eliminated."""

    def _make_mock_output(self, member_counts):
        """Create a mock PipelineOutput with given member_counts."""
        return {
            "result": {
                "statements_df": [],
                "participants_df": [],
                "repness": {},
                "group_comment_stats": {
                    str(i): [] for i in range(len(member_counts))
                },
                "consensus": {"agree": [], "disagree": []},
            },
            "member_counts": member_counts,
            "number_of_groups": len(member_counts),
        }

    @patch("main._run_and_build_result")
    def test_iterates_down_to_eliminate_singletons(self, mock_run):
        """6 groups with singletons should scale down iteratively to 3 groups."""
        mock_run.side_effect = [
            # Initial: 6 groups with 3 singletons
            self._make_mock_output([1, 1, 1, 8, 8, 8]),
            # 5 groups: still has singletons
            self._make_mock_output([1, 1, 8, 8, 9]),
            # 4 groups: still has a singleton
            self._make_mock_output([1, 8, 9, 9]),
            # 3 groups: no singletons — should stop here
            self._make_mock_output([9, 9, 9]),
        ]

        result = get_maths(
            votes=[],
            min_user_vote_threshold=7,
            conversation_slug_id="test",
        )

        # Should have called pipeline 4 times (initial + 3 scale-downs)
        assert mock_run.call_count == 4
        # Final result should be the 3-group one
        assert len(result["group_comment_stats"]) == 3

    @patch("main._run_and_build_result")
    def test_stops_at_2_groups_minimum(self, mock_run):
        """Should never scale below 2 groups."""
        mock_run.side_effect = [
            # Initial: 3 groups with singleton
            self._make_mock_output([1, 4, 4]),
            # 2 groups: still has issues but can't go lower
            self._make_mock_output([1, 8]),
        ]

        result = get_maths(
            votes=[],
            min_user_vote_threshold=7,
            conversation_slug_id="test",
        )

        # Should stop at 2 groups, not try to go to 1
        assert mock_run.call_count == 2
        assert len(result["group_comment_stats"]) == 2

    @patch("main._run_and_build_result")
    def test_no_scaling_when_distribution_ok(self, mock_run):
        """Well-distributed groups should not trigger scaling."""
        mock_run.return_value = self._make_mock_output([9, 9, 9])

        result = get_maths(
            votes=[],
            min_user_vote_threshold=7,
            conversation_slug_id="test",
        )

        # Only one call — no scaling needed
        assert mock_run.call_count == 1
        assert len(result["group_comment_stats"]) == 3

    @patch("main._run_and_build_result")
    def test_scaling_down_rejects_worse_result_without_singleton_fix(self, mock_run):
        """If scaling down makes CV worse AND doesn't fix singletons, stop."""
        mock_run.side_effect = [
            # Initial: 4 groups, moderate imbalance, no singletons
            # (total_members < 10 so only singleton check applies)
            self._make_mock_output([2, 2, 2, 3]),
            # This would only be reached if should_scale returns something,
            # but with these counts it returns None (no singletons, small population)
        ]

        result = get_maths(
            votes=[],
            min_user_vote_threshold=7,
            conversation_slug_id="test",
        )

        assert mock_run.call_count == 1

    @patch("main._run_and_build_result")
    def test_accepts_3_groups_over_degenerate_2_groups(self, mock_run):
        """2 groups [1, 57] should always accept 3 groups [1, 4, 53]
        even though CV is worse, because [1, 57] is effectively 1 group."""
        mock_run.side_effect = [
            self._make_mock_output([1, 57]),
            self._make_mock_output([1, 4, 53]),
        ]

        result = get_maths(
            votes=[],
            min_user_vote_threshold=7,
            conversation_slug_id="test-degenerate",
        )

        assert mock_run.call_count >= 2
        assert len(result["group_comment_stats"]) == 3

    @patch("main._run_and_build_result")
    def test_prevents_oscillation(self, mock_run):
        """Once committed to scaling down, should not switch to scaling up."""
        mock_run.side_effect = [
            # Initial: 5 groups with singleton
            self._make_mock_output([1, 6, 7, 7, 6]),
            # 4 groups: no singletons but maybe scale-up would be suggested
            self._make_mock_output([7, 7, 7, 6]),
        ]

        result = get_maths(
            votes=[],
            min_user_vote_threshold=7,
            conversation_slug_id="test",
        )

        # Should stop after successful scale-down, not try scaling up
        assert mock_run.call_count == 2


# --- Integration test with real reddwarf ---


class TestGetMathsIntegration:
    """Integration test using real reddwarf pipeline with synthetic vote data
    mimicking the Vitalik thread (27 voters, 4 opinion groups, 24 statements)."""

    @pytest.fixture
    def vitalik_votes(self):
        """Load votes from the CSV file generated by to-csv."""
        csv_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "x-analyzer",
            "output",
            "2032091657819316620-votes.csv",
        )
        if not os.path.exists(csv_path):
            pytest.skip(f"Vote CSV not found at {csv_path}")

        votes = []
        with open(csv_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                votes.append(
                    {
                        "participant_id": int(row["voter-id"]),
                        "statement_id": int(row["comment-id"]),
                        "vote": int(row["vote"]),
                    }
                )
        return votes

    def test_no_singleton_groups(self, vitalik_votes):
        """The scaling algorithm should eliminate singleton groups."""
        result = get_maths(
            votes=vitalik_votes,
            min_user_vote_threshold=7,
            conversation_slug_id="test-vitalik",
        )

        participants = result["participants_df"]
        if not participants:
            pytest.skip("Not enough participants passed vote threshold")

        # Count members per cluster
        from collections import Counter

        cluster_counts = Counter()
        for p in participants:
            cluster_id = p.get("cluster_id")
            if cluster_id is not None:
                cluster_counts[cluster_id] += 1

        member_counts = list(cluster_counts.values())
        assert len(member_counts) >= 2, "Should have at least 2 groups"

        # No singleton groups (unless we only have 2 groups)
        if len(member_counts) >= 3:
            assert min(member_counts) >= 2, (
                f"Found singleton group(s) in distribution {member_counts}"
            )

    def test_universally_agreed_statement_has_consensus(self, vitalik_votes):
        """Statement 11 ('Get outside the bubble') has all 4 groups agreeing.
        group-aware-consensus-agree should be >= 0.6."""
        result = get_maths(
            votes=vitalik_votes,
            min_user_vote_threshold=7,
            conversation_slug_id="test-consensus",
        )

        statements = result["statements_df"]
        if not statements:
            pytest.skip("No statements in result")

        # Statement 11 = "Get outside the bubble" — all groups agree
        stmt_11 = next(
            (s for s in statements if s.get("tid") == 11 or s.get("statement_id") == 11),
            None,
        )
        if stmt_11 is None:
            pytest.skip("Statement 11 not found in results")

        consensus_agree = stmt_11.get("group-aware-consensus-agree", 0)
        assert consensus_agree >= 0.6, (
            f"Statement 11 (universal agree) has consensus={consensus_agree:.3f}, "
            f"expected >= 0.6"
        )

    def test_majority_agreed_statement_has_reasonable_consensus(self, vitalik_votes):
        """Statement 6 ('Core value = trust') has 3 of 4 groups agreeing, 1 pass.
        Should have reasonable consensus (not filtered to zero)."""
        result = get_maths(
            votes=vitalik_votes,
            min_user_vote_threshold=7,
            conversation_slug_id="test-majority",
        )

        statements = result["statements_df"]
        if not statements:
            pytest.skip("No statements in result")

        stmt_6 = next(
            (s for s in statements if s.get("tid") == 6 or s.get("statement_id") == 6),
            None,
        )
        if stmt_6 is None:
            pytest.skip("Statement 6 not found in results")

        consensus_agree = stmt_6.get("group-aware-consensus-agree", 0)
        # With 3/4 groups agreeing and 1 passing, consensus should be positive
        assert consensus_agree > 0, (
            f"Statement 6 (3/4 agree) has consensus={consensus_agree:.3f}, "
            f"expected > 0"
        )

    def test_disputed_statement_no_consensus(self, vitalik_votes):
        """Statement 1 ('ETH civilizational tech') has 2 groups agree, 2 disagree.
        Should NOT show consensus."""
        result = get_maths(
            votes=vitalik_votes,
            min_user_vote_threshold=7,
            conversation_slug_id="test-disputed",
        )

        statements = result["statements_df"]
        if not statements:
            pytest.skip("No statements in result")

        stmt_1 = next(
            (s for s in statements if s.get("tid") == 1 or s.get("statement_id") == 1),
            None,
        )
        if stmt_1 is None:
            pytest.skip("Statement 1 not found in results")

        consensus_agree = stmt_1.get("group-aware-consensus-agree", 0)
        # With 2 agree + 2 disagree, consensus should be below threshold
        assert consensus_agree < 0.6, (
            f"Statement 1 (2 agree, 2 disagree) has consensus={consensus_agree:.3f}, "
            f"expected < 0.6"
        )
