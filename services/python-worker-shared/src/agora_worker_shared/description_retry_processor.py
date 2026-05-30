from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TYPE_CHECKING

from agora_worker_shared.ai_description_work import (
    DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE,
    ClaimedDescriptionTranslationWorkItem,
    ClaimedLineageDescriptionWorkItem,
    DescriptionTranslationBatchProcessResult,
    WorkStateSchedule,
    claim_ai_description_locale_work_items_batch,
    complete_non_processable_ai_description_work_batch,
    description_translation_work_claim_batches,
    mark_non_retryable_ai_description_locale_work_item,
    process_ai_description_locale_work_item,
    process_description_translation_work_items_batch,
    queue_ai_description_content_updated_events,
    retry_ai_description_locale_work_item,
)
from agora_worker_shared.description_input import DescriptionInputError
from agora_worker_shared.simulation_providers import (
    SimulatedRetryableError,
    emit_load_event,
    maybe_raise_simulated_claim_error,
)

if TYPE_CHECKING:
    from collections.abc import Callable

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


def process_ai_description_conversation_ids(
    *,
    primary_engine: Engine,
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

    claim_batch_limit = min(claim_limit, max_workers)
    if claim_translations and not claim_lineage_descriptions:
        claim_batch_limit = max(
            claim_limit,
            max_workers * DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE,
        )
    claim_started_at = time.perf_counter()
    claims = claim_ai_description_locale_work_items_batch(
        primary_engine,
        worker_id=worker_id,
        conversation_ids=claimable_conversation_ids,
        conversation_view_snapshot_ids=conversation_view_snapshot_ids,
        lease_ttl_seconds=lease_ttl_seconds,
        limit=claim_batch_limit,
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
        "%s Claimed %d AI description locale work item(s) claim_ms=%.1f "
        "claimScope=activated-latest-or-checkpoint conversationSlugIds=%s",
        log_prefix,
        len(claims),
        (time.perf_counter() - claim_started_at) * 1000,
        ",".join(sorted({claim.conversation_slug_id for claim in claims})),
    )

    def process_claim_error(
        *,
        claim: ClaimedAiDescriptionLocaleWorkItem,
        error: Exception,
    ) -> WorkStateSchedule:
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

    def process_lineage_claim(
        claim: ClaimedLineageDescriptionWorkItem,
    ) -> tuple[WorkStateSchedule, bool]:
        try:
            maybe_raise_simulated_claim_error(
                runtime=simulation_runtime,
                claim=claim,
                phase=log_prefix.strip("[]").lower(),
            )
            schedule = process_ai_description_locale_work_item(
                primary_engine,
                claim=claim,
                generate_descriptions=description_generator,
                translate_descriptions=description_translator,
                require_activated_view_snapshot=True,
            )
            return schedule, True
        except Exception as error:
            return process_claim_error(claim=claim, error=error), False

    def process_translation_claims(
        claims: list[ClaimedDescriptionTranslationWorkItem],
    ) -> tuple[
        list[tuple[ClaimedDescriptionTranslationWorkItem, WorkStateSchedule]],
        DescriptionTranslationBatchProcessResult,
    ]:
        processable_claims: list[ClaimedDescriptionTranslationWorkItem] = []
        retry_schedules: list[tuple[ClaimedDescriptionTranslationWorkItem, WorkStateSchedule]] = []
        for claim in claims:
            try:
                maybe_raise_simulated_claim_error(
                    runtime=simulation_runtime,
                    claim=claim,
                    phase=log_prefix.strip("[]").lower(),
                )
                processable_claims.append(claim)
            except Exception as error:
                retry_schedules.append(
                    (claim, process_claim_error(claim=claim, error=error))
                )

        if not processable_claims:
            return retry_schedules, DescriptionTranslationBatchProcessResult(
                schedules=[],
                translated_description_ids=[],
            )

        translator = description_translator
        if translator is None:
            unavailable_schedules: list[
                tuple[ClaimedDescriptionTranslationWorkItem, WorkStateSchedule]
            ] = []
            for claim in processable_claims:
                try:
                    msg = f"translation service unavailable for locale {claim.locale}"
                    raise DescriptionInputError(msg)
                except Exception as error:
                    unavailable_schedules.append(
                        (claim, process_claim_error(claim=claim, error=error))
                    )
            return unavailable_schedules, DescriptionTranslationBatchProcessResult(
                schedules=[],
                translated_description_ids=[],
            )

        try:
            result = process_description_translation_work_items_batch(
                primary_engine,
                claims=processable_claims,
                translate_descriptions=translator,
                require_activated_view_snapshot=True,
            )
        except Exception as error:
            retry_schedules.extend(
                (claim, process_claim_error(claim=claim, error=error))
                for claim in processable_claims
            )
            result = DescriptionTranslationBatchProcessResult(
                schedules=[],
                translated_description_ids=[],
            )
        return retry_schedules, result

    processing_started_at = time.perf_counter()
    lineage_ids_by_conversation_id: dict[int, set[int]] = {}
    translation_description_ids_by_conversation_locale: dict[tuple[int, str], set[int]] = {}
    lineage_claims = [
        claim for claim in claims if isinstance(claim, ClaimedLineageDescriptionWorkItem)
    ]
    translation_claims: list[ClaimedDescriptionTranslationWorkItem] = []
    for claim in claims:
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
                schedule, content_updated = future.result()
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
                elif content_updated:
                    lineage_ids_by_conversation_id.setdefault(
                        claim.conversation_id,
                        set(),
                    ).add(claim.lineage_id)
            except Exception:
                log.exception(
                    "%s Failed to finalize retry state conversationSlugId=%s locale=%s %s",
                    log_prefix,
                    claim.conversation_slug_id,
                    claim.locale,
                    _claim_target_log(claim),
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
                claims_for_locale = future_by_translation_claims[future]
                try:
                    retry_schedules, result = future.result()
                    for claim, schedule in retry_schedules:
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
                    if result.translated_description_ids:
                        first_claim = claims_for_locale[0]
                        translation_description_ids_by_conversation_locale.setdefault(
                            (first_claim.conversation_id, first_claim.locale),
                            set(),
                        ).update(result.translated_description_ids)
                except Exception:
                    log.exception(
                        "%s Failed to finalize translation batch retry state claims=%s",
                        log_prefix,
                        ", ".join(
                            f"{claim.conversation_slug_id}:{claim.locale}:{claim.description_id}"
                            for claim in claims_for_locale
                        ),
                    )

    if lineage_ids_by_conversation_id or translation_description_ids_by_conversation_locale:
        try:
            queue_ai_description_content_updated_events(
                primary_engine,
                lineage_ids_by_conversation_id={
                    conversation_id: sorted(lineage_ids)
                    for conversation_id, lineage_ids in lineage_ids_by_conversation_id.items()
                },
                translation_description_ids_by_conversation_locale={
                    context: sorted(description_ids)
                    for context, description_ids in (
                        translation_description_ids_by_conversation_locale.items()
                    )
                },
            )
        except Exception:
            log.exception("%s Failed to queue AI description content update events", log_prefix)

    log.info(
        "%s Finished AI description locale work count=%d process_ms=%.1f conversationSlugIds=%s",
        log_prefix,
        len(claims),
        (time.perf_counter() - processing_started_at) * 1000,
        ",".join(sorted({claim.conversation_slug_id for claim in claims})),
    )
    return len(claims)
