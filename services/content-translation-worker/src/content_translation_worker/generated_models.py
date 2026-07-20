# WARNING: GENERATED FROM services/api/src/shared-backend/schema.ts
# DO NOT MODIFY -- Re-generate with: make sync
# Service: content-translation-worker

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


class ContentTranslationSourceKind(StrEnum):
    conversation = "conversation"
    opinion = "opinion"
    survey_question = "survey_question"
    project = "project"
    ranking_item = "ranking_item"


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
    ranking = "ranking"


class EventSlug(StrEnum):
    devconnect_2025 = "devconnect-2025"


class ConversationViewSnapshotReasonEnum(StrEnum):
    analysis_completed = "analysis_completed"
    survey_refreshed = "survey_refreshed"
    conversation_content_updated = "conversation_content_updated"
    conversation_lifecycle_updated = "conversation_lifecycle_updated"


class ProjectContentTranslationSourceKind(StrEnum):
    manual = "manual"
    machine = "machine"


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


class ContentTranslationWork(Base):
    __tablename__ = "content_translation_work"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_kind: Mapped[ContentTranslationSourceKind] = mapped_column(
        SaEnum(
            ContentTranslationSourceKind,
            name="content_translation_source_kind",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    project_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    conversation_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opinion_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    survey_question_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    survey_question_option_content_ids: Mapped[list[int] | None] = mapped_column(
        ARRAY(Integer),
        nullable=True,
    )
    ranking_item_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
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
    public_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
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


class ConversationContentTranslation(Base):
    __tablename__ = "conversation_content_translation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_content_id: Mapped[int] = mapped_column(Integer)
    display_language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    translated_title: Mapped[str] = mapped_column(Text)
    translated_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    translated_body_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class Conversation(Base):
    __tablename__ = "conversation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    project_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    polis_config_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ranking_config_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dynamic_translation_enabled: Mapped[bool] = mapped_column(Boolean, server_default="false")
    language_settings_source: Mapped[ConversationLanguageSettingsSource] = mapped_column(
        SaEnum(
            ConversationLanguageSettingsSource,
            name="conversation_language_settings_source",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
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
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    last_reacted_at: Mapped[datetime] = mapped_column(DateTime)


class ConversationTranslationTargetLanguage(Base):
    __tablename__ = "conversation_translation_target_language"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer)
    language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


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


class OpinionContent(Base):
    __tablename__ = "opinion_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
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


class OpinionContentTranslation(Base):
    __tablename__ = "opinion_content_translation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opinion_content_id: Mapped[int] = mapped_column(Integer)
    display_language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    translated_content: Mapped[str] = mapped_column(Text)
    translated_content_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
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


class ProjectContent(Base):
    __tablename__ = "project_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    project_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(140))
    subtitle: Mapped[str | None] = mapped_column(String(140), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    banner_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    banner_is_full_path: Mapped[bool] = mapped_column(Boolean, server_default="false")
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
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ProjectContentTranslation(Base):
    __tablename__ = "project_content_translation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_content_id: Mapped[int] = mapped_column(Integer)
    display_language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    translated_title: Mapped[str] = mapped_column(Text)
    translated_subtitle: Mapped[str | None] = mapped_column(Text, nullable=True)
    translated_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    translated_body_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_kind: Mapped[ProjectContentTranslationSourceKind] = mapped_column(
        SaEnum(
            ProjectContentTranslationSourceKind,
            name="project_content_translation_source_kind",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
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
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Project(Base):
    __tablename__ = "project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(65))
    title: Mapped[str] = mapped_column(String(140))
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
    dynamic_translation_enabled: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ProjectTranslationTargetLanguage(Base):
    __tablename__ = "project_translation_target_language"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer)
    language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class RankingItemContent(Base):
    __tablename__ = "ranking_item_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    ranking_item_id: Mapped[int] = mapped_column(Integer)
    conversation_content_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(String(3000), nullable=True)
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


class RankingItemContentTranslation(Base):
    __tablename__ = "ranking_item_content_translation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ranking_item_content_id: Mapped[int] = mapped_column(Integer)
    display_language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    translated_title: Mapped[str] = mapped_column(Text)
    translated_body_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    translated_body_plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class RankingItem(Base):
    __tablename__ = "ranking_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    author_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
    conversation_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    lifecycle_status: Mapped[RankingItemLifecycleStatus] = mapped_column(
        SaEnum(
            RankingItemLifecycleStatus,
            name="ranking_item_lifecycle_status",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    snapshot_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    snapshot_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    snapshot_participant_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class RealtimeEventOutbox(Base):
    __tablename__ = "realtime_event_outbox"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(100))
    payload: Mapped[Any] = mapped_column(JSON(none_as_null=True))
    created_at: Mapped[datetime] = mapped_column(DateTime)


class RealtimeEventOutboxTopic(Base):
    __tablename__ = "realtime_event_outbox_topic"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer)
    topic: Mapped[str] = mapped_column(String(255))


class SurveyQuestionContent(Base):
    __tablename__ = "survey_question_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
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


class SurveyQuestionContentTranslation(Base):
    __tablename__ = "survey_question_content_translation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_question_content_id: Mapped[int] = mapped_column(Integer)
    display_language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    translated_question_text: Mapped[str] = mapped_column(Text)
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
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class SurveyQuestionOptionContent(Base):
    __tablename__ = "survey_question_option_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid_pkg.UUID] = mapped_column(Uuid)
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


class SurveyQuestionOptionContentTranslation(Base):
    __tablename__ = "survey_question_option_content_translation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_question_option_content_id: Mapped[int] = mapped_column(Integer)
    display_language_code: Mapped[DisplayLanguageCode] = mapped_column(
        SaEnum(
            DisplayLanguageCode,
            name="display_language_code",
            values_callable=_enum_values,
            native_enum=True,
        ),
    )
    translated_option_text: Mapped[str] = mapped_column(Text)
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
    updated_at: Mapped[datetime] = mapped_column(DateTime)


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
