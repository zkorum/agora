"""Score the bound comparison population without consulting working votes or account links."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import or_, select, text
from sqlalchemy.orm import Session, aliased

from scoring_worker.db import ComparisonRow, pending_closing_work
from scoring_worker.generated_models import (
    AnalysisInputMode,
    ComparisonAnalysisClose,
    ComparisonInputBaseline,
    Conversation,
    ConversationAnalysisClose,
    RankingConversationConfig,
    RankingConversationStatsItem,
    RankingConversationStatsSnapshot,
    RankingInputAnswer,
    RankingInputItem,
    RankingInputSnapshot,
    RankingItem,
    RealtimeEventOutbox,
)
from scoring_worker.observations import build_participant_counts
from scoring_worker.pipeline_config import (
    SCORING_ALGORITHM_VERSION,
    SOLIDAGO_VERSION,
    ComparisonRecipe,
)
from scoring_worker.prepared_inputs import ComparisonTaskProjection, project_comparison_tasks
from scoring_worker.scoring import score_comparison_observations

if TYPE_CHECKING:
    from sqlalchemy import Connection


@dataclass(frozen=True)
class Target:
    conversation_id: int
    close_id: int
    revision: int
    original_id: int


@dataclass(frozen=True)
class Inputs:
    slugs: tuple[str, ...]
    tasks: ComparisonTaskProjection
    recipe: ComparisonRecipe


@dataclass(frozen=True)
class ClosingItem:
    rank: int | None
    score: float | None
    participant_count: int


@dataclass(frozen=True)
class ClosingResult:
    items: dict[str, ClosingItem]
    vote_count: int
    participant_count: int


def _compute(inputs: Inputs) -> ClosingResult:
    observations = [task.observation for task in inputs.tasks.tasks]
    output = score_comparison_observations(
        entity_ids=inputs.slugs, observations=observations, recipe=inputs.recipe
    )
    counts = build_participant_counts(observations)
    ranks = (
        {
            row.entity_id: (rank, row.display_score)
            for rank, row in enumerate(output.global_scores, 1)
        }
        if output
        else {}
    )
    items: dict[str, ClosingItem] = {}
    for slug in inputs.slugs:
        rank, score = ranks.get(slug, (None, None))
        items[slug] = ClosingItem(rank, score, counts.get(slug, 0))
    return ClosingResult(items, len(observations), len(inputs.tasks.source_participant_indices))


def _inputs(*, session: Session, target: Target) -> Inputs:
    effective = aliased(RankingInputSnapshot)
    root = RankingInputSnapshot
    stats = RankingConversationStatsSnapshot
    certificate = ComparisonInputBaseline
    self_certificate = aliased(certificate)
    baseline = session.scalar(
        select(root)
        .select_from(stats)
        .join(
            effective,
            or_(
                effective.stats_snapshot_id == stats.id,
                effective.id == stats.reused_input_snapshot_id,
            ),
        )
        .join(certificate, certificate.input_snapshot_id == effective.id)
        .join(root, root.id == certificate.baseline_input_snapshot_id)
        .join(
            self_certificate,
            (self_certificate.input_snapshot_id == root.id)
            & (self_certificate.baseline_input_snapshot_id == root.id),
        )
        .where(
            stats.id == target.original_id,
            root.conversation_id == target.conversation_id,
            effective.sealed_at.is_not(None),
            root.sealed_at.is_not(None),
        )
    )
    if (
        baseline is None
        or baseline.algorithm_version != SCORING_ALGORITHM_VERSION
        or baseline.solidago_version != SOLIDAGO_VERSION
    ):
        raise ValueError("Unsupported comparison baseline")
    # The original active catalogue freezes lifecycle eligibility. An item
    # moderated at close can return after Restore; completed/canceled items cannot.
    slugs = tuple(
        session.scalars(
            select(RankingInputItem.item_slug_id)
            .join(RankingItem, RankingItem.slug_id == RankingInputItem.item_slug_id)
            .join(
                RankingConversationStatsItem,
                RankingConversationStatsItem.ranking_item_id == RankingItem.id,
            )
            .where(
                RankingInputItem.input_snapshot_id == baseline.id,
                RankingConversationStatsItem.stats_snapshot_id == target.original_id,
                RankingItem.moderation.is_(None),
            )
            .order_by(RankingInputItem.position)
        )
    )
    answers = session.scalars(
        select(RankingInputAnswer)
        .where(RankingInputAnswer.input_snapshot_id == baseline.id)
        .order_by(RankingInputAnswer.participant_index, RankingInputAnswer.position)
    )
    comparisons = [
        ComparisonRow(
            a.best_slug_id, a.worst_slug_id, a.effective_candidate_set, a.participant_index
        )
        for a in answers
    ]
    if len(comparisons) != baseline.answer_count:
        raise ValueError("Incomplete comparison baseline")
    return Inputs(
        slugs,
        project_comparison_tasks(entity_ids=slugs, comparisons=comparisons),
        ComparisonRecipe.model_validate(baseline.pipeline_config),
    )


def _finish(
    *,
    connection: Connection,
    target: Target,
    computed: ClosingResult | None,
) -> None:
    with (
        connection.begin(),
        Session(connection, join_transaction_mode="create_savepoint") as session,
        session.begin(),
    ):
        parent = session.scalar(
            select(Conversation)
            .where(
                Conversation.id == target.conversation_id,
                Conversation.is_closed.is_(True),
                Conversation.current_content_id.is_not(None),
                Conversation.deleted_at.is_(None),
            )
            .with_for_update(key_share=True)
        )
        if parent is None:
            return
        close = session.get_one(ConversationAnalysisClose, target.close_id)
        binding = session.get_one(ComparisonAnalysisClose, target.close_id)
        if (
            parent.vote_buffer_epoch != close.close_epoch
            or parent.closed_finalized_at != close.finalized_at
            or parent.closing_target_revision != close.source_revision
            or close.minimum_closing_result_revision != target.revision
            or binding.processed_closing_revision >= target.revision
        ):
            return
        if computed is None:
            binding.failed_closing_revision = target.revision
        else:
            original = session.get_one(RankingConversationStatsSnapshot, target.original_id)
            # The original baseline + this exact item catalogue reconstruct all
            # projected tasks. Do not duplicate participant/eligibility records.
            snapshot = RankingConversationStatsSnapshot(
                conversation_id=parent.id,
                derived_from_close_id=close.id,
                is_closed=True,
                item_count=len(computed.items),
                total_item_count=original.total_item_count,
                participant_count=computed.participant_count,
                total_participant_count=original.total_participant_count,
                vote_count=computed.vote_count,
                total_vote_count=original.total_vote_count,
                scoring_input_revision=target.revision,
                created_at=datetime.now(UTC),
            )
            session.add(snapshot)
            session.flush()
            for source, slug in session.execute(
                select(RankingConversationStatsItem, RankingItem.slug_id)
                .join(RankingItem, RankingItem.id == RankingConversationStatsItem.ranking_item_id)
                .where(RankingConversationStatsItem.stats_snapshot_id == original.id)
            ):
                item = computed.items.get(slug)
                if item is None:
                    continue
                session.add(
                    RankingConversationStatsItem(
                        stats_snapshot_id=snapshot.id,
                        conversation_id=parent.id,
                        ranking_item_id=source.ranking_item_id,
                        ranking_item_content_id=source.ranking_item_content_id,
                        lifecycle_status=source.lifecycle_status,
                        external_url=source.external_url,
                        rank=item.rank,
                        score=item.score,
                        participant_count=item.participant_count,
                    )
                )
            binding.closing_stats_snapshot_id = snapshot.id
            binding.processed_closing_revision = target.revision
            binding.failed_closing_revision = None
            if close.selected_input_mode == AnalysisInputMode.closing:
                binding.served_stats_snapshot_id = snapshot.id
                close.served_input_mode = AnalysisInputMode.closing
                close.served_result_revision = target.revision
                close.requested_result_revision = target.revision
        _notify_selection(
            session=session,
            parent=parent,
            binding=binding,
            close=close,
            checkpoint_changed=computed is not None,
        )


def record_failed_live_result(
    connection: Connection, *, conversation_id: int, revision: int
) -> bool:
    """Only deterministic errors for this still-current bound generation are terminal."""
    with (
        connection.begin(),
        Session(connection, join_transaction_mode="create_savepoint") as session,
        session.begin(),
    ):
        parent = session.scalar(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.is_closed.is_(True),
                Conversation.current_content_id.is_not(None),
                Conversation.closed_finalized_at.is_not(None),
            )
            .with_for_update(key_share=True)
        )
        if parent is None:
            return False
        row = session.execute(
            select(ConversationAnalysisClose, ComparisonAnalysisClose)
            .join(
                ComparisonAnalysisClose,
                ComparisonAnalysisClose.close_id == ConversationAnalysisClose.id,
            )
            .join(
                RankingConversationConfig, RankingConversationConfig.id == parent.ranking_config_id
            )
            .where(
                ConversationAnalysisClose.conversation_id == parent.id,
                ConversationAnalysisClose.close_epoch == parent.vote_buffer_epoch,
                ConversationAnalysisClose.source_revision == parent.closing_target_revision,
                ConversationAnalysisClose.finalized_at == parent.closed_finalized_at,
                RankingConversationConfig.scoring_input_revision == revision,
                RankingConversationConfig.processed_scoring_input_revision < revision,
            )
            .with_for_update(of=RankingConversationConfig)
        ).one_or_none()
        if row is None:
            return False
        close, binding = row
        binding.failed_live_revision = revision
        if close.selected_input_mode == AnalysisInputMode.live:
            _notify_selection(
                session=session,
                parent=parent,
                binding=binding,
                close=close,
                checkpoint_changed=False,
            )
        return True


def _notify_selection(
    *,
    session: Session,
    parent: Conversation,
    binding: ComparisonAnalysisClose,
    close: ConversationAnalysisClose,
    checkpoint_changed: bool,
) -> None:
    close.selection_revision += 1
    served = session.get_one(RankingConversationStatsSnapshot, binding.served_stats_snapshot_id)
    session.add(
        RealtimeEventOutbox(
            event_type="conversation_ranking_stats_updated",
            created_at=datetime.now(UTC),
            payload={
                "conversationSlugId": parent.slug_id,
                "rankingStatsSnapshotId": served.id,
                "checkpointChanged": checkpoint_changed,
                "closedSelectionChanged": True,
                "comparisonCloseSelectionVersion": {
                    "closeId": close.id,
                    "selectionRevision": close.selection_revision,
                },
                "opinionCount": served.item_count,
                "totalOpinionCount": served.total_item_count,
                "voteCount": served.vote_count,
                "totalVoteCount": served.total_vote_count,
                "participantCount": served.participant_count,
                "totalParticipantCount": served.total_participant_count,
                "moderatedOpinionCount": 0,
                "hiddenOpinionCount": 0,
                "isClosed": True,
                "timestamp": int(datetime.now(UTC).timestamp() * 1000),
            },
        )
    )


def refresh_pending_closing_results(connection: Connection, *, conversation_ids: list[int]) -> None:
    """Caller holds the native per-conversation worker locks, never across API writes."""
    with connection.begin(), Session(connection) as session:
        targets = [
            Target(*row)
            for row in session.execute(
                select(
                    Conversation.id,
                    ConversationAnalysisClose.id,
                    ConversationAnalysisClose.minimum_closing_result_revision,
                    ComparisonAnalysisClose.original_stats_snapshot_id,
                )
                .join(
                    ComparisonAnalysisClose,
                    ComparisonAnalysisClose.conversation_id == Conversation.id,
                )
                .join(
                    ConversationAnalysisClose,
                    ConversationAnalysisClose.id == ComparisonAnalysisClose.close_id,
                )
                .where(
                    Conversation.id.in_(conversation_ids),
                    ComparisonAnalysisClose.close_id.in_(pending_closing_work()),
                    Conversation.current_content_id.is_not(None),
                    Conversation.deleted_at.is_(None),
                )
            ).tuples()
        ]
    for target in targets:
        try:
            with connection.begin(), Session(connection) as session:
                connection.execute(
                    text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
                )
                inputs = _inputs(session=session, target=target)
            result = _compute(inputs)
        except (ValueError, ArithmeticError):
            _finish(connection=connection, target=target, computed=None)
        else:
            _finish(connection=connection, target=target, computed=result)
