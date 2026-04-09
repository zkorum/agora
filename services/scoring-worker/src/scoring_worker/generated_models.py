# WARNING: GENERATED FROM shared-backend/src/schema.ts
# DO NOT MODIFY -- Re-generate with: make sync
# Service: scoring-worker

from __future__ import annotations

import uuid as uuid_pkg
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import ARRAY, JSON, Boolean, DateTime, Float, Integer, String, Text, Uuid
from sqlalchemy import Enum as SaEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


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


class SurveyQuestionType(StrEnum):
    mono_choice = "mono_choice"
    multi_choice = "multi_choice"
    select = "select"
    free_text = "free_text"


class Conversation(Base):
    __tablename__ = "conversation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    author_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    organization_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_polis_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_ranking_score_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    index_conversation_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_indexed: Mapped[bool] = mapped_column(Boolean, server_default="true")
    participation_mode: Mapped[ParticipationMode] = mapped_column(
        SaEnum(ParticipationMode, native_enum=False),
    )
    conversation_type: Mapped[ConversationType] = mapped_column(
        SaEnum(ConversationType, native_enum=False),
    )
    is_importing: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_closed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_edited: Mapped[bool] = mapped_column(Boolean, server_default="false")
    requires_event_ticket: Mapped[EventSlug | None] = mapped_column(
        SaEnum(EventSlug, native_enum=False),
        nullable=True,
    )
    opinion_count: Mapped[int] = mapped_column(Integer, server_default="0")
    vote_count: Mapped[int] = mapped_column(Integer, server_default="0")
    participant_count: Mapped[int] = mapped_column(Integer, server_default="0")
    total_opinion_count: Mapped[int] = mapped_column(Integer, server_default="0")
    total_vote_count: Mapped[int] = mapped_column(Integer, server_default="0")
    total_participant_count: Mapped[int] = mapped_column(Integer, server_default="0")
    moderated_opinion_count: Mapped[int] = mapped_column(Integer, server_default="0")
    hidden_opinion_count: Mapped[int] = mapped_column(Integer, server_default="0")
    import_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    import_conversation_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    import_export_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    import_created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    import_author: Mapped[str | None] = mapped_column(Text, nullable=True)
    import_method: Mapped[ImportMethod | None] = mapped_column(
        SaEnum(ImportMethod, native_enum=False),
        nullable=True,
    )
    external_source_config: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    last_reacted_at: Mapped[datetime] = mapped_column(DateTime)


class MaxdiffComparison(Base):
    __tablename__ = "maxdiff_comparison"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    maxdiff_result_id: Mapped[int] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer)
    best_slug_id: Mapped[str] = mapped_column(String(8))
    worst_slug_id: Mapped[str] = mapped_column(String(8))
    candidate_set: Mapped[list[str]] = mapped_column(ARRAY(Text))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class MaxdiffItem(Base):
    __tablename__ = "maxdiff_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    author_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    conversation_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    lifecycle_status: Mapped[MaxdiffLifecycleStatus] = mapped_column(
        SaEnum(MaxdiffLifecycleStatus, native_enum=False),
    )
    snapshot_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    snapshot_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    snapshot_participant_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class MaxdiffResult(Base):
    __tablename__ = "maxdiff_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    participant_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    conversation_id: Mapped[int] = mapped_column(Integer)
    ranking: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    comparisons: Mapped[Any] = mapped_column(JSON)
    is_complete: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class MaxdiffUserEntityScore(Base):
    __tablename__ = "maxdiff_user_entity_score"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    maxdiff_result_id: Mapped[int] = mapped_column(Integer)
    entity_slug_id: Mapped[str] = mapped_column(String(8))
    score: Mapped[float] = mapped_column(Float)
    uncertainty_left: Mapped[float] = mapped_column(Float)
    uncertainty_right: Mapped[float] = mapped_column(Float)


class RankingScoreEntity(Base):
    __tablename__ = "ranking_score_entity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ranking_score_id: Mapped[int] = mapped_column(Integer)
    entity_slug_id: Mapped[str] = mapped_column(String(8))
    score: Mapped[float] = mapped_column(Float)
    uncertainty_left: Mapped[float] = mapped_column(Float)
    uncertainty_right: Mapped[float] = mapped_column(Float)
    participant_count: Mapped[int] = mapped_column(Integer, server_default="0")


class RankingScore(Base):
    __tablename__ = "ranking_score"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    scores: Mapped[Any] = mapped_column(JSON)
    participant_counts: Mapped[Any] = mapped_column(JSON)
    group_sources_snapshot: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    user_weights_snapshot: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    pipeline_config: Mapped[Any] = mapped_column(JSON)
    preference_learning: Mapped[str | None] = mapped_column(String(100), nullable=True)
    voting_rights: Mapped[str | None] = mapped_column(String(100), nullable=True)
    aggregation_config: Mapped[str | None] = mapped_column(String(200), nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyAnswerOption(Base):
    __tablename__ = "survey_answer_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_answer_id: Mapped[int] = mapped_column(Integer)
    survey_question_option_id: Mapped[int] = mapped_column(Integer)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SurveyAnswer(Base):
    __tablename__ = "survey_answer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_response_id: Mapped[int] = mapped_column(Integer)
    survey_question_id: Mapped[int] = mapped_column(Integer)
    answered_question_semantic_version: Mapped[int] = mapped_column(Integer)
    text_value_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyConfig(Base):
    __tablename__ = "survey_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    current_revision: Mapped[int] = mapped_column(Integer, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SurveyQuestionContent(Base):
    __tablename__ = "survey_question_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_question_id: Mapped[int] = mapped_column(Integer)
    question_text: Mapped[str] = mapped_column(String(500))
    constraints: Mapped[Any] = mapped_column(JSON)
    source_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    source_language_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyQuestionOptionContent(Base):
    __tablename__ = "survey_question_option_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_question_option_id: Mapped[int] = mapped_column(Integer)
    option_text: Mapped[str] = mapped_column(String(200))
    source_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    source_language_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyQuestionOption(Base):
    __tablename__ = "survey_question_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    survey_question_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    display_order: Mapped[Any] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyQuestion(Base):
    __tablename__ = "survey_question"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    survey_config_id: Mapped[int] = mapped_column(Integer)
    question_type: Mapped[SurveyQuestionType] = mapped_column(
        SaEnum(SurveyQuestionType, native_enum=False),
    )
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_semantic_version: Mapped[int] = mapped_column(Integer, server_default="1")
    display_order: Mapped[Any] = mapped_column(JSON)
    is_required: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyResponse(Base):
    __tablename__ = "survey_response"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    participant_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    conversation_id: Mapped[int] = mapped_column(Integer)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class User(Base):
    __tablename__ = "user"

    id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True)
    polis_participant_id: Mapped[int] = mapped_column(Integer)
    username: Mapped[str] = mapped_column(String(20))
    is_site_moderator: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_site_org_admin: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_imported: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_deleted: Mapped[bool] = mapped_column(Boolean, server_default="false")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    active_conversation_count: Mapped[int] = mapped_column(Integer, server_default="0")
    total_conversation_count: Mapped[int] = mapped_column(Integer, server_default="0")
    total_opinion_count: Mapped[int] = mapped_column(Integer, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)

