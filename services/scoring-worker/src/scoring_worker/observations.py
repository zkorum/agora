from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

import pandas as pd

if TYPE_CHECKING:
    from scoring_worker.db import ComparisonRow
    from scoring_worker.entity_mapping import EntityIdMapper


@dataclass(frozen=True)
class MaxDiffObservation:
    user_id: int
    best_slug_id: str
    worst_slug_id: str
    candidate_set: tuple[str, ...]


@dataclass(frozen=True)
class PairwiseObservation:
    """Pairwise comparison compatible with Solidago GBT.

    `comparison < 0` means `option_a_slug_id` is preferred.
    `comparison > 0` means `option_b_slug_id` is preferred.
    `comparison_max` defines the magnitude scale.
    """

    user_id: int
    option_a_slug_id: str
    option_b_slug_id: str
    comparison: float
    comparison_max: float


def comparison_rows_to_maxdiff_observations(
    *,
    entity_ids: list[str],
    comparisons: list[ComparisonRow],
) -> list[MaxDiffObservation]:
    """Filter stored MaxDiff comparison rows down to active entities only."""

    active_entities = set(entity_ids)
    observations: list[MaxDiffObservation] = []

    for comparison in comparisons:
        if (
            comparison.best_slug_id not in active_entities
            or comparison.worst_slug_id not in active_entities
            or comparison.best_slug_id == comparison.worst_slug_id
        ):
            continue

        filtered_candidate_set: list[str] = []
        seen_candidate_ids: set[str] = set()
        for candidate_id in comparison.candidate_set:
            if candidate_id not in active_entities or candidate_id in seen_candidate_ids:
                continue
            seen_candidate_ids.add(candidate_id)
            filtered_candidate_set.append(candidate_id)

        if (
            len(filtered_candidate_set) < 2
            or comparison.best_slug_id not in seen_candidate_ids
            or comparison.worst_slug_id not in seen_candidate_ids
        ):
            continue

        observations.append(
            MaxDiffObservation(
                user_id=comparison.user_idx,
                best_slug_id=comparison.best_slug_id,
                worst_slug_id=comparison.worst_slug_id,
                candidate_set=tuple(filtered_candidate_set),
            )
        )

    return observations


def maxdiff_observations_to_tasks_frame(
    *,
    observations: list[MaxDiffObservation],
    mapper: EntityIdMapper,
) -> pd.DataFrame:
    """Convert MaxDiff observations to the int-keyed task format used by the learner."""

    return pd.DataFrame(
        [
            {
                "user_id": observation.user_id,
                "best_entity": mapper.to_int(observation.best_slug_id),
                "worst_entity": mapper.to_int(observation.worst_slug_id),
                "candidate_set": tuple(
                    mapper.to_int(candidate_id) for candidate_id in observation.candidate_set
                ),
            }
            for observation in observations
        ]
    )


def pairwise_observations_to_solidago_rows(
    *,
    observations: list[PairwiseObservation],
    mapper: EntityIdMapper,
) -> list[dict[str, int | float]]:
    """Convert pairwise observations to the standard Solidago comparison rows."""

    rows: list[dict[str, int | float]] = []
    for observation in observations:
        if observation.option_a_slug_id == observation.option_b_slug_id:
            continue
        if observation.comparison_max <= 0:
            continue

        rows.append(
            {
                "user_id": observation.user_id,
                "entity_a": mapper.to_int(observation.option_a_slug_id),
                "entity_b": mapper.to_int(observation.option_b_slug_id),
                "comparison": observation.comparison,
                "comparison_max": observation.comparison_max,
            }
        )

    return rows
