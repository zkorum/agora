from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from agora_analysis_worker_shared.logging_utils import log_worker_error_summary
from psycopg.errors import SerializationFailure
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from credit_voting_worker.generated_models import (
    Conversation,
    QvLiveStats,
    QvStatsRefresh,
    RealtimeEventOutbox,
    RealtimeEventOutboxTopic,
)
from credit_voting_worker.inputs import count_live_participants

if TYPE_CHECKING:
    from sqlalchemy import Engine


@dataclass(frozen=True)
class StatsClaim:
    conversation_id: int
    slug_id: str
    participant_count: int
    revision: int
    refreshed_at: datetime | None


def initialize_missing_stats(*, engine: Engine, limit: int = 100) -> int:
    """Bounded bootstrap also discovers historical QV conversations without a wakeup."""
    with Session(engine) as session, session.begin():
        ids = session.scalars(
            select(Conversation.id)
            .outerjoin(QvLiveStats, QvLiveStats.conversation_id == Conversation.id)
            .where(
                Conversation.prioritization_type == "qv",
                Conversation.current_content_id.is_not(None),
                QvLiveStats.conversation_id.is_(None),
            )
            .order_by(Conversation.id)
            .limit(limit)
        ).all()
        if ids:
            session.execute(
                insert(QvLiveStats)
                .values([{"conversation_id": cid} for cid in ids])
                .on_conflict_do_nothing()
            )
        return len(ids)


def refresh_next_stats(
    *, engine: Engine, reconcile_seconds: int = 60, min_refresh_seconds: float = 0
) -> int | None:
    """Lock, count, publish and ACK in one snapshot; defer only the failing conversation."""
    claim = None
    try:
        with (
            engine.connect().execution_options(isolation_level="REPEATABLE READ") as connection,
            Session(connection) as session,
            session.begin(),
        ):
            claim = _claim_next_stats(
                session=session,
                reconcile_seconds=reconcile_seconds,
                min_refresh_seconds=min_refresh_seconds,
            )
            if claim is None:
                return None
            _refresh_stats(session=session, claim=claim)
            return claim.conversation_id
    except OperationalError as error:
        # RR may have seen a row just before another worker committed it. Obtain
        # a fresh snapshot next time rather than penalizing successful concurrent work.
        if isinstance(error.orig, SerializationFailure):
            return None
        if claim is None:
            raise
        _defer_stats(engine=engine, claim=claim, error=error)
        return claim.conversation_id
    except SQLAlchemyError as error:
        if claim is None:
            raise
        _defer_stats(engine=engine, claim=claim, error=error)
        return claim.conversation_id


def _defer_stats(*, engine: Engine, claim: StatsClaim, error: SQLAlchemyError) -> None:
    # The failed snapshot has rolled back before this independent transaction.
    # Do not overwrite a successful refresh by another worker in the meantime.
    # If the database itself is unavailable, propagate to process-wide backoff.
    with Session(engine) as session, session.begin():
        session.execute(
            update(QvLiveStats)
            .where(
                QvLiveStats.conversation_id == claim.conversation_id,
                QvLiveStats.revision == claim.revision,
                QvLiveStats.refreshed_at.is_not_distinct_from(claim.refreshed_at),
            )
            .values(retry_after=func.now() + timedelta(seconds=30))
        )
    log_worker_error_summary(
        logger=logging.getLogger("credit_voting_worker"),
        message="QV statistics refresh deferred",
        error=error,
    )


def _claim_next_stats(
    *, session: Session, reconcile_seconds: int, min_refresh_seconds: float
) -> StatsClaim | None:
    pending = (
        select(QvStatsRefresh.id)
        .where(
            QvStatsRefresh.conversation_id == QvLiveStats.conversation_id,
            QvStatsRefresh.processed_at.is_(None),
        )
        .exists()
    )
    row = session.execute(
        select(
            QvLiveStats.conversation_id,
            Conversation.slug_id,
            QvLiveStats.participant_count,
            QvLiveStats.revision,
            QvLiveStats.refreshed_at,
        )
        .join(Conversation, Conversation.id == QvLiveStats.conversation_id)
        .where(
            Conversation.current_content_id.is_not(None),
            Conversation.is_importing.is_(False),
            Conversation.prioritization_type == "qv",
            or_(QvLiveStats.retry_after.is_(None), QvLiveStats.retry_after <= func.now()),
            or_(
                and_(
                    pending,
                    or_(
                        QvLiveStats.refreshed_at.is_(None),
                        QvLiveStats.refreshed_at
                        <= func.now() - timedelta(seconds=min_refresh_seconds),
                    ),
                ),
                QvLiveStats.refreshed_at.is_(None),
                QvLiveStats.refreshed_at < func.now() - timedelta(seconds=reconcile_seconds),
            ),
        )
        .order_by(QvLiveStats.refreshed_at.asc().nulls_first(), QvLiveStats.conversation_id)
        .with_for_update(skip_locked=True, of=QvLiveStats)
        .limit(1)
    ).one_or_none()
    return None if row is None else StatsClaim(*row)


def _refresh_stats(*, session: Session, claim: StatsClaim) -> None:
    count = count_live_participants(session=session, conversation_id=claim.conversation_id)
    # Revision zero has never been published, including when its initial count is zero.
    changed = claim.revision == 0 or count != claim.participant_count
    revision = claim.revision + int(changed)
    session.execute(
        update(QvLiveStats)
        .where(QvLiveStats.conversation_id == claim.conversation_id)
        .values(
            participant_count=count, revision=revision, refreshed_at=func.now(), retry_after=None
        )
    )
    # Only rows visible in this MVCC snapshot are ACKed. Signals committed later
    # stay pending even if their sequence IDs were allocated earlier.
    session.execute(
        update(QvStatsRefresh)
        .where(
            QvStatsRefresh.conversation_id == claim.conversation_id,
            QvStatsRefresh.processed_at.is_(None),
        )
        .values(processed_at=func.now())
    )
    if not changed:
        return
    event_id = session.scalars(
        insert(RealtimeEventOutbox)
        .values(
            event_type="conversation_qv_stats_updated",
            payload={
                "conversationSlugId": claim.slug_id,
                "qvStatsRevision": revision,
                "participantCount": count,
            },
        )
        .returning(RealtimeEventOutbox.id)
    ).one()
    session.execute(
        insert(RealtimeEventOutboxTopic).values(
            event_id=event_id,
            topic=f"conversation:{claim.slug_id}",
        )
    )
