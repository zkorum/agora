from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal

from content_translation_worker.generated_models import ContentTranslationSourceKind

if TYPE_CHECKING:
    import uuid

    from content_translation_worker.generated_models import (
        DisplayLanguageCode,
        LanguageDetectionProvider,
    )
    from content_translation_worker.translation import (
        ContentTranslationResult,
        LocalizedTranslationResult,
    )


@dataclass(frozen=True)
class ContentRevision:
    kind: Literal[
        ContentTranslationSourceKind.project,
        ContentTranslationSourceKind.conversation,
        ContentTranslationSourceKind.opinion,
        ContentTranslationSourceKind.ranking_item,
    ]
    content_id: int


@dataclass(frozen=True)
class SurveyRevision:
    content_id: int
    option_content_ids: tuple[int, ...]
    kind: Literal[ContentTranslationSourceKind.survey_question] = field(
        default=ContentTranslationSourceKind.survey_question,
        init=False,
    )


type SourceRevision = ContentRevision | SurveyRevision


@dataclass(frozen=True)
class ClaimedContentTranslationWork:
    source_revision: SourceRevision
    conversation_slug_id: str | None
    display_language_code: DisplayLanguageCode
    lease_token: uuid.UUID
    work_ids: tuple[int, *tuple[int, ...]]

    @property
    def id(self) -> int:
        return self.work_ids[0]

    @property
    def source_kind(self) -> ContentTranslationSourceKind:
        return self.source_revision.kind


@dataclass(frozen=True)
class ProcessWorkResult:
    work_id: int
    status: Literal[
        "completed",
        "failed",
        "ineligible_source",
        "missing_source",
        "lost_lease",
        "source_changed",
    ]


@dataclass(frozen=True)
class TranslationSourceDecision:
    source_language_code_for_translation: str | None
    use_google_detected_source: bool


@dataclass(frozen=True)
class ConversationSource:
    conversation_slug_id: str
    content_id: int
    public_id: uuid.UUID
    title: str
    body: str | None
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


@dataclass(frozen=True)
class OpinionSource:
    conversation_slug_id: str
    opinion_slug_id: str
    content_id: int
    public_id: uuid.UUID
    content: str
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


@dataclass(frozen=True)
class SurveyQuestionOptionSource:
    option_slug_id: str
    content_id: int
    option_text: str
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


@dataclass(frozen=True)
class SurveyQuestionSource:
    conversation_slug_id: str
    question_slug_id: str
    content_id: int
    public_id: uuid.UUID
    question_text: str
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None
    options: tuple[SurveyQuestionOptionSource, ...]


@dataclass(frozen=True)
class RankingItemSource:
    conversation_slug_id: str
    item_slug_id: str
    content_id: int
    public_id: uuid.UUID
    title: str
    body_html: str | None
    body_plain_text: str | None
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


@dataclass(frozen=True)
class ProjectSource:
    project_id: int
    project_slug: str
    content_id: int
    public_id: uuid.UUID
    title: str
    subtitle: str | None
    body: str | None
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None


type TranslationSource = (
    ConversationSource | ProjectSource | OpinionSource | RankingItemSource | SurveyQuestionSource
)


@dataclass(frozen=True)
class PreparedContentTranslation:
    claim: ClaimedContentTranslationWork
    source: TranslationSource


@dataclass(frozen=True)
class TitleBodyTranslation:
    language: DisplayLanguageCode
    title: ContentTranslationResult
    body: ContentTranslationResult | None


@dataclass(frozen=True)
class ProjectTranslation:
    language: DisplayLanguageCode
    title: ContentTranslationResult
    subtitle: ContentTranslationResult | None
    body: ContentTranslationResult | None


@dataclass(frozen=True)
class SurveyOptionTranslation:
    source: SurveyQuestionOptionSource
    result: ContentTranslationResult


@dataclass(frozen=True)
class SurveyTranslation:
    language: DisplayLanguageCode
    question: ContentTranslationResult
    options: tuple[SurveyOptionTranslation, ...]


@dataclass(frozen=True)
class ConversationTranslationBundle:
    source: ConversationSource
    translations: tuple[TitleBodyTranslation, ...]


@dataclass(frozen=True)
class ProjectTranslationBundle:
    source: ProjectSource
    translations: tuple[ProjectTranslation, ...]


@dataclass(frozen=True)
class OpinionTranslationBundle:
    source: OpinionSource
    translations: tuple[LocalizedTranslationResult, ...]
    source_decision: TranslationSourceDecision


@dataclass(frozen=True)
class RankingItemTranslationBundle:
    source: RankingItemSource
    translations: tuple[TitleBodyTranslation, ...]
    source_decision: TranslationSourceDecision


@dataclass(frozen=True)
class SurveyTranslationBundle:
    source: SurveyQuestionSource
    translations: tuple[SurveyTranslation, ...]


type TranslationBundle = (
    ConversationTranslationBundle
    | ProjectTranslationBundle
    | OpinionTranslationBundle
    | RankingItemTranslationBundle
    | SurveyTranslationBundle
)
