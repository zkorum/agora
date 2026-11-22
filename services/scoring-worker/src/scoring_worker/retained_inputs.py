"""Persist sealed effective scoring evidence and verify exact retry reuse."""

from __future__ import annotations

from itertools import batched, zip_longest
from typing import TYPE_CHECKING, Literal, TypedDict

from sqlalchemy import and_, func, insert, or_, select, update
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import insert as pg_insert

from scoring_worker.generated_models import (
    ComparisonInputBaseline,
    RankingInputAnswer,
    RankingInputItem,
    RankingInputParticipant,
    RankingInputParticipantEligibility,
    RankingInputSnapshot,
    User,
)
from scoring_worker.pipeline_config import SCORING_ALGORITHM_VERSION, SOLIDAGO_VERSION

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.orm import Session

    from scoring_worker.prepared_inputs import PreparedConversationInputs


class ParticipantInsert(TypedDict):
    input_snapshot_id: UUID
    participant_index: int


class ParticipantEligibilityInsert(ParticipantInsert):
    user_id: UUID
    is_account_hidden: bool


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


def find_reusable_retained_input(
    *,
    session: Session,
    conversation_id: int,
    inputs: PreparedConversationInputs,
    baseline: UUID | Literal["complete", "retained_complete"],
) -> UUID | None:
    """Reuse a capture only when it describes these exact values and local sources."""
    retained_baseline = baseline == "retained_complete"
    complete_baseline = baseline in ("complete", "retained_complete")
    snapshot_id = session.scalar(
        select(RankingInputSnapshot.id)
        .outerjoin(
            ComparisonInputBaseline,
            ComparisonInputBaseline.input_snapshot_id == RankingInputSnapshot.id,
        )
        .where(
            RankingInputSnapshot.conversation_id == conversation_id,
            RankingInputSnapshot.scoring_input_revision <= inputs.revision
            if retained_baseline
            else RankingInputSnapshot.scoring_input_revision == inputs.revision,
            RankingInputSnapshot.comparison_method == inputs.method,
            RankingInputSnapshot.algorithm_version == SCORING_ALGORITHM_VERSION,
            RankingInputSnapshot.solidago_version == SOLIDAGO_VERSION,
            RankingInputSnapshot.pipeline_config.cast(JSONB)
            == inputs.recipe.model_dump(mode="json"),
            RankingInputSnapshot.participant_count == len(inputs.participants),
            RankingInputSnapshot.item_count == len(inputs.entity_ids),
            RankingInputSnapshot.answer_count == len(inputs.tasks),
            or_(
                RankingInputSnapshot.stats_snapshot_id.is_(None),
                and_(
                    ComparisonInputBaseline.input_snapshot_id == RankingInputSnapshot.id,
                    ComparisonInputBaseline.baseline_input_snapshot_id == RankingInputSnapshot.id,
                ),
            )
            if retained_baseline
            else RankingInputSnapshot.stats_snapshot_id.is_(None),
            RankingInputSnapshot.sealed_at.is_not(None),
            or_(
                ComparisonInputBaseline.input_snapshot_id.is_(None),
                ComparisonInputBaseline.baseline_input_snapshot_id
                == (RankingInputSnapshot.id if complete_baseline else baseline),
            ),
        )
        .order_by(RankingInputSnapshot.created_at.desc(), RankingInputSnapshot.id.desc())
        .limit(1)
    )
    if snapshot_id is None:
        return None

    # Revisions fence publication, but do not prove numerical equality: account
    # eligibility and legacy/source repair can change independently. In particular,
    # equal counts cannot certify saved choices or their local participant mapping.
    stored_items = session.scalars(
        select(RankingInputItem.item_slug_id)
        .where(RankingInputItem.input_snapshot_id == snapshot_id)
        .order_by(RankingInputItem.position)
    ).yield_per(1000)
    if any(expected != stored for expected, stored in zip_longest(inputs.entity_ids, stored_items)):
        return None

    stored_participants = session.execute(
        select(
            RankingInputParticipant.participant_index,
            RankingInputParticipantEligibility.user_id,
        )
        .outerjoin(
            RankingInputParticipantEligibility,
            (
                RankingInputParticipantEligibility.input_snapshot_id
                == RankingInputParticipant.input_snapshot_id
            )
            & (
                RankingInputParticipantEligibility.participant_index
                == RankingInputParticipant.participant_index
            ),
        )
        .where(RankingInputParticipant.input_snapshot_id == snapshot_id)
        .order_by(RankingInputParticipant.participant_index)
    ).yield_per(1000)
    expected_participants = sorted(
        (index, participant.user_id) for index, participant in inputs.participants.items()
    )
    if any(
        stored is None or expected != (stored.participant_index, stored.user_id)
        for expected, stored in zip_longest(expected_participants, stored_participants)
    ):
        return None

    stored_answers = session.scalars(
        select(RankingInputAnswer)
        .where(RankingInputAnswer.input_snapshot_id == snapshot_id)
        .order_by(RankingInputAnswer.participant_index, RankingInputAnswer.position)
    ).yield_per(1000)
    expected_tasks = sorted(
        inputs.tasks, key=lambda task: (task.observation.user_id, task.position)
    )
    for task, stored in zip_longest(expected_tasks, stored_answers):
        if (
            task is None
            or stored is None
            or stored.participant_index != task.observation.user_id
            or stored.position != task.position
            or stored.best_slug_id != task.observation.best_slug_id
            or stored.worst_slug_id != task.observation.worst_slug_id
            or tuple(stored.candidate_set) != task.original_candidate_set
            or tuple(stored.effective_candidate_set) != task.observation.candidate_set
        ):
            return None
    return snapshot_id


def certify_retained_baseline(
    *,
    session: Session,
    conversation_id: int,
    input_snapshot_id: UUID,
    baseline_input_snapshot_id: UUID,
) -> None:
    """Certify only the complete source read, never a historical live reconstruction."""
    session.execute(
        pg_insert(ComparisonInputBaseline)
        .values(
            conversation_id=conversation_id,
            input_snapshot_id=input_snapshot_id,
            baseline_input_snapshot_id=baseline_input_snapshot_id,
        )
        .on_conflict_do_nothing(index_elements=[ComparisonInputBaseline.input_snapshot_id])
    )


def write_retained_inputs(
    *, session: Session, conversation_id: int, inputs: PreparedConversationInputs
) -> None:
    """Commit sealed values and separate private eligibility before computation."""
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
            participant_count=len(inputs.participants),
            item_count=len(inputs.entity_ids),
            answer_count=len(inputs.tasks),
            created_at=func.timezone("UTC", func.clock_timestamp()),
        )
    )
    session.flush()
    # Only these private associations use account IDs. The account lock fences
    # deletion/recovery while the numerical capture and its eligibility commit.
    account_ids = sorted({participant.user_id for participant in inputs.participants.values()})
    account_deleted: dict[UUID, bool] = {}
    # Preserve a global account order across bounded queries, including captures
    # larger than PostgreSQL's parameter limit.
    for account_batch in batched(account_ids, 1000, strict=False):
        account_deleted.update(
            session.execute(
                select(User.id, User.is_deleted)
                .where(User.id.in_(account_batch))
                .order_by(User.id)
                .with_for_update(read=True, of=User)
            )
            .tuples()
            .all()
        )
    for batch in batched(inputs.participants, 1000, strict=False):
        participants: list[ParticipantInsert] = [
            {"input_snapshot_id": snapshot_id, "participant_index": index} for index in batch
        ]
        session.execute(insert(RankingInputParticipant), participants)
        eligibility: list[ParticipantEligibilityInsert] = []
        for index in batch:
            participant = inputs.participants[index]
            if participant.user_id not in account_deleted:
                raise ValueError("Account disappeared before comparison input capture")
            eligibility.append(
                {
                    "input_snapshot_id": snapshot_id,
                    "participant_index": index,
                    "user_id": participant.user_id,
                    "is_account_hidden": account_deleted[participant.user_id],
                }
            )
        session.execute(insert(RankingInputParticipantEligibility), eligibility)
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
