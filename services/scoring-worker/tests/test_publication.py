from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import UTC, datetime
from json import dumps
from pathlib import Path
from typing import TYPE_CHECKING
from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine, func, insert, select, update
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from testcontainers.postgres import PostgresContainer

from scoring_worker import db as scoring_db
from scoring_worker.db import (
    PublicationCallback,
    ScoredEntity,
    ScoringInputs,
    ScoringPublication,
    UserScoreEntry,
    fetch_scoring_inputs,
    persist_scoring_batch,
)
from scoring_worker.display_scores import squash_display_scores
from scoring_worker.generated_models import (
    Conversation,
    ConversationContent,
    ConversationType,
    DirectoryVisibility,
    MaxdiffComparison,
    MaxdiffResult,
    MaxdiffUserEntityScore,
    Project,
    RankingConversationConfig,
    RankingConversationStatsItem,
    RankingConversationStatsSnapshot,
    RankingItem,
    RankingItemContent,
    RankingItemLifecycleStatus,
    RankingMode,
    RankingScore,
    RankingScoreEntity,
    RealtimeEventOutbox,
    SurveyConfig,
    User,
)
from scripts.backfill_display_scores import backfill_display_scores

if TYPE_CHECKING:
    from collections.abc import Generator

    from sqlalchemy import Connection, Engine


def migration_version(path: Path) -> tuple[int, ...]:
    return tuple(int(part) for part in path.name.split("__")[0][1:].split("."))


@pytest.fixture(scope="module")
def ranking_db() -> Generator[Engine]:
    # Exercise the real constraints and trigger migrations, not a test-only schema.
    migrations = Path(__file__).resolve().parents[2] / "api" / "database" / "flyway"
    container = PostgresContainer("postgres:16-alpine", driver="psycopg")
    container.start()
    try:
        engine = create_engine(container.get_connection_url(), hide_parameters=True)
        try:
            for path in sorted(migrations.glob("V*.sql"), key=migration_version):
                with engine.begin() as connection:
                    connection.exec_driver_sql(
                        path.read_text(), execution_options={"no_parameters": True}
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
                conversation_type=ConversationType.ranking,
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
            insert(MaxdiffResult)
            .values(participant_id=user_id, conversation_id=conversation_id, comparisons=[])
            .returning(MaxdiffResult.id)
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
            insert(MaxdiffComparison).values(
                maxdiff_result_id=fixture.result_id,
                position=position,
                best_slug_id=fixture.slugs[0],
                worst_slug_id=fixture.slugs[-1],
                candidate_set=fixture.slugs,
            )
        )


def capture(*, engine: Engine, fixtures: list[RankingFixture]) -> ScoringInputs:
    with engine.connect() as connection:
        return fetch_scoring_inputs(
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
            for index, item in enumerate(items)
            if item.lifecycle_status == RankingItemLifecycleStatus.active
        ]
        for cid, items in inputs.ranking_items.items()
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
                    maxdiff_result_id=result_id,
                    entity_slug_id=entity.entity_slug_id,
                    score=entity.score,
                    display_score=entity.display_score,
                    uncertainty_left=0.1,
                    uncertainty_right=0.1,
                )
                for cid, result_ids in inputs.comparisons.user_idx_to_result_id.items()
                for result_id in result_ids.values()
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
        assert config.processed_scoring_input_revision == old.revisions[cid]
        assert snapshot.ranking_score_id == config.current_ranking_score_id
        assert config.scoring_input_revision > old.revisions[cid]
        assert snapshot.scoring_input_revision == old.revisions[cid]
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
                    select(MaxdiffUserEntityScore).where(
                        MaxdiffUserEntityScore.maxdiff_result_id == fixture.result_id
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


def test_new_participant_does_not_invalidate_captured_votes(ranking_db: Engine) -> None:
    fixture = seed_ranking(ranking_db)
    inputs = capture(engine=ranking_db, fixtures=[fixture])
    user_id = uuid4()
    with ranking_db.begin() as connection:
        connection.execute(insert(User).values(id=user_id, username=f"test-{user_id.hex[:8]}"))
        result_id = connection.execute(
            insert(MaxdiffResult)
            .values(participant_id=user_id, conversation_id=fixture.conversation_id, comparisons=[])
            .returning(MaxdiffResult.id)
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
            insert(MaxdiffResult).returning(MaxdiffResult.id),
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
            insert(MaxdiffComparison),
            [
                {
                    "maxdiff_result_id": result_id,
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
            .select_from(MaxdiffUserEntityScore)
            .join(MaxdiffResult, MaxdiffResult.id == MaxdiffUserEntityScore.maxdiff_result_id)
            .where(MaxdiffResult.conversation_id == fixture.conversation_id)
        )
        assert count == (len(user_ids) + 1) * len(fixture.slugs)


@pytest.mark.parametrize("change", ["edit", "remove", "item", "user", "close", "survey"])
def test_invalidations_reject_old_computation(ranking_db: Engine, change: str) -> None:
    fixture = seed_ranking(ranking_db)
    old = capture(engine=ranking_db, fixtures=[fixture])
    with ranking_db.begin() as connection:
        if change == "edit":
            connection.execute(
                update(MaxdiffComparison)
                .where(MaxdiffComparison.maxdiff_result_id == fixture.result_id)
                .values(best_slug_id=fixture.slugs[-1], worst_slug_id=fixture.slugs[0])
            )
        elif change == "remove":
            connection.execute(
                update(MaxdiffComparison)
                .where(MaxdiffComparison.maxdiff_result_id == fixture.result_id)
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
            assert snapshot.scoring_input_revision == inputs.revisions[conversation_id]
        observed.append(conversation_id)

    publish(engine=ranking_db, inputs=inputs, on_publication=observe)
    assert observed == sorted(inputs.revisions)


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
    assert len(inputs.comparisons.comparisons[fixture.conversation_id]) == 1
    assert inputs.comparisons.total_vote_count_by_conversation[fixture.conversation_id] == 1
    current = capture(engine=ranking_db, fixtures=[fixture])
    assert len(current.comparisons.comparisons[fixture.conversation_id]) == 2
    assert current.revisions[fixture.conversation_id] > inputs.revisions[fixture.conversation_id]


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
                select(MaxdiffUserEntityScore).where(
                    MaxdiffUserEntityScore.maxdiff_result_id == fixture.result_id
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
        user_scores: list[UserScoreEntry] | None = None,
    ) -> dict[int, int]:
        nonlocal blocked
        with (
            pytest.raises(OperationalError, match="lock timeout"),
            ranking_db.begin() as editing,
        ):
            editing.exec_driver_sql("SET LOCAL lock_timeout = '100ms'")
            editing.execute(
                update(MaxdiffComparison)
                .where(MaxdiffComparison.maxdiff_result_id == fixture.result_id)
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
            update(MaxdiffUserEntityScore)
            .where(MaxdiffUserEntityScore.maxdiff_result_id == fixture.result_id)
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
    assert again["maxdiff_user_entity_score"] == 0
    assert again["current_snapshots_linked"] == 0
