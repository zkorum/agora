from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING
from uuid import uuid4

import pytest
from sqlalchemy import delete, event, insert, select, update
from sqlalchemy.orm import Session
from testcontainers.community.postgres import PostgresContainer

from import_worker.database import create_primary_engine
from import_worker.generated_import_contracts import FailureReason
from import_worker.generated_models import (
    AnalysisWorkState,
    Conversation,
    ConversationContent,
    ConversationImport,
    DirectoryVisibility,
    ImportStatusEnum,
    Notification,
    NotificationImport,
    OpinionGroupSpec,
    PolisConversationConfig,
    Project,
    User,
)
from import_worker.importer import (
    ImportIdentity,
    cleanup_stale_imports,
    complete_ready_imports,
    heartbeat_imports,
    mark_import_failed,
    process_import_request,
)
from import_worker.queue import (
    IMPORT_REQUEST_ADAPTER,
    JSON_ADAPTER,
    ImportNotificationEvent,
    serialize_import_event,
)

if TYPE_CHECKING:
    from collections.abc import Generator

    from sqlalchemy.engine import Engine

    from import_worker.queue import ImportRequest


@pytest.fixture(scope="module")
def engine() -> Generator[Engine]:
    with PostgresContainer("postgres:16-alpine", driver="psycopg") as container:
        engine = create_primary_engine(container.get_connection_url())
        # Exercise the real constraints/defaults, which generated ORM models do
        # not fully reproduce, rather than defining a parallel test schema.
        migrations = Path(__file__).resolve().parents[2] / "api" / "database" / "flyway"
        paths = sorted(
            migrations.glob("V*.sql"),
            key=lambda path: tuple(int(part) for part in path.name.split("__")[0][1:].split(".")),
        )
        for path in paths:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    path.read_text(), execution_options={"no_parameters": True}
                )
        try:
            yield engine
        finally:
            engine.dispose()


@pytest.fixture
def session(engine: Engine) -> Generator[Session]:
    with Session(engine) as session:
        session.execute(delete(NotificationImport))
        session.execute(delete(Notification))
        session.execute(delete(ConversationImport))
        session.commit()
        yield session


def seed_import(
    session: Session,
    *,
    slug_id: str,
    age: timedelta,
    heartbeat_age: timedelta | None = None,
    with_conversation: bool = False,
    status: ImportStatusEnum = ImportStatusEnum.processing,
) -> int | None:
    user_id = uuid4()
    now = datetime.now(UTC).replace(tzinfo=None)
    session.execute(
        insert(User).values(id=user_id, username=f"test{user_id.hex[:12]}"),
    )
    conversation_id = create_conversation(session) if with_conversation else None
    session.execute(
        insert(ConversationImport).values(
            slug_id=slug_id,
            user_id=user_id,
            conversation_id=conversation_id,
            status=status,
            created_at=now - age,
            updated_at=now - (heartbeat_age if heartbeat_age is not None else age),
        ),
    )
    session.commit()
    return conversation_id


def create_conversation(session: Session) -> int:
    project_id = session.scalars(
        insert(Project)
        .values(
            slug=f"import-lifecycle-{uuid4().hex[:8]}",
            title="Import lifecycle",
            directory_visibility=DirectoryVisibility.unlisted,
        )
        .returning(Project.id)
    ).one()
    config_id = session.scalars(
        insert(PolisConversationConfig).returning(PolisConversationConfig.id)
    ).one()
    conversation_id = session.scalars(
        insert(Conversation)
        .values(
            slug_id=uuid4().hex[:8],
            project_id=project_id,
            polis_config_id=config_id,
            is_importing=True,
        )
        .returning(Conversation.id)
    ).one()
    content_id = session.scalars(
        insert(ConversationContent)
        .values(
            conversation_id=conversation_id,
            title="Imported conversation",
        )
        .returning(ConversationContent.id)
    ).one()
    session.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(
            current_content_id=content_id,
        )
    )
    return conversation_id


def test_cleanup_times_out_abandoned_ingestion(session: Session) -> None:
    conversation_id = seed_import(
        session,
        slug_id="orphan01",
        age=timedelta(hours=24),
    )

    events = cleanup_stale_imports(session, stale_threshold_ms=300_000)

    assert [event.import_slug_id for event in events] == ["orphan01"]
    row = session.execute(select(ConversationImport)).scalar_one()
    assert row.status == ImportStatusEnum.failed
    assert row.failure_reason == "timeout"
    assert row.conversation_id == conversation_id
    assert cleanup_stale_imports(session, stale_threshold_ms=300_000) == []
    assert len(session.scalars(select(Notification)).all()) == 1


def test_writer_verification_rejects_a_read_only_connection(engine: Engine) -> None:
    url = engine.url.update_query_dict({"options": "-c default_transaction_read_only=on"})
    with pytest.raises(ValueError, match="read-only"):
        create_primary_engine(url.render_as_string(hide_password=False))


def test_processing_failure_persists_a_timezone_aware_notification(session: Session) -> None:
    seed_import(session, slug_id="failure1", age=timedelta(seconds=10))

    user_id = session.scalars(select(ConversationImport.user_id)).one()
    event = mark_import_failed(
        session,
        import_slug_id="failure1",
        user_id=user_id,
        failure_reason=FailureReason.processing_error,
    )

    assert event is not None
    assert event.notification_created_at.tzinfo is not None
    assert event.failure_reason == FailureReason.processing_error
    assert session.scalars(select(ConversationImport.status)).one() == ImportStatusEnum.failed
    assert len(session.scalars(select(Notification)).all()) == 1


def test_wrong_actor_cannot_start_heartbeat_or_fail_another_import(session: Session) -> None:
    seed_import(session, slug_id="private1", age=timedelta(minutes=1))
    before = session.scalars(select(ConversationImport.updated_at)).one()
    actor_id = uuid4()
    request = IMPORT_REQUEST_ADAPTER.validate_python(
        {
            "type": "url",
            "importSlugId": "private1",
            "userId": str(actor_id),
            "actorUserId": str(actor_id),
            "projectId": 1,
            "didWrite": "did:test:import",
            "polisUrl": "https://pol.is/test",
            "formData": {
                "participationMode": "guest",
                "isIndexed": True,
                "languageTargetPolicy": {
                    "source": "conversation_override",
                    "dynamicTranslationEnabled": False,
                    "manualTargetLanguageCodes": [],
                },
            },
        }
    )

    assert process_import_request(session, request=request, polis_fetch_timeout_seconds=30) is None
    heartbeat_imports(
        session, imports=frozenset({ImportIdentity(slug_id="private1", user_id=actor_id)})
    )
    assert (
        mark_import_failed(
            session,
            import_slug_id="private1",
            user_id=actor_id,
            failure_reason=FailureReason.processing_error,
        )
        is None
    )

    row = session.scalars(select(ConversationImport)).one()
    assert row.status == ImportStatusEnum.processing
    assert row.updated_at == before
    assert session.scalars(select(Notification)).all() == []


def test_cleanup_protects_live_ingestion_but_enforces_its_hard_deadline(session: Session) -> None:
    seed_import(session, slug_id="active01", age=timedelta(minutes=10))
    seed_import(session, slug_id="hung0001", age=timedelta(hours=2))
    seed_import(
        session, slug_id="orphan01", age=timedelta(minutes=20), heartbeat_age=timedelta(minutes=10)
    )
    seed_import(session, slug_id="queued01", age=timedelta(minutes=10))
    seed_import(session, slug_id="fresh001", age=timedelta(seconds=10))
    seed_import(session, slug_id="waiting1", age=timedelta(minutes=10), with_conversation=True)

    active_imports = frozenset(
        ImportIdentity(slug_id=slug_id, user_id=user_id)
        for slug_id, user_id in session.execute(
            select(
                ConversationImport.slug_id,
                ConversationImport.user_id,
            ).where(ConversationImport.slug_id.in_(["active01", "hung0001"]))
        ).tuples()
    )
    heartbeat_imports(session, imports=active_imports)
    events = cleanup_stale_imports(
        session,
        stale_threshold_ms=300_000,
    )

    assert {event.import_slug_id for event in events} == {"hung0001", "orphan01"}
    remaining = session.scalars(
        select(ConversationImport.slug_id).where(ConversationImport.status == "processing"),
    ).all()
    assert set(remaining) == {"active01", "fresh001", "waiting1", "queued01"}
    # A second worker sees the heartbeat and must not classify active01 as lost.
    assert cleanup_stale_imports(session, stale_threshold_ms=300_000) == []


def test_cleanup_skips_imports_locked_by_another_worker(engine: Engine, session: Session) -> None:
    seed_import(session, slug_id="locked01", age=timedelta(hours=24))
    seed_import(session, slug_id="free0001", age=timedelta(hours=24))

    def cleanup_on_another_connection() -> list[ImportNotificationEvent]:
        with Session(engine) as cleanup_session:
            return cleanup_stale_imports(cleanup_session, stale_threshold_ms=300_000)

    with ThreadPoolExecutor(max_workers=1) as executor, Session(engine) as locking_session:
        locking_session.execute(
            select(ConversationImport.id)
            .where(ConversationImport.slug_id == "locked01")
            .with_for_update()
        )
        events = executor.submit(cleanup_on_another_connection).result(timeout=3)
        assert [event.import_slug_id for event in events] == ["free0001"]

    events = cleanup_stale_imports(session, stale_threshold_ms=300_000)
    assert [event.import_slug_id for event in events] == ["locked01"]


def test_unready_imports_do_not_cause_per_import_readiness_queries(
    engine: Engine,
    session: Session,
) -> None:
    for index in range(8):
        seed_import(session, slug_id=f"pending{index}", age=timedelta(minutes=1))
    query_count = 0

    def count_queries(*_arguments: object) -> None:
        nonlocal query_count
        query_count += 1

    event.listen(engine, "before_cursor_execute", count_queries)
    try:
        assert complete_ready_imports(session) == []
    finally:
        event.remove(engine, "before_cursor_execute", count_queries)
    assert query_count <= 2


def test_cleanup_preserves_old_ready_imports_across_completion_batches(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("import_worker.importer.IMPORT_LIFECYCLE_BATCH_SIZE", 1)
    for index in range(2):
        seed_import(
            session, slug_id=f"ready00{index}", age=timedelta(hours=24), with_conversation=True
        )
    assert len(complete_ready_imports(session)) == 1
    assert cleanup_stale_imports(session, stale_threshold_ms=300_000) == []
    assert len(complete_ready_imports(session)) == 1
    assert session.scalars(select(ConversationImport.status)).all() == [
        ImportStatusEnum.completed,
        ImportStatusEnum.completed,
    ]


@pytest.mark.parametrize("analysis_state", ["completed", "non_retryable", "stale", "missing"])
def test_saved_imports_publish_independently_of_analysis_state(
    session: Session,
    analysis_state: str,
) -> None:
    conversation_id = seed_import(
        session,
        slug_id="states01",
        age=timedelta(minutes=1),
        with_conversation=True,
    )
    config_id = session.scalars(
        select(PolisConversationConfig.id)
        .join(
            Conversation,
            Conversation.polis_config_id == PolisConversationConfig.id,
        )
        .where(Conversation.id == conversation_id)
    ).one()
    session.execute(
        update(PolisConversationConfig)
        .where(
            PolisConversationConfig.id == config_id,
        )
        .values(analysis_data_generation=2)
    )
    spec_ids = session.scalars(
        select(OpinionGroupSpec.id).order_by(
            OpinionGroupSpec.version.desc(),
            OpinionGroupSpec.id.desc(),
        )
    ).all()
    assert spec_ids
    session.execute(
        insert(AnalysisWorkState).values(
            [
                {
                    "conversation_id": conversation_id,
                    "opinion_group_spec_id": spec_id,
                    "last_completed_data_generation": 2
                    if analysis_state in {"completed", "missing"}
                    else 0,
                    "non_retryable_generation": 2 if analysis_state == "non_retryable" else 1,
                }
                for spec_id in spec_ids
            ]
        )
    )
    if analysis_state == "missing":
        session.execute(
            delete(AnalysisWorkState).where(
                AnalysisWorkState.conversation_id == conversation_id,
                AnalysisWorkState.opinion_group_spec_id == spec_ids[0],
            )
        )
    session.commit()

    events = complete_ready_imports(session)

    assert len(events) == 1
    assert (
        session.scalars(
            select(Conversation.is_importing).where(
                Conversation.id == conversation_id,
            )
        ).one()
        is False
    )


@pytest.mark.parametrize("expired", [False, True])
def test_ready_imports_including_old_ones_recover_before_cleanup_and_are_idempotent(
    session: Session,
    expired: bool,
) -> None:
    conversation_id = seed_import(
        session,
        slug_id="ready001",
        age=timedelta(hours=24) if expired else timedelta(minutes=1),
        with_conversation=True,
    )
    assert conversation_id is not None
    events = complete_ready_imports(session)

    assert len(events) == 1
    row = session.scalars(select(ConversationImport)).one()
    assert row.status == ImportStatusEnum.completed
    assert (
        session.scalars(
            select(Conversation.is_importing).where(
                Conversation.id == conversation_id,
            )
        ).one()
        is False
    )
    assert complete_ready_imports(session) == []
    assert cleanup_stale_imports(session, stale_threshold_ms=300_000) == []
    if events:
        payload = JSON_ADAPTER.validate_json(serialize_import_event(events[0]))
        assert isinstance(payload, dict)
        assert "failureReason" not in payload
        assert payload["broadcastNewConversation"] is True


@pytest.fixture
def csv_request(session: Session) -> ImportRequest:
    seed_import(session, slug_id="zero0001", age=timedelta(seconds=10))
    user_id = session.scalars(select(ConversationImport.user_id)).one()
    project_id = session.scalars(
        insert(Project)
        .values(
            slug=f"zero-vote-{uuid4().hex[:8]}",
            title="Zero votes",
            directory_visibility=DirectoryVisibility.unlisted,
        )
        .returning(Project.id)
    ).one()
    session.commit()
    return IMPORT_REQUEST_ADAPTER.validate_python(
        {
            "type": "csv",
            "importSlugId": "zero0001",
            "userId": str(user_id),
            "actorUserId": str(user_id),
            "projectId": project_id,
            "didWrite": "did:test:import",
            "formData": {
                "participationMode": "guest",
                "isIndexed": True,
                "aiLabelingEnabled": False,
                "preferredOpinionGroupCount": None,
                "languageTargetPolicy": {
                    "source": "conversation_override",
                    "dynamicTranslationEnabled": False,
                    "manualTargetLanguageCodes": [],
                },
            },
            "files": {
                "summaryFile": "topic,An empty vote matrix\nvoters,1\nvoters-in-conv,1\n"
                "commenters,1\ncomments,1\ngroups,0\nconversation-description,Body\n",
                "commentsFile": "timestamp,datetime,comment-id,author-id,agrees,"
                "disagrees,moderated,"
                "comment-body\n1,2024-01-01,10,7,1,0,-1,We need better public transport\n",
                "votesFile": "timestamp,datetime,comment-id,voter-id,vote\n1,2024-01-01,10,7,1\n",
            },
        }
    )


def test_import_without_eligible_votes_publishes_before_analysis(
    session: Session,
    csv_request: ImportRequest,
) -> None:
    result = process_import_request(session, request=csv_request, polis_fetch_timeout_seconds=30)

    assert result is not None
    assert result.analysis_schedule is not None
    row = session.scalars(select(ConversationImport)).one()
    assert row.conversation_id == result.analysis_schedule.conversation_id
    assert row.status == ImportStatusEnum.completed
    assert (
        session.scalars(
            select(Conversation.is_importing).where(
                Conversation.id == row.conversation_id,
            )
        ).one()
        is False
    )
    assert result.notification.conversation_id == row.conversation_id
    # A duplicate delivery must not fail a completed import or ingest it again.
    assert (
        process_import_request(session, request=csv_request, polis_fetch_timeout_seconds=30) is None
    )
    assert session.scalars(select(ConversationImport.status)).one() == ImportStatusEnum.completed


def test_lost_commit_acknowledgement_cannot_discard_a_published_import(
    session: Session,
    csv_request: ImportRequest,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    commit = session.commit
    acknowledgement_lost = False

    def commit_with_lost_acknowledgement() -> None:
        nonlocal acknowledgement_lost
        commit()
        status = session.scalars(select(ConversationImport.status)).one()
        if status == ImportStatusEnum.completed and not acknowledgement_lost:
            acknowledgement_lost = True
            raise ConnectionError("simulated lost commit acknowledgement")

    monkeypatch.setattr(session, "commit", commit_with_lost_acknowledgement)
    with pytest.raises(ConnectionError, match="simulated lost commit acknowledgement"):
        process_import_request(session, request=csv_request, polis_fetch_timeout_seconds=30)

    row = session.scalars(select(ConversationImport)).one()
    assert row.status == ImportStatusEnum.completed
    conversation = session.scalars(
        select(Conversation).where(Conversation.id == row.conversation_id)
    ).one()
    assert conversation.is_importing is False
    assert conversation.current_content_id is not None


@pytest.mark.parametrize("terminal_status", [ImportStatusEnum.completed, ImportStatusEnum.failed])
def test_late_failure_cannot_overwrite_a_terminal_state(
    session: Session,
    terminal_status: ImportStatusEnum,
) -> None:
    seed_import(session, slug_id="terminal", age=timedelta(hours=24), status=terminal_status)
    user_id = session.scalars(select(ConversationImport.user_id)).one()
    if terminal_status == "failed":
        session.execute(update(ConversationImport).values(failure_reason="timeout"))
        session.commit()

    assert (
        mark_import_failed(
            session,
            import_slug_id="terminal",
            user_id=user_id,
            failure_reason=FailureReason.processing_error,
        )
        is None
    )
    row = session.execute(select(ConversationImport)).scalar_one()
    assert row.status == terminal_status
    assert row.failure_reason == ("timeout" if terminal_status == "failed" else None)
    assert session.scalars(select(Notification)).all() == []
