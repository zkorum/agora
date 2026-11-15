"""Immutable, conversation-scoped numerical inputs shared by all scoring stages."""

from __future__ import annotations

from dataclasses import dataclass, replace
from types import MappingProxyType
from typing import TYPE_CHECKING

from scoring_worker.observations import ComparisonObservation, comparison_row_to_observation

if TYPE_CHECKING:
    from collections.abc import Mapping, Sequence
    from uuid import UUID

    from scoring_worker.db import ComparisonRow, RankingItemSnapshotInput
    from scoring_worker.generated_models import RankingMode
    from scoring_worker.pipeline_config import ComparisonRecipe


@dataclass(frozen=True)
class PreparedTask:
    observation: ComparisonObservation
    original_candidate_set: tuple[str, ...]
    position: int


@dataclass(frozen=True)
class PreparedConversationInputs:
    revision: int
    method: RankingMode
    input_snapshot_id: UUID
    recipe: ComparisonRecipe
    ranking_items: tuple[RankingItemSnapshotInput, ...]
    entity_ids: tuple[str, ...]
    tasks: tuple[PreparedTask, ...]
    response_ids: Mapping[int, int]
    total_vote_count: int
    total_participant_count: int

    @property
    def observations(self) -> tuple[ComparisonObservation, ...]:
        return tuple(task.observation for task in self.tasks)


def prepare_tasks(
    *,
    entity_ids: Sequence[str],
    comparisons: Sequence[ComparisonRow],
    response_ids: Mapping[int, int],
) -> tuple[tuple[PreparedTask, ...], Mapping[int, int]]:
    active_entities = set(entity_ids)
    local_indices: dict[int, int] = {}
    positions: dict[int, int] = {}
    tasks: list[PreparedTask] = []
    for comparison in comparisons:
        observation = comparison_row_to_observation(
            comparison=comparison, active_entities=active_entities
        )
        if observation is None:
            continue
        index = local_indices.setdefault(observation.user_id, len(local_indices))
        position = positions.get(index, 0)
        positions[index] = position + 1
        tasks.append(
            PreparedTask(
                observation=replace(observation, user_id=index),
                original_candidate_set=tuple(comparison.candidate_set),
                position=position,
            )
        )
    return tuple(tasks), MappingProxyType(
        {index: response_ids[original] for original, index in local_indices.items()}
    )
