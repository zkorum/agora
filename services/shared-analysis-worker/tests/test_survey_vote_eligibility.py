from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import UUID

import pytest
from sqlalchemy import MetaData, create_engine, func, select, update
from sqlalchemy.orm import Session

from agora_analysis_worker_shared.db import fetch_vote_input_rows_batch
from agora_analysis_worker_shared.generated_models import (
    Base,
    Conversation,
    ConversationLanguageSettingsSource,
    ConversationType,
    Opinion,
    ParticipationMode,
    PolisConversationConfig,
    PolisVotingPresentation,
    SurveyAnswer,
    SurveyAnswerOption,
    SurveyChoiceDisplay,
    SurveyConfig,
    SurveyQuestion,
    SurveyQuestionContent,
    SurveyQuestionOption,
    SurveyQuestionOptionContent,
    SurveyQuestionType,
    SurveyResponse,
    User,
    Vote,
    VoteContent,
    VoteEnumAll,
)
from agora_analysis_worker_shared.input_snapshot import prepare_input_snapshot

if TYPE_CHECKING:
    from collections.abc import Iterator

    from sqlalchemy import Engine

NOW = datetime(2026, 10, 18, tzinfo=UTC)


@pytest.fixture
def engine() -> Iterator[Engine]:
    engine = create_engine("sqlite:///:memory:")
    metadata = MetaData()
    for table in Base.metadata.tables.values():
        table.to_metadata(metadata)
    metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all(
            [
                PolisConversationConfig(
                    id=1,
                    voting_presentation=PolisVotingPresentation.list,
                    analysis_data_generation=1,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                Conversation(
                    id=1,
                    slug_id="survey01",
                    project_id=1,
                    current_content_id=1,
                    polis_config_id=1,
                    language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                    participation_mode=ParticipationMode.account_required,
                    conversation_type=ConversationType.polis,
                    created_at=NOW,
                    updated_at=NOW,
                    last_reacted_at=NOW,
                ),
                SurveyConfig(
                    id=1, conversation_id=1, is_optional=False, created_at=NOW, updated_at=NOW
                ),
                SurveyQuestion(
                    id=1,
                    slug_id="question",
                    survey_config_id=1,
                    conversation_id=1,
                    question_type=SurveyQuestionType.choice,
                    choice_display=SurveyChoiceDisplay.auto,
                    current_content_id=1,
                    current_semantic_version=2,
                    display_order=0,
                    is_required=True,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                SurveyQuestionContent(
                    id=1,
                    public_id=UUID(int=100),
                    survey_question_id=1,
                    question_text="Pick one",
                    constraints={"type": "choice", "minSelections": 1, "maxSelections": 1},
                    created_at=NOW,
                ),
                SurveyQuestionOption(
                    id=1,
                    slug_id="option-a",
                    survey_question_id=1,
                    current_content_id=1,
                    display_order=0,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                SurveyQuestionOptionContent(
                    id=1,
                    public_id=UUID(int=101),
                    survey_question_option_id=1,
                    option_text="A",
                    created_at=NOW,
                ),
                Opinion(
                    id=1,
                    slug_id="opinion1",
                    author_id=UUID(int=1),
                    conversation_id=1,
                    current_content_id=1,
                    created_at=NOW,
                    updated_at=NOW,
                    last_reacted_at=NOW,
                ),
            ]
        )
        # Only participant 1 has a current, valid response. Others have a withdrawn,
        # incomplete, stale, soft-deleted, or absent response respectively.
        for participant in range(1, 7):
            session.add_all(
                [
                    User(
                        id=UUID(int=participant),
                        polis_participant_id=participant,
                        username=f"user-{participant}",
                        is_deleted=False,
                        created_at=NOW,
                        updated_at=NOW,
                    ),
                    Vote(
                        id=participant,
                        author_id=UUID(int=participant),
                        opinion_id=1,
                        current_content_id=participant,
                        created_at=NOW,
                        updated_at=NOW,
                    ),
                    VoteContent(
                        id=participant,
                        vote_id=participant,
                        opinion_content_id=1,
                        vote=VoteEnumAll.agree,
                        created_at=NOW,
                    ),
                ]
            )
            if participant == 6:
                continue
            session.add(
                SurveyResponse(
                    id=participant,
                    participant_id=UUID(int=participant),
                    conversation_id=1,
                    withdrawn_at=NOW if participant == 2 else None,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
            if participant == 3:
                continue
            session.add_all(
                [
                    SurveyAnswer(
                        id=participant,
                        survey_response_id=participant,
                        conversation_id=1,
                        survey_question_id=1,
                        answered_question_semantic_version=1 if participant == 4 else 2,
                        deleted_at=NOW if participant == 5 else None,
                        created_at=NOW,
                        updated_at=NOW,
                    ),
                    SurveyAnswerOption(
                        id=participant,
                        survey_answer_id=participant,
                        survey_question_id=1,
                        survey_question_option_id=1,
                    ),
                ]
            )
        session.commit()
    yield engine
    engine.dispose()


def test_required_survey_filters_votes_before_building_analysis_input(engine: Engine) -> None:
    rows = fetch_vote_input_rows_batch(engine, conversation_ids=[1])
    assert [row.user_id for row in rows[1]] == [UUID(int=1)]
    snapshot = prepare_input_snapshot(conversation_id=1, data_generation=1, rows=rows[1])
    assert len(snapshot.participants) == 1
    assert len(snapshot.votes) == 1
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Vote)) == 6


@pytest.mark.parametrize("seed", [False, True])
def test_account_deletion_removes_personal_columns_not_retained_voter_rows(
    engine: Engine, seed: bool
) -> None:
    with Session(engine) as session:
        session.execute(update(SurveyConfig).values(deleted_at=NOW))
        session.execute(update(Vote).where(Vote.id > 3).values(current_content_id=None))
        session.execute(update(Opinion).where(Opinion.id == 1).values(is_seed=seed))
        for opinion_id in (2, 3):
            session.add(
                Opinion(
                    id=opinion_id,
                    slug_id=f"opinion{opinion_id}",
                    author_id=UUID(int=opinion_id),
                    conversation_id=1,
                    current_content_id=opinion_id,
                    created_at=NOW,
                    updated_at=NOW,
                    last_reacted_at=NOW,
                )
            )
            for voter in (1, 2, 3):
                vote_id = opinion_id * 10 + voter
                session.add(
                    Vote(
                        id=vote_id,
                        author_id=UUID(int=voter),
                        opinion_id=opinion_id,
                        current_content_id=vote_id,
                        created_at=NOW,
                        updated_at=NOW,
                    )
                )
                session.add(
                    VoteContent(
                        id=vote_id,
                        vote_id=vote_id,
                        opinion_content_id=opinion_id,
                        vote=VoteEnumAll.disagree if voter == 1 else VoteEnumAll.agree,
                        created_at=NOW,
                    )
                )
        session.commit()
    before = fetch_vote_input_rows_batch(engine, conversation_ids=[1])[1]
    assert len(before) == 9
    with Session(engine) as session:
        session.execute(update(User).where(User.id == UUID(int=1)).values(is_deleted=True))
        session.commit()
    after = fetch_vote_input_rows_batch(engine, conversation_ids=[1])[1]
    expected_opinions = (1, 2, 3) if seed else (2, 3)
    assert {(row.user_id, row.opinion_id) for row in after} == {
        (UUID(int=voter), opinion_id) for voter in (1, 2, 3) for opinion_id in expected_opinions
    }
    assert {
        (row.opinion_id, row.vote)
        for row in after
        if row.user_id == UUID(int=1) and row.opinion_id != 1
    } == {(2, "disagree"), (3, "disagree")}


def test_withdrawal_removes_last_eligible_voter_without_deleting_votes(engine: Engine) -> None:
    assert len(fetch_vote_input_rows_batch(engine, conversation_ids=[1])[1]) == 1
    with Session(engine) as session:
        session.execute(
            update(SurveyResponse).where(SurveyResponse.id == 1).values(withdrawn_at=NOW)
        )
        session.execute(update(SurveyAnswer).where(SurveyAnswer.id == 1).values(deleted_at=NOW))
        session.commit()
    rows = fetch_vote_input_rows_batch(engine, conversation_ids=[1])
    assert rows[1] == []
    snapshot = prepare_input_snapshot(conversation_id=1, data_generation=2, rows=rows[1])
    assert snapshot.participants == []
    assert snapshot.votes == []
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Vote)) == 6


@pytest.mark.parametrize("plain_text", ["- A", None])
def test_rich_text_eligibility_uses_canonical_plain_text(
    engine: Engine, plain_text: str | None
) -> None:
    constraints = {
        "type": "free_text",
        "inputMode": "rich_text",
        "maxPlainTextLength": 1,
        "maxHtmlLength": 1000,
    }
    with Session(engine) as session:
        session.execute(update(SurveyQuestion).values(question_type=SurveyQuestionType.free_text))
        session.execute(update(SurveyQuestionContent).values(constraints=constraints))
        session.execute(
            update(SurveyAnswer)
            .where(SurveyAnswer.id == 1)
            .values(text_value_html="<ul><li><p>A</p></li></ul>", text_value_plain_text=plain_text)
        )
        session.commit()
    assert fetch_vote_input_rows_batch(engine, conversation_ids=[1])[1] == []
    with Session(engine) as session:
        session.execute(
            update(SurveyQuestionContent).values(
                constraints={**constraints, "maxPlainTextLength": 3}
            )
        )
        session.commit()
    expected = [UUID(int=1)] if plain_text is not None else []
    assert [
        row.user_id for row in fetch_vote_input_rows_batch(engine, conversation_ids=[1])[1]
    ] == (expected)


@pytest.mark.parametrize("removed_record", ["selected_option", "answer_option"])
def test_removed_options_cannot_keep_a_required_survey_eligible(
    engine: Engine, removed_record: str
) -> None:
    with Session(engine) as session:
        if removed_record == "selected_option":
            session.execute(
                update(SurveyQuestionOption)
                .where(SurveyQuestionOption.id == 1)
                .values(current_content_id=None)
            )
        else:
            session.execute(
                update(SurveyAnswerOption).where(SurveyAnswerOption.id == 1).values(deleted_at=NOW)
            )
        session.commit()
    assert fetch_vote_input_rows_batch(engine, conversation_ids=[1])[1] == []


@pytest.mark.parametrize("mode", ["optional", "no_required_questions", "no_survey"])
def test_nonblocking_surveys_keep_all_voters_eligible(engine: Engine, mode: str) -> None:
    with Session(engine) as session:
        if mode == "optional":
            session.execute(update(SurveyConfig).values(is_optional=True))
        elif mode == "no_required_questions":
            session.execute(update(SurveyQuestion).values(is_required=False))
        else:
            session.execute(update(SurveyConfig).values(deleted_at=NOW))
        session.commit()
    rows = fetch_vote_input_rows_batch(engine, conversation_ids=[1])
    assert {row.user_id for row in rows[1]} == {UUID(int=value) for value in range(1, 7)}
