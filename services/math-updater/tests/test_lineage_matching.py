from __future__ import annotations

from math_updater.lineage_matching import (
    NewLineageGroup,
    PreviousLineageGroup,
    match_lineages_by_representative_opinions,
)


def test_reuses_lineage_when_representative_opinions_match() -> None:
    matches = match_lineages_by_representative_opinions(
        new_groups=[
            NewLineageGroup(
                key="0",
                representative_opinions=frozenset({(1, "agree"), (2, "disagree")}),
            ),
        ],
        previous_groups=[
            PreviousLineageGroup(
                lineage_id=10,
                representative_opinions=frozenset({(1, "agree"), (2, "disagree")}),
            ),
        ],
    )

    assert matches == {"0": 10}


def test_reuses_lineage_when_representative_opinion_order_differs() -> None:
    matches = match_lineages_by_representative_opinions(
        new_groups=[
            NewLineageGroup(
                key="0",
                representative_opinions=frozenset({(2, "disagree"), (1, "agree")}),
            ),
        ],
        previous_groups=[
            PreviousLineageGroup(
                lineage_id=10,
                representative_opinions=frozenset({(1, "agree"), (2, "disagree")}),
            ),
        ],
    )

    assert matches == {"0": 10}


def test_does_not_reuse_lineage_when_any_representative_opinion_differs() -> None:
    matches = match_lineages_by_representative_opinions(
        new_groups=[
            NewLineageGroup(
                key="0",
                representative_opinions=frozenset({(1, "agree"), (2, "agree")}),
            ),
        ],
        previous_groups=[
            PreviousLineageGroup(
                lineage_id=10,
                representative_opinions=frozenset({(1, "agree"), (3, "agree")}),
            ),
        ],
    )

    assert matches == {}


def test_does_not_reuse_historical_lineage_without_representative_opinions() -> None:
    matches = match_lineages_by_representative_opinions(
        new_groups=[
            NewLineageGroup(
                key="0",
                representative_opinions=frozenset({(1, "agree")}),
            ),
        ],
        previous_groups=[
            PreviousLineageGroup(
                lineage_id=10,
                representative_opinions=frozenset(),
            ),
        ],
    )

    assert matches == {}


def test_does_not_reuse_lineage_when_representative_stance_differs() -> None:
    matches = match_lineages_by_representative_opinions(
        new_groups=[
            NewLineageGroup(
                key="0",
                representative_opinions=frozenset({(1, "agree"), (2, "agree")}),
            ),
        ],
        previous_groups=[
            PreviousLineageGroup(
                lineage_id=10,
                representative_opinions=frozenset({(1, "agree"), (2, "disagree")}),
            ),
        ],
    )

    assert matches == {}


def test_does_not_reuse_lineage_for_ambiguous_exact_match() -> None:
    matches = match_lineages_by_representative_opinions(
        new_groups=[
            NewLineageGroup(
                key="0",
                representative_opinions=frozenset({(1, "agree"), (2, "agree")}),
            ),
        ],
        previous_groups=[
            PreviousLineageGroup(
                lineage_id=10,
                representative_opinions=frozenset({(1, "agree"), (2, "agree")}),
            ),
            PreviousLineageGroup(
                lineage_id=20,
                representative_opinions=frozenset({(1, "agree"), (2, "agree")}),
            ),
        ],
    )

    assert matches == {}


def test_assigns_each_previous_lineage_once() -> None:
    matches = match_lineages_by_representative_opinions(
        new_groups=[
            NewLineageGroup(
                key="0",
                representative_opinions=frozenset({(1, "agree"), (2, "agree")}),
            ),
            NewLineageGroup(
                key="1",
                representative_opinions=frozenset({(1, "agree"), (2, "agree")}),
            ),
        ],
        previous_groups=[
            PreviousLineageGroup(
                lineage_id=10,
                representative_opinions=frozenset({(1, "agree"), (2, "agree")}),
            ),
        ],
    )

    assert len(matches) == 1
    assert set(matches.values()) == {10}
