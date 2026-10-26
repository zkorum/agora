from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Protocol

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from agora_analysis_worker_shared.generated_models import (
    AnalysisSnapshot,
    AnalysisWorkState,
    Conversation,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotCheckpointReasonEnum,
    OpinionGroupSpec,
    PolisConversationConfig,
    VoteSubmission,
)

if TYPE_CHECKING:
    from collections.abc import Sequence

    from sqlalchemy.orm import Session
    from sqlalchemy.sql import SQLColumnExpression
    from sqlalchemy.sql.elements import ColumnElement


class PublicationClaim(Protocol):
    @property
    def id(self) -> int: ...
    @property
    def conversation_id(self) -> int: ...
    @property
    def data_generation(self) -> int: ...
    @property
    def lease_token(self) -> str: ...


def closing_retry_ready_condition(
    *, data_generation: SQLColumnExpression[int]
) -> ColumnElement[bool]:
    """Use durable attempt/error metadata so restarts do not reset retry delays."""
    now = datetime.now(UTC)
    retry_cutoff = case(
        (AnalysisWorkState.attempt_count <= 1, now - timedelta(seconds=5)),
        (AnalysisWorkState.attempt_count <= 2, now - timedelta(seconds=15)),
        (AnalysisWorkState.attempt_count <= 3, now - timedelta(seconds=60)),
        else_=now - timedelta(seconds=300),
    )
    return or_(
        AnalysisWorkState.last_error_code.is_(None),
        AnalysisWorkState.attempt_generation.is_(None),
        AnalysisWorkState.attempt_generation != data_generation,
        AnalysisWorkState.updated_at <= retry_cutoff,
    )


def no_pending_vote_submissions() -> ColumnElement[bool]:
    return (
        ~select(VoteSubmission.id)
        .where(
            VoteSubmission.conversation_id == Conversation.id,
            VoteSubmission.pending.is_(True),
        )
        .correlate(Conversation)
        .exists()
    )


def lock_analysis_conversations(session: Session, *, conversation_ids: Sequence[int]) -> None:
    session.execute(
        select(Conversation.id)
        .where(Conversation.id.in_(sorted(set(conversation_ids))))
        .order_by(Conversation.id)
        .with_for_update()
    ).all()


def permitted_publication_claim_ids(
    session: Session, *, claims: Sequence[PublicationClaim]
) -> set[int]:
    lock_analysis_conversations(
        session, conversation_ids=[claim.conversation_id for claim in claims]
    )
    states = session.execute(
        select(Conversation.id, PolisConversationConfig.analysis_data_generation)
        .join(PolisConversationConfig, PolisConversationConfig.id == Conversation.polis_config_id)
        .where(
            Conversation.id.in_([claim.conversation_id for claim in claims]),
            Conversation.current_content_id.is_not(None),
            Conversation.is_importing.is_(False),
            Conversation.closed_finalized_at.is_(None),
            no_pending_vote_submissions(),
        )
    ).all()
    generation_by_conversation = {row.id: row.analysis_data_generation for row in states}
    permitted: set[int] = set()
    for claim in claims:
        if generation_by_conversation.get(claim.conversation_id) == claim.data_generation:
            permitted.add(claim.id)
            continue
        # Superseded output is never published. Release its owned lease so the
        # normal durable-generation reconciliation can pick up the latest work.
        session.execute(
            update(AnalysisWorkState)
            .where(
                AnalysisWorkState.id == claim.id,
                AnalysisWorkState.lease_token == claim.lease_token,
            )
            .values(
                last_completed_data_generation=case(
                    (
                        AnalysisWorkState.last_completed_data_generation < claim.data_generation,
                        claim.data_generation,
                    ),
                    else_=AnalysisWorkState.last_completed_data_generation,
                ),
                running_data_generation=None,
                persisted_analysis_snapshot_id=None,
                lease_owner=None,
                lease_token=None,
                lease_expires_at=None,
                updated_at=func.now(),
            )
        )
    return permitted


def activatable_analysis_view_ids(
    session: Session, *, view_ids: list[int], conversation_ids: list[int]
) -> list[int]:
    lock_analysis_conversations(session, conversation_ids=conversation_ids)
    return list(
        session.scalars(
            select(ConversationViewSnapshot.id)
            .join(Conversation, Conversation.id == ConversationViewSnapshot.conversation_id)
            .join(
                PolisConversationConfig, PolisConversationConfig.id == Conversation.polis_config_id
            )
            .join(
                AnalysisSnapshot,
                AnalysisSnapshot.id == ConversationViewSnapshot.analysis_snapshot_id,
            )
            .where(
                ConversationViewSnapshot.id.in_(view_ids),
                Conversation.current_content_id.is_not(None),
                Conversation.is_importing.is_(False),
                Conversation.closed_finalized_at.is_(None),
                no_pending_vote_submissions(),
                AnalysisSnapshot.data_generation
                == PolisConversationConfig.analysis_data_generation,
            )
        )
    )


def finalize_closed_analysis(session: Session, *, conversation_ids: list[int]) -> None:
    lock_analysis_conversations(session, conversation_ids=conversation_ids)
    spec_rows = session.execute(
        select(OpinionGroupSpec.id, OpinionGroupSpec.key).order_by(
            OpinionGroupSpec.key, OpinionGroupSpec.version.desc()
        )
    ).all()
    spec_by_key: dict[str, int] = {}
    for row in spec_rows:
        spec_by_key.setdefault(row.key, row.id)
    spec_ids = set(spec_by_key.values())
    if not spec_ids:
        return
    states = session.execute(
        select(
            Conversation.id,
            Conversation.closing_target_revision,
            PolisConversationConfig.analysis_data_generation,
        )
        .join(PolisConversationConfig, PolisConversationConfig.id == Conversation.polis_config_id)
        .where(
            Conversation.id.in_(conversation_ids),
            Conversation.is_closed.is_(True),
            Conversation.closed_finalized_at.is_(None),
            no_pending_vote_submissions(),
        )
    ).all()
    for state in states:
        if state.closing_target_revision != state.analysis_data_generation:
            continue
        views = session.execute(
            select(ConversationViewSnapshot.id, ConversationViewSnapshot.opinion_group_spec_id)
            .join(
                AnalysisSnapshot,
                AnalysisSnapshot.id == ConversationViewSnapshot.analysis_snapshot_id,
            )
            .where(
                ConversationViewSnapshot.conversation_id == state.id,
                ConversationViewSnapshot.opinion_group_spec_id.in_(spec_ids),
                ConversationViewSnapshot.is_closed.is_(True),
                ConversationViewSnapshot.activated_at.is_not(None),
                AnalysisSnapshot.data_generation == state.analysis_data_generation,
            )
            .order_by(ConversationViewSnapshot.id.desc())
        ).all()
        view_by_spec: dict[int, int] = {}
        for view in views:
            view_by_spec.setdefault(view.opinion_group_spec_id, view.id)
        if set(view_by_spec) != spec_ids:
            continue
        values = [
            {
                "conversation_view_snapshot_id": view_id,
                "conversation_id": state.id,
                "opinion_group_spec_id": spec_id,
                "reason": ConversationViewSnapshotCheckpointReasonEnum.conversation_closed,
                "created_at": func.now(),
            }
            for spec_id, view_id in view_by_spec.items()
        ]
        statement = sqlite_insert if session.get_bind().dialect.name == "sqlite" else pg_insert
        session.execute(
            statement(ConversationViewSnapshotCheckpointReason)
            .values(values)
            .on_conflict_do_nothing()
        )
        session.execute(
            update(Conversation)
            .where(Conversation.id == state.id)
            .values(closed_finalized_at=func.now())
        )
