from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TYPE_CHECKING

from agora_worker_shared.ai_description_work import (
    AiDescriptionQueueSchedules,
    ClaimedLineageDescriptionWorkItem,
    WorkStateSchedule,
    claim_ai_description_locale_work_items_batch,
    complete_non_processable_ai_description_work_batch,
    fetch_ai_description_queue_schedules,
    mark_non_retryable_ai_description_locale_work_item,
    process_ai_description_locale_work_item,
    retry_ai_description_locale_work_item,
)
from agora_worker_shared.description_input import DescriptionInputError
from agora_worker_shared.simulation_providers import (
    SimulatedRetryableError,
    emit_load_event,
    maybe_raise_simulated_claim_error,
)
from agora_worker_shared.valkey_client import (
    schedule_ai_description_conversation,
    schedule_description_translation_conversation,
)

if TYPE_CHECKING:
    from collections.abc import Callable

    import valkey as valkey_lib
    from sqlalchemy import Engine

    from agora_worker_shared.ai_description_work import ClaimedAiDescriptionLocaleWorkItem
    from agora_worker_shared.bedrock_label_summary import ParsedLabelSummaryOutput
    from agora_worker_shared.description_input import ConversationDescriptionInput
    from agora_worker_shared.description_translation import (
        DescriptionForTranslation,
        DescriptionTranslation,
    )
    from agora_worker_shared.retry_policy import RetryPolicy
    from agora_worker_shared.simulation_providers import SimulationRuntime

    DescriptionGenerator = Callable[[ConversationDescriptionInput], ParsedLabelSummaryOutput]
    DescriptionTranslator = Callable[
        [list[DescriptionForTranslation], list[str]],
        list[DescriptionTranslation],
    ]

log = logging.getLogger(__name__)


def _format_ids_for_log(conversation_ids: list[int]) -> str:
    limit = 20
    head = conversation_ids[:limit]
    suffix = "" if len(conversation_ids) <= limit else f", ... +{len(conversation_ids) - limit}"
    return ", ".join(str(conversation_id) for conversation_id in head) + suffix


def _claim_kind(claim: ClaimedAiDescriptionLocaleWorkItem) -> str:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        return "lineage-description"
    return "translation"


def _claim_target_log(claim: ClaimedAiDescriptionLocaleWorkItem) -> str:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        return f"lineageId={claim.lineage_id}"
    return f"descriptionId={claim.description_id}"


def _claim_target_metadata(claim: ClaimedAiDescriptionLocaleWorkItem) -> dict[str, int]:
    if isinstance(claim, ClaimedLineageDescriptionWorkItem):
        return {"lineageId": claim.lineage_id}
    return {"descriptionId": claim.description_id}


def _is_expected_simulated_retryable_error(error: BaseException) -> bool:
    return isinstance(error, SimulatedRetryableError)


def enqueue_ai_description_queue_schedules(
    vk: valkey_lib.Valkey,
    *,
    schedules: AiDescriptionQueueSchedules,
    log_prefix: str,
) -> None:
    ai_enqueued_count = _enqueue_schedules(
        vk,
        schedules=schedules.lineage_descriptions,
        schedule_fn=schedule_ai_description_conversation,
    )
    translation_enqueued_count = _enqueue_schedules(
        vk,
        schedules=schedules.translations,
        schedule_fn=schedule_description_translation_conversation,
    )
    if ai_enqueued_count or translation_enqueued_count:
        log.info(
            "%s Enqueued AI description schedules ai=%d translation=%d "
            "queues=analysis:ai-description:dirty,analysis:description-translation:dirty",
            log_prefix,
            ai_enqueued_count,
            translation_enqueued_count,
        )


def process_ai_description_conversation_ids(
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
    claim_lineage_descriptions: bool,
    claim_translations: bool,
    simulation_runtime: SimulationRuntime | None = None,
    retry_first_pass_once: bool = False,
    log_prefix: str,
) -> int:
    completed_conversation_ids = complete_non_processable_ai_description_work_batch(
        primary_engine,
        conversation_ids=conversation_ids,
        include_lineage_descriptions=claim_lineage_descriptions,
        include_translations=claim_translations,
        require_activated_view_snapshot=True,
    )
    if completed_conversation_ids:
        log.info(
            "%s Completed %d non-processable AI description conversation(s)",
            log_prefix,
            len(completed_conversation_ids),
        )

    completed_conversation_id_set = set(completed_conversation_ids)
    claimable_conversation_ids = [
        conversation_id
        for conversation_id in conversation_ids
        if conversation_id not in completed_conversation_id_set
    ]
    if not claimable_conversation_ids:
        return 0

    claim_started_at = time.perf_counter()
    claims = claim_ai_description_locale_work_items_batch(
        primary_engine,
        worker_id=worker_id,
        conversation_ids=claimable_conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        lease_ttl_seconds=lease_ttl_seconds,
        limit=min(claim_limit, max_workers),
        ai_description_epoch=ai_description_epoch,
        translation_enabled=description_translator is not None,
        claim_lineage_descriptions=claim_lineage_descriptions,
        claim_translations=claim_translations,
        require_activated_view_snapshot=True,
    )
    if not claims:
        log.info(
            "%s No claimable AI description locale work conversation_count=%d ids=%s claim_ms=%.1f",
            log_prefix,
            len(claimable_conversation_ids),
            _format_ids_for_log(claimable_conversation_ids),
            (time.perf_counter() - claim_started_at) * 1000,
        )
        return 0
    log.info(
        "%s Claimed %d AI description locale work item(s) claim_ms=%.1f conversationSlugIds=%s",
        log_prefix,
        len(claims),
        (time.perf_counter() - claim_started_at) * 1000,
        ",".join(sorted({claim.conversation_slug_id for claim in claims})),
    )

    def process_claim(claim: ClaimedAiDescriptionLocaleWorkItem) -> WorkStateSchedule:
        try:
            maybe_raise_simulated_claim_error(
                runtime=simulation_runtime,
                claim=claim,
                phase=log_prefix.strip("[]").lower(),
            )
            return process_ai_description_locale_work_item(
                primary_engine,
                claim=claim,
                generate_descriptions=description_generator,
                translate_descriptions=description_translator,
                require_activated_view_snapshot=True,
            )
        except Exception as error:
            if isinstance(error, DescriptionInputError):
                log.exception(
                    "%s Non-retryable %s failure conversationSlugId=%s locale=%s %s",
                    log_prefix,
                    _claim_kind(claim),
                    claim.conversation_slug_id,
                    claim.locale,
                    _claim_target_log(claim),
                )
                return mark_non_retryable_ai_description_locale_work_item(
                    primary_engine,
                    claim=claim,
                    ai_description_epoch=ai_description_epoch,
                    error_code="ai_description_non_retryable",
                    error_message=str(error),
                    require_activated_view_snapshot=True,
                )

            if _is_expected_simulated_retryable_error(error):
                log.warning(
                    "%s Expected simulated retryable %s failure conversationSlugId=%s "
                    "locale=%s %s: %s",
                    log_prefix,
                    _claim_kind(claim),
                    claim.conversation_slug_id,
                    claim.locale,
                    _claim_target_log(claim),
                    error,
                )
            else:
                log.exception(
                    "%s Retryable %s failure conversationSlugId=%s locale=%s %s",
                    log_prefix,
                    _claim_kind(claim),
                    claim.conversation_slug_id,
                    claim.locale,
                    _claim_target_log(claim),
                )
            should_retry_immediately = (
                retry_first_pass_once
                and claim.attempt_count == 1
                and isinstance(claim, ClaimedLineageDescriptionWorkItem)
            )
            return retry_ai_description_locale_work_item(
                primary_engine,
                claim=claim,
                retry_policy=retry_policy,
                error_code="ai_description_retryable",
                error_message=str(error),
                retry_immediately_without_fallback=should_retry_immediately,
                force_cooldown=retry_first_pass_once and not should_retry_immediately,
                require_activated_view_snapshot=True,
            )

    processing_started_at = time.perf_counter()
    with ThreadPoolExecutor(max_workers=min(max_workers, len(claims))) as executor:
        future_by_claim = {executor.submit(process_claim, claim): claim for claim in claims}
        for future in as_completed(future_by_claim):
            claim = future_by_claim[future]
            try:
                schedule = future.result()
                if schedule.retry_scheduled_at is not None:
                    emit_load_event(
                        phase=log_prefix.strip("[]").lower(),
                        action="retry-scheduled",
                        outcome="info",
                        conversation_slug_id=claim.conversation_slug_id,
                        metadata={
                            "conversationId": schedule.conversation_id,
                            "locale": claim.locale,
                            "attemptCount": claim.attempt_count,
                            "nextRunAt": schedule.retry_scheduled_at.isoformat(),
                            **_claim_target_metadata(claim),
                        },
                    )
            except Exception:
                log.exception(
                    "%s Failed to finalize retry state conversationSlugId=%s locale=%s %s",
                    log_prefix,
                    claim.conversation_slug_id,
                    claim.locale,
                    _claim_target_log(claim),
                )

    log.info(
        "%s Finished AI description locale work count=%d process_ms=%.1f conversationSlugIds=%s",
        log_prefix,
        len(claims),
        (time.perf_counter() - processing_started_at) * 1000,
        ",".join(sorted({claim.conversation_slug_id for claim in claims})),
    )
    enqueue_ai_description_queue_schedules(
        vk,
        schedules=fetch_ai_description_queue_schedules(
            primary_engine,
            conversation_ids=conversation_ids,
            require_activated_view_snapshot=True,
        ),
        log_prefix=log_prefix,
    )
    return len(claims)


def _enqueue_schedules(
    vk: valkey_lib.Valkey,
    *,
    schedules: list[WorkStateSchedule],
    schedule_fn: Callable[..., None],
) -> int:
    enqueued_count = 0
    for schedule in schedules:
        if schedule.next_run_at is None:
            continue
        schedule_fn(
            vk,
            conversation_id=schedule.conversation_id,
            due_at_ms=int(schedule.next_run_at.timestamp() * 1000),
        )
        enqueued_count += 1
    return enqueued_count
