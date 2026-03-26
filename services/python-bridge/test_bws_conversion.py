"""TDD tests for BWS→pairwise conversion with transitive closure.

Ported from:
- services/agora/src/utils/maxdiff.test.ts (client-side engine)
- services/api/src/service/btConsistency.test.ts (BT vs transitive closure)
- services/api/src/service/maxdiff.test.ts (computeScores)

Tests are written FIRST (before implementation) per TDD methodology.
"""

import pytest

from bws_conversion import (
    BWSComparison,
    PairwiseWin,
    bws_to_pairwise,
    build_comparison_matrix,
    bron_kerbosch,
)


# ---------------------------------------------------------------------------
# Helper: create a BWSComparison concisely
# ---------------------------------------------------------------------------

def bws(
    *,
    user_id: int,
    best: str,
    worst: str,
    candidate_set: list[str],
) -> BWSComparison:
    return BWSComparison(
        user_id=user_id,
        best=best,
        worst=worst,
        candidate_set=candidate_set,
    )


def pair_set(pairs: list[PairwiseWin]) -> set[tuple[int, str, str]]:
    """Convert list of PairwiseWin to a set of (user_id, winner, loser) for order-independent comparison."""
    return {(p.user_id, p.winner, p.loser) for p in pairs}


# ===========================================================================
# Bron-Kerbosch tests
# ===========================================================================


class TestBronKerbosch:
    def test_empty_edges(self) -> None:
        assert bron_kerbosch([]) == []

    def test_single_edge(self) -> None:
        cliques = bron_kerbosch([("a", "b")])
        assert len(cliques) == 1
        assert set(cliques[0]) == {"a", "b"}

    def test_triangle(self) -> None:
        cliques = bron_kerbosch([("a", "b"), ("b", "c"), ("a", "c")])
        assert len(cliques) == 1
        assert set(cliques[0]) == {"a", "b", "c"}

    def test_two_disconnected_edges(self) -> None:
        cliques = bron_kerbosch([("a", "b"), ("c", "d")])
        assert len(cliques) == 2
        clique_sets = [set(c) for c in cliques]
        assert {"a", "b"} in clique_sets
        assert {"c", "d"} in clique_sets

    def test_path_graph(self) -> None:
        # a-b-c: two cliques {a,b} and {b,c}
        cliques = bron_kerbosch([("a", "b"), ("b", "c")])
        assert len(cliques) == 2
        clique_sets = [set(c) for c in cliques]
        assert {"a", "b"} in clique_sets
        assert {"b", "c"} in clique_sets


# ===========================================================================
# Comparison matrix tests
# ===========================================================================


class TestBuildComparisonMatrix:
    def test_empty_items(self) -> None:
        matrix = build_comparison_matrix(items=[])
        assert matrix.get_ordered_pairs() == []
        assert matrix.get_unordered_pairs() == []

    def test_single_item(self) -> None:
        matrix = build_comparison_matrix(items=["a"])
        assert matrix.get_ordered_pairs() == []
        assert matrix.get_unordered_pairs() == []

    def test_two_items_initially_unordered(self) -> None:
        matrix = build_comparison_matrix(items=["a", "b"])
        unordered = matrix.get_unordered_pairs()
        assert len(unordered) == 1
        assert set(unordered[0]) == {"a", "b"}

    def test_two_items_after_comparison(self) -> None:
        matrix = build_comparison_matrix(items=["a", "b"])
        matrix.apply_comparison(BWSComparison(
            user_id=0, best="b", worst="a", candidate_set=["a", "b"],
        ))
        assert matrix.get_unordered_pairs() == []
        ordered = matrix.get_ordered_pairs()
        assert len(ordered) == 1
        assert ordered[0] == ("b", "a")  # b wins over a

    def test_transitive_closure_three_items(self) -> None:
        """If A>B and B>C, then A>C is inferred."""
        matrix = build_comparison_matrix(items=["a", "b", "c"])
        # a beats b
        matrix.apply_comparison(BWSComparison(
            user_id=0, best="a", worst="b", candidate_set=["a", "b"],
        ))
        # b beats c
        matrix.apply_comparison(BWSComparison(
            user_id=0, best="b", worst="c", candidate_set=["b", "c"],
        ))
        # Transitive: a>c should be inferred
        assert matrix.get_unordered_pairs() == []
        ordered = matrix.get_ordered_pairs()
        pair_tuples = {(w, l) for w, l in ordered}
        assert ("a", "b") in pair_tuples
        assert ("b", "c") in pair_tuples
        assert ("a", "c") in pair_tuples  # transitive

    def test_bws_decomposition_four_items(self) -> None:
        """BWS {best:A, worst:D, set:[A,B,C,D]} produces multiple pairwise orderings."""
        matrix = build_comparison_matrix(items=["A", "B", "C", "D"])
        matrix.apply_comparison(BWSComparison(
            user_id=0, best="A", worst="D", candidate_set=["A", "B", "C", "D"],
        ))
        ordered = matrix.get_ordered_pairs()
        pair_tuples = {(w, l) for w, l in ordered}
        # A beats everyone
        assert ("A", "B") in pair_tuples
        assert ("A", "C") in pair_tuples
        assert ("A", "D") in pair_tuples
        # Everyone beats D (except A already covered)
        assert ("B", "D") in pair_tuples
        assert ("C", "D") in pair_tuples
        # B vs C remains unordered
        assert ("B", "C") not in pair_tuples
        assert ("C", "B") not in pair_tuples

    def test_ignores_unknown_items(self) -> None:
        """Comparisons referencing items not in the item list are ignored."""
        matrix = build_comparison_matrix(items=["a", "b"])
        matrix.apply_comparison(BWSComparison(
            user_id=0, best="x", worst="y", candidate_set=["x", "y"],
        ))
        assert len(matrix.get_ordered_pairs()) == 0
        assert len(matrix.get_unordered_pairs()) == 1


# ===========================================================================
# bws_to_pairwise integration tests
# ===========================================================================


class TestBwsToPairwise:
    def test_empty_comparisons(self) -> None:
        result = bws_to_pairwise(bws_comparisons=[], entity_ids=["a", "b"])
        assert result == []

    def test_empty_entities(self) -> None:
        result = bws_to_pairwise(
            bws_comparisons=[bws(user_id=0, best="a", worst="b", candidate_set=["a", "b"])],
            entity_ids=[],
        )
        assert result == []

    def test_single_comparison_two_items(self) -> None:
        result = bws_to_pairwise(
            bws_comparisons=[bws(user_id=0, best="a", worst="b", candidate_set=["a", "b"])],
            entity_ids=["a", "b"],
        )
        assert len(result) == 1
        assert result[0].user_id == 0
        assert result[0].winner == "a"
        assert result[0].loser == "b"

    def test_bws_four_items_produces_five_pairs(self) -> None:
        """BWS {best:A, worst:D, set:[A,B,C,D]} → 5 pairwise wins via transitive closure."""
        result = bws_to_pairwise(
            bws_comparisons=[bws(
                user_id=0, best="A", worst="D", candidate_set=["A", "B", "C", "D"],
            )],
            entity_ids=["A", "B", "C", "D"],
        )
        pairs = pair_set(result)
        # A beats B, C, D
        assert (0, "A", "B") in pairs
        assert (0, "A", "C") in pairs
        assert (0, "A", "D") in pairs
        # B and C beat D
        assert (0, "B", "D") in pairs
        assert (0, "C", "D") in pairs
        # B vs C is NOT resolved (only 1 comparison)
        assert (0, "B", "C") not in pairs
        assert (0, "C", "B") not in pairs
        assert len(result) == 5

    def test_transitive_closure_across_two_comparisons(self) -> None:
        """Two overlapping BWS comparisons trigger transitive closure."""
        result = bws_to_pairwise(
            bws_comparisons=[
                bws(user_id=0, best="A", worst="C", candidate_set=["A", "B", "C"]),
                bws(user_id=0, best="B", worst="D", candidate_set=["B", "C", "D"]),
            ],
            entity_ids=["A", "B", "C", "D"],
        )
        pairs = pair_set(result)
        # From first comparison: A>B, A>C, B>C
        assert (0, "A", "B") in pairs
        assert (0, "A", "C") in pairs
        assert (0, "B", "C") in pairs
        # From second comparison: B>C (already known), B>D, C>D
        assert (0, "B", "D") in pairs
        assert (0, "C", "D") in pairs
        # Transitive: A>D (A>B>D or A>C>D)
        assert (0, "A", "D") in pairs

    def test_per_user_isolation(self) -> None:
        """Each user's comparisons are processed independently."""
        result = bws_to_pairwise(
            bws_comparisons=[
                bws(user_id=0, best="A", worst="B", candidate_set=["A", "B"]),
                bws(user_id=1, best="B", worst="A", candidate_set=["A", "B"]),
            ],
            entity_ids=["A", "B"],
        )
        pairs = pair_set(result)
        # User 0: A>B
        assert (0, "A", "B") in pairs
        # User 1: B>A (opposite preference)
        assert (1, "B", "A") in pairs
        # No cross-user contamination
        assert (0, "B", "A") not in pairs
        assert (1, "A", "B") not in pairs

    def test_filters_to_active_entities(self) -> None:
        """Comparisons referencing removed best/worst are skipped entirely.
        Comparisons where best+worst are active but set has removed items work."""
        # Case 1: worst is removed → entire comparison skipped
        result1 = bws_to_pairwise(
            bws_comparisons=[bws(
                user_id=0, best="A", worst="D",
                candidate_set=["A", "B", "C", "D"],
            )],
            entity_ids=["A", "B"],  # C and D are removed
        )
        assert result1 == []  # D not active, comparison skipped

        # Case 2: best+worst active, some set members removed → works with filtered set
        result2 = bws_to_pairwise(
            bws_comparisons=[bws(
                user_id=0, best="A", worst="B",
                candidate_set=["A", "B", "C", "D"],
            )],
            entity_ids=["A", "B"],  # C and D removed but best/worst are active
        )
        pairs = pair_set(result2)
        assert (0, "A", "B") in pairs
        assert len(result2) == 1

    def test_reproduces_bug_fix_contradictory_bws(self) -> None:
        """Exact scenario from btConsistency.test.ts:201.

        3 BWS votes over 6 items that previously caused contradictory
        pairwise wins. With transitive closure, all orderings are consistent.
        """
        items = ["y4c2yrE", "bdw35_M", "INN4aJg", "5rLND68", "_COndGA", "mH8LTrc"]
        comparisons = [
            bws(user_id=0, best="INN4aJg", worst="5rLND68",
                candidate_set=["5rLND68", "bdw35_M", "y4c2yrE", "INN4aJg"]),
            bws(user_id=0, best="y4c2yrE", worst="bdw35_M",
                candidate_set=["bdw35_M", "_COndGA", "mH8LTrc", "y4c2yrE"]),
            bws(user_id=0, best="_COndGA", worst="mH8LTrc",
                candidate_set=["INN4aJg", "5rLND68", "mH8LTrc", "_COndGA"]),
        ]
        result = bws_to_pairwise(bws_comparisons=comparisons, entity_ids=items)
        pairs = pair_set(result)

        # Verify direct orderings from each comparison:
        # Comp 1: INN4aJg > {5rLND68, bdw35_M, y4c2yrE}, {bdw35_M, y4c2yrE} > 5rLND68
        assert (0, "INN4aJg", "5rLND68") in pairs
        assert (0, "INN4aJg", "bdw35_M") in pairs
        assert (0, "INN4aJg", "y4c2yrE") in pairs
        assert (0, "y4c2yrE", "5rLND68") in pairs
        # Comp 2: y4c2yrE > {bdw35_M, _COndGA, mH8LTrc}, {_COndGA, mH8LTrc} > bdw35_M
        assert (0, "y4c2yrE", "bdw35_M") in pairs
        assert (0, "y4c2yrE", "_COndGA") in pairs
        assert (0, "_COndGA", "bdw35_M") in pairs
        # Comp 3: _COndGA > mH8LTrc (new), _COndGA > INN4aJg is BLOCKED
        # because INN4aJg > _COndGA was already established transitively
        assert (0, "_COndGA", "mH8LTrc") in pairs
        # Transitive closure preserves first-established ordering:
        assert (0, "INN4aJg", "_COndGA") in pairs  # from comp1+2 transitive

        # All 15 pairs (C(6,2)=15) are resolved by these 3 comparisons
        assert len(result) == 15

        # No contradictions: if (user, A, B) exists, (user, B, A) must not
        for user_id, winner, loser in pairs:
            assert (user_id, loser, winner) not in pairs, (
                f"Contradiction: {winner}>{loser} and {loser}>{winner}"
            )

    def test_six_items_complete_ordering(self) -> None:
        """Simulate voting to completion on 6 items with known true ordering."""
        items = ["1", "2", "3", "4", "5", "6"]
        true_ordering = ["6", "1", "4", "2", "3", "5"]  # 6 is best, 5 is worst

        # Generate BWS comparisons using true ordering to pick best/worst
        rank_map = {item: i for i, item in enumerate(true_ordering)}
        candidate_sets = [
            ["1", "2", "5", "6"],
            ["1", "3", "4", "6"],
            ["2", "3", "4", "5"],
            ["1", "2", "4", "6"],
        ]
        comparisons: list[BWSComparison] = []
        for cset in candidate_sets:
            sorted_set = sorted(cset, key=lambda x: rank_map[x])
            comparisons.append(bws(
                user_id=0,
                best=sorted_set[0],
                worst=sorted_set[-1],
                candidate_set=cset,
            ))

        result = bws_to_pairwise(bws_comparisons=comparisons, entity_ids=items)
        pairs = pair_set(result)

        # No contradictions
        for user_id, winner, loser in pairs:
            assert (user_id, loser, winner) not in pairs

        # All generated pairs must respect true ordering
        for _, winner, loser in pairs:
            assert rank_map[winner] < rank_map[loser], (
                f"{winner} (rank {rank_map[winner]}) should beat "
                f"{loser} (rank {rank_map[loser]})"
            )

    def test_multiple_users_same_entities(self) -> None:
        """Multiple users comparing the same entities produce independent pairwise sets."""
        comparisons = [
            bws(user_id=0, best="A", worst="C", candidate_set=["A", "B", "C"]),
            bws(user_id=1, best="C", worst="A", candidate_set=["A", "B", "C"]),
            bws(user_id=2, best="B", worst="C", candidate_set=["A", "B", "C"]),
        ]
        result = bws_to_pairwise(
            bws_comparisons=comparisons,
            entity_ids=["A", "B", "C"],
        )
        pairs = pair_set(result)

        # User 0: best=A, worst=C → A>B, A>C, B>C (3 pairs)
        assert (0, "A", "B") in pairs
        assert (0, "A", "C") in pairs
        assert (0, "B", "C") in pairs

        # User 1: best=C, worst=A → C>B, C>A, B>A (3 pairs)
        assert (1, "C", "A") in pairs
        assert (1, "C", "B") in pairs
        assert (1, "B", "A") in pairs

        # User 2: best=B, worst=C → B>A, B>C, A>C (3 pairs)
        assert (2, "B", "A") in pairs
        assert (2, "B", "C") in pairs
        assert (2, "A", "C") in pairs

        # Total: 9 pairs (3 per user, 3 users)
        assert len(result) == 9

    def test_duplicate_comparisons_idempotent(self) -> None:
        """Applying the same comparison twice doesn't create duplicate pairs."""
        same_comp = bws(user_id=0, best="A", worst="B", candidate_set=["A", "B"])
        result = bws_to_pairwise(
            bws_comparisons=[same_comp, same_comp],
            entity_ids=["A", "B"],
        )
        # Should still be just 1 pair, not 2
        assert len(result) == 1

    def test_three_item_candidate_set(self) -> None:
        """BWS with 3-item set (not just 4)."""
        result = bws_to_pairwise(
            bws_comparisons=[bws(
                user_id=0, best="A", worst="C", candidate_set=["A", "B", "C"],
            )],
            entity_ids=["A", "B", "C"],
        )
        pairs = pair_set(result)
        # A beats B and C, B beats C
        assert (0, "A", "B") in pairs
        assert (0, "A", "C") in pairs
        assert (0, "B", "C") in pairs
        assert len(result) == 3  # all 3 pairs resolved from one 3-item BWS

    def test_candidate_set_subset_of_entities(self) -> None:
        """Candidate set only covers some entities -- others remain unaffected."""
        result = bws_to_pairwise(
            bws_comparisons=[bws(
                user_id=0, best="A", worst="B", candidate_set=["A", "B"],
            )],
            entity_ids=["A", "B", "C", "D"],
        )
        pairs = pair_set(result)
        assert (0, "A", "B") in pairs
        assert len(result) == 1  # C and D not in any comparison

    def test_malformed_best_equals_worst(self) -> None:
        """best == worst should produce no useful orderings (degenerate input)."""
        result = bws_to_pairwise(
            bws_comparisons=[bws(
                user_id=0, best="A", worst="A", candidate_set=["A", "B", "C"],
            )],
            entity_ids=["A", "B", "C"],
        )
        pairs = pair_set(result)
        # A>B (best beats others), but worst==best so "middle beats worst"
        # means B>A and C>A -- contradicting A>B and A>C.
        # The transitive closure should handle this by keeping first-established.
        # A>B and A>C are set first (best beats everyone), then B>A and C>A
        # are attempted but blocked since A>B and A>C already exist.
        assert (0, "A", "B") in pairs
        assert (0, "A", "C") in pairs
        # No contradictions
        for uid, w, l in pairs:
            assert (uid, l, w) not in pairs
