# WARNING: GENERATED FROM services/shared-backend/src/schema.ts
# DO NOT MODIFY -- Re-generate with: make sync
# Service: credit-voting-worker

from __future__ import annotations

import uuid as uuid_pkg
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    Uuid,
    text,
)
from sqlalchemy import Enum as SaEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def _enum_values(enum_cls: type[StrEnum]) -> list[str]:
    return [member.value for member in enum_cls]


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


class ConversationLanguageSettingsSource(StrEnum):
    conversation_override = "conversation_override"
    project_inherited = "project_inherited"


class ParticipationMode(StrEnum):
    account_required = "account_required"
    strong_verification = "strong_verification"
    email_verification = "email_verification"
    guest = "guest"


class ConversationType(StrEnum):
    polis = "polis"
    prioritizing = "prioritizing"


class EventSlug(StrEnum):
    devconnect_2025 = "devconnect-2025"


class DirectoryVisibility(StrEnum):
    listed = "listed"
    unlisted = "unlisted"


class RankingItemLifecycleStatus(StrEnum):
    active = "active"
    completed = "completed"
    in_progress = "in_progress"
    canceled = "canceled"


class SurveyQuestionType(StrEnum):
    choice = "choice"
    free_text = "free_text"


class SurveyChoiceDisplay(StrEnum):
    auto = "auto"
    list = "list"
    dropdown = "dropdown"


class ConversationContent(Base):
    __tablename__ = "conversation_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, default=uuid_pkg.uuid4)
    conversation_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(150))
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


class ConversationParticipant(Base):
    __tablename__ = "conversation_participant"

    id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_pkg.uuid4)
    conversation_id: Mapped[int] = mapped_column(Integer)
    user_id: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class Conversation(Base):
    __tablename__ = "conversation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    project_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    polis_config_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ranking_config_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    credit_voting_config_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prioritization_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    dynamic_translation_enabled: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    conversation_email_update_enabled_override: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
    )
    conversation_email_update_override_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    conversation_email_update_override_updated_by_user_id: Mapped[
        uuid_pkg.UUID | None
    ] = mapped_column(
        Uuid,
        nullable=True,
    )
    language_settings_source: Mapped[ConversationLanguageSettingsSource] = mapped_column(
        SaEnum(
            ConversationLanguageSettingsSource,
            name="conversation_language_settings_source",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    is_indexed: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
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
    is_importing: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    is_closed: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    vote_buffer_epoch: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, default=uuid_pkg.uuid4)
    vote_buffer_drained: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    closing_target_revision: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    closed_finalized_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    requires_event_ticket: Mapped[EventSlug | None] = mapped_column(
        SaEnum(EventSlug, name="event_slug", values_callable=_enum_values, native_enum=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    last_reacted_at: Mapped[datetime] = mapped_column(DateTime)


class CreditVotingConfig(Base):
    __tablename__ = "credit_voting_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    credit_budget: Mapped[int] = mapped_column(Integer, server_default="100")
    allow_opposition: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    item_count: Mapped[int] = mapped_column(Integer, server_default="0")
    statement_set_revision: Mapped[int] = mapped_column(Integer, server_default="0")
    statements_locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class Project(Base):
    __tablename__ = "project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(65))
    title: Mapped[str] = mapped_column(String(150))
    directory_visibility: Mapped[DirectoryVisibility] = mapped_column(
        SaEnum(
            DirectoryVisibility,
            name="directory_visibility",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    auto_provisioned_for_organization_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dynamic_translation_enabled: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    conversation_email_update_default_enabled: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("false"),
    )
    conversation_email_update_default_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    conversation_email_update_default_updated_by_user_id: Mapped[
        uuid_pkg.UUID | None
    ] = mapped_column(
        Uuid,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    retired_for_account_deletion_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )


class QvAllocation(Base):
    __tablename__ = "qv_allocation"

    version_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    item_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    content_id: Mapped[int] = mapped_column(Integer)
    votes: Mapped[int] = mapped_column(Integer)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class QvCalculationState(Base):
    __tablename__ = "qv_calculation_state"

    conversation_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    generation: Mapped[int] = mapped_column(Integer, server_default="0")
    current_calculation_id: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)


class QvCalculation(Base):
    __tablename__ = "qv_calculation"

    id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_pkg.uuid4)
    conversation_id: Mapped[int] = mapped_column(Integer)
    generation: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(Text)
    input_snapshot_id: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    lease_token: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, server_default="0")
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime)
    error_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    ready_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class QvInputAllocation(Base):
    __tablename__ = "qv_input_allocation"

    snapshot_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True)
    ballot_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_slug_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    votes: Mapped[int] = mapped_column(Integer)


class QvInputBallot(Base):
    __tablename__ = "qv_input_ballot"

    snapshot_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True)
    ballot_index: Mapped[int] = mapped_column(Integer, primary_key=True)


class QvInputItem(Base):
    __tablename__ = "qv_input_item"

    snapshot_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True)
    item_slug_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    source_version: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)


class QvInputSnapshot(Base):
    __tablename__ = "qv_input_snapshot"

    id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_pkg.uuid4)
    calculation_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    credit_budget: Mapped[int] = mapped_column(Integer)
    credit_pricing: Mapped[str] = mapped_column(Text)
    allow_opposition: Mapped[bool] = mapped_column(Boolean)
    statement_set_revision: Mapped[int] = mapped_column(Integer)
    rule_version: Mapped[int] = mapped_column(Integer)
    algorithm_version: Mapped[int] = mapped_column(Integer)
    participant_count: Mapped[int] = mapped_column(Integer)
    captured_at: Mapped[datetime] = mapped_column(DateTime)


class QvLiveStats(Base):
    __tablename__ = "qv_live_stats"

    conversation_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    participant_count: Mapped[int] = mapped_column(Integer, server_default="0")
    revision: Mapped[int] = mapped_column(BigInteger, server_default="0")
    refreshed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    retry_after: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class QvResponse(Base):
    __tablename__ = "qv_response"

    id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_pkg.uuid4)
    participant_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    conversation_id: Mapped[int] = mapped_column(Integer)
    revision: Mapped[int] = mapped_column(Integer, server_default="0")
    current_version_id: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    account_hidden_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class QvResponseVersion(Base):
    __tablename__ = "qv_response_version"

    id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_pkg.uuid4)
    response_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    conversation_id: Mapped[int] = mapped_column(Integer)
    statement_set_revision: Mapped[int] = mapped_column(Integer)
    credit_budget: Mapped[int] = mapped_column(Integer, server_default="100")
    credit_pricing: Mapped[str] = mapped_column(String(16))
    allow_opposition: Mapped[bool] = mapped_column(Boolean)
    rule_version: Mapped[int] = mapped_column(Integer, server_default="1")
    credits_spent: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class QvResultItem(Base):
    __tablename__ = "qv_result_item"

    snapshot_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, primary_key=True)
    item_slug_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    support_units: Mapped[int] = mapped_column(BigInteger)
    opposition_units: Mapped[int] = mapped_column(BigInteger)
    net_units: Mapped[int] = mapped_column(BigInteger)
    supporting_participant_count: Mapped[int] = mapped_column(Integer)
    opposing_participant_count: Mapped[int] = mapped_column(Integer)
    rank: Mapped[int] = mapped_column(Integer)


class QvStatsRefresh(Base):
    __tablename__ = "qv_stats_refresh"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class RankingItemContent(Base):
    __tablename__ = "ranking_item_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, default=uuid_pkg.uuid4)
    ranking_item_id: Mapped[int] = mapped_column(Integer)
    conversation_content_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(Text)
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


class RankingItem(Base):
    __tablename__ = "ranking_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    author_id: Mapped[uuid_pkg.UUID | None] = mapped_column(Uuid, nullable=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    account_hidden_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    lifecycle_status: Mapped[RankingItemLifecycleStatus] = mapped_column(
        SaEnum(
            RankingItemLifecycleStatus,
            name="ranking_item_lifecycle_status",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    position: Mapped[int] = mapped_column(Integer, server_default="0")
    snapshot_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    snapshot_ranking_score_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    snapshot_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    snapshot_participant_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class RealtimeEventOutbox(Base):
    __tablename__ = "realtime_event_outbox"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(100))
    payload: Mapped[Any] = mapped_column(JSON(none_as_null=True))
    delivery_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class RealtimeEventOutboxTopic(Base):
    __tablename__ = "realtime_event_outbox_topic"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer)
    topic: Mapped[str] = mapped_column(String(255))


class SurveyAnswerOption(Base):
    __tablename__ = "survey_answer_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_answer_id: Mapped[int] = mapped_column(Integer)
    survey_question_id: Mapped[int] = mapped_column(Integer)
    survey_question_option_id: Mapped[int] = mapped_column(Integer)
    text_value_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    text_value_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SurveyAnswer(Base):
    __tablename__ = "survey_answer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_response_id: Mapped[int] = mapped_column(Integer)
    conversation_id: Mapped[int] = mapped_column(Integer)
    survey_question_id: Mapped[int] = mapped_column(Integer)
    answered_question_semantic_version: Mapped[int] = mapped_column(Integer)
    text_value_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    text_value_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyConfig(Base):
    __tablename__ = "survey_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    current_revision: Mapped[int] = mapped_column(Integer, server_default="1")
    is_optional: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SurveyQuestionContent(Base):
    __tablename__ = "survey_question_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid, default=uuid_pkg.uuid4)
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


class SurveyQuestionOption(Base):
    __tablename__ = "survey_question_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    survey_question_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer)
    allows_text: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
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
    is_required: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    is_public_aggregate_suppression_enabled: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("false"),
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
    is_site_moderator: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    is_site_org_admin: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    is_imported: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    is_deleted: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    contribution_revision: Mapped[int] = mapped_column(Integer, server_default="0")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    deletion_requested_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recoverable_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    purge_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    auth_restricted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    auth_restriction_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    active_conversation_count: Mapped[int] = mapped_column(Integer, server_default="0")
    total_conversation_count: Mapped[int] = mapped_column(Integer, server_default="0")
    total_opinion_count: Mapped[int] = mapped_column(Integer, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
