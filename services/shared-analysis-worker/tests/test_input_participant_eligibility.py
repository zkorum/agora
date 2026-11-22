from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

import pytest
from sqlalchemy import MetaData, create_engine, select
from sqlalchemy.orm import Session

from agora_analysis_worker_shared.db import upsert_input_snapshots_batch
from agora_analysis_worker_shared.generated_models import (
    AnalysisInputParticipantEligibility,
    AnalysisInputSnapshot,
    Base,
    User,
)
from agora_analysis_worker_shared.input_snapshot import VoteInputRow, prepare_input_snapshot

if TYPE_CHECKING:
    from collections.abc import Iterator

    from sqlalchemy import Engine


@pytest.fixture
def capture_engine() -> Iterator[Engine]:
    engine = create_engine("sqlite://")
    metadata = MetaData()
    for name in ["user", "analysis_input_snapshot", "analysis_input_participant_eligibility"]:
        Base.metadata.tables[name].to_metadata(metadata)
    # SQLite does not implement the production timestamp default. Keep the
    # fixture adjustment local rather than mutating generated global metadata.
    metadata.tables["analysis_input_snapshot"].c.created_at.nullable = True
    metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


def test_new_capture_keeps_separate_eligibility_and_never_infers_legacy_or_retry_identity(
    capture_engine: Engine,
) -> None:
    engine = capture_engine
    users = [uuid4(), uuid4()]
    now = datetime(2026, 11, 15)
    with Session(engine) as session, session.begin():
        session.add_all(
            [
                User(id=user_id, username=f"user-{index}", created_at=now, updated_at=now)
                for index, user_id in enumerate(users)
            ]
        )
    snapshots = [
        prepare_input_snapshot(
            conversation_id=1,
            data_generation=1,
            rows=[
                VoteInputRow(
                    conversation_id=1,
                    data_generation=1,
                    user_id=user_id,
                    opinion_id=1,
                    opinion_content_id=1,
                    vote="agree",
                )
            ],
        )
        for user_id in users
    ]
    first = upsert_input_snapshots_batch(engine, snapshots=[snapshots[0]])[1]
    retry = upsert_input_snapshots_batch(engine, snapshots=[snapshots[1]])[1]
    assert first == retry  # Identical numerical bytes alone cannot remap identity.
    with Session(engine) as session:
        eligibility = session.scalars(select(AnalysisInputParticipantEligibility)).one()
        assert eligibility.input_snapshot_id == first.id
        assert eligibility.participant_index == 0
        assert eligibility.user_id == users[0]
        assert eligibility.is_account_hidden is False
        assert session.get_one(AnalysisInputSnapshot, first.id).payload == snapshots[0].payload


def test_large_capture_preserves_each_accounts_current_exclusion(capture_engine: Engine) -> None:
    users = [uuid4() for _ in range(1001)]
    expected = {user_id: index % 2 == 0 for index, user_id in enumerate(users)}
    now = datetime(2026, 11, 15)
    with Session(capture_engine) as session, session.begin():
        session.add_all(
            [
                User(
                    id=user_id,
                    username=f"user-{index}",
                    is_deleted=expected[user_id],
                    created_at=now,
                    updated_at=now,
                )
                for index, user_id in enumerate(users)
            ]
        )
    snapshot = prepare_input_snapshot(
        conversation_id=1,
        data_generation=1,
        rows=[
            VoteInputRow(
                conversation_id=1,
                data_generation=1,
                user_id=user_id,
                opinion_id=1,
                opinion_content_id=1,
                vote="agree",
            )
            for user_id in users
        ],
    )
    stored = upsert_input_snapshots_batch(capture_engine, snapshots=[snapshot])[1]
    with Session(capture_engine) as session:
        rows = (
            session.execute(
                select(
                    AnalysisInputParticipantEligibility.user_id,
                    AnalysisInputParticipantEligibility.is_account_hidden,
                )
            )
            .tuples()
            .all()
        )
        assert dict(rows) == expected
        assert session.get_one(AnalysisInputSnapshot, stored.id).payload == snapshot.payload
