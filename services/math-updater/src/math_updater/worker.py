from __future__ import annotations

import logging
import signal
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Event, Lock, Thread
from typing import TYPE_CHECKING, cast

import valkey as valkey_lib
from agora_worker_shared.ai_description_lease_heartbeat import (
    start_ai_description_lease_heartbeat,
)
from agora_worker_shared.ai_description_work import (
    DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE,
    AiDescriptionWorkResult,
    ClaimedAiDescriptionLocaleWorkItem,
    ClaimedDescriptionTranslationWorkItem,
    ClaimedLineageDescriptionWorkItem,
    claim_ai_description_locale_work_items_batch,
    claim_first_pass_ai_description_locale_work_items_batch,
    complete_non_processable_ai_description_work_batch,
    description_translation_work_claim_batches,
    fetch_ai_description_view_snapshot_ids_for_analysis_snapshots,
    finalize_first_pass_ai_description_work_batch,
    lineage_description_work_claim_batches,
    mark_non_retryable_ai_description_locale_work_item,
    process_description_translation_work_items_batch,
    process_lineage_description_work_items_batch,
    recover_expired_ai_description_work,
    retry_ai_description_locale_work_item,
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
    claim_work_items_and_fetch_inputs_batch,
    complete_computed_analysis_work_items_batch,
    complete_non_processable_work_items_batch,
    extend_postgres_leases,
    fetch_claimable_work_conversation_ids,
    fetch_opinion_group_configs,
    mark_non_retryable_work_items_batch,
    persist_computed_analysis_results_batch,
    persist_empty_vote_matrix_results_batch,
    recover_expired_running_work,
    release_retryable_work_items_batch,
    upsert_input_snapshots_batch,
)
from agora_worker_shared.description_input import DescriptionInputError, DescriptionOutputError
from agora_worker_shared.description_services import (
    build_description_generator,
    build_description_translator,
)
from agora_worker_shared.input_snapshot import PreparedInputSnapshot, prepare_input_snapshots_batch
from agora_worker_shared.logging_utils import (
    LOG_FORMAT,
    configure_worker_logging,
    log_database_error,
)
from agora_worker_shared.postgres_engine import create_ready_postgres_engine
from agora_worker_shared.schema_readiness import (
    StartupSchemaRetryState,
    handle_startup_schema_retry,
    mark_startup_schema_ready,
)
from agora_worker_shared.simulation_providers import (
    SimulatedRetryableError,
    build_simulation_runtime,
    emit_load_event,
    log_simulation_startup,
    maybe_raise_simulated_claim_error,
)
from agora_worker_shared.valkey_client import (
    enqueue_conversation,
    format_queue_lag_ms,
    now_ms,
    pop_conversations,
    queue_depth,
    requeue_conversations,
)
from botocore.exceptions import ConnectTimeoutError, ReadTimeoutError
from google.api_core.exceptions import DeadlineExceeded
from google.api_core.exceptions import RetryError as GoogleRetryError
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
    format=LOG_FORMAT,
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


def _enqueue_conversations_for_math_work(
    vk: valkey_lib.Valkey,
    *,
    conversation_ids: Sequence[int],
) -> None:
    enqueued_count = 0
    current_ms = now_ms()
    for conversation_id in conversation_ids:
        enqueue_conversation(
            vk,
            conversation_id=conversation_id,
            enqueued_at_ms=current_ms,
        )
        enqueued_count += 1
    if enqueued_count:
        log.info(
            "[MathUpdater] Queued %d conversation(s) for math work queue=analysis:dirty",
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
    enqueued_at_ms: int,
) -> None:
    if conversation_ids:
        log.info(
            "[MathUpdater] Enqueueing %d conversation id(s) ids=%s enqueued_at_ms=%d",
            len(conversation_ids),
            _format_ids(conversation_ids),
            enqueued_at_ms,
        )
    for conversation_id in conversation_ids:
        enqueue_conversation(
            vk,
            conversation_id=conversation_id,
            enqueued_at_ms=enqueued_at_ms,
        )


def _format_claim(claim: ClaimedWorkItem) -> str:
    return f"{claim.conversation_slug_id} (id={claim.conversation_id})"


def _format_claims(claims: list[ClaimedWorkItem]) -> str:
    return ", ".join(_format_claim(claim) for claim in claims)


def _release_unpersisted_claims_after_db_error(
    *,
    primary_engine: Engine,
    vk: valkey_lib.Valkey,
    claims: list[ClaimedWorkItem],
    error_code: str,
    error_message: str,
    failure_message: str,
    enqueue_released: bool = True,
) -> list[int]:
    if not claims:
        return []

    try:
        retry_conversation_ids = release_retryable_work_items_batch(
            primary_engine,
            claims=claims,
            error_code=error_code,
            error_message=error_message,
        )
        if enqueue_released:
            _enqueue_conversations_for_math_work(
                vk,
                conversation_ids=retry_conversation_ids,
            )
        return retry_conversation_ids
    except SQLAlchemyError as release_error:
        log_database_error(
            logger=log,
            message=(
                f"{failure_message}; failed to release analysis work, "
                "lease recovery will retry"
            ),
            error=release_error,
            context={"claims": _format_claims(claims)},
        )
        return []


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


def _start_ai_description_lease_heartbeat(
    *,
    primary_engine: Engine,
    claims: list[ClaimedAiDescriptionLocaleWorkItem],
    lease_ttl_seconds: int,
    interval_seconds: int,
) -> Callable[[], None]:
    stop_heartbeat = start_ai_description_lease_heartbeat(
        primary_engine=primary_engine,
        claims=claims,
        lease_ttl_seconds=lease_ttl_seconds,
        interval_seconds=interval_seconds,
        log_prefix="[MathUpdater]",
        thread_name="math-updater-ai-description-lease-heartbeat",
    )

    def stop_managed_heartbeat() -> None:
        stop_heartbeat()
        with _lease_heartbeat_stoppers_lock:
            if stop_managed_heartbeat in _lease_heartbeat_stoppers:
                _lease_heartbeat_stoppers.remove(stop_managed_heartbeat)

    with _lease_heartbeat_stoppers_lock:
        _lease_heartbeat_stoppers.append(stop_managed_heartbeat)

    return stop_managed_heartbeat


def _format_processed_conversations_for_log(
    *,
    conversation_ids: list[int],
    work_items: list[ClaimedWorkItem],
) -> str:
    work_item_by_conversation_id = {item.conversation_id: item for item in work_items}
    return ", ".join(
        _format_claim(work_item_by_conversation_id[conversation_id])
        if conversation_id in work_item_by_conversation_id
        else f"id={conversation_id}"
        for conversation_id in conversation_ids
    )


def _first_pass_translation_claim_limit(
    *,
    claim_limit: int,
    max_workers: int,
) -> int:
    return max(claim_limit, max_workers * DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE)


def _process_ai_description_conversation_ids(
    *,
    primary_engine: Engine,
    vk: valkey_lib.Valkey,
    worker_id: str,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int] | None = None,
    lease_ttl_seconds: int,
    heartbeat_interval_seconds: int,
    claim_limit: int,
    max_workers: int,
    ai_description_epoch: int,
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
        if retry_first_pass_once and conversation_view_snapshot_ids is not None:
            ai_claims = claim_first_pass_ai_description_locale_work_items_batch(
                primary_engine,
                worker_id=worker_id,
                conversation_ids=processable_conversation_ids,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                lease_ttl_seconds=lease_ttl_seconds,
                limit=claim_limit,
                ai_description_epoch=ai_description_epoch,
                translation_enabled=description_translator is not None,
                claim_translations=False,
                require_pending_status=require_pending_status,
            )
        else:
            ai_claims = claim_ai_description_locale_work_items_batch(
                primary_engine,
                worker_id=worker_id,
                conversation_ids=processable_conversation_ids,
                conversation_view_snapshot_ids=conversation_view_snapshot_ids,
                lease_ttl_seconds=lease_ttl_seconds,
                limit=claim_limit,
                ai_description_epoch=ai_description_epoch,
                translation_enabled=description_translator is not None,
                claim_translations=False,
                require_pending_status=require_pending_status,
            )
    translation_claim_limit = claim_limit
    if retry_first_pass_once:
        translation_claim_limit = _first_pass_translation_claim_limit(
            claim_limit=claim_limit,
            max_workers=max_workers,
        )
    remaining_translation_claim_limit = translation_claim_limit - len(ai_claims)
    if (
        claim_translations
        and description_translator is not None
        and remaining_translation_claim_limit > 0
    ):
        if retry_first_pass_once and conversation_view_snapshot_ids is not None:
            ai_claims.extend(
                claim_first_pass_ai_description_locale_work_items_batch(
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
        else:
            ai_claims.extend(
                claim_ai_description_locale_work_items_batch(
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
        log.debug(
            "[MathUpdater] No claimable AI description locale work for "
            "conversation_count=%d ids=%s claim_ms=%.1f",
            len(processable_conversation_ids),
            _format_ids(processable_conversation_ids),
            (time.perf_counter() - claim_started_at) * 1000,
        )
        return 0
    work_log = log.debug if retry_first_pass_once else log.info
    work_log(
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
    ) -> AiDescriptionWorkResult:
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
        is_first_pass_timeout = retry_first_pass_once and is_timeout
        schedule = retry_ai_description_locale_work_item(
            primary_engine,
            claim=claim,
            error_code="ai_description_timeout"
            if is_first_pass_timeout
            else "ai_description_retryable",
            error_message=str(error),
        )
        if is_first_pass_timeout:
            log.warning(
                "[MathUpdater] First-pass timeout released for retry worker "
                "kind=%s conversationSlugId=%s conversationId=%d locale=%s %s "
                "attemptCount=%d retryReleasedAt=%s",
                _ai_description_claim_kind(claim),
                claim.conversation_slug_id,
                claim.conversation_id,
                claim.locale,
                _ai_description_claim_target_log(claim),
                claim.attempt_count,
                schedule.retry_released_at.isoformat()
                if schedule.retry_released_at is not None
                else "none",
            )
        return schedule

    def process_lineage_claims(
        claims: list[ClaimedLineageDescriptionWorkItem],
    ) -> list[tuple[ClaimedLineageDescriptionWorkItem, AiDescriptionWorkResult]]:
        processable_claims: list[ClaimedLineageDescriptionWorkItem] = []
        retry_schedules: list[
            tuple[ClaimedLineageDescriptionWorkItem, AiDescriptionWorkResult]
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
        try:
            result = process_lineage_description_work_items_batch(
                primary_engine,
                claims=processable_claims,
                generate_descriptions=description_generator,
            )
            if result.missing_lineage_ids:
                missing_lineage_ids = set(result.missing_lineage_ids)
                missing_error = DescriptionOutputError(
                    "AI label/summary output did not include all requested groups"
                )
                retry_schedules.extend(
                    (claim, process_claim_error(claim=claim, error=missing_error))
                    for claim in processable_claims
                    if claim.lineage_id in missing_lineage_ids
                )
        except Exception as error:
            retry_schedules.extend(
                (claim, process_claim_error(claim=claim, error=error))
                for claim in processable_claims
            )
        return retry_schedules

    def process_translation_claims(
        claims: list[ClaimedDescriptionTranslationWorkItem],
    ) -> list[tuple[ClaimedDescriptionTranslationWorkItem, AiDescriptionWorkResult]]:
        processable_claims: list[ClaimedDescriptionTranslationWorkItem] = []
        retry_schedules: list[
            tuple[ClaimedDescriptionTranslationWorkItem, AiDescriptionWorkResult]
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
                tuple[ClaimedDescriptionTranslationWorkItem, AiDescriptionWorkResult]
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
            result = process_description_translation_work_items_batch(
                primary_engine,
                claims=processable_claims,
                translate_descriptions=translator,
            )
            if result.missing_description_ids:
                missing_description_ids = set(result.missing_description_ids)
                missing_error = DescriptionOutputError(
                    "translation output did not include all requested descriptions"
                )
                retry_schedules.extend(
                    (claim, process_claim_error(claim=claim, error=missing_error))
                    for claim in processable_claims
                    if claim.description_id in missing_description_ids
                )
        except Exception as error:
            retry_schedules.extend(
                (claim, process_claim_error(claim=claim, error=error))
                for claim in processable_claims
            )
        return retry_schedules

    stop_ai_description_heartbeat = _start_ai_description_lease_heartbeat(
        primary_engine=primary_engine,
        claims=ai_claims,
        lease_ttl_seconds=lease_ttl_seconds,
        interval_seconds=heartbeat_interval_seconds,
    )
    try:
        processing_started_at = time.perf_counter()
        lineage_claims = [
            claim for claim in ai_claims if isinstance(claim, ClaimedLineageDescriptionWorkItem)
        ]
        translation_claims: list[ClaimedDescriptionTranslationWorkItem] = []
        for claim in ai_claims:
            if isinstance(claim, ClaimedLineageDescriptionWorkItem):
                continue
            translation_claims.append(claim)

        lineage_claim_batches = lineage_description_work_claim_batches(lineage_claims)
        with ThreadPoolExecutor(
            max_workers=min(max_workers, len(lineage_claim_batches) or 1)
        ) as executor:
            future_by_lineage_claims = {
                executor.submit(process_lineage_claims, claims): claims
                for claims in lineage_claim_batches
            }
            for future in as_completed(future_by_lineage_claims):
                claims_for_candidate = future_by_lineage_claims[future]
                try:
                    retry_schedules = future.result()
                    for claim, schedule in retry_schedules:
                        if schedule.retry_released_at is not None:
                            emit_load_event(
                                phase="math-updater",
                                action="retry-released",
                                outcome="info",
                                conversation_slug_id=claim.conversation_slug_id,
                                metadata={
                                    "conversationId": schedule.conversation_id,
                                    "locale": claim.locale,
                                    "attemptCount": claim.attempt_count,
                                    "retryReleasedAt": schedule.retry_released_at.isoformat(),
                                    **_ai_description_claim_target_metadata(claim),
                                },
                            )
                except Exception:
                    log.exception(
                        "[MathUpdater] Failed to finalize AI description retry state claims=%s",
                        ", ".join(
                            f"{claim.conversation_slug_id}:{claim.locale}:{claim.lineage_id}"
                            for claim in claims_for_candidate
                        ),
                    )

        translation_claim_batches = description_translation_work_claim_batches(
            translation_claims
        )
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
                            if schedule.retry_released_at is not None:
                                emit_load_event(
                                    phase="math-updater",
                                    action="retry-released",
                                    outcome="info",
                                    conversation_slug_id=claim.conversation_slug_id,
                                    metadata={
                                        "conversationId": schedule.conversation_id,
                                        "locale": claim.locale,
                                        "attemptCount": claim.attempt_count,
                                        "retryReleasedAt": schedule.retry_released_at.isoformat(),
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

        work_log(
            "[MathUpdater] Finished AI description locale work count=%d process_ms=%.1f",
            len(ai_claims),
            (time.perf_counter() - processing_started_at) * 1000,
        )
        return len(ai_claims)
    finally:
        stop_ai_description_heartbeat()


def _process_ai_description_first_pass_phase(
    *,
    phase: str,
    primary_engine: Engine,
    vk: valkey_lib.Valkey,
    worker_id: str,
    conversation_ids: list[int],
    conversation_view_snapshot_ids: list[int],
    lease_ttl_seconds: int,
    heartbeat_interval_seconds: int,
    claim_limit: int,
    max_workers: int,
    ai_description_epoch: int,
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
            heartbeat_interval_seconds=heartbeat_interval_seconds,
            claim_limit=claim_limit,
            max_workers=max_workers,
            ai_description_epoch=ai_description_epoch,
            description_generator=description_generator,
            description_translator=description_translator,
            simulation_runtime=simulation_runtime,
            retry_first_pass_once=True,
            claim_lineage_descriptions=phase == "english",
            claim_translations=phase == "translation",
            require_pending_status=True,
        )
        log.debug(
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
    heartbeat_interval_seconds: int,
    claim_limit: int,
    max_workers: int,
    ai_description_epoch: int,
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
        heartbeat_interval_seconds=heartbeat_interval_seconds,
        claim_limit=claim_limit,
        max_workers=max_workers,
        ai_description_epoch=ai_description_epoch,
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
            heartbeat_interval_seconds=heartbeat_interval_seconds,
            claim_limit=claim_limit,
            max_workers=max_workers,
            ai_description_epoch=ai_description_epoch,
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
        require_ai_descriptions=False,
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
    configure_worker_logging(log_level=settings.effective_log_level)

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    worker_id = f"math-updater:{uuid.uuid4()}"
    log.info(
        "[MathUpdater] Starting worker_id=%s claim_batch=%d compute=%d ai=%d "
        "lease_ttl=%ds heartbeat=%ds recovery=%ds",
        worker_id,
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

    primary_engine = create_ready_postgres_engine(
        connection_string=settings.connection_string,
        role="primary",
        logger=log,
        log_prefix="[MathUpdater]",
        retry_interval_seconds=settings.valkey_retry_interval_seconds,
        should_continue=lambda: _running,
        sleep_fn=_sleep_before_retry,
    )
    if primary_engine is None:
        vk.close()
        log.info("[MathUpdater] Shutdown complete")
        return

    read_engine = create_ready_postgres_engine(
        connection_string=settings.read_dsn,
        role="read",
        logger=log,
        log_prefix="[MathUpdater]",
        retry_interval_seconds=settings.valkey_retry_interval_seconds,
        should_continue=lambda: _running,
        sleep_fn=_sleep_before_retry,
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
    set_active_analysis_claims, stop_lease_heartbeat = _start_lease_heartbeat(
        primary_engine=primary_engine,
        lease_ttl_seconds=settings.lease_ttl_seconds,
        interval_seconds=settings.heartbeat_interval_seconds,
    )

    monotonic_start = time.monotonic()
    last_reconcile = monotonic_start - settings.reconciliation_interval_seconds
    last_recover = monotonic_start - settings.running_recovery_interval_seconds
    schema_retry_state = StartupSchemaRetryState()

    while _running:
        set_active_analysis_claims([])
        monotonic_now = time.monotonic()

        if monotonic_now - last_reconcile >= settings.reconciliation_interval_seconds:
            try:
                claimable_ids = fetch_claimable_work_conversation_ids(
                    read_engine,
                    limit=1000,
                    analysis_engine_epoch=settings.analysis_engine_epoch,
                )
                current_ms = now_ms()
                _enqueue_conversation_ids(
                    vk,
                    conversation_ids=sorted(set(claimable_ids)),
                    enqueued_at_ms=current_ms,
                )
                if claimable_ids:
                    log.info(
                        "[MathUpdater] Reconciled claimable analysis conversations "
                        "source=read_replica count=%d ids=%s",
                        len(claimable_ids),
                        _format_ids(claimable_ids),
                    )
            except Exception as error:
                retry_decision = handle_startup_schema_retry(
                    state=schema_retry_state,
                    error=error,
                    logger=log,
                    log_prefix="[MathUpdater]",
                )
                schema_retry_state = retry_decision.state
                if retry_decision.should_retry:
                    time.sleep(settings.worker_poll_idle_sleep_seconds)
                    continue
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
                    enqueued_at_ms=current_ms,
                )
                if recovered_ids:
                    log.info(
                        "[MathUpdater] Recovered %d expired running/first-pass items",
                        len(recovered_ids),
                    )
                schema_retry_state = mark_startup_schema_ready(state=schema_retry_state)
            except Exception as error:
                retry_decision = handle_startup_schema_retry(
                    state=schema_retry_state,
                    error=error,
                    logger=log,
                    log_prefix="[MathUpdater]",
                )
                schema_retry_state = retry_decision.state
                if retry_decision.should_retry:
                    time.sleep(settings.worker_poll_idle_sleep_seconds)
                    continue
                log.exception("[MathUpdater] Running-work recovery failed")
            last_recover = monotonic_now

        pop_current_ms = now_ms()
        queued_items = pop_conversations(
            vk,
            count=settings.db_claim_batch_size,
        )
        if not queued_items:
            time.sleep(settings.worker_poll_idle_sleep_seconds)
            continue

        log.info(
            "[MathUpdater] Popped %d queued conversation(s) that may need math work ids=%s "
            "queue_lag_ms=%s depth_after=%d",
            len(queued_items),
            _format_ids([item.conversation_id for item in queued_items]),
            format_queue_lag_ms(queued_items, current_time_ms=pop_current_ms),
            queue_depth(vk),
        )

        if not _running:
            requeue_conversations(vk, conversations=queued_items)
            log.info(
                "[MathUpdater] Requeued unprocessed conversation(s) ids=%s "
                "reason=shutdown_before_processing",
                _format_ids([item.conversation_id for item in queued_items]),
            )
            break

        batch_started_at = time.perf_counter()
        processable_queue_items = queued_items

        try:
            completed_non_processable_ids = complete_non_processable_work_items_batch(
                primary_engine,
                conversation_ids=[item.conversation_id for item in processable_queue_items],
            )
        except SQLAlchemyError as error:
            log_database_error(
                logger=log,
                message="[MathUpdater] Failed to complete non-processable analysis work",
                error=error,
                context={
                    "conversation_ids": _format_ids(
                        [item.conversation_id for item in processable_queue_items]
                    ),
                },
            )
            requeue_conversations(vk, conversations=processable_queue_items)
            continue
        if completed_non_processable_ids:
            log.info(
                "[MathUpdater] Completed %d non-processable conversation(s) ids=%s",
                len(completed_non_processable_ids),
                _format_ids(completed_non_processable_ids),
            )

        non_processable_id_set = set(completed_non_processable_ids)
        processable_items = [
            item
            for item in processable_queue_items
            if item.conversation_id not in non_processable_id_set
        ]
        if not processable_items:
            continue

        claim_started_at = time.perf_counter()
        try:
            claimed_input_batch = claim_work_items_and_fetch_inputs_batch(
                primary_engine,
                worker_id=worker_id,
                conversation_ids=[item.conversation_id for item in processable_items],
                lease_ttl_seconds=settings.lease_ttl_seconds,
                limit=settings.db_claim_batch_size,
                analysis_engine_epoch=settings.analysis_engine_epoch,
            )
        except SQLAlchemyError as error:
            retry_decision = handle_startup_schema_retry(
                state=schema_retry_state,
                error=error,
                logger=log,
                log_prefix="[MathUpdater]",
            )
            schema_retry_state = retry_decision.state
            if retry_decision.should_retry:
                requeue_conversations(vk, conversations=processable_items)
                time.sleep(settings.worker_poll_idle_sleep_seconds)
                continue
            log_database_error(
                logger=log,
                message="[MathUpdater] Failed to claim analysis work",
                error=error,
                context={
                    "conversation_ids": _format_ids(
                        [item.conversation_id for item in processable_items]
                    ),
                },
            )
            requeue_conversations(vk, conversations=processable_items)
            continue
        claims = claimed_input_batch.claims

        if not claims:
            primary_claimable_ids: list[int] = []
            try:
                primary_claimable_ids = fetch_claimable_work_conversation_ids(
                    primary_engine,
                    limit=settings.db_claim_batch_size,
                    analysis_engine_epoch=settings.analysis_engine_epoch,
                )
            except Exception:
                log.exception("[MathUpdater] Failed primary claimable diagnostic after zero claim")
            log.info(
                "[MathUpdater] No math work processable for queued conversation(s) "
                "ids=%s primaryClaimableCount=%d primaryClaimableIds=%s "
                "reason_hint=queued_ids_likely_still_leased_or_already_completed",
                _format_ids([item.conversation_id for item in processable_items]),
                len(primary_claimable_ids),
                _format_ids(primary_claimable_ids),
            )
            continue

        log.info(
            "[MathUpdater] Claimed %d conversation(s): %s claim_ms=%.1f",
            len(claims),
            _format_claims(claims),
            (time.perf_counter() - claim_started_at) * 1000,
        )
        set_active_analysis_claims(claims)

        if not _running:
            releasable_claims = [
                claim for claim in claims if claim.persisted_analysis_snapshot_id is None
            ]
            retained_claims = [
                claim for claim in claims if claim.persisted_analysis_snapshot_id is not None
            ]
            if releasable_claims:
                shutdown_retry_conversation_ids = release_retryable_work_items_batch(
                    primary_engine,
                    claims=releasable_claims,
                    error_code="worker_shutdown",
                    error_message="math-updater shut down before processing started",
                )
                _enqueue_conversations_for_math_work(
                    vk,
                    conversation_ids=shutdown_retry_conversation_ids,
                )
                log.info(
                    "[MathUpdater] Requeued unprocessed conversation(s) ids=%s "
                    "reason=shutdown_after_claim_before_processing",
                    _format_ids(shutdown_retry_conversation_ids),
                )
            if retained_claims:
                log.info(
                    "[MathUpdater] Leaving %d persisted analysis work item(s) for lease "
                    "recovery reason=shutdown_after_claim_before_processing claims=%s",
                    len(retained_claims),
                    _format_claims(retained_claims),
                )
            set_active_analysis_claims([])
            break

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
                        heartbeat_interval_seconds=settings.heartbeat_interval_seconds,
                        claim_limit=settings.db_claim_batch_size,
                        max_workers=settings.max_ai_description_concurrency,
                        ai_description_epoch=settings.ai_description_epoch,
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
                    persisted_newer_generation_ids = complete_computed_analysis_work_items_batch(
                        primary_engine,
                        claims=persisted_claims,
                        require_display_safe_activation=True,
                    )
                    _enqueue_conversations_for_math_work(
                        vk,
                        conversation_ids=persisted_newer_generation_ids,
                    )
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
        try:
            stored_snapshots = upsert_input_snapshots_batch(
                primary_engine,
                snapshots=list(snapshots_by_conversation_id.values()),
            )
        except SQLAlchemyError as error:
            log_database_error(
                logger=log,
                message="[MathUpdater] Failed to persist analysis input snapshots",
                error=error,
                context={"claims": _format_claims(active_analysis_claims)},
            )
            set_active_analysis_claims([])
            _release_unpersisted_claims_after_db_error(
                primary_engine=primary_engine,
                vk=vk,
                claims=active_analysis_claims,
                error_code="analysis_input_snapshot_persist_failed",
                error_message="analysis input snapshot persistence failed; see worker logs",
                failure_message=(
                    "[MathUpdater] Failed to release analysis work after input "
                    "snapshot persist failure"
                ),
            )
            continue
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
            empty_newer_generation_ids: list[int]
            try:
                empty_newer_generation_ids = persist_empty_vote_matrix_results_batch(
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
                empty_newer_generation_ids = []
                isolated_empty_failed_claims: list[ClaimedWorkItem] = []
                for claim in empty_claims:
                    try:
                        empty_newer_generation_ids.extend(
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
                    empty_newer_generation_ids.extend(
                        _release_unpersisted_claims_after_db_error(
                            primary_engine=primary_engine,
                            vk=vk,
                            claims=isolated_empty_failed_claims,
                            error_code="analysis_persist_failed",
                            error_message="analysis persistence failed; see worker logs",
                            failure_message=(
                                "[MathUpdater] Failed to release empty-matrix analysis work "
                                "after persist failure"
                            ),
                            enqueue_released=False,
                        )
                    )
            _enqueue_conversations_for_math_work(
                vk,
                conversation_ids=empty_newer_generation_ids,
            )
            log.info(
                "[MathUpdater] Completed empty-matrix math work completed=%d "
                "newer_generation=%d conversations=%s",
                len(empty_claims),
                len(empty_newer_generation_ids),
                _format_processed_conversations_for_log(
                    conversation_ids=empty_newer_generation_ids,
                    work_items=empty_claims,
                ),
            )
            log.info(
                "[MathUpdater] Empty-matrix batch complete processable=%d completed=%d "
                "newer_generation=%d batch_ms=%.1f",
                len(empty_claims),
                len(empty_claims),
                len(empty_newer_generation_ids),
                (time.perf_counter() - batch_started_at) * 1000,
            )

        non_empty_claims = [
            claim
            for claim in active_analysis_claims
            if len(snapshots_by_conversation_id[claim.conversation_id].votes) > 0
        ]
        if non_empty_claims:
            try:
                config_by_spec_id = fetch_opinion_group_configs(
                    primary_engine,
                    opinion_group_spec_ids=[
                        claim.opinion_group_spec_id for claim in non_empty_claims
                    ],
                )
            except SQLAlchemyError as error:
                log_database_error(
                    logger=log,
                    message="[MathUpdater] Failed to fetch opinion-group config",
                    error=error,
                    context={"claims": _format_claims(non_empty_claims)},
                )
                set_active_analysis_claims([])
                _release_unpersisted_claims_after_db_error(
                    primary_engine=primary_engine,
                    vk=vk,
                    claims=non_empty_claims,
                    error_code="analysis_config_fetch_failed",
                    error_message="analysis config fetch failed; see worker logs",
                    failure_message=(
                        "[MathUpdater] Failed to release analysis work after config "
                        "fetch failure"
                    ),
                )
                continue

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
                    )
                    did_persist_computed_results = True
                    log.info(
                        "[MathUpdater] Persisted computed results count=%d ai_work=%d "
                        "ai_view_snapshots=%d persist_ms=%.1f",
                        len(completed_claims),
                        len(completed_result.ai_description_work_conversation_ids),
                        len(completed_result.ai_description_work_view_snapshot_ids),
                        (time.perf_counter() - persist_started_at) * 1000,
                    )
                    ready_to_complete_computed_claims = True
                    if (
                        description_generator is not None
                        and completed_result.ai_description_work_conversation_ids
                    ):
                        try:
                            _process_ai_description_first_pass(
                                primary_engine=primary_engine,
                                vk=vk,
                                worker_id=worker_id,
                                analysis_claims=completed_claims,
                                conversation_ids=completed_result.ai_description_work_conversation_ids,
                                conversation_view_snapshot_ids=completed_result.ai_description_work_view_snapshot_ids,
                                lease_ttl_seconds=settings.lease_ttl_seconds,
                                heartbeat_interval_seconds=settings.heartbeat_interval_seconds,
                                claim_limit=settings.db_claim_batch_size,
                                max_workers=settings.max_ai_description_concurrency,
                                ai_description_epoch=settings.ai_description_epoch,
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
                    elif completed_result.ai_description_work_conversation_ids:
                        _finalize_ai_description_first_pass_without_generator(
                            primary_engine=primary_engine,
                            conversation_ids=completed_result.ai_description_work_conversation_ids,
                            conversation_view_snapshot_ids=(
                                completed_result.ai_description_work_view_snapshot_ids
                            ),
                            checkpoint_activation_context=(
                                completed_result.checkpoint_activation_context
                            ),
                        )
                    computed_newer_generation_ids: list[int] = []
                    if ready_to_complete_computed_claims:
                        computed_newer_generation_ids = (
                            complete_computed_analysis_work_items_batch(
                                primary_engine,
                                claims=completed_claims,
                                require_display_safe_activation=True,
                            )
                        )
                        _enqueue_conversations_for_math_work(
                            vk,
                            conversation_ids=computed_newer_generation_ids,
                        )
                        log.info(
                            "[MathUpdater] Completed non-empty math work completed=%d "
                            "newer_generation=%d conversations=%s",
                            len(completed_claims),
                            len(computed_newer_generation_ids),
                            _format_processed_conversations_for_log(
                                conversation_ids=computed_newer_generation_ids,
                                work_items=completed_claims,
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
                                isolated_completion_newer_generation_ids = (
                                    complete_computed_analysis_work_items_batch(
                                        primary_engine,
                                        claims=[claim],
                                        require_display_safe_activation=True,
                                    )
                                )
                                _enqueue_conversations_for_math_work(
                                    vk,
                                    conversation_ids=isolated_completion_newer_generation_ids,
                                )
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
                                )
                                ready_to_complete_isolated_claim = True
                                if (
                                    description_generator is not None
                                    and isolated_result.ai_description_work_conversation_ids
                                ):
                                    try:
                                        _process_ai_description_first_pass(
                                            primary_engine=primary_engine,
                                            vk=vk,
                                            worker_id=worker_id,
                                            analysis_claims=[claim],
                                            conversation_ids=isolated_result.ai_description_work_conversation_ids,
                                            conversation_view_snapshot_ids=isolated_result.ai_description_work_view_snapshot_ids,
                                            lease_ttl_seconds=settings.lease_ttl_seconds,
                                            heartbeat_interval_seconds=settings.heartbeat_interval_seconds,
                                            claim_limit=settings.db_claim_batch_size,
                                            max_workers=settings.max_ai_description_concurrency,
                                            ai_description_epoch=settings.ai_description_epoch,
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
                                elif isolated_result.ai_description_work_conversation_ids:
                                    _finalize_ai_description_first_pass_without_generator(
                                        primary_engine=primary_engine,
                                        conversation_ids=(
                                            isolated_result.ai_description_work_conversation_ids
                                        ),
                                        conversation_view_snapshot_ids=(
                                            isolated_result.ai_description_work_view_snapshot_ids
                                        ),
                                        checkpoint_activation_context=(
                                            isolated_result.checkpoint_activation_context
                                        ),
                                    )
                                if ready_to_complete_isolated_claim:
                                    isolated_persist_newer_generation_ids = (
                                        complete_computed_analysis_work_items_batch(
                                            primary_engine,
                                            claims=[claim],
                                            require_display_safe_activation=True,
                                        )
                                    )
                                    _enqueue_conversations_for_math_work(
                                        vk,
                                        conversation_ids=isolated_persist_newer_generation_ids,
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
                            try:
                                lineage_newer_generation_ids = mark_non_retryable_work_items_batch(
                                    primary_engine,
                                    claims=lineage_invariant_failed_claims,
                                    analysis_engine_epoch=settings.analysis_engine_epoch,
                                    error_code="lineage_assignment_invariant_error",
                                    error_message=(
                                        "lineage assignment invariant failed; see worker logs"
                                    ),
                                )
                            except SQLAlchemyError as mark_error:
                                log_database_error(
                                    logger=log,
                                    message=(
                                        "[MathUpdater] Failed to mark lineage-invariant "
                                        "analysis work non-retryable; lease recovery will retry"
                                    ),
                                    error=mark_error,
                                    context={
                                        "claims": _format_claims(lineage_invariant_failed_claims)
                                    },
                                )
                                lineage_newer_generation_ids = []
                            _enqueue_conversations_for_math_work(
                                vk,
                                conversation_ids=lineage_newer_generation_ids,
                            )
                            log.info(
                                "[MathUpdater] Marked %d lineage-invariant-failed "
                                "conversation(s) non-retryable newer_generation=%d: %s",
                                len(lineage_invariant_failed_claims),
                                len(lineage_newer_generation_ids),
                                _format_processed_conversations_for_log(
                                    conversation_ids=lineage_newer_generation_ids,
                                    work_items=lineage_invariant_failed_claims,
                                ),
                            )

                        if isolated_failed_claims:
                            persist_retry_conversation_ids = (
                                _release_unpersisted_claims_after_db_error(
                                    primary_engine=primary_engine,
                                    vk=vk,
                                    claims=isolated_failed_claims,
                                    error_code="analysis_persist_failed",
                                    error_message="analysis persistence failed; see worker logs",
                                    failure_message=(
                                        "[MathUpdater] Failed to release analysis work after "
                                        "retryable math persistence failure"
                                    ),
                                    enqueue_released=False,
                                )
                            )
                            _enqueue_conversations_for_math_work(
                                vk,
                                conversation_ids=persist_retry_conversation_ids,
                            )
                            log.info(
                                "[MathUpdater] Requeued conversation(s) after retryable "
                                "math persistence failure count=%d conversations=%s",
                                len(persist_retry_conversation_ids),
                                _format_processed_conversations_for_log(
                                    conversation_ids=persist_retry_conversation_ids,
                                    work_items=isolated_failed_claims,
                                ),
                            )

            if failed_claims:
                compute_retry_conversation_ids = _release_unpersisted_claims_after_db_error(
                    primary_engine=primary_engine,
                    vk=vk,
                    claims=failed_claims,
                    error_code="red_dwarf_compute_failed",
                    error_message="red-dwarf compute failed; see worker logs",
                    failure_message=(
                        "[MathUpdater] Failed to release analysis work after retryable "
                        "math failure"
                    ),
                    enqueue_released=False,
                )
                _enqueue_conversations_for_math_work(
                    vk,
                    conversation_ids=compute_retry_conversation_ids,
                )
                log.info(
                    "[MathUpdater] Requeued conversation(s) after retryable math failure "
                    "count=%d conversations=%s",
                    len(compute_retry_conversation_ids),
                    _format_processed_conversations_for_log(
                        conversation_ids=compute_retry_conversation_ids,
                        work_items=failed_claims,
                    ),
                )

            if non_retryable_failed_claims:
                try:
                    contract_newer_generation_ids = mark_non_retryable_work_items_batch(
                        primary_engine,
                        claims=non_retryable_failed_claims,
                        analysis_engine_epoch=settings.analysis_engine_epoch,
                        error_code="red_dwarf_contract_error",
                        error_message="red-dwarf success payload violated math-updater contract",
                    )
                except SQLAlchemyError as mark_error:
                    log_database_error(
                        logger=log,
                        message=(
                            "[MathUpdater] Failed to mark contract-failed analysis work "
                            "non-retryable; lease recovery will retry"
                        ),
                        error=mark_error,
                        context={"claims": _format_claims(non_retryable_failed_claims)},
                    )
                    contract_newer_generation_ids = []
                _enqueue_conversations_for_math_work(
                    vk,
                    conversation_ids=contract_newer_generation_ids,
                )
                log.info(
                    "[MathUpdater] Marked %d contract-failed conversation(s) "
                    "non-retryable newer_generation=%d: %s",
                    len(non_retryable_failed_claims),
                    len(contract_newer_generation_ids),
                    _format_processed_conversations_for_log(
                        conversation_ids=contract_newer_generation_ids,
                        work_items=non_retryable_failed_claims,
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
