from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TYPE_CHECKING

from agora_analysis_worker_shared.ai_description_lease_heartbeat import (
    start_ai_description_lease_heartbeat,
)
from agora_analysis_worker_shared.ai_description_work import (
    AI_DESCRIPTION_NON_RETRYABLE_ERROR_CODE,
    AI_DESCRIPTION_RETRYABLE_ERROR_CODE,
    DESCRIPTION_TRANSLATION_WORK_BATCH_SIZE,
    AiDescriptionWorkResult,
    ClaimedDescriptionTranslationWorkItem,
    ClaimedLineageDescriptionWorkItem,
    DescriptionTranslationBatchProcessResult,
    claim_ai_description_locale_work_items_batch,
    complete_non_processable_ai_description_work_batch,
    description_translation_work_claim_batches,
    lineage_description_work_claim_batches,
    mark_non_retryable_ai_description_locale_work_item,
    process_description_translation_work_items_batch,
    process_lineage_description_work_items_batch,
    queue_ai_description_content_updated_events,
    retry_ai_description_locale_work_item,
)
from agora_analysis_worker_shared.description_input import (
    DescriptionInputError,
    DescriptionOutputError,
)
from agora_analysis_worker_shared.simulation_providers import (
    SimulatedRetryableError,
    emit_load_event,
    maybe_raise_simulated_claim_error,
)

if TYPE_CHECKING:
    from collections.abc import Callable

    from sqlalchemy import Engine

    from agora_analysis_worker_shared.ai_description_work import ClaimedAiDescriptionLocaleWorkItem
    from agora_analysis_worker_shared.bedrock_label_summary import ParsedLabelSummaryOutput
    from agora_analysis_worker_shared.description_input import ConversationDescriptionInput
    from agora_analysis_worker_shared.description_translation import (
        DescriptionForTranslation,
        DescriptionTranslation,
    )
    from agora_analysis_worker_shared.simulation_providers import SimulationRuntime

    DescriptionGenerator = Callable[[ConversationDescriptionInput], ParsedLabelSummaryOutput]
    DescriptionTranslator = Callable[
        [list[DescriptionForTranslation], list[str]],
        list[DescriptionTranslation],
    ]

log = logging.getLogger(__name__)

type LineageRetryResult = tuple[ClaimedLineageDescriptionWorkItem, AiDescriptionWorkResult]
type TranslationRetryResult = tuple[
    ClaimedDescriptionTranslationWorkItem,
    AiDescriptionWorkResult,
]


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
    heartbeat_interval_seconds: int,
    claim_limit: int,
    max_workers: int,
    ai_description_epoch: int,
    retry_cooldown_seconds: int,
    description_generator: DescriptionGenerator,
    description_translator: DescriptionTranslator | None,
    claim_lineage_descriptions: bool,
    claim_translations: bool,
    simulation_runtime: SimulationRuntime | None = None,
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

    claim_batch_limit = claim_limit
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
        retry_cooldown_seconds=retry_cooldown_seconds,
    )
    if not claims:
        log.debug(
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
    ) -> AiDescriptionWorkResult:
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
                error_code=AI_DESCRIPTION_NON_RETRYABLE_ERROR_CODE,
                error_message=str(error),
                require_activated_view_snapshot=True,
            )

        if _is_expected_simulated_retryable_error(error):
            log.warning(
                "%s Expected simulated retryable %s failure conversationSlugId=%s locale=%s %s: %s",
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
        return retry_ai_description_locale_work_item(
            primary_engine,
            claim=claim,
            error_code=AI_DESCRIPTION_RETRYABLE_ERROR_CODE,
            error_message=str(error),
            require_activated_view_snapshot=True,
        )

    def process_lineage_claims(
        claims: list[ClaimedLineageDescriptionWorkItem],
    ) -> tuple[list[LineageRetryResult], set[int]]:
        processable_claims: list[ClaimedLineageDescriptionWorkItem] = []
        retry_schedules: list[LineageRetryResult] = []
        for claim in claims:
            try:
                maybe_raise_simulated_claim_error(
                    runtime=simulation_runtime,
                    claim=claim,
                    phase=log_prefix.strip("[]").lower(),
                )
                processable_claims.append(claim)
            except Exception as error:
                retry_schedules.append((claim, process_claim_error(claim=claim, error=error)))

        if not processable_claims:
            return retry_schedules, set()
        provider_started_at = time.perf_counter()
        log.info(
            "%s Starting lineage provider batch claim_count=%d conversationSlugIds=%s "
            "lineageIds=%s",
            log_prefix,
            len(processable_claims),
            ",".join(sorted({claim.conversation_slug_id for claim in processable_claims})),
            ",".join(str(claim.lineage_id) for claim in processable_claims),
        )
        try:
            result = process_lineage_description_work_items_batch(
                primary_engine,
                claims=processable_claims,
                generate_descriptions=description_generator,
                require_activated_view_snapshot=True,
            )
            log.info(
                "%s Finished lineage provider batch claim_count=%d generated_count=%d "
                "missing_count=%d elapsed_ms=%.1f conversationSlugIds=%s lineageIds=%s",
                log_prefix,
                len(processable_claims),
                len(result.generated_lineage_ids),
                len(result.missing_lineage_ids),
                (time.perf_counter() - provider_started_at) * 1000,
                ",".join(sorted({claim.conversation_slug_id for claim in processable_claims})),
                ",".join(str(claim.lineage_id) for claim in processable_claims),
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
            return retry_schedules, set(result.generated_lineage_ids)
        except Exception as error:
            log.warning(
                "%s Failed lineage provider batch claim_count=%d elapsed_ms=%.1f "
                "conversationSlugIds=%s lineageIds=%s",
                log_prefix,
                len(processable_claims),
                (time.perf_counter() - provider_started_at) * 1000,
                ",".join(sorted({claim.conversation_slug_id for claim in processable_claims})),
                ",".join(str(claim.lineage_id) for claim in processable_claims),
            )
            return [
                (claim, process_claim_error(claim=claim, error=error))
                for claim in processable_claims
            ], set()

    def process_translation_claims(
        claims: list[ClaimedDescriptionTranslationWorkItem],
    ) -> tuple[
        list[TranslationRetryResult],
        DescriptionTranslationBatchProcessResult,
    ]:
        processable_claims: list[ClaimedDescriptionTranslationWorkItem] = []
        retry_schedules: list[TranslationRetryResult] = []
        for claim in claims:
            try:
                maybe_raise_simulated_claim_error(
                    runtime=simulation_runtime,
                    claim=claim,
                    phase=log_prefix.strip("[]").lower(),
                )
                processable_claims.append(claim)
            except Exception as error:
                retry_schedules.append((claim, process_claim_error(claim=claim, error=error)))

        if not processable_claims:
            return retry_schedules, DescriptionTranslationBatchProcessResult(
                schedules=[],
                translated_description_ids=[],
            )
        provider_started_at = time.perf_counter()
        log.info(
            "%s Starting translation provider batch claim_count=%d conversationSlugIds=%s "
            "descriptionIds=%s locales=%s",
            log_prefix,
            len(processable_claims),
            ",".join(sorted({claim.conversation_slug_id for claim in processable_claims})),
            ",".join(str(claim.description_id) for claim in processable_claims),
            ",".join(sorted({claim.locale for claim in processable_claims})),
        )

        translator = description_translator
        if translator is None:
            unavailable_schedules: list[TranslationRetryResult] = []
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
            log.info(
                "%s Finished translation provider batch claim_count=%d translated_count=%d "
                "missing_count=%d elapsed_ms=%.1f conversationSlugIds=%s descriptionIds=%s",
                log_prefix,
                len(processable_claims),
                len(result.translated_description_ids),
                len(result.missing_description_ids),
                (time.perf_counter() - provider_started_at) * 1000,
                ",".join(sorted({claim.conversation_slug_id for claim in processable_claims})),
                ",".join(str(claim.description_id) for claim in processable_claims),
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
            log.warning(
                "%s Failed translation provider batch claim_count=%d elapsed_ms=%.1f "
                "conversationSlugIds=%s descriptionIds=%s locales=%s",
                log_prefix,
                len(processable_claims),
                (time.perf_counter() - provider_started_at) * 1000,
                ",".join(sorted({claim.conversation_slug_id for claim in processable_claims})),
                ",".join(str(claim.description_id) for claim in processable_claims),
                ",".join(sorted({claim.locale for claim in processable_claims})),
            )
            retry_schedules.extend(
                (claim, process_claim_error(claim=claim, error=error))
                for claim in processable_claims
            )
            result = DescriptionTranslationBatchProcessResult(
                schedules=[],
                translated_description_ids=[],
            )
        return retry_schedules, result

    stop_heartbeat = start_ai_description_lease_heartbeat(
        primary_engine=primary_engine,
        claims=claims,
        lease_ttl_seconds=lease_ttl_seconds,
        interval_seconds=heartbeat_interval_seconds,
        log_prefix=log_prefix,
        thread_name=f"{log_prefix.strip('[]').lower()}-ai-description-lease-heartbeat",
    )
    try:
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
                    retry_schedules, generated_lineage_ids = future.result()
                    for claim, schedule in retry_schedules:
                        if schedule.retry_released_at is not None:
                            emit_load_event(
                                phase=log_prefix.strip("[]").lower(),
                                action="retry-released",
                                outcome="info",
                                conversation_slug_id=claim.conversation_slug_id,
                                metadata={
                                    "conversationId": schedule.conversation_id,
                                    "locale": claim.locale,
                                    "attemptCount": claim.attempt_count,
                                    "retryReleasedAt": schedule.retry_released_at.isoformat(),
                                    **_claim_target_metadata(claim),
                                },
                            )
                    for claim in claims_for_candidate:
                        if claim.lineage_id in generated_lineage_ids:
                            lineage_ids_by_conversation_id.setdefault(
                                claim.conversation_id,
                                set(),
                            ).add(claim.lineage_id)
                except Exception:
                    log.exception(
                        "%s Failed to finalize retry state claims=%s",
                        log_prefix,
                        ", ".join(
                            f"{claim.conversation_slug_id}:{claim.locale}:{claim.lineage_id}"
                            for claim in claims_for_candidate
                        ),
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
                            if schedule.retry_released_at is not None:
                                emit_load_event(
                                    phase=log_prefix.strip("[]").lower(),
                                    action="retry-released",
                                    outcome="info",
                                    conversation_slug_id=claim.conversation_slug_id,
                                    metadata={
                                        "conversationId": schedule.conversation_id,
                                        "locale": claim.locale,
                                        "attemptCount": claim.attempt_count,
                                        "retryReleasedAt": schedule.retry_released_at.isoformat(),
                                        **_claim_target_metadata(claim),
                                    },
                                )
                        if result.translated_description_ids:
                            translated_ids = set(result.translated_description_ids)
                            for claim in claims_for_locale:
                                if claim.description_id not in translated_ids:
                                    continue
                                translation_description_ids_by_conversation_locale.setdefault(
                                    (claim.conversation_id, claim.locale),
                                    set(),
                                ).add(claim.description_id)
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
                log.exception(
                    "%s Failed to queue AI description content update events",
                    log_prefix,
                )

        log.info(
            "%s Finished AI description locale work count=%d process_ms=%.1f "
            "conversationSlugIds=%s",
            log_prefix,
            len(claims),
            (time.perf_counter() - processing_started_at) * 1000,
            ",".join(sorted({claim.conversation_slug_id for claim in claims})),
        )
        return len(claims)
    finally:
        stop_heartbeat()
