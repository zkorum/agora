from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import timedelta
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import and_, func, insert, or_, select, update
from sqlalchemy.orm import Session

from credit_voting_worker.generated_models import (
    Conversation,
    QvCalculation,
    QvCalculationState,
    RealtimeEventOutbox,
    RealtimeEventOutboxTopic,
)

if TYPE_CHECKING:
    from sqlalchemy import Engine


@dataclass(frozen=True)
class Claim:
    calculation_id: UUID
    conversation_id: int
    generation: int
    token: UUID
    attempt: int


class InvalidInputError(Exception):
    """Persisted source or algorithm provenance cannot be calculated faithfully."""


def claim_next(*, engine: Engine, lease_seconds: int) -> Claim | None:
    with Session(engine) as session, session.begin():
        job = session.scalars(
            select(QvCalculation)
            .join(Conversation, Conversation.id == QvCalculation.conversation_id)
            .join(QvCalculationState, QvCalculationState.conversation_id == Conversation.id)
            .where(
                Conversation.is_closed.is_(True),
                Conversation.prioritization_type == "qv",
                Conversation.is_importing.is_(False),
                Conversation.current_content_id.is_not(None),
                QvCalculationState.generation == QvCalculation.generation,
                QvCalculation.next_attempt_at <= func.clock_timestamp(),
                or_(
                    QvCalculation.status == "queued",
                    and_(
                        QvCalculation.status == "running",
                        QvCalculation.lease_expires_at <= func.clock_timestamp(),
                    ),
                ),
            )
            .order_by(QvCalculation.next_attempt_at, QvCalculation.created_at)
            .with_for_update(skip_locked=True, of=QvCalculation)
            .limit(1)
        ).one_or_none()
        if job is None:
            return None
        token = uuid4()
        attempt = job.attempt_count + 1
        session.execute(
            update(QvCalculation)
            .where(QvCalculation.id == job.id)
            .values(
                status="running",
                attempt_count=attempt,
                lease_token=token,
                lease_expires_at=func.clock_timestamp() + timedelta(seconds=lease_seconds),
                error_code=None,
            )
        )
        return Claim(
            calculation_id=job.id,
            conversation_id=job.conversation_id,
            generation=job.generation,
            token=token,
            attempt=attempt,
        )


def lock_claim(*, session: Session, claim: Claim) -> QvCalculation | None:
    return session.scalars(
        select(QvCalculation)
        .where(
            QvCalculation.id == claim.calculation_id,
            QvCalculation.status == "running",
            QvCalculation.lease_token == claim.token,
        )
        .with_for_update()
    ).one_or_none()


def renew_claim(*, session: Session, claim: Claim, lease_seconds: int) -> None:
    # Capture/tally hold the work-row lock continuously: expired claims cannot be
    # stolen during either SQL stage. Renew before releasing that stronger lock.
    session.execute(
        update(QvCalculation)
        .where(
            QvCalculation.id == claim.calculation_id,
            QvCalculation.lease_token == claim.token,
        )
        .values(lease_expires_at=func.clock_timestamp() + timedelta(seconds=lease_seconds))
    )


def retry_delay_seconds(attempt: int) -> float:
    return min(2 ** min(attempt, 8), 300) * random.uniform(0.8, 1.0)


def release_failed_claim(*, engine: Engine, claim: Claim, permanent: bool) -> None:
    with Session(engine) as session, session.begin():
        released = session.scalars(
            update(QvCalculation)
            .where(
                QvCalculation.id == claim.calculation_id,
                QvCalculation.status == "running",
                QvCalculation.lease_token == claim.token,
            )
            .values(
                status="failed" if permanent else "queued",
                lease_token=None,
                lease_expires_at=None,
                next_attempt_at=func.clock_timestamp()
                + timedelta(seconds=retry_delay_seconds(claim.attempt)),
                error_code="invalid_input" if permanent else "transient",
            )
            .returning(QvCalculation.id)
        ).one_or_none()
        if released is not None and permanent:
            slug = session.scalar(
                select(Conversation.slug_id)
                .join(
                    QvCalculationState,
                    QvCalculationState.conversation_id == Conversation.id,
                )
                .where(
                    Conversation.id == claim.conversation_id,
                    Conversation.is_closed.is_(True),
                    Conversation.current_content_id.is_not(None),
                    QvCalculationState.generation == claim.generation,
                )
            )
            if slug is not None:
                event_id = session.scalars(
                    insert(RealtimeEventOutbox)
                    .values(
                        event_type="conversation_qv_calculation_updated",
                        payload={
                            "conversationSlugId": slug,
                            "generation": claim.generation,
                            "status": "failed",
                        },
                    )
                    .returning(RealtimeEventOutbox.id)
                ).one()
                session.execute(
                    insert(RealtimeEventOutboxTopic).values(
                        event_id=event_id, topic=f"conversation:{slug}"
                    )
                )
