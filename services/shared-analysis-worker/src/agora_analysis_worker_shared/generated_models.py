# WARNING: GENERATED FROM services/api/src/shared-backend/schema.ts
# DO NOT MODIFY -- Re-generate with: make sync
# Service: shared-analysis-worker

from __future__ import annotations

import uuid as uuid_pkg
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    Integer,
    LargeBinary,
    String,
    Text,
    Uuid,
)
from sqlalchemy import Enum as SaEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def _enum_values(enum_cls: type[StrEnum]) -> list[str]:
    return [member.value for member in enum_cls]


class AnalysisCompressionEnum(StrEnum):
    zstd = "zstd"


class AnalysisResultOutcomeEnum(StrEnum):
    success = "success"
    insufficient_data = "insufficient_data"


class AnalysisInsufficientDataReasonEnum(StrEnum):
    empty_vote_matrix = "empty_vote_matrix"
    not_enough_clusterable_participants = "not_enough_clusterable_participants"
    not_enough_unique_points = "not_enough_unique_points"
    not_enough_samples_for_group_count = "not_enough_samples_for_group_count"
    other = "other"


class AnalysisFamilyEnum(StrEnum):
    opinion_groups = "opinion_groups"


class AnalysisWorkErrorKindEnum(StrEnum):
    red_dwarf_exception = "red_dwarf_exception"
    red_dwarf_contract_violation = "red_dwarf_contract_violation"
    database_error = "database_error"
    valkey_error = "valkey_error"
    transaction_error = "transaction_error"
    unknown_error = "unknown_error"


class SpokenLanguageCode(StrEnum):
    af = "af"
    ak = "ak"
    am = "am"
    ar = "ar"
    as_ = "as"
    ay = "ay"
    az = "az"
    be = "be"
    bg = "bg"
    bho = "bho"
    bm = "bm"
    bn = "bn"
    bs = "bs"
    ca = "ca"
    ceb = "ceb"
    ckb = "ckb"
    co = "co"
    cs = "cs"
    cy = "cy"
    da = "da"
    de = "de"
    doi = "doi"
    dv = "dv"
    ee = "ee"
    el = "el"
    en = "en"
    eo = "eo"
    es = "es"
    et = "et"
    eu = "eu"
    fa = "fa"
    fi = "fi"
    fil = "fil"
    fr = "fr"
    fy = "fy"
    ga = "ga"
    gd = "gd"
    gl = "gl"
    gn = "gn"
    gom = "gom"
    gu = "gu"
    ha = "ha"
    haw = "haw"
    he = "he"
    hi = "hi"
    hmn = "hmn"
    hr = "hr"
    ht = "ht"
    hu = "hu"
    hy = "hy"
    id = "id"
    ig = "ig"
    ilo = "ilo"
    is_ = "is"
    it = "it"
    ja = "ja"
    jv = "jv"
    ka = "ka"
    kk = "kk"
    km = "km"
    kn = "kn"
    ko = "ko"
    kri = "kri"
    ku = "ku"
    ky = "ky"
    la = "la"
    lb = "lb"
    lg = "lg"
    ln = "ln"
    lo = "lo"
    lt = "lt"
    lus = "lus"
    lv = "lv"
    mai = "mai"
    mg = "mg"
    mi = "mi"
    mk = "mk"
    ml = "ml"
    mn = "mn"
    mni_mtei = "mni-Mtei"
    mr = "mr"
    ms = "ms"
    mt = "mt"
    my = "my"
    nb = "nb"
    ne = "ne"
    nl = "nl"
    nn = "nn"
    no = "no"
    nso = "nso"
    ny = "ny"
    om = "om"
    or_ = "or"
    pa = "pa"
    pl = "pl"
    ps = "ps"
    pt = "pt"
    qu = "qu"
    ro = "ro"
    ru = "ru"
    rw = "rw"
    sa = "sa"
    sd = "sd"
    si = "si"
    sk = "sk"
    sl = "sl"
    sm = "sm"
    sn = "sn"
    so = "so"
    sq = "sq"
    sr = "sr"
    st = "st"
    su = "su"
    sv = "sv"
    sw = "sw"
    ta = "ta"
    te = "te"
    tg = "tg"
    th = "th"
    ti = "ti"
    tk = "tk"
    tn = "tn"
    tr = "tr"
    ts = "ts"
    tt = "tt"
    ug = "ug"
    uk = "uk"
    ur = "ur"
    uz = "uz"
    vi = "vi"
    xh = "xh"
    yi = "yi"
    yo = "yo"
    zh_hans = "zh-Hans"
    zh_hant = "zh-Hant"
    zu = "zu"


class LanguageDetectionProvider(StrEnum):
    lingua = "lingua"
    google_translate = "google_translate"


class ConversationLanguageSettingMode(StrEnum):
    auto = "auto"
    manual = "manual"


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


class ConversationViewSnapshotCheckpointReasonEnum(StrEnum):
    first_displayable_analysis = "first_displayable_analysis"
    first_group_count_available = "first_group_count_available"
    default_group_count_changed = "default_group_count_changed"
    major_participation_milestone = "major_participation_milestone"
    major_vote_milestone = "major_vote_milestone"
    conversation_closed = "conversation_closed"


class ConversationViewSnapshotReasonEnum(StrEnum):
    analysis_completed = "analysis_completed"
    survey_refreshed = "survey_refreshed"
    conversation_content_updated = "conversation_content_updated"
    conversation_lifecycle_updated = "conversation_lifecycle_updated"


class MaxdiffLifecycleStatus(StrEnum):
    active = "active"
    completed = "completed"
    in_progress = "in_progress"
    canceled = "canceled"


class OpinionGroupCandidateHiddenReasonEnum(StrEnum):
    singleton_group = "singleton_group"
    duplicate_representative_opinions = "duplicate_representative_opinions"
    missing_representative_opinions = "missing_representative_opinions"
    invalid_candidate_output = "invalid_candidate_output"


class VoteEnumSimple(StrEnum):
    agree = "agree"
    disagree = "disagree"


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


class PremiumFeature(StrEnum):
    survey = "survey"
    event_ticket = "event_ticket"
    analysis_variants = "analysis_variants"
    dynamic_translation = "dynamic_translation"


class SurveyQuestionType(StrEnum):
    choice = "choice"
    free_text = "free_text"


class SurveyAggregateScopeEnum(StrEnum):
    overall = "overall"
    opinion_group = "opinion_group"


class SurveyAggregateSuppressionReasonEnum(StrEnum):
    count_below_threshold = "count_below_threshold"
    cluster_deductive_disclosure = "cluster_deductive_disclosure"


class SurveyChoiceDisplay(StrEnum):
    auto = "auto"
    list = "list"
    dropdown = "dropdown"


class VoteEnumAll(StrEnum):
    agree = "agree"
    disagree = "disagree"
    pass_ = "pass"


class AnalysisInputSnapshot(Base):
    __tablename__ = "analysis_input_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    data_generation: Mapped[int] = mapped_column(Integer)
    input_hash: Mapped[str] = mapped_column(String(64))
    opinion_count: Mapped[int] = mapped_column(Integer)
    participant_count: Mapped[int] = mapped_column(Integer)
    vote_count: Mapped[int] = mapped_column(Integer)
    compression: Mapped[AnalysisCompressionEnum] = mapped_column(
        SaEnum(
            AnalysisCompressionEnum,
            name="analysis_compression_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    payload: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class AnalysisSnapshotOpinion(Base):
    __tablename__ = "analysis_snapshot_opinion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_snapshot_id: Mapped[int] = mapped_column(Integer)
    opinion_id: Mapped[int] = mapped_column(Integer)
    opinion_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    local_opinion_index: Mapped[int] = mapped_column(Integer)
    num_agrees: Mapped[int] = mapped_column(Integer, server_default="0")
    num_disagrees: Mapped[int] = mapped_column(Integer, server_default="0")
    num_passes: Mapped[int] = mapped_column(Integer, server_default="0")
    routing_priority: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class AnalysisSnapshotResult(Base):
    __tablename__ = "analysis_snapshot_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    analysis_snapshot_id: Mapped[int] = mapped_column(Integer)
    opinion_group_spec_id: Mapped[int] = mapped_column(Integer)
    outcome: Mapped[AnalysisResultOutcomeEnum] = mapped_column(
        SaEnum(
            AnalysisResultOutcomeEnum,
            name="analysis_result_outcome_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    outcome_reason: Mapped[AnalysisInsufficientDataReasonEnum | None] = mapped_column(
        SaEnum(
            AnalysisInsufficientDataReasonEnum,
            name="analysis_insufficient_data_reason_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    variants_enabled: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime)


class AnalysisSnapshot(Base):
    __tablename__ = "analysis_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    conversation_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    input_snapshot_id: Mapped[int] = mapped_column(Integer)
    data_generation: Mapped[int] = mapped_column(Integer)
    computed_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class AnalysisSpec(Base):
    __tablename__ = "analysis_spec"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_family: Mapped[AnalysisFamilyEnum] = mapped_column(
        SaEnum(
            AnalysisFamilyEnum,
            name="analysis_family_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)


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


class ConversationContent(Base):
    __tablename__ = "conversation_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(140))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_language_code: Mapped[SpokenLanguageCode | None] = mapped_column(
        SaEnum(
            SpokenLanguageCode,
            name="spoken_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    source_raw_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    source_language_provider: Mapped[LanguageDetectionProvider | None] = mapped_column(
        SaEnum(
            LanguageDetectionProvider,
            name="language_detection_provider",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    source_language_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


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
    detected_source_language_code: Mapped[SpokenLanguageCode | None] = mapped_column(
        SaEnum(
            SpokenLanguageCode,
            name="spoken_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
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
    auto_detection_retryable: Mapped[bool] = mapped_column(Boolean, server_default="false")
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


class ConversationViewSnapshotCheckpointReason(Base):
    __tablename__ = "conversation_view_snapshot_checkpoint_reason"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_view_snapshot_id: Mapped[int] = mapped_column(Integer)
    conversation_id: Mapped[int] = mapped_column(Integer)
    opinion_group_spec_id: Mapped[int] = mapped_column(Integer)
    reason: Mapped[ConversationViewSnapshotCheckpointReasonEnum] = mapped_column(
        SaEnum(
            ConversationViewSnapshotCheckpointReasonEnum,
            name="conversation_view_snapshot_checkpoint_reason_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    group_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    previous_group_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    participant_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    participant_milestone: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vote_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vote_milestone: Mapped[int | None] = mapped_column(Integer, nullable=True)
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


class MaxdiffItem(Base):
    __tablename__ = "maxdiff_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    author_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    conversation_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    lifecycle_status: Mapped[MaxdiffLifecycleStatus] = mapped_column(
        SaEnum(
            MaxdiffLifecycleStatus,
            name="maxdiff_lifecycle_status",
            values_callable=_enum_values,
            native_enum=True,
        ),
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
    ranking: Mapped[Any | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    comparisons: Mapped[Any] = mapped_column(JSON(none_as_null=True))
    is_complete: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionContent(Base):
    __tablename__ = "opinion_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opinion_id: Mapped[int] = mapped_column(Integer)
    conversation_content_id: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(String(3000))
    content_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_language_code: Mapped[SpokenLanguageCode | None] = mapped_column(
        SaEnum(
            SpokenLanguageCode,
            name="spoken_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    source_raw_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    source_language_provider: Mapped[LanguageDetectionProvider | None] = mapped_column(
        SaEnum(
            LanguageDetectionProvider,
            name="language_detection_provider",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    source_language_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupCandidateAssessment(Base):
    __tablename__ = "opinion_group_candidate_assessment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(Integer)
    silhouette_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    coefficient_of_variation: Mapped[float | None] = mapped_column(Float, nullable=True)
    balance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    selection_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    hidden_reason: Mapped[OpinionGroupCandidateHiddenReasonEnum | None] = mapped_column(
        SaEnum(
            OpinionGroupCandidateHiddenReasonEnum,
            name="opinion_group_candidate_hidden_reason_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupCandidateDescriptionLocaleRequest(Base):
    __tablename__ = "opinion_group_candidate_description_locale_request"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(Integer)
    locale: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupCandidateOpinionMetrics(Base):
    __tablename__ = "opinion_group_candidate_opinion_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(Integer)
    analysis_snapshot_opinion_id: Mapped[int] = mapped_column(Integer)
    group_aware_consensus_agree: Mapped[float | None] = mapped_column(Float, nullable=True)
    group_aware_consensus_disagree: Mapped[float | None] = mapped_column(Float, nullable=True)
    divisiveness: Mapped[float | None] = mapped_column(Float, nullable=True)
    majority_type: Mapped[VoteEnumSimple | None] = mapped_column(
        SaEnum(
            VoteEnumSimple,
            name="vote_enum_simple",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    majority_probability_success: Mapped[float | None] = mapped_column(Float, nullable=True)
    agreement_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    disagreement_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    divisiveness_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupCandidate(Base):
    __tablename__ = "opinion_group_candidate"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_result_id: Mapped[int] = mapped_column(Integer)
    opinion_group_variant_id: Mapped[int] = mapped_column(Integer)
    scope_id: Mapped[int] = mapped_column(Integer)
    outcome: Mapped[AnalysisResultOutcomeEnum] = mapped_column(
        SaEnum(
            AnalysisResultOutcomeEnum,
            name="analysis_result_outcome_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    outcome_reason: Mapped[AnalysisInsufficientDataReasonEnum | None] = mapped_column(
        SaEnum(
            AnalysisInsufficientDataReasonEnum,
            name="analysis_insufficient_data_reason_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    raw_output: Mapped[Any | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupDescription(Base):
    __tablename__ = "opinion_group_description"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    locale: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    label: Mapped[str] = mapped_column(String(100))
    summary: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupDescriptionTranslation(Base):
    __tablename__ = "opinion_group_description_translation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    description_id: Mapped[int] = mapped_column(Integer)
    locale: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    label: Mapped[str] = mapped_column(String(100))
    summary: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupDescriptionTranslationWork(Base):
    __tablename__ = "opinion_group_description_translation_work"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    description_id: Mapped[int] = mapped_column(Integer)
    conversation_id: Mapped[int] = mapped_column(Integer)
    locale: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    attempt_count: Mapped[int] = mapped_column(Integer, server_default="0")
    lease_owner: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lease_token: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    non_retryable_ai_description_epoch: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupLineageDescriptionWork(Base):
    __tablename__ = "opinion_group_lineage_description_work"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lineage_id: Mapped[int] = mapped_column(Integer)
    conversation_id: Mapped[int] = mapped_column(Integer)
    source_candidate_id: Mapped[int] = mapped_column(Integer)
    attempt_count: Mapped[int] = mapped_column(Integer, server_default="0")
    lease_owner: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lease_token: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    non_retryable_ai_description_epoch: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupLineageScope(Base):
    __tablename__ = "opinion_group_lineage_scope"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    opinion_group_variant_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupLineage(Base):
    __tablename__ = "opinion_group_lineage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_id: Mapped[int] = mapped_column(Integer)
    system_description_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    admin_description_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupOpinionStats(Base):
    __tablename__ = "opinion_group_opinion_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(Integer)
    analysis_snapshot_opinion_id: Mapped[int] = mapped_column(Integer)
    num_agrees: Mapped[int] = mapped_column(Integer, server_default="0")
    num_disagrees: Mapped[int] = mapped_column(Integer, server_default="0")
    num_passes: Mapped[int] = mapped_column(Integer, server_default="0")
    representative_agreement_type: Mapped[VoteEnumSimple | None] = mapped_column(
        SaEnum(
            VoteEnumSimple,
            name="vote_enum_simple",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    representative_probability_agreement: Mapped[float | None] = mapped_column(Float, nullable=True)
    representative_number_agreement: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_repness: Mapped[Any | None] = mapped_column(JSON(none_as_null=True), nullable=True)
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


class OpinionGroup(Base):
    __tablename__ = "opinion_group"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(Integer)
    scope_id: Mapped[int] = mapped_column(Integer)
    lineage_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    key: Mapped[str] = mapped_column(String(20))
    external_id: Mapped[int] = mapped_column(Integer)
    num_users: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupUser(Base):
    __tablename__ = "opinion_group_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(Integer)
    group_id: Mapped[int] = mapped_column(Integer)
    user_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OpinionGroupVariant(Base):
    __tablename__ = "opinion_group_variant"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opinion_group_spec_id: Mapped[int] = mapped_column(Integer)
    group_count: Mapped[int] = mapped_column(Integer)
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


class PremiumFeatureEntitlement(Base):
    __tablename__ = "premium_feature_entitlement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer)
    feature: Mapped[PremiumFeature] = mapped_column(
        SaEnum(
            PremiumFeature,
            name="premium_feature",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    updated_by_user_id: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class ProjectOrganizationOwnership(Base):
    __tablename__ = "project_organization_ownership"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer)
    organization_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class RealtimeEventOutbox(Base):
    __tablename__ = "realtime_event_outbox"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(100))
    payload: Mapped[Any] = mapped_column(JSON(none_as_null=True))
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyAggregateOption(Base):
    __tablename__ = "survey_aggregate_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_aggregate_question_id: Mapped[int] = mapped_column(Integer)
    survey_question_option_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    option_slug_id: Mapped[str] = mapped_column(String(8))
    option_order: Mapped[int] = mapped_column(Integer)
    option_text: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyAggregateQuestion(Base):
    __tablename__ = "survey_aggregate_question"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_aggregate_snapshot_id: Mapped[int] = mapped_column(Integer)
    survey_question_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    question_slug_id: Mapped[str] = mapped_column(String(8))
    question_order: Mapped[int] = mapped_column(Integer)
    question_type: Mapped[SurveyQuestionType] = mapped_column(
        SaEnum(
            SurveyQuestionType,
            name="survey_question_type",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    question_text: Mapped[str] = mapped_column(String(500))
    is_required: Mapped[bool] = mapped_column(Boolean)
    is_public_aggregate_suppression_enabled: Mapped[bool] = mapped_column(
        Boolean,
        server_default="false",
    )
    question_semantic_version: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyAggregateResult(Base):
    __tablename__ = "survey_aggregate_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_aggregate_snapshot_id: Mapped[int] = mapped_column(Integer)
    candidate_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    group_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scope: Mapped[SurveyAggregateScopeEnum] = mapped_column(
        SaEnum(
            SurveyAggregateScopeEnum,
            name="survey_aggregate_scope_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    survey_aggregate_question_id: Mapped[int] = mapped_column(Integer)
    survey_aggregate_option_id: Mapped[int] = mapped_column(Integer)
    suppressed_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    suppressed_percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    full_count: Mapped[int] = mapped_column(Integer)
    full_percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_suppressed: Mapped[bool] = mapped_column(Boolean)
    suppression_reason: Mapped[SurveyAggregateSuppressionReasonEnum | None] = mapped_column(
        SaEnum(
            SurveyAggregateSuppressionReasonEnum,
            name="survey_aggregate_suppression_reason_enum",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyAggregateSnapshot(Base):
    __tablename__ = "survey_aggregate_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    analysis_snapshot_id: Mapped[int] = mapped_column(Integer)
    survey_config_id: Mapped[int] = mapped_column(Integer)
    survey_config_revision: Mapped[int] = mapped_column(Integer)
    suppression_threshold: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyAnswerOption(Base):
    __tablename__ = "survey_answer_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_answer_id: Mapped[int] = mapped_column(Integer)
    survey_question_id: Mapped[int] = mapped_column(Integer)
    survey_question_option_id: Mapped[int] = mapped_column(Integer)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SurveyAnswer(Base):
    __tablename__ = "survey_answer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_response_id: Mapped[int] = mapped_column(Integer)
    conversation_id: Mapped[int] = mapped_column(Integer)
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
    is_optional: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SurveyQuestionContent(Base):
    __tablename__ = "survey_question_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_question_id: Mapped[int] = mapped_column(Integer)
    question_text: Mapped[str] = mapped_column(String(500))
    constraints: Mapped[Any] = mapped_column(JSON(none_as_null=True))
    source_language_code: Mapped[SpokenLanguageCode | None] = mapped_column(
        SaEnum(
            SpokenLanguageCode,
            name="spoken_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    source_raw_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    source_language_provider: Mapped[LanguageDetectionProvider | None] = mapped_column(
        SaEnum(
            LanguageDetectionProvider,
            name="language_detection_provider",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    source_language_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyQuestionOptionContent(Base):
    __tablename__ = "survey_question_option_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_question_option_id: Mapped[int] = mapped_column(Integer)
    option_text: Mapped[str] = mapped_column(String(200))
    source_language_code: Mapped[SpokenLanguageCode | None] = mapped_column(
        SaEnum(
            SpokenLanguageCode,
            name="spoken_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    source_raw_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    source_language_provider: Mapped[LanguageDetectionProvider | None] = mapped_column(
        SaEnum(
            LanguageDetectionProvider,
            name="language_detection_provider",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=True,
    )
    source_language_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyQuestionOption(Base):
    __tablename__ = "survey_question_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    survey_question_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyQuestion(Base):
    __tablename__ = "survey_question"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    survey_config_id: Mapped[int] = mapped_column(Integer)
    conversation_id: Mapped[int] = mapped_column(Integer)
    question_type: Mapped[SurveyQuestionType] = mapped_column(
        SaEnum(
            SurveyQuestionType,
            name="survey_question_type",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    choice_display: Mapped[SurveyChoiceDisplay] = mapped_column(
        SaEnum(
            SurveyChoiceDisplay,
            name="survey_choice_display",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_semantic_version: Mapped[int] = mapped_column(Integer, server_default="1")
    display_order: Mapped[int] = mapped_column(Integer)
    is_required: Mapped[bool] = mapped_column(Boolean, server_default="true")
    is_public_aggregate_suppression_enabled: Mapped[bool] = mapped_column(
        Boolean,
        server_default="false",
    )
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
