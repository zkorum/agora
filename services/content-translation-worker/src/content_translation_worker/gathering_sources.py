from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import and_, or_, select

from content_translation_worker.generated_models import (
    Conversation,
    ConversationContent,
    ConversationTranslationTargetLanguage,
    DisplayLanguageCode,
    GatheringAnswer,
    GatheringConfig,
    GatheringField,
    GatheringResponse,
    GatheringResponseContent,
    Project,
    ProjectContent,
    ProjectTranslationTargetLanguage,
    User,
)
from content_translation_worker.models import (
    GatheringAnswerSource,
    GatheringFieldSource,
    GatheringResponseSource,
)

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.orm import Session


def _enabled_parent_conditions():
    return and_(
        Conversation.current_content_id.is_not(None),
        Conversation.deleted_at.is_(None),
        Conversation.is_importing.is_(False),
        Conversation.conversation_type == "gathering",
        Project.deleted_at.is_(None),
        or_(
            and_(
                Conversation.language_settings_source == "project_inherited",
                Project.dynamic_translation_enabled.is_(True),
            ),
            and_(
                Conversation.language_settings_source != "project_inherited",
                Conversation.dynamic_translation_enabled.is_(True),
            ),
        ),
    )


def fetch_gathering_field_source(
    session: Session, *, field_id: uuid.UUID
) -> GatheringFieldSource | None:
    conversation_id = session.scalar(
        select(Conversation.id)
        .join(GatheringField, GatheringField.config_id == Conversation.gathering_config_id)
        .where(GatheringField.id == field_id)
    )
    if conversation_id is None or not _lock_conversation(session, conversation_id=conversation_id):
        return None
    # Eligibility must use a statement started after any lifecycle-lock wait.
    row = session.execute(
        select(GatheringField.id, GatheringField.label, Conversation.slug_id)
        .join(Conversation, Conversation.gathering_config_id == GatheringField.config_id)
        .join(Project, Project.id == Conversation.project_id)
        .where(GatheringField.id == field_id, _enabled_parent_conditions())
    ).one_or_none()
    if row is None:
        return None
    return GatheringFieldSource(conversation_slug_id=row.slug_id, content_id=row.id, text=row.label)


def _lock_conversation(session: Session, *, conversation_id: int) -> bool:
    return (
        session.scalar(
            select(Conversation.id)
            .where(Conversation.id == conversation_id)
            .with_for_update(read=True)
        )
        is not None
    )


def fetch_gathering_response_source(
    session: Session, *, content_id: int
) -> GatheringResponseSource | None:
    observed = session.execute(
        select(GatheringResponse.author_id, GatheringResponse.conversation_id)
        .join(
            GatheringResponseContent, GatheringResponseContent.response_id == GatheringResponse.id
        )
        .where(GatheringResponseContent.id == content_id)
    ).one_or_none()
    if observed is None:
        return None
    # Match the API/account lifecycle's author-before-conversation lock ordering.
    if observed.author_id is not None:
        account = session.scalar(
            select(User.id)
            .where(
                User.id == observed.author_id,
                User.is_deleted.is_(False),
                User.auth_restricted_at.is_(None),
            )
            .with_for_update(read=True)
        )
        if account is None:
            return None
    if not _lock_conversation(session, conversation_id=observed.conversation_id):
        return None
    row = session.execute(
        select(GatheringResponseContent, GatheringResponse.slug_id, Conversation.slug_id)
        .join(GatheringResponse, GatheringResponse.id == GatheringResponseContent.response_id)
        .join(Conversation, Conversation.id == GatheringResponse.conversation_id)
        .join(Project, Project.id == Conversation.project_id)
        .join(GatheringConfig, GatheringConfig.id == Conversation.gathering_config_id)
        .outerjoin(User, User.id == GatheringResponse.author_id)
        .where(
            GatheringResponseContent.id == content_id,
            GatheringResponse.conversation_id == observed.conversation_id,
            # A merge must not let an unlocked replacement author pass this check.
            GatheringResponse.author_id.is_not_distinct_from(observed.author_id),
            GatheringResponse.current_content_id.is_not(None),
            GatheringResponse.deleted_at.is_(None),
            GatheringResponse.account_hidden_at.is_(None),
            or_(GatheringResponse.moderation.is_(None), GatheringResponse.moderation == "move"),
            GatheringConfig.response_visibility == "everyone",
            or_(
                GatheringResponse.is_seed.is_(True),
                and_(
                    User.is_deleted.is_(False),
                    User.auth_restricted_at.is_(None),
                ),
            ),
            _enabled_parent_conditions(),
        )
    ).one_or_none()
    if row is None:
        return None
    content, response_slug, conversation_slug = row
    fields = session.execute(
        select(GatheringField.id, GatheringAnswer.value)
        .outerjoin(
            GatheringAnswer,
            and_(
                GatheringField.id == GatheringAnswer.field_id,
                GatheringAnswer.content_id == content_id,
            ),
        )
        .where(GatheringField.config_id == content.config_id)
        .order_by(GatheringField.position)
    ).all()
    answers: list[GatheringAnswerSource] = []
    for field in fields:
        if field.value is None:
            return None
        answers.append(GatheringAnswerSource(field_id=field.id, value=field.value))
    if not answers:
        return None
    return GatheringResponseSource(
        conversation_slug_id=conversation_slug,
        response_slug_id=response_slug,
        content_id=content.id,
        public_id=content.public_id,
        answers=tuple(answers),
    )


def _display_language(code: str | None) -> DisplayLanguageCode | None:
    if code is None:
        return None
    try:
        return DisplayLanguageCode(code)
    except ValueError:
        return None


def gathering_translation_targets(
    session: Session, *, conversation_slug_id: str
) -> frozenset[DisplayLanguageCode]:
    """Mirror the API's current default-plus-two-manual target policy."""
    parent = session.execute(
        select(
            Conversation.id,
            Conversation.project_id,
            Conversation.language_settings_source,
            ConversationContent.source_language_code.label("conversation_language"),
            ProjectContent.source_language_code.label("project_language"),
        )
        .join(Project, Project.id == Conversation.project_id)
        .join(ConversationContent, ConversationContent.id == Conversation.current_content_id)
        .outerjoin(ProjectContent, ProjectContent.id == Project.current_content_id)
        .where(Conversation.slug_id == conversation_slug_id, _enabled_parent_conditions())
    ).one_or_none()
    if parent is None:
        return frozenset()
    if parent.language_settings_source == "project_inherited":
        detected = _display_language(parent.project_language) or DisplayLanguageCode.en
        manual = list(
            session.scalars(
                select(ProjectTranslationTargetLanguage.language_code)
                .where(
                    ProjectTranslationTargetLanguage.project_id == parent.project_id,
                    ProjectTranslationTargetLanguage.deleted_at.is_(None),
                )
                .order_by(ProjectTranslationTargetLanguage.id)
                .limit(2)
            )
        )
    else:
        detected = _display_language(parent.conversation_language)
        materialized = session.scalars(
            select(ConversationTranslationTargetLanguage.language_code)
            .where(
                ConversationTranslationTargetLanguage.conversation_id == parent.id,
                ConversationTranslationTargetLanguage.deleted_at.is_(None),
            )
            .order_by(ConversationTranslationTargetLanguage.id)
            .limit(3)
        )
        manual = [language for language in materialized if language != detected][:2]
    return frozenset(([detected] if detected is not None else []) + manual)
