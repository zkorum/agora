from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from time import monotonic, sleep

from sqlalchemy import create_engine, insert, select, text, update
from testcontainers.postgres import PostgresContainer

from scoring_worker.db import (
    ComparisonsBatchResult,
    ScoringInputs,
    persist_scoring_batch,
)
from scoring_worker.generated_models import (
    Base,
    Conversation,
    ConversationLanguageSettingsSource,
    ConversationType,
    ParticipationMode,
    RankingConversationConfig,
    RankingMode,
)


def test_publication_does_not_deadlock_a_closing_revision_update() -> None:
    # This lock-order test intentionally needs only the two generated tables.
    # The full migration/trigger contract remains covered by test_publication.py.
    container = PostgresContainer("postgres:16-alpine", driver="psycopg")
    container.start()
    try:
        engine = create_engine(
            container.get_connection_url(),
            connect_args={"application_name": "ranking-publication-lock-test"},
        )
        try:
            Base.metadata.create_all(
                engine,
                tables=[
                    Base.metadata.tables["ranking_conversation_config"],
                    Base.metadata.tables["conversation"],
                ],
            )
            now = datetime.now(UTC)
            with engine.begin() as connection:
                connection.execute(
                    insert(RankingConversationConfig).values(
                        id=1,
                        ranking_mode=RankingMode.bws,
                        created_at=now,
                        updated_at=now,
                    )
                )
                connection.execute(
                    insert(Conversation).values(
                        id=1,
                        slug_id="locktest",
                        project_id=1,
                        conversation_type=ConversationType.ranking,
                        ranking_config_id=1,
                        language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                        participation_mode=ParticipationMode.account_required,
                        current_content_id=1,
                        created_at=now,
                        updated_at=now,
                        last_reacted_at=now,
                    )
                )
            inputs = ScoringInputs(
                revisions={1: 0},
                ranking_items={},
                comparisons=ComparisonsBatchResult(
                    comparisons={},
                    user_idx_to_result_id={},
                    total_vote_count_by_conversation={},
                    total_participant_count_by_conversation={},
                ),
            )

            def publish():
                with engine.connect() as connection:
                    return persist_scoring_batch(
                        connection,
                        inputs=inputs,
                        scoring_results={},
                        user_scores=[],
                        conversation_ids_to_clear=[1],
                    )

            with ThreadPoolExecutor(max_workers=1) as executor:
                with engine.begin() as writer:
                    writer.execute(
                        select(Conversation.id).where(Conversation.id == 1).with_for_update()
                    )
                    future = executor.submit(publish)
                    deadline = monotonic() + 5
                    with engine.connect() as observer:
                        while monotonic() < deadline:
                            # PostgreSQL catalog state synchronizes the real lock wait.
                            blocked = observer.scalar(
                                text(
                                    "SELECT count(*) FROM pg_stat_activity "
                                    "WHERE application_name='ranking-publication-lock-test' "
                                    "AND wait_event_type='Lock'"
                                )
                            )
                            if blocked:
                                break
                            sleep(0.01)
                        else:
                            raise AssertionError("Publication did not reach the lifecycle lock")
                    writer.execute(
                        update(Conversation)
                        .where(Conversation.id == 1)
                        .values(
                            is_closed=True,
                            closing_target_revision=1,
                        )
                    )
                    writer.execute(
                        update(RankingConversationConfig)
                        .where(RankingConversationConfig.id == 1)
                        .values(
                            scoring_input_revision=1,
                            scoring_invalidation_revision=1,
                        )
                    )
                publications = future.result(timeout=5)
            assert publications[1].status == "invalidated"
            assert publications[1].needs_requeue
        finally:
            engine.dispose()
    finally:
        container.stop()
