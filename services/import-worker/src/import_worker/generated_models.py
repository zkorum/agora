# WARNING: GENERATED FROM services/api/src/shared-backend/schema.ts
# DO NOT MODIFY -- Re-generate with: make sync
# Service: import-worker

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


def _enum_values(enum_cls: type[StrEnum]) -> list[str]:
    return [member.value for member in enum_cls]


class AnalysisWorkErrorKindEnum(StrEnum):
    red_dwarf_exception = "red_dwarf_exception"
    red_dwarf_contract_violation = "red_dwarf_contract_violation"
    database_error = "database_error"
    valkey_error = "valkey_error"
    transaction_error = "transaction_error"
    unknown_error = "unknown_error"


class ContentTranslationSourceKind(StrEnum):
    conversation = "conversation"
    opinion = "opinion"
    survey_question = "survey_question"


class DisplayLanguageCode(StrEnum):
    en = "en"
    es = "es"
    fr = "fr"
    zh_hant = "zh-Hant"
    zh_hans = "zh-Hans"
    ja = "ja"
    ar = "ar"
    fa = "fa"
    he = "he"
    ky = "ky"
    ru = "ru"


class ContentTranslationWorkStatus(StrEnum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class ImportStatusEnum(StrEnum):
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ImportFailureReasonEnum(StrEnum):
    processing_error = "processing_error"
    timeout = "timeout"
    server_restart = "server_restart"
    invalid_data_format = "invalid_data_format"


class ConversationLanguageSettingMode(StrEnum):
    auto = "auto"
    manual = "manual"


class LanguageCode(StrEnum):
    en = "en"
    es = "es"
    fr = "fr"
    en_gb = "en-GB"
    ar = "ar"
    bn = "bn"
    eu = "eu"
    bg = "bg"
    ca = "ca"
    hr = "hr"
    cs = "cs"
    da = "da"
    nl = "nl"
    fil = "fil"
    fi = "fi"
    gl = "gl"
    de = "de"
    el = "el"
    gu = "gu"
    he = "he"
    hi = "hi"
    hu = "hu"
    id = "id"
    ga = "ga"
    it = "it"
    ja = "ja"
    kn = "kn"
    ko = "ko"
    ky = "ky"
    ms = "ms"
    mr = "mr"
    no = "no"
    fa = "fa"
    pl = "pl"
    pt = "pt"
    ro = "ro"
    ru = "ru"
    sr = "sr"
    sk = "sk"
    sv = "sv"
    ta = "ta"
    th = "th"
    tr = "tr"
    uk = "uk"
    ur = "ur"
    vi = "vi"
    zh_hans = "zh-Hans"
    zh_hant = "zh-Hant"
    af = "af"
    sq = "sq"
    hy = "hy"
    az = "az"
    be = "be"
    nb = "nb"
    bs = "bs"
    eo = "eo"
    et = "et"
    lg = "lg"
    ka = "ka"
    is_ = "is"
    kk = "kk"
    la = "la"
    lv = "lv"
    lt = "lt"
    mk = "mk"
    mi = "mi"
    mn = "mn"
    nn = "nn"
    pa = "pa"
    sn = "sn"
    sl = "sl"
    so = "so"
    st = "st"
    sw = "sw"
    te = "te"
    ts = "ts"
    tn = "tn"
    cy = "cy"
    xh = "xh"
    yo = "yo"
    zu = "zu"


class LanguageDetectionProvider(StrEnum):
    lingua = "lingua"
    google_translate = "google_translate"


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


class ConversationViewSnapshotReasonEnum(StrEnum):
    analysis_completed = "analysis_completed"
    survey_refreshed = "survey_refreshed"
    conversation_content_updated = "conversation_content_updated"
    conversation_lifecycle_updated = "conversation_lifecycle_updated"


class NotificationTypeEnum(StrEnum):
    opinion_vote = "opinion_vote"
    new_opinion = "new_opinion"
    export_started = "export_started"
    export_completed = "export_completed"
    export_failed = "export_failed"
    export_cancelled = "export_cancelled"
    import_started = "import_started"
    import_completed = "import_completed"
    import_failed = "import_failed"


class OpinionGroupReducerEnum(StrEnum):
    pca = "pca"


class OpinionGroupClustererEnum(StrEnum):
    kmeans = "kmeans"


class OpinionGroupSelectionPolicyEnum(StrEnum):
    silhouette_size_balance = "silhouette_size_balance"


class OpinionModerationAction(StrEnum):
    move = "move"
    hide = "hide"


class ModerationReasonEnum(StrEnum):
    misleading = "misleading"
    antisocial = "antisocial"
    illegal = "illegal"
    doxing = "doxing"
    sexual = "sexual"
    spam = "spam"


class DirectoryVisibility(StrEnum):
    listed = "listed"
    unlisted = "unlisted"


class VoteEnumAll(StrEnum):
    agree = "agree"
    disagree = "disagree"
    pass_ = "pass"


class AnalysisWorkState(Base):
    __tablename__ = "analysis_work_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    opinion_group_spec_id: Mapped[int] = mapped_column(Integer)
    last_completed_data_generation: Mapped[int] = mapped_column(Integer, server_default="0")
    running_data_generation: Mapped[int | None] = mapped_column(Integer, nullable=True)
    persisted_analysis_snapshot_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dirty_since: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    attempt_generation: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, server_default="0")
    non_retryable_generation: Mapped[int | None] = mapped_column(Integer, nullable=True)
    non_retryable_analysis_engine_epoch: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lease_owner: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lease_token: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error_kind: Mapped[AnalysisWorkErrorKindEnum | None] = mapped_column(
        SaEnum(
            AnalysisWorkErrorKindEnum,
            name="analysis_work_error_kind_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    last_error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_error_stack_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class ContentTranslationWork(Base):
    __tablename__ = "content_translation_work"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    source_kind: Mapped[ContentTranslationSourceKind] = mapped_column(
        SaEnum(
            ContentTranslationSourceKind,
            name="content_translation_source_kind",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    conversation_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opinion_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    survey_question_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    survey_question_option_content_ids: Mapped[list[int] | None] = mapped_column(
        ARRAY(Integer),
        nullable=True,
    )
    display_language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    status: Mapped[ContentTranslationWorkStatus] = mapped_column(
        SaEnum(
            ContentTranslationWorkStatus,
            name="content_translation_work_status",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    priority_rank: Mapped[int] = mapped_column(Integer, server_default="2")
    attempt_count: Mapped[int] = mapped_column(Integer, server_default="0")
    lease_owner: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lease_token: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class ConversationContent(Base):
    __tablename__ = "conversation_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(140))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    source_language_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class ConversationImport(Base):
    __tablename__ = "conversation_import"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    conversation_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    status: Mapped[ImportStatusEnum] = mapped_column(
        SaEnum(
            ImportStatusEnum,
            name="import_status_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    failure_reason: Mapped[ImportFailureReasonEnum | None] = mapped_column(
        SaEnum(
            ImportFailureReasonEnum,
            name="import_failure_reason_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    csv_file_metadata: Mapped[Any | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class ConversationLanguageSetting(Base):
    __tablename__ = "conversation_language_setting"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    mode: Mapped[ConversationLanguageSettingMode] = mapped_column(
        SaEnum(
            ConversationLanguageSettingMode,
            name="conversation_language_setting_mode",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    language_code: Mapped[DisplayLanguageCode | None] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    detected_language_code: Mapped[DisplayLanguageCode | None] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    detected_source_language_code: Mapped[LanguageCode | None] = mapped_column(
        SaEnum(LanguageCode, name="language_code", values_callable=_enum_values, native_enum=True),
        nullable=True,
    )
    detected_raw_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    detected_raw_language_provider: Mapped[LanguageDetectionProvider | None] = mapped_column(
        SaEnum(
            LanguageDetectionProvider,
            name="language_detection_provider",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    detection_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    detected_from_corpus_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class Conversation(Base):
    __tablename__ = "conversation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    project_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_ranking_score_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_indexed: Mapped[bool] = mapped_column(Boolean, server_default="true")
    participation_mode: Mapped[ParticipationMode] = mapped_column(
        SaEnum(
            ParticipationMode,
            name="participation_mode",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    conversation_type: Mapped[ConversationType] = mapped_column(
        SaEnum(
            ConversationType,
            name="conversation_type",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    is_importing: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_closed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_edited: Mapped[bool] = mapped_column(Boolean, server_default="false")
    requires_event_ticket: Mapped[EventSlug | None] = mapped_column(
        SaEnum(EventSlug, name="event_slug", values_callable=_enum_values, native_enum=True),
        nullable=True,
    )
    ai_labeling_enabled: Mapped[bool] = mapped_column(Boolean, server_default="true")
    analysis_data_generation: Mapped[int] = mapped_column(Integer, server_default="0")
    preferred_opinion_group_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    import_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    import_conversation_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    import_export_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    import_created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    import_author: Mapped[str | None] = mapped_column(Text, nullable=True)
    import_method: Mapped[ImportMethod | None] = mapped_column(
        SaEnum(ImportMethod, name="import_method", values_callable=_enum_values, native_enum=True),
        nullable=True,
    )
    external_source_config: Mapped[Any | None] = mapped_column(
        JSON(none_as_null=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    last_reacted_at: Mapped[datetime] = mapped_column(DateTime)


class ConversationTranslationSetting(Base):
    __tablename__ = "conversation_translation_setting"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    dynamic_translation_enabled: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class ConversationTranslationTargetLanguage(Base):
    __tablename__ = "conversation_translation_target_language"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    translation_setting_id: Mapped[int] = mapped_column(Integer)
    language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)


class ConversationViewSnapshot(Base):
    __tablename__ = "conversation_view_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    opinion_group_spec_id: Mapped[int] = mapped_column(Integer)
    analysis_snapshot_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    survey_aggregate_snapshot_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    conversation_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    view_reason: Mapped[ConversationViewSnapshotReasonEnum] = mapped_column(
        SaEnum(
            ConversationViewSnapshotReasonEnum,
            name="conversation_view_snapshot_reason_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    preferred_opinion_group_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_closed: Mapped[bool] = mapped_column(Boolean)
    opinion_count: Mapped[int] = mapped_column(Integer)
    vote_count: Mapped[int] = mapped_column(Integer)
    participant_count: Mapped[int] = mapped_column(Integer)
    total_opinion_count: Mapped[int] = mapped_column(Integer)
    total_vote_count: Mapped[int] = mapped_column(Integer)
    total_participant_count: Mapped[int] = mapped_column(Integer)
    moderated_opinion_count: Mapped[int] = mapped_column(Integer)
    hidden_opinion_count: Mapped[int] = mapped_column(Integer)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class NotificationImport(Base):
    __tablename__ = "notification_import"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    notification_id: Mapped[int] = mapped_column(Integer)
    import_id: Mapped[int] = mapped_column(Integer)
    conversation_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class Notification(Base):
    __tablename__ = "notification"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    user_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    is_read: Mapped[bool] = mapped_column(Boolean, server_default="false")
    notification_type: Mapped[NotificationTypeEnum] = mapped_column(
        SaEnum(
            NotificationTypeEnum,
            name="notification_type_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionContent(Base):
    __tablename__ = "opinion_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opinion_id: Mapped[int] = mapped_column(Integer)
    conversation_content_id: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(String(3000))
    content_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    source_language_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupSpec(Base):
    __tablename__ = "opinion_group_spec"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_spec_id: Mapped[int] = mapped_column(Integer)
    key: Mapped[str] = mapped_column(String(100))
    version: Mapped[int] = mapped_column(Integer)
    reducer: Mapped[OpinionGroupReducerEnum] = mapped_column(
        SaEnum(
            OpinionGroupReducerEnum,
            name="opinion_group_reducer_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    clusterer: Mapped[OpinionGroupClustererEnum] = mapped_column(
        SaEnum(
            OpinionGroupClustererEnum,
            name="opinion_group_clusterer_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    selection_policy: Mapped[OpinionGroupSelectionPolicyEnum] = mapped_column(
        SaEnum(
            OpinionGroupSelectionPolicyEnum,
            name="opinion_group_selection_policy_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    min_clusterable_participants: Mapped[int] = mapped_column(Integer)
    min_votes_per_participant: Mapped[int] = mapped_column(Integer)
    max_group_count: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionModeration(Base):
    __tablename__ = "opinion_moderation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opinion_id: Mapped[int] = mapped_column(Integer)
    author_id: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    moderation_action: Mapped[OpinionModerationAction] = mapped_column(
        SaEnum(
            OpinionModerationAction,
            name="opinion_moderation_action",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    moderation_reason: Mapped[ModerationReasonEnum] = mapped_column(
        SaEnum(
            ModerationReasonEnum,
            name="moderation_reason_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    moderation_explanation: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class Opinion(Base):
    __tablename__ = "opinion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    author_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    conversation_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    num_agrees: Mapped[int] = mapped_column(Integer, server_default="0")
    num_disagrees: Mapped[int] = mapped_column(Integer, server_default="0")
    num_passes: Mapped[int] = mapped_column(Integer, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    last_reacted_at: Mapped[datetime] = mapped_column(DateTime)


class Organization(Base):
    __tablename__ = "organization"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(65))
    display_name: Mapped[str] = mapped_column(String(65))
    directory_visibility: Mapped[DirectoryVisibility] = mapped_column(
        SaEnum(
            DirectoryVisibility,
            name="directory_visibility",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    auto_provisioned_for_user_id: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_full_image_path: Mapped[bool] = mapped_column(Boolean)
    website_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(String(280), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class ProjectOrganizationOwnership(Base):
    __tablename__ = "project_organization_ownership"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer)
    organization_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class Project(Base):
    __tablename__ = "project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(65))
    display_name: Mapped[str] = mapped_column(String(65))
    directory_visibility: Mapped[DirectoryVisibility] = mapped_column(
        SaEnum(
            DirectoryVisibility,
            name="directory_visibility",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    auto_provisioned_for_organization_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class User(Base):
    __tablename__ = "user"

    id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True)
    polis_participant_id: Mapped[int] = mapped_column(Integer)
    username: Mapped[str] = mapped_column(String(20))
    first_name: Mapped[str] = mapped_column(String(65))
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


class VoteContent(Base):
    __tablename__ = "vote_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vote_id: Mapped[int] = mapped_column(Integer)
    opinion_content_id: Mapped[int] = mapped_column(Integer)
    vote: Mapped[VoteEnumAll] = mapped_column(
        SaEnum(VoteEnumAll, name="vote_enum_all", values_callable=_enum_values, native_enum=True),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)


class Vote(Base):
    __tablename__ = "vote"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    author_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    opinion_id: Mapped[int] = mapped_column(Integer)
    polis_vote_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
