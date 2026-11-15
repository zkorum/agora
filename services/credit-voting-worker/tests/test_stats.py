from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING
from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, insert, select, update
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from credit_voting_worker.generated_models import (
    Base,
    Conversation,
    ConversationContent,
    ConversationParticipant,
    ConversationType,
    CreditVotingConfig,
    DirectoryVisibility,
    Project,
    QvAllocation,
    QvLiveStats,
    QvResponse,
    QvResponseVersion,
    QvStatsRefresh,
    RankingItem,
    RankingItemContent,
    RealtimeEventOutbox,
    RealtimeEventOutboxTopic,
    SurveyAnswer,
    SurveyConfig,
    SurveyQuestion,
    SurveyQuestionContent,
    SurveyQuestionType,
    SurveyResponse,
    User,
)
from credit_voting_worker.stats import (
    StatsClaim,
    _defer_stats,
    initialize_missing_stats,
    refresh_next_stats,
)

if TYPE_CHECKING:
    from sqlalchemy import Engine


@dataclass(frozen=True)
class Fixture:
    conversation_id: int
    user_id: UUID
    participant_id: UUID
    response_id: UUID


def seed(engine: Engine) -> Fixture:
    with Session(engine) as session, session.begin():
        user = session.scalars(
            insert(User).values(id=uuid4(), username=f"qv-{uuid4().hex[:12]}").returning(User)
        ).one()
        project = session.scalars(
            insert(Project)
            .values(
                slug=uuid4().hex[:8], title="QV", directory_visibility=DirectoryVisibility.listed
            )
            .returning(Project)
        ).one()
        config = session.scalars(
            insert(CreditVotingConfig).values(item_count=1).returning(CreditVotingConfig)
        ).one()
        conversation = session.scalars(
            insert(Conversation)
            .values(
                slug_id=uuid4().hex[:8],
                project_id=project.id,
                conversation_type=ConversationType.prioritizing,
                prioritization_type="qv",
                credit_voting_config_id=config.id,
            )
            .returning(Conversation)
        ).one()
        content = session.scalars(
            insert(ConversationContent)
            .values(conversation_id=conversation.id, title="QV", body_plain_text="")
            .returning(ConversationContent)
        ).one()
        participant = session.scalars(
            insert(ConversationParticipant)
            .values(conversation_id=conversation.id, user_id=user.id)
            .returning(ConversationParticipant)
        ).one()
        item = session.scalars(
            insert(RankingItem)
            .values(conversation_id=conversation.id, slug_id=uuid4().hex[:8], is_seed=True)
            .returning(RankingItem)
        ).one()
        conversation.current_content_id = content.id
        item_content = session.scalars(
            insert(RankingItemContent)
            .values(ranking_item_id=item.id, conversation_content_id=content.id, title="A")
            .returning(RankingItemContent)
        ).one()
        response = session.scalars(
            insert(QvResponse)
            .values(conversation_id=conversation.id, participant_id=participant.id)
            .returning(QvResponse)
        ).one()
        item.current_content_id = item_content.id
        version = session.scalars(
            insert(QvResponseVersion)
            .values(
                response_id=response.id,
                conversation_id=conversation.id,
                statement_set_revision=0,
                allow_opposition=True,
                credits_spent=9,
            )
            .returning(QvResponseVersion)
        ).one()
        session.execute(
            insert(QvAllocation).values(
                version_id=version.id,
                conversation_id=conversation.id,
                item_id=item.id,
                content_id=item_content.id,
                votes=3,
            )
        )
        response.current_version_id = version.id
        session.execute(insert(QvStatsRefresh).values(conversation_id=conversation.id))
        return Fixture(conversation.id, user.id, participant.id, response.id)


def current_count(engine: Engine) -> tuple[int, int]:
    with Session(engine) as session:
        stats = session.scalars(select(QvLiveStats)).one()
        return stats.participant_count, stats.revision


def test_coalesces_signals_and_atomically_publishes_only_participant_count(engine: Engine) -> None:
    fixture = seed(engine)
    with Session(engine) as session, session.begin():
        session.execute(
            insert(QvStatsRefresh).values(
                [{"conversation_id": fixture.conversation_id} for _ in range(5)]
            )
        )
    assert initialize_missing_stats(engine=engine) == 1
    assert refresh_next_stats(engine=engine) == fixture.conversation_id
    assert current_count(engine) == (1, 1)
    assert refresh_next_stats(engine=engine) is None
    with Session(engine) as session:
        event = session.scalars(select(RealtimeEventOutbox)).one()
        assert event.event_type == "conversation_qv_stats_updated"
        slug_id = session.scalars(select(Conversation.slug_id)).one()
        assert event.payload == {
            "conversationSlugId": slug_id,
            "qvStatsRevision": 1,
            "participantCount": 1,
        }
        assert (
            session.scalar(
                select(func.count())
                .select_from(QvStatsRefresh)
                .where(QvStatsRefresh.processed_at.is_(None))
            )
            == 0
        )
        assert (
            session.scalar(select(RealtimeEventOutboxTopic.topic))
            == f"conversation:{event.payload['conversationSlugId']}"
        )


def test_refresh_coalescing_keeps_new_wakeups_pending_until_due(engine: Engine) -> None:
    fixture = seed(engine)
    initialize_missing_stats(engine=engine)
    refresh_next_stats(engine=engine)
    with Session(engine) as session, session.begin():
        session.execute(update(User).values(is_deleted=True))
        session.execute(insert(QvStatsRefresh).values(conversation_id=fixture.conversation_id))
    assert refresh_next_stats(engine=engine, min_refresh_seconds=60) is None
    assert current_count(engine) == (1, 1)
    with Session(engine) as session, session.begin():
        assert (
            session.scalar(
                select(func.count())
                .select_from(QvStatsRefresh)
                .where(QvStatsRefresh.processed_at.is_(None))
            )
            == 1
        )
        session.execute(update(QvLiveStats).values(refreshed_at=datetime(2000, 1, 1)))
    assert refresh_next_stats(engine=engine, min_refresh_seconds=60) == fixture.conversation_id
    assert current_count(engine) == (0, 2)


@pytest.mark.parametrize("change", ["withdraw", "hide", "delete_account", "detach", "retire"])
def test_source_eligibility_and_reconciliation_without_a_wakeup(
    *, engine: Engine, change: str
) -> None:
    fixture = seed(engine)
    initialize_missing_stats(engine=engine)
    refresh_next_stats(engine=engine)
    with Session(engine) as session, session.begin():
        response = session.scalars(select(QvResponse)).one()
        if change == "withdraw":
            response.current_version_id = None
        elif change == "hide":
            response.account_hidden_at = datetime.now()
        elif change == "delete_account":
            user = session.scalars(select(User)).one()
            user.is_deleted = True
        elif change == "detach":
            participant = session.scalars(select(ConversationParticipant)).one()
            participant.user_id = None
        else:
            response.current_version_id = None
            response.deleted_at = datetime.now()
        stats = session.scalars(select(QvLiveStats)).one()
        stats.refreshed_at = datetime(2000, 1, 1)
    assert refresh_next_stats(engine=engine) == fixture.conversation_id
    assert current_count(engine) == (0, 2)


def test_failed_publication_rolls_back_count_event_and_signal_ack(engine: Engine) -> None:
    seed(engine)
    initialize_missing_stats(engine=engine)

    def fail_after_event(table: type[Base]):
        if table is RealtimeEventOutboxTopic:
            raise RuntimeError("crash")
        return insert(table)

    with (
        patch("credit_voting_worker.stats.insert", side_effect=fail_after_event),
        pytest.raises(RuntimeError, match="crash"),
    ):
        refresh_next_stats(engine=engine)
    assert current_count(engine) == (0, 0)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(RealtimeEventOutbox)) == 0
        assert (
            session.scalar(
                select(func.count())
                .select_from(QvStatsRefresh)
                .where(QvStatsRefresh.processed_at.is_(None))
            )
            == 1
        )
    refresh_next_stats(engine=engine)
    assert current_count(engine) == (1, 1)


def test_parallel_workers_publish_each_pending_projection_once(engine: Engine) -> None:
    seed(engine)
    initialize_missing_stats(engine=engine)
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(refresh_next_stats, engine=engine) for _ in range(2)]
        results = [future.result() for future in futures]
    assert sum(result is not None for result in results) == 1
    assert current_count(engine) == (1, 1)


def test_failed_conversation_cools_down_while_healthy_work_advances(engine: Engine) -> None:
    failing = seed(engine)
    healthy = seed(engine)
    initialize_missing_stats(engine=engine)
    with patch(
        "credit_voting_worker.stats.count_live_participants",
        side_effect=OperationalError("timeout", None, Exception("timeout")),
    ) as count:
        assert refresh_next_stats(engine=engine) == failing.conversation_id
        count.assert_called_once()
    assert refresh_next_stats(engine=engine) == healthy.conversation_id
    assert refresh_next_stats(engine=engine) is None
    with Session(engine) as session, session.begin():
        failed_stats = session.get(QvLiveStats, failing.conversation_id)
        assert failed_stats is not None
        assert failed_stats.revision == 0
        assert failed_stats.refreshed_at is None
        assert failed_stats.retry_after is not None
        assert (
            session.scalar(
                select(func.count())
                .select_from(QvStatsRefresh)
                .where(
                    QvStatsRefresh.conversation_id == failing.conversation_id,
                    QvStatsRefresh.processed_at.is_(None),
                )
            )
            == 1
        )
        failed_stats.retry_after = datetime(2000, 1, 1)
    assert refresh_next_stats(engine=engine) == failing.conversation_id
    with Session(engine) as session:
        recovered = session.get(QvLiveStats, failing.conversation_id)
        assert recovered is not None
        assert recovered.retry_after is None
        assert recovered.participant_count == 1
        assert recovered.revision == 1


def test_unchanged_counts_acknowledge_signals_without_publishing(engine: Engine) -> None:
    fixture = seed(engine)
    initialize_missing_stats(engine=engine)
    refresh_next_stats(engine=engine)
    with Session(engine) as session, session.begin():
        session.execute(insert(QvStatsRefresh).values(conversation_id=fixture.conversation_id))
    assert refresh_next_stats(engine=engine) == fixture.conversation_id
    assert current_count(engine) == (1, 1)
    with Session(engine) as session, session.begin():
        assert session.scalar(select(func.count()).select_from(RealtimeEventOutbox)) == 1
        assert (
            session.scalar(
                select(func.count())
                .select_from(QvStatsRefresh)
                .where(QvStatsRefresh.processed_at.is_(None))
            )
            == 0
        )
        session.execute(update(QvLiveStats).values(refreshed_at=datetime(2000, 1, 1)))
    # Periodic reconciliation also remains silent when the count is unchanged.
    assert refresh_next_stats(engine=engine) == fixture.conversation_id
    assert current_count(engine) == (1, 1)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(RealtimeEventOutbox)) == 1


def test_delayed_failure_does_not_cool_down_a_newer_success(engine: Engine) -> None:
    fixture = seed(engine)
    initialize_missing_stats(engine=engine)
    with Session(engine) as session:
        slug = session.scalars(select(Conversation.slug_id)).one()
    stale_claim = StatsClaim(fixture.conversation_id, slug, 0, 0, None)
    refresh_next_stats(engine=engine)
    _defer_stats(
        engine=engine,
        claim=stale_claim,
        error=OperationalError("timeout", None, Exception("timeout")),
    )
    with Session(engine) as session:
        stats = session.scalars(select(QvLiveStats)).one()
        assert stats.retry_after is None
        assert stats.participant_count == 1
        assert stats.revision == 1


def test_count_refresh_never_changes_lifecycle(engine: Engine) -> None:
    seed(engine)
    with Session(engine) as session, session.begin():
        conversation = session.scalars(select(Conversation)).one()
        conversation.is_closed = True
        conversation.closing_target_revision = 3
    initialize_missing_stats(engine=engine)
    refresh_next_stats(engine=engine)
    with Session(engine) as session:
        conversation = session.scalars(select(Conversation)).one()
        assert conversation.is_closed
        assert conversation.closing_target_revision == 3
        assert conversation.closed_finalized_at is None
    assert current_count(engine) == (1, 1)


def test_signal_committed_after_snapshot_stays_pending(engine: Engine) -> None:
    fixture = seed(engine)
    initialize_missing_stats(engine=engine)
    # Allocate a signal ID and change the ballot before worker capture, but do
    # not commit either yet. Neither may be ACKed/read through the old snapshot.
    with Session(engine) as writer, writer.begin():
        response = writer.scalars(select(QvResponse)).one()
        response.current_version_id = None
        writer.execute(insert(QvStatsRefresh).values(conversation_id=fixture.conversation_id))
        assert refresh_next_stats(engine=engine) == fixture.conversation_id
        assert current_count(engine) == (1, 1)
    with Session(engine) as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(QvStatsRefresh)
                .where(
                    QvStatsRefresh.processed_at.is_(None),
                )
            )
            == 1
        )
    assert refresh_next_stats(engine=engine) == fixture.conversation_id
    assert current_count(engine) == (0, 2)


def test_required_survey_is_revalidated_and_optional_survey_does_not_gate(engine: Engine) -> None:
    fixture = seed(engine)
    with Session(engine) as session, session.begin():
        config = session.scalars(
            insert(SurveyConfig)
            .values(conversation_id=fixture.conversation_id)
            .returning(SurveyConfig)
        ).one()
        question = session.scalars(
            insert(SurveyQuestion)
            .values(
                conversation_id=fixture.conversation_id,
                survey_config_id=config.id,
                slug_id=uuid4().hex[:8],
                question_type=SurveyQuestionType.free_text,
                display_order=0,
            )
            .returning(SurveyQuestion)
        ).one()
        content = session.scalars(
            insert(SurveyQuestionContent)
            .values(
                survey_question_id=question.id,
                question_text="Age?",
                constraints={
                    "type": "free_text",
                    "inputMode": "integer",
                    "minValue": 18,
                    "maxValue": 120,
                },
            )
            .returning(SurveyQuestionContent)
        ).one()
        question.current_content_id = content.id
    initialize_missing_stats(engine=engine)
    refresh_next_stats(engine=engine)
    assert current_count(engine) == (0, 1)
    with Session(engine) as session, session.begin():
        response = session.scalars(
            insert(SurveyResponse)
            .values(conversation_id=fixture.conversation_id, participant_id=fixture.user_id)
            .returning(SurveyResponse)
        ).one()
        question = session.scalars(select(SurveyQuestion)).one()
        session.execute(
            insert(SurveyAnswer).values(
                survey_response_id=response.id,
                conversation_id=fixture.conversation_id,
                survey_question_id=question.id,
                answered_question_semantic_version=1,
                text_value_html="30",
                text_value_plain_text="30",
            )
        )
        session.execute(insert(QvStatsRefresh).values(conversation_id=fixture.conversation_id))
    refresh_next_stats(engine=engine)
    assert current_count(engine) == (1, 2)
    with Session(engine) as session, session.begin():
        question = session.scalars(select(SurveyQuestion)).one()
        question.current_semantic_version += 1
        session.execute(insert(QvStatsRefresh).values(conversation_id=fixture.conversation_id))
    refresh_next_stats(engine=engine)
    assert current_count(engine) == (0, 3)
    with Session(engine) as session, session.begin():
        config = session.scalars(select(SurveyConfig)).one()
        config.is_optional = True
        session.execute(insert(QvStatsRefresh).values(conversation_id=fixture.conversation_id))
    refresh_next_stats(engine=engine)
    assert current_count(engine) == (1, 4)
