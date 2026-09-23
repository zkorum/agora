from __future__ import annotations

from dataclasses import dataclass, replace
from typing import TYPE_CHECKING

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy import insert as sqlalchemy_insert
from sqlalchemy.orm import Session

from agora_analysis_worker_shared.ai_description_work import schedule_repaired_description_updates
from agora_analysis_worker_shared.bedrock_label_summary import LabelSummary
from agora_analysis_worker_shared.description_input import (
    ConversationDescriptionInput,
    GroupDescriptionCorrection,
)
from agora_analysis_worker_shared.description_language import CANONICAL_DESCRIPTION_LOCALE
from agora_analysis_worker_shared.generated_models import (
    AnalysisFamilyEnum,
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotResult,
    AnalysisSpec,
    Conversation,
    ConversationType,
    ConversationViewSnapshot,
    DisplayLanguageCode,
    OpinionGroup,
    OpinionGroupCandidate,
    OpinionGroupCandidateAssessment,
    OpinionGroupDescription,
    OpinionGroupLineage,
    OpinionGroupSpec,
    OpinionGroupVariant,
    PolisConversationConfig,
)

if TYPE_CHECKING:
    from collections.abc import Collection

    from sqlalchemy import Engine, Select

    from agora_analysis_worker_shared.description_language import EnglishDescription


@dataclass(frozen=True)
class RepairLineage:
    lineage_id: int
    conversation_id: int
    conversation_slug_id: str


@dataclass(frozen=True)
class LiveDescription:
    description_id: int
    locale: DisplayLanguageCode
    label: str
    summary: str
    lineages: tuple[RepairLineage, ...]

    def correction_request(self) -> ConversationDescriptionInput:
        return ConversationDescriptionInput(
            conversation_title="Correct the language of an existing opinion-group description",
            conversation_body=None,
            groups=[
                GroupDescriptionCorrection(
                    group_key="0",
                    draft=LabelSummary(reasoning=None, label=self.label, summary=self.summary),
                )
            ],
        )


def _live_description_query(
    *, conversation_slug_id: str | None, conversation_ids: Collection[int] | None = None
) -> Select[tuple[int, int, int]]:
    # Match the API's latest *activated* opinion-group view, including failed
    # analyses. Filtering success before ranking would revive an older analysis.
    latest_view_id = (
        select(ConversationViewSnapshot.id)
        .join(
            AnalysisSnapshot, AnalysisSnapshot.id == ConversationViewSnapshot.analysis_snapshot_id
        )
        .join(
            AnalysisSnapshotResult,
            and_(
                AnalysisSnapshotResult.analysis_snapshot_id == AnalysisSnapshot.id,
                AnalysisSnapshotResult.opinion_group_spec_id
                == ConversationViewSnapshot.opinion_group_spec_id,
            ),
        )
        .join(OpinionGroupSpec, OpinionGroupSpec.id == AnalysisSnapshotResult.opinion_group_spec_id)
        .join(AnalysisSpec, AnalysisSpec.id == OpinionGroupSpec.analysis_spec_id)
        .where(
            ConversationViewSnapshot.conversation_id == Conversation.id,
            ConversationViewSnapshot.activated_at.is_not(None),
            AnalysisSpec.analysis_family == AnalysisFamilyEnum.opinion_groups,
        )
        .order_by(ConversationViewSnapshot.created_at.desc(), ConversationViewSnapshot.id.desc())
        .limit(1)
        .correlate(Conversation)
        .scalar_subquery()
    )
    latest_views = (
        select(
            Conversation.id.label("conversation_id"),
            AnalysisSnapshotResult.id.label("result_id"),
            AnalysisSnapshotResult.outcome,
            AnalysisSnapshotResult.variants_enabled,
        )
        .select_from(Conversation)
        .join(PolisConversationConfig, PolisConversationConfig.id == Conversation.polis_config_id)
        .join(ConversationViewSnapshot, ConversationViewSnapshot.conversation_id == Conversation.id)
        .join(
            AnalysisSnapshot, AnalysisSnapshot.id == ConversationViewSnapshot.analysis_snapshot_id
        )
        .join(
            AnalysisSnapshotResult,
            and_(
                AnalysisSnapshotResult.analysis_snapshot_id == AnalysisSnapshot.id,
                AnalysisSnapshotResult.opinion_group_spec_id
                == ConversationViewSnapshot.opinion_group_spec_id,
            ),
        )
        .where(
            Conversation.current_content_id.is_not(None),
            Conversation.conversation_type == ConversationType.polis,
            Conversation.is_importing.is_(False),
            PolisConversationConfig.ai_labeling_enabled.is_(True),
            ConversationViewSnapshot.id == latest_view_id,
        )
    )
    if conversation_slug_id is not None:
        latest_views = latest_views.where(Conversation.slug_id == conversation_slug_id)
    if conversation_ids is not None:
        latest_views = latest_views.where(Conversation.id.in_(conversation_ids))
    views = latest_views.subquery()
    candidates = (
        select(
            OpinionGroupCandidate.id.label("candidate_id"),
            views.c.variants_enabled,
            func.row_number()
            .over(
                partition_by=views.c.conversation_id,
                order_by=(
                    OpinionGroupCandidateAssessment.selection_score.desc(),
                    OpinionGroupVariant.group_count.desc(),
                ),
            )
            .label("candidate_rank"),
        )
        .join(views, views.c.result_id == OpinionGroupCandidate.snapshot_result_id)
        .join(
            OpinionGroupVariant,
            OpinionGroupVariant.id == OpinionGroupCandidate.opinion_group_variant_id,
        )
        .join(
            OpinionGroupCandidateAssessment,
            OpinionGroupCandidateAssessment.candidate_id == OpinionGroupCandidate.id,
        )
        .where(
            views.c.outcome == AnalysisResultOutcomeEnum.success,
            OpinionGroupCandidate.outcome == AnalysisResultOutcomeEnum.success,
            OpinionGroupCandidateAssessment.hidden_reason.is_(None),
            OpinionGroupCandidateAssessment.selection_score.is_not(None),
        )
        .subquery()
    )
    return (
        select(
            OpinionGroupLineage.id.label("lineage_id"),
            OpinionGroupDescription.id.label("description_id"),
            Conversation.id.label("conversation_id"),
        )
        .select_from(OpinionGroup)
        .join(candidates, candidates.c.candidate_id == OpinionGroup.candidate_id)
        .join(OpinionGroupLineage, OpinionGroupLineage.id == OpinionGroup.lineage_id)
        .join(
            OpinionGroupDescription,
            OpinionGroupDescription.id == OpinionGroupLineage.system_description_id,
        )
        .join(OpinionGroupCandidate, OpinionGroupCandidate.id == OpinionGroup.candidate_id)
        .join(
            AnalysisSnapshotResult,
            AnalysisSnapshotResult.id == OpinionGroupCandidate.snapshot_result_id,
        )
        .join(Conversation, Conversation.id == AnalysisSnapshotResult.conversation_id)
        .where(or_(candidates.c.variants_enabled.is_(True), candidates.c.candidate_rank == 1))
        .distinct()
    )


def fetch_live_descriptions(
    session: Session,
    *,
    conversation_slug_id: str | None,
    after_description_id: int,
    limit: int,
    through_description_id: int | None = None,
) -> list[LiveDescription]:
    live = _live_description_query(conversation_slug_id=conversation_slug_id).cte(
        "live_descriptions"
    )
    description_ids = (
        select(live.c.description_id).distinct().where(live.c.description_id > after_description_id)
    )
    if through_description_id is not None:
        description_ids = description_ids.where(live.c.description_id <= through_description_id)
    description_ids = description_ids.order_by(live.c.description_id).limit(limit)
    rows = session.execute(
        select(
            OpinionGroupDescription, OpinionGroupLineage.id, Conversation.id, Conversation.slug_id
        )
        .select_from(live)
        .join(OpinionGroupDescription, OpinionGroupDescription.id == live.c.description_id)
        .join(OpinionGroupLineage, OpinionGroupLineage.id == live.c.lineage_id)
        .join(Conversation, Conversation.id == live.c.conversation_id)
        .where(OpinionGroupDescription.id.in_(description_ids))
        .order_by(OpinionGroupDescription.id, OpinionGroupLineage.id)
    ).all()
    descriptions: dict[int, LiveDescription] = {}
    for description, lineage_id, conversation_id, slug in rows:
        lineage = RepairLineage(
            lineage_id=lineage_id, conversation_id=conversation_id, conversation_slug_id=slug
        )
        previous = descriptions.get(description.id)
        descriptions[description.id] = (
            LiveDescription(
                description_id=description.id,
                locale=description.locale,
                label=description.label,
                summary=description.summary,
                lineages=(lineage,),
            )
            if previous is None
            else replace(previous, lineages=(*previous.lineages, lineage))
        )
    return list(descriptions.values())


def replace_live_description(
    engine: Engine,
    *,
    original: LiveDescription,
    replacement: EnglishDescription,
) -> int | None:
    with Session(engine) as session, session.begin():
        # Providers run outside this transaction. Recheck eligibility and the
        # expected pointer under the lineage lock before replacing anything.
        locked_lineage_ids = list(
            session.scalars(
                select(OpinionGroupLineage.id)
                .where(
                    OpinionGroupLineage.id.in_(
                        [lineage.lineage_id for lineage in original.lineages]
                    ),
                    OpinionGroupLineage.system_description_id == original.description_id,
                )
                .order_by(OpinionGroupLineage.id)
                .with_for_update()
            )
        )
        if not locked_lineage_ids:
            return None
        source_unchanged = session.scalar(
            select(OpinionGroupDescription.id)
            .where(
                OpinionGroupDescription.id == original.description_id,
                OpinionGroupDescription.locale == original.locale,
                OpinionGroupDescription.label == original.label,
                OpinionGroupDescription.summary == original.summary,
            )
            .with_for_update()
        )
        if source_unchanged is None:
            return None
        # This must be a new statement AFTER acquiring locks. A locking SELECT's
        # subqueries may retain a pre-wait snapshot while another repair finishes.
        live_rows = session.execute(
            _live_description_query(
                conversation_slug_id=None,
                conversation_ids={lineage.conversation_id for lineage in original.lineages},
            ).where(
                OpinionGroupLineage.id.in_(locked_lineage_ids),
                OpinionGroupLineage.system_description_id == original.description_id,
            )
        ).all()
        if not live_rows:
            return None
        lineage_ids = [lineage_id for lineage_id, _, _ in live_rows]
        description_id = session.execute(
            sqlalchemy_insert(OpinionGroupDescription)
            .values(
                locale=CANONICAL_DESCRIPTION_LOCALE,
                label=replacement.label,
                summary=replacement.summary,
                created_at=func.now(),
            )
            .returning(OpinionGroupDescription.id)
        ).scalar_one()
        session.execute(
            update(OpinionGroupLineage)
            .where(
                OpinionGroupLineage.id.in_(lineage_ids),
                OpinionGroupLineage.system_description_id == original.description_id,
            )
            .values(system_description_id=description_id)
        )
        by_conversation: dict[int, list[int]] = {}
        for lineage_id, _, conversation_id in live_rows:
            by_conversation.setdefault(conversation_id, []).append(lineage_id)
        schedule_repaired_description_updates(
            session, lineage_ids_by_conversation_id=by_conversation
        )
        return description_id
