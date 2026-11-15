"""Persist complete sealed evidence without lifecycle/config publication locks."""

from __future__ import annotations

from itertools import batched
from typing import TYPE_CHECKING, TypedDict

from sqlalchemy import func, insert, update

from scoring_worker.generated_models import (
    RankingInputAnswer,
    RankingInputItem,
    RankingInputParticipant,
    RankingInputSnapshot,
)
from scoring_worker.pipeline_config import SCORING_ALGORITHM_VERSION, SOLIDAGO_VERSION

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.orm import Session

    from scoring_worker.prepared_inputs import PreparedConversationInputs


class ParticipantInsert(TypedDict):
    input_snapshot_id: UUID
    participant_index: int


class ItemInsert(TypedDict):
    input_snapshot_id: UUID
    item_slug_id: str
    position: int


class AnswerInsert(ParticipantInsert):
    position: int
    best_slug_id: str
    worst_slug_id: str
    candidate_set: list[str]
    effective_candidate_set: list[str]


def write_retained_inputs(
    *, session: Session, conversation_id: int, inputs: PreparedConversationInputs
) -> None:
    """The caller commits this whole graph before computation; no source rereads."""
    snapshot_id = inputs.input_snapshot_id
    session.add(
        RankingInputSnapshot(
            id=snapshot_id,
            conversation_id=conversation_id,
            comparison_method=inputs.method,
            scoring_input_revision=inputs.revision,
            algorithm_version=SCORING_ALGORITHM_VERSION,
            solidago_version=SOLIDAGO_VERSION,
            pipeline_config=inputs.recipe.model_dump(mode="json"),
            participant_count=len(inputs.response_ids),
            item_count=len(inputs.entity_ids),
            answer_count=len(inputs.tasks),
            created_at=func.timezone("UTC", func.clock_timestamp()),
        )
    )
    session.flush()
    for batch in batched(inputs.response_ids, 1000, strict=False):
        participants: list[ParticipantInsert] = [
            {"input_snapshot_id": snapshot_id, "participant_index": index} for index in batch
        ]
        session.execute(insert(RankingInputParticipant), participants)
    for batch in batched(enumerate(inputs.entity_ids), 1000, strict=False):
        items: list[ItemInsert] = [
            {"input_snapshot_id": snapshot_id, "item_slug_id": slug, "position": position}
            for position, slug in batch
        ]
        session.execute(insert(RankingInputItem), items)
    for batch in batched(inputs.tasks, 1000, strict=False):
        answers: list[AnswerInsert] = [
            {
                "input_snapshot_id": snapshot_id,
                "participant_index": task.observation.user_id,
                "position": task.position,
                "best_slug_id": task.observation.best_slug_id,
                "worst_slug_id": task.observation.worst_slug_id,
                "candidate_set": list(task.original_candidate_set),
                "effective_candidate_set": list(task.observation.candidate_set),
            }
            for task in batch
        ]
        session.execute(insert(RankingInputAnswer), answers)
    session.execute(
        update(RankingInputSnapshot)
        .where(RankingInputSnapshot.id == snapshot_id)
        .values(sealed_at=func.timezone("UTC", func.clock_timestamp()))
    )
