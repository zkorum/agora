"""Run once after V0090, with the scoring worker stopped, before serving new scores."""

from __future__ import annotations

import argparse
import json
from typing import TYPE_CHECKING

from sqlalchemy import and_, create_engine, func, select, update
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from scoring_worker.config import Settings
from scoring_worker.display_scores import squash_display_scores
from scoring_worker.generated_models import (
    Conversation,
    MaxdiffUserEntityScore,
    RankingConversationConfig,
    RankingConversationStatsItem,
    RankingConversationStatsSnapshot,
    RankingItem,
    RankingScoreEntity,
)

if TYPE_CHECKING:
    from sqlalchemy import Engine


def backfill_display_scores(*, engine: Engine, batch_size: int = 500) -> dict[str, int]:
    """Fill derived scores without changing raw values, votes, ranks, or input revisions."""
    updated: dict[str, int] = {}
    for model in (RankingScoreEntity, MaxdiffUserEntityScore):
        total = 0
        with Session(engine) as session:
            upper = session.scalar(select(func.max(model.id)))
        if upper is None:
            updated[model.__tablename__] = 0
            continue
        after = 0
        while True:
            with Session(engine) as session, session.begin():
                rows = session.execute(
                    select(model.id, model.score)
                    .where(model.id > after, model.id <= upper, model.display_score.is_(None))
                    .order_by(model.id)
                    .limit(batch_size)
                    .with_for_update()
                ).all()
                if not rows:
                    break
                displayed = squash_display_scores({row.id: row.score for row in rows})
                session.execute(
                    update(model),
                    [{"id": row.id, "display_score": displayed[row.id]} for row in rows],
                )
                after = rows[-1].id
                total += len(rows)
        updated[model.__tablename__] = total

    linked = 0
    skipped = 0
    with Session(engine) as session:
        conversations = session.execute(
            select(Conversation.id, Conversation.ranking_config_id).where(
                Conversation.ranking_config_id.is_not(None)
            )
        ).all()
    for conversation in conversations:
        with Session(engine) as session, session.begin():
            config = session.scalars(
                select(RankingConversationConfig)
                .where(RankingConversationConfig.id == conversation.ranking_config_id)
                .with_for_update()
            ).one()
            if config.current_ranking_score_id is None:
                continue
            snapshot = session.scalars(
                select(RankingConversationStatsSnapshot)
                .where(RankingConversationStatsSnapshot.conversation_id == conversation.id)
                .order_by(
                    RankingConversationStatsSnapshot.created_at.desc(),
                    RankingConversationStatsSnapshot.id.desc(),
                )
                .limit(1)
            ).one_or_none()
            if snapshot is None or snapshot.ranking_score_id is not None:
                continue
            if snapshot.scoring_input_revision != config.processed_scoring_input_revision:
                skipped += 1
                continue
            scores = session.execute(
                select(
                    RankingConversationStatsItem.id,
                    RankingScoreEntity.display_score,
                )
                .join(
                    RankingItem,
                    RankingItem.id == RankingConversationStatsItem.ranking_item_id,
                )
                .join(
                    RankingScoreEntity,
                    and_(
                        RankingScoreEntity.ranking_score_id == config.current_ranking_score_id,
                        RankingScoreEntity.entity_slug_id == RankingItem.slug_id,
                    ),
                )
                .where(RankingConversationStatsItem.stats_snapshot_id == snapshot.id)
            ).all()
            if any(score.display_score is None for score in scores):
                skipped += 1
                continue
            # The current pointer and latest snapshot were published atomically.
            # Older checkpoints lack this provenance: never infer it from times or ranks.
            snapshot.ranking_score_id = config.current_ranking_score_id
            if scores:
                session.execute(
                    update(RankingConversationStatsItem),
                    [{"id": score.id, "score": score.display_score} for score in scores],
                )
            linked += 1
    updated["current_snapshots_linked"] = linked
    updated["current_snapshots_skipped"] = skipped
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch-size", type=int, default=500)
    args = parser.parse_args()
    if args.batch_size < 1:
        parser.error("--batch-size must be positive")
    settings = Settings()
    url = make_url(settings.connection_string).set(drivername="postgresql+psycopg")
    engine = create_engine(
        url,
        hide_parameters=True,
        connect_args={"options": "-c lock_timeout=5000 -c statement_timeout=30000"},
    )
    try:
        print(
            json.dumps(backfill_display_scores(engine=engine, batch_size=args.batch_size), indent=2)
        )
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
