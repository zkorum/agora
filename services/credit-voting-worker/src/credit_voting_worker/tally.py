from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from sqlalchemy import case, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from credit_voting_worker.generated_models import (
    Conversation,
    ConversationAnalysisClose,
    QvCalculation,
    QvCalculationState,
    QvInputAllocation,
    QvInputItem,
    QvInputSnapshot,
    QvResultItem,
    RealtimeEventOutbox,
    RealtimeEventOutboxTopic,
)
from credit_voting_worker.generated_rules import (
    QV_ALGORITHM_VERSION,
    QV_RULE_VERSION,
)
from credit_voting_worker.work import Claim, InvalidInputError, lock_claim, renew_claim

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy import Engine


@dataclass(frozen=True)
class ItemTotal:
    slug_id: str
    position: int
    support: int
    opposition: int
    supporters: int
    opponents: int

    @property
    def net(self) -> int:
        return self.support - self.opposition


@dataclass(frozen=True)
class RankedTotal:
    total: ItemTotal
    rank: int


def rank_totals(totals: list[ItemTotal]) -> list[RankedTotal]:
    """Competition ranks: 1, 1, 3. Position/slug order ties, never break them."""
    ranked: list[RankedTotal] = []
    previous_net: int | None = None
    rank = 0
    for index, total in enumerate(
        sorted(totals, key=lambda item: (-item.net, item.position, item.slug_id)), start=1
    ):
        if total.net != previous_net:
            rank = index
        ranked.append(RankedTotal(total=total, rank=rank))
        previous_net = total.net
    return ranked


def compute_results(
    *, engine: Engine, claim: Claim, snapshot_id: UUID, lease_seconds: int
) -> list[RankedTotal] | None:
    with Session(engine) as session, session.begin():
        if lock_claim(session=session, claim=claim) is None:
            return None
        snapshot = session.scalars(
            select(QvInputSnapshot).where(QvInputSnapshot.id == snapshot_id)
        ).one()
        if (
            snapshot.algorithm_version != QV_ALGORITHM_VERSION
            or snapshot.rule_version != QV_RULE_VERSION
            or snapshot.credit_pricing != "quadratic"
        ):
            raise InvalidInputError("Unsupported QV calculation provenance")
        aggregates = (
            session.execute(
                select(
                    QvInputAllocation.item_slug_id,
                    func.sum(case((QvInputAllocation.votes > 0, QvInputAllocation.votes), else_=0)),
                    func.sum(
                        case((QvInputAllocation.votes < 0, -QvInputAllocation.votes), else_=0)
                    ),
                    func.count().filter(QvInputAllocation.votes > 0),
                    func.count().filter(QvInputAllocation.votes < 0),
                )
                .where(QvInputAllocation.snapshot_id == snapshot_id)
                .group_by(QvInputAllocation.item_slug_id)
            )
            .tuples()
            .all()
        )
        by_slug = {
            slug: (support, opposition, supporters, opponents)
            for slug, support, opposition, supporters, opponents in aggregates
        }
        items = session.scalars(
            select(QvInputItem).where(QvInputItem.snapshot_id == snapshot_id)
        ).all()
        totals: list[ItemTotal] = []
        for item in items:
            support, opposition, supporters, opponents = by_slug.get(
                item.item_slug_id, (0, 0, 0, 0)
            )
            totals.append(
                ItemTotal(
                    slug_id=item.item_slug_id,
                    position=item.position,
                    support=support,
                    opposition=opposition,
                    supporters=supporters,
                    opponents=opponents,
                )
            )
        result = rank_totals(totals)
        renew_claim(session=session, claim=claim, lease_seconds=lease_seconds)
        return result


def publish_results(
    *, engine: Engine, claim: Claim, snapshot_id: UUID, results: list[RankedTotal]
) -> bool:
    with Session(engine) as session, session.begin():
        # Lifecycle lock first, then claim/state. Capture holds no conflicting
        # conversation lock, so reopen never waits for bulk input copying.
        conversation = session.scalars(
            select(Conversation)
            .where(
                Conversation.id == claim.conversation_id,
                Conversation.is_closed.is_(True),
                Conversation.prioritization_type == "qv",
                Conversation.is_importing.is_(False),
                Conversation.current_content_id.is_not(None),
            )
            .with_for_update(key_share=True)
        ).one_or_none()
        if conversation is None:
            return False
        state = session.scalars(
            select(QvCalculationState).where(
                QvCalculationState.conversation_id == claim.conversation_id,
                QvCalculationState.generation == claim.generation,
            )
        ).one_or_none()
        job = lock_claim(session=session, claim=claim)
        if state is None or job is None or job.input_snapshot_id != snapshot_id:
            return False
        for offset in range(0, len(results), 1000):
            session.execute(
                insert(QvResultItem).values(
                    [
                        {
                            "snapshot_id": snapshot_id,
                            "item_slug_id": ranked.total.slug_id,
                            "support_units": ranked.total.support,
                            "opposition_units": ranked.total.opposition,
                            "net_units": ranked.total.net,
                            "supporting_participant_count": ranked.total.supporters,
                            "opposing_participant_count": ranked.total.opponents,
                            "rank": ranked.rank,
                        }
                        for ranked in results[offset : offset + 1000]
                    ]
                )
            )
        # clock_timestamp, not transaction-start now(): publication must still own
        # the lease after waiting for locks and persisting the complete result set.
        published = session.scalars(
            update(QvCalculation)
            .where(
                QvCalculation.id == claim.calculation_id,
                QvCalculation.lease_token == claim.token,
                QvCalculation.lease_expires_at > func.clock_timestamp(),
            )
            .values(
                status="ready",
                ready_at=func.clock_timestamp(),
                lease_token=None,
                lease_expires_at=None,
            )
            .returning(QvCalculation.id)
        ).one_or_none()
        if published is None:
            # Raising rolls back the result rows too; retry reuses the saved input.
            raise TimeoutError("QV publication lease expired")
        session.execute(
            update(QvCalculationState)
            .where(QvCalculationState.conversation_id == claim.conversation_id)
            .values(current_calculation_id=claim.calculation_id)
        )
        close_id = None
        active_generation = claim.generation
        if conversation.closed_finalized_at is None:
            finalized_at = session.execute(
                update(Conversation)
                .where(Conversation.id == claim.conversation_id)
                .values(
                    closing_target_revision=claim.generation,
                    closed_finalized_at=func.clock_timestamp(),
                )
                .returning(Conversation.closed_finalized_at)
            ).scalar_one()
            close_id = session.scalar(
                insert(ConversationAnalysisClose)
                .values(
                    conversation_id=claim.conversation_id,
                    close_epoch=conversation.vote_buffer_epoch,
                    source_revision=claim.generation,
                    finalized_at=finalized_at,
                )
                .returning(ConversationAnalysisClose.id)
            )
            # An eligibility mutation may have staged Live work while this
            # original capture was in flight. Activate it only after binding Closing.
            follow_up_generation = session.scalar(
                select(QvCalculation.generation).where(
                    QvCalculation.conversation_id == claim.conversation_id,
                    QvCalculation.generation == claim.generation + 1,
                )
            )
            if follow_up_generation is not None:
                active_generation = follow_up_generation
                session.execute(
                    update(QvCalculationState)
                    .where(QvCalculationState.conversation_id == claim.conversation_id)
                    .values(generation=active_generation)
                )
        else:
            close_id = session.scalar(
                select(ConversationAnalysisClose.id).where(
                    ConversationAnalysisClose.conversation_id == conversation.id,
                    ConversationAnalysisClose.close_epoch == conversation.vote_buffer_epoch,
                    ConversationAnalysisClose.source_revision
                    == conversation.closing_target_revision,
                    ConversationAnalysisClose.finalized_at == conversation.closed_finalized_at,
                )
            )
            if close_id is not None:
                session.execute(
                    update(ConversationAnalysisClose)
                    .where(
                        ConversationAnalysisClose.id == close_id,
                        ConversationAnalysisClose.selected_input_mode == "live",
                        ConversationAnalysisClose.requested_result_revision == claim.generation,
                    )
                    .values(served_input_mode="live", served_result_revision=claim.generation)
                )
            else:
                # Unbound legacy closes keep their existing correction behavior.
                session.execute(
                    update(Conversation)
                    .where(Conversation.id == conversation.id)
                    .values(
                        closing_target_revision=claim.generation,
                        closed_finalized_at=func.clock_timestamp(),
                    )
                )
        event_id = session.scalars(
            insert(RealtimeEventOutbox)
            .values(
                event_type="conversation_qv_calculation_updated",
                payload={
                    "conversationSlugId": conversation.slug_id,
                    "generation": active_generation,
                    "status": "ready" if active_generation == claim.generation else "calculating",
                    **({"closeId": close_id} if close_id is not None else {}),
                },
            )
            .returning(RealtimeEventOutbox.id)
        ).one()
        session.execute(
            insert(RealtimeEventOutboxTopic).values(
                event_id=event_id, topic=f"conversation:{conversation.slug_id}"
            )
        )
        return True
