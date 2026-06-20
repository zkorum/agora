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


class SurveyQuestionType(StrEnum):
    choice = "choice"
    free_text = "free_text"


class SurveyChoiceDisplay(StrEnum):
    auto = "auto"
    list = "list"
    dropdown = "dropdown"


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
    translated_title: Mapped[str] = mapped_column(String(140))
    translated_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_language_code: Mapped[LanguageCode | None] = mapped_column(
        SaEnum(LanguageCode, name="language_code", values_callable=_enum_values, native_enum=True),
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
    source_language_code: Mapped[LanguageCode | None] = mapped_column(
        SaEnum(LanguageCode, name="language_code", values_callable=_enum_values, native_enum=True),
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
    survey_question_id: Mapped[int] = mapped_column(Integer)
    question_text: Mapped[str] = mapped_column(String(500))
    constraints: Mapped[Any] = mapped_column(JSON(none_as_null=True))
    source_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
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
    source_language_code: Mapped[LanguageCode | None] = mapped_column(
        SaEnum(LanguageCode, name="language_code", values_callable=_enum_values, native_enum=True),
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
    survey_question_option_id: Mapped[int] = mapped_column(Integer)
    option_text: Mapped[str] = mapped_column(String(200))
    source_language_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
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
    source_language_code: Mapped[LanguageCode | None] = mapped_column(
        SaEnum(LanguageCode, name="language_code", values_callable=_enum_values, native_enum=True),
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
