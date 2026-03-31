"""TDD tests for entity ID mapping (string slugId ↔ int).

Solidago expects integer entity IDs internally. python-bridge maps
string slugIds to sequential ints at the boundary, and maps back
in the response. These tests verify correctness of the mapping,
round-trip fidelity, and integration with bws_to_pairwise output.

Tests written FIRST (before implementation) per TDD methodology.
"""

from scoring_worker.bws_conversion import PairwiseWin
from scoring_worker.entity_mapping import (
    EntityIdMapper,
    map_pairwise_wins_to_solidago,
    map_scores_from_solidago,
)

# ===========================================================================
# EntityIdMapper unit tests
# ===========================================================================


class TestEntityIdMapper:
    def test_create_from_entity_ids(self) -> None:
        mapper = EntityIdMapper(entity_ids=["abc", "def", "ghi"])
        assert mapper.size == 3

    def test_string_to_int_mapping(self) -> None:
        mapper = EntityIdMapper(entity_ids=["abc", "def", "ghi"])
        # Each string maps to a unique int
        ids = {mapper.to_int("abc"), mapper.to_int("def"), mapper.to_int("ghi")}
        assert len(ids) == 3
        # Ints are sequential starting from 0
        assert ids == {0, 1, 2}

    def test_int_to_string_round_trip(self) -> None:
        """to_int then to_str returns the original string."""
        entity_ids = ["abc", "def", "ghi"]
        mapper = EntityIdMapper(entity_ids=entity_ids)
        for slug_id in entity_ids:
            int_id = mapper.to_int(slug_id)
            assert mapper.to_str(int_id) == slug_id

    def test_string_to_int_round_trip(self) -> None:
        """to_str then to_int returns the original int."""
        mapper = EntityIdMapper(entity_ids=["abc", "def", "ghi"])
        for int_id in range(3):
            slug_id = mapper.to_str(int_id)
            assert mapper.to_int(slug_id) == int_id

    def test_preserves_order(self) -> None:
        """The int assignment follows the order of entity_ids."""
        mapper = EntityIdMapper(entity_ids=["z_last", "a_first", "m_middle"])
        assert mapper.to_int("z_last") == 0
        assert mapper.to_int("a_first") == 1
        assert mapper.to_int("m_middle") == 2

    def test_unknown_string_raises(self) -> None:
        mapper = EntityIdMapper(entity_ids=["abc", "def"])
        try:
            mapper.to_int("unknown")
            raise AssertionError("Should have raised KeyError")
        except KeyError:
            pass

    def test_unknown_int_raises(self) -> None:
        mapper = EntityIdMapper(entity_ids=["abc", "def"])
        try:
            mapper.to_str(99)
            raise AssertionError("Should have raised KeyError")
        except KeyError:
            pass

    def test_empty_entity_ids(self) -> None:
        mapper = EntityIdMapper(entity_ids=[])
        assert mapper.size == 0
        assert mapper.all_int_ids() == []

    def test_single_entity(self) -> None:
        mapper = EntityIdMapper(entity_ids=["only_one"])
        assert mapper.size == 1
        assert mapper.to_int("only_one") == 0
        assert mapper.to_str(0) == "only_one"

    def test_special_characters_in_ids(self) -> None:
        """slugIds may contain underscores, hyphens, mixed case."""
        ids = ["y4c2yrE", "bdw35_M", "INN4aJg", "_COndGA"]
        mapper = EntityIdMapper(entity_ids=ids)
        for slug_id in ids:
            assert mapper.to_str(mapper.to_int(slug_id)) == slug_id

    def test_negative_int_raises(self) -> None:
        """Negative ints must not silently return via Python's list[-1] behavior."""
        mapper = EntityIdMapper(entity_ids=["abc", "def"])
        try:
            mapper.to_str(-1)
            raise AssertionError("Should have raised KeyError for negative int")
        except KeyError:
            pass

    def test_duplicate_entity_ids_deduplicates(self) -> None:
        """Duplicate slugIds in input are deduplicated (only first occurrence kept)."""
        mapper = EntityIdMapper(entity_ids=["a", "a", "b"])
        assert mapper.size == 2
        assert mapper.to_int("a") == 0
        assert mapper.to_int("b") == 1
        assert mapper.to_str(0) == "a"
        assert mapper.to_str(1) == "b"

    def test_all_int_ids(self) -> None:
        mapper = EntityIdMapper(entity_ids=["a", "b", "c"])
        assert mapper.all_int_ids() == [0, 1, 2]

    def test_all_str_ids(self) -> None:
        mapper = EntityIdMapper(entity_ids=["a", "b", "c"])
        assert mapper.all_str_ids() == ["a", "b", "c"]


# ===========================================================================
# map_pairwise_wins_to_solidago tests
# ===========================================================================


class TestMapPairwiseWinsToSolidago:
    def test_maps_winner_loser_to_ints(self) -> None:
        mapper = EntityIdMapper(entity_ids=["A", "B", "C"])
        wins = [
            PairwiseWin(user_id=0, winner="A", loser="B"),
            PairwiseWin(user_id=0, winner="B", loser="C"),
        ]
        result = map_pairwise_wins_to_solidago(wins=wins, mapper=mapper)
        assert len(result) == 2
        # First win: A(0) beats B(1)
        assert result[0]["user_id"] == 0
        assert result[0]["entity_a"] == mapper.to_int("A")
        assert result[0]["entity_b"] == mapper.to_int("B")
        # Solidago convention: comparison < 0 means entity_a (winner) is preferred
        assert result[0]["comparison"] == -1.0
        assert result[0]["comparison_max"] == 1.0
        # Second win: B(1) beats C(2)
        assert result[1]["entity_a"] == mapper.to_int("B")
        assert result[1]["entity_b"] == mapper.to_int("C")

    def test_preserves_user_ids(self) -> None:
        mapper = EntityIdMapper(entity_ids=["A", "B"])
        wins = [
            PairwiseWin(user_id=7, winner="A", loser="B"),
            PairwiseWin(user_id=42, winner="B", loser="A"),
        ]
        result = map_pairwise_wins_to_solidago(wins=wins, mapper=mapper)
        assert result[0]["user_id"] == 7
        assert result[1]["user_id"] == 42

    def test_empty_wins(self) -> None:
        mapper = EntityIdMapper(entity_ids=["A", "B"])
        result = map_pairwise_wins_to_solidago(wins=[], mapper=mapper)
        assert result == []

    def test_multiple_users_same_entities(self) -> None:
        mapper = EntityIdMapper(entity_ids=["X", "Y"])
        wins = [
            PairwiseWin(user_id=0, winner="X", loser="Y"),
            PairwiseWin(user_id=1, winner="Y", loser="X"),
        ]
        result = map_pairwise_wins_to_solidago(wins=wins, mapper=mapper)
        # User 0: X(0) > Y(1)
        assert result[0]["entity_a"] == 0
        assert result[0]["entity_b"] == 1
        # User 1: Y(1) > X(0) -- reversed
        assert result[1]["entity_a"] == 1
        assert result[1]["entity_b"] == 0

    def test_unmapped_entity_raises(self) -> None:
        """PairwiseWin referencing an entity not in the mapper should raise."""
        mapper = EntityIdMapper(entity_ids=["A", "B"])
        wins = [PairwiseWin(user_id=0, winner="A", loser="UNKNOWN")]
        try:
            map_pairwise_wins_to_solidago(wins=wins, mapper=mapper)
            raise AssertionError("Should have raised KeyError for unmapped entity")
        except KeyError:
            pass


# ===========================================================================
# map_scores_from_solidago tests
# ===========================================================================


class TestMapScoresFromSolidago:
    def test_maps_int_ids_back_to_strings(self) -> None:
        mapper = EntityIdMapper(entity_ids=["abc", "def", "ghi"])
        solidago_scores = [
            (0, (5.0, 1.0, 1.5)),
            (1, (-2.0, 0.5, 0.8)),
            (2, (3.0, 0.7, 0.9)),
        ]
        result = map_scores_from_solidago(
            solidago_scores=solidago_scores, mapper=mapper,
        )
        assert len(result) == 3
        score_by_id = {s.entity_id: s for s in result}
        assert score_by_id["abc"].score == 5.0
        assert score_by_id["abc"].uncertainty_left == 1.0
        assert score_by_id["abc"].uncertainty_right == 1.5
        assert score_by_id["def"].score == -2.0
        assert score_by_id["ghi"].score == 3.0

    def test_empty_scores(self) -> None:
        mapper = EntityIdMapper(entity_ids=["abc"])
        result = map_scores_from_solidago(solidago_scores=[], mapper=mapper)
        assert result == []

    def test_preserves_all_score_components(self) -> None:
        mapper = EntityIdMapper(entity_ids=["item1"])
        solidago_scores = [(0, (42.5, 3.14, 2.71))]
        result = map_scores_from_solidago(
            solidago_scores=solidago_scores, mapper=mapper,
        )
        assert result[0].entity_id == "item1"
        assert result[0].score == 42.5
        assert result[0].uncertainty_left == 3.14
        assert result[0].uncertainty_right == 2.71

    def test_subset_of_entities_scored(self) -> None:
        """Solidago may not score all entities (e.g., items with no comparisons)."""
        mapper = EntityIdMapper(entity_ids=["a", "b", "c", "d"])
        # Only entities 0 and 2 have scores
        solidago_scores = [
            (0, (1.0, 0.5, 0.5)),
            (2, (-1.0, 0.5, 0.5)),
        ]
        result = map_scores_from_solidago(
            solidago_scores=solidago_scores, mapper=mapper,
        )
        assert len(result) == 2
        ids = {s.entity_id for s in result}
        assert ids == {"a", "c"}


# ===========================================================================
# Full round-trip integration test
# ===========================================================================


class TestRoundTrip:
    def test_full_round_trip_with_real_slug_ids(self) -> None:
        """End-to-end: string slugIds → int mapping → fake Solidago scores → string slugIds."""
        entity_ids = ["y4c2yrE", "bdw35_M", "INN4aJg", "5rLND68"]
        mapper = EntityIdMapper(entity_ids=entity_ids)

        # Simulate BWS pairwise output (strings)
        wins = [
            PairwiseWin(user_id=0, winner="INN4aJg", loser="5rLND68"),
            PairwiseWin(user_id=0, winner="y4c2yrE", loser="bdw35_M"),
        ]

        # Map to Solidago format (ints)
        solidago_input = map_pairwise_wins_to_solidago(wins=wins, mapper=mapper)
        assert all(isinstance(row["entity_a"], int) for row in solidago_input)
        assert all(isinstance(row["entity_b"], int) for row in solidago_input)

        # Simulate Solidago output (ints)
        fake_solidago_output = [
            (mapper.to_int("INN4aJg"), (10.0, 1.0, 1.0)),
            (mapper.to_int("y4c2yrE"), (5.0, 1.5, 1.5)),
            (mapper.to_int("bdw35_M"), (-3.0, 2.0, 2.0)),
            (mapper.to_int("5rLND68"), (-8.0, 2.5, 2.5)),
        ]

        # Map back to strings
        result = map_scores_from_solidago(
            solidago_scores=fake_solidago_output, mapper=mapper,
        )

        # Verify round-trip: every entity present with correct score
        score_by_id = {s.entity_id: s.score for s in result}
        assert score_by_id["INN4aJg"] == 10.0
        assert score_by_id["y4c2yrE"] == 5.0
        assert score_by_id["bdw35_M"] == -3.0
        assert score_by_id["5rLND68"] == -8.0

    def test_mapping_is_deterministic(self) -> None:
        """Same entity_ids always produce the same mapping."""
        ids = ["x", "y", "z"]
        mapper1 = EntityIdMapper(entity_ids=ids)
        mapper2 = EntityIdMapper(entity_ids=ids)
        for slug_id in ids:
            assert mapper1.to_int(slug_id) == mapper2.to_int(slug_id)

    def test_different_order_produces_different_mapping(self) -> None:
        """Mapping depends on input order (not sorted)."""
        mapper1 = EntityIdMapper(entity_ids=["a", "b"])
        mapper2 = EntityIdMapper(entity_ids=["b", "a"])
        # a maps to 0 in mapper1 but 1 in mapper2
        assert mapper1.to_int("a") == 0
        assert mapper2.to_int("a") == 1
        # But round-trip still works for both
        for m in [mapper1, mapper2]:
            assert m.to_str(m.to_int("a")) == "a"
            assert m.to_str(m.to_int("b")) == "b"
