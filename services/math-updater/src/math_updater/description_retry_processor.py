from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TYPE_CHECKING

from math_updater.ai_description_work import (
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
from math_updater.description_input import DescriptionInputError
from math_updater.simulation_providers import emit_load_event, maybe_raise_simulated_claim_error
from math_updater.valkey_client import (
    schedule_ai_description_conversation,
    schedule_description_translation_conversation,
)

if TYPE_CHECKING:
    from collections.abc import Callable

    import valkey as valkey_lib
    from sqlalchemy import Engine

    from math_updater.ai_description_work import ClaimedAiDescriptionLocaleWorkItem
    from math_updater.bedrock_label_summary import ParsedLabelSummaryOutput
    from math_updater.description_input import ConversationDescriptionInput
    from math_updater.description_translation import (
        DescriptionForTranslation,
        DescriptionTranslation,
    )
    from math_updater.retry_policy import RetryPolicy
    from math_updater.simulation_providers import SimulationRuntime

    DescriptionGenerator = Callable[[ConversationDescriptionInput], ParsedLabelSummaryOutput]
    DescriptionTranslator = Callable[
        [list[DescriptionForTranslation], list[str]],
        list[DescriptionTranslation],
    ]

log = logging.getLogger(__name__)


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
            "%s Enqueued AI description schedules ai=%d translation=%d",
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

    claims = claim_ai_description_locale_work_items_batch(
        primary_engine,
        worker_id=worker_id,
        conversation_ids=claimable_conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        lease_ttl_seconds=lease_ttl_seconds,
        limit=claim_limit,
        ai_description_epoch=ai_description_epoch,
        translation_enabled=description_translator is not None,
        claim_lineage_descriptions=claim_lineage_descriptions,
        claim_translations=claim_translations,
    )
    if not claims:
        return 0
    log.info("%s Claimed %d AI description locale work item(s)", log_prefix, len(claims))

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
            )
        except Exception as error:
            if isinstance(error, DescriptionInputError):
                log.exception(
                    "%s Non-retryable AI description failure conversation_slug_id=%s locale=%s",
                    log_prefix,
                    claim.conversation_slug_id,
                    claim.locale,
                )
                return mark_non_retryable_ai_description_locale_work_item(
                    primary_engine,
                    claim=claim,
                    ai_description_epoch=ai_description_epoch,
                    error_code="ai_description_non_retryable",
                    error_message=str(error),
                )

            log.exception(
                "%s Retryable AI description failure conversation_slug_id=%s locale=%s",
                log_prefix,
                claim.conversation_slug_id,
                claim.locale,
            )
            should_retry_immediately = (
                retry_first_pass_once
                and isinstance(claim, ClaimedLineageDescriptionWorkItem)
                and claim.attempt_count == 1
            )
            return retry_ai_description_locale_work_item(
                primary_engine,
                claim=claim,
                retry_policy=retry_policy,
                error_code="ai_description_retryable",
                error_message=str(error),
                retry_immediately_without_fallback=should_retry_immediately,
                force_cooldown=retry_first_pass_once and not should_retry_immediately,
            )

    with ThreadPoolExecutor(max_workers=min(max_workers, len(claims))) as executor:
        future_by_claim = {executor.submit(process_claim, claim): claim for claim in claims}
        for future in as_completed(future_by_claim):
            claim = future_by_claim[future]
            try:
                schedule = future.result()
                if schedule.next_run_at is not None:
                    emit_load_event(
                        phase=log_prefix.strip("[]").lower(),
                        action="retry-scheduled",
                        outcome="info",
                        conversation_slug_id=claim.conversation_slug_id,
                        metadata={
                            "conversationId": schedule.conversation_id,
                            "locale": claim.locale,
                            "attemptCount": claim.attempt_count,
                            "nextRunAt": schedule.next_run_at.isoformat(),
                        },
                    )
            except Exception:
                log.exception(
                    "%s Failed to finalize retry state conversation_slug_id=%s locale=%s",
                    log_prefix,
                    claim.conversation_slug_id,
                    claim.locale,
                )

    enqueue_ai_description_queue_schedules(
        vk,
        schedules=fetch_ai_description_queue_schedules(
            primary_engine,
            conversation_ids=conversation_ids,
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
