from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from agora_analysis_worker_shared.generated_models import SurveyQuestionType
from agora_analysis_worker_shared.survey_aggregates import (
    SurveyAnswerSnapshot,
    SurveyConfigSnapshot,
    SurveyOptionSnapshot,
    SurveyQuestionSnapshot,
    SurveyResponseSnapshot,
    is_survey_response_complete_valid,
)
from sqlalchemy import func, select

from credit_voting_worker.generated_models import (
    ConversationParticipant,
    CreditVotingConfig,
    QvAllocation,
    QvResponse,
    QvResponseVersion,
    RankingItem,
    SurveyAnswer,
    SurveyAnswerOption,
    SurveyConfig,
    SurveyQuestion,
    SurveyQuestionContent,
    SurveyQuestionOption,
    SurveyResponse,
    User,
)
from credit_voting_worker.generated_rules import QV_RULE_VERSION
from credit_voting_worker.work import InvalidInputError

if TYPE_CHECKING:
    from collections.abc import Mapping, Sequence
    from uuid import UUID

    from sqlalchemy import Select
    from sqlalchemy.orm import Session
    from sqlalchemy.sql.elements import ColumnElement


@dataclass(frozen=True)
class QvItemInput:
    slug_id: str
    content_id: int


@dataclass(frozen=True)
class QvAllocationInput:
    item_slug_id: str
    votes: int


def project_live_ballot(
    *,
    version: QvResponseVersion,
    allocations: Sequence[QvAllocation],
    config: CreditVotingConfig,
    items: Mapping[int, QvItemInput],
) -> tuple[QvAllocationInput, ...]:
    """Validate the saved ballot before projecting current item availability."""
    if (
        not allocations
        or version.credit_budget != config.credit_budget
        or version.credit_pricing != "quadratic"
        or version.allow_opposition != config.allow_opposition
        or version.rule_version != QV_RULE_VERSION
        or version.statement_set_revision != config.statement_set_revision
        or sum(row.votes**2 for row in allocations) != version.credits_spent
        or not 1 <= version.credits_spent <= config.credit_budget
    ):
        raise InvalidInputError("Unsupported QV ballot provenance")
    if any(
        row.votes == 0
        or row.votes**2 > config.credit_budget
        or (row.votes < 0 and not config.allow_opposition)
        for row in allocations
    ):
        raise InvalidInputError("Invalid QV ballot allocations")

    projected: list[QvAllocationInput] = []
    for row in allocations:
        item = items.get(row.item_id)
        if item is not None and item.content_id == row.content_id and row.deleted_at is None:
            # Exclusion never transfers credits or changes surviving signed votes.
            projected.append(QvAllocationInput(item_slug_id=item.slug_id, votes=row.votes))
    return tuple(projected)


def _available_allocation_condition() -> ColumnElement[bool]:
    return (
        select(QvAllocation.item_id)
        .join(RankingItem, RankingItem.id == QvAllocation.item_id)
        .where(
            QvAllocation.version_id == QvResponse.current_version_id,
            QvAllocation.deleted_at.is_(None),
            RankingItem.current_content_id == QvAllocation.content_id,
            RankingItem.deleted_at.is_(None),
            RankingItem.account_hidden_at.is_(None),
            RankingItem.is_seed.is_(True),
        )
        .exists()
    )


def eligible_response_query(*, conversation_id: int) -> Select[tuple[UUID, UUID, UUID]]:
    """Account-eligible saved ballots; capture validates before projecting choices."""
    return (
        select(QvResponse.id, QvResponseVersion.id, User.id)
        .select_from(QvResponse)
        .join(ConversationParticipant, ConversationParticipant.id == QvResponse.participant_id)
        .join(User, User.id == ConversationParticipant.user_id)
        .join(QvResponseVersion, QvResponseVersion.id == QvResponse.current_version_id)
        .where(
            QvResponse.conversation_id == conversation_id,
            QvResponse.deleted_at.is_(None),
            QvResponse.account_hidden_at.is_(None),
            QvResponseVersion.deleted_at.is_(None),
            User.is_deleted.is_(False),
        )
    )


def load_required_survey(*, session: Session, conversation_id: int) -> SurveyConfigSnapshot | None:
    config = session.scalars(
        select(SurveyConfig).where(
            SurveyConfig.conversation_id == conversation_id,
            SurveyConfig.deleted_at.is_(None),
            SurveyConfig.is_optional.is_(False),
        )
    ).one_or_none()
    if config is None:
        return None
    questions = (
        session.execute(
            select(SurveyQuestion, SurveyQuestionContent.constraints)
            .join(
                SurveyQuestionContent, SurveyQuestionContent.id == SurveyQuestion.current_content_id
            )
            .where(
                SurveyQuestion.survey_config_id == config.id, SurveyQuestion.is_required.is_(True)
            )
        )
        .tuples()
        .all()
    )
    options_by_question: dict[int, list[SurveyOptionSnapshot]] = {}
    if questions:
        options = session.scalars(
            select(SurveyQuestionOption).where(
                SurveyQuestionOption.survey_question_id.in_([q.id for q, _ in questions]),
                SurveyQuestionOption.current_content_id.is_not(None),
            )
        )
        for option in options:
            options_by_question.setdefault(option.survey_question_id, []).append(
                SurveyOptionSnapshot(
                    id=option.id,
                    slug_id=option.slug_id,
                    display_order=option.display_order,
                    option_text="",
                )
            )
    return SurveyConfigSnapshot(
        id=config.id,
        current_revision=config.current_revision,
        is_optional=False,
        questions=[
            SurveyQuestionSnapshot(
                id=q.id,
                slug_id=q.slug_id,
                display_order=q.display_order,
                question_type=SurveyQuestionType(q.question_type.value),
                question_text="",
                is_required=True,
                is_public_aggregate_suppression_enabled=q.is_public_aggregate_suppression_enabled,
                current_semantic_version=q.current_semantic_version,
                constraints=constraints,
                options=options_by_question.get(q.id, []),
            )
            for q, constraints in questions
        ],
    )


def survey_eligible_accounts(
    *,
    session: Session,
    conversation_id: int,
    config: SurveyConfigSnapshot,
    account_ids: list[UUID],
) -> set[UUID]:
    # Match the API gate: a required survey with no required questions gates nobody,
    # including participants who have never created a survey response.
    if not config.questions:
        return set(account_ids)
    responses = session.scalars(
        select(SurveyResponse).where(
            SurveyResponse.conversation_id == conversation_id,
            SurveyResponse.participant_id.in_(account_ids),
        )
    ).all()
    if not responses:
        return set()
    answers = session.scalars(
        select(SurveyAnswer).where(
            SurveyAnswer.survey_response_id.in_([r.id for r in responses]),
            SurveyAnswer.deleted_at.is_(None),
        )
    ).all()
    options_by_answer: dict[int, list[str]] = {}
    if answers:
        for answer_id, slug_id in session.execute(
            select(SurveyAnswerOption.survey_answer_id, SurveyQuestionOption.slug_id)
            .join(
                SurveyQuestionOption,
                SurveyQuestionOption.id == SurveyAnswerOption.survey_question_option_id,
            )
            .where(
                SurveyAnswerOption.survey_answer_id.in_([a.id for a in answers]),
                SurveyAnswerOption.deleted_at.is_(None),
            )
        ).tuples():
            # Keep even retired selected options: the shared validator rejects
            # unknown choices instead of silently dropping them from an answer.
            options_by_answer.setdefault(answer_id, []).append(slug_id)
    answers_by_response: dict[int, dict[int, SurveyAnswerSnapshot]] = {}
    for answer in answers:
        answers_by_response.setdefault(answer.survey_response_id, {})[answer.survey_question_id] = (
            SurveyAnswerSnapshot(
                question_id=answer.survey_question_id,
                answered_question_semantic_version=answer.answered_question_semantic_version,
                option_slug_ids=options_by_answer.get(answer.id, []),
                text_value_html=answer.text_value_html,
                text_value_plain_text=answer.text_value_plain_text,
            )
        )
    return {
        response.participant_id
        for response in responses
        if is_survey_response_complete_valid(
            config=config,
            response=SurveyResponseSnapshot(
                participant_id=response.participant_id,
                withdrawn=response.withdrawn_at is not None,
                answers_by_question_id=answers_by_response.get(response.id, {}),
            ),
        )
    }


def count_live_participants(*, session: Session, conversation_id: int) -> int:
    candidates = eligible_response_query(conversation_id=conversation_id).where(
        _available_allocation_condition()
    )
    config = load_required_survey(session=session, conversation_id=conversation_id)
    if config is None or not config.questions:
        return session.scalars(select(func.count()).select_from(candidates.subquery())).one()
    total = 0
    # Bound the SQL IN lists and Python memory; never load sparse ballot values to count people.
    rows = session.execute(candidates.execution_options(yield_per=500))
    for batch in rows.tuples().partitions(500):
        account_ids = [user_id for _, _, user_id in batch]
        total += len(
            survey_eligible_accounts(
                session=session,
                conversation_id=conversation_id,
                config=config,
                account_ids=account_ids,
            )
        )
    return total
