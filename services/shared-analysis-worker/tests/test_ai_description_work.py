from __future__ import annotations

import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

import pytest
from sqlalchemy import (
    DefaultClause,
    Engine,
    MetaData,
    UniqueConstraint,
    create_engine,
    delete,
    event,
    func,
    select,
    text,
    update,
)
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import CreateSchema, DropSchema
from sqlalchemy.sql.selectable import CTE
from sqlalchemy.sql.visitors import iterate

from agora_analysis_worker_shared import ai_description_work, description_repair
from agora_analysis_worker_shared.ai_description_work import (
    AI_DESCRIPTION_NON_RETRYABLE_ERROR_CODE,
    AI_DESCRIPTION_OUTPUT_ERROR_CODE,
    AI_DESCRIPTION_RETRYABLE_ERROR_CODE,
    DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE,
    ClaimedDescriptionTranslationWorkItem,
    ClaimedLineageDescriptionWorkItem,
    EagerAiDescriptionTargetLocaleRow,
    EagerDescriptionCandidateRow,
    RequiredLineageDescriptionRow,
    TranslationWorkDemand,
    claim_ai_description_locale_work_items_batch,
    claim_first_pass_ai_description_locale_work_items_batch,
    complete_non_processable_ai_description_work_batch,
    description_translation_work_claim_batches,
    eager_ai_description_target_locales_by_candidate,
    extend_ai_description_locale_work_leases,
    fetch_claimable_ai_description_work_conversation_ids,
    finalize_first_pass_ai_description_work_batch,
    materialize_requested_description_translation_work,
    materialize_requested_lineage_description_work,
    process_ai_description_locale_work_item,
    process_description_translation_work_items_batch,
    queue_ai_description_content_updated_events,
    recover_expired_ai_description_work,
    retry_ai_description_locale_work_item,
    translation_work_demands_for_eager_candidates,
)
from agora_analysis_worker_shared.analysis_lifecycle import (
    activatable_analysis_view_ids,
    finalize_closed_analysis,
)
from agora_analysis_worker_shared.bedrock_label_summary import (
    LabelSummary,
    ParsedLabelSummaryOutput,
)
from agora_analysis_worker_shared.db import (
    ClaimedWorkItem,
    claim_work_items_batch,
    complete_computed_analysis_work_items_batch,
    extend_postgres_leases,
    fetch_claimable_work_conversation_ids,
    mark_non_retryable_work_items_batch,
    recover_expired_running_work,
)
from agora_analysis_worker_shared.description_generation import (
    DescriptionGenerationResult,
    generate_english_descriptions,
)
from agora_analysis_worker_shared.description_input import (
    ConversationDescriptionInput,
    DescriptionOutputError,
    GroupDescriptionInput,
    RepresentativeOpinionText,
)
from agora_analysis_worker_shared.description_language import EnglishDescription
from agora_analysis_worker_shared.description_repair import (
    fetch_live_descriptions,
    replace_live_description,
)
from agora_analysis_worker_shared.description_retry_processor import (
    TranslateDescriptions,
    process_ai_description_conversation_ids,
)
from agora_analysis_worker_shared.description_translation import (
    DescriptionForTranslation,
    DescriptionTranslation,
    DescriptionTranslationOutputError,
    TranslatedDescriptionText,
    TranslationFailure,
    TranslationResult,
    translation_result,
)
from agora_analysis_worker_shared.generated_models import (
    AnalysisFamilyEnum,
    AnalysisResultOutcomeEnum,
    AnalysisSnapshot,
    AnalysisSnapshotOpinion,
    AnalysisSnapshotResult,
    AnalysisSpec,
    AnalysisWorkState,
    Base,
    Conversation,
    ConversationContent,
    ConversationLanguageSettingsSource,
    ConversationTranslationTargetLanguage,
    ConversationType,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotCheckpointReasonEnum,
    ConversationViewSnapshotReasonEnum,
    DisplayLanguageCode,
    Opinion,
    OpinionContent,
    OpinionGroup,
    OpinionGroupCandidate,
    OpinionGroupCandidateAssessment,
    OpinionGroupCandidateDescriptionLocaleRequest,
    OpinionGroupCandidateHiddenReasonEnum,
    OpinionGroupClustererEnum,
    OpinionGroupDescription,
    OpinionGroupDescriptionTranslation,
    OpinionGroupDescriptionTranslationWork,
    OpinionGroupLineage,
    OpinionGroupLineageDescriptionWork,
    OpinionGroupOpinionStats,
    OpinionGroupReducerEnum,
    OpinionGroupSelectionPolicyEnum,
    OpinionGroupSpec,
    OpinionGroupVariant,
    ParticipationMode,
    PolisConversationConfig,
    PolisVotingPresentation,
    RealtimeEventOutbox,
    SpokenLanguageCode,
    User,
    VoteEnumSimple,
)
from agora_analysis_worker_shared.generated_shared_types import (
    SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES,
)
from agora_analysis_worker_shared.postgres_engine import create_postgres_engine

if TYPE_CHECKING:
    from collections.abc import Generator, Mapping, Sequence
    from typing import Literal

    from sqlalchemy import Connection, ExecutionContext

NOW = datetime(2026, 5, 21, 12, 0, 0, tzinfo=UTC)


def _create_engine() -> Engine:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def lineage_scan_engine() -> Generator[Engine]:
    dsn = os.getenv("AGORA_TEST_POSTGRES_DSN")
    if dsn is None:
        engine = _create_engine()
        try:
            yield engine
        finally:
            engine.dispose()
        return

    schema = f"lineage_scan_test_{uuid.uuid4().hex}"
    admin = create_postgres_engine(dsn)
    with admin.begin() as connection:
        connection.execute(CreateSchema(schema))
    url = make_url(dsn).update_query_dict({"options": f"-c search_path={schema}"})
    engine = create_engine(url.set(drivername="postgresql+psycopg"))
    try:
        # Generated Python models omit these production defaults and constraints.
        metadata = MetaData()
        for table in Base.metadata.tables.values():
            table.to_metadata(metadata)
        for table_name, unique_columns in (
            ("opinion_group_lineage_description_work", ("lineage_id",)),
            ("opinion_group_description_translation_work", ("description_id", "locale")),
        ):
            work_table = metadata.tables[table_name]
            for column_name in ("created_at", "updated_at"):
                work_table.c[column_name].server_default = DefaultClause(func.now())
            work_table.append_constraint(UniqueConstraint(*unique_columns))
        metadata.create_all(engine)
        yield engine
    finally:
        engine.dispose()
        with admin.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        admin.dispose()


@contextmanager
def _capture_statements(engine: Engine) -> Generator[list[str]]:
    statements: list[str] = []

    def capture(
        connection: Connection,
        cursor: object,
        statement: str,
        parameters: object,
        context: ExecutionContext,
        executemany: bool,
    ) -> None:
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", capture)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", capture)


def _seed_lineage_scan(session: Session) -> None:
    _insert_non_processable_ai_work_state(session)
    view = session.execute(select(ConversationViewSnapshot)).scalar_one()
    view.activated_at = NOW
    view.view_reason = ConversationViewSnapshotReasonEnum.conversation_content_updated
    for lineage_id in (302, 303):
        session.add(
            OpinionGroupLineage(
                id=lineage_id,
                scope_id=701,
                system_description_id=None,
                created_at=NOW,
            )
        )
        session.add(
            OpinionGroup(
                id=10_000 + lineage_id,
                candidate_id=401,
                scope_id=701,
                lineage_id=lineage_id,
                key=str(lineage_id),
                external_id=lineage_id,
                num_users=1,
                created_at=NOW,
            )
        )
    for index, locale in enumerate(DisplayLanguageCode):
        if locale == DisplayLanguageCode.fr:
            continue
        session.add(
            OpinionGroupCandidateDescriptionLocaleRequest(
                id=10_000 + index,
                candidate_id=401,
                locale=locale,
                created_at=NOW,
                updated_at=NOW,
            )
        )
    session.commit()


def test_lineage_scan_batches_unique_missing_work_without_starvation(
    lineage_scan_engine: Engine,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_lineage_scan(session)

    with _capture_statements(lineage_scan_engine) as statements:
        first = materialize_requested_lineage_description_work(
            lineage_scan_engine, limit=1, require_activated_view_snapshot=True
        )
    assert first == [10]
    # Adding every locale must not cause one query per request.
    assert len(statements) <= 6
    with Session(lineage_scan_engine) as session:
        assert set(session.scalars(select(OpinionGroupLineageDescriptionWork.lineage_id))) == {
            301,
            302,
        }
    assert materialize_requested_lineage_description_work(
        lineage_scan_engine, limit=1, require_activated_view_snapshot=True
    ) == [10]
    assert (
        materialize_requested_lineage_description_work(
            lineage_scan_engine, limit=1, require_activated_view_snapshot=True
        )
        == []
    )
    with Session(lineage_scan_engine) as session:
        assert set(session.scalars(select(OpinionGroupLineageDescriptionWork.lineage_id))) == {
            301,
            302,
            303,
        }


def test_lineage_scan_preserves_leases_and_reactivates_stale_source(
    lineage_scan_engine: Engine,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_lineage_scan(session)
        lineage = session.execute(select(OpinionGroupLineage).where(OpinionGroupLineage.id == 301))
        lineage.scalar_one().system_description_id = None
        work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        work.source_candidate_id = 999
        work.lease_owner = "another-worker"
        work.lease_token = "active-lease"
        work.lease_expires_at = session.execute(select(func.now())).scalar_one() + timedelta(
            minutes=10
        )
        work.non_retryable_ai_description_epoch = 1
        session.commit()

    assert materialize_requested_lineage_description_work(
        lineage_scan_engine, limit=2, require_activated_view_snapshot=True
    ) == [10]
    with Session(lineage_scan_engine) as session:
        work = session.execute(
            select(OpinionGroupLineageDescriptionWork).where(
                OpinionGroupLineageDescriptionWork.lineage_id == 301
            )
        ).scalar_one()
        assert work.source_candidate_id == 999
        assert work.lease_token == "active-lease"
        work.lease_expires_at = session.execute(select(func.now())).scalar_one() - timedelta(
            minutes=1
        )
        session.commit()

    assert materialize_requested_lineage_description_work(
        lineage_scan_engine, limit=1, require_activated_view_snapshot=True
    ) == [10]
    with Session(lineage_scan_engine) as session:
        work = session.execute(
            select(OpinionGroupLineageDescriptionWork).where(
                OpinionGroupLineageDescriptionWork.lineage_id == 301
            )
        ).scalar_one()
        assert work.source_candidate_id == 401
        assert work.attempt_count == 1
        assert work.non_retryable_ai_description_epoch == 1
        assert work.lease_owner is None
        assert work.lease_token is None
        assert work.lease_expires_at is None


def test_eager_lineage_scan_does_not_rewrite_unchanged_work(lineage_scan_engine: Engine) -> None:
    with Session(lineage_scan_engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = NOW
        session.execute(select(OpinionGroupLineage)).scalar_one().system_description_id = None
        before = session.execute(select(OpinionGroupLineageDescriptionWork.updated_at)).scalar_one()
        session.commit()

    with _capture_statements(lineage_scan_engine) as statements:
        assert (
            materialize_requested_lineage_description_work(
                lineage_scan_engine, limit=1, require_activated_view_snapshot=True
            )
            == []
        )
    assert not any(statement.startswith("UPDATE") for statement in statements)
    with Session(lineage_scan_engine) as session:
        after = session.execute(select(OpinionGroupLineageDescriptionWork.updated_at)).scalar_one()
        assert after == before


@pytest.mark.parametrize("excluded", ["deleted", "hidden", "unactivated"])
def test_lineage_scan_respects_visibility_and_activation(
    lineage_scan_engine: Engine, excluded: str
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_lineage_scan(session)
        if excluded == "deleted":
            session.execute(select(Conversation)).scalar_one().current_content_id = None
        elif excluded == "hidden":
            assessment = session.execute(select(OpinionGroupCandidateAssessment)).scalar_one()
            assessment.hidden_reason = (
                OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output
            )
        else:
            session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = None
        session.commit()

    assert (
        materialize_requested_lineage_description_work(
            lineage_scan_engine, limit=8, require_activated_view_snapshot=True
        )
        == []
    )


def test_lineage_scan_failure_rolls_back_eager_inserts(lineage_scan_engine: Engine) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_lineage_scan(session)
        view = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view.view_reason = ConversationViewSnapshotReasonEnum.analysis_completed
        session.commit()

    def fail_requested_scan(
        connection: Connection,
        cursor: object,
        statement: str,
        parameters: object,
        context: ExecutionContext,
        executemany: bool,
    ) -> None:
        if "row_number()" in statement:
            raise OperationalError(None, None, RuntimeError("simulated connection loss"))

    event.listen(lineage_scan_engine, "before_cursor_execute", fail_requested_scan)
    try:
        with pytest.raises(OperationalError):
            materialize_requested_lineage_description_work(
                lineage_scan_engine, limit=8, require_activated_view_snapshot=True
            )
    finally:
        event.remove(lineage_scan_engine, "before_cursor_execute", fail_requested_scan)

    with Session(lineage_scan_engine) as session:
        assert list(session.scalars(select(OpinionGroupLineageDescriptionWork.lineage_id))) == [301]
        assert session.execute(select(OpinionGroupCandidateDescriptionLocaleRequest.id)).first()


def _insert_non_processable_ai_work_state(
    session: Session,
    *,
    leased_lineage_work: bool = False,
) -> None:
    session.add(
        Conversation(
            id=10,
            slug_id="abc12345",
            project_id=1,
            current_content_id=40,
            polis_config_id=10,
            ranking_config_id=None,
            dynamic_translation_enabled=True,
            language_settings_source=ConversationLanguageSettingsSource.conversation_override,
            is_indexed=True,
            participation_mode=ParticipationMode.account_required,
            conversation_type=ConversationType.polis,
            is_importing=False,
            is_closed=False,
            is_edited=False,
            requires_event_ticket=None,
            created_at=NOW,
            updated_at=NOW,
            last_reacted_at=NOW,
        )
    )
    session.add(
        PolisConversationConfig(
            id=10,
            voting_presentation=PolisVotingPresentation.list,
            ai_labeling_enabled=True,
            analysis_data_generation=1,
            preferred_opinion_group_count=None,
            created_at=NOW,
            updated_at=NOW,
        )
    )
    session.add(
        ConversationContent(
            id=40,
            public_id=uuid.UUID("00000000-0000-0000-0000-000000000040"),
            conversation_id=10,
            title="Test conversation",
            body=None,
            body_plain_text="Test conversation",
            source_language_code=SpokenLanguageCode.en,
            source_raw_language_code="en",
            source_language_provider=None,
            source_language_confidence=1.0,
            created_at=NOW,
        )
    )
    session.add(
        ConversationViewSnapshot(
            id=20,
            conversation_id=10,
            opinion_group_spec_id=1,
            analysis_snapshot_id=30,
            survey_aggregate_snapshot_id=None,
            conversation_content_id=40,
            view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
            is_closed=False,
            opinion_count=2,
            vote_count=2,
            participant_count=2,
            total_opinion_count=2,
            total_vote_count=2,
            total_participant_count=2,
            moderated_opinion_count=0,
            hidden_opinion_count=0,
            activated_at=None,
            created_at=NOW,
        )
    )
    session.add(
        AnalysisSnapshot(
            id=30,
            conversation_id=10,
            conversation_content_id=40,
            input_snapshot_id=1,
            data_generation=1,
            computed_at=NOW,
            created_at=NOW,
        )
    )
    session.add(
        AnalysisSnapshotResult(
            id=50,
            conversation_id=10,
            analysis_snapshot_id=30,
            opinion_group_spec_id=1,
            outcome=AnalysisResultOutcomeEnum.success,
            outcome_reason=None,
            variants_enabled=False,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupVariant(
            id=601,
            opinion_group_spec_id=1,
            group_count=2,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupCandidate(
            id=401,
            snapshot_result_id=50,
            opinion_group_variant_id=601,
            scope_id=701,
            outcome=AnalysisResultOutcomeEnum.success,
            outcome_reason=None,
            raw_output=None,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupCandidateAssessment(
            id=901,
            candidate_id=401,
            silhouette_score=0.8,
            coefficient_of_variation=None,
            balance_score=0.8,
            selection_score=0.8,
            hidden_reason=None,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupLineage(
            id=301,
            scope_id=701,
            system_description_id=501,
            admin_description_id=None,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroup(
            id=801,
            candidate_id=401,
            scope_id=701,
            lineage_id=301,
            key="0",
            external_id=0,
            num_users=1,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupCandidateDescriptionLocaleRequest(
            id=101,
            candidate_id=401,
            locale="fr",
            created_at=NOW,
            updated_at=NOW,
        )
    )
    session.add(
        OpinionGroupLineageDescriptionWork(
            id=201,
            lineage_id=301,
            conversation_id=10,
            source_candidate_id=401,
            attempt_count=1,
            lease_owner="worker-1" if leased_lineage_work else None,
            lease_token="token-1" if leased_lineage_work else None,
            lease_expires_at=NOW + timedelta(minutes=10) if leased_lineage_work else None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            created_at=NOW,
            updated_at=NOW,
        )
    )
    session.add(
        OpinionGroupDescriptionTranslationWork(
            id=202,
            description_id=501,
            conversation_id=10,
            locale="fr",
            attempt_count=1,
            lease_owner=None,
            lease_token=None,
            lease_expires_at=None,
            non_retryable_ai_description_epoch=None,
            last_error_code=None,
            last_error_message=None,
            created_at=NOW,
            updated_at=NOW,
        )
    )
    session.commit()


def _seed_translation_locale_correlation_case(
    session: Session, *, eager: bool, activated: bool = True
) -> None:
    _insert_non_processable_ai_work_state(session)
    view = session.execute(select(ConversationViewSnapshot)).scalar_one()
    view.activated_at = NOW if activated else None
    work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
    work.locale = DisplayLanguageCode.es
    session.add_all(
        [
            OpinionGroupDescription(
                id=501,
                locale=DisplayLanguageCode.en,
                label="Published group",
                summary="Published summary",
                created_at=NOW,
            ),
            OpinionGroupDescription(
                id=999,
                locale=DisplayLanguageCode.en,
                label="Unrelated description",
                summary="Unrelated summary",
                created_at=NOW,
            ),
        ]
    )
    if eager:
        session.execute(delete(OpinionGroupCandidateDescriptionLocaleRequest))
        _insert_effective_conversation_target_language(session)
    session.commit()


def _add_unrelated_leased_french_translation_work(session: Session) -> None:
    # This row cannot itself be discovered or claimed. Its locale must not make
    # Spanish work eligible for a candidate that only needs French.
    session.add(
        OpinionGroupDescriptionTranslationWork(
            id=203,
            conversation_id=10,
            description_id=999,
            locale=DisplayLanguageCode.fr,
            attempt_count=1,
            lease_owner="other-worker",
            lease_token="unrelated-lease",
            lease_expires_at=datetime.now(UTC) + timedelta(minutes=10),
            created_at=NOW,
            updated_at=NOW,
        )
    )
    session.commit()


def _seed_other_translation_conversation(
    session: Session,
    *,
    key: int,
    state: Literal["pending", "leased", "translated", "undemanded"],
) -> None:
    session.add(
        PolisConversationConfig(
            id=key,
            voting_presentation=PolisVotingPresentation.list,
            ai_labeling_enabled=True,
            analysis_data_generation=1,
            preferred_opinion_group_count=None,
            created_at=NOW,
            updated_at=NOW,
        )
    )
    session.add(
        Conversation(
            id=key,
            slug_id=f"{key:08x}",
            project_id=1,
            current_content_id=key,
            polis_config_id=key,
            ranking_config_id=None,
            dynamic_translation_enabled=True,
            language_settings_source=ConversationLanguageSettingsSource.conversation_override,
            is_indexed=True,
            participation_mode=ParticipationMode.account_required,
            conversation_type=ConversationType.polis,
            is_importing=False,
            is_closed=False,
            is_edited=False,
            created_at=NOW,
            updated_at=NOW,
            last_reacted_at=NOW,
        )
    )
    session.add(
        ConversationContent(
            id=key,
            public_id=uuid.uuid4(),
            conversation_id=key,
            title="Other conversation",
            body_plain_text="Other conversation",
            source_language_code=SpokenLanguageCode.en,
            source_raw_language_code="en",
            source_language_confidence=1.0,
            created_at=NOW,
        )
    )
    session.add(
        AnalysisSnapshot(
            id=key,
            conversation_id=key,
            conversation_content_id=key,
            input_snapshot_id=1,
            data_generation=1,
            computed_at=NOW,
            created_at=NOW,
        )
    )
    session.add(
        AnalysisSnapshotResult(
            id=key,
            conversation_id=key,
            analysis_snapshot_id=key,
            opinion_group_spec_id=1,
            outcome=AnalysisResultOutcomeEnum.success,
            variants_enabled=False,
            created_at=NOW,
        )
    )
    session.add(
        ConversationViewSnapshot(
            id=key,
            conversation_id=key,
            opinion_group_spec_id=1,
            analysis_snapshot_id=key,
            conversation_content_id=key,
            view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
            is_closed=False,
            opinion_count=2,
            vote_count=2,
            participant_count=2,
            total_opinion_count=2,
            total_vote_count=2,
            total_participant_count=2,
            moderated_opinion_count=0,
            hidden_opinion_count=0,
            activated_at=NOW,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupCandidate(
            id=key,
            snapshot_result_id=key,
            opinion_group_variant_id=601,
            scope_id=key,
            outcome=AnalysisResultOutcomeEnum.success,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupCandidateAssessment(
            id=key,
            candidate_id=key,
            selection_score=0.8,
            silhouette_score=0.8,
            balance_score=0.8,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupDescription(
            id=key,
            locale=DisplayLanguageCode.en,
            label="Other group",
            summary="Other summary",
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupLineage(
            id=key,
            scope_id=key,
            system_description_id=key,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroup(
            id=key,
            candidate_id=key,
            scope_id=key,
            lineage_id=key,
            key="0",
            external_id=0,
            num_users=2,
            created_at=NOW,
        )
    )
    session.add(
        ConversationTranslationTargetLanguage(
            id=key,
            conversation_id=key,
            language_code=DisplayLanguageCode.fr,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupDescriptionTranslationWork(
            id=key,
            conversation_id=key,
            description_id=key,
            locale=DisplayLanguageCode.es if state == "undemanded" else DisplayLanguageCode.fr,
            attempt_count=1,
            lease_owner="busy-worker" if state == "leased" else None,
            lease_token="busy-token" if state == "leased" else None,
            lease_expires_at=datetime.now(UTC) + timedelta(minutes=10)
            if state == "leased"
            else None,
            created_at=NOW,
            updated_at=NOW,
        )
    )
    if state == "translated":
        session.add(
            OpinionGroupDescriptionTranslation(
                description_id=key,
                locale=DisplayLanguageCode.fr,
                label="Autre groupe",
                summary="Autre résumé",
                created_at=NOW,
            )
        )


def _scan_translation_work(engine: Engine) -> list[int]:
    return fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=8,
        ai_description_epoch=1,
        translation_enabled=True,
        include_lineage_descriptions=False,
        require_activated_view_snapshot=True,
    )


@pytest.mark.parametrize("eager", [False, True], ids=["explicit", "eager"])
def test_translation_discovery_does_not_borrow_another_work_rows_locale(
    lineage_scan_engine: Engine,
    eager: bool,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_locale_correlation_case(session, eager=eager)
    # Control: there is no Spanish demand, so this conversation is not ready.
    assert _scan_translation_work(lineage_scan_engine) == []
    with Session(lineage_scan_engine) as session:
        _add_unrelated_leased_french_translation_work(session)
    assert _scan_translation_work(lineage_scan_engine) == []


@pytest.mark.parametrize("eager", [False, True], ids=["explicit", "eager"])
def test_translation_retry_claims_only_the_demanded_locale(
    lineage_scan_engine: Engine,
    eager: bool,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_locale_correlation_case(session, eager=eager)
        _add_unrelated_leased_french_translation_work(session)
    claims = claim_ai_description_locale_work_items_batch(
        lineage_scan_engine,
        worker_id="correlation-test",
        conversation_ids=[10],
        lease_ttl_seconds=120,
        limit=8,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
        require_activated_view_snapshot=True,
    )
    assert {claim.locale for claim in claims} == {"fr"}
    with Session(lineage_scan_engine) as session:
        unrequested = session.get(OpinionGroupDescriptionTranslationWork, 202)
        assert unrequested is not None
        assert unrequested.lease_token is None
        assert unrequested.attempt_count == 1


def test_translation_first_pass_claims_only_the_eager_target_locale(
    lineage_scan_engine: Engine,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_locale_correlation_case(session, eager=True, activated=False)
        _add_unrelated_leased_french_translation_work(session)
    claims = claim_first_pass_ai_description_locale_work_items_batch(
        lineage_scan_engine,
        worker_id="first-pass-correlation-test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=8,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )
    assert {claim.locale for claim in claims} == {"fr"}


@pytest.mark.parametrize("eager", [False, True], ids=["explicit", "eager"])
@pytest.mark.parametrize(
    "view_reason",
    [
        ConversationViewSnapshotReasonEnum.analysis_completed,
        ConversationViewSnapshotReasonEnum.conversation_content_updated,
    ],
)
def test_translation_discovery_accepts_real_spanish_demand(
    lineage_scan_engine: Engine,
    eager: bool,
    view_reason: ConversationViewSnapshotReasonEnum,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_locale_correlation_case(session, eager=eager)
        session.execute(select(ConversationViewSnapshot)).scalar_one().view_reason = view_reason
        if eager:
            target = session.execute(select(ConversationTranslationTargetLanguage)).scalar_one()
            target.language_code = DisplayLanguageCode.es
        else:
            request = session.execute(
                select(OpinionGroupCandidateDescriptionLocaleRequest)
            ).scalar_one()
            request.locale = DisplayLanguageCode.es
        session.commit()
    assert fetch_claimable_ai_description_work_conversation_ids(
        lineage_scan_engine,
        limit=8,
        ai_description_epoch=1,
        translation_enabled=True,
        include_lineage_descriptions=False,
        require_activated_view_snapshot=True,
    ) == [10]


@pytest.mark.parametrize("eager", [False, True], ids=["explicit", "eager"])
@pytest.mark.parametrize("checkpoint", [False, True])
@pytest.mark.parametrize("newer_activated", [False, True])
def test_translation_discovery_preserves_checkpoint_and_latest_scope(
    lineage_scan_engine: Engine,
    eager: bool,
    checkpoint: bool,
    newer_activated: bool,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_locale_correlation_case(session, eager=eager)
        session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one().locale = DisplayLanguageCode.fr
        if checkpoint:
            session.add(
                ConversationViewSnapshotCheckpointReason(
                    conversation_view_snapshot_id=20,
                    conversation_id=10,
                    opinion_group_spec_id=1,
                    reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis,
                    created_at=NOW,
                )
            )
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=False,
                opinion_count=2,
                vote_count=2,
                participant_count=2,
                total_opinion_count=2,
                total_vote_count=2,
                total_participant_count=2,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW + timedelta(seconds=1) if newer_activated else None,
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()
    # Eager translation is only for the latest non-checkpoint view. Explicit
    # demand can retain a checkpoint, even while a newer view is unpublished.
    expected = [10] if checkpoint and not eager else []
    assert _scan_translation_work(lineage_scan_engine) == expected


@pytest.mark.parametrize("state", ["leased", "translated"])
def test_idle_translation_discovery_skips_candidate_history(
    lineage_scan_engine: Engine,
    state: str,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_locale_correlation_case(session, eager=True)
        work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
        work.locale = DisplayLanguageCode.fr
        if state == "leased":
            work.lease_owner = "active-worker"
            work.lease_token = "active-token"
            work.lease_expires_at = datetime.now(UTC) + timedelta(minutes=10)
        else:
            session.add(
                OpinionGroupDescriptionTranslation(
                    description_id=501,
                    locale=DisplayLanguageCode.fr,
                    label="Groupe",
                    summary="Résumé",
                    created_at=NOW,
                )
            )
        session.commit()
    with _capture_statements(lineage_scan_engine) as statements:
        assert _scan_translation_work(lineage_scan_engine) == []
    assert len(statements) == 1
    assert "opinion_group_candidate" not in statements[0]
    assert "conversation_view_snapshot" not in statements[0]


def test_translation_discovery_scopes_intermediate_work_to_pending_conversations(
    lineage_scan_engine: Engine,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_locale_correlation_case(session, eager=True)
        session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one().locale = DisplayLanguageCode.fr
        _seed_other_translation_conversation(session, key=1000, state="translated")
        _seed_other_translation_conversation(session, key=1001, state="leased")
        _seed_other_translation_conversation(session, key=1002, state="pending")
        _seed_other_translation_conversation(session, key=1003, state="undemanded")
        _seed_other_translation_conversation(session, key=1004, state="pending")
        _seed_other_translation_conversation(session, key=1005, state="pending")
        disabled = session.get(PolisConversationConfig, 1004)
        assert disabled is not None
        disabled.ai_labeling_enabled = False
        deleted = session.get(Conversation, 1005)
        assert deleted is not None
        deleted.current_content_id = None
        # A second live description without pending work must also be excluded,
        # even though its conversation has another runnable description.
        session.add(
            OpinionGroupDescription(
                id=502,
                locale=DisplayLanguageCode.en,
                label="Not pending",
                summary="Not pending",
                created_at=NOW,
            )
        )
        session.add(
            OpinionGroupLineage(id=302, scope_id=701, system_description_id=502, created_at=NOW)
        )
        session.add(
            OpinionGroup(
                id=802,
                candidate_id=401,
                scope_id=701,
                lineage_id=302,
                key="1",
                external_id=1,
                num_users=1,
                created_at=NOW,
            )
        )
        session.commit()
    stages: dict[str, CTE] = {}

    def capture(
        connection: Connection,
        cursor: object,
        statement: str,
        parameters: object,
        context: ExecutionContext,
        executemany: bool,
    ) -> None:
        if context.compiled is not None and context.compiled.statement is not None:
            for node in iterate(context.compiled.statement):
                if isinstance(node, CTE):
                    stages[node.name] = node

    event.listen(lineage_scan_engine, "before_cursor_execute", capture)
    try:
        assert set(_scan_translation_work(lineage_scan_engine)) == {10, 1002}
    finally:
        event.remove(lineage_scan_engine, "before_cursor_execute", capture)
    with Session(lineage_scan_engine) as session:
        views = stages["translation_discovery_eligible_views"]
        assert set(session.scalars(select(views.c.id))) == {20, 1002, 1003}
        candidates = stages["translation_discovery_candidates"]
        assert {
            tuple(row)
            for row in session.execute(
                select(candidates.c.conversation_id, candidates.c.description_id)
            )
        } == {
            (10, 501),
            (1002, 1002),
            (1003, 1003),
        }


def test_obsolete_translation_work_does_not_starve_later_live_work(
    lineage_scan_engine: Engine,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_locale_correlation_case(session, eager=True)
        session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one().locale = DisplayLanguageCode.fr
        for key in range(2000, 2050):
            session.add(
                OpinionGroupDescription(
                    id=key,
                    locale=DisplayLanguageCode.en,
                    label="Historical",
                    summary="Historical",
                    created_at=NOW,
                )
            )
            session.add(
                OpinionGroupDescriptionTranslationWork(
                    id=key,
                    conversation_id=10,
                    description_id=key,
                    locale=DisplayLanguageCode.fr,
                    attempt_count=0,
                    created_at=NOW - timedelta(days=1),
                    updated_at=NOW - timedelta(days=1),
                )
            )
        session.commit()
    assert fetch_claimable_ai_description_work_conversation_ids(
        lineage_scan_engine,
        limit=1,
        ai_description_epoch=1,
        translation_enabled=True,
        include_lineage_descriptions=False,
        require_activated_view_snapshot=True,
    ) == [10]


def _seed_live_description_repair(session: Session) -> None:
    _insert_non_processable_ai_work_state(session)
    session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = NOW
    session.add(
        AnalysisSpec(id=1, analysis_family=AnalysisFamilyEnum.opinion_groups, created_at=NOW)
    )
    session.add(
        OpinionGroupSpec(
            id=1,
            analysis_spec_id=1,
            key="test",
            version=1,
            reducer=OpinionGroupReducerEnum.pca,
            clusterer=OpinionGroupClustererEnum.kmeans,
            selection_policy=OpinionGroupSelectionPolicyEnum.silhouette_size_balance,
            min_clusterable_participants=2,
            min_votes_per_participant=1,
            max_group_count=6,
            created_at=NOW,
        )
    )
    session.add(
        OpinionGroupDescription(
            id=501,
            locale=DisplayLanguageCode.en,
            label="Traditionalists",
            summary="Ce groupe défend une éducation structurée et des règles claires.",
            created_at=NOW,
        )
    )
    session.commit()
    if session.get_bind().dialect.name == "postgresql":
        session.execute(
            select(
                func.setval(
                    func.pg_get_serial_sequence("opinion_group_description", "id"), 501, True
                )
            )
        )
        session.commit()


@pytest.mark.parametrize("excluded", ["disabled", "deleted", "hidden", "unactivated", "unscored"])
def test_live_repair_excludes_ineligible_descriptions(
    lineage_scan_engine: Engine,
    excluded: str,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_live_description_repair(session)
        if excluded == "disabled":
            session.execute(
                select(PolisConversationConfig)
            ).scalar_one().ai_labeling_enabled = False
        elif excluded == "deleted":
            session.execute(select(Conversation)).scalar_one().current_content_id = None
        elif excluded == "hidden":
            session.execute(
                select(OpinionGroupCandidateAssessment)
            ).scalar_one().hidden_reason = (
                OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output
            )
        elif excluded == "unscored":
            session.execute(
                select(OpinionGroupCandidateAssessment)
            ).scalar_one().selection_score = None
        else:
            session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = None
        session.commit()
        assert (
            fetch_live_descriptions(
                session, conversation_slug_id=None, after_description_id=0, limit=10
            )
            == []
        )


def test_live_repair_replaces_atomically_and_materializes_translations(
    lineage_scan_engine: Engine,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_live_description_repair(session)
        session.add(
            ConversationViewSnapshot(
                id=19,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=30,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=False,
                opinion_count=2,
                vote_count=2,
                participant_count=2,
                total_opinion_count=2,
                total_vote_count=2,
                total_participant_count=2,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW,
                created_at=NOW - timedelta(minutes=1),
            )
        )
        session.add(
            ConversationViewSnapshotCheckpointReason(
                id=1,
                conversation_view_snapshot_id=19,
                conversation_id=10,
                opinion_group_spec_id=1,
                reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis,
                created_at=NOW,
            )
        )
        session.execute(select(Conversation)).scalar_one().is_closed = True
        session.commit()
        originals = fetch_live_descriptions(
            session, conversation_slug_id="abc12345", after_description_id=0, limit=1
        )
    assert len(originals) == 1
    original = originals[0]
    replacement = EnglishDescription(
        label="Traditionalists", summary="This group supports clear rules and consistent parenting."
    )
    new_id = replace_live_description(
        lineage_scan_engine, original=original, replacement=replacement
    )
    assert new_id is not None and new_id != original.description_id
    assert (
        replace_live_description(lineage_scan_engine, original=original, replacement=replacement)
        is None
    )
    with Session(lineage_scan_engine) as session:
        assert session.get(OpinionGroupDescription, original.description_id) is not None
        assert (
            session.execute(select(OpinionGroupLineage.system_description_id)).scalar_one()
            == new_id
        )
        saved = session.get(OpinionGroupDescription, new_id)
        assert saved is not None
        assert saved.summary == replacement.summary
        assert (
            session.scalar(
                select(OpinionGroupDescriptionTranslationWork.id).where(
                    OpinionGroupDescriptionTranslationWork.description_id == new_id,
                    OpinionGroupDescriptionTranslationWork.locale == DisplayLanguageCode.fr,
                )
            )
            is not None
        )
        events = list(session.scalars(select(RealtimeEventOutbox)))
        assert len(events) == 2
        assert (
            fetch_live_descriptions(
                session,
                conversation_slug_id=None,
                after_description_id=0,
                limit=10,
                through_description_id=original.description_id,
            )
            == []
        )


def test_live_repair_rechecks_eligibility_after_provider_call(lineage_scan_engine: Engine) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_live_description_repair(session)
        original = fetch_live_descriptions(
            session, conversation_slug_id=None, after_description_id=0, limit=1
        )[0]
        session.execute(select(PolisConversationConfig)).scalar_one().ai_labeling_enabled = False
        session.commit()
    assert (
        replace_live_description(
            lineage_scan_engine,
            original=original,
            replacement=EnglishDescription(label="Traditionalists", summary="English correction."),
        )
        is None
    )
    with Session(lineage_scan_engine) as session:
        assert list(session.scalars(select(OpinionGroupDescription.id))) == [501]


def test_live_repair_does_not_fall_back_to_old_analysis(lineage_scan_engine: Engine) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_live_description_repair(session)
        session.add(
            ConversationViewSnapshotCheckpointReason(
                id=1,
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis,
                created_at=NOW,
            )
        )
        session.add(
            AnalysisSnapshot(
                id=31,
                conversation_id=10,
                conversation_content_id=40,
                input_snapshot_id=1,
                data_generation=2,
                computed_at=NOW,
                created_at=NOW,
            )
        )
        session.add(
            AnalysisSnapshotResult(
                id=51,
                conversation_id=10,
                analysis_snapshot_id=31,
                opinion_group_spec_id=1,
                outcome=AnalysisResultOutcomeEnum.insufficient_data,
                variants_enabled=False,
                created_at=NOW,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=False,
                opinion_count=2,
                vote_count=2,
                participant_count=2,
                total_opinion_count=2,
                total_vote_count=2,
                total_participant_count=2,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW,
                created_at=NOW,
            )
        )
        session.commit()
        assert (
            fetch_live_descriptions(
                session, conversation_slug_id=None, after_description_id=0, limit=10
            )
            == []
        )


@pytest.mark.parametrize("variants_enabled", [False, True])
def test_live_repair_matches_selectable_variant_scope(
    lineage_scan_engine: Engine,
    variants_enabled: bool,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_live_description_repair(session)
        session.execute(
            select(AnalysisSnapshotResult)
        ).scalar_one().variants_enabled = variants_enabled
        session.add(
            OpinionGroupVariant(id=602, opinion_group_spec_id=1, group_count=3, created_at=NOW)
        )
        session.add(
            OpinionGroupCandidate(
                id=402,
                snapshot_result_id=50,
                opinion_group_variant_id=602,
                scope_id=702,
                outcome=AnalysisResultOutcomeEnum.success,
                created_at=NOW,
            )
        )
        session.add(
            OpinionGroupCandidateAssessment(
                id=902,
                candidate_id=402,
                selection_score=0.8,
                created_at=NOW,
            )
        )
        session.add(
            OpinionGroupDescription(
                id=502,
                locale=DisplayLanguageCode.en,
                label="Traditionalists",
                summary="Ce groupe soutient des règles claires pour les enfants.",
                created_at=NOW,
            )
        )
        session.add(
            OpinionGroupLineage(id=302, scope_id=702, system_description_id=502, created_at=NOW)
        )
        session.add(
            OpinionGroup(
                id=802,
                candidate_id=402,
                scope_id=702,
                lineage_id=302,
                key="0",
                external_id=0,
                num_users=1,
                created_at=NOW,
            )
        )
        session.commit()
        descriptions = fetch_live_descriptions(
            session, conversation_slug_id=None, after_description_id=0, limit=10
        )
        assert [description.description_id for description in descriptions] == (
            [501, 502] if variants_enabled else [502]
        )


@pytest.mark.parametrize("change", ["text", "locale", "pointer"])
def test_live_repair_preserves_changes_made_during_provider_call(
    lineage_scan_engine: Engine,
    change: str,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_live_description_repair(session)
        original = fetch_live_descriptions(
            session, conversation_slug_id=None, after_description_id=0, limit=1
        )[0]
        source = session.execute(select(OpinionGroupDescription)).scalar_one()
        if change == "text":
            source.summary = "An independently corrected summary."
        elif change == "locale":
            source.locale = DisplayLanguageCode.fr
        else:
            session.add(
                OpinionGroupDescription(
                    id=502,
                    locale=DisplayLanguageCode.en,
                    label="Updated label",
                    summary="An independently corrected summary.",
                    created_at=NOW,
                )
            )
            session.execute(select(OpinionGroupLineage)).scalar_one().system_description_id = 502
        session.commit()
        original_ids = set(session.scalars(select(OpinionGroupDescription.id)))
    assert (
        replace_live_description(
            lineage_scan_engine,
            original=original,
            replacement=EnglishDescription(label="Traditionalists", summary="English correction."),
        )
        is None
    )
    with Session(lineage_scan_engine) as session:
        assert set(session.scalars(select(OpinionGroupDescription.id))) == original_ids


def test_live_repair_rolls_back_replacement_when_outbox_scheduling_fails(
    lineage_scan_engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_live_description_repair(session)
        original = fetch_live_descriptions(
            session, conversation_slug_id=None, after_description_id=0, limit=1
        )[0]

    def fail_scheduling(
        session: Session,
        *,
        lineage_ids_by_conversation_id: Mapping[int, Sequence[int]],
    ) -> None:
        raise RuntimeError("outbox unavailable")

    monkeypatch.setattr(
        description_repair, "schedule_repaired_description_updates", fail_scheduling
    )
    with pytest.raises(RuntimeError, match="outbox unavailable"):
        replace_live_description(
            lineage_scan_engine,
            original=original,
            replacement=EnglishDescription(label="Traditionalists", summary="English correction."),
        )
    with Session(lineage_scan_engine) as session:
        assert session.scalar(select(OpinionGroupLineage.system_description_id)) == 501
        assert list(session.scalars(select(OpinionGroupDescription.id))) == [501]


def test_live_repair_checks_fresh_eligibility_after_waiting_for_a_lock(
    lineage_scan_engine: Engine,
) -> None:
    if lineage_scan_engine.dialect.name != "postgresql":
        pytest.skip("Requires PostgreSQL row locks and READ COMMITTED snapshots")
    with Session(lineage_scan_engine) as session:
        _seed_live_description_repair(session)
        original = fetch_live_descriptions(
            session, conversation_slug_id=None, after_description_id=0, limit=1
        )[0]
    with ThreadPoolExecutor(max_workers=1) as executor:
        with Session(lineage_scan_engine) as blocker:
            blocker.execute(select(OpinionGroupLineage.id).with_for_update()).all()
            future = executor.submit(
                replace_live_description,
                lineage_scan_engine,
                original=original,
                replacement=EnglishDescription(
                    label="Traditionalists", summary="English correction."
                ),
            )
            try:
                deadline = time.monotonic() + 5
                with lineage_scan_engine.connect() as observer:
                    while True:
                        waiting = observer.execute(
                            select(func.count())
                            .select_from(text("pg_stat_activity"))
                            .where(
                                text(
                                    "datname = current_database() AND wait_event_type = 'Lock' "
                                    "AND query LIKE '%opinion_group_lineage%'"
                                )
                            )
                        ).scalar_one()
                        if waiting:
                            break
                        assert time.monotonic() < deadline, (
                            "repair did not wait for the lineage lock"
                        )
                        time.sleep(0.01)
                config = blocker.execute(select(PolisConversationConfig)).scalar_one()
                config.ai_labeling_enabled = False
                blocker.commit()
            finally:
                blocker.rollback()
        assert future.result(timeout=5) is None
    with Session(lineage_scan_engine) as session:
        assert session.scalar(select(OpinionGroupLineage.system_description_id)) == 501
        assert list(session.scalars(select(OpinionGroupDescription.id))) == [501]


def _translation_claim(
    *,
    work_id: int = 202,
    conversation_id: int = 10,
    conversation_slug_id: str = "abc12345",
    description_id: int = 501,
    locale: str = "fr",
    lease_token: str = "token-translation",
) -> ClaimedDescriptionTranslationWorkItem:
    return ClaimedDescriptionTranslationWorkItem(
        id=work_id,
        conversation_id=conversation_id,
        conversation_slug_id=conversation_slug_id,
        description_id=description_id,
        locale=locale,
        attempt_count=1,
        lease_token=lease_token,
    )


def _insert_effective_conversation_target_language(
    session: Session,
    *,
    source_language_code: str = "en",
    target_language_code: DisplayLanguageCode = DisplayLanguageCode.fr,
    deleted_at: datetime | None = None,
) -> None:
    content = session.get(ConversationContent, 40)
    if content is not None:
        content.source_language_code = SpokenLanguageCode(source_language_code)
    session.add(
        ConversationTranslationTargetLanguage(
            id=203,
            conversation_id=10,
            language_code=target_language_code,
            created_at=NOW,
            deleted_at=deleted_at,
        )
    )


def test_label_summary_partial_retry_stops_after_timeout() -> None:
    calls: list[list[str]] = []

    def generate_descriptions(
        conversation: ConversationDescriptionInput,
    ) -> ParsedLabelSummaryOutput:
        calls.append([group.group_key for group in conversation.groups])
        if len(calls) == 1:
            return ParsedLabelSummaryOutput(
                mode="strict",
                clusters={
                    "0": LabelSummary(
                        reasoning="ok",
                        label="Transitists",
                        summary="This group supports free public transit for all residents.",
                    )
                },
            )
        raise TimeoutError("bedrock timed out")

    result = generate_english_descriptions(
        generate=generate_descriptions,
        conversation=ConversationDescriptionInput(
            conversation_title="Transit funding",
            conversation_body="How should transit be funded?",
            groups=[
                GroupDescriptionInput(
                    group_key="0",
                    representative_opinions=[
                        RepresentativeOpinionText(
                            opinion_id=10,
                            stance=VoteEnumSimple.agree,
                            content="Fund transit",
                        )
                    ],
                ),
                GroupDescriptionInput(
                    group_key="1",
                    representative_opinions=[
                        RepresentativeOpinionText(
                            opinion_id=20,
                            stance=VoteEnumSimple.disagree,
                            content="Raise fares",
                        )
                    ],
                ),
            ],
            analysis_snapshot_id=30,
        ),
    )

    assert calls == [["0", "1"], ["1"]]
    assert isinstance(result.groups["0"], EnglishDescription)
    assert not isinstance(result.groups["1"], EnglishDescription)


def _insert_attempted_eager_translation_work(session: Session) -> None:
    existing_work_by_locale = {
        work.locale: work
        for work in session.execute(select(OpinionGroupDescriptionTranslationWork)).scalars()
    }
    next_id = 10_000
    for locale in SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES:
        locale_code = DisplayLanguageCode(locale)
        existing_work = existing_work_by_locale.get(locale_code)
        if existing_work is not None:
            existing_work.attempt_count = 1
            continue
        session.add(
            OpinionGroupDescriptionTranslationWork(
                id=next_id,
                description_id=501,
                conversation_id=10,
                locale=locale_code,
                attempt_count=1,
                lease_owner=None,
                lease_token=None,
                lease_expires_at=None,
                non_retryable_ai_description_epoch=None,
                last_error_code=None,
                last_error_message=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        next_id += 1


def _insert_all_eager_translations(session: Session) -> None:
    existing_locales = {
        translation.locale
        for translation in session.execute(select(OpinionGroupDescriptionTranslation)).scalars()
    }
    next_id = 20_000
    for locale in SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES:
        if locale in existing_locales:
            continue
        session.add(
            OpinionGroupDescriptionTranslation(
                id=next_id,
                description_id=501,
                locale=locale,
                label=f"Label {locale}",
                summary=f"Summary {locale}",
                created_at=NOW,
            )
        )
        next_id += 1


def test_requested_translation_batches_shared_descriptions_and_locales(
    lineage_scan_engine: Engine,
) -> None:
    with Session(lineage_scan_engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = NOW
        session.add(
            OpinionGroupCandidate(
                id=402,
                snapshot_result_id=50,
                opinion_group_variant_id=602,
                scope_id=702,
                outcome=AnalysisResultOutcomeEnum.success,
                created_at=NOW,
            )
        )
        session.add(
            OpinionGroupLineage(id=302, scope_id=702, system_description_id=502, created_at=NOW)
        )
        for group_id, lineage_id in ((802, 301), (803, 302)):
            session.add(
                OpinionGroup(
                    id=group_id,
                    candidate_id=402,
                    scope_id=702,
                    lineage_id=lineage_id,
                    key=str(group_id),
                    external_id=group_id,
                    num_users=1,
                    created_at=NOW,
                )
            )
        for request_id, candidate_id, locale in (
            (102, 402, DisplayLanguageCode.fr),
            (103, 402, DisplayLanguageCode.es),
            (104, 401, DisplayLanguageCode.es),
        ):
            session.add(
                OpinionGroupCandidateDescriptionLocaleRequest(
                    id=request_id,
                    candidate_id=candidate_id,
                    locale=locale,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
        session.add(
            OpinionGroupDescriptionTranslation(
                description_id=502,
                locale=DisplayLanguageCode.es,
                label="Ready",
                summary="Ready",
                created_at=NOW,
            )
        )
        session.commit()

    with _capture_statements(lineage_scan_engine) as statements:
        assert materialize_requested_description_translation_work(
            lineage_scan_engine, limit=8, require_activated_view_snapshot=True
        ) == [10]
    assert len(statements) <= 8
    with Session(lineage_scan_engine) as session:
        assert set(
            session.execute(
                select(
                    OpinionGroupDescriptionTranslationWork.description_id,
                    OpinionGroupDescriptionTranslationWork.locale,
                )
            ).tuples()
        ) == {
            (501, DisplayLanguageCode.fr),
            (502, DisplayLanguageCode.fr),
            (501, DisplayLanguageCode.es),
        }
    with _capture_statements(lineage_scan_engine) as idle_statements:
        assert (
            materialize_requested_description_translation_work(
                lineage_scan_engine, limit=8, require_activated_view_snapshot=True
            )
            == []
        )
    assert len(idle_statements) <= 2


def test_requested_translation_waits_for_every_base_description(
    lineage_scan_engine: Engine,
) -> None:
    with Session(lineage_scan_engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = NOW
        session.execute(delete(OpinionGroupDescriptionTranslationWork))
        session.add(
            OpinionGroupLineage(id=302, scope_id=701, system_description_id=None, created_at=NOW)
        )
        session.add(
            OpinionGroup(
                id=802,
                candidate_id=401,
                scope_id=701,
                lineage_id=302,
                key="1",
                external_id=1,
                num_users=1,
                created_at=NOW,
            )
        )
        session.commit()

    assert (
        materialize_requested_description_translation_work(
            lineage_scan_engine, limit=1, require_activated_view_snapshot=True
        )
        == []
    )
    with Session(lineage_scan_engine) as session:
        assert list(session.scalars(select(OpinionGroupDescriptionTranslationWork.id))) == []
        session.execute(
            update(OpinionGroupLineage)
            .where(OpinionGroupLineage.id == 302)
            .values(system_description_id=502)
        )
        session.commit()

    for expected_ids in ({501}, {501, 502}):
        assert materialize_requested_description_translation_work(
            lineage_scan_engine, limit=1, require_activated_view_snapshot=True
        ) == [10]
        with Session(lineage_scan_engine) as session:
            assert (
                set(session.scalars(select(OpinionGroupDescriptionTranslationWork.description_id)))
                == expected_ids
            )


def test_idle_description_recovery_only_probes_work_tables(lineage_scan_engine: Engine) -> None:
    with Session(lineage_scan_engine) as session:
        _insert_non_processable_ai_work_state(session, leased_lineage_work=True)
        work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        work.lease_expires_at = datetime.now(UTC) + timedelta(minutes=10)
        session.commit()

    with _capture_statements(lineage_scan_engine) as statements:
        assert (
            recover_expired_ai_description_work(lineage_scan_engine, translation_enabled=True) == []
        )

    assert len(statements) == 2
    for statement in statements:
        assert "lease_token IS NOT NULL" in statement
        assert "conversation_view_snapshot" not in statement
        assert "opinion_group_candidate" not in statement
        assert not statement.startswith("UPDATE")


@pytest.mark.parametrize("kind", ["lineage", "translation"])
def test_recovery_keeps_a_lease_renewed_after_the_expiry_probe(
    *, lineage_scan_engine: Engine, kind: Literal["lineage", "translation"]
) -> None:
    if lineage_scan_engine.dialect.name != "postgresql":
        pytest.skip("Requires independent PostgreSQL transactions")
    work_table = (
        OpinionGroupLineageDescriptionWork
        if kind == "lineage"
        else OpinionGroupDescriptionTranslationWork
    )
    with Session(lineage_scan_engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = NOW
        work = session.execute(select(work_table)).scalar_one()
        work.lease_owner = "worker-1"
        work.lease_token = "token-1"
        work.lease_expires_at = datetime.now(UTC) - timedelta(seconds=1)
        session.commit()

    renewed = False
    renewed_expiry = datetime.now(UTC) + timedelta(minutes=10)

    def renew_before_recovery_update(
        connection: Connection,
        cursor: object,
        statement: str,
        parameters: object,
        context: ExecutionContext,
        executemany: bool,
    ) -> None:
        nonlocal renewed
        if renewed or not statement.startswith(f"UPDATE {work_table.__tablename__} "):
            return
        renewed = True
        with lineage_scan_engine.begin() as renewing:
            renewing.execute(update(work_table).values(lease_expires_at=renewed_expiry))

    event.listen(lineage_scan_engine, "before_cursor_execute", renew_before_recovery_update)
    try:
        assert (
            recover_expired_ai_description_work(
                lineage_scan_engine,
                translation_enabled=True,
                include_lineage_descriptions=kind == "lineage",
                include_translations=kind == "translation",
                require_activated_view_snapshot=True,
            )
            == []
        )
    finally:
        event.remove(lineage_scan_engine, "before_cursor_execute", renew_before_recovery_update)

    assert renewed
    with Session(lineage_scan_engine) as session:
        work = session.execute(select(work_table)).scalar_one()
        assert work.lease_owner == "worker-1"
        assert work.lease_token == "token-1"
        assert work.lease_expires_at is not None
        assert work.lease_expires_at.replace(tzinfo=UTC) == renewed_expiry


def test_eager_ai_description_targets_use_effective_non_english_targets() -> None:
    candidates = [
        EagerDescriptionCandidateRow(
            conversation_id=10,
            candidate_id=100,
        )
    ]
    target_locale_rows = [
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="fr",
        ),
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="es",
        ),
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="en",
        ),
    ]

    target_locales_by_candidate_id = eager_ai_description_target_locales_by_candidate(
        candidates=candidates,
        target_locale_rows=target_locale_rows,
        supported_target_language_codes={"en", "es", "fr"},
    )
    demands = translation_work_demands_for_eager_candidates(
        candidates=candidates,
        lineage_rows_by_candidate_id={
            100: [
                RequiredLineageDescriptionRow(
                    lineage_id=1,
                    candidate_id=100,
                    system_description_id=1001,
                ),
                RequiredLineageDescriptionRow(
                    lineage_id=2,
                    candidate_id=100,
                    system_description_id=1002,
                ),
            ]
        },
        target_locales_by_candidate_id=target_locales_by_candidate_id,
        translated_description_ids_by_locale={"es": {1002}},
    )

    assert target_locales_by_candidate_id == {100: ("es", "fr")}
    assert demands == [
        TranslationWorkDemand(
            description_id=1001,
            conversation_id=10,
            locale="es",
        ),
        TranslationWorkDemand(
            description_id=1001,
            conversation_id=10,
            locale="fr",
        ),
        TranslationWorkDemand(
            description_id=1002,
            conversation_id=10,
            locale="fr",
        ),
    ]


def test_eager_ai_description_targets_ignore_unsupported_effective_targets() -> None:
    candidates = [
        EagerDescriptionCandidateRow(
            conversation_id=10,
            candidate_id=100,
        )
    ]
    target_locale_rows = [
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="es",
        ),
        EagerAiDescriptionTargetLocaleRow(
            conversation_id=10,
            language_code="de",
        ),
    ]

    target_locales_by_candidate_id = eager_ai_description_target_locales_by_candidate(
        candidates=candidates,
        target_locale_rows=target_locale_rows,
        supported_target_language_codes={"es", "fr"},
    )

    assert target_locales_by_candidate_id == {100: ("es",)}


def test_translation_claim_batches_keep_context_and_bound_size() -> None:
    same_context_claims = [
        _translation_claim(
            work_id=300 + offset,
            description_id=700 + offset,
            lease_token=f"token-{offset}",
        )
        for offset in range(DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE + 1)
    ]
    claims = [
        *same_context_claims,
        _translation_claim(
            work_id=400,
            conversation_id=11,
            conversation_slug_id="def67890",
            description_id=800,
            lease_token="token-other-conversation",
        ),
        _translation_claim(
            work_id=401,
            description_id=801,
            locale="es",
            lease_token="token-other-locale",
        ),
    ]

    batches = description_translation_work_claim_batches(claims)

    assert sum(len(batch) for batch in batches) == len(claims)
    assert all(len(batch) <= DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE for batch in batches)
    assert all(len({claim.locale for claim in batch}) == 1 for batch in batches)
    assert [claim.description_id for claim in batches[0]] == [700, 701, 702, 703]
    assert [claim.description_id for claim in batches[1]] == [704, 800]


def test_process_translation_work_items_batch_persists_multiple_translations() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = None
        session.commit()
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add_all(
            [
                OpinionGroupDescription(
                    id=501,
                    locale="en",
                    label="Group one",
                    summary="Summary one",
                    created_at=NOW,
                ),
                OpinionGroupDescription(
                    id=502,
                    locale="en",
                    label="Group two",
                    summary="Summary two",
                    created_at=NOW,
                ),
            ]
        )
        first_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork).where(
                OpinionGroupDescriptionTranslationWork.id == 202
            )
        ).scalar_one()
        first_work.lease_owner = "worker-1"
        first_work.lease_token = "token-translation-1"
        first_work.lease_expires_at = NOW + timedelta(minutes=10)
        session.add(
            OpinionGroupDescriptionTranslationWork(
                id=203,
                description_id=502,
                conversation_id=10,
                locale="fr",
                attempt_count=1,
                lease_owner="worker-1",
                lease_token="token-translation-2",
                lease_expires_at=NOW + timedelta(minutes=10),
                non_retryable_ai_description_epoch=None,
                last_error_code=None,
                last_error_message=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    calls: list[tuple[list[DescriptionForTranslation], list[str]]] = []

    def translate_descriptions(
        descriptions: list[DescriptionForTranslation],
        target_language_codes: list[str],
    ) -> TranslationResult:
        calls.append((descriptions, target_language_codes))
        return translation_result(
            description_ids=[description.description_id for description in descriptions],
            target_language_codes=target_language_codes,
            translations=[
                DescriptionTranslation(
                    description_id=description.description_id,
                    locale=target_language_codes[0],
                    label=f"{description.label} fr",
                    summary=f"{description.summary} fr",
                )
                for description in descriptions
            ],
        )

    result = process_description_translation_work_items_batch(
        engine,
        claims=[
            _translation_claim(
                work_id=202,
                lease_token="token-translation-1",
            ),
            _translation_claim(
                work_id=203,
                description_id=502,
                lease_token="token-translation-2",
            ),
        ],
        translate_descriptions=translate_descriptions,
    )

    with Session(engine) as session:
        translations = (
            session.execute(
                select(OpinionGroupDescriptionTranslation).order_by(
                    OpinionGroupDescriptionTranslation.description_id
                )
            )
            .scalars()
            .all()
        )
        work_rows = (
            session.execute(
                select(OpinionGroupDescriptionTranslationWork).order_by(
                    OpinionGroupDescriptionTranslationWork.id
                )
            )
            .scalars()
            .all()
        )

    assert len(calls) == 1
    assert calls[0][1] == ["fr"]
    assert [description.description_id for description in calls[0][0]] == [501, 502]
    assert [(translation.description_id, translation.locale) for translation in translations] == [
        (501, "fr"),
        (502, "fr"),
    ]
    assert [translation.label for translation in translations] == ["Group one fr", "Group two fr"]
    assert all(work_row.lease_token is None for work_row in work_rows)
    assert result.failures == {}
    assert result.translated_description_ids == [501, 502]


def test_content_update_events_coalesce_locales_per_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.add(
            OpinionGroupCandidateDescriptionLocaleRequest(
                id=103,
                candidate_id=401,
                locale="es",
                created_at=NOW,
                updated_at=NOW,
            )
        )
        _insert_all_eager_translations(session)
        session.commit()

    queue_ai_description_content_updated_events(
        engine,
        lineage_ids_by_conversation_id={},
        translation_description_ids_by_conversation_locale={
            (10, "fr"): [501],
            (10, "es"): [501],
        },
    )

    with Session(engine) as session:
        events = session.execute(select(RealtimeEventOutbox)).scalars().all()

    assert len(events) == 1
    assert events[0].payload["conversationViewSnapshotId"] == 20
    assert events[0].payload["locales"] == ["es", "fr"]
    assert events[0].payload["candidateIds"] == [401]


@pytest.mark.parametrize("notification_fails", [False, True])
def test_translation_batch_commits_notification_atomically(
    *, notification_fails: bool, monkeypatch: pytest.MonkeyPatch
) -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        view = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view.activated_at = NOW
        session.add(
            OpinionGroupDescription(
                id=501, locale="en", label="Skeptics", summary="Questions cost.", created_at=NOW
            )
        )
        work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
        work.lease_owner = "worker-1"
        work.lease_token = "token-translation"
        work.lease_expires_at = datetime.now(UTC) + timedelta(minutes=10)
        session.commit()

    def translate(
        descriptions: list[DescriptionForTranslation], target_language_codes: list[str]
    ) -> TranslationResult:
        del descriptions, target_language_codes
        return translation_result(
            description_ids=[501],
            target_language_codes=["fr"],
            translations=[
                DescriptionTranslation(
                    description_id=501,
                    locale="fr",
                    label="Sceptiques",
                    summary="Interroge les coûts.",
                )
            ],
        )

    if notification_fails:

        def fail_notification(_session: Session, **_kwargs: object) -> None:
            raise RuntimeError("outbox unavailable")

        monkeypatch.setattr(
            ai_description_work, "_queue_description_content_updates", fail_notification
        )
        with pytest.raises(RuntimeError, match="outbox unavailable"):
            process_description_translation_work_items_batch(
                engine, claims=[_translation_claim()], translate_descriptions=translate
            )
    else:
        process_description_translation_work_items_batch(
            engine, claims=[_translation_claim()], translate_descriptions=translate
        )

    with Session(engine) as session:
        translations = session.scalars(select(OpinionGroupDescriptionTranslation)).all()
        events = session.scalars(select(RealtimeEventOutbox)).all()
        work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
        if notification_fails:
            assert translations == []
            assert events == []
            assert work.lease_token == "token-translation"
        else:
            assert len(translations) == 1
            assert work.lease_token is None
            assert len(events) == 1
            assert events[0].payload["conversationViewSnapshotId"] == 20
            assert events[0].payload["locales"] == ["fr"]


@pytest.mark.parametrize(
    ("error", "expected_code"),
    [
        (DescriptionTranslationOutputError("invalid output"), AI_DESCRIPTION_OUTPUT_ERROR_CODE),
        (TimeoutError("provider unavailable"), AI_DESCRIPTION_RETRYABLE_ERROR_CODE),
        (
            OperationalError(
                "private SQL",
                {"summary": "private translated text"},
                RuntimeError("private provider message"),
            ),
            AI_DESCRIPTION_RETRYABLE_ERROR_CODE,
        ),
    ],
)
def test_translation_retry_worker_classifies_output_and_provider_failures(
    *, error: Exception, expected_code: str, caplog: pytest.LogCaptureFixture
) -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        view = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view.activated_at = NOW
        session.add(
            OpinionGroupDescription(
                id=501, locale="en", label="Skeptics", summary="Questions cost.", created_at=NOW
            )
        )
        session.commit()

    def translate(
        descriptions: list[DescriptionForTranslation], target_language_codes: list[str]
    ) -> TranslationResult:
        del descriptions, target_language_codes
        raise error

    processed = process_ai_description_conversation_ids(
        primary_engine=engine,
        worker_id="test-worker",
        conversation_ids=[10],
        lease_ttl_seconds=45,
        heartbeat_interval_seconds=15,
        claim_limit=4,
        max_workers=1,
        ai_description_epoch=1,
        retry_cooldown_seconds=300,
        work=TranslateDescriptions(translate=translate),
        log_prefix="[DescriptionTranslationRetryWorker]",
    )
    with Session(engine) as session:
        work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
        assert work.last_error_code == expected_code
        assert work.lease_token is None
        assert "private" not in (work.last_error_message or "")
    assert processed == 1
    assert "private" not in caplog.text


def test_process_translation_work_items_batch_rejects_output_mismatch() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add(
            OpinionGroupDescription(
                id=501,
                locale="en",
                label="Group one",
                summary="Summary one",
                created_at=NOW,
            )
        )
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.lease_owner = "worker-1"
        translation_work.lease_token = "token-translation"
        translation_work.lease_expires_at = NOW + timedelta(minutes=10)
        session.commit()

    def translate_descriptions(
        descriptions: list[DescriptionForTranslation],
        target_language_codes: list[str],
    ) -> TranslationResult:
        del descriptions
        translation = TranslatedDescriptionText(label="wrong", summary="wrong")
        return TranslationResult(outcomes={(999, target_language_codes[0]): translation})

    with pytest.raises(DescriptionOutputError):
        process_description_translation_work_items_batch(
            engine,
            claims=[_translation_claim()],
            translate_descriptions=translate_descriptions,
        )

    with Session(engine) as session:
        translation_count = (
            session.execute(select(OpinionGroupDescriptionTranslation)).scalars().all()
        )
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()

    assert translation_count == []
    assert translation_work.lease_token == "token-translation"


def test_partial_chinese_translation_only_fails_the_missing_locale() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        view = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view.activated_at = NOW
        session.add(
            OpinionGroupDescription(
                id=501, locale="en", label="Group", summary="Summary", created_at=NOW
            )
        )
        work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
        work.locale = DisplayLanguageCode.zh_hant
        work.lease_owner = "worker-1"
        work.lease_token = "traditional-token"
        work.lease_expires_at = datetime.now(UTC) + timedelta(minutes=10)
        session.add(
            OpinionGroupDescriptionTranslationWork(
                id=203,
                description_id=501,
                conversation_id=10,
                locale="zh-Hans",
                attempt_count=1,
                lease_owner="worker-1",
                lease_token="simplified-token",
                lease_expires_at=datetime.now(UTC) + timedelta(minutes=10),
                created_at=NOW,
                updated_at=NOW,
            )
        )
        request = session.execute(
            select(OpinionGroupCandidateDescriptionLocaleRequest)
        ).scalar_one()
        request.locale = DisplayLanguageCode.zh_hant
        session.commit()

    def translate(
        *, descriptions: list[DescriptionForTranslation], target_language_codes: list[str]
    ) -> TranslationResult:
        return translation_result(
            description_ids=[description.description_id for description in descriptions],
            target_language_codes=target_language_codes,
            failure=TranslationFailure(reason="provider_timeout"),
            translations=[
                DescriptionTranslation(
                    description_id=501,
                    locale="zh-Hant",
                    label="群體",
                    summary="這個群體支持審慎監管。",
                )
            ],
        )

    result = process_description_translation_work_items_batch(
        engine,
        claims=[
            _translation_claim(locale="zh-Hant", lease_token="traditional-token"),
            _translation_claim(work_id=203, locale="zh-Hans", lease_token="simplified-token"),
        ],
        translate_descriptions=translate,
    )
    assert result.failures == {(501, "zh-Hans"): TranslationFailure(reason="provider_timeout")}
    with Session(engine) as session:
        work_by_locale = {
            row.locale: row
            for row in session.scalars(select(OpinionGroupDescriptionTranslationWork))
        }
        assert work_by_locale[DisplayLanguageCode.zh_hant].lease_token is None
        assert work_by_locale[DisplayLanguageCode.zh_hans].lease_token == "simplified-token"
        events = session.scalars(select(RealtimeEventOutbox)).all()
        assert len(events) == 1
        assert events[0].payload["locales"] == ["zh-Hant"]


def test_non_processable_ai_cleanup_fallbacks_statuses_without_activation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = None
        session.commit()

    completed_ids = complete_non_processable_ai_description_work_batch(
        engine,
        conversation_ids=[10],
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()

    assert completed_ids == [10]
    assert view_snapshot.activated_at is None
    assert lineage_work.lease_token is None
    assert translation_work.lease_token is None


def test_first_pass_ignores_lazy_pending_translation_request() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_first_pass_ignores_english_effective_target_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(
            session,
            target_language_code=DisplayLanguageCode.en,
        )
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_requested_translation_materializes_without_effective_target_language() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.execute(delete(OpinionGroupDescriptionTranslationWork))
        session.commit()

    conversation_ids = materialize_requested_description_translation_work(
        engine,
        limit=10,
    )

    with Session(engine) as session:
        target_rows = session.execute(select(ConversationTranslationTargetLanguage)).scalars().all()
        translation_work_rows = (
            session.execute(select(OpinionGroupDescriptionTranslationWork)).scalars().all()
        )

    assert conversation_ids == [10]
    assert target_rows == []
    assert [(row.description_id, row.locale) for row in translation_work_rows] == [(501, "fr")]


def test_pending_eager_translation_blocks_snapshot_activation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.fallback_status_count == 1
    assert result.activated_view_snapshot_ids == []
    assert view_snapshot.activated_at is None


def test_claiming_first_pass_work_does_not_activate_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.commit()

    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=1,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        checkpoint_reasons = (
            session.execute(select(ConversationViewSnapshotCheckpointReason)).scalars().all()
        )

    assert len(claims) == 1
    assert view_snapshot.activated_at is None
    assert checkpoint_reasons == []


def test_first_pass_claiming_allows_one_immediate_lineage_retry() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.attempt_count = 1
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
    )

    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedLineageDescriptionWorkItem)
    assert claims[0].attempt_count == 2


def test_first_pass_claiming_uses_materialized_auto_and_facilitator_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        config = session.execute(select(PolisConversationConfig)).scalar_one()
        config.preferred_opinion_group_count = 2
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.preferred_opinion_group_count = 2
        result = session.execute(select(AnalysisSnapshotResult)).scalar_one()
        result.variants_enabled = True
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        existing_lineage_work = session.execute(
            select(OpinionGroupLineageDescriptionWork)
        ).scalar_one()
        existing_translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        session.delete(existing_lineage_work)
        session.delete(existing_translation_work)
        session.add_all(
            [
                OpinionGroupVariant(
                    id=602,
                    opinion_group_spec_id=1,
                    group_count=3,
                    created_at=NOW,
                ),
                OpinionGroupVariant(
                    id=603,
                    opinion_group_spec_id=1,
                    group_count=4,
                    created_at=NOW,
                ),
                OpinionGroupCandidate(
                    id=402,
                    snapshot_result_id=50,
                    opinion_group_variant_id=602,
                    scope_id=702,
                    outcome=AnalysisResultOutcomeEnum.success,
                    outcome_reason=None,
                    raw_output=None,
                    created_at=NOW,
                ),
                OpinionGroupCandidateAssessment(
                    id=902,
                    candidate_id=402,
                    silhouette_score=0.7,
                    coefficient_of_variation=None,
                    balance_score=0.7,
                    selection_score=0.7,
                    hidden_reason=None,
                    created_at=NOW,
                ),
                OpinionGroupCandidate(
                    id=403,
                    snapshot_result_id=50,
                    opinion_group_variant_id=603,
                    scope_id=703,
                    outcome=AnalysisResultOutcomeEnum.success,
                    outcome_reason=None,
                    raw_output=None,
                    created_at=NOW,
                ),
                OpinionGroupCandidateAssessment(
                    id=903,
                    candidate_id=403,
                    silhouette_score=0.9,
                    coefficient_of_variation=None,
                    balance_score=0.9,
                    selection_score=0.9,
                    hidden_reason=None,
                    created_at=NOW,
                ),
                OpinionGroupLineage(
                    id=302,
                    scope_id=702,
                    system_description_id=None,
                    admin_description_id=None,
                    created_at=NOW,
                ),
                OpinionGroupLineage(
                    id=303,
                    scope_id=703,
                    system_description_id=None,
                    admin_description_id=None,
                    created_at=NOW,
                ),
                OpinionGroup(
                    id=802,
                    candidate_id=402,
                    scope_id=702,
                    lineage_id=302,
                    key="1",
                    external_id=1,
                    num_users=1,
                    created_at=NOW,
                ),
                OpinionGroup(
                    id=803,
                    candidate_id=403,
                    scope_id=703,
                    lineage_id=303,
                    key="2",
                    external_id=2,
                    num_users=1,
                    created_at=NOW,
                ),
                OpinionGroupLineageDescriptionWork(
                    id=204,
                    lineage_id=301,
                    conversation_id=10,
                    source_candidate_id=401,
                    attempt_count=0,
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    non_retryable_ai_description_epoch=None,
                    last_error_code=None,
                    last_error_message=None,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                OpinionGroupLineageDescriptionWork(
                    id=205,
                    lineage_id=303,
                    conversation_id=10,
                    source_candidate_id=403,
                    attempt_count=0,
                    lease_owner=None,
                    lease_token=None,
                    lease_expires_at=None,
                    non_retryable_ai_description_epoch=None,
                    last_error_code=None,
                    last_error_message=None,
                    created_at=NOW,
                    updated_at=NOW,
                ),
            ]
        )
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
    )

    with Session(engine) as session:
        work_rows = (
            session.execute(
                select(OpinionGroupLineageDescriptionWork).order_by(
                    OpinionGroupLineageDescriptionWork.source_candidate_id
                )
            )
            .scalars()
            .all()
        )

    assert {
        claim.source_candidate_id
        for claim in claims
        if isinstance(claim, ClaimedLineageDescriptionWorkItem)
    } == {401, 403}
    assert [work.source_candidate_id for work in work_rows] == [401, 403]


def test_first_pass_claiming_stops_after_one_lineage_retry() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.attempt_count = 2
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
    )

    assert claims == []


def test_first_pass_claiming_allows_one_immediate_translation_retry() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 1
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=1,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )

    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedDescriptionTranslationWorkItem)
    assert claims[0].attempt_count == 2


def test_first_pass_claiming_materializes_effective_target_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        conversation.dynamic_translation_enabled = False
        session.execute(
            delete(OpinionGroupDescriptionTranslationWork).where(
                OpinionGroupDescriptionTranslationWork.id == 202,
            )
        )
        session.add_all(
            [
                OpinionGroupDescription(
                    id=501,
                    locale="en",
                    label="Group one",
                    summary="Summary one",
                    created_at=NOW,
                ),
                ConversationTranslationTargetLanguage(
                    id=304,
                    conversation_id=10,
                    language_code="es",
                    created_at=NOW,
                ),
            ]
        )
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )

    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedDescriptionTranslationWorkItem)
    assert claims[0].locale == "es"


def test_first_pass_claiming_ignores_deleted_effective_target_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session, deleted_at=NOW)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.commit()

    claims = claim_first_pass_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )

    assert claims == []


def test_first_pass_finalization_blocks_pending_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.fallback_status_count == 1
    assert result.activated_view_snapshot_ids == []
    assert view_snapshot.activated_at is None


def test_first_pass_finalization_blocks_pending_translation_after_generation_advances() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_effective_conversation_target_language(session)
        config = session.execute(select(PolisConversationConfig)).scalar_one()
        config.analysis_data_generation = 2
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.fallback_status_count == 1
    assert result.activated_view_snapshot_ids == []
    assert view_snapshot.activated_at is None


def test_first_pass_finalization_blocks_pending_english() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.fallback_status_count == 1
    assert result.activated_view_snapshot_ids == []
    assert view_snapshot.activated_at is None


def test_first_pass_finalization_without_ai_generator_bypasses_description_gate() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=False,
        require_ai_descriptions=False,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.fallback_status_count == 0
    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_first_pass_finalization_ignores_ready_english_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.attempt_count = 0
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=False,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_first_pass_finalization_ignores_ready_translation_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        _insert_attempted_eager_translation_work(session)
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork).where(
                OpinionGroupDescriptionTranslationWork.locale == "fr"
            )
        ).scalar_one()
        translation_work.attempt_count = 0
        session.add(
            OpinionGroupDescriptionTranslation(
                id=601,
                description_id=501,
                locale="fr",
                label="Groupe",
                summary="Résumé",
                created_at=NOW,
            )
        )
        _insert_all_eager_translations(session)
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_activation_does_not_publish_content_count_snapshots() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_attempted_eager_translation_work(session)
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=30,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.conversation_content_updated,
                is_closed=False,
                opinion_count=3,
                vote_count=3,
                participant_count=3,
                total_opinion_count=3,
                total_vote_count=3,
                total_participant_count=3,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=None,
                created_at=NOW + timedelta(seconds=1),
            )
        )

        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20, 21],
        translation_enabled=True,
    )

    with Session(engine) as session:
        snapshots = (
            session.execute(select(ConversationViewSnapshot).order_by(ConversationViewSnapshot.id))
            .scalars()
            .all()
        )

    assert result.activated_view_snapshot_ids == [20]
    assert snapshots[0].activated_at is not None
    assert snapshots[1].activated_at is None


def test_newer_content_snapshot_does_not_stale_requested_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=30,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.conversation_content_updated,
                is_closed=False,
                opinion_count=3,
                vote_count=3,
                participant_count=3,
                total_opinion_count=3,
                total_vote_count=3,
                total_participant_count=3,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=None,
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()

    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="math-updater:test",
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )

    assert len(claims) == 1
    assert all(isinstance(claim, ClaimedDescriptionTranslationWorkItem) for claim in claims)
    assert claims[0].locale == "fr"


def test_translation_fallback_allows_first_pass_activation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        _insert_attempted_eager_translation_work(session)
        session.commit()

    result = finalize_first_pass_ai_description_work_batch(
        engine,
        conversation_ids=[10],
        conversation_view_snapshot_ids=[20],
        translation_enabled=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()

    assert result.activated_view_snapshot_ids == [20]
    assert view_snapshot.activated_at is not None


def test_materialize_requested_translation_work_creates_missing_translation_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.execute(delete(OpinionGroupDescriptionTranslationWork))
        session.commit()

    materialized_ids = materialize_requested_description_translation_work(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
    )

    with Session(engine) as session:
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork).where(
                OpinionGroupDescriptionTranslationWork.locale == "fr"
            )
        ).scalar_one()

    assert materialized_ids == [10]
    assert translation_work.lease_token is None


def _seed_translation_candidate_selection(
    session: Session,
    *,
    second_score: float | None = 0.9,
    second_hidden: bool = False,
    preferred_group_count: int | None = None,
    separate_snapshot: bool = False,
) -> None:
    _insert_non_processable_ai_work_state(session)
    _insert_effective_conversation_target_language(session)
    session.execute(delete(OpinionGroupCandidateDescriptionLocaleRequest))
    session.execute(delete(OpinionGroupDescriptionTranslationWork))
    session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = NOW
    session.execute(
        select(PolisConversationConfig)
    ).scalar_one().preferred_opinion_group_count = preferred_group_count
    if separate_snapshot:
        session.add_all(
            [
                AnalysisSnapshotResult(
                    id=51,
                    conversation_id=10,
                    analysis_snapshot_id=31,
                    opinion_group_spec_id=2,
                    outcome=AnalysisResultOutcomeEnum.success,
                    variants_enabled=True,
                    created_at=NOW,
                ),
                ConversationViewSnapshot(
                    id=21,
                    conversation_id=10,
                    opinion_group_spec_id=2,
                    analysis_snapshot_id=31,
                    conversation_content_id=40,
                    view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                    is_closed=False,
                    opinion_count=2,
                    vote_count=2,
                    participant_count=2,
                    total_opinion_count=2,
                    total_vote_count=2,
                    total_participant_count=2,
                    moderated_opinion_count=0,
                    hidden_opinion_count=0,
                    activated_at=NOW,
                    created_at=NOW + timedelta(seconds=1),
                ),
            ]
        )
    session.add_all(
        [
            OpinionGroupVariant(
                id=602,
                opinion_group_spec_id=2 if separate_snapshot else 1,
                group_count=3,
                created_at=NOW,
            ),
            OpinionGroupCandidate(
                id=402,
                snapshot_result_id=51 if separate_snapshot else 50,
                opinion_group_variant_id=602,
                scope_id=702,
                outcome=AnalysisResultOutcomeEnum.success,
                created_at=NOW,
            ),
            OpinionGroupCandidateAssessment(
                id=902,
                candidate_id=402,
                selection_score=second_score,
                hidden_reason=(
                    OpinionGroupCandidateHiddenReasonEnum.singleton_group if second_hidden else None
                ),
                created_at=NOW,
            ),
            OpinionGroupLineage(
                id=302,
                scope_id=702,
                system_description_id=502,
                created_at=NOW,
            ),
            OpinionGroup(
                id=802,
                candidate_id=402,
                scope_id=702,
                lineage_id=302,
                key="0",
                external_id=0,
                num_users=1,
                created_at=NOW,
            ),
        ]
    )
    session.commit()


@pytest.mark.parametrize(
    ("second_score", "second_hidden", "preferred_group_count", "expected_description_id"),
    [
        (0.9, False, None, 502),
        (0.8, False, None, 502),
        (0.7, False, None, 501),
        (0.9, True, None, 501),
        (None, False, None, 501),
        (0.9, False, 2, 501),
        (0.7, False, 3, 502),
        (0.9, False, 4, None),
    ],
)
def test_eager_translation_selection_and_claims_agree_before_limit(
    *,
    lineage_scan_engine: Engine,
    second_score: float | None,
    second_hidden: bool,
    preferred_group_count: int | None,
    expected_description_id: int | None,
) -> None:
    engine = lineage_scan_engine
    with Session(engine) as session:
        _seed_translation_candidate_selection(
            session,
            second_score=second_score,
            second_hidden=second_hidden,
            preferred_group_count=preferred_group_count,
        )

    materialized = materialize_requested_description_translation_work(
        engine, limit=1, require_activated_view_snapshot=True
    )
    # Previously materialized losing/unselectable candidates must not become
    # claimable just because a work row exists for them.
    with Session(engine) as session:
        existing_description_ids = set(
            session.scalars(select(OpinionGroupDescriptionTranslationWork.description_id))
        )
        for description_id in {501, 502} - existing_description_ids:
            session.add(
                OpinionGroupDescriptionTranslationWork(
                    description_id=description_id,
                    conversation_id=10,
                    locale=DisplayLanguageCode.fr,
                    attempt_count=0,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
        session.commit()
    claimable = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=1,
        ai_description_epoch=1,
        translation_enabled=True,
        include_lineage_descriptions=False,
        require_activated_view_snapshot=True,
    )
    claims = claim_ai_description_locale_work_items_batch(
        engine,
        conversation_ids=[10],
        worker_id="translation-selection-test",
        lease_ttl_seconds=120,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
    )
    expected_conversations = [] if expected_description_id is None else [10]
    assert materialized == claimable == expected_conversations
    assert [
        claim.description_id
        for claim in claims
        if isinstance(claim, ClaimedDescriptionTranslationWorkItem)
    ] == ([] if expected_description_id is None else [expected_description_id])
    assert (
        materialize_requested_description_translation_work(
            engine, limit=1, require_activated_view_snapshot=True
        )
        == []
    )


def test_eager_translation_limit_advances_past_existing_work(lineage_scan_engine: Engine) -> None:
    engine = lineage_scan_engine
    with Session(engine) as session:
        _seed_translation_candidate_selection(session, separate_snapshot=True)

    for expected_descriptions in ([502], [501, 502]):
        assert materialize_requested_description_translation_work(
            engine, limit=1, require_activated_view_snapshot=True
        ) == [10]
        with Session(engine) as session:
            assert (
                list(
                    session.scalars(
                        select(OpinionGroupDescriptionTranslationWork.description_id).order_by(
                            OpinionGroupDescriptionTranslationWork.description_id
                        )
                    )
                )
                == expected_descriptions
            )
    assert (
        materialize_requested_description_translation_work(
            engine, limit=1, require_activated_view_snapshot=True
        )
        == []
    )


@pytest.mark.parametrize("newest_state", ["ready", "pending", "leased"])
def test_eager_lineage_limit_skips_candidates_without_new_work(
    *, lineage_scan_engine: Engine, newest_state: str
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_candidate_selection(session, separate_snapshot=True)
        session.execute(delete(OpinionGroupLineageDescriptionWork))
        session.execute(
            select(OpinionGroupLineage).where(OpinionGroupLineage.id == 301)
        ).scalar_one().system_description_id = None
        if newest_state != "ready":
            session.execute(
                select(OpinionGroupLineage).where(OpinionGroupLineage.id == 302)
            ).scalar_one().system_description_id = None
            session.add(
                OpinionGroupLineageDescriptionWork(
                    lineage_id=302,
                    conversation_id=10,
                    source_candidate_id=999 if newest_state == "leased" else 402,
                    attempt_count=1,
                    lease_owner="other" if newest_state == "leased" else None,
                    lease_token="active" if newest_state == "leased" else None,
                    lease_expires_at=datetime.now(UTC) + timedelta(minutes=10)
                    if newest_state == "leased"
                    else None,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
        session.commit()

    assert materialize_requested_lineage_description_work(
        lineage_scan_engine, limit=1, require_activated_view_snapshot=True
    ) == [10]
    with Session(lineage_scan_engine) as session:
        work = session.execute(
            select(OpinionGroupLineageDescriptionWork).where(
                OpinionGroupLineageDescriptionWork.lineage_id == 301
            )
        ).scalar_one()
        assert work.source_candidate_id == 401
        assert work.attempt_count == 0


def test_requested_translation_preserves_first_request_owner_for_shared_description(
    lineage_scan_engine: Engine,
) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_translation_candidate_selection(session, separate_snapshot=True)
        session.add(
            Conversation(
                id=11,
                slug_id="other123",
                project_id=1,
                current_content_id=41,
                polis_config_id=11,
                language_settings_source=ConversationLanguageSettingsSource.conversation_override,
                participation_mode=ParticipationMode.account_required,
                conversation_type=ConversationType.polis,
                created_at=NOW,
                updated_at=NOW,
                last_reacted_at=NOW,
            )
        )
        session.add(
            PolisConversationConfig(
                id=11,
                voting_presentation=PolisVotingPresentation.list,
                ai_labeling_enabled=True,
                analysis_data_generation=1,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.add(
            ConversationContent(
                id=41,
                public_id=uuid.UUID("00000000-0000-0000-0000-000000000041"),
                conversation_id=11,
                title="Other conversation",
                created_at=NOW,
            )
        )
        result = session.execute(
            select(AnalysisSnapshotResult).where(AnalysisSnapshotResult.id == 51)
        ).scalar_one()
        result.conversation_id = 11
        view = session.execute(
            select(ConversationViewSnapshot).where(ConversationViewSnapshot.id == 21)
        ).scalar_one()
        view.conversation_id = 11
        view.conversation_content_id = 41
        session.execute(
            select(OpinionGroupLineage).where(OpinionGroupLineage.id == 302)
        ).scalar_one().system_description_id = 501
        for request_id, candidate_id in ((101, 401), (102, 402)):
            session.add(
                OpinionGroupCandidateDescriptionLocaleRequest(
                    id=request_id,
                    candidate_id=candidate_id,
                    locale=DisplayLanguageCode.fr,
                    created_at=NOW,
                    updated_at=NOW + timedelta(seconds=request_id - 101),
                )
            )
        session.add(
            OpinionGroupDescriptionTranslationWork(
                description_id=501,
                conversation_id=10,
                locale=DisplayLanguageCode.fr,
                attempt_count=1,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    for _ in range(2):
        assert (
            materialize_requested_description_translation_work(
                lineage_scan_engine, limit=1, require_activated_view_snapshot=True
            )
            == []
        )
    with Session(lineage_scan_engine) as session:
        work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
        assert work.conversation_id == 10
        assert work.attempt_count == 1


@pytest.mark.parametrize("newest_state", ["missing_description", "translated"])
def test_eager_translation_limit_skips_candidates_without_materializable_work(
    *,
    lineage_scan_engine: Engine,
    newest_state: str,
) -> None:
    engine = lineage_scan_engine
    with Session(engine) as session:
        _seed_translation_candidate_selection(session, separate_snapshot=True)
        if newest_state == "missing_description":
            session.execute(
                select(OpinionGroupLineage).where(OpinionGroupLineage.id == 302)
            ).scalar_one().system_description_id = None
        else:
            session.add(
                OpinionGroupDescriptionTranslation(
                    description_id=502,
                    locale=DisplayLanguageCode.fr,
                    label="Groupe",
                    summary="Résumé",
                    created_at=NOW,
                )
            )
        session.commit()

    assert materialize_requested_description_translation_work(
        engine, limit=1, require_activated_view_snapshot=True
    ) == [10]
    with Session(engine) as session:
        assert (
            session.scalars(select(OpinionGroupDescriptionTranslationWork.description_id)).one()
            == 501
        )


@pytest.mark.parametrize("state", ["pending", "leased", "cooldown", "non_retryable"])
def test_requested_translation_limit_skips_existing_work_without_rewriting(
    *,
    lineage_scan_engine: Engine,
    state: str,
) -> None:
    engine = lineage_scan_engine
    state_query = select(
        OpinionGroupDescriptionTranslationWork.attempt_count,
        OpinionGroupDescriptionTranslationWork.lease_owner,
        OpinionGroupDescriptionTranslationWork.lease_token,
        OpinionGroupDescriptionTranslationWork.lease_expires_at,
        OpinionGroupDescriptionTranslationWork.last_error_code,
        OpinionGroupDescriptionTranslationWork.last_error_at,
        OpinionGroupDescriptionTranslationWork.non_retryable_ai_description_epoch,
        OpinionGroupDescriptionTranslationWork.updated_at,
    ).where(OpinionGroupDescriptionTranslationWork.id == 202)
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = NOW
        work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
        work.attempt_count = 0 if state == "pending" else 1
        if state == "leased":
            work.lease_owner = "other-worker"
            work.lease_token = "other-token"
            work.lease_expires_at = datetime.now(UTC) + timedelta(minutes=10)
        if state == "cooldown":
            work.last_error_code = AI_DESCRIPTION_RETRYABLE_ERROR_CODE
            work.last_error_at = datetime.now(UTC)
        if state == "non_retryable":
            work.non_retryable_ai_description_epoch = 1
        session.add(
            OpinionGroupCandidateDescriptionLocaleRequest(
                id=102,
                candidate_id=401,
                locale=DisplayLanguageCode.es,
                created_at=NOW + timedelta(seconds=1),
                updated_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()
        before = session.execute(state_query).one()

    assert materialize_requested_description_translation_work(
        engine, limit=1, require_activated_view_snapshot=True
    ) == [10]
    assert (
        materialize_requested_description_translation_work(
            engine, limit=1, require_activated_view_snapshot=True
        )
        == []
    )
    with Session(engine) as session:
        assert session.execute(state_query).one() == before
        assert set(session.scalars(select(OpinionGroupDescriptionTranslationWork.locale))) == {
            DisplayLanguageCode.fr,
            DisplayLanguageCode.es,
        }


@pytest.mark.parametrize("eager", [True, False])
@pytest.mark.parametrize("leased", [True, False])
def test_translation_materialization_reports_only_unleased_reassignments(
    *,
    lineage_scan_engine: Engine,
    eager: bool,
    leased: bool,
) -> None:
    with Session(lineage_scan_engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.execute(select(ConversationViewSnapshot)).scalar_one().activated_at = NOW
        if eager:
            _insert_effective_conversation_target_language(session)
            session.execute(delete(OpinionGroupCandidateDescriptionLocaleRequest))
        work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
        work.conversation_id = 999
        work.non_retryable_ai_description_epoch = 1
        if leased:
            work.lease_owner = "other-worker"
            work.lease_token = "other-token"
            work.lease_expires_at = datetime.now(UTC) + timedelta(minutes=10)
        session.commit()

    changed_ids = materialize_requested_description_translation_work(
        lineage_scan_engine, limit=1, require_activated_view_snapshot=True
    )
    assert changed_ids == ([] if leased else [10])
    assert (
        materialize_requested_description_translation_work(
            lineage_scan_engine, limit=1, require_activated_view_snapshot=True
        )
        == []
    )
    with Session(lineage_scan_engine) as session:
        work = session.execute(select(OpinionGroupDescriptionTranslationWork)).scalar_one()
        assert work.conversation_id == (999 if leased else 10)
        assert work.lease_token == ("other-token" if leased else None)
        assert work.attempt_count == 1
        assert work.non_retryable_ai_description_epoch == 1


def test_materialize_requested_translation_work_includes_checkpoints_when_enabled() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        request = session.execute(
            select(OpinionGroupCandidateDescriptionLocaleRequest)
        ).scalar_one()
        request.updated_at = NOW
        session.add(
            OpinionGroupDescriptionTranslation(
                id=601,
                description_id=501,
                locale="fr",
                label="Groupe",
                summary="Résumé",
                created_at=NOW,
            )
        )
        session.add(
            OpinionGroupCandidateDescriptionLocaleRequest(
                id=102,
                candidate_id=401,
                locale="es",
                created_at=NOW + timedelta(seconds=1),
                updated_at=NOW + timedelta(seconds=1),
            )
        )
        session.add(
            ConversationViewSnapshotCheckpointReason(
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis,
                group_count=None,
                participant_milestone=None,
                vote_milestone=None,
                created_at=NOW,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=False,
                opinion_count=2,
                vote_count=2,
                participant_count=2,
                total_opinion_count=2,
                total_vote_count=2,
                total_participant_count=2,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW + timedelta(seconds=1),
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()

    default_materialized_ids = materialize_requested_description_translation_work(
        engine,
        limit=1,
        require_activated_view_snapshot=True,
    )
    checkpoint_materialized_ids = materialize_requested_description_translation_work(
        engine,
        limit=1,
        require_activated_view_snapshot=True,
        include_checkpoints=True,
    )

    assert default_materialized_ids == []
    assert checkpoint_materialized_ids == [10]
    with Session(engine) as session:
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork).where(
                OpinionGroupDescriptionTranslationWork.locale == "es"
            )
        ).scalar_one()

    assert translation_work.description_id == 501


@pytest.mark.parametrize("locale", [DisplayLanguageCode.en, DisplayLanguageCode.fr])
def test_materialize_requested_lineage_work_includes_checkpoints_when_enabled(
    locale: DisplayLanguageCode,
) -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.execute(delete(OpinionGroupLineageDescriptionWork))
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        request = session.execute(
            select(OpinionGroupCandidateDescriptionLocaleRequest)
        ).scalar_one()
        request.locale = locale
        session.add(
            ConversationViewSnapshotCheckpointReason(
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis,
                group_count=None,
                participant_milestone=None,
                vote_milestone=None,
                created_at=NOW,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=False,
                opinion_count=2,
                vote_count=2,
                participant_count=2,
                total_opinion_count=2,
                total_vote_count=2,
                total_participant_count=2,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW + timedelta(seconds=1),
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()

    default_materialized_ids = materialize_requested_lineage_description_work(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
    )
    checkpoint_materialized_ids = materialize_requested_lineage_description_work(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
        include_checkpoints=True,
    )

    assert default_materialized_ids == []
    assert checkpoint_materialized_ids == [10]


def test_materialize_requested_translation_work_skips_ready_translation() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.add(
            OpinionGroupDescriptionTranslation(
                id=601,
                description_id=501,
                locale="fr",
                label="Groupe",
                summary="Résumé",
                created_at=NOW,
            )
        )
        _insert_all_eager_translations(session)
        session.commit()

    materialized_ids = materialize_requested_description_translation_work(
        engine,
        limit=10,
        require_activated_view_snapshot=True,
    )
    claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        include_lineage_descriptions=False,
        require_activated_view_snapshot=True,
    )

    assert materialized_ids == []
    assert claimable_ids == []


def test_translation_retry_fallback_does_not_activate_first_pass_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.lease_owner = "worker-1"
        translation_work.lease_token = "token-translation"
        translation_work.lease_expires_at = NOW + timedelta(minutes=10)
        session.commit()

    schedule = retry_ai_description_locale_work_item(
        engine,
        claim=ClaimedDescriptionTranslationWorkItem(
            id=202,
            conversation_id=10,
            conversation_slug_id="abc12345",
            description_id=501,
            locale="fr",
            attempt_count=1,
            lease_token="token-translation",
        ),
        error_code="ai_description_retryable",
        error_message="temporary translation failure",
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()

    assert schedule.retry_released_at is not None
    assert view_snapshot.activated_at is None
    assert translation_work.lease_token is None


@pytest.mark.parametrize(
    ("error_code", "wait_seconds"),
    [(AI_DESCRIPTION_RETRYABLE_ERROR_CODE, 301), (AI_DESCRIPTION_OUTPUT_ERROR_CODE, 31)],
)
def test_retry_cooldown_blocks_recent_failed_lineage_work(
    *, error_code: str, wait_seconds: int
) -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.last_error_code = error_code
        lineage_work.last_error_at = datetime.now(UTC)
        session.commit()

    cooldown_claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        include_lineage_descriptions=True,
        include_translations=False,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )
    cooldown_claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        claim_lineage_descriptions=True,
        claim_translations=False,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )

    with Session(engine) as session:
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.last_error_at = datetime.now(UTC) - timedelta(seconds=wait_seconds)
        session.commit()

    expired_cooldown_claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        include_lineage_descriptions=True,
        include_translations=False,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )
    expired_cooldown_claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        claim_lineage_descriptions=True,
        claim_translations=False,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )

    assert cooldown_claimable_ids == []
    assert cooldown_claims == []
    assert expired_cooldown_claimable_ids == [10]
    assert len(expired_cooldown_claims) == 1
    assert isinstance(expired_cooldown_claims[0], ClaimedLineageDescriptionWorkItem)


@pytest.mark.parametrize(
    ("error_code", "wait_seconds"),
    [(AI_DESCRIPTION_RETRYABLE_ERROR_CODE, 301), (AI_DESCRIPTION_OUTPUT_ERROR_CODE, 31)],
)
def test_retry_cooldown_blocks_recent_failed_translation_work(
    *, error_code: str, wait_seconds: int
) -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.last_error_code = error_code
        translation_work.last_error_at = datetime.now(UTC)
        session.commit()

    cooldown_claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        include_lineage_descriptions=False,
        include_translations=True,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )
    cooldown_claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
        claim_translations=True,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )

    with Session(engine) as session:
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.last_error_at = datetime.now(UTC) - timedelta(seconds=wait_seconds)
        session.commit()

    expired_cooldown_claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        include_lineage_descriptions=False,
        include_translations=True,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )
    expired_cooldown_claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
        claim_lineage_descriptions=False,
        claim_translations=True,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )

    assert cooldown_claimable_ids == []
    assert cooldown_claims == []
    assert expired_cooldown_claimable_ids == [10]
    assert len(expired_cooldown_claims) == 1
    assert isinstance(expired_cooldown_claims[0], ClaimedDescriptionTranslationWorkItem)


def test_retry_cooldown_does_not_block_non_retryable_lineage_after_epoch_bump() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.last_error_code = AI_DESCRIPTION_NON_RETRYABLE_ERROR_CODE
        lineage_work.last_error_at = datetime.now(UTC)
        lineage_work.non_retryable_ai_description_epoch = 1
        session.commit()

    claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=2,
        translation_enabled=False,
        include_lineage_descriptions=True,
        include_translations=False,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )
    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=2,
        translation_enabled=False,
        claim_lineage_descriptions=True,
        claim_translations=False,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )

    assert claimable_ids == [10]
    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedLineageDescriptionWorkItem)


def test_retry_cooldown_does_not_block_non_retryable_translation_after_epoch_bump() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        translation_work = session.execute(
            select(OpinionGroupDescriptionTranslationWork)
        ).scalar_one()
        translation_work.last_error_code = AI_DESCRIPTION_NON_RETRYABLE_ERROR_CODE
        translation_work.last_error_at = datetime.now(UTC)
        translation_work.non_retryable_ai_description_epoch = 1
        session.commit()

    claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=2,
        translation_enabled=True,
        include_lineage_descriptions=False,
        include_translations=True,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )
    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=2,
        translation_enabled=True,
        claim_lineage_descriptions=False,
        claim_translations=True,
        require_activated_view_snapshot=True,
        retry_cooldown_seconds=300,
    )

    assert claimable_ids == [10]
    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedDescriptionTranslationWorkItem)


def test_stale_non_checkpoint_retry_work_is_not_claimable() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=False,
                opinion_count=2,
                vote_count=2,
                participant_count=2,
                total_opinion_count=2,
                total_vote_count=2,
                total_participant_count=2,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW + timedelta(seconds=1),
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()

    claimable_conversation_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
    )
    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=True,
    )

    assert claimable_conversation_ids == []
    assert claims == []


def test_retry_claim_requires_activated_view_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        session.commit()

    unactivated_claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )
    unactivated_claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.commit()

    activated_claimable_ids = fetch_claimable_ai_description_work_conversation_ids(
        engine,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )
    activated_claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )

    assert unactivated_claimable_ids == []
    assert unactivated_claims == []
    assert activated_claimable_ids == [10]
    assert len(activated_claims) == 1
    assert isinstance(activated_claims[0], ClaimedLineageDescriptionWorkItem)


def test_retry_claim_allows_activated_checkpoint_after_newer_snapshot() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        session.add(
            ConversationViewSnapshotCheckpointReason(
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis,
                group_count=None,
                participant_milestone=None,
                vote_milestone=None,
                created_at=NOW,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=False,
                opinion_count=2,
                vote_count=2,
                participant_count=2,
                total_opinion_count=2,
                total_vote_count=2,
                total_participant_count=2,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW + timedelta(seconds=1),
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.commit()

    claims = claim_ai_description_locale_work_items_batch(
        engine,
        worker_id="worker-1",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        ai_description_epoch=1,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )

    assert len(claims) == 1
    assert isinstance(claims[0], ClaimedLineageDescriptionWorkItem)


def test_recover_expired_work_can_target_unactivated_first_pass() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.lease_owner = "worker-1"
        lineage_work.lease_token = "token-1"
        lineage_work.lease_expires_at = NOW - timedelta(seconds=1)
        session.commit()

    recovered_ids = recover_expired_ai_description_work(
        engine,
        translation_enabled=False,
        require_unactivated_view_snapshot=True,
    )

    with Session(engine) as session:
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()

    assert recovered_ids == [10]
    assert lineage_work.lease_token is None


def test_unactivated_recovery_does_not_claim_activated_retry_work() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        lineage = session.execute(select(OpinionGroupLineage)).scalar_one()
        lineage.system_description_id = None
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()
        lineage_work.lease_owner = "worker-1"
        lineage_work.lease_token = "token-1"
        lineage_work.lease_expires_at = NOW - timedelta(seconds=1)
        session.commit()

    unactivated_recovered_ids = recover_expired_ai_description_work(
        engine,
        translation_enabled=False,
        require_unactivated_view_snapshot=True,
    )
    activated_recovered_ids = recover_expired_ai_description_work(
        engine,
        translation_enabled=False,
        require_activated_view_snapshot=True,
    )

    assert unactivated_recovered_ids == []
    assert activated_recovered_ids == [10]


def test_completion_releases_stale_unactivated_first_pass_after_new_votes() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add(
            AnalysisWorkState(
                id=901,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=0,
                running_data_generation=1,
                persisted_analysis_snapshot_id=30,
                dirty_since=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=NOW + timedelta(minutes=10),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    claim = ClaimedWorkItem(
        id=901,
        conversation_id=10,
        conversation_slug_id="abc12345",
        opinion_group_spec_id=1,
        data_generation=1,
        attempt_count=1,
        lease_token="analysis-token",
        persisted_analysis_snapshot_id=30,
    )

    blocked_schedules = complete_computed_analysis_work_items_batch(
        engine,
        claims=[claim],
        require_display_safe_activation=True,
    )
    with Session(engine) as session:
        blocked_state = session.execute(select(AnalysisWorkState)).scalar_one()
        blocked_running_generation = blocked_state.running_data_generation
        blocked_persisted_snapshot_id = blocked_state.persisted_analysis_snapshot_id
        blocked_lease_token = blocked_state.lease_token
        config = session.execute(select(PolisConversationConfig)).scalar_one()
        config.analysis_data_generation = 2
        session.commit()

    stale_schedules = complete_computed_analysis_work_items_batch(
        engine,
        claims=[claim],
        require_display_safe_activation=True,
    )
    with Session(engine) as session:
        stale_state = session.execute(select(AnalysisWorkState)).scalar_one()
        stale_last_completed_generation = stale_state.last_completed_data_generation
        stale_running_generation = stale_state.running_data_generation
        stale_persisted_snapshot_id = stale_state.persisted_analysis_snapshot_id

    assert blocked_schedules == []
    assert blocked_running_generation == 1
    assert blocked_persisted_snapshot_id == 30
    assert blocked_lease_token == "analysis-token"
    assert stale_schedules == [10]
    assert stale_last_completed_generation == 1
    assert stale_running_generation is None
    assert stale_persisted_snapshot_id is None


@pytest.mark.parametrize("attempt_count, delay_seconds", [(1, 5), (2, 15), (3, 60), (20, 300)])
def test_closing_work_retries_after_durable_bounded_backoff(
    lineage_scan_engine: Engine, attempt_count: int, delay_seconds: int
) -> None:
    engine = lineage_scan_engine
    if engine.dialect.name != "postgresql":
        pytest.skip("Closing retries exercise PostgreSQL correlated UPDATE RETURNING")
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        conversation.is_closed = True
        conversation.closing_target_revision = 1
        session.add(
            AnalysisWorkState(
                id=901,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=0,
                running_data_generation=1,
                attempt_generation=1,
                attempt_count=attempt_count,
                lease_owner="math-updater",
                lease_token="failed-token",
                lease_expires_at=datetime.now(UTC) + timedelta(seconds=60),
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()
    mark_non_retryable_work_items_batch(
        engine,
        claims=[
            ClaimedWorkItem(
                id=901,
                conversation_id=10,
                conversation_slug_id="conv1234",
                opinion_group_spec_id=1,
                data_generation=1,
                attempt_count=attempt_count,
                lease_token="failed-token",
                persisted_analysis_snapshot_id=None,
            )
        ],
        analysis_engine_epoch=1,
        error_code="bad_result",
        error_message="Failed computation",
    )

    def claim_work() -> list[ClaimedWorkItem]:
        return claim_work_items_batch(
            engine,
            worker_id="restarted-worker",
            conversation_ids=[10],
            lease_ttl_seconds=60,
            limit=10,
            analysis_engine_epoch=1,
        )

    assert fetch_claimable_work_conversation_ids(engine, limit=10, analysis_engine_epoch=1) == []
    assert claim_work() == []
    with Session(engine) as session:
        state = session.get_one(AnalysisWorkState, 901)
        state.updated_at = datetime.now(UTC) - timedelta(seconds=delay_seconds + 1)
        session.commit()
    assert fetch_claimable_work_conversation_ids(engine, limit=10, analysis_engine_epoch=1) == [10]
    claims = claim_work()
    assert len(claims) == 1
    assert claims[0].attempt_count == attempt_count + 1


def test_expired_unpersisted_analysis_work_is_claimable_immediately() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add(
            AnalysisWorkState(
                id=901,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=0,
                running_data_generation=1,
                persisted_analysis_snapshot_id=None,
                dirty_since=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=datetime.now(UTC) - timedelta(seconds=1),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    claimable_ids = fetch_claimable_work_conversation_ids(
        engine,
        limit=10,
        analysis_engine_epoch=1,
    )
    claims = claim_work_items_batch(
        engine,
        worker_id="math-updater-2",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        analysis_engine_epoch=1,
    )
    claimable_after_claim_ids = fetch_claimable_work_conversation_ids(
        engine,
        limit=10,
        analysis_engine_epoch=1,
    )

    assert claimable_ids == [10]
    assert len(claims) == 1
    assert claims[0].conversation_id == 10
    assert claims[0].data_generation == 1
    assert claims[0].attempt_count == 2
    assert claimable_after_claim_ids == []


def test_expired_first_pass_analysis_work_claimable_after_snapshot_checkpoint() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        view_snapshot.activated_at = NOW
        session.add(
            ConversationViewSnapshotCheckpointReason(
                conversation_view_snapshot_id=20,
                conversation_id=10,
                opinion_group_spec_id=1,
                reason=ConversationViewSnapshotCheckpointReasonEnum.first_displayable_analysis,
                group_count=None,
                participant_milestone=None,
                vote_milestone=None,
                created_at=NOW,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
                survey_aggregate_snapshot_id=None,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=False,
                opinion_count=2,
                vote_count=2,
                participant_count=2,
                total_opinion_count=2,
                total_vote_count=2,
                total_participant_count=2,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW + timedelta(seconds=1),
                created_at=NOW + timedelta(seconds=1),
            )
        )
        session.add(
            AnalysisWorkState(
                id=901,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=0,
                running_data_generation=1,
                persisted_analysis_snapshot_id=None,
                dirty_since=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=datetime.now(UTC) - timedelta(seconds=1),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    claimable_ids = fetch_claimable_work_conversation_ids(
        engine,
        limit=10,
        analysis_engine_epoch=1,
    )
    claims = claim_work_items_batch(
        engine,
        worker_id="math-updater-2",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        analysis_engine_epoch=1,
    )

    assert claimable_ids == [10]
    assert len(claims) == 1
    assert claims[0].conversation_id == 10
    assert claims[0].data_generation == 1
    assert claims[0].attempt_count == 2


def test_active_analysis_lease_blocks_duplicate_claim() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        conversation = session.execute(select(Conversation)).scalar_one()
        conversation.current_content_id = 40
        session.add(
            AnalysisWorkState(
                id=901,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=0,
                running_data_generation=1,
                persisted_analysis_snapshot_id=None,
                dirty_since=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=datetime.now(UTC) + timedelta(minutes=10),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    claimable_ids = fetch_claimable_work_conversation_ids(
        engine,
        limit=10,
        analysis_engine_epoch=1,
    )
    claims = claim_work_items_batch(
        engine,
        worker_id="math-updater-2",
        conversation_ids=[10],
        lease_ttl_seconds=60,
        limit=10,
        analysis_engine_epoch=1,
    )

    assert claimable_ids == []
    assert claims == []


def test_extend_postgres_leases_only_extends_active_owned_claims() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.add_all(
            [
                AnalysisWorkState(
                    id=901,
                    conversation_id=10,
                    opinion_group_spec_id=1,
                    last_completed_data_generation=0,
                    running_data_generation=1,
                    persisted_analysis_snapshot_id=None,
                    dirty_since=None,
                    attempt_generation=1,
                    attempt_count=1,
                    non_retryable_generation=None,
                    non_retryable_analysis_engine_epoch=None,
                    lease_owner="math-updater",
                    lease_token="analysis-token",
                    lease_expires_at=NOW + timedelta(seconds=1),
                    last_error_kind=None,
                    last_error_code=None,
                    last_error_message=None,
                    last_error_stack_hash=None,
                    created_at=NOW,
                    updated_at=NOW,
                ),
                AnalysisWorkState(
                    id=902,
                    conversation_id=10,
                    opinion_group_spec_id=1,
                    last_completed_data_generation=0,
                    running_data_generation=2,
                    persisted_analysis_snapshot_id=None,
                    dirty_since=None,
                    attempt_generation=2,
                    attempt_count=1,
                    non_retryable_generation=None,
                    non_retryable_analysis_engine_epoch=None,
                    lease_owner="math-updater",
                    lease_token="other-token",
                    lease_expires_at=NOW + timedelta(seconds=1),
                    last_error_kind=None,
                    last_error_code=None,
                    last_error_message=None,
                    last_error_stack_hash=None,
                    created_at=NOW,
                    updated_at=NOW,
                ),
            ]
        )
        session.commit()

    result = extend_postgres_leases(
        engine,
        claims=[
            ClaimedWorkItem(
                id=901,
                conversation_id=10,
                conversation_slug_id="abc12345",
                opinion_group_spec_id=1,
                data_generation=1,
                attempt_count=1,
                lease_token="analysis-token",
                persisted_analysis_snapshot_id=None,
            ),
            ClaimedWorkItem(
                id=902,
                conversation_id=10,
                conversation_slug_id="abc12345",
                opinion_group_spec_id=1,
                data_generation=2,
                attempt_count=1,
                lease_token="stale-token",
                persisted_analysis_snapshot_id=None,
            ),
        ],
        lease_ttl_seconds=120,
    )

    with Session(engine) as session:
        work_states = (
            session.execute(select(AnalysisWorkState).order_by(AnalysisWorkState.id))
            .scalars()
            .all()
        )

    original_expires_at = (NOW + timedelta(seconds=1)).replace(tzinfo=None)
    assert result.extended_work_state_ids == [901]
    assert work_states[0].lease_expires_at is not None
    assert work_states[0].lease_expires_at > original_expires_at
    assert work_states[1].lease_expires_at == original_expires_at


@pytest.mark.parametrize("locked_kind", ["lineage", "translation"])
def test_ai_heartbeat_skips_locked_work_and_renews_other_claims(
    lineage_scan_engine: Engine,
    locked_kind: str,
) -> None:
    if lineage_scan_engine.dialect.name != "postgresql":
        pytest.skip("Requires PostgreSQL row locks")
    original_expiry = datetime.now(UTC) + timedelta(seconds=45)
    with Session(lineage_scan_engine) as session:
        _insert_non_processable_ai_work_state(session, leased_lineage_work=True)
        lineage = session.get(OpinionGroupLineageDescriptionWork, 201)
        assert lineage is not None
        lineage.lease_expires_at = original_expiry
        translation = session.get(OpinionGroupDescriptionTranslationWork, 202)
        assert translation is not None
        translation.lease_token = "translation-token"
        translation.lease_owner = "translation-worker"
        translation.lease_expires_at = original_expiry
        for work_id in (203, 204):
            session.add(
                OpinionGroupLineageDescriptionWork(
                    id=work_id,
                    lineage_id=work_id + 100,
                    conversation_id=10,
                    source_candidate_id=401,
                    attempt_count=1,
                    lease_owner="worker-1",
                    lease_token=f"lineage-{work_id}",
                    lease_expires_at=original_expiry,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
            session.add(
                OpinionGroupDescriptionTranslationWork(
                    id=work_id,
                    description_id=work_id + 500,
                    conversation_id=10,
                    locale=DisplayLanguageCode.fr,
                    attempt_count=1,
                    lease_owner="translation-worker",
                    lease_token=f"translation-{work_id}",
                    lease_expires_at=original_expiry,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
        session.commit()
    claims = [
        ClaimedLineageDescriptionWorkItem(
            id=201,
            conversation_id=10,
            conversation_slug_id="test",
            lineage_id=301,
            source_candidate_id=401,
            locale="en",
            attempt_count=1,
            lease_token="token-1",
        ),
        ClaimedDescriptionTranslationWorkItem(
            id=202,
            conversation_id=10,
            conversation_slug_id="test",
            description_id=501,
            locale="fr",
            attempt_count=1,
            lease_token="translation-token",
        ),
    ]
    for work_id in (203, 204):
        claims.extend(
            [
                ClaimedLineageDescriptionWorkItem(
                    id=work_id,
                    conversation_id=10,
                    conversation_slug_id="test",
                    lineage_id=work_id + 100,
                    source_candidate_id=401,
                    locale="en",
                    attempt_count=1,
                    lease_token=f"lineage-{work_id}",
                ),
                ClaimedDescriptionTranslationWorkItem(
                    id=work_id,
                    conversation_id=10,
                    conversation_slug_id="test",
                    description_id=work_id + 500,
                    locale="fr",
                    attempt_count=1,
                    lease_token=f"translation-{work_id}",
                ),
            ]
        )
    options = lineage_scan_engine.url.query.get("options", "")
    assert isinstance(options, str)
    heartbeat_engine = create_engine(
        lineage_scan_engine.url.update_query_dict(
            {
                "options": f"{options} -c lock_timeout=200ms",
            }
        )
    )
    locked_table = (
        OpinionGroupLineageDescriptionWork
        if locked_kind == "lineage"
        else OpinionGroupDescriptionTranslationWork
    )
    locked_id = 201 if locked_kind == "lineage" else 202
    try:
        with Session(lineage_scan_engine) as completing:
            # Simulate a completion that has cleared its token but is still
            # scanning/materializing before commit, as in the production lock tree.
            completing.execute(
                update(locked_table)
                .where(
                    locked_table.id == locked_id,
                )
                .values(lease_owner=None, lease_token=None, lease_expires_at=None)
            )
            result = extend_ai_description_locale_work_leases(
                heartbeat_engine,
                claims=claims,
                lease_ttl_seconds=120,
            )
            assert result.extended_lineage_work_ids == (
                [203, 204] if locked_kind == "lineage" else [201, 203, 204]
            )
            assert result.extended_translation_work_ids == (
                [203, 204] if locked_kind == "translation" else [202, 203, 204]
            )
            with Session(heartbeat_engine) as observer:
                for model in (
                    OpinionGroupLineageDescriptionWork,
                    OpinionGroupDescriptionTranslationWork,
                ):
                    siblings = observer.scalars(select(model).where(model.id.in_([203, 204]))).all()
                    assert len(siblings) == 2
                    assert all(
                        row.lease_expires_at is not None
                        and row.lease_expires_at > original_expiry.replace(tzinfo=None)
                        for row in siblings
                    )
            completing.rollback()
        # Skipping a busy row must not lose it from subsequent heartbeat rounds.
        result = extend_ai_description_locale_work_leases(
            heartbeat_engine,
            claims=claims,
            lease_ttl_seconds=120,
        )
        assert result.extended_lineage_work_ids == [201, 203, 204]
        assert result.extended_translation_work_ids == [202, 203, 204]
    finally:
        heartbeat_engine.dispose()


def test_extend_ai_description_locale_work_leases_only_extends_active_claims() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session, leased_lineage_work=True)
        translation_work = session.get(OpinionGroupDescriptionTranslationWork, 202)
        assert translation_work is not None
        translation_work.lease_owner = "worker-1"
        translation_work.lease_token = "token-translation"
        translation_work.lease_expires_at = NOW + timedelta(seconds=1)
        session.add(
            OpinionGroupDescriptionTranslationWork(
                id=203,
                description_id=501,
                conversation_id=10,
                locale="es",
                attempt_count=1,
                lease_owner="worker-1",
                lease_token="other-token",
                lease_expires_at=NOW + timedelta(seconds=1),
                non_retryable_ai_description_epoch=None,
                last_error_code=None,
                last_error_message=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    result = extend_ai_description_locale_work_leases(
        engine,
        claims=[
            ClaimedLineageDescriptionWorkItem(
                id=201,
                conversation_id=10,
                conversation_slug_id="abc12345",
                lineage_id=301,
                source_candidate_id=401,
                locale="en",
                attempt_count=1,
                lease_token="token-1",
            ),
            _translation_claim(),
            _translation_claim(
                work_id=203,
                locale="es",
                lease_token="stale-token",
            ),
        ],
        lease_ttl_seconds=120,
    )

    with Session(engine) as session:
        lineage_work = session.get(OpinionGroupLineageDescriptionWork, 201)
        active_translation_work = session.get(OpinionGroupDescriptionTranslationWork, 202)
        stale_translation_work = session.get(OpinionGroupDescriptionTranslationWork, 203)

    original_expires_at = (NOW + timedelta(seconds=1)).replace(tzinfo=None)
    assert lineage_work is not None
    assert active_translation_work is not None
    assert stale_translation_work is not None
    assert result.extended_lineage_work_ids == [201]
    assert result.extended_translation_work_ids == [202]
    assert result.extended_count == 2
    assert lineage_work.lease_expires_at is not None
    assert active_translation_work.lease_expires_at is not None
    assert lineage_work.lease_expires_at > original_expires_at
    assert active_translation_work.lease_expires_at > original_expires_at
    assert stale_translation_work.lease_expires_at == original_expires_at


def test_recover_expired_persisted_analysis_work_keeps_resume_state() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session)
        session.add(
            AnalysisWorkState(
                id=901,
                conversation_id=10,
                opinion_group_spec_id=1,
                last_completed_data_generation=0,
                running_data_generation=1,
                persisted_analysis_snapshot_id=30,
                dirty_since=None,
                attempt_generation=1,
                attempt_count=1,
                non_retryable_generation=None,
                non_retryable_analysis_engine_epoch=None,
                lease_owner="math-updater",
                lease_token="analysis-token",
                lease_expires_at=NOW - timedelta(seconds=1),
                last_error_kind=None,
                last_error_code=None,
                last_error_message=None,
                last_error_stack_hash=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        session.commit()

    recovered_ids = recover_expired_running_work(engine)

    with Session(engine) as session:
        recovered_state = session.execute(select(AnalysisWorkState)).scalar_one()

    assert recovered_ids == [10]
    assert recovered_state.running_data_generation == 1
    assert recovered_state.persisted_analysis_snapshot_id == 30
    assert recovered_state.lease_token == "analysis-token"


@pytest.mark.parametrize(
    "source_state", ["visible", "deleted", "account_hidden", "deleted_in_flight"]
)
def test_generation_requires_permitted_representatives_in_every_group(source_state: str) -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session, leased_lineage_work=True)
        session.execute(update(OpinionGroupLineage).values(system_description_id=None))
        session.execute(update(ConversationViewSnapshot).values(activated_at=NOW))
        session.add(
            OpinionGroup(
                id=802,
                candidate_id=401,
                scope_id=701,
                lineage_id=302,
                key="1",
                external_id=1,
                num_users=1,
                created_at=NOW,
            )
        )
        for opinion_id, group_id in ((1, 801), (2, 802)):
            session.add(
                User(
                    id=uuid.UUID(int=opinion_id),
                    username=f"author-{opinion_id}",
                    polis_participant_id=opinion_id,
                    is_deleted=source_state == "account_hidden" and opinion_id == 2,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
            session.add(
                Opinion(
                    id=opinion_id,
                    slug_id=f"source0{opinion_id}",
                    author_id=uuid.UUID(int=opinion_id),
                    conversation_id=10,
                    current_content_id=None
                    if source_state == "deleted" and opinion_id == 2
                    else opinion_id,
                    created_at=NOW,
                    updated_at=NOW,
                    last_reacted_at=NOW,
                )
            )
            session.add(
                OpinionContent(
                    id=opinion_id,
                    public_id=uuid.UUID(int=opinion_id + 100),
                    opinion_id=opinion_id,
                    conversation_content_id=40,
                    content=f"Representative {opinion_id}",
                    created_at=NOW,
                )
            )
            session.add(
                AnalysisSnapshotOpinion(
                    id=opinion_id,
                    analysis_snapshot_id=30,
                    opinion_id=opinion_id,
                    opinion_content_id=opinion_id,
                    local_opinion_index=opinion_id - 1,
                    created_at=NOW,
                )
            )
            session.add(
                OpinionGroupOpinionStats(
                    id=opinion_id,
                    group_id=group_id,
                    analysis_snapshot_opinion_id=opinion_id,
                    representative_agreement_type=VoteEnumSimple.agree,
                    representative_probability_agreement=0.8,
                    representative_number_agreement=1,
                    created_at=NOW,
                )
            )
        session.commit()
    calls: list[ConversationDescriptionInput] = []

    def generate(conversation: ConversationDescriptionInput) -> DescriptionGenerationResult:
        calls.append(conversation)
        if source_state == "deleted_in_flight":
            with Session(engine) as deleting:
                deleting.execute(
                    update(Opinion).where(Opinion.id == 2).values(current_content_id=None)
                )
                deleting.commit()
        return DescriptionGenerationResult(
            groups={"0": EnglishDescription(label="Transit", summary="Supports transit.")}
        )

    process_ai_description_locale_work_item(
        engine,
        claim=ClaimedLineageDescriptionWorkItem(
            id=201,
            conversation_id=10,
            conversation_slug_id="abc12345",
            lineage_id=301,
            source_candidate_id=401,
            locale="en",
            attempt_count=1,
            lease_token="token-1",
        ),
        generate_descriptions=generate,
        translate_descriptions=None,
    )
    assert len(calls) == (1 if source_state in {"visible", "deleted_in_flight"} else 0)
    with Session(engine) as session:
        description_id = session.scalar(
            select(OpinionGroupLineage.system_description_id).where(OpinionGroupLineage.id == 301)
        )
    assert (description_id is not None) == (source_state == "visible")
    if source_state != "visible":
        with Session(engine) as session:
            work = session.get(OpinionGroupLineageDescriptionWork, 201)
            assert work is not None and work.sources_blocked
        assert (
            fetch_claimable_ai_description_work_conversation_ids(
                engine,
                limit=10,
                ai_description_epoch=1,
                translation_enabled=False,
            )
            == []
        )
    if source_state == "account_hidden":
        with Session(engine) as session:
            session.execute(
                update(User).where(User.id == uuid.UUID(int=2)).values(is_deleted=False)
            )
            session.commit()
        assert fetch_claimable_ai_description_work_conversation_ids(
            engine,
            limit=10,
            ai_description_epoch=1,
            translation_enabled=False,
        ) == [10]
    engine.dispose()


def test_closing_accepts_only_current_complete_frames(lineage_scan_engine: Engine) -> None:
    with Session(lineage_scan_engine) as session:
        _seed_live_description_repair(session)
        conversation = session.get(Conversation, 10)
        config = session.get(PolisConversationConfig, 10)
        view = session.get(ConversationViewSnapshot, 20)
        assert conversation is not None and config is not None and view is not None
        conversation.is_closed = True
        conversation.closing_target_revision = 2
        config.analysis_data_generation = 2
        view.is_closed = True
        session.flush()
        finalize_closed_analysis(session, conversation_ids=[10])
        session.refresh(conversation)
        assert conversation.closed_finalized_at is None
        assert activatable_analysis_view_ids(session, view_ids=[20], conversation_ids=[10]) == []
        session.add(
            AnalysisSnapshot(
                id=31,
                conversation_id=10,
                conversation_content_id=40,
                input_snapshot_id=1,
                data_generation=2,
                computed_at=NOW,
                created_at=NOW,
            )
        )
        session.add(
            ConversationViewSnapshot(
                id=21,
                conversation_id=10,
                opinion_group_spec_id=1,
                analysis_snapshot_id=31,
                conversation_content_id=40,
                view_reason=ConversationViewSnapshotReasonEnum.analysis_completed,
                is_closed=True,
                opinion_count=2,
                total_opinion_count=2,
                vote_count=12,
                total_vote_count=12,
                participant_count=6,
                total_participant_count=6,
                moderated_opinion_count=0,
                hidden_opinion_count=0,
                activated_at=NOW,
                created_at=NOW,
            )
        )
        conversation.vote_buffer_drained = False
        session.flush()
        finalize_closed_analysis(session, conversation_ids=[10])
        session.refresh(conversation)
        assert conversation.closed_finalized_at is None
        assert activatable_analysis_view_ids(session, view_ids=[21], conversation_ids=[10]) == []
        conversation.vote_buffer_drained = True
        session.flush()
        finalize_closed_analysis(session, conversation_ids=[10])
        session.refresh(conversation)
        assert conversation.closed_finalized_at is not None
        reasons = session.scalars(
            select(ConversationViewSnapshotCheckpointReason).where(
                ConversationViewSnapshotCheckpointReason.reason
                == ConversationViewSnapshotCheckpointReasonEnum.conversation_closed,
            )
        ).all()
        assert [reason.conversation_view_snapshot_id for reason in reasons] == [21]
        assert session.get(OpinionGroupDescription, 501) is not None
        assert (
            activatable_analysis_view_ids(session, view_ids=[20, 21], conversation_ids=[10]) == []
        )
        # Reopening advances the durable input generation. A second close must
        # not accept either frame from the previous lifecycle, even after restart.
        conversation.is_closed = False
        conversation.closed_finalized_at = None
        conversation.closing_target_revision = None
        config.analysis_data_generation = 3
        session.flush()
        conversation.is_closed = True
        conversation.closing_target_revision = 3
        session.flush()
        finalize_closed_analysis(session, conversation_ids=[10])
        session.refresh(conversation)
        assert conversation.closed_finalized_at is None
        assert (
            activatable_analysis_view_ids(session, view_ids=[20, 21], conversation_ids=[10]) == []
        )
        session.commit()


def test_claimed_non_processable_lineage_work_does_not_call_generator() -> None:
    engine = _create_engine()
    with Session(engine) as session:
        _insert_non_processable_ai_work_state(session, leased_lineage_work=True)

    def fail_generator(_input: ConversationDescriptionInput) -> DescriptionGenerationResult:
        raise AssertionError("generator should not be called")

    process_ai_description_locale_work_item(
        engine,
        claim=ClaimedLineageDescriptionWorkItem(
            id=201,
            conversation_id=10,
            conversation_slug_id="abc12345",
            lineage_id=301,
            source_candidate_id=401,
            locale="en",
            attempt_count=1,
            lease_token="token-1",
        ),
        generate_descriptions=fail_generator,
        translate_descriptions=None,
    )

    with Session(engine) as session:
        view_snapshot = session.execute(select(ConversationViewSnapshot)).scalar_one()
        lineage_work = session.execute(select(OpinionGroupLineageDescriptionWork)).scalar_one()

    assert view_snapshot.activated_at is None
    assert lineage_work.lease_token is None
