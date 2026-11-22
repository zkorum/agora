from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Protocol

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from agora_analysis_worker_shared.generated_models import (
    AnalysisInputMode,
    AnalysisSnapshot,
    AnalysisSnapshotResult,
    AnalysisWorkState,
    Conversation,
    ConversationAnalysisClose,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotCheckpointReasonEnum,
    OpinionGroupSpec,
    PolisAnalysisClose,
    PolisAnalysisCloseGeneration,
    PolisConversationConfig,
)

if TYPE_CHECKING:
    from collections.abc import Sequence

    from sqlalchemy.orm import Session
    from sqlalchemy.sql import SQLColumnExpression
    from sqlalchemy.sql.elements import ColumnElement
    from sqlalchemy.sql.selectable import ScalarSelect


class PublicationClaim(Protocol):
    @property
    def id(self) -> int: ...
    @property
    def conversation_id(self) -> int: ...
    @property
    def data_generation(self) -> int: ...
    @property
    def lease_token(self) -> str: ...
    @property
    def opinion_group_spec_id(self) -> int: ...
    @property
    def uses_closing_inputs(self) -> bool: ...


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


def vote_buffer_ready_for_analysis() -> ColumnElement[bool]:
    # Open analysis follows persisted input generations. Closed finalization must
    # additionally wait until the API has sealed/drained that epoch's cache.
    return or_(Conversation.is_closed.is_(False), Conversation.vote_buffer_drained.is_(True))


def lock_analysis_conversations(session: Session, *, conversation_ids: Sequence[int]) -> None:
    session.execute(
        select(Conversation.id)
        .where(Conversation.id.in_(sorted(set(conversation_ids))))
        .order_by(Conversation.id)
        .with_for_update()
    ).all()


def current_polis_close_condition() -> ColumnElement[bool]:
    return (
        (Conversation.id == ConversationAnalysisClose.conversation_id)
        & (Conversation.vote_buffer_epoch == ConversationAnalysisClose.close_epoch)
        & (Conversation.closed_finalized_at == ConversationAnalysisClose.finalized_at)
        & (Conversation.closing_target_revision == ConversationAnalysisClose.source_revision)
        & Conversation.is_closed.is_(True)
        & Conversation.vote_buffer_drained.is_(True)
        & Conversation.deleted_at.is_(None)
    )


def lock_current_polis_close_generation(
    *, session: Session, claim: PublicationClaim
) -> PolisAnalysisCloseGeneration | None:
    lock_analysis_conversations(session, conversation_ids=[claim.conversation_id])
    return session.scalars(
        select(PolisAnalysisCloseGeneration)
        .join(Conversation, Conversation.id == PolisAnalysisCloseGeneration.conversation_id)
        .join(
            ConversationAnalysisClose,
            ConversationAnalysisClose.id == PolisAnalysisCloseGeneration.close_id,
        )
        .where(
            Conversation.id == claim.conversation_id,
            Conversation.current_content_id.is_not(None),
            Conversation.conversation_type == ConversationType.polis,
            Conversation.is_importing.is_(False),
            current_polis_close_condition(),
            PolisAnalysisCloseGeneration.data_generation == claim.data_generation,
            PolisAnalysisCloseGeneration.data_generation
            == ConversationAnalysisClose.minimum_closing_result_revision,
        )
    ).one_or_none()


def current_polis_work_revision() -> ColumnElement[int]:
    """Closing has a close-bound target; Live uses the ordinary config revision."""
    closing_revision: ScalarSelect[int] = (
        select(PolisAnalysisCloseGeneration.data_generation)
        .select_from(ConversationAnalysisClose)
        .join(
            PolisAnalysisCloseGeneration,
            PolisAnalysisCloseGeneration.close_id == ConversationAnalysisClose.id,
        )
        .join(PolisAnalysisClose, PolisAnalysisClose.close_id == ConversationAnalysisClose.id)
        .where(
            PolisAnalysisClose.opinion_group_spec_id == AnalysisWorkState.opinion_group_spec_id,
            current_polis_close_condition(),
            PolisAnalysisCloseGeneration.data_generation
            == ConversationAnalysisClose.minimum_closing_result_revision,
        )
        .correlate(Conversation, AnalysisWorkState)
        .scalar_subquery()
    )
    return case(
        (AnalysisWorkState.uses_closing_inputs.is_(True), closing_revision),
        else_=PolisConversationConfig.analysis_data_generation,
    )


@dataclass(frozen=True)
class AnalysisPublicationAdmission:
    claim_ids: frozenset[int]
    initial_close_conversation_ids: frozenset[int]


def admit_analysis_publication(
    session: Session, *, claims: Sequence[PublicationClaim]
) -> AnalysisPublicationAdmission:
    lock_analysis_conversations(
        session, conversation_ids=[claim.conversation_id for claim in claims]
    )
    states = session.execute(
        select(
            Conversation.id,
            Conversation.closed_finalized_at,
            PolisConversationConfig.analysis_data_generation,
            Conversation.is_closed,
            Conversation.closing_target_revision,
        )
        .join(PolisConversationConfig, PolisConversationConfig.id == Conversation.polis_config_id)
        .where(
            Conversation.id.in_([claim.conversation_id for claim in claims]),
            Conversation.current_content_id.is_not(None),
            Conversation.is_importing.is_(False),
            Conversation.deleted_at.is_(None),
            or_(
                Conversation.closed_finalized_at.is_(None),
                Conversation.is_closed.is_(True)
                & (
                    PolisConversationConfig.analysis_data_generation
                    > Conversation.closing_target_revision
                ),
            ),
            vote_buffer_ready_for_analysis(),
        )
    ).all()
    state_by_conversation = {row.id: row for row in states}
    permitted: set[int] = set()
    initial_closes: set[int] = set()
    for claim in claims:
        if not claim.uses_closing_inputs:
            state = state_by_conversation.get(claim.conversation_id)
            allowed = state is not None and state.analysis_data_generation == claim.data_generation
            if (
                state is not None
                and allowed
                and state.is_closed
                and state.closed_finalized_at is None
                and state.closing_target_revision == claim.data_generation
            ):
                initial_closes.add(claim.conversation_id)
        else:
            binding = lock_current_polis_close_generation(session=session, claim=claim)
            allowed = (
                binding is not None
                and session.get(PolisAnalysisClose, (binding.close_id, claim.opinion_group_spec_id))
                is not None
            )
        if allowed:
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
    return AnalysisPublicationAdmission(frozenset(permitted), frozenset(initial_closes))


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
                Conversation.deleted_at.is_(None),
                Conversation.closed_finalized_at.is_(None),
                ConversationViewSnapshot.close_replacement_generation.is_(None),
                vote_buffer_ready_for_analysis(),
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
            Conversation.vote_buffer_epoch,
            PolisConversationConfig.analysis_data_generation,
        )
        .join(PolisConversationConfig, PolisConversationConfig.id == Conversation.polis_config_id)
        .where(
            Conversation.id.in_(conversation_ids),
            Conversation.is_closed.is_(True),
            Conversation.closed_finalized_at.is_(None),
            Conversation.current_content_id.is_not(None),
            Conversation.deleted_at.is_(None),
            Conversation.is_importing.is_(False),
            vote_buffer_ready_for_analysis(),
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
            .join(
                AnalysisSnapshotResult,
                (AnalysisSnapshotResult.analysis_snapshot_id == AnalysisSnapshot.id)
                & (AnalysisSnapshotResult.conversation_id == state.id)
                & (
                    AnalysisSnapshotResult.opinion_group_spec_id
                    == ConversationViewSnapshot.opinion_group_spec_id
                ),
            )
            .where(
                ConversationViewSnapshot.conversation_id == state.id,
                ConversationViewSnapshot.opinion_group_spec_id.in_(spec_ids),
                ConversationViewSnapshot.is_closed.is_(True),
                ConversationViewSnapshot.activated_at.is_not(None),
                AnalysisSnapshot.data_generation == state.analysis_data_generation,
                AnalysisSnapshot.conversation_id == state.id,
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
        finalized_at = session.execute(
            update(Conversation)
            .where(Conversation.id == state.id)
            .values(closed_finalized_at=func.now())
            .returning(Conversation.closed_finalized_at)
        ).scalar_one()
        close = ConversationAnalysisClose(
            conversation_id=state.id,
            close_epoch=state.vote_buffer_epoch,
            source_revision=state.analysis_data_generation,
            selected_input_mode=AnalysisInputMode.closing,
            served_input_mode=AnalysisInputMode.closing,
            finalized_at=finalized_at,
        )
        session.add(close)
        session.flush()
        session.add_all(
            PolisAnalysisClose(
                close_id=close.id,
                conversation_id=state.id,
                opinion_group_spec_id=spec_id,
                original_view_snapshot_id=view_id,
            )
            for spec_id, view_id in view_by_spec.items()
        )
        session.flush()
