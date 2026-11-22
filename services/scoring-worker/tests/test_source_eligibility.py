from datetime import datetime
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from scoring_worker.db import fetch_ranking_items_batch
from scoring_worker.generated_models import (
    Base,
    RankingItem,
    RankingItemContent,
    RankingItemExternalSource,
    RankingItemLifecycleStatus,
    User,
)


@pytest.mark.parametrize(
    ("seed", "owner_deleted", "owner_erased", "deleted", "hidden", "eligible"),
    [
        (False, False, False, False, False, True),
        (False, True, False, False, False, False),
        (False, False, True, False, True, False),
        (True, True, False, False, False, True),
        (True, False, True, False, False, True),
        (True, False, True, True, False, False),
        (False, False, False, False, True, False),
    ],
)
def test_scoring_sources_respect_account_hiding_and_ownerless_seeds(
    *,
    seed: bool,
    owner_deleted: bool,
    owner_erased: bool,
    deleted: bool,
    hidden: bool,
    eligible: bool,
) -> None:
    engine = create_engine("sqlite://")
    now = datetime(2026, 10, 31)
    owner = uuid4()
    tables = [
        Base.metadata.tables[model.__tablename__]
        for model in (
            User,
            RankingItem,
            RankingItemContent,
            RankingItemExternalSource,
        )
    ]
    try:
        Base.metadata.create_all(engine, tables=tables)
        with Session(engine) as session:
            if not owner_erased:
                session.add(
                    User(
                        id=owner,
                        polis_participant_id=1,
                        username="source-owner",
                        is_deleted=owner_deleted,
                        created_at=now,
                        updated_at=now,
                    )
                )
            session.add(
                RankingItem(
                    id=1,
                    slug_id="source01",
                    author_id=None if owner_erased else owner,
                    conversation_id=1,
                    current_content_id=1,
                    is_seed=seed,
                    lifecycle_status=RankingItemLifecycleStatus.active,
                    deleted_at=now if deleted else None,
                    account_hidden_at=now if hidden else None,
                    created_at=now,
                    updated_at=now,
                )
            )
            session.add(
                RankingItemContent(
                    id=1,
                    ranking_item_id=1,
                    conversation_content_id=1,
                    title="Statement",
                    created_at=now,
                )
            )
            session.commit()
        result = fetch_ranking_items_batch(engine, conversation_ids=[1])
        assert len(result[1]) == int(eligible)
    finally:
        engine.dispose()
