from __future__ import annotations

from scoring_worker.db import ComparisonRow
from scoring_worker.entity_mapping import EntityIdMapper
from scoring_worker.observations import (
    PairwiseObservation,
    comparison_rows_to_maxdiff_observations,
    maxdiff_observations_to_tasks_frame,
    pairwise_observations_to_solidago_rows,
)


def test_comparison_rows_to_maxdiff_observations_filters_and_deduplicates_candidates() -> None:
    observations = comparison_rows_to_maxdiff_observations(
        entity_ids=["A", "B", "C"],
        comparisons=[
            ComparisonRow(
                user_idx=7,
                best_slug_id="A",
                worst_slug_id="C",
                candidate_set=["A", "B", "B", "C", "D"],
            )
        ],
    )

    assert observations == [
        type(observations[0])(
            user_id=7,
            best_slug_id="A",
            worst_slug_id="C",
            candidate_set=("A", "B", "C"),
        )
    ]


def test_maxdiff_observations_to_tasks_frame_maps_to_int_ids() -> None:
    mapper = EntityIdMapper(entity_ids=["A", "B", "C"])
    frame = maxdiff_observations_to_tasks_frame(
        observations=comparison_rows_to_maxdiff_observations(
            entity_ids=["A", "B", "C"],
            comparisons=[
                ComparisonRow(
                    user_idx=2,
                    best_slug_id="A",
                    worst_slug_id="C",
                    candidate_set=["A", "B", "C"],
                )
            ],
        ),
        mapper=mapper,
    )

    assert frame.to_dict("records") == [
        {
            "user_id": 2,
            "best_entity": 0,
            "worst_entity": 2,
            "candidate_set": (0, 1, 2),
        }
    ]


def test_pairwise_observations_to_solidago_rows_preserve_sign_and_magnitude() -> None:
    mapper = EntityIdMapper(entity_ids=["A", "B"])
    rows = pairwise_observations_to_solidago_rows(
        observations=[
            PairwiseObservation(
                user_id=3,
                option_a_slug_id="A",
                option_b_slug_id="B",
                comparison=-2.0,
                comparison_max=3.0,
            )
        ],
        mapper=mapper,
    )

    assert rows == [
        {
            "user_id": 3,
            "entity_a": 0,
            "entity_b": 1,
            "comparison": -2.0,
            "comparison_max": 3.0,
        }
    ]
