from __future__ import annotations

import logging
import signal
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TYPE_CHECKING, cast

import valkey as valkey_lib
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError

from math_updater.ai_description_work import (
    WorkStateSchedule as AiDescriptionWorkStateSchedule,
)
from math_updater.ai_description_work import (
    activate_pending_translation_expectations,
    claim_ai_description_locale_work_items_batch,
    fetch_ai_description_view_snapshot_ids_for_analysis_snapshots,
    fetch_due_ai_description_work_conversation_ids,
    mark_non_retryable_ai_description_locale_work_item,
    process_ai_description_locale_work_item,
    recover_expired_ai_description_work,
    retry_ai_description_locale_work_item,
)
from math_updater.analysis_compute import RedDwarfContractError, compute_analysis_bundle
from math_updater.bedrock_label_summary import (
    BedrockLabelSummaryConfig,
    generate_label_summaries_with_bedrock,
)
from math_updater.config import MathUpdaterConfigError, Settings, validate_ai_description_config
from math_updater.db import (
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
from math_updater.description_input import DescriptionInputError
from math_updater.description_translation import (
    DescriptionForTranslation,
    DescriptionTranslation,
    DescriptionTranslationError,
    generate_description_translations,
    initialize_google_translation_service,
)
from math_updater.input_snapshot import PreparedInputSnapshot, prepare_input_snapshots_batch
from math_updater.logging_utils import log_database_error
from math_updater.retry_policy import RetryPolicy
from math_updater.valkey_client import (
    ai_description_queue_depth,
    now_ms,
    pop_due_ai_description_conversations,
    pop_due_conversations,
    queue_depth,
    requeue_ai_description_conversations,
    requeue_conversations,
    schedule_ai_description_conversation,
    schedule_conversation,
)

if TYPE_CHECKING:
    from collections.abc import Callable, Sequence

    from sqlalchemy import Engine

    from math_updater.analysis_compute import ComputedAnalysisBundle
    from math_updater.bedrock_label_summary import ParsedLabelSummaryOutput
    from math_updater.db import ClaimedWorkItem, OpinionGroupConfigRecord
    from math_updater.description_input import ConversationDescriptionInput
    from math_updater.valkey_client import DueConversation

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


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("[MathUpdater] Received signal %d, shutting down", signum)
    _running = False


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


def _enqueue_schedules(
    vk: valkey_lib.Valkey,
    *,
    schedules: Sequence[WorkStateSchedule | AiDescriptionWorkStateSchedule],
    enqueue_ai_description: bool = False,
) -> None:
    enqueued_count = 0
    schedule_fn = (
        schedule_ai_description_conversation if enqueue_ai_description else schedule_conversation
    )
    for schedule in schedules:
        if schedule.next_run_at is None:
            continue
        schedule_fn(
            vk,
            conversation_id=schedule.conversation_id,
            due_at_ms=int(schedule.next_run_at.timestamp() * 1000),
        )
        enqueued_count += 1
    if enqueued_count:
        log.info("[MathUpdater] Enqueued %d scheduled conversation(s)", enqueued_count)


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
    enqueue_ai_description: bool = False,
) -> None:
    if conversation_ids:
        log.info(
            "[MathUpdater] Enqueueing %d conversation id(s) ids=%s due_at_ms=%d",
            len(conversation_ids),
            _format_ids(conversation_ids),
            due_at_ms,
        )
    schedule_fn = (
        schedule_ai_description_conversation if enqueue_ai_description else schedule_conversation
    )
    for conversation_id in conversation_ids:
        schedule_fn(
            vk,
            conversation_id=conversation_id,
            due_at_ms=due_at_ms,
        )


def _format_claim(claim: ClaimedWorkItem) -> str:
    return f"{claim.conversation_slug_id} (id={claim.conversation_id})"


def _format_claims(claims: list[ClaimedWorkItem]) -> str:
    return ", ".join(_format_claim(claim) for claim in claims)


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
    ai_description_epoch: int,
    retry_policy: RetryPolicy,
    description_generator: DescriptionGenerator,
    description_translator: DescriptionTranslator | None,
) -> int:
    ai_claims = claim_ai_description_locale_work_items_batch(
        primary_engine,
        worker_id=worker_id,
        conversation_ids=conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        lease_ttl_seconds=lease_ttl_seconds,
        limit=claim_limit,
        ai_description_epoch=ai_description_epoch,
        translation_enabled=description_translator is not None,
    )
    if not ai_claims:
        return 0

    schedules: list[WorkStateSchedule | AiDescriptionWorkStateSchedule] = []
    for claim in ai_claims:
        try:
            schedules.append(
                process_ai_description_locale_work_item(
                    primary_engine,
                    claim=claim,
                    generate_descriptions=description_generator,
                    translate_descriptions=description_translator,
                )
            )
        except Exception as error:
            if _is_non_retryable_ai_description_error(error):
                log.exception(
                    "[MathUpdater] Non-retryable AI description failure for "
                    "conversation_slug_id=%s locale=%s",
                    claim.conversation_slug_id,
                    claim.locale,
                )
                schedules.append(
                    mark_non_retryable_ai_description_locale_work_item(
                        primary_engine,
                        claim=claim,
                        ai_description_epoch=ai_description_epoch,
                        error_code="ai_description_non_retryable",
                        error_message=str(error),
                    )
                )
            else:
                log.exception(
                    "[MathUpdater] Retryable AI description failure for "
                    "conversation_slug_id=%s locale=%s",
                    claim.conversation_slug_id,
                    claim.locale,
                )
                schedules.append(
                    retry_ai_description_locale_work_item(
                        primary_engine,
                        claim=claim,
                        retry_policy=retry_policy,
                        error_code="ai_description_retryable",
                        error_message=str(error),
                    )
                )

    _enqueue_schedules(vk, schedules=schedules, enqueue_ai_description=True)
    return len(ai_claims)


def _process_ai_description_due_items(
    *,
    primary_engine: Engine,
    vk: valkey_lib.Valkey,
    worker_id: str,
    due_items: list[DueConversation],
    lease_ttl_seconds: int,
    claim_limit: int,
    ai_description_epoch: int,
    retry_policy: RetryPolicy,
    description_generator: DescriptionGenerator,
    description_translator: DescriptionTranslator | None,
) -> int:
    return _process_ai_description_conversation_ids(
        primary_engine=primary_engine,
        vk=vk,
        worker_id=worker_id,
        conversation_ids=[item.conversation_id for item in due_items],
        conversation_view_snapshot_ids=None,
        lease_ttl_seconds=lease_ttl_seconds,
        claim_limit=claim_limit,
        ai_description_epoch=ai_description_epoch,
        retry_policy=retry_policy,
        description_generator=description_generator,
        description_translator=description_translator,
    )


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
    ai_description_epoch: int,
    retry_policy: RetryPolicy,
    description_generator: DescriptionGenerator,
    description_translator: DescriptionTranslator | None,
) -> None:
    while True:
        processed_count = _process_ai_description_conversation_ids(
            primary_engine=primary_engine,
            vk=vk,
            worker_id=worker_id,
            conversation_ids=conversation_ids,
            conversation_view_snapshot_ids=conversation_view_snapshot_ids,
            lease_ttl_seconds=lease_ttl_seconds,
            claim_limit=claim_limit,
            ai_description_epoch=ai_description_epoch,
            retry_policy=retry_policy,
            description_generator=description_generator,
            description_translator=description_translator,
        )
        if processed_count == 0:
            break
        extend_postgres_leases(
            primary_engine,
            claims=analysis_claims,
            lease_ttl_seconds=lease_ttl_seconds,
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
    return isinstance(error, (DescriptionInputError, DescriptionTranslationError))


def _build_description_generator(settings: Settings) -> DescriptionGenerator | None:
    if not settings.aws_ai_label_summary_enable:
        return None

    config = BedrockLabelSummaryConfig(
        region=settings.aws_ai_label_summary_region,
        model_id=settings.aws_ai_label_summary_model_id,
        temperature=settings.aws_ai_label_summary_temperature,
        top_p=settings.aws_ai_label_summary_top_p,
        max_tokens=settings.aws_ai_label_summary_max_tokens,
        prompt=settings.aws_ai_label_summary_prompt,
    )

    def generate(
        conversation: ConversationDescriptionInput,
    ) -> ParsedLabelSummaryOutput:
        return generate_label_summaries_with_bedrock(
            conversation=conversation,
            config=config,
        )

    return generate


def _build_description_translator(settings: Settings) -> DescriptionTranslator | None:
    try:
        service = initialize_google_translation_service(
            google_cloud_service_account_aws_secret_key=(
                settings.google_cloud_service_account_aws_secret_key
            ),
            aws_secret_region=settings.aws_secret_region,
            google_application_credentials_path=settings.google_application_credentials,
            google_cloud_translation_location=settings.google_cloud_translation_location,
            google_cloud_translation_endpoint=settings.google_cloud_translation_endpoint,
        )
    except Exception:
        log.warning(
            "[MathUpdater] Failed to initialize Google Cloud Translation; continuing",
            exc_info=True,
        )
        return None

    if service is None:
        log.info("[MathUpdater] Google Cloud Translation not configured")
        return None

    log.info("[MathUpdater] Google Cloud Translation initialized")

    def translate(
        descriptions: list[DescriptionForTranslation],
        target_language_codes: list[str],
    ) -> list[DescriptionTranslation]:
        return generate_description_translations(
            service=service,
            descriptions=descriptions,
            target_language_codes=target_language_codes,
        )

    return translate


def main() -> None:
    settings = Settings()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    worker_id = f"math-updater:{uuid.uuid4()}"
    log.info(
        "[MathUpdater] Starting worker_id=%s pop_batch=%d claim_batch=%d compute=%d",
        worker_id,
        settings.valkey_pop_batch_size,
        settings.db_claim_batch_size,
        settings.max_compute_concurrency,
    )

    try:
        validate_ai_description_config(settings)
    except MathUpdaterConfigError as error:
        log.error("[MathUpdater] Configuration error: %s", error)
        raise SystemExit(1) from error

    vk = _connect_to_valkey_with_retry(settings)
    if vk is None:
        log.info("[MathUpdater] Shutdown complete")
        return

    primary_engine = create_engine(
        settings.connection_string.replace("postgres://", "postgresql+psycopg://"),
        pool_pre_ping=True,
        hide_parameters=True,
    )
    read_engine = create_engine(
        settings.read_dsn.replace("postgres://", "postgresql+psycopg://"),
        pool_pre_ping=True,
        hide_parameters=True,
    )
    log.info(
        "[MathUpdater] PostgreSQL connected "
        "(analysis_dirty_depth=%d ai_description_dirty_depth=%d)",
        queue_depth(vk),
        ai_description_queue_depth(vk),
    )
    description_generator = _build_description_generator(settings)
    if description_generator is None:
        log.info("[MathUpdater] AI description generation disabled")
        description_translator = None
    else:
        log.info("[MathUpdater] AI description generation enabled")
        description_translator = _build_description_translator(settings)
    retry_policy = RetryPolicy(
        burst_attempts=settings.retry_burst_attempts,
        burst_interval_seconds=settings.retry_burst_seconds,
        cooldown_seconds=settings.retry_cooldown_seconds,
    )

    last_reconcile = time.monotonic()
    last_recover = time.monotonic()

    while _running:
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
                if description_generator is not None:
                    ai_due_ids = fetch_due_ai_description_work_conversation_ids(
                        read_engine,
                        limit=1000,
                        ai_description_epoch=settings.ai_description_epoch,
                        translation_enabled=description_translator is not None,
                    )
                    if description_translator is not None:
                        ai_due_ids.extend(
                            activate_pending_translation_expectations(
                                primary_engine,
                                limit=1000,
                            )
                        )
                    _enqueue_conversation_ids(
                        vk,
                        conversation_ids=sorted(set(ai_due_ids)),
                        due_at_ms=current_ms,
                        enqueue_ai_description=True,
                    )
                if due_ids:
                    log.info("[MathUpdater] Reconciled %d due conversations", len(due_ids))
            except Exception:
                log.exception("[MathUpdater] Reconciliation failed")
            last_reconcile = monotonic_now

        if monotonic_now - last_recover >= settings.running_recovery_interval_seconds:
            try:
                recovered_ids = recover_expired_running_work(primary_engine)
                current_ms = now_ms()
                _enqueue_conversation_ids(
                    vk,
                    conversation_ids=sorted(set(recovered_ids)),
                    due_at_ms=current_ms,
                )
                if description_generator is not None:
                    recovered_ai_ids = recover_expired_ai_description_work(
                        primary_engine,
                        translation_enabled=description_translator is not None,
                    )
                    _enqueue_conversation_ids(
                        vk,
                        conversation_ids=sorted(set(recovered_ai_ids)),
                        due_at_ms=current_ms,
                        enqueue_ai_description=True,
                    )
                if recovered_ids:
                    log.info("[MathUpdater] Recovered %d expired running items", len(recovered_ids))
            except Exception:
                log.exception("[MathUpdater] Running-work recovery failed")
            last_recover = monotonic_now

        due_items, next_due_at_ms = pop_due_conversations(
            vk,
            count=settings.valkey_pop_batch_size,
        )
        if description_generator is None:
            ai_due_items = []
            next_ai_due_at_ms = None
        else:
            ai_due_items, next_ai_due_at_ms = pop_due_ai_description_conversations(
                vk,
                count=settings.valkey_pop_batch_size,
            )
        if not due_items and not ai_due_items:
            next_times = [
                due_at_ms
                for due_at_ms in (next_due_at_ms, next_ai_due_at_ms)
                if due_at_ms is not None
            ]
            if not next_times:
                time.sleep(settings.worker_poll_idle_sleep_seconds)
            else:
                sleep_ms = max(0, min(next_times) - now_ms())
                time.sleep(min(settings.worker_poll_idle_sleep_seconds, sleep_ms / 1000))
            continue

        if ai_due_items and description_generator is not None:
            ai_claimable_due_items = ai_due_items[: settings.db_claim_batch_size]
            ai_overflow_due_items = ai_due_items[settings.db_claim_batch_size :]
            requeue_ai_description_conversations(
                vk,
                conversations=ai_overflow_due_items,
            )
            _process_ai_description_due_items(
                primary_engine=primary_engine,
                vk=vk,
                worker_id=worker_id,
                due_items=ai_claimable_due_items,
                lease_ttl_seconds=settings.lease_ttl_seconds,
                claim_limit=settings.db_claim_batch_size,
                ai_description_epoch=settings.ai_description_epoch,
                retry_policy=retry_policy,
                description_generator=description_generator,
                description_translator=description_translator,
            )

        if not due_items:
            continue

        log.info(
            "[MathUpdater] Popped %d due conversation(s) ids=%s depth_after=%d",
            len(due_items),
            _format_ids([item.conversation_id for item in due_items]),
            queue_depth(vk),
        )

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

        claimed_input_batch = claim_work_items_and_fetch_inputs_batch(
            primary_engine,
            worker_id=worker_id,
            conversation_ids=[item.conversation_id for item in processable_due_items],
            lease_ttl_seconds=settings.lease_ttl_seconds,
            limit=settings.db_claim_batch_size,
            analysis_engine_epoch=settings.analysis_engine_epoch,
        )
        claims = claimed_input_batch.claims

        if not claims:
            log.info(
                "[MathUpdater] No claimable analysis work for due conversation(s) ids=%s",
                _format_ids([item.conversation_id for item in processable_due_items]),
            )
            continue

        log.info(
            "[MathUpdater] Claimed %d conversation(s): %s",
            len(claims),
            _format_claims(claims),
        )

        persisted_claims = [
            claim for claim in claims if claim.persisted_analysis_snapshot_id is not None
        ]
        if persisted_claims:
            if description_generator is not None:
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
                    _process_ai_description_first_pass(
                        primary_engine=primary_engine,
                        vk=vk,
                        worker_id=worker_id,
                        analysis_claims=persisted_claims,
                        conversation_ids=[claim.conversation_id for claim in persisted_claims],
                        conversation_view_snapshot_ids=persisted_view_snapshot_ids,
                        lease_ttl_seconds=settings.lease_ttl_seconds,
                        claim_limit=settings.db_claim_batch_size,
                        ai_description_epoch=settings.ai_description_epoch,
                        retry_policy=retry_policy,
                        description_generator=description_generator,
                        description_translator=description_translator,
                    )
                except Exception:
                    log.exception("[MathUpdater] Resumed AI description first pass failed")
                    _enqueue_conversation_ids(
                        vk,
                        conversation_ids=[claim.conversation_id for claim in persisted_claims],
                        due_at_ms=now_ms(),
                        enqueue_ai_description=True,
                    )
            try:
                completed_schedules = complete_computed_analysis_work_items_batch(
                    primary_engine,
                    claims=persisted_claims,
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
            "[MathUpdater] Prepared %d input snapshot(s): %s",
            len(stored_snapshots),
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
                            "conversation_slug_id=%s conversation_id=%d",
                            claim.conversation_slug_id,
                            claim.conversation_id,
                        )
                        non_retryable_failed_claims.append(claim)
                    except Exception:
                        log.exception(
                            "[MathUpdater] Compute failed for "
                            "conversation_slug_id=%s conversation_id=%d",
                            claim.conversation_slug_id,
                            claim.conversation_id,
                        )
                        failed_claims.append(claim)

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
                try:
                    completed_result = persist_computed_analysis_results_batch(
                        primary_engine,
                        claims=completed_claims,
                        stored_input_snapshots_by_conversation_id=stored_snapshots,
                        prepared_input_snapshots_by_conversation_id=snapshots_by_conversation_id,
                        bundles_by_conversation_id=bundles_by_conversation_id,
                        ai_generation_expected=description_generator is not None,
                        translation_expected=description_translator is not None,
                    )
                    did_persist_computed_results = True
                    if (
                        description_generator is not None
                        and completed_result.ai_description_due_conversation_ids
                    ):
                        try:
                            extend_postgres_leases(
                                primary_engine,
                                claims=completed_claims,
                                lease_ttl_seconds=settings.lease_ttl_seconds,
                            )
                            _process_ai_description_first_pass(
                                primary_engine=primary_engine,
                                vk=vk,
                                worker_id=worker_id,
                                analysis_claims=completed_claims,
                                conversation_ids=completed_result.ai_description_due_conversation_ids,
                                conversation_view_snapshot_ids=completed_result.ai_description_due_view_snapshot_ids,
                                lease_ttl_seconds=settings.lease_ttl_seconds,
                                claim_limit=settings.db_claim_batch_size,
                                ai_description_epoch=settings.ai_description_epoch,
                                retry_policy=retry_policy,
                                description_generator=description_generator,
                                description_translator=description_translator,
                            )
                            extend_postgres_leases(
                                primary_engine,
                                claims=completed_claims,
                                lease_ttl_seconds=settings.lease_ttl_seconds,
                            )
                        except Exception:
                            log.exception(
                                "[MathUpdater] AI description first pass failed after math persist"
                            )
                            _enqueue_conversation_ids(
                                vk,
                                conversation_ids=completed_result.ai_description_due_conversation_ids,
                                due_at_ms=now_ms(),
                                enqueue_ai_description=True,
                            )
                    completed_schedules = complete_computed_analysis_work_items_batch(
                        primary_engine,
                        claims=completed_claims,
                    )
                    _enqueue_schedules(vk, schedules=completed_schedules)
                    log.info(
                        "[MathUpdater] Completed %d non-empty conversation(s): %s",
                        len(completed_schedules),
                        _format_schedules(
                            schedules=completed_schedules,
                            claims=completed_claims,
                        ),
                    )
                except SQLAlchemyError as error:
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
                        for claim in completed_claims:
                            try:
                                isolated_result = persist_computed_analysis_results_batch(
                                    primary_engine,
                                    claims=[claim],
                                    stored_input_snapshots_by_conversation_id=stored_snapshots,
                                    prepared_input_snapshots_by_conversation_id=snapshots_by_conversation_id,
                                    bundles_by_conversation_id=bundles_by_conversation_id,
                                    ai_generation_expected=description_generator is not None,
                                    translation_expected=description_translator is not None,
                                )
                                if (
                                    description_generator is not None
                                    and isolated_result.ai_description_due_conversation_ids
                                ):
                                    try:
                                        extend_postgres_leases(
                                            primary_engine,
                                            claims=[claim],
                                            lease_ttl_seconds=settings.lease_ttl_seconds,
                                        )
                                        _process_ai_description_first_pass(
                                            primary_engine=primary_engine,
                                            vk=vk,
                                            worker_id=worker_id,
                                            analysis_claims=[claim],
                                            conversation_ids=isolated_result.ai_description_due_conversation_ids,
                                            conversation_view_snapshot_ids=isolated_result.ai_description_due_view_snapshot_ids,
                                            lease_ttl_seconds=settings.lease_ttl_seconds,
                                            claim_limit=settings.db_claim_batch_size,
                                            ai_description_epoch=settings.ai_description_epoch,
                                            retry_policy=retry_policy,
                                            description_generator=description_generator,
                                            description_translator=description_translator,
                                        )
                                        extend_postgres_leases(
                                            primary_engine,
                                            claims=[claim],
                                            lease_ttl_seconds=settings.lease_ttl_seconds,
                                        )
                                    except Exception:
                                        log.exception(
                                            "[MathUpdater] Isolated AI description first pass "
                                            "failed after math persist"
                                        )
                                        _enqueue_conversation_ids(
                                            vk,
                                            conversation_ids=isolated_result.ai_description_due_conversation_ids,
                                            due_at_ms=now_ms(),
                                            enqueue_ai_description=True,
                                        )
                                completed_schedules = complete_computed_analysis_work_items_batch(
                                    primary_engine,
                                    claims=[claim],
                                )
                                _enqueue_schedules(vk, schedules=completed_schedules)
                            except SQLAlchemyError as isolated_error:
                                log_database_error(
                                    logger=log,
                                    message="[MathUpdater] Failed isolated computed-result persist",
                                    error=isolated_error,
                                    context={"claim": _format_claim(claim)},
                                )
                                isolated_failed_claims.append(claim)

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

    primary_engine.dispose()
    read_engine.dispose()
    vk.close()
    log.info("[MathUpdater] Shutdown complete")


if __name__ == "__main__":
    main()
