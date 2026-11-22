from __future__ import annotations

from scoring_worker.db import ComparisonRow
from scoring_worker.entity_mapping import EntityIdMapper
from scoring_worker.observations import (
    ComparisonObservation,
    PairwiseObservation,
    comparison_observations_to_tasks_frame,
    comparison_rows_to_observations,
    pairwise_observations_to_solidago_rows,
)
from scoring_worker.prepared_inputs import project_comparison_tasks


def test_comparison_rows_to_observations_filters_and_deduplicates_candidates() -> None:
    observations = comparison_rows_to_observations(
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
        ComparisonObservation(
            user_id=7,
            best_slug_id="A",
            worst_slug_id="C",
            candidate_set=("A", "B", "C"),
        )
    ]


def test_projects_retained_comparison_tasks_without_account_sources() -> None:
    projection = project_comparison_tasks(
        entity_ids=["A", "B", "C"],
        comparisons=[
            ComparisonRow(
                user_idx=11, best_slug_id="H", worst_slug_id="A", candidate_set=["H", "A"]
            ),
            ComparisonRow(
                user_idx=17, best_slug_id="A", worst_slug_id="C", candidate_set=["A", "H", "B", "C"]
            ),
            ComparisonRow(
                user_idx=5, best_slug_id="C", worst_slug_id="A", candidate_set=["C", "A"]
            ),
            ComparisonRow(
                user_idx=17, best_slug_id="B", worst_slug_id="C", candidate_set=["B", "C"]
            ),
        ],
    )
    assert projection.source_participant_indices == (17, 5)
    assert [(task.observation.user_id, task.position) for task in projection.tasks] == [
        (0, 0),
        (1, 0),
        (0, 1),
    ]
    first = projection.tasks[0]
    assert first.original_candidate_set == ("A", "H", "B", "C")
    assert first.observation.candidate_set == ("A", "B", "C")


def test_comparison_observations_to_tasks_frame_maps_to_int_ids() -> None:
    mapper = EntityIdMapper(entity_ids=["A", "B", "C"])
    frame = comparison_observations_to_tasks_frame(
        observations=comparison_rows_to_observations(
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
