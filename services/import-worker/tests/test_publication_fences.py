from __future__ import annotations

import os
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

import pytest
from sqlalchemy import Engine, create_engine, event, select, update
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateSchema, DropSchema

from import_worker.generated_models import (
    AnalysisWorkState,
    Base,
    Conversation,
    ConversationContent,
    ConversationImport,
    ConversationLanguageSettingsSource,
    ConversationType,
    DirectoryVisibility,
    DisplayLanguageCode,
    ImportStatusEnum,
    OpinionGroupSpec,
    Organization,
    OrganizationMembership,
    OrganizationMembershipAllProjectCapability,
    OrganizationMembershipAllProjectCapabilityEnum,
    ParticipationMode,
    PolisConversationConfig,
    PolisVotingPresentation,
    Project,
    ProjectOrganizationOwnership,
    User,
)
from import_worker.importer import complete_ready_imports, lock_import_publication_target

if TYPE_CHECKING:
    from collections.abc import Iterator

NOW = datetime(2026, 10, 30)
ACTOR = UUID(int=1)


@pytest.fixture
def engine() -> Iterator[Engine]:
    tables = [
        Base.metadata.tables[model.__tablename__]
        for model in (
            User,
            Organization,
            OrganizationMembership,
            OrganizationMembershipAllProjectCapability,
            Project,
            ProjectOrganizationOwnership,
            Conversation,
            ConversationContent,
            ConversationImport,
            PolisConversationConfig,
            OpinionGroupSpec,
            AnalysisWorkState,
        )
    ]
    dsn = os.getenv("AGORA_TEST_POSTGRES_DSN")
    if dsn is None:
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine, tables=tables)
        try:
            yield engine
        finally:
            engine.dispose()
        return
    schema = f"import_fences_{uuid4().hex}"
    url = make_url(dsn).set(drivername="postgresql+psycopg")
    admin = create_engine(url)
    with admin.begin() as connection:
        connection.execute(CreateSchema(schema))
    engine = create_engine(url.update_query_dict({"options": f"-c search_path={schema}"}))
    try:
        Base.metadata.create_all(engine, tables=tables)
        yield engine
    finally:
        engine.dispose()
        with admin.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        admin.dispose()


@pytest.fixture
def target(engine: Engine) -> None:
    with Session(engine) as session:
        session.add_all(
            [
                User(
                    id=ACTOR,
                    polis_participant_id=1,
                    username="importer",
                    created_at=NOW,
                    updated_at=NOW,
                ),
                Organization(
                    id=1,
                    slug="owner",
                    display_name="Owner",
                    default_language_code=DisplayLanguageCode.en,
                    directory_visibility=DirectoryVisibility.listed,
                    is_full_image_path=False,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                OrganizationMembership(
                    id=1,
                    user_id=ACTOR,
                    organization_id=1,
                    role="admin",
                    created_at=NOW,
                    updated_at=NOW,
                ),
                OrganizationMembershipAllProjectCapability(
                    id=1,
                    organization_membership_id=1,
                    capability=OrganizationMembershipAllProjectCapabilityEnum.conversation_create,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                Project(
                    id=1,
                    slug="project",
                    title="Project",
                    directory_visibility=DirectoryVisibility.listed,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                ProjectOrganizationOwnership(id=1, project_id=1, organization_id=1, created_at=NOW),
                ConversationImport(
                    id=1,
                    slug_id="import01",
                    user_id=ACTOR,
                    status=ImportStatusEnum.processing,
                    created_at=NOW,
                    updated_at=NOW,
                ),
            ]
        )
        session.commit()


@pytest.mark.usefixtures("target")
def test_valid_import_target_is_rechecked_under_publication_locks(engine: Engine) -> None:
    with Session(engine) as session:
        lock_import_publication_target(
            session, actor_user_id=ACTOR, project_id=1, import_slug_id="import01"
        )


@pytest.mark.parametrize(
    "revoked",
    ["account", "organization", "project", "membership", "ownership", "role", "request"],
)
@pytest.mark.usefixtures("target")
def test_delayed_import_rejects_revoked_targets(engine: Engine, revoked: str) -> None:
    with Session(engine) as session:
        if revoked == "account":
            session.execute(update(User).values(is_deleted=True))
        elif revoked == "organization":
            session.execute(update(Organization).values(deleted_at=NOW))
        elif revoked == "project":
            session.execute(update(Project).values(deleted_at=NOW))
        elif revoked == "membership":
            session.execute(update(OrganizationMembership).values(deleted_at=NOW))
        elif revoked == "ownership":
            session.execute(update(ProjectOrganizationOwnership).values(deleted_at=NOW))
        elif revoked == "role":
            session.execute(
                update(OrganizationMembership).values(role="moderator")
            )
        else:
            session.execute(update(ConversationImport).values(status=ImportStatusEnum.failed))
        session.commit()
        with pytest.raises(RuntimeError, match="no longer"):
            lock_import_publication_target(
                session, actor_user_id=ACTOR, project_id=1, import_slug_id="import01"
            )


@pytest.mark.usefixtures("target")
def test_import_does_not_hold_organization_locks_while_waiting_for_account(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        pytest.skip("PostgreSQL row locks required")
    reached_actor = threading.Event()

    def before_query(
        _connection: object,
        _cursor: object,
        statement: str,
        _parameters: object,
        _context: object,
        _executemany: bool,
    ) -> None:
        if (
            threading.current_thread().name.startswith("import-publication")
            and "FOR NO KEY UPDATE" in statement
        ):
            reached_actor.set()

    def publish() -> None:
        with Session(engine) as session:
            lock_import_publication_target(
                session, actor_user_id=ACTOR, project_id=1, import_slug_id="import01"
            )

    event.listen(engine, "before_cursor_execute", before_query)
    try:
        with (
            Session(engine) as deleting,
            ThreadPoolExecutor(max_workers=1, thread_name_prefix="import-publication") as executor,
        ):
            deleting.execute(
                select(User.id).where(User.id == ACTOR).with_for_update(key_share=True)
            )
            future = executor.submit(publish)
            try:
                assert reached_actor.wait(timeout=5)
                with Session(engine) as organization_writer:
                    assert (
                        organization_writer.scalar(
                            select(Organization.id)
                            .where(Organization.id == 1)
                            .with_for_update(nowait=True)
                        )
                        == 1
                    )
            finally:
                deleting.rollback()
            future.result(timeout=5)
    finally:
        event.remove(engine, "before_cursor_execute", before_query)


@pytest.mark.parametrize("deleted_project", [False, True])
@pytest.mark.usefixtures("target")
def test_committed_import_can_complete_without_its_requester_but_not_its_parent(
    engine: Engine, deleted_project: bool
) -> None:
    with Session(engine) as session:
        session.add_all(
            [
                PolisConversationConfig(
                    id=1,
                    voting_presentation=PolisVotingPresentation.list,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                Conversation(
                    id=1,
                    slug_id="imported",
                    project_id=1,
                    polis_config_id=1,
                    current_content_id=1,
                    language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                    participation_mode=ParticipationMode.guest,
                    conversation_type=ConversationType.polis,
                    is_importing=True,
                    created_at=NOW,
                    updated_at=NOW,
                    last_reacted_at=NOW,
                ),
                ConversationContent(id=1, conversation_id=1, title="Imported", created_at=NOW),
            ]
        )
        session.execute(
            update(ConversationImport).values(
                conversation_id=1, user_id=None, requester_purged_at=NOW
            )
        )
        if deleted_project:
            session.execute(update(Project).values(deleted_at=NOW))
        session.commit()
        assert complete_ready_imports(session) == []
        assert session.scalar(select(Conversation.is_importing)) is deleted_project
        assert session.scalar(select(ConversationImport.status)) == (
            ImportStatusEnum.processing if deleted_project else ImportStatusEnum.completed
        )
