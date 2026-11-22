from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import create_engine, update
from sqlalchemy.orm import Session

from content_translation_worker.db import fetch_ranking_item_source
from content_translation_worker.generated_models import (
    Base,
    Conversation,
    ConversationLanguageSettingsSource,
    ConversationType,
    ParticipationMode,
    QvCalculation,
    QvCalculationState,
    QvInputItem,
    QvInputSnapshot,
    RankingConversationStatsCheckpoint,
    RankingConversationStatsItem,
    RankingConversationStatsSnapshot,
    RankingItem,
    RankingItemContent,
    RankingItemLifecycleStatus,
    User,
)


def test_accepted_qv_revision_is_eligible_but_unpublished_redacted_and_hidden_sources_are_not() -> (
    None
):
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            Base.metadata.tables[model.__tablename__]
            for model in (
                User,
                Conversation,
                RankingItem,
                RankingItemContent,
                RankingConversationStatsSnapshot,
                RankingConversationStatsItem,
                RankingConversationStatsCheckpoint,
                QvCalculation,
                QvCalculationState,
                QvInputSnapshot,
                QvInputItem,
            )
        ],
    )
    now = datetime.now(UTC)
    version = uuid.uuid4()
    calculation_id = uuid.uuid4()
    snapshot_id = uuid.uuid4()
    with Session(engine) as session:
        session.add(
            Conversation(
                id=1,
                slug_id="qvtest01",
                project_id=1,
                current_content_id=1,
                is_importing=False,
                is_closed=True,
                closed_finalized_at=now,
                dynamic_translation_enabled=True,
                language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                participation_mode=ParticipationMode.guest,
                conversation_type=ConversationType.prioritizing,
                created_at=now,
                updated_at=now,
                last_reacted_at=now,
            )
        )
        session.add(
            RankingItem(
                id=1,
                slug_id="item0001",
                conversation_id=1,
                current_content_id=2,
                is_seed=True,
                lifecycle_status=RankingItemLifecycleStatus.active,
                created_at=now,
                updated_at=now,
            )
        )
        session.add_all(
            [
                RankingItemContent(
                    id=1,
                    public_id=version,
                    ranking_item_id=1,
                    conversation_content_id=1,
                    title="Frozen original",
                    body="Frozen body",
                    created_at=now,
                ),
                RankingItemContent(
                    id=2,
                    ranking_item_id=1,
                    conversation_content_id=1,
                    title="Newer edit",
                    created_at=now,
                ),
            ]
        )
        session.flush()
        assert fetch_ranking_item_source(session, ranking_item_content_id=1) is None
        assert fetch_ranking_item_source(session, ranking_item_content_id=2) is not None
        session.add(
            QvCalculation(
                id=calculation_id,
                conversation_id=1,
                generation=1,
                status="ready",
                input_snapshot_id=snapshot_id,
                next_attempt_at=now,
                created_at=now,
                ready_at=now,
            )
        )
        session.add(
            QvCalculationState(
                conversation_id=1,
                generation=1,
                current_calculation_id=calculation_id,
            )
        )
        session.add(
            QvInputSnapshot(
                id=snapshot_id,
                calculation_id=calculation_id,
                credit_budget=100,
                credit_pricing="quadratic",
                allow_opposition=True,
                statement_set_revision=1,
                rule_version=1,
                algorithm_version=1,
                participant_count=2,
                captured_at=now,
            )
        )
        session.add(
            QvInputItem(
                snapshot_id=snapshot_id,
                item_slug_id="item0001",
                source_version=version,
                position=0,
                title="Frozen original",
                body="Frozen body",
            )
        )
        session.flush()
        source = fetch_ranking_item_source(session, ranking_item_content_id=1)
        assert source is not None
        assert source.public_id == version
        assert source.title == "Frozen original"
        session.execute(update(QvInputItem).values(title="", body=None))
        assert fetch_ranking_item_source(session, ranking_item_content_id=1) is None
        session.execute(update(RankingItem).values(account_hidden_at=now))
        assert fetch_ranking_item_source(session, ranking_item_content_id=2) is None
    engine.dispose()
