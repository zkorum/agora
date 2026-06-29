# WARNING: GENERATED FROM services/api/src/shared-backend/schema.ts
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


def _enum_values(enum_cls: type[StrEnum]) -> list[str]:
    return [member.value for member in enum_cls]


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


class DirectoryVisibility(StrEnum):
    listed = "listed"
    unlisted = "unlisted"


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


class SurveyQuestionType(StrEnum):
    choice = "choice"
    free_text = "free_text"


class SurveyChoiceDisplay(StrEnum):
    auto = "auto"
    list = "list"
    dropdown = "dropdown"


class Conversation(Base):
    __tablename__ = "conversation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug_id: Mapped[str] = mapped_column(String(8))
    project_id: Mapped[int] = mapped_column(Integer)
    current_content_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dynamic_translation_enabled: Mapped[bool] = mapped_column(Boolean, server_default="false")
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


class MaxdiffUserEntityScore(Base):
    __tablename__ = "maxdiff_user_entity_score"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    maxdiff_result_id: Mapped[int] = mapped_column(Integer)
    entity_slug_id: Mapped[str] = mapped_column(String(8))
    score: Mapped[float] = mapped_column(Float)
    uncertainty_left: Mapped[float] = mapped_column(Float)
    uncertainty_right: Mapped[float] = mapped_column(Float)


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
    scores: Mapped[Any] = mapped_column(JSON(none_as_null=True))
    participant_counts: Mapped[Any] = mapped_column(JSON(none_as_null=True))
    group_sources_snapshot: Mapped[Any | None] = mapped_column(
        JSON(none_as_null=True),
        nullable=True,
    )
    user_weights_snapshot: Mapped[Any | None] = mapped_column(
        JSON(none_as_null=True),
        nullable=True,
    )
    pipeline_config: Mapped[Any] = mapped_column(JSON(none_as_null=True))
    preference_learning: Mapped[str | None] = mapped_column(String(100), nullable=True)
    voting_rights: Mapped[str | None] = mapped_column(String(100), nullable=True)
    aggregation_config: Mapped[str | None] = mapped_column(String(200), nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime)
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
