from __future__ import annotations

import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from json import dumps
from pathlib import Path
from typing import TYPE_CHECKING
from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from psycopg.errors import CheckViolation
from sqlalchemy import String, create_engine, func, insert, literal_column, select, update
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session
from testcontainers.postgres import PostgresContainer

from scoring_worker import db as scoring_db
from scoring_worker.db import (
    ComparisonRow,
    PublicationCallback,
    ScoredEntity,
    ScoringInputs,
    ScoringPublication,
    UserScoreEntry,
    persist_scoring_batch,
    prepare_scoring_inputs,
)
from scoring_worker.display_scores import squash_display_scores
from scoring_worker.generated_models import (
    ComparisonAnswer,
    ComparisonResponse,
    ComparisonUserEntityScore,
    Conversation,
    ConversationContent,
    ConversationType,
    DirectoryVisibility,
    Project,
    RankingConversationConfig,
    RankingConversationStatsCheckpoint,
    RankingConversationStatsItem,
    RankingConversationStatsSnapshot,
    RankingInputAnswer,
    RankingInputItem,
    RankingInputParticipant,
    RankingInputSnapshot,
    RankingItem,
    RankingItemContent,
    RankingItemLifecycleStatus,
    RankingMode,
    RankingScore,
    RankingScoreEntity,
    RankingStatsCheckpointReasonEnum,
    RealtimeEventOutbox,
    SurveyConfig,
    User,
)
from scoring_worker.pipeline_config import (
    SCORING_ALGORITHM_VERSION,
    SOLIDAGO_VERSION,
    ComparisonRecipe,
)
from scoring_worker.scoring import score_comparison_observations
from scoring_worker.worker import build_participant_counts
from scripts.backfill_display_scores import backfill_display_scores

if TYPE_CHECKING:
    from collections.abc import Generator, Sequence

    from sqlalchemy import Connection, Engine


def migration_version(path: Path) -> tuple[int, ...]:
    return tuple(int(part) for part in path.name.split("__")[0][1:].split("."))


def test_vote_buffer_migration_preserves_persisted_votes_and_closed_state() -> None:
    migrations = Path(__file__).resolve().parents[2] / "api" / "database" / "flyway"
    upgrade = migrations / "V0112__parallel_puppet_master.sql"
    container = PostgresContainer("postgres:16-alpine", driver="psycopg")
    container.start()
    try:
        engine = create_engine(container.get_connection_url(), hide_parameters=True)
        try:
            for path in sorted(migrations.glob("V*.sql"), key=migration_version):
                if migration_version(path) >= migration_version(upgrade):
                    break
                with engine.begin() as connection:
                    connection.exec_driver_sql(
                        path.read_text(), execution_options={"no_parameters": True}
                    )

            # The current ORM includes columns absent before this migration.
            # Seed through the real legacy schema, including its participant trigger.
            with engine.begin() as connection:
                connection.exec_driver_sql("""
                    INSERT INTO "user" (id, username)
                    VALUES ('00000000-0000-4000-8000-000000000001', 'migration-voter');
                    WITH project AS (
                        INSERT INTO project (slug, title, directory_visibility)
                        VALUES ('migration', 'Migration', 'unlisted')
                        RETURNING id
                    ), configs AS (
                        INSERT INTO polis_conversation_config (analysis_data_generation)
                        SELECT 3 FROM generate_series(1, 2) RETURNING id
                    )
                    INSERT INTO conversation (slug_id, project_id, polis_config_id)
                    SELECT 'mig' || lpad(configs.id::text, 5, '0'), project.id, configs.id
                    FROM project CROSS JOIN configs;
                    INSERT INTO conversation_content (conversation_id, title)
                    SELECT id, 'Migration' FROM conversation;
                    UPDATE conversation c SET current_content_id = content.id
                    FROM conversation_content content WHERE content.conversation_id = c.id;
                    INSERT INTO opinion (slug_id, author_id, conversation_id, num_agrees)
                    SELECT 'migrate1', '00000000-0000-4000-8000-000000000001', min(id), 1
                    FROM conversation;
                    INSERT INTO opinion_content (opinion_id, conversation_content_id, content)
                    SELECT o.id, c.current_content_id, 'Persisted statement'
                    FROM opinion o JOIN conversation c ON c.id = o.conversation_id;
                    UPDATE opinion o SET current_content_id = content.id
                    FROM opinion_content content WHERE content.opinion_id = o.id;
                    INSERT INTO vote (author_id, opinion_id)
                    SELECT author_id, id FROM opinion;
                    INSERT INTO vote_content (vote_id, opinion_content_id, vote)
                    SELECT v.id, o.current_content_id, 'agree'
                    FROM vote v JOIN opinion o ON o.id = v.opinion_id;
                    UPDATE vote v SET current_content_id = content.id
                    FROM vote_content content WHERE content.vote_id = v.id;
                    INSERT INTO vote_submission (
                        conversation_id, user_id, opinion_id, opinion_content_id,
                        action, submitted_at, pending
                    )
                    SELECT conversation_id, author_id, id, current_content_id,
                        'disagree', now(), true FROM opinion;
                    UPDATE conversation SET is_closed = true, closing_target_revision = 3,
                        closed_finalized_at = '2026-10-26 12:00:00'
                    WHERE id = (SELECT conversation_id FROM opinion);
                """)
                snapshot_query = """
                    SELECT to_jsonb(v) - 'buffer_epoch' - 'buffer_sequence',
                        to_jsonb(content), to_jsonb(o), to_jsonb(participant),
                        to_jsonb(c) - 'vote_buffer_epoch' - 'vote_buffer_drained'
                    FROM vote v
                    JOIN vote_content content ON content.id = v.current_content_id
                    JOIN opinion o ON o.id = v.opinion_id
                    JOIN conversation_participant participant ON participant.id = v.participant_id
                    JOIN conversation c ON c.id = o.conversation_id
                """
                before = connection.exec_driver_sql(snapshot_query).one()

            # Flyway runs this PostgreSQL migration transactionally as well.
            with engine.begin() as connection:
                connection.exec_driver_sql(upgrade.read_text())

            with engine.connect() as connection:
                assert connection.exec_driver_sql(snapshot_query).one() == before
                assert (
                    connection.exec_driver_sql(
                        "SELECT to_regclass('public.vote_submission')"
                    ).scalar_one()
                    is None
                )
                assert (
                    connection.exec_driver_sql("""
                    SELECT count(*) = 2 AND count(DISTINCT vote_buffer_epoch) = 2
                        AND bool_and(vote_buffer_drained)
                    FROM conversation
                """).scalar_one()
                    is True
                )
                assert (
                    connection.exec_driver_sql(
                        "SELECT buffer_epoch IS NULL AND buffer_sequence = 0 FROM vote"
                    ).scalar_one()
                    is True
                )
                assert (
                    connection.exec_driver_sql("""
                    SELECT i.indisvalid FROM pg_index i
                    JOIN pg_class c ON c.oid = i.indexrelid
                    WHERE c.relname = 'conversation_vote_buffer_drain_idx'
                """).scalar_one()
                    is True
                )
        finally:
            engine.dispose()
    finally:
        container.stop()


@pytest.fixture(scope="module")
def ranking_db() -> Generator[Engine]:
    # Canonical DDL includes source changes whose production migration is deferred.
    # Keep the migration-upgrade regression above on the real historical schema.
    api = Path(__file__).resolve().parents[2] / "api"
    migrations = api / "database" / "flyway"
    container = PostgresContainer("postgres:16-alpine", driver="psycopg")
    container.start()
    try:
        engine = create_engine(container.get_connection_url(), hide_parameters=True)
        try:
            subprocess.run(
                [
                    "node",
                    "--import",
                    "tsx",
                    "tests/pushCurrentSchema.ts",
                    container.get_connection_url().replace(
                        "postgresql+psycopg://", "postgresql://"
                    ),
                ],
                cwd=api,
                check=True,
                capture_output=True,
                text=True,
            )
            # Reuse production function/trigger definitions, adapting only renamed
            # schema identifiers. Do not run historical DDL/backfills on new DDL.
            for name in [
                "V0082.1__track_ranking_scoring_inputs.sql",
                "V0089.1__separate_ranking_scoring_invalidations.sql",
                "V0105__exclude_survey_annotations_from_scoring.sql",
                "V0111.1__backfill_conversation_participants.sql",
            ]:
                source = (migrations / name).read_text()
                statements = re.findall(
                    r"^CREATE (?:OR REPLACE )?FUNCTION\b.*?^\$\$;|^(?:CREATE|DROP) TRIGGER\b.*?;",
                    source,
                    re.MULTILINE | re.DOTALL,
                )
                with engine.begin() as connection:
                    for statement in statements:
                        connection.exec_driver_sql(
                            statement.replace("maxdiff_result", "comparison_response")
                            .replace("maxdiff_comparison", "comparison_answer")
                            .replace(
                                "conversation_type = 'ranking'",
                                "prioritization_type = 'comparisons'",
                            ),
                            execution_options={"no_parameters": True},
                        )
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    (api / "scripts/prepare-ranking-account-source-contract.sql").read_text(),
                    execution_options={"no_parameters": True},
                )
                connection.exec_driver_sql(
                    (api / "scripts/prepare-comparison-retention-contract.sql").read_text(),
                    execution_options={"no_parameters": True},
                )
            yield engine
        finally:
            engine.dispose()
    finally:
        container.stop()


@dataclass(frozen=True)
class RankingFixture:
    conversation_id: int
    config_id: int
    result_id: int
    user_id: UUID
    item_ids: list[int]
    slugs: list[str]


def seed_ranking(engine: Engine) -> RankingFixture:
    slug = uuid4().hex[:8]
    user_id = uuid4()
    with engine.begin() as connection:
        connection.execute(insert(User).values(id=user_id, username=f"test-{slug}"))
        project_id = connection.execute(
            insert(Project)
            .values(
                slug=f"test-{slug}",
                title="Ranking test",
                directory_visibility=DirectoryVisibility.unlisted,
            )
            .returning(Project.id)
        ).scalar_one()
        config_id = connection.execute(
            insert(RankingConversationConfig)
            .values(ranking_mode=RankingMode.bws)
            .returning(RankingConversationConfig.id)
        ).scalar_one()
        conversation_id = connection.execute(
            insert(Conversation)
            .values(
                slug_id=slug,
                project_id=project_id,
                ranking_config_id=config_id,
                conversation_type=ConversationType.prioritizing,
                prioritization_type="comparisons",
            )
            .returning(Conversation.id)
        ).scalar_one()
        content_id = connection.execute(
            insert(ConversationContent)
            .values(conversation_id=conversation_id, title="Ranking test")
            .returning(ConversationContent.id)
        ).scalar_one()
        connection.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(current_content_id=content_id)
        )
        item_ids: list[int] = []
        slugs: list[str] = []
        for _ in range(3):
            item_slug = uuid4().hex[:8]
            item_id = connection.execute(
                insert(RankingItem)
                .values(slug_id=item_slug, author_id=user_id, conversation_id=conversation_id)
                .returning(RankingItem.id)
            ).scalar_one()
            item_content_id = connection.execute(
                insert(RankingItemContent)
                .values(
                    ranking_item_id=item_id,
                    conversation_content_id=content_id,
                    title="Item",
                )
                .returning(RankingItemContent.id)
            ).scalar_one()
            connection.execute(
                update(RankingItem)
                .where(RankingItem.id == item_id)
                .values(current_content_id=item_content_id)
            )
            item_ids.append(item_id)
            slugs.append(item_slug)
        result_id = connection.execute(
            insert(ComparisonResponse)
            .values(participant_id=user_id, conversation_id=conversation_id, comparisons=[])
            .returning(ComparisonResponse.id)
        ).scalar_one()
    fixture = RankingFixture(
        conversation_id=conversation_id,
        config_id=config_id,
        result_id=result_id,
        user_id=user_id,
        item_ids=item_ids,
        slugs=slugs,
    )
    append_comparison(engine=engine, fixture=fixture, position=0)
    return fixture


def append_comparison(*, engine: Engine, fixture: RankingFixture, position: int) -> None:
    with engine.begin() as connection:
        connection.execute(
            insert(ComparisonAnswer).values(
                comparison_response_id=fixture.result_id,
                position=position,
                best_slug_id=fixture.slugs[0],
                worst_slug_id=fixture.slugs[-1],
                candidate_set=fixture.slugs,
            )
        )


def capture(*, engine: Engine, fixtures: list[RankingFixture]) -> ScoringInputs:
    with engine.connect() as connection:
        return prepare_scoring_inputs(
            connection, conversation_ids=[fixture.conversation_id for fixture in fixtures]
        )


def publish(
    *, engine: Engine, inputs: ScoringInputs, on_publication: PublicationCallback | None = None
) -> dict[int, ScoringPublication]:
    scores = {
        cid: [
            ScoredEntity(
                entity_slug_id=item.slug_id,
                score=float(-index),
                display_score=squash_display_scores({index: float(-index)})[index],
                uncertainty_left=0.1,
                uncertainty_right=0.1,
                participant_count=1,
            )
            for index, item in enumerate(prepared.ranking_items)
            if item.lifecycle_status == RankingItemLifecycleStatus.active
        ]
        for cid, prepared in inputs.items()
    }
    with engine.connect() as connection:
        return persist_scoring_batch(
            connection,
            inputs=inputs,
            scoring_results={
                cid: (entities, {entity.entity_slug_id: 1 for entity in entities})
                for cid, entities in scores.items()
            },
            user_scores=[
                UserScoreEntry(
                    comparison_response_id=result_id,
                    entity_slug_id=entity.entity_slug_id,
                    score=entity.score,
                    display_score=entity.display_score,
                    uncertainty_left=0.1,
                    uncertainty_right=0.1,
                )
                for cid, prepared in inputs.items()
                for result_id in prepared.response_ids.values()
                for entity in scores[cid]
            ],
            conversation_ids_to_clear=[],
            on_publication=on_publication,
        )


def test_appended_votes_allow_coherent_progress_and_requeue(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    cid = fixture.conversation_id
    old = capture(engine=ranking_db, fixtures=[fixture])
    append_comparison(engine=ranking_db, fixture=fixture, position=1)
    publication = publish(engine=ranking_db, inputs=old)[cid]
    assert publication.status == "published"
    assert publication.needs_requeue
    with Session(ranking_db) as session:
        config = session.get_one(RankingConversationConfig, fixture.config_id)
        snapshot = session.scalars(
            select(RankingConversationStatsSnapshot).where(
                RankingConversationStatsSnapshot.conversation_id == cid
            )
        ).one()
        assert config.processed_scoring_input_revision == old[cid].revision
        assert snapshot.ranking_score_id == config.current_ranking_score_id
        assert config.scoring_input_revision > old[cid].revision
        assert snapshot.scoring_input_revision == old[cid].revision
        assert snapshot.vote_count == config.vote_count == 1
        assert snapshot.participant_count == 1
        assert (
            len(
                session.scalars(
                    select(RankingConversationStatsItem).where(
                        RankingConversationStatsItem.stats_snapshot_id == snapshot.id
                    )
                ).all()
            )
            == 3
        )
        assert (
            len(
                session.scalars(
                    select(ComparisonUserEntityScore).where(
                        ComparisonUserEntityScore.comparison_response_id == fixture.result_id
                    )
                ).all()
            )
            == 3
        )
        event = session.scalars(
            select(RealtimeEventOutbox).order_by(RealtimeEventOutbox.id.desc())
        ).first()
        assert event is not None
        assert event.payload["voteCount"] == 1
    fresh = capture(engine=ranking_db, fixtures=[fixture])
    assert publish(engine=ranking_db, inputs=fresh)[cid].status == "published"
    assert publish(engine=ranking_db, inputs=old)[cid].status == "superseded"
    assert publish(engine=ranking_db, inputs=fresh)[cid].status == "superseded"


@pytest.mark.parametrize("method", [RankingMode.bws, RankingMode.pairwise])
def test_retained_tasks_replay_the_effective_inputs_without_account_or_response_keys(
    ranking_db: Engine,
    method: RankingMode,
) -> None:
    fixture = seed_ranking(ranking_db)
    cid = fixture.conversation_id
    accepted_candidates = fixture.slugs if method == RankingMode.bws else fixture.slugs[:2]
    with ranking_db.begin() as connection:
        connection.execute(
            update(RankingConversationConfig)
            .where(RankingConversationConfig.id == fixture.config_id)
            .values(ranking_mode=method)
        )
        # The third accepted candidate subsequently becomes unavailable. Preserve
        # the original task as well as the exact effective binary model input.
        connection.execute(
            update(ComparisonAnswer)
            .where(ComparisonAnswer.comparison_response_id == fixture.result_id)
            .values(worst_slug_id=fixture.slugs[1], candidate_set=accepted_candidates)
        )
        connection.execute(
            update(RankingItem)
            .where(RankingItem.id == fixture.item_ids[2])
            .values(lifecycle_status=RankingItemLifecycleStatus.canceled)
        )
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    expected = score_comparison_observations(
        entity_ids=inputs[cid].entity_ids,
        observations=inputs[cid].observations,
        recipe=inputs[cid].recipe,
    )
    assert expected is not None
    counts = build_participant_counts(inputs[cid].observations)
    with ranking_db.connect() as connection:
        publication = persist_scoring_batch(
            connection,
            inputs=inputs,
            scoring_results={
                cid: (
                    [
                        ScoredEntity(
                            entity_slug_id=score.entity_id,
                            score=score.score,
                            display_score=score.display_score,
                            uncertainty_left=score.uncertainty_left,
                            uncertainty_right=score.uncertainty_right,
                            participant_count=counts[score.entity_id],
                        )
                        for score in expected.global_scores
                    ],
                    counts,
                )
            },
            user_scores=[],
            conversation_ids_to_clear=[],
        )
    assert publication[cid].status == "published"
    with Session(ranking_db) as session:
        root = session.scalars(
            select(RankingInputSnapshot).where(RankingInputSnapshot.conversation_id == cid)
        ).one()
        assert root.comparison_method == method
        assert root.scoring_input_revision == inputs[cid].revision
        assert root.algorithm_version == SCORING_ALGORITHM_VERSION
        assert root.solidago_version == SOLIDAGO_VERSION
        assert root.pipeline_config["trust"] == "equal"
        assert root.pipeline_config["choice_scale"] == 0.5
        assert root.participant_count == 1
        participants = session.scalars(
            select(RankingInputParticipant.participant_index).where(
                RankingInputParticipant.input_snapshot_id == root.id
            )
        ).all()
        assert participants == [0]
        catalogue = session.scalars(
            select(RankingInputItem.item_slug_id)
            .where(RankingInputItem.input_snapshot_id == root.id)
            .order_by(RankingInputItem.position)
        ).all()
        answers = session.scalars(
            select(RankingInputAnswer)
            .where(RankingInputAnswer.input_snapshot_id == root.id)
            .order_by(RankingInputAnswer.participant_index, RankingInputAnswer.position)
        ).all()
        assert answers[0].candidate_set == accepted_candidates
        assert answers[0].effective_candidate_set == fixture.slugs[:2]
        persisted_recipe = ComparisonRecipe.model_validate(root.pipeline_config)
        from scoring_worker.observations import comparison_rows_to_observations

        replay = score_comparison_observations(
            entity_ids=list(catalogue),
            recipe=persisted_recipe,
            observations=comparison_rows_to_observations(
                entity_ids=list(catalogue),
                comparisons=[
                    ComparisonRow(
                        best_slug_id=answer.best_slug_id,
                        worst_slug_id=answer.worst_slug_id,
                        candidate_set=answer.effective_candidate_set,
                        user_idx=answer.participant_index,
                    )
                    for answer in answers
                ],
            ),
        )
        assert replay is not None
        stored_scores = dict(
            session.execute(
                select(RankingScoreEntity.entity_slug_id, RankingScoreEntity.score)
                .join(
                    RankingConversationStatsSnapshot,
                    RankingConversationStatsSnapshot.ranking_score_id
                    == RankingScoreEntity.ranking_score_id,
                )
                .where(RankingConversationStatsSnapshot.id == root.stats_snapshot_id)
            )
            .tuples()
            .all()
        )
        assert {score.entity_id: score.score for score in replay.global_scores} == pytest.approx(
            stored_scores
        )
        # Numerical tables contain no semantic or structural account lookup.
        for model in [
            RankingInputSnapshot,
            RankingInputParticipant,
            RankingInputItem,
            RankingInputAnswer,
        ]:
            assert not {
                "user_id",
                "participant_id",
                "comparison_response_id",
                "comparison_answer_id",
            } & set(model.__table__.columns.keys())


def test_failed_publication_keeps_its_capture_private_and_unbound_for_retry(
    ranking_db: Engine,
) -> None:
    fixture = seed_ranking(ranking_db)
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    with (
        patch.object(
            scoring_db,
            "_prune_unpublished_ranking_snapshots",
            side_effect=RuntimeError("publication interrupted after capture"),
        ),
        pytest.raises(RuntimeError, match="interrupted after capture"),
    ):
        publish(engine=ranking_db, inputs=inputs)
    with Session(ranking_db) as session:
        prepared = session.get_one(
            RankingInputSnapshot, inputs[fixture.conversation_id].input_snapshot_id
        )
        assert prepared.stats_snapshot_id is None
        assert (
            session.scalar(
                select(func.count())
                .select_from(RankingConversationStatsSnapshot)
                .where(RankingConversationStatsSnapshot.conversation_id == fixture.conversation_id)
            )
            == 0
        )
        assert (
            session.get_one(RankingConversationConfig, fixture.config_id).current_ranking_score_id
            is None
        )
    assert publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id].status == "published"


def test_prepared_capture_is_sealed_before_computation(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    prepared = inputs[fixture.conversation_id]
    with Session(ranking_db) as session:
        root = session.get_one(RankingInputSnapshot, prepared.input_snapshot_id)
        assert root.sealed_at is not None
        assert root.stats_snapshot_id is None
        assert root.answer_count == len(prepared.tasks)
    with pytest.raises(IntegrityError) as error, ranking_db.begin() as connection:
        connection.execute(
            insert(RankingInputAnswer).values(
                input_snapshot_id=prepared.input_snapshot_id,
                participant_index=0,
                position=99,
                best_slug_id=fixture.slugs[0],
                worst_slug_id=fixture.slugs[-1],
                candidate_set=fixture.slugs,
                effective_candidate_set=fixture.slugs,
            )
        )
    assert isinstance(error.value.orig, CheckViolation)
    assert error.value.orig.diag.constraint_name == "ranking_input_immutable"


def test_processed_revisions_skip_evidence_copy_and_computation(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    assert publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id].status == "published"
    with patch.object(
        scoring_db, "write_retained_inputs", side_effect=AssertionError("unexpected copy")
    ):
        assert capture(engine=ranking_db, fixtures=[fixture]) == {}
    with Session(ranking_db) as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(RankingInputSnapshot)
                .where(RankingInputSnapshot.conversation_id == fixture.conversation_id)
            )
            == 1
        )


def test_retry_reuses_a_complete_unbound_capture_for_the_exact_revision(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    first = capture(engine=ranking_db, fixtures=[fixture])
    with patch.object(
        scoring_db, "write_retained_inputs", side_effect=AssertionError("unexpected retry copy")
    ):
        retry = capture(engine=ranking_db, fixtures=[fixture])
    assert (
        retry[fixture.conversation_id].input_snapshot_id
        == first[fixture.conversation_id].input_snapshot_id
    )
    assert retry[fixture.conversation_id].tasks == first[fixture.conversation_id].tasks
    assert publish(engine=ranking_db, inputs=retry)[fixture.conversation_id].status == "published"


def test_evidence_preparation_does_not_take_lifecycle_or_config_write_locks(
    ranking_db: Engine,
) -> None:
    fixture = seed_ranking(ranking_db)
    with ThreadPoolExecutor(max_workers=1) as executor, ranking_db.begin() as writer:
        writer.execute(
            select(Conversation.id)
            .where(Conversation.id == fixture.conversation_id)
            .with_for_update(key_share=True)
        ).all()
        writer.execute(
            select(RankingConversationConfig.id)
            .where(RankingConversationConfig.id == fixture.config_id)
            .with_for_update()
        ).all()
        future = executor.submit(capture, engine=ranking_db, fixtures=[fixture])
        prepared = future.result(timeout=5)
    with Session(ranking_db) as session:
        root = session.get_one(
            RankingInputSnapshot, prepared[fixture.conversation_id].input_snapshot_id
        )
        assert root.stats_snapshot_id is None
        assert (
            session.scalar(
                select(func.count())
                .select_from(RankingInputAnswer)
                .where(RankingInputAnswer.input_snapshot_id == root.id)
            )
            == 1
        )


def test_distinct_retained_participants_survive_detaching_both_accounts(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    other_user = uuid4()
    with ranking_db.begin() as connection:
        connection.execute(
            update(RankingItem)
            .where(RankingItem.conversation_id == fixture.conversation_id)
            .values(is_seed=True)
        )
        connection.execute(
            insert(User).values(id=other_user, username=f"other-{other_user.hex[:8]}")
        )
        other_response = connection.scalar(
            insert(ComparisonResponse)
            .values(
                participant_id=other_user, conversation_id=fixture.conversation_id, comparisons=[]
            )
            .returning(ComparisonResponse.id)
        )
        assert other_response is not None
        connection.execute(
            insert(ComparisonAnswer).values(
                comparison_response_id=other_response,
                position=0,
                best_slug_id=fixture.slugs[-1],
                worst_slug_id=fixture.slugs[0],
                candidate_set=list(reversed(fixture.slugs)),
            )
        )
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    assert publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id].status == "published"
    with Session(ranking_db) as session:
        root = session.scalars(
            select(RankingInputSnapshot).where(
                RankingInputSnapshot.conversation_id == fixture.conversation_id
            )
        ).one()
        assert root.participant_count == 2
        snapshot_id = root.id
        columns = (
            select(
                RankingInputAnswer.participant_index,
                RankingInputAnswer.best_slug_id,
                RankingInputAnswer.candidate_set,
            )
            .where(RankingInputAnswer.input_snapshot_id == snapshot_id)
            .order_by(RankingInputAnswer.participant_index)
        )
        before = session.execute(columns).all()
        assert [row.participant_index for row in before] == [0, 1]
    with ranking_db.begin() as connection:
        now = datetime.now(UTC)
        connection.execute(
            update(User)
            .where(User.id.in_([fixture.user_id, other_user]))
            .values(is_deleted=True, purge_started_at=now)
        )
        connection.execute(
            update(ComparisonAnswer)
            .where(ComparisonAnswer.comparison_response_id.in_([fixture.result_id, other_response]))
            .values(deleted_at=now)
        )
        connection.execute(
            update(ComparisonUserEntityScore)
            .where(
                ComparisonUserEntityScore.comparison_response_id.in_(
                    [fixture.result_id, other_response]
                )
            )
            .values(deleted_at=now)
        )
        connection.execute(
            update(ComparisonResponse)
            .where(ComparisonResponse.id.in_([fixture.result_id, other_response]))
            .values(
                participant_id=None,
                detached_at=now,
                comparisons=[],
                ranking=None,
                is_complete=False,
            )
        )
    assert capture(engine=ranking_db, fixtures=[fixture])[fixture.conversation_id].tasks == ()
    with Session(ranking_db) as session:
        assert session.execute(columns).all() == before
        assert session.get_one(RankingInputSnapshot, snapshot_id).participant_count == 2


def test_retained_checkpoint_survives_source_detachment_and_never_becomes_live_input(
    ranking_db: Engine,
) -> None:
    fixture = seed_ranking(ranking_db)
    with ranking_db.begin() as connection:
        connection.execute(
            update(Conversation)
            .where(Conversation.id == fixture.conversation_id)
            .values(is_closed=True)
        )
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    with ranking_db.begin() as connection:
        connection.execute(
            update(Conversation)
            .where(Conversation.id == fixture.conversation_id)
            .values(closing_target_revision=inputs[fixture.conversation_id].revision)
        )
    assert publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id].status == "published"
    with Session(ranking_db) as session:
        root = session.scalars(
            select(RankingInputSnapshot).where(
                RankingInputSnapshot.conversation_id == fixture.conversation_id
            )
        ).one()
        snapshot_id = root.stats_snapshot_id
        assert snapshot_id is not None
        select_evidence = select(
            RankingInputAnswer.participant_index,
            RankingInputAnswer.position,
            RankingInputAnswer.best_slug_id,
            RankingInputAnswer.worst_slug_id,
            RankingInputAnswer.candidate_set,
            RankingInputAnswer.effective_candidate_set,
        ).where(RankingInputAnswer.input_snapshot_id == root.id)
        before = session.execute(select_evidence).all()
        counts = session.get_one(RankingConversationStatsSnapshot, snapshot_id)
        before_counts = (counts.vote_count, counts.participant_count, counts.ranking_score_id)
    with ranking_db.begin() as connection:
        connection.execute(
            update(User)
            .where(User.id == fixture.user_id)
            .values(is_deleted=True, purge_started_at=datetime.now(UTC))
        )
        connection.execute(
            update(ComparisonAnswer)
            .where(ComparisonAnswer.comparison_response_id == fixture.result_id)
            .values(deleted_at=datetime.now(UTC))
        )
        connection.execute(
            update(ComparisonUserEntityScore)
            .where(ComparisonUserEntityScore.comparison_response_id == fixture.result_id)
            .values(deleted_at=datetime.now(UTC))
        )
        connection.execute(
            update(ComparisonResponse)
            .where(ComparisonResponse.id == fixture.result_id)
            .values(
                participant_id=None,
                detached_at=datetime.now(UTC),
                ranking=None,
                comparisons=[],
                is_complete=False,
            )
        )
    with ranking_db.begin() as connection:
        connection.execute(
            update(Conversation)
            .where(Conversation.id == fixture.conversation_id)
            .values(is_closed=False, closing_target_revision=None, closed_finalized_at=None)
        )
    fresh = capture(engine=ranking_db, fixtures=[fixture])
    assert fresh[fixture.conversation_id].tasks == ()
    with Session(ranking_db) as session:
        assert session.execute(select_evidence).all() == before
        counts = session.get_one(RankingConversationStatsSnapshot, snapshot_id)
        assert (
            counts.vote_count,
            counts.participant_count,
            counts.ranking_score_id,
        ) == before_counts
    with pytest.raises(IntegrityError), ranking_db.begin() as connection:
        connection.execute(
            update(ComparisonResponse)
            .where(ComparisonResponse.id == fixture.result_id)
            .values(participant_id=fixture.user_id, detached_at=None)
        )


def test_new_participant_does_not_invalidate_captured_votes(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    user_id = uuid4()
    with ranking_db.begin() as connection:
        connection.execute(insert(User).values(id=user_id, username=f"test-{user_id.hex[:8]}"))
        result_id = connection.execute(
            insert(ComparisonResponse)
            .values(participant_id=user_id, conversation_id=fixture.conversation_id, comparisons=[])
            .returning(ComparisonResponse.id)
        ).scalar_one()
    append_comparison(
        engine=ranking_db,
        fixture=replace(fixture, user_id=user_id, result_id=result_id),
        position=0,
    )
    result = publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id]
    assert result.status == "published"
    assert result.needs_requeue
    with Session(ranking_db) as session:
        config = session.get_one(RankingConversationConfig, fixture.config_id)
        assert config.participant_count == 1
        assert config.vote_count == 1


def test_personal_scores_update_in_place_and_reactivate_without_deleting(
    ranking_db: Engine,
) -> None:
    fixture = seed_ranking(ranking_db)
    # Keep a real effective task after the first statement completes, so the
    # remaining personal scores still have numerical inputs supporting them.
    with ranking_db.begin() as connection:
        connection.execute(
            insert(ComparisonAnswer).values(
                comparison_response_id=fixture.result_id,
                position=1,
                best_slug_id=fixture.slugs[1],
                worst_slug_id=fixture.slugs[2],
                candidate_set=fixture.slugs,
            )
        )
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with Session(ranking_db) as session:
        original_ids = {
            row.entity_slug_id: row.id
            for row in session.scalars(
                select(ComparisonUserEntityScore).where(
                    ComparisonUserEntityScore.comparison_response_id == fixture.result_id
                )
            )
        }
    with ranking_db.begin() as connection:
        connection.execute(
            update(ComparisonUserEntityScore)
            .where(ComparisonUserEntityScore.comparison_response_id == fixture.result_id)
            .values(score=42, display_score=0.9)
        )
        connection.execute(
            update(RankingItem)
            .where(RankingItem.id == fixture.item_ids[0])
            .values(lifecycle_status=RankingItemLifecycleStatus.completed)
        )
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    assert publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id].status == "published"
    with Session(ranking_db) as session:
        rows = session.scalars(
            select(ComparisonUserEntityScore).where(
                ComparisonUserEntityScore.comparison_response_id == fixture.result_id
            )
        ).all()
        assert {row.entity_slug_id: row.id for row in rows} == original_ids
        for row in rows:
            if row.entity_slug_id == fixture.slugs[0]:
                assert row.deleted_at is not None
                assert row.score == 42
            else:
                assert row.deleted_at is None
                assert row.score != 42
    assert publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id].status == "superseded"
    with ranking_db.begin() as connection:
        connection.execute(
            update(RankingItem)
            .where(RankingItem.id == fixture.item_ids[0])
            .values(lifecycle_status=RankingItemLifecycleStatus.active)
        )
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with Session(ranking_db) as session:
        rows = session.scalars(
            select(ComparisonUserEntityScore).where(
                ComparisonUserEntityScore.comparison_response_id == fixture.result_id
            )
        ).all()
        assert {row.entity_slug_id: row.id for row in rows} == original_ids
        assert all(row.deleted_at is None and row.score != 42 for row in rows)


def test_empty_publications_soft_delete_scores_without_resetting_tombstones(
    ranking_db: Engine,
) -> None:
    fixture = seed_ranking(ranking_db)
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with ranking_db.begin() as connection:
        connection.execute(
            update(RankingItem)
            .where(RankingItem.id.in_(fixture.item_ids[1:]))
            .values(lifecycle_status=RankingItemLifecycleStatus.completed)
        )
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    with ranking_db.connect() as connection:
        publications = persist_scoring_batch(
            connection,
            inputs=inputs,
            scoring_results={},
            user_scores=[],
            conversation_ids_to_clear=[fixture.conversation_id],
        )
    assert publications[fixture.conversation_id].status == "published"
    with Session(ranking_db) as session:
        rows = session.scalars(
            select(ComparisonUserEntityScore).where(
                ComparisonUserEntityScore.comparison_response_id == fixture.result_id
            )
        ).all()
        assert len(rows) == len(fixture.slugs)
        assert all(row.deleted_at is not None for row in rows)
        ids = [row.id for row in rows]
        assert (
            session.get_one(RankingConversationConfig, fixture.config_id).current_ranking_score_id
            is None
        )
    with ranking_db.begin() as connection:
        connection.execute(
            update(ComparisonUserEntityScore)
            .where(ComparisonUserEntityScore.id.in_(ids))
            .values(deleted_at=datetime(2000, 1, 1, tzinfo=UTC))
        )
    with Session(ranking_db) as session:
        tombstones = {
            row.id: row.deleted_at
            for row in session.scalars(
                select(ComparisonUserEntityScore).where(ComparisonUserEntityScore.id.in_(ids))
            )
        }
    append_comparison(engine=ranking_db, fixture=fixture, position=1)
    with ranking_db.connect() as connection:
        persist_scoring_batch(
            connection,
            inputs=capture(engine=ranking_db, fixtures=[fixture]),
            scoring_results={},
            user_scores=[],
            conversation_ids_to_clear=[fixture.conversation_id],
        )
    with Session(ranking_db) as session:
        assert {
            row.id: row.deleted_at
            for row in session.scalars(
                select(ComparisonUserEntityScore).where(
                    ComparisonUserEntityScore.comparison_response_id == fixture.result_id
                )
            )
        } == tombstones


def test_snapshot_pruning_retains_tombstones_and_protects_published_roots(
    ranking_db: Engine,
) -> None:
    fixture = seed_ranking(ranking_db)
    for position in range(3):
        if position:
            append_comparison(engine=ranking_db, fixture=fixture, position=position)
        publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with Session(ranking_db) as session, session.begin():
        snapshots = session.scalars(
            select(RankingConversationStatsSnapshot)
            .where(RankingConversationStatsSnapshot.conversation_id == fixture.conversation_id)
            .order_by(RankingConversationStatsSnapshot.id)
        ).all()
        assert len(snapshots) == 3
        baseline, obsolete, checkpoint = snapshots
        assert baseline.deleted_at is None
        assert obsolete.deleted_at is not None
        assert checkpoint.deleted_at is None
        obsolete_id, deleted_at = obsolete.id, obsolete.deleted_at
        for snapshot in snapshots:
            items = session.scalars(
                select(RankingConversationStatsItem).where(
                    RankingConversationStatsItem.stats_snapshot_id == snapshot.id
                )
            ).all()
            assert len(items) == len(fixture.slugs)
            assert all(item.deleted_at == snapshot.deleted_at for item in items)
        session.add(
            RankingConversationStatsCheckpoint(
                stats_snapshot_id=checkpoint.id,
                conversation_id=fixture.conversation_id,
                reason=RankingStatsCheckpointReasonEnum.conversation_closed,
                created_at=datetime.now(tz=UTC),
            )
        )
    append_comparison(engine=ranking_db, fixture=fixture, position=3)
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with Session(ranking_db) as session:
        snapshots = session.scalars(
            select(RankingConversationStatsSnapshot)
            .where(RankingConversationStatsSnapshot.conversation_id == fixture.conversation_id)
            .order_by(RankingConversationStatsSnapshot.id)
        ).all()
        assert len(snapshots) == 4
        assert (
            session.get_one(RankingConversationStatsSnapshot, obsolete_id).deleted_at == deleted_at
        )
        assert [snapshot.deleted_at is None for snapshot in snapshots] == [True, False, True, True]
    assert fixture.conversation_id not in {
        conversation_id
        for conversation_id, _ in scoring_db.reconcile_unscored_conversations(ranking_db)
    }


@pytest.mark.parametrize("removed_input", ["comparison", "participant"])
def test_removed_participation_leaves_only_inactive_personal_scores(
    ranking_db: Engine, removed_input: str
) -> None:
    fixture = seed_ranking(ranking_db)
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with ranking_db.begin() as connection:
        if removed_input == "comparison":
            connection.execute(
                update(ComparisonAnswer)
                .where(ComparisonAnswer.comparison_response_id == fixture.result_id)
                .values(deleted_at=datetime.now(tz=UTC))
            )
        else:
            connection.execute(
                update(User).where(User.id == fixture.user_id).values(is_deleted=True)
            )
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with Session(ranking_db) as session:
        rows = session.scalars(
            select(ComparisonUserEntityScore).where(
                ComparisonUserEntityScore.comparison_response_id == fixture.result_id
            )
        ).all()
        assert len(rows) == len(fixture.slugs)
        assert all(row.deleted_at is not None for row in rows)


def test_deleted_snapshots_do_not_choose_baseline_or_trigger_reconciliation(
    ranking_db: Engine,
) -> None:
    fixture = seed_ranking(ranking_db)
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with ranking_db.begin() as connection:
        connection.execute(
            insert(RankingConversationStatsSnapshot),
            [
                {
                    "conversation_id": fixture.conversation_id,
                    "item_count": 0,
                    "total_item_count": 0,
                    "vote_count": 0,
                    "total_vote_count": 0,
                    "participant_count": 0,
                    "total_participant_count": 0,
                    "scoring_input_revision": 0,
                    "is_closed": True,
                    "created_at": datetime(year, 1, 1, tzinfo=UTC),
                    "deleted_at": datetime.now(tz=UTC),
                }
                for year in [2000, 2100]
            ],
        )
    for position in [1, 2]:
        append_comparison(engine=ranking_db, fixture=fixture, position=position)
        publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with Session(ranking_db) as session:
        active = session.scalars(
            select(RankingConversationStatsSnapshot)
            .where(
                RankingConversationStatsSnapshot.conversation_id == fixture.conversation_id,
                RankingConversationStatsSnapshot.deleted_at.is_(None),
            )
            .order_by(RankingConversationStatsSnapshot.id)
        ).all()
        assert [snapshot.vote_count for snapshot in active] == [1, 3]
    assert fixture.conversation_id not in {
        conversation_id
        for conversation_id, _ in scoring_db.reconcile_unscored_conversations(ranking_db)
    }


def test_identical_personal_scores_do_not_rewrite_rows(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    # PostgreSQL xmin reveals physical rewrites even when score values stay identical.
    statement = select(ComparisonUserEntityScore.id, literal_column("xmin").cast(String)).where(
        ComparisonUserEntityScore.comparison_response_id == fixture.result_id
    )
    with Session(ranking_db) as session:
        original_versions = {
            score_id: version for score_id, version in session.execute(statement).tuples()
        }
    append_comparison(engine=ranking_db, fixture=fixture, position=1)
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with Session(ranking_db) as session:
        assert {
            score_id: version for score_id, version in session.execute(statement).tuples()
        } == original_versions


def test_failed_publication_rolls_back_existing_scores_and_snapshot_tombstones(
    ranking_db: Engine,
) -> None:
    fixture = seed_ranking(ranking_db)
    for position in [0, 1]:
        if position:
            append_comparison(engine=ranking_db, fixture=fixture, position=position)
        publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    personal_state = (
        select(
            ComparisonUserEntityScore.id,
            ComparisonUserEntityScore.score,
            ComparisonUserEntityScore.display_score,
            ComparisonUserEntityScore.deleted_at,
        )
        .where(ComparisonUserEntityScore.comparison_response_id == fixture.result_id)
        .order_by(ComparisonUserEntityScore.id)
    )
    snapshot_state = (
        select(RankingConversationStatsSnapshot.id, RankingConversationStatsSnapshot.deleted_at)
        .where(RankingConversationStatsSnapshot.conversation_id == fixture.conversation_id)
        .order_by(RankingConversationStatsSnapshot.id)
    )
    with Session(ranking_db) as session:
        previous_score_id = session.get_one(
            RankingConversationConfig, fixture.config_id
        ).current_ranking_score_id
        previous_personal = list(session.execute(personal_state).tuples())
        previous_snapshots = list(session.execute(snapshot_state).tuples())
    with ranking_db.begin() as connection:
        connection.execute(
            update(RankingItem)
            .where(RankingItem.id == fixture.item_ids[0])
            .values(lifecycle_status=RankingItemLifecycleStatus.completed)
        )
        # Reject the root update after the child tombstones have been written.
        connection.exec_driver_sql(
            "ALTER TABLE ranking_conversation_stats_snapshot ADD CONSTRAINT "
            "test_reject_tombstones CHECK (deleted_at IS NULL) NOT VALID"
        )
    try:
        with pytest.raises(IntegrityError, match="test_reject_tombstones"):
            publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    finally:
        with ranking_db.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE ranking_conversation_stats_snapshot "
                "DROP CONSTRAINT test_reject_tombstones"
            )
    with Session(ranking_db) as session:
        assert (
            session.get_one(RankingConversationConfig, fixture.config_id).current_ranking_score_id
            == previous_score_id
        )
        assert list(session.execute(personal_state).tuples()) == previous_personal
        assert list(session.execute(snapshot_state).tuples()) == previous_snapshots
        items = session.scalars(
            select(RankingConversationStatsItem).where(
                RankingConversationStatsItem.conversation_id == fixture.conversation_id,
            )
        ).all()
        assert len(items) == 6
        assert all(item.deleted_at is None for item in items)


def test_score_backups_are_json_values_not_json_encoded_strings(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    publish(engine=ranking_db, inputs=inputs)
    with Session(ranking_db) as session:
        kinds = session.execute(
            select(
                func.jsonb_typeof(RankingScore.scores),
                func.jsonb_typeof(RankingScore.participant_counts),
                func.jsonb_typeof(RankingScore.pipeline_config),
            ).where(RankingScore.conversation_id == fixture.conversation_id)
        ).one()
        assert tuple(kinds) == ("array", "object", "object")


def test_backfill_decodes_legacy_backups_and_preserves_correct_values(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    publish(engine=ranking_db, inputs=inputs)
    with Session(ranking_db) as session:
        score = session.scalars(
            select(RankingScore).where(RankingScore.conversation_id == fixture.conversation_id)
        ).one()
        expected = (score.scores, score.participant_counts, score.pipeline_config)
        score_id = score.id
    with ranking_db.begin() as connection:
        connection.execute(
            update(RankingScore)
            .where(RankingScore.id == score_id)
            .values(
                scores=dumps(expected[0]),
                participant_counts=dumps(expected[1]),
                pipeline_config=dumps(expected[2]),
            )
        )
    migration = (
        Path(__file__).resolve().parents[2]
        / "api/database/flyway/V0089.2__normalize_ranking_score_json_backups.sql"
    )
    for _ in range(2):
        with ranking_db.begin() as connection:
            connection.exec_driver_sql(
                migration.read_text(), execution_options={"no_parameters": True}
            )
        with Session(ranking_db) as session:
            score = session.get_one(RankingScore, score_id)
            assert (score.scores, score.participant_counts, score.pipeline_config) == expected


def test_large_publication_does_not_exceed_postgres_parameter_limit(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    user_ids = [uuid4() for _ in range(4500)]
    with ranking_db.begin() as connection:
        connection.execute(
            insert(User),
            [{"id": user_id, "username": f"bulk-{user_id.hex[:15]}"} for user_id in user_ids],
        )
        result_ids = connection.scalars(
            insert(ComparisonResponse).returning(ComparisonResponse.id),
            [
                {
                    "participant_id": user_id,
                    "conversation_id": fixture.conversation_id,
                    "comparisons": [],
                }
                for user_id in user_ids
            ],
        ).all()
        connection.execute(
            insert(ComparisonAnswer),
            [
                {
                    "comparison_response_id": result_id,
                    "position": 0,
                    "best_slug_id": fixture.slugs[0],
                    "worst_slug_id": fixture.slugs[-1],
                    "candidate_set": fixture.slugs,
                }
                for result_id in result_ids
            ],
        )
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    result = publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id]
    assert result.status == "published"
    with Session(ranking_db) as session:
        count = session.scalar(
            select(func.count())
            .select_from(ComparisonUserEntityScore)
            .join(
                ComparisonResponse,
                ComparisonResponse.id == ComparisonUserEntityScore.comparison_response_id,
            )
            .where(ComparisonResponse.conversation_id == fixture.conversation_id)
        )
        assert count == (len(user_ids) + 1) * len(fixture.slugs)


@pytest.mark.parametrize("change", ["edit", "remove", "item", "user", "close", "survey"])
def test_invalidations_reject_old_computation(ranking_db: Engine, change: str) -> None:
    fixture = seed_ranking(ranking_db)
    old = capture(engine=ranking_db, fixtures=[fixture])
    with ranking_db.begin() as connection:
        if change == "edit":
            connection.execute(
                update(ComparisonAnswer)
                .where(ComparisonAnswer.comparison_response_id == fixture.result_id)
                .values(best_slug_id=fixture.slugs[-1], worst_slug_id=fixture.slugs[0])
            )
        elif change == "remove":
            connection.execute(
                update(ComparisonAnswer)
                .where(ComparisonAnswer.comparison_response_id == fixture.result_id)
                .values(deleted_at=datetime.now(tz=UTC))
            )
        elif change == "item":
            connection.execute(
                update(RankingItem)
                .where(RankingItem.id == fixture.item_ids[0])
                .values(lifecycle_status=RankingItemLifecycleStatus.completed)
            )
        elif change == "user":
            connection.execute(
                update(User).where(User.id == fixture.user_id).values(is_deleted=True)
            )
        elif change == "survey":
            connection.execute(insert(SurveyConfig).values(conversation_id=fixture.conversation_id))
        else:
            connection.execute(
                update(Conversation)
                .where(Conversation.id == fixture.conversation_id)
                .values(is_closed=True)
            )
    result = publish(engine=ranking_db, inputs=old)[fixture.conversation_id]
    assert result.status == "invalidated"
    assert result.needs_requeue
    with Session(ranking_db) as session:
        assert (
            session.scalars(
                select(RankingConversationStatsSnapshot).where(
                    RankingConversationStatsSnapshot.conversation_id == fixture.conversation_id
                )
            ).first()
            is None
        )


def test_one_invalidated_conversation_does_not_reject_its_batch(ranking_db: Engine) -> None:
    changed = seed_ranking(ranking_db)
    unchanged = seed_ranking(ranking_db)
    old = capture(engine=ranking_db, fixtures=[changed, unchanged])
    with ranking_db.begin() as connection:
        connection.execute(
            update(Conversation)
            .where(Conversation.id == changed.conversation_id)
            .values(is_closed=True)
        )
    result = publish(engine=ranking_db, inputs=old)
    assert result[changed.conversation_id].status == "invalidated"
    assert result[unchanged.conversation_id].status == "published"
    assert not result[unchanged.conversation_id].needs_requeue


def test_publication_callback_observes_each_committed_snapshot(ranking_db: Engine) -> None:
    fixtures = [seed_ranking(ranking_db), seed_ranking(ranking_db)]
    inputs = capture(engine=ranking_db, fixtures=fixtures)
    observed: list[int] = []

    def observe(*, conversation_id: int, publication: ScoringPublication) -> None:
        assert publication.status == "published"
        with Session(ranking_db) as session:
            snapshot = session.scalars(
                select(RankingConversationStatsSnapshot).where(
                    RankingConversationStatsSnapshot.conversation_id == conversation_id
                )
            ).one()
            assert snapshot.scoring_input_revision == inputs[conversation_id].revision
        observed.append(conversation_id)

    publish(engine=ranking_db, inputs=inputs, on_publication=observe)
    assert observed == sorted(inputs)


def test_inputs_share_one_snapshot_despite_interleaved_vote(
    ranking_db: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    fixture = seed_ranking(ranking_db)
    original = scoring_db.fetch_scoring_input_revisions

    def read_then_append(connection: Connection, *, conversation_ids: list[int]) -> dict[int, int]:
        revisions = original(connection, conversation_ids=conversation_ids)
        append_comparison(engine=ranking_db, fixture=fixture, position=1)
        return revisions

    with monkeypatch.context() as patch:
        patch.setattr(scoring_db, "fetch_scoring_input_revisions", read_then_append)
        inputs = capture(engine=ranking_db, fixtures=[fixture])
    assert len(inputs[fixture.conversation_id].tasks) == 1
    assert inputs[fixture.conversation_id].total_vote_count == 1
    current = capture(engine=ranking_db, fixtures=[fixture])
    assert len(current[fixture.conversation_id].tasks) == 2
    assert current[fixture.conversation_id].revision > inputs[fixture.conversation_id].revision


def test_failed_snapshot_rolls_back_scores_and_processed_revision(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    with (
        patch(
            "scoring_worker.db._update_ranking_stats_batch",
            side_effect=RuntimeError("failed snapshot"),
        ),
        pytest.raises(RuntimeError, match="failed snapshot"),
    ):
        publish(engine=ranking_db, inputs=inputs)
    with Session(ranking_db) as session:
        config = session.get_one(RankingConversationConfig, fixture.config_id)
        assert config.current_ranking_score_id is None
        assert config.processed_scoring_input_revision == -1
        assert (
            session.scalars(
                select(ComparisonUserEntityScore).where(
                    ComparisonUserEntityScore.comparison_response_id == fixture.result_id
                )
            ).first()
            is None
        )
    assert publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id].status == "published"


def test_publication_holds_invalidation_lock_until_commit(
    ranking_db: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    fixture = seed_ranking(ranking_db)
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    blocked = False

    def write_with_concurrent_edit(
        connection: Connection,
        *,
        conversation_ids: list[int],
        results: dict[int, tuple[list[ScoredEntity], dict[str, int]]],
        user_scores: Sequence[UserScoreEntry],
        inputs: ScoringInputs,
    ) -> dict[int, int]:
        nonlocal blocked
        with (
            pytest.raises(OperationalError, match="lock timeout"),
            ranking_db.begin() as editing,
        ):
            editing.exec_driver_sql("SET LOCAL lock_timeout = '100ms'")
            editing.execute(
                update(ComparisonAnswer)
                .where(ComparisonAnswer.comparison_response_id == fixture.result_id)
                .values(best_slug_id=fixture.slugs[-1], worst_slug_id=fixture.slugs[0])
            )
        blocked = True
        return {}

    monkeypatch.setattr(scoring_db, "_write_scores_batch", write_with_concurrent_edit)
    assert publish(engine=ranking_db, inputs=inputs)[fixture.conversation_id].status == "published"
    assert blocked


def test_display_backfill_preserves_raw_values_and_does_not_guess_old_checkpoints(
    ranking_db: Engine,
) -> None:
    fixture = seed_ranking(ranking_db)
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    append_comparison(engine=ranking_db, fixture=fixture, position=1)
    publish(engine=ranking_db, inputs=capture(engine=ranking_db, fixtures=[fixture]))
    with Session(ranking_db) as session, session.begin():
        snapshots = session.scalars(
            select(RankingConversationStatsSnapshot)
            .where(RankingConversationStatsSnapshot.conversation_id == fixture.conversation_id)
            .order_by(RankingConversationStatsSnapshot.id)
        ).all()
        old_id, current_id = snapshots[0].id, snapshots[-1].id
        raw_rows = session.execute(
            select(RankingScoreEntity.id, RankingScoreEntity.score)
            .join(RankingScore, RankingScore.id == RankingScoreEntity.ranking_score_id)
            .where(RankingScore.conversation_id == fixture.conversation_id)
        ).all()
        raw_before = {row.id: row.score for row in raw_rows}
        session.execute(
            update(RankingScoreEntity)
            .where(RankingScoreEntity.id.in_(list(raw_before)))
            .values(display_score=None)
        )
        session.execute(
            update(ComparisonUserEntityScore)
            .where(ComparisonUserEntityScore.comparison_response_id == fixture.result_id)
            .values(display_score=None)
        )
        for snapshot in snapshots:
            snapshot.ranking_score_id = None
        session.execute(
            update(RankingConversationStatsItem)
            .where(RankingConversationStatsItem.conversation_id == fixture.conversation_id)
            .values(score=(3 - RankingConversationStatsItem.rank) / 2)
        )
    result = backfill_display_scores(engine=ranking_db, batch_size=2)
    assert result["ranking_score_entity"] >= 6
    with Session(ranking_db) as session:
        assert session.get_one(RankingConversationStatsSnapshot, old_id).ranking_score_id is None
        config = session.get_one(RankingConversationConfig, fixture.config_id)
        assert (
            session.get_one(RankingConversationStatsSnapshot, current_id).ranking_score_id
            == config.current_ranking_score_id
        )
        for row_id, raw in raw_before.items():
            row = session.get_one(RankingScoreEntity, row_id)
            assert row.score == raw
            assert row.display_score is not None
        legacy_top = session.scalar(
            select(RankingConversationStatsItem.score).where(
                RankingConversationStatsItem.stats_snapshot_id == old_id,
                RankingConversationStatsItem.rank == 1,
            )
        )
        current_top = session.scalar(
            select(RankingConversationStatsItem.score).where(
                RankingConversationStatsItem.stats_snapshot_id == current_id,
                RankingConversationStatsItem.rank == 1,
            )
        )
        assert legacy_top == 1.0
        assert current_top == 0.5
    again = backfill_display_scores(engine=ranking_db, batch_size=2)
    assert again["ranking_score_entity"] == 0
    assert again["comparison_user_entity_score"] == 0
    assert again["current_snapshots_linked"] == 0
