from __future__ import annotations

import logging
import signal
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Event, Lock, Thread
from typing import TYPE_CHECKING, cast

import valkey as valkey_lib
from agora_worker_shared.ai_description_work import (
    ClaimedDescriptionTranslationWorkItem,
    ClaimedLineageDescriptionWorkItem,
    claim_ai_description_locale_work_items_batch,
    claim_first_pass_ai_description_locale_work_items_batch,
    complete_non_processable_ai_description_work_batch,
    description_translation_work_claim_batches,
    fetch_ai_description_view_snapshot_ids_for_analysis_snapshots,
    finalize_first_pass_ai_description_work_batch,
    mark_non_retryable_ai_description_locale_work_item,
    process_ai_description_locale_work_item,
    process_description_translation_work_items_batch,
    recover_expired_ai_description_work,
    retry_ai_description_locale_work_item,
)
from agora_worker_shared.ai_description_work import (
    WorkStateSchedule as AiDescriptionWorkStateSchedule,
)
from agora_worker_shared.analysis_compute import RedDwarfContractError, compute_analysis_bundle
from agora_worker_shared.config import (
    MathUpdaterConfigError,
    Settings,
    validate_ai_description_config,
)
from agora_worker_shared.db import (
    AnalysisWorkStatePersistenceError,
    CheckpointActivationContext,
    LineageAssignmentInvariantError,
    WorkStateSchedule,
    claim_work_items_and_fetch_inputs_batch,
    complete_computed_analysis_work_items_batch,
    complete_non_processable_work_items_batch,
    extend_postgres_leases,
    fetch_due_work_conversation_ids,
    fetch_opinion_group_configs,
    mark_non_retryable_work_items_batch,
    persist_computed_analysis_results_batch,
    persist_empty_vote_matrix_results_batch,
    recover_expired_running_work,
    retry_scheduled_work_items_batch,
    upsert_input_snapshots_batch,
)
from agora_worker_shared.description_input import DescriptionInputError
from agora_worker_shared.description_services import (
    build_description_generator,
    build_description_translator,
)
from agora_worker_shared.input_snapshot import PreparedInputSnapshot, prepare_input_snapshots_batch
from agora_worker_shared.logging_utils import log_database_error
from agora_worker_shared.retry_policy import RetryPolicy
from agora_worker_shared.simulation_providers import (
    SimulatedRetryableError,
    build_simulation_runtime,
    emit_load_event,
    log_simulation_startup,
    maybe_raise_simulated_claim_error,
)
from agora_worker_shared.valkey_client import (
    datetime_to_epoch_ms,
    format_queue_lag_ms,
    now_ms,
    pop_due_conversations,
    queue_depth,
    requeue_conversations,
    schedule_conversation,
)
from botocore.exceptions import ConnectTimeoutError, ReadTimeoutError
from google.api_core.exceptions import DeadlineExceeded
from google.api_core.exceptions import RetryError as GoogleRetryError
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

if TYPE_CHECKING:
    from collections.abc import Callable, Sequence

    from agora_worker_shared.ai_description_work import ClaimedAiDescriptionLocaleWorkItem
    from agora_worker_shared.analysis_compute import ComputedAnalysisBundle
    from agora_worker_shared.bedrock_label_summary import ParsedLabelSummaryOutput
    from agora_worker_shared.db import ClaimedWorkItem, OpinionGroupConfigRecord
    from agora_worker_shared.description_input import ConversationDescriptionInput
    from agora_worker_shared.description_translation import (
        DescriptionForTranslation,
        DescriptionTranslation,
    )
    from agora_worker_shared.simulation_providers import SimulationRuntime
    from sqlalchemy import Engine

    DescriptionGenerator = Callable[[ConversationDescriptionInput], ParsedLabelSummaryOutput]
    DescriptionTranslator = Callable[
        [list[DescriptionForTranslation], list[str]],
        list[DescriptionTranslation],
    ]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_running = True
_lease_heartbeat_stoppers: list[Callable[[], None]] = []
_lease_heartbeat_stoppers_lock = Lock()
STARTUP_RETRY_INTERVAL_SECONDS = 5.0


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("[MathUpdater] Received signal %d, shutting down", signum)
    _running = False


def _stop_lease_heartbeats() -> None:
    with _lease_heartbeat_stoppers_lock:
        stoppers = list(_lease_heartbeat_stoppers)
        _lease_heartbeat_stoppers.clear()
    for stop_heartbeat in stoppers:
        stop_heartbeat()


def _connect_to_valkey_with_retry(settings: Settings) -> valkey_lib.Valkey | None:
    valkey_url = str(settings.valkey_url)
    while _running:
        try:
            from_url = cast("Callable[..., object]", valkey_lib.from_url)
            vk = cast(
                "valkey_lib.Valkey",
                from_url(valkey_url, decode_responses=True),
            )
            ping = cast("Callable[[], object]", vk.ping)
            ping()
            log.info("[MathUpdater] Valkey connected")
            return vk
        except Exception as error:
            log.warning(
                "[MathUpdater] Valkey unavailable at %s (%s); retrying in %.1fs",
                valkey_url,
                error,
                settings.valkey_retry_interval_seconds,
            )
            time.sleep(settings.valkey_retry_interval_seconds)
    return None


def _sleep_before_retry(seconds: float) -> None:
    deadline = time.monotonic() + seconds
    while _running:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(min(0.5, remaining))


def _create_engine_with_retry(
    *,
    connection_string: str,
    role: str,
    retry_interval_seconds: float,
) -> Engine | None:
    while _running:
        engine = create_engine(
            connection_string.replace("postgres://", "postgresql+psycopg://"),
            pool_pre_ping=True,
            hide_parameters=True,
        )
        try:
            with engine.connect() as connection:
                connection.execute(text("select 1"))
            log.info("[MathUpdater] PostgreSQL %s connection verified", role)
            return engine
        except Exception as error:
            engine.dispose()
            log.warning(
                "[MathUpdater] PostgreSQL %s unavailable (%s); retrying in %.1fs",
                role,
                error,
                retry_interval_seconds,
            )
            _sleep_before_retry(retry_interval_seconds)
    return None


def _enqueue_schedules(
    vk: valkey_lib.Valkey,
    *,
    schedules: Sequence[WorkStateSchedule | AiDescriptionWorkStateSchedule],
) -> None:
    enqueued_count = 0
    for schedule in schedules:
        if schedule.next_run_at is None:
            continue
        schedule_conversation(
            vk,
            conversation_id=schedule.conversation_id,
            due_at_ms=datetime_to_epoch_ms(schedule.next_run_at),
        )
        enqueued_count += 1
    if enqueued_count:
        log.info(
            "[MathUpdater] Enqueued %d scheduled conversation(s) queue=analysis:dirty",
            enqueued_count,
        )

def _format_ids(conversation_ids: Sequence[int]) -> str:
    limit = 20
    head = list(conversation_ids[:limit])
    suffix = "" if len(conversation_ids) <= limit else f", ... +{len(conversation_ids) - limit}"
    return ", ".join(str(conversation_id) for conversation_id in head) + suffix


def _snapshot_summary(snapshot: PreparedInputSnapshot) -> str:
    return (
        f"conversation_id={snapshot.conversation_id} "
        f"opinions={len(snapshot.opinions)} "
        f"participants={len(snapshot.participants)} "
        f"votes={len(snapshot.votes)}"
    )


def _bundle_summary(bundle: ComputedAnalysisBundle) -> str:
    success_candidates = [
        candidate for candidate in bundle.candidates if candidate.outcome.value == "success"
    ]
    group_count = sum(len(candidate.groups) for candidate in success_candidates)
    group_opinion_stats_count = sum(
        len(group.opinion_stats) for candidate in success_candidates for group in candidate.groups
    )
    return (
        f"conversation_id={bundle.conversation_id} "
        f"outcome={bundle.outcome.value} "
        f"candidates={len(bundle.candidates)} "
        f"success_candidates={len(success_candidates)} "
        f"groups={group_count} "
        f"group_opinion_stats={group_opinion_stats_count}"
    )


def _enqueue_conversation_ids(
    vk: valkey_lib.Valkey,
    *,
    conversation_ids: list[int],
    due_at_ms: int,
) -> None:
    if conversation_ids:
        log.info(
            "[MathUpdater] Enqueueing %d conversation id(s) ids=%s due_at_ms=%d",
            len(conversation_ids),
            _format_ids(conversation_ids),
            due_at_ms,
        )
    for conversation_id in conversation_ids:
        schedule_conversation(
            vk,
            conversation_id=conversation_id,
            due_at_ms=due_at_ms,
        )


def _format_claim(claim: ClaimedWorkItem) -> str:
    return f"{claim.conversation_slug_id} (id={claim.conversation_id})"


def _format_claims(claims: list[ClaimedWorkItem]) -> str:
    return ", ".join(_format_claim(claim) for claim in claims)


def _ai_description_claim_kind(claim: ClaimedAiDescriptionLocaleWorkItem) -> str:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        return "lineage-description"
    return "translation"


def _ai_description_claim_target_log(claim: ClaimedAiDescriptionLocaleWorkItem) -> str:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        return f"lineageId={claim.lineage_id}"
    return f"descriptionId={claim.description_id}"


def _ai_description_claim_target_metadata(
    claim: ClaimedAiDescriptionLocaleWorkItem,
) -> dict[str, int]:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        return {"lineageId": claim.lineage_id}
    return {"descriptionId": claim.description_id}


def _start_lease_heartbeat(
    *,
    primary_engine: Engine,
    lease_ttl_seconds: int,
    interval_seconds: int,
) -> tuple[Callable[[list[ClaimedWorkItem]], None], Callable[[], None]]:
    active_claims: list[ClaimedWorkItem] = []
    active_claims_lock = Lock()
    stop_event = Event()

    def set_active_claims(claims: list[ClaimedWorkItem]) -> None:
        with active_claims_lock:
            active_claims.clear()
            active_claims.extend(claims)

    def run_heartbeat() -> None:
        while not stop_event.wait(interval_seconds):
            with active_claims_lock:
                claims = list(active_claims)
            if not claims:
                continue
            try:
                lease_extension = extend_postgres_leases(
                    primary_engine,
                    claims=claims,
                    lease_ttl_seconds=lease_ttl_seconds,
                )
                log.info(
                    "[MathUpdater] Lease heartbeat extended rows=%d claims=%d ids=%s: %s",
                    lease_extension.extended_count,
                    len(claims),
                    _format_ids(lease_extension.extended_work_state_ids),
                    _format_claims(claims),
                )
            except Exception:
                log.exception(
                    "[MathUpdater] Lease heartbeat failed claims=%s",
                    _format_claims(claims),
                )

    heartbeat_thread = Thread(
        target=run_heartbeat,
        name="math-updater-lease-heartbeat",
        daemon=True,
    )
    heartbeat_thread.start()

    def stop_heartbeat() -> None:
        set_active_claims([])
        stop_event.set()
        heartbeat_thread.join(timeout=interval_seconds)
        with _lease_heartbeat_stoppers_lock:
            if stop_heartbeat in _lease_heartbeat_stoppers:
                _lease_heartbeat_stoppers.remove(stop_heartbeat)

    with _lease_heartbeat_stoppers_lock:
        _lease_heartbeat_stoppers.append(stop_heartbeat)

    return set_active_claims, stop_heartbeat


def _format_schedules(
    *,
    schedules: list[WorkStateSchedule],
    claims: list[ClaimedWorkItem],
) -> str:
    claim_by_conversation_id = {claim.conversation_id: claim for claim in claims}
    return ", ".join(
        _format_claim(claim_by_conversation_id[schedule.conversation_id])
        if schedule.conversation_id in claim_by_conversation_id
        else f"id={schedule.conversation_id}"
        for schedule in schedules
    )


def _process_ai_description_conversation_ids(
    *,
    primary_engine: Engine,
    vk: valkey_lib.Valkey,
    worker_id: str,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int] | None = None,
    lease_ttl_seconds: int,
    claim_limit: int,
    max_workers: int,
    ai_description_epoch: int,
    retry_policy: RetryPolicy,
    description_generator: DescriptionGenerator,
    description_translator: DescriptionTranslator | None,
    simulation_runtime: SimulationRuntime | None = None,
    retry_first_pass_once: bool = False,
    claim_lineage_descriptions: bool = True,
    claim_translations: bool = True,
    require_pending_status: bool = False,
) -> int:
    completed_non_processable_ids = complete_non_processable_ai_description_work_batch(
        primary_engine,
        conversation_ids=conversation_ids,
        include_lineage_descriptions=claim_lineage_descriptions,
        include_translations=description_translator is not None and claim_translations,
    )
    if completed_non_processable_ids:
        log.info(
            "[MathUpdater] Completed %d non-processable AI description conversation(s) ids=%s",
            len(completed_non_processable_ids),
            _format_ids(completed_non_processable_ids),
        )

    non_processable_id_set = set(completed_non_processable_ids)
    processable_conversation_ids = [
        conversation_id
        for conversation_id in conversation_ids
        if conversation_id not in non_processable_id_set
    ]
    if not processable_conversation_ids:
        return 0

    claim_started_at = time.perf_counter()
    ai_claims: list[ClaimedAiDescriptionLocaleWorkItem] = []
    if claim_lineage_descriptions:
        claim_lineage_work = (
            claim_first_pass_ai_description_locale_work_items_batch
            if retry_first_pass_once and conversation_view_snapshot_ids is not None
            else claim_ai_description_locale_work_items_batch
        )
        ai_claims = claim_lineage_work(
            primary_engine,
            worker_id=worker_id,
            conversation_ids=processable_conversation_ids,
            conversation_view_snapshot_ids=conversation_view_snapshot_ids,
            lease_ttl_seconds=lease_ttl_seconds,
            limit=min(claim_limit, max_workers),
            ai_description_epoch=ai_description_epoch,
            translation_enabled=description_translator is not None,
            claim_translations=False,
            require_pending_status=require_pending_status,
        )
    remaining_translation_claim_limit = claim_limit - len(ai_claims)
    if (
        claim_translations
        and description_translator is not None
        and remaining_translation_claim_limit > 0
    ):
        claim_translation_work = (
            claim_first_pass_ai_description_locale_work_items_batch
            if retry_first_pass_once and conversation_view_snapshot_ids is not None
            else claim_ai_description_locale_work_items_batch
        )
        ai_claims.extend(
            claim_translation_work(
                primary_engine,
                worker_id=worker_id,
                conversation_ids=processable_conversation_ids,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                lease_ttl_seconds=lease_ttl_seconds,
                limit=remaining_translation_claim_limit,
                ai_description_epoch=ai_description_epoch,
                translation_enabled=True,
                claim_lineage_descriptions=False,
                require_pending_status=require_pending_status,
            )
        )
    if not ai_claims:
        log.info(
            "[MathUpdater] No claimable AI description locale work for "
            "conversation_count=%d ids=%s claim_ms=%.1f",
            len(processable_conversation_ids),
            _format_ids(processable_conversation_ids),
            (time.perf_counter() - claim_started_at) * 1000,
        )
        return 0
    log.info(
        "[MathUpdater] Claimed %d AI description locale work item(s) claim_ms=%.1f "
        "claimScope=%s",
        len(ai_claims),
        (time.perf_counter() - claim_started_at) * 1000,
        "first-pass-unactivated"
        if conversation_view_snapshot_ids is not None
        else "latest-or-checkpoint",
    )

    def process_claim_error(
        *,
        claim: ClaimedAiDescriptionLocaleWorkItem,
        error: Exception,
    ) -> AiDescriptionWorkStateSchedule:
        if _is_non_retryable_ai_description_error(error):
            log.exception(
                "[MathUpdater] Non-retryable %s failure for "
                "conversationSlugId=%s locale=%s %s",
                _ai_description_claim_kind(claim),
                claim.conversation_slug_id,
                claim.locale,
                _ai_description_claim_target_log(claim),
            )
            return mark_non_retryable_ai_description_locale_work_item(
                primary_engine,
                claim=claim,
                ai_description_epoch=ai_description_epoch,
                error_code="ai_description_non_retryable",
                error_message=str(error),
            )

        if _is_expected_simulated_retryable_error(error):
            log.warning(
                "[MathUpdater] Expected simulated retryable %s failure for "
                "conversationSlugId=%s locale=%s %s: %s",
                _ai_description_claim_kind(claim),
                claim.conversation_slug_id,
                claim.locale,
                _ai_description_claim_target_log(claim),
                error,
            )
        else:
            log.exception(
                "[MathUpdater] Retryable %s failure for "
                "conversationSlugId=%s locale=%s %s",
                _ai_description_claim_kind(claim),
                claim.conversation_slug_id,
                claim.locale,
                _ai_description_claim_target_log(claim),
            )
        is_timeout = _is_timeout_error(error)
        should_retry_immediately = (
            retry_first_pass_once
            and not is_timeout
            and claim.attempt_count == 1
            and isinstance(error, SimulatedRetryableError)
        )
        is_first_pass_timeout = retry_first_pass_once and is_timeout
        schedule = retry_ai_description_locale_work_item(
            primary_engine,
            claim=claim,
            retry_policy=retry_policy,
            error_code="ai_description_timeout"
            if is_first_pass_timeout
            else "ai_description_retryable",
            error_message=str(error),
            retry_immediately_without_fallback=should_retry_immediately,
            force_cooldown=retry_first_pass_once and not should_retry_immediately,
        )
        if is_first_pass_timeout:
            log.warning(
                "[MathUpdater] First-pass timeout fallback scheduled "
                "kind=%s conversationSlugId=%s conversationId=%d locale=%s %s "
                "attemptCount=%d retryWorkerAt=%s",
                _ai_description_claim_kind(claim),
                claim.conversation_slug_id,
                claim.conversation_id,
                claim.locale,
                _ai_description_claim_target_log(claim),
                claim.attempt_count,
                schedule.retry_scheduled_at.isoformat()
                if schedule.retry_scheduled_at is not None
                else "none",
            )
        return schedule

    def process_lineage_claim(
        claim: ClaimedLineageDescriptionWorkItem,
    ) -> AiDescriptionWorkStateSchedule:
        try:
            maybe_raise_simulated_claim_error(
                runtime=simulation_runtime,
                claim=claim,
                phase="math-updater",
            )
            return process_ai_description_locale_work_item(
                primary_engine,
                claim=claim,
                generate_descriptions=description_generator,
                translate_descriptions=description_translator,
            )
        except Exception as error:
            return process_claim_error(claim=claim, error=error)

    def process_translation_claims(
        claims: list[ClaimedDescriptionTranslationWorkItem],
    ) -> list[tuple[ClaimedDescriptionTranslationWorkItem, AiDescriptionWorkStateSchedule]]:
        processable_claims: list[ClaimedDescriptionTranslationWorkItem] = []
        retry_schedules: list[
            tuple[ClaimedDescriptionTranslationWorkItem, AiDescriptionWorkStateSchedule]
        ] = []
        for claim in claims:
            try:
                maybe_raise_simulated_claim_error(
                    runtime=simulation_runtime,
                    claim=claim,
                    phase="math-updater",
                )
                processable_claims.append(claim)
            except Exception as error:
                retry_schedules.append(
                    (claim, process_claim_error(claim=claim, error=error))
                )

        if not processable_claims:
            return retry_schedules

        translator = description_translator
        if translator is None:
            unavailable_schedules: list[
                tuple[ClaimedDescriptionTranslationWorkItem, AiDescriptionWorkStateSchedule]
            ] = []
            for claim in processable_claims:
                try:
                    msg = f"translation service unavailable for locale {claim.locale}"
                    raise DescriptionInputError(msg)
                except Exception as error:
                    unavailable_schedules.append(
                        (claim, process_claim_error(claim=claim, error=error))
                    )
            return unavailable_schedules

        try:
            process_description_translation_work_items_batch(
                primary_engine,
                claims=processable_claims,
                translate_descriptions=translator,
            )
        except Exception as error:
            retry_schedules.extend(
                (claim, process_claim_error(claim=claim, error=error))
                for claim in processable_claims
            )
        return retry_schedules

    processing_started_at = time.perf_counter()
    lineage_claims = [
        claim for claim in ai_claims if isinstance(claim, ClaimedLineageDescriptionWorkItem)
    ]
    translation_claims: list[ClaimedDescriptionTranslationWorkItem] = []
    for claim in ai_claims:
        if isinstance(claim, ClaimedLineageDescriptionWorkItem):
            continue
        translation_claims.append(claim)

    with ThreadPoolExecutor(max_workers=min(max_workers, len(lineage_claims) or 1)) as executor:
        future_by_claim = {
            executor.submit(process_lineage_claim, claim): claim for claim in lineage_claims
        }
        for future in as_completed(future_by_claim):
            claim = future_by_claim[future]
            try:
                schedule = future.result()
                if schedule.retry_scheduled_at is not None:
                    emit_load_event(
                        phase="math-updater",
                        action="retry-scheduled",
                        outcome="info",
                        conversation_slug_id=claim.conversation_slug_id,
                        metadata={
                            "conversationId": schedule.conversation_id,
                            "locale": claim.locale,
                            "attemptCount": claim.attempt_count,
                            "nextRunAt": schedule.retry_scheduled_at.isoformat(),
                            **_ai_description_claim_target_metadata(claim),
                        },
                    )
            except Exception:
                log.exception(
                    "[MathUpdater] Failed to finalize AI description retry state for "
                    "conversationSlugId=%s locale=%s %s",
                    claim.conversation_slug_id,
                    claim.locale,
                    _ai_description_claim_target_log(claim),
                )

    translation_claim_batches = description_translation_work_claim_batches(translation_claims)
    if translation_claim_batches:
        with ThreadPoolExecutor(
            max_workers=min(max_workers, len(translation_claim_batches))
        ) as executor:
            future_by_translation_claims = {
                executor.submit(process_translation_claims, claims): claims
                for claims in translation_claim_batches
            }
            for future in as_completed(future_by_translation_claims):
                claims = future_by_translation_claims[future]
                try:
                    retry_schedules = future.result()
                    for claim, schedule in retry_schedules:
                        if schedule.retry_scheduled_at is not None:
                            emit_load_event(
                                phase="math-updater",
                                action="retry-scheduled",
                                outcome="info",
                                conversation_slug_id=claim.conversation_slug_id,
                                metadata={
                                    "conversationId": schedule.conversation_id,
                                    "locale": claim.locale,
                                    "attemptCount": claim.attempt_count,
                                    "nextRunAt": schedule.retry_scheduled_at.isoformat(),
                                    **_ai_description_claim_target_metadata(claim),
                                },
                            )
                except Exception:
                    log.exception(
                        "[MathUpdater] Failed to finalize translation batch retry state "
                        "claims=%s",
                        ", ".join(
                            f"{claim.conversation_slug_id}:{claim.locale}:{claim.description_id}"
                            for claim in claims
                        ),
                    )

    log.info(
        "[MathUpdater] Finished AI description locale work count=%d process_ms=%.1f",
        len(ai_claims),
        (time.perf_counter() - processing_started_at) * 1000,
    )
    return len(ai_claims)


def _process_ai_description_first_pass_phase(
    *,
    phase: str,
    primary_engine: Engine,
    vk: valkey_lib.Valkey,
    worker_id: str,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int],
    lease_ttl_seconds: int,
    claim_limit: int,
    max_workers: int,
    ai_description_epoch: int,
    retry_policy: RetryPolicy,
    description_generator: DescriptionGenerator,
    description_translator: DescriptionTranslator | None,
    simulation_runtime: SimulationRuntime | None,
) -> int:
    total_processed_count = 0
    while True:
        processed_count = _process_ai_description_conversation_ids(
            primary_engine=primary_engine,
            vk=vk,
            worker_id=worker_id,
            conversation_ids=conversation_ids,
            conversation_view_snapshot_ids=conversation_view_snapshot_ids,
            lease_ttl_seconds=lease_ttl_seconds,
            claim_limit=claim_limit,
            max_workers=max_workers,
            ai_description_epoch=ai_description_epoch,
            retry_policy=retry_policy,
            description_generator=description_generator,
            description_translator=description_translator,
            simulation_runtime=simulation_runtime,
            retry_first_pass_once=True,
            claim_lineage_descriptions=phase == "english",
            claim_translations=phase == "translation",
            require_pending_status=True,
        )
        log.info(
            "[MathUpdater] first_pass %s phase processed count=%d "
            "conversation_count=%d view_snapshot_count=%d",
            phase,
            processed_count,
            len(conversation_ids),
            len(conversation_view_snapshot_ids),
        )
        total_processed_count += processed_count
        if processed_count == 0:
            break
    return total_processed_count


def _process_ai_description_first_pass(
    *,
    primary_engine: Engine,
    vk: valkey_lib.Valkey,
    worker_id: str,
    analysis_claims: list[ClaimedWorkItem],
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int],
    lease_ttl_seconds: int,
    claim_limit: int,
    max_workers: int,
    ai_description_epoch: int,
    retry_policy: RetryPolicy,
    description_generator: DescriptionGenerator,
    description_translator: DescriptionTranslator | None,
    simulation_runtime: SimulationRuntime | None,
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> None:
    first_pass_started_at = time.perf_counter()
    unique_conversation_ids = list(dict.fromkeys(conversation_ids))
    emit_load_event(
        phase="math-updater",
        action="first-pass-start",
        outcome="start",
        count=len(conversation_view_snapshot_ids),
        metadata={"conversationCount": len(unique_conversation_ids)},
    )
    recovered_conversation_ids = recover_expired_ai_description_work(
        primary_engine,
        translation_enabled=description_translator is not None,
        conversation_ids=unique_conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        include_lineage_descriptions=True,
        include_translations=description_translator is not None,
        require_unactivated_view_snapshot=True,
    )
    if recovered_conversation_ids:
        log.info(
            "[MathUpdater] first_pass recovered %d expired AI description lease(s) ids=%s",
            len(recovered_conversation_ids),
            _format_ids(recovered_conversation_ids),
        )

    english_processed_count = _process_ai_description_first_pass_phase(
        phase="english",
        primary_engine=primary_engine,
        vk=vk,
        worker_id=worker_id,
        conversation_ids=unique_conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        lease_ttl_seconds=lease_ttl_seconds,
        claim_limit=claim_limit,
        max_workers=max_workers,
        ai_description_epoch=ai_description_epoch,
        retry_policy=retry_policy,
        description_generator=description_generator,
        description_translator=description_translator,
        simulation_runtime=simulation_runtime,
    )
    translation_processed_count = 0
    if description_translator is not None:
        translation_processed_count = _process_ai_description_first_pass_phase(
            phase="translation",
            primary_engine=primary_engine,
            vk=vk,
            worker_id=worker_id,
            conversation_ids=unique_conversation_ids,
            conversation_view_snapshot_ids=conversation_view_snapshot_ids,
            lease_ttl_seconds=lease_ttl_seconds,
            claim_limit=claim_limit,
            max_workers=max_workers,
            ai_description_epoch=ai_description_epoch,
            retry_policy=retry_policy,
            description_generator=description_generator,
            description_translator=description_translator,
            simulation_runtime=simulation_runtime,
        )
    log.info(
        "[MathUpdater] first_pass attempts complete english=%d translation=%d "
        "conversation_count=%d view_snapshot_count=%d",
        english_processed_count,
        translation_processed_count,
        len(unique_conversation_ids),
        len(conversation_view_snapshot_ids),
    )
    finalize_result = finalize_first_pass_ai_description_work_batch(
        primary_engine,
        conversation_ids=unique_conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        translation_enabled=description_translator is not None,
        fallback_pending_statuses=True,
        checkpoint_activation_context=checkpoint_activation_context,
    )
    if finalize_result.fallback_status_count or finalize_result.activated_view_snapshot_ids:
        log.info(
            "[MathUpdater] first_pass finalized pending AI description work "
            "fallbackStatusCount=%d activatedViewSnapshots=%s",
            finalize_result.fallback_status_count,
            _format_ids(finalize_result.activated_view_snapshot_ids),
        )
    emit_load_event(
        phase="math-updater",
        action="first-pass-complete",
        outcome="complete",
        count=len(conversation_view_snapshot_ids),
        metadata={"conversationCount": len(unique_conversation_ids)},
    )
    log.info(
        "[MathUpdater] first_pass complete conversation_count=%d view_snapshot_count=%d "
        "duration_ms=%.1f",
        len(unique_conversation_ids),
        len(conversation_view_snapshot_ids),
        (time.perf_counter() - first_pass_started_at) * 1000,
    )


def _finalize_ai_description_first_pass_without_generator(
    *,
    primary_engine: Engine,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int],
    checkpoint_activation_context: CheckpointActivationContext | None = None,
) -> None:
    unique_conversation_ids = list(dict.fromkeys(conversation_ids))
    unique_view_snapshot_ids = list(dict.fromkeys(conversation_view_snapshot_ids))
    finalize_result = finalize_first_pass_ai_description_work_batch(
        primary_engine,
        conversation_ids=unique_conversation_ids,
        conversation_view_snapshot_ids=unique_view_snapshot_ids,
        translation_enabled=False,
        fallback_pending_statuses=True,
        checkpoint_activation_context=checkpoint_activation_context,
    )
    log.info(
        "[MathUpdater] first_pass finalized without AI generator "
        "fallbackStatusCount=%d activatedViewSnapshots=%s",
        finalize_result.fallback_status_count,
        _format_ids(finalize_result.activated_view_snapshot_ids),
    )


def _compute_claim_bundle(
    *,
    snapshot: PreparedInputSnapshot,
    config: OpinionGroupConfigRecord,
) -> ComputedAnalysisBundle:
    return compute_analysis_bundle(
        snapshot=snapshot,
        config=config,
    )


def _is_non_retryable_ai_description_error(error: Exception) -> bool:
    return isinstance(error, DescriptionInputError)


def _is_timeout_error(error: BaseException) -> bool:
    seen: set[int] = set()
    stack: list[BaseException] = [error]
    while stack:
        current = stack.pop()
        current_id = id(current)
        if current_id in seen:
            continue
        seen.add(current_id)

        if isinstance(
            current,
            TimeoutError | ConnectTimeoutError | DeadlineExceeded | ReadTimeoutError,
        ):
            return True

        if isinstance(current, GoogleRetryError):
            cause = current.cause
            if isinstance(cause, BaseException):
                stack.append(cause)

        if current.__cause__ is not None:
            stack.append(current.__cause__)
        if current.__context__ is not None:
            stack.append(current.__context__)

    return False


def _is_expected_simulated_retryable_error(error: BaseException) -> bool:
    return isinstance(error, SimulatedRetryableError)


def _run_worker_once() -> None:
    settings = Settings()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    worker_id = f"math-updater:{uuid.uuid4()}"
    log.info(
        "[MathUpdater] Starting worker_id=%s pop_batch=%d claim_batch=%d compute=%d ai=%d "
        "lease_ttl=%ds heartbeat=%ds recovery=%ds",
        worker_id,
        settings.valkey_pop_batch_size,
        settings.db_claim_batch_size,
        settings.max_compute_concurrency,
        settings.max_ai_description_concurrency,
        settings.lease_ttl_seconds,
        settings.heartbeat_interval_seconds,
        settings.running_recovery_interval_seconds,
    )

    try:
        validate_ai_description_config(settings)
    except MathUpdaterConfigError as error:
        log.error("[MathUpdater] Configuration error: %s", error)
        raise SystemExit(1) from error
    log_simulation_startup(settings)
    simulation_runtime = build_simulation_runtime(settings)

    vk = _connect_to_valkey_with_retry(settings)
    if vk is None:
        log.info("[MathUpdater] Shutdown complete")
        return

    primary_engine = _create_engine_with_retry(
        connection_string=settings.connection_string,
        role="primary",
        retry_interval_seconds=settings.valkey_retry_interval_seconds,
    )
    if primary_engine is None:
        vk.close()
        log.info("[MathUpdater] Shutdown complete")
        return

    read_engine = _create_engine_with_retry(
        connection_string=settings.read_dsn,
        role="read",
        retry_interval_seconds=settings.valkey_retry_interval_seconds,
    )
    if read_engine is None:
        primary_engine.dispose()
        vk.close()
        log.info("[MathUpdater] Shutdown complete")
        return

    log.info(
        "[MathUpdater] PostgreSQL connected (analysis_dirty_depth=%d)",
        queue_depth(vk),
    )
    description_generator = build_description_generator(settings)
    if description_generator is None:
        log.info("[MathUpdater] AI description generation disabled")
        description_translator = None
    else:
        log.info(
            "[MathUpdater] AI description generation enabled provider_mode=%s",
            "simulation" if settings.ai_description_simulation_enabled else "bedrock",
        )
        description_translator_bundle = build_description_translator(settings)
        description_translator = (
            description_translator_bundle.translate
            if description_translator_bundle is not None
            else None
        )
        if description_translator_bundle is None:
            log.info("[MathUpdater] Description translation disabled")
        else:
            log.info(
                "[MathUpdater] Description translation mode=%s",
                description_translator_bundle.mode,
            )
    retry_policy = RetryPolicy(
        burst_attempts=settings.retry_burst_attempts,
        burst_interval_seconds=settings.retry_burst_seconds,
        cooldown_seconds=settings.retry_cooldown_seconds,
    )
    set_active_analysis_claims, stop_lease_heartbeat = _start_lease_heartbeat(
        primary_engine=primary_engine,
        lease_ttl_seconds=settings.lease_ttl_seconds,
        interval_seconds=settings.heartbeat_interval_seconds,
    )

    monotonic_start = time.monotonic()
    last_reconcile = monotonic_start - settings.reconciliation_interval_seconds
    last_recover = monotonic_start - settings.running_recovery_interval_seconds

    while _running:
        set_active_analysis_claims([])
        monotonic_now = time.monotonic()

        if monotonic_now - last_reconcile >= settings.reconciliation_interval_seconds:
            try:
                due_ids = fetch_due_work_conversation_ids(
                    read_engine,
                    limit=1000,
                    analysis_engine_epoch=settings.analysis_engine_epoch,
                )
                current_ms = now_ms()
                _enqueue_conversation_ids(
                    vk,
                    conversation_ids=sorted(set(due_ids)),
                    due_at_ms=current_ms,
                )
                if due_ids:
                    log.info(
                        "[MathUpdater] Reconciled due analysis conversations "
                        "source=read_replica count=%d ids=%s",
                        len(due_ids),
                        _format_ids(due_ids),
                    )
            except Exception:
                log.exception("[MathUpdater] Reconciliation failed")
            last_reconcile = monotonic_now

        if monotonic_now - last_recover >= settings.running_recovery_interval_seconds:
            try:
                recovered_ids = recover_expired_running_work(primary_engine)
                recovered_ai_description_ids = recover_expired_ai_description_work(
                    primary_engine,
                    translation_enabled=description_translator is not None,
                    include_lineage_descriptions=True,
                    include_translations=description_translator is not None,
                    require_unactivated_view_snapshot=True,
                )
                recovered_ids = sorted({*recovered_ids, *recovered_ai_description_ids})
                current_ms = now_ms()
                _enqueue_conversation_ids(
                    vk,
                    conversation_ids=sorted(set(recovered_ids)),
                    due_at_ms=current_ms,
                )
                if recovered_ids:
                    log.info(
                        "[MathUpdater] Recovered %d expired running/first-pass items",
                        len(recovered_ids),
                    )
            except Exception:
                log.exception("[MathUpdater] Running-work recovery failed")
            last_recover = monotonic_now

        pop_current_ms = now_ms()
        due_items, next_due_at_ms = pop_due_conversations(
            vk,
            count=settings.valkey_pop_batch_size,
            current_time_ms=pop_current_ms,
        )
        if not due_items:
            if next_due_at_ms is None:
                time.sleep(settings.worker_poll_idle_sleep_seconds)
            else:
                sleep_ms = max(0, next_due_at_ms - now_ms())
                time.sleep(min(settings.worker_poll_idle_sleep_seconds, sleep_ms / 1000))
            continue

        log.info(
            "[MathUpdater] Popped %d due conversation(s) ids=%s queue_lag_ms=%s depth_after=%d",
            len(due_items),
            _format_ids([item.conversation_id for item in due_items]),
            format_queue_lag_ms(due_items, current_time_ms=pop_current_ms),
            queue_depth(vk),
        )

        batch_started_at = time.perf_counter()
        claimable_due_items = due_items[: settings.db_claim_batch_size]
        overflow_due_items = due_items[settings.db_claim_batch_size :]
        requeue_conversations(vk, conversations=overflow_due_items)
        if overflow_due_items:
            log.info(
                "[MathUpdater] Requeued %d overflow due conversation(s) ids=%s",
                len(overflow_due_items),
                _format_ids([item.conversation_id for item in overflow_due_items]),
            )

        completed_non_processable_ids = complete_non_processable_work_items_batch(
            primary_engine,
            conversation_ids=[item.conversation_id for item in claimable_due_items],
        )
        if completed_non_processable_ids:
            log.info(
                "[MathUpdater] Completed %d non-processable conversation(s) ids=%s",
                len(completed_non_processable_ids),
                _format_ids(completed_non_processable_ids),
            )

        non_processable_id_set = set(completed_non_processable_ids)
        processable_due_items = [
            item
            for item in claimable_due_items
            if item.conversation_id not in non_processable_id_set
        ]
        if not processable_due_items:
            continue

        claim_started_at = time.perf_counter()
        try:
            claimed_input_batch = claim_work_items_and_fetch_inputs_batch(
                primary_engine,
                worker_id=worker_id,
                conversation_ids=[item.conversation_id for item in processable_due_items],
                lease_ttl_seconds=settings.lease_ttl_seconds,
                limit=settings.db_claim_batch_size,
                analysis_engine_epoch=settings.analysis_engine_epoch,
            )
        except SQLAlchemyError as error:
            log_database_error(
                logger=log,
                message="[MathUpdater] Failed to claim analysis work",
                error=error,
                context={
                    "conversation_ids": _format_ids(
                        [item.conversation_id for item in processable_due_items]
                    ),
                },
            )
            requeue_conversations(vk, conversations=processable_due_items)
            continue
        claims = claimed_input_batch.claims

        if not claims:
            primary_due_ids: list[int] = []
            try:
                primary_due_ids = fetch_due_work_conversation_ids(
                    primary_engine,
                    limit=settings.db_claim_batch_size,
                    analysis_engine_epoch=settings.analysis_engine_epoch,
                )
            except Exception:
                log.exception("[MathUpdater] Failed primary due diagnostic after zero claim")
            log.info(
                "[MathUpdater] No claimable analysis work for due conversation(s) "
                "ids=%s primaryDueCount=%d primaryDueIds=%s",
                _format_ids([item.conversation_id for item in processable_due_items]),
                len(primary_due_ids),
                _format_ids(primary_due_ids),
            )
            continue

        log.info(
            "[MathUpdater] Claimed %d conversation(s): %s claim_ms=%.1f",
            len(claims),
            _format_claims(claims),
            (time.perf_counter() - claim_started_at) * 1000,
        )
        set_active_analysis_claims(claims)

        persisted_claims = [
            claim for claim in claims if claim.persisted_analysis_snapshot_id is not None
        ]
        if persisted_claims:
            ready_to_complete_persisted_claims = True
            try:
                persisted_view_snapshot_ids = (
                    fetch_ai_description_view_snapshot_ids_for_analysis_snapshots(
                        primary_engine,
                        analysis_snapshot_ids=[
                            claim.persisted_analysis_snapshot_id
                            for claim in persisted_claims
                            if claim.persisted_analysis_snapshot_id is not None
                        ],
                    )
                )
                if description_generator is not None:
                    _process_ai_description_first_pass(
                        primary_engine=primary_engine,
                        vk=vk,
                        worker_id=worker_id,
                        analysis_claims=persisted_claims,
                        conversation_ids=[claim.conversation_id for claim in persisted_claims],
                        conversation_view_snapshot_ids=persisted_view_snapshot_ids,
                        lease_ttl_seconds=settings.lease_ttl_seconds,
                        claim_limit=settings.db_claim_batch_size,
                        max_workers=settings.max_ai_description_concurrency,
                        ai_description_epoch=settings.ai_description_epoch,
                        retry_policy=retry_policy,
                        description_generator=description_generator,
                        description_translator=description_translator,
                        simulation_runtime=simulation_runtime,
                    )
                else:
                    _finalize_ai_description_first_pass_without_generator(
                        primary_engine=primary_engine,
                        conversation_ids=[claim.conversation_id for claim in persisted_claims],
                        conversation_view_snapshot_ids=persisted_view_snapshot_ids,
                    )
            except Exception:
                log.exception("[MathUpdater] Resumed AI description first pass failed")
                ready_to_complete_persisted_claims = False
            if ready_to_complete_persisted_claims:
                try:
                    completed_schedules = complete_computed_analysis_work_items_batch(
                        primary_engine,
                        claims=persisted_claims,
                        require_display_safe_activation=True,
                    )
                    _enqueue_schedules(vk, schedules=completed_schedules)
                except SQLAlchemyError as error:
                    log_database_error(
                        logger=log,
                        message="[MathUpdater] Failed to complete resumed persisted analysis",
                        error=error,
                        context={"claims": _format_claims(persisted_claims)},
                    )

        active_analysis_claims = [
            claim for claim in claims if claim.persisted_analysis_snapshot_id is None
        ]
        if not active_analysis_claims:
            continue

        input_prep_started_at = time.perf_counter()
        rows_by_conversation_id = claimed_input_batch.rows_by_conversation_id
        snapshots_by_conversation_id = prepare_input_snapshots_batch(
            data_generation_by_conversation_id={
                claim.conversation_id: claim.data_generation for claim in active_analysis_claims
            },
            rows_by_conversation_id=rows_by_conversation_id,
        )
        stored_snapshots = upsert_input_snapshots_batch(
            primary_engine,
            snapshots=list(snapshots_by_conversation_id.values()),
        )
        log.info(
            "[MathUpdater] Prepared %d input snapshot(s) input_prep_ms=%.1f: %s",
            len(stored_snapshots),
            (time.perf_counter() - input_prep_started_at) * 1000,
            "; ".join(
                _snapshot_summary(snapshot) for snapshot in snapshots_by_conversation_id.values()
            ),
        )

        empty_claims = [
            claim
            for claim in active_analysis_claims
            if len(snapshots_by_conversation_id[claim.conversation_id].votes) == 0
        ]
        if empty_claims:
            completed_schedules: list[WorkStateSchedule]
            try:
                completed_schedules = persist_empty_vote_matrix_results_batch(
                    primary_engine,
                    claims=empty_claims,
                    stored_input_snapshots_by_conversation_id=stored_snapshots,
                )
            except SQLAlchemyError as error:
                log_database_error(
                    logger=log,
                    message="[MathUpdater] Failed to persist empty-matrix results",
                    error=error,
                    context={
                        "claims": _format_claims(empty_claims),
                    },
                )
                completed_schedules = []
                isolated_empty_failed_claims: list[ClaimedWorkItem] = []
                for claim in empty_claims:
                    try:
                        completed_schedules.extend(
                            persist_empty_vote_matrix_results_batch(
                                primary_engine,
                                claims=[claim],
                                stored_input_snapshots_by_conversation_id=stored_snapshots,
                            )
                        )
                    except SQLAlchemyError as isolated_error:
                        log_database_error(
                            logger=log,
                            message="[MathUpdater] Failed isolated empty-matrix persist",
                            error=isolated_error,
                            context={"claim": _format_claim(claim)},
                        )
                        isolated_empty_failed_claims.append(claim)
                if isolated_empty_failed_claims:
                    completed_schedules.extend(
                        retry_scheduled_work_items_batch(
                            primary_engine,
                            claims=isolated_empty_failed_claims,
                            retry_policy=retry_policy,
                            error_code="analysis_persist_failed",
                            error_message="analysis persistence failed; see worker logs",
                        )
                    )
            _enqueue_schedules(vk, schedules=completed_schedules)
            log.info(
                "[MathUpdater] Completed %d empty-matrix conversation(s): %s",
                len(completed_schedules),
                _format_schedules(schedules=completed_schedules, claims=empty_claims),
            )
            log.info(
                "[MathUpdater] Empty-matrix batch complete claims=%d completed=%d batch_ms=%.1f",
                len(empty_claims),
                len(completed_schedules),
                (time.perf_counter() - batch_started_at) * 1000,
            )

        non_empty_claims = [
            claim
            for claim in active_analysis_claims
            if len(snapshots_by_conversation_id[claim.conversation_id].votes) > 0
        ]
        if non_empty_claims:
            config_by_spec_id = fetch_opinion_group_configs(
                primary_engine,
                opinion_group_spec_ids=[claim.opinion_group_spec_id for claim in non_empty_claims],
            )

            bundles_by_conversation_id: dict[int, ComputedAnalysisBundle] = {}
            failed_claims: list[ClaimedWorkItem] = []
            non_retryable_failed_claims: list[ClaimedWorkItem] = []
            compute_started_at = time.perf_counter()
            with ThreadPoolExecutor(
                max_workers=settings.max_compute_concurrency,
            ) as executor:
                future_by_claim = {
                    executor.submit(
                        _compute_claim_bundle,
                        snapshot=snapshots_by_conversation_id[claim.conversation_id],
                        config=config_by_spec_id[claim.opinion_group_spec_id],
                    ): claim
                    for claim in non_empty_claims
                }
                for future in as_completed(future_by_claim):
                    claim = future_by_claim[future]
                    try:
                        bundles_by_conversation_id[claim.conversation_id] = future.result()
                    except RedDwarfContractError:
                        log.exception(
                            "[MathUpdater] Red-dwarf contract failure for "
                            "conversationSlugId=%s conversationId=%d",
                            claim.conversation_slug_id,
                            claim.conversation_id,
                        )
                        non_retryable_failed_claims.append(claim)
                    except Exception:
                        log.exception(
                            "[MathUpdater] Compute failed for "
                            "conversationSlugId=%s conversationId=%d",
                            claim.conversation_slug_id,
                            claim.conversation_id,
                        )
                        failed_claims.append(claim)

            log.info(
                "[MathUpdater] Finished compute completed=%d failed=%d non_retryable=%d "
                "compute_ms=%.1f",
                len(bundles_by_conversation_id),
                len(failed_claims),
                len(non_retryable_failed_claims),
                (time.perf_counter() - compute_started_at) * 1000,
            )

            completed_claims = [
                claim
                for claim in non_empty_claims
                if claim.conversation_id in bundles_by_conversation_id
            ]
            if completed_claims:
                log.info(
                    "[MathUpdater] Persisting computed results: %s",
                    "; ".join(
                        _bundle_summary(bundles_by_conversation_id[claim.conversation_id])
                        for claim in completed_claims
                    ),
                )
                did_persist_computed_results = False
                persist_started_at = time.perf_counter()
                try:
                    completed_result = persist_computed_analysis_results_batch(
                        primary_engine,
                        claims=completed_claims,
                        stored_input_snapshots_by_conversation_id=stored_snapshots,
                        prepared_input_snapshots_by_conversation_id=snapshots_by_conversation_id,
                        bundles_by_conversation_id=bundles_by_conversation_id,
                        ai_generation_expected=True,
                        translation_expected=True,
                    )
                    did_persist_computed_results = True
                    log.info(
                        "[MathUpdater] Persisted computed results count=%d ai_due=%d "
                        "ai_view_snapshots=%d persist_ms=%.1f",
                        len(completed_claims),
                        len(completed_result.ai_description_due_conversation_ids),
                        len(completed_result.ai_description_due_view_snapshot_ids),
                        (time.perf_counter() - persist_started_at) * 1000,
                    )
                    ready_to_complete_computed_claims = True
                    if (
                        description_generator is not None
                        and completed_result.ai_description_due_conversation_ids
                    ):
                        try:
                            _process_ai_description_first_pass(
                                primary_engine=primary_engine,
                                vk=vk,
                                worker_id=worker_id,
                                analysis_claims=completed_claims,
                                conversation_ids=completed_result.ai_description_due_conversation_ids,
                                conversation_view_snapshot_ids=completed_result.ai_description_due_view_snapshot_ids,
                                lease_ttl_seconds=settings.lease_ttl_seconds,
                                claim_limit=settings.db_claim_batch_size,
                                max_workers=settings.max_ai_description_concurrency,
                                ai_description_epoch=settings.ai_description_epoch,
                                retry_policy=retry_policy,
                                description_generator=description_generator,
                                description_translator=description_translator,
                                simulation_runtime=simulation_runtime,
                                checkpoint_activation_context=(
                                    completed_result.checkpoint_activation_context
                                ),
                            )
                        except Exception:
                            log.exception(
                                "[MathUpdater] AI description first pass failed after math persist"
                            )
                            ready_to_complete_computed_claims = False
                    elif completed_result.ai_description_due_conversation_ids:
                        _finalize_ai_description_first_pass_without_generator(
                            primary_engine=primary_engine,
                            conversation_ids=completed_result.ai_description_due_conversation_ids,
                            conversation_view_snapshot_ids=(
                                completed_result.ai_description_due_view_snapshot_ids
                            ),
                            checkpoint_activation_context=(
                                completed_result.checkpoint_activation_context
                            ),
                        )
                    computed_completed_schedules: list[WorkStateSchedule] = []
                    if ready_to_complete_computed_claims:
                        computed_completed_schedules = complete_computed_analysis_work_items_batch(
                            primary_engine,
                            claims=completed_claims,
                            require_display_safe_activation=True,
                        )
                        _enqueue_schedules(vk, schedules=computed_completed_schedules)
                        log.info(
                            "[MathUpdater] Completed %d non-empty conversation(s): %s",
                            len(computed_completed_schedules),
                            _format_schedules(
                                schedules=computed_completed_schedules,
                                claims=completed_claims,
                            ),
                        )
                    log.info(
                        "[MathUpdater] Batch complete claimed=%d completed=%d failed=%d "
                        "non_retryable=%d batch_ms=%.1f",
                        len(claims),
                        len(completed_claims),
                        len(failed_claims),
                        len(non_retryable_failed_claims),
                        (time.perf_counter() - batch_started_at) * 1000,
                    )
                except (SQLAlchemyError, AnalysisWorkStatePersistenceError) as error:
                    log_database_error(
                        logger=log,
                        message="[MathUpdater] Failed computed-result persistence flow",
                        error=error,
                        context={
                            "claims": _format_claims(completed_claims),
                        },
                    )
                    if did_persist_computed_results:
                        isolated_complete_failed_claims: list[ClaimedWorkItem] = []
                        for claim in completed_claims:
                            try:
                                completed_schedules = complete_computed_analysis_work_items_batch(
                                    primary_engine,
                                    claims=[claim],
                                    require_display_safe_activation=True,
                                )
                                _enqueue_schedules(vk, schedules=completed_schedules)
                            except SQLAlchemyError as isolated_error:
                                log_database_error(
                                    logger=log,
                                    message=(
                                        "[MathUpdater] Failed isolated computed-result completion"
                                    ),
                                    error=isolated_error,
                                    context={"claim": _format_claim(claim)},
                                )
                                isolated_complete_failed_claims.append(claim)
                        if isolated_complete_failed_claims:
                            log.warning(
                                "[MathUpdater] Left %d persisted analysis work item(s) "
                                "running for lease recovery: %s",
                                len(isolated_complete_failed_claims),
                                _format_claims(isolated_complete_failed_claims),
                            )
                    else:
                        isolated_failed_claims: list[ClaimedWorkItem] = []
                        lineage_invariant_failed_claims: list[ClaimedWorkItem] = []
                        for claim in completed_claims:
                            try:
                                isolated_result = persist_computed_analysis_results_batch(
                                    primary_engine,
                                    claims=[claim],
                                    stored_input_snapshots_by_conversation_id=stored_snapshots,
                                    prepared_input_snapshots_by_conversation_id=snapshots_by_conversation_id,
                                    bundles_by_conversation_id=bundles_by_conversation_id,
                                    ai_generation_expected=True,
                                    translation_expected=True,
                                )
                                ready_to_complete_isolated_claim = True
                                if (
                                    description_generator is not None
                                    and isolated_result.ai_description_due_conversation_ids
                                ):
                                    try:
                                        _process_ai_description_first_pass(
                                            primary_engine=primary_engine,
                                            vk=vk,
                                            worker_id=worker_id,
                                            analysis_claims=[claim],
                                            conversation_ids=isolated_result.ai_description_due_conversation_ids,
                                            conversation_view_snapshot_ids=isolated_result.ai_description_due_view_snapshot_ids,
                                            lease_ttl_seconds=settings.lease_ttl_seconds,
                                            claim_limit=settings.db_claim_batch_size,
                                            max_workers=settings.max_ai_description_concurrency,
                                            ai_description_epoch=settings.ai_description_epoch,
                                            retry_policy=retry_policy,
                                            description_generator=description_generator,
                                            description_translator=description_translator,
                                            simulation_runtime=simulation_runtime,
                                            checkpoint_activation_context=(
                                                isolated_result.checkpoint_activation_context
                                            ),
                                        )
                                    except Exception:
                                        log.exception(
                                            "[MathUpdater] Isolated AI description first pass "
                                            "failed after math persist"
                                        )
                                        ready_to_complete_isolated_claim = False
                                elif isolated_result.ai_description_due_conversation_ids:
                                    _finalize_ai_description_first_pass_without_generator(
                                        primary_engine=primary_engine,
                                        conversation_ids=(
                                            isolated_result.ai_description_due_conversation_ids
                                        ),
                                        conversation_view_snapshot_ids=(
                                            isolated_result.ai_description_due_view_snapshot_ids
                                        ),
                                        checkpoint_activation_context=(
                                            isolated_result.checkpoint_activation_context
                                        ),
                                    )
                                if ready_to_complete_isolated_claim:
                                    isolated_completed_schedules = (
                                        complete_computed_analysis_work_items_batch(
                                            primary_engine,
                                            claims=[claim],
                                            require_display_safe_activation=True,
                                        )
                                    )
                                    _enqueue_schedules(
                                        vk,
                                        schedules=isolated_completed_schedules,
                                    )
                            except LineageAssignmentInvariantError:
                                log.exception(
                                    "[MathUpdater] Non-retryable lineage assignment invariant "
                                    "failure conversationSlugId=%s conversationId=%d",
                                    claim.conversation_slug_id,
                                    claim.conversation_id,
                                )
                                lineage_invariant_failed_claims.append(claim)
                            except (
                                SQLAlchemyError,
                                AnalysisWorkStatePersistenceError,
                            ) as isolated_error:
                                log_database_error(
                                    logger=log,
                                    message="[MathUpdater] Failed isolated computed-result persist",
                                    error=isolated_error,
                                    context={"claim": _format_claim(claim)},
                                )
                                isolated_failed_claims.append(claim)

                        if lineage_invariant_failed_claims:
                            blocked_schedules = mark_non_retryable_work_items_batch(
                                primary_engine,
                                claims=lineage_invariant_failed_claims,
                                analysis_engine_epoch=settings.analysis_engine_epoch,
                                error_code="lineage_assignment_invariant_error",
                                error_message=(
                                    "lineage assignment invariant failed; see worker logs"
                                ),
                            )
                            _enqueue_schedules(vk, schedules=blocked_schedules)
                            log.info(
                                "[MathUpdater] Marked %d lineage-invariant-failed "
                                "conversation(s) non-retryable: %s",
                                len(blocked_schedules),
                                _format_schedules(
                                    schedules=blocked_schedules,
                                    claims=lineage_invariant_failed_claims,
                                ),
                            )

                        if isolated_failed_claims:
                            requeued_schedules = retry_scheduled_work_items_batch(
                                primary_engine,
                                claims=isolated_failed_claims,
                                retry_policy=retry_policy,
                                error_code="analysis_persist_failed",
                                error_message="analysis persistence failed; see worker logs",
                            )
                            _enqueue_schedules(vk, schedules=requeued_schedules)
                            log.info(
                                "[MathUpdater] Requeued %d persist-failed conversation(s): %s",
                                len(requeued_schedules),
                                _format_schedules(
                                    schedules=requeued_schedules,
                                    claims=isolated_failed_claims,
                                ),
                            )

            if failed_claims:
                requeued_schedules = retry_scheduled_work_items_batch(
                    primary_engine,
                    claims=failed_claims,
                    retry_policy=retry_policy,
                    error_code="red_dwarf_compute_failed",
                    error_message="red-dwarf compute failed; see worker logs",
                )
                _enqueue_schedules(vk, schedules=requeued_schedules)
                log.info(
                    "[MathUpdater] Requeued %d failed conversation(s): %s",
                    len(requeued_schedules),
                    _format_schedules(schedules=requeued_schedules, claims=failed_claims),
                )

            if non_retryable_failed_claims:
                blocked_schedules = mark_non_retryable_work_items_batch(
                    primary_engine,
                    claims=non_retryable_failed_claims,
                    analysis_engine_epoch=settings.analysis_engine_epoch,
                    error_code="red_dwarf_contract_error",
                    error_message="red-dwarf success payload violated math-updater contract",
                )
                _enqueue_schedules(vk, schedules=blocked_schedules)
                log.info(
                    "[MathUpdater] Marked %d contract-failed conversation(s) non-retryable: %s",
                    len(blocked_schedules),
                    _format_schedules(
                        schedules=blocked_schedules,
                        claims=non_retryable_failed_claims,
                    ),
                )

    stop_lease_heartbeat()
    primary_engine.dispose()
    read_engine.dispose()
    vk.close()
    log.info("[MathUpdater] Shutdown complete")


def main() -> None:
    while _running:
        try:
            _run_worker_once()
            return
        except Exception:
            _stop_lease_heartbeats()
            log.exception(
                "[MathUpdater] Worker crashed; restarting in %.1fs",
                STARTUP_RETRY_INTERVAL_SECONDS,
            )
            _sleep_before_retry(STARTUP_RETRY_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
