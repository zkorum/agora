# WARNING: GENERATED FROM shared-backend/src/schema.ts
# DO NOT MODIFY -- Re-generate with: make sync-python-models
# Service: scoring-worker

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel

if TYPE_CHECKING:
    from datetime import datetime
    from uuid import UUID


class ParticipationMode(StrEnum):
    account_required = "account_required"
    strong_verification = "strong_verification"
    email_verification = "email_verification"
    guest = "guest"


class ConversationType(StrEnum):
    polis = "polis"
    maxdiff = "maxdiff"


class EventSlug(StrEnum):
    devconnect_2025 = "devconnect-2025"


class ImportMethod(StrEnum):
    url = "url"
    csv = "csv"


class MaxdiffLifecycleStatus(StrEnum):
    active = "active"
    completed = "completed"
    in_progress = "in_progress"
    canceled = "canceled"


class Conversation(BaseModel):
    """Table: conversation"""

    id: int | None = None
    slug_id: str
    author_id: UUID
    organization_id: int | None = None
    current_content_id: int | None = None
    current_polis_content_id: int | None = None
    current_ranking_score_id: int | None = None
    index_conversation_at: datetime | None = None
    is_indexed: bool = True
    participation_mode: ParticipationMode | None = None
    conversation_type: ConversationType | None = None
    is_importing: bool = False
    is_closed: bool = False
    is_edited: bool = False
    requires_event_ticket: EventSlug | None = None
    opinion_count: int = 0
    vote_count: int = 0
    participant_count: int = 0
    total_opinion_count: int = 0
    total_vote_count: int = 0
    total_participant_count: int = 0
    moderated_opinion_count: int = 0
    hidden_opinion_count: int = 0
    import_url: str | None = None
    import_conversation_url: str | None = None
    import_export_url: str | None = None
    import_created_at: datetime | None = None
    import_author: str | None = None
    import_method: ImportMethod | None = None
    external_source_config: Any | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    last_reacted_at: datetime | None = None


class MaxdiffComparison(BaseModel):
    """Table: maxdiff_comparison"""

    id: int | None = None
    maxdiff_result_id: int
    position: int
    best_slug_id: str
    worst_slug_id: str
    candidate_set: list[str]


class MaxdiffItem(BaseModel):
    """Table: maxdiff_item"""

    id: int | None = None
    slug_id: str
    author_id: UUID
    conversation_id: int
    current_content_id: int | None = None
    is_seed: bool = False
    lifecycle_status: MaxdiffLifecycleStatus | None = None
    snapshot_score: float | None = None
    snapshot_rank: int | None = None
    snapshot_participant_count: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MaxdiffResult(BaseModel):
    """Table: maxdiff_result"""

    id: int | None = None
    participant_id: UUID
    conversation_id: int
    ranking: Any | None = None
    comparisons: Any
    is_complete: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RankingScoreEntity(BaseModel):
    """Table: ranking_score_entity"""

    id: int | None = None
    ranking_score_id: int
    entity_slug_id: str
    score: float
    uncertainty_left: float
    uncertainty_right: float
    participant_count: int = 0


class RankingScore(BaseModel):
    """Table: ranking_score"""

    id: int | None = None
    conversation_id: int
    scores: Any
    participant_counts: Any
    group_sources_snapshot: Any | None = None
    user_weights_snapshot: Any | None = None
    pipeline_config: Any
    preference_learning: str | None = None
    voting_rights: str | None = None
    aggregation_config: str | None = None
    computed_at: datetime
    created_at: datetime | None = None

