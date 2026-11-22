from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Event
from typing import TYPE_CHECKING
from uuid import uuid4

import pytest
from sqlalchemy import MetaData, create_engine, event, func, select, update
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateSchema, DropSchema

from agora_analysis_worker_shared.db import (
    AnalysisWorkStatePersistenceError,
    ClaimedWorkItem,
    StoredInputSnapshot,
    persist_empty_vote_matrix_results_batch,
)
from agora_analysis_worker_shared.generated_models import (
    AnalysisSnapshot,
    AnalysisWorkState,
    Base,
    Conversation,
    ConversationLanguageSettingsSource,
    ConversationType,
    ConversationViewSnapshot,
    ParticipationMode,
    PolisConversationConfig,
    PolisVotingPresentation,
    RealtimeEventOutbox,
)
from agora_analysis_worker_shared.input_snapshot import prepare_input_snapshot
from agora_analysis_worker_shared.retained_inputs import LiveAnalysisResultInput

if TYPE_CHECKING:
    from collections.abc import Iterator

    from sqlalchemy import Engine


@pytest.fixture
def publication_postgres_engine() -> Iterator[Engine]:
    dsn = os.getenv("AGORA_TEST_POSTGRES_DSN")
    if dsn is None:
        pytest.skip("Set AGORA_TEST_POSTGRES_DSN to run publication lock/lease tests")
    schema = f"publication_lease_test_{uuid4().hex}"
    base = create_engine(
        dsn.replace("postgresql://", "postgresql+psycopg://", 1),
        connect_args={"options": "-c lock_timeout=5000 -c statement_timeout=10000"},
    )
    engine = base.execution_options(schema_translate_map={None: schema})
    try:
        with base.begin() as connection:
            connection.execute(CreateSchema(schema))
        metadata = MetaData()
        for table in Base.metadata.tables.values():
            table.to_metadata(metadata)
        metadata.create_all(engine)
        yield engine
    finally:
        # Only the uniquely named schema created by this fixture is disposable.
        with base.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True, if_exists=True))
        base.dispose()


def test_expired_lease_is_rejected_after_a_lock_wait_using_database_wall_clock(
    publication_postgres_engine: Engine,
) -> None:
    engine = publication_postgres_engine
    now = datetime.now(UTC)
    claim = ClaimedWorkItem(
        id=1,
        conversation_id=1,
        conversation_slug_id="lease001",
        opinion_group_spec_id=1,
        data_generation=1,
        attempt_count=1,
        lease_token="publication-lease",
        persisted_analysis_snapshot_id=None,
    )
    with Session(engine) as session, session.begin():
        session.add(
            PolisConversationConfig(
                id=1,
                analysis_data_generation=1,
                voting_presentation=PolisVotingPresentation.list,
                created_at=now,
                updated_at=now,
            )
        )
        session.add(
            Conversation(
                id=1,
                slug_id=claim.conversation_slug_id,
                project_id=1,
                polis_config_id=1,
                current_content_id=1,
                language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                participation_mode=ParticipationMode.account_required,
                conversation_type=ConversationType.polis,
                created_at=now,
                updated_at=now,
                last_reacted_at=now,
            )
        )
        session.add(
            AnalysisWorkState(
                id=claim.id,
                conversation_id=claim.conversation_id,
                opinion_group_spec_id=claim.opinion_group_spec_id,
                running_data_generation=claim.data_generation,
                lease_owner="worker",
                lease_token=claim.lease_token,
                lease_expires_at=now + timedelta(minutes=5),
                created_at=now,
                updated_at=now,
            )
        )
    waiting_for_work_lock = Event()
    prepared = prepare_input_snapshot(conversation_id=1, data_generation=1, rows=[])

    def record_lock(
        _connection: object,
        _cursor: object,
        statement: str,
        _parameters: object,
        _context: object,
        _executemany: bool,
    ) -> None:
        if "FOR UPDATE" in statement and "analysis_work_state" in statement:
            waiting_for_work_lock.set()

    def publish() -> None:
        persist_empty_vote_matrix_results_batch(
            engine,
            claims=[claim],
            stored_input_snapshots_by_conversation_id={
                1: StoredInputSnapshot(
                    id=1, conversation_id=1, data_generation=1, input_hash=prepared.input_hash
                )
            },
            inputs_by_conversation_id={1: LiveAnalysisResultInput(numerical=prepared)},
        )

    with ThreadPoolExecutor(max_workers=1) as executor:
        with Session(engine) as blocker, blocker.begin():
            blocker.execute(
                select(AnalysisWorkState.id)
                .where(AnalysisWorkState.id == claim.id)
                .with_for_update()
            ).all()
            event.listen(engine, "before_cursor_execute", record_lock)
            publishing = executor.submit(publish)
            assert waiting_for_work_lock.wait(timeout=5)
            # Expire after the publisher's transaction began, while holding the
            # lock it needs. now() would incorrectly accept the expired lease.
            blocker.execute(
                update(AnalysisWorkState)
                .where(AnalysisWorkState.id == claim.id)
                .values(lease_expires_at=func.clock_timestamp())
            )
        try:
            with pytest.raises(AnalysisWorkStatePersistenceError, match="no longer active"):
                publishing.result(timeout=10)
        finally:
            event.remove(engine, "before_cursor_execute", record_lock)
    with Session(engine) as session:
        for model in (AnalysisSnapshot, ConversationViewSnapshot, RealtimeEventOutbox):
            assert session.scalar(select(func.count()).select_from(model)) == 0
