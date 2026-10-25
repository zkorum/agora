import os
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateSchema, DropSchema

from agora_analysis_worker_shared.db import fetch_latest_lineage_groups_by_scope
from agora_analysis_worker_shared.generated_models import (
    AnalysisSnapshotOpinion,
    Base,
    OpinionGroup,
    OpinionGroupLineageScope,
    OpinionGroupOpinionStats,
    VoteEnumSimple,
)
from agora_analysis_worker_shared.lineage_matching import PreviousLineageGroup
from agora_analysis_worker_shared.postgres_engine import create_postgres_engine

NOW = datetime(2026, 10, 25, tzinfo=UTC)


@pytest.fixture
def engine() -> Iterator[Engine]:
    dsn = os.getenv("AGORA_TEST_POSTGRES_DSN")
    if dsn is None:
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine)
        try:
            yield engine
        finally:
            engine.dispose()
        return

    schema = f"previous_lineage_test_{uuid.uuid4().hex}"
    admin = create_postgres_engine(dsn)
    with admin.begin() as connection:
        connection.execute(CreateSchema(schema))
    url = make_url(dsn).update_query_dict({"options": f"-c search_path={schema}"})
    engine = create_engine(url.set(drivername="postgresql+psycopg"))
    try:
        Base.metadata.create_all(engine)
        yield engine
    finally:
        engine.dispose()
        with admin.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        admin.dispose()


def add_group(
    session: Session,
    *,
    group_id: int,
    scope_id: int,
    candidate_id: int,
    lineage_id: int | None,
    representative: VoteEnumSimple | None = VoteEnumSimple.agree,
) -> None:
    session.add(
        OpinionGroup(
            id=group_id,
            candidate_id=candidate_id,
            scope_id=scope_id,
            lineage_id=lineage_id,
            key=str(group_id),
            external_id=group_id,
            num_users=1,
            created_at=NOW,
        )
    )
    session.add(
        AnalysisSnapshotOpinion(
            id=group_id,
            analysis_snapshot_id=candidate_id,
            opinion_id=1000 + group_id,
            local_opinion_index=0,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupOpinionStats(
            group_id=group_id,
            analysis_snapshot_opinion_id=group_id,
            representative_agreement_type=representative,
            representative_probability_agreement=0.9 if representative is not None else None,
            representative_number_agreement=1 if representative is not None else None,
            raw_repness={} if representative is not None else None,
            created_at=NOW,
        )
    )


def test_latest_assigned_candidate_keeps_all_groups_and_ignores_other_scopes(
    engine: Engine,
) -> None:
    with Session(engine) as session:
        session.add_all(
            OpinionGroupLineageScope(
                id=scope_id,
                conversation_id=10,
                opinion_group_variant_id=scope_id,
                created_at=NOW,
            )
            for scope_id in (1, 2, 3, 4)
        )
        add_group(session, group_id=1, scope_id=1, candidate_id=10, lineage_id=101)
        add_group(session, group_id=2, scope_id=1, candidate_id=20, lineage_id=102)
        add_group(
            session,
            group_id=3,
            scope_id=1,
            candidate_id=20,
            lineage_id=103,
            representative=VoteEnumSimple.disagree,
        )
        add_group(session, group_id=4, scope_id=1, candidate_id=30, lineage_id=None)
        add_group(session, group_id=5, scope_id=2, candidate_id=40, lineage_id=None)
        add_group(session, group_id=6, scope_id=4, candidate_id=50, lineage_id=104)
        session.commit()

        selected = fetch_latest_lineage_groups_by_scope(session, scope_ids=[1, 2, 3, 1])

    assert set(selected) == {1}
    assert sorted(selected[1], key=lambda group: group.lineage_id) == [
        PreviousLineageGroup(
            lineage_id=102,
            representative_opinions=frozenset({(1002, "agree")}),
            candidate_id=20,
        ),
        PreviousLineageGroup(
            lineage_id=103,
            representative_opinions=frozenset({(1003, "disagree")}),
            candidate_id=20,
        ),
    ]


def test_latest_candidate_without_representatives_does_not_fall_back_to_history(
    engine: Engine,
) -> None:
    with Session(engine) as session:
        session.add(
            OpinionGroupLineageScope(
                id=1, conversation_id=10, opinion_group_variant_id=1, created_at=NOW
            )
        )
        add_group(session, group_id=1, scope_id=1, candidate_id=10, lineage_id=101)
        add_group(
            session,
            group_id=2,
            scope_id=1,
            candidate_id=20,
            lineage_id=102,
            representative=None,
        )
        session.commit()

        assert fetch_latest_lineage_groups_by_scope(session, scope_ids=[1]) == {}
        assert fetch_latest_lineage_groups_by_scope(session, scope_ids=[]) == {}
