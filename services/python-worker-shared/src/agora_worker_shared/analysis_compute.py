from __future__ import annotations

import json
import math
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, replace
from typing import TYPE_CHECKING, Protocol, TypeGuard, cast

import numpy as np
import pandas as pd
from reddwarf.implementations.polis import run_pipeline

from agora_worker_shared.generated_models import (
    AnalysisInsufficientDataReasonEnum,
    AnalysisResultOutcomeEnum,
    OpinionGroupCandidateHiddenReasonEnum,
    VoteEnumSimple,
)

if TYPE_CHECKING:
    from agora_worker_shared.db import (
        OpinionGroupConfigRecord,
        OpinionGroupSpecRecord,
        OpinionGroupVariantRecord,
    )
    from agora_worker_shared.input_snapshot import PreparedInputSnapshot, SnapshotVote

JsonValue = None | bool | int | float | str | list["JsonValue"] | dict[str, "JsonValue"]
JsonObject = dict[str, JsonValue]
type _RepresentativeOpinionMatchKey = frozenset[tuple[int, VoteEnumSimple]]


@dataclass(frozen=True)
class SnapshotOpinionMetrics:
    local_opinion_index: int
    num_agrees: int
    num_disagrees: int
    num_passes: int
    routing_priority: float | None


@dataclass(frozen=True)
class CandidateOpinionMetrics:
    local_opinion_index: int
    group_aware_consensus_agree: float | None
    group_aware_consensus_disagree: float | None
    divisiveness: float | None
    majority_type: VoteEnumSimple | None
    majority_probability_success: float | None
    agreement_rank: int | None
    disagreement_rank: int | None
    divisiveness_rank: int | None


@dataclass(frozen=True)
class ComputedRepresentativeOpinion:
    local_opinion_index: int
    agreement_type: VoteEnumSimple
    probability_agreement: float
    num_agreement: int
    raw_repness: JsonObject


@dataclass(frozen=True)
class ComputedGroupOpinionStats:
    local_opinion_index: int
    num_agrees: int
    num_disagrees: int
    num_passes: int
    representative_opinion: ComputedRepresentativeOpinion | None


@dataclass(frozen=True)
class ComputedOpinionGroup:
    key: str
    external_id: int
    local_participant_indexes: list[int]
    representative_opinions: list[ComputedRepresentativeOpinion]
    opinion_stats: list[ComputedGroupOpinionStats]


@dataclass(frozen=True)
class CandidateAssessment:
    silhouette_score: float | None
    coefficient_of_variation: float | None
    balance_score: float | None
    selection_score: float | None
    hidden_reason: OpinionGroupCandidateHiddenReasonEnum | None


@dataclass(frozen=True)
class ComputedOpinionGroupCandidate:
    opinion_group_variant_id: int
    group_count: int
    outcome: AnalysisResultOutcomeEnum
    outcome_reason: AnalysisInsufficientDataReasonEnum | None
    raw_output: JsonValue
    groups: list[ComputedOpinionGroup]
    assessment: CandidateAssessment | None
    opinion_metrics: list[CandidateOpinionMetrics]


@dataclass(frozen=True)
class ComputedAnalysisBundle:
    conversation_id: int
    data_generation: int
    outcome: AnalysisResultOutcomeEnum
    outcome_reason: AnalysisInsufficientDataReasonEnum | None
    candidates: list[ComputedOpinionGroupCandidate]
    snapshot_opinions: list[SnapshotOpinionMetrics]


class RedDwarfContractError(RuntimeError):
    pass


class _HiddenCandidateOutputError(RuntimeError):
    def __init__(
        self,
        *,
        hidden_reason: OpinionGroupCandidateHiddenReasonEnum,
        detail_code: str,
        detail: JsonObject,
    ) -> None:
        super().__init__(detail_code)
        self.hidden_reason = hidden_reason
        self.detail_code = detail_code
        self.detail = detail


_CONTRACT_HIDDEN_REASONS = {
    OpinionGroupCandidateHiddenReasonEnum.duplicate_representative_opinions,
    OpinionGroupCandidateHiddenReasonEnum.missing_representative_opinions,
    OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output,
}


class RedDwarfRunner(Protocol):
    def __call__(
        self,
        *,
        votes: list[dict[str, int]],
        min_user_vote_threshold: int,
        max_group_count: int,
        force_group_count: int | None = None,
        candidate_group_counts: list[int] | None = None,
    ) -> object: ...


def compute_analysis_bundle(
    *,
    snapshot: PreparedInputSnapshot,
    config: OpinionGroupConfigRecord,
    run_red_dwarf_pipeline: RedDwarfRunner | None = None,
) -> ComputedAnalysisBundle:
    if not config.variants:
        msg = f"missing opinion-group variants for spec {config.spec.id}"
        raise ValueError(msg)

    red_dwarf_runner = run_red_dwarf_pipeline or _run_red_dwarf_pipeline
    candidates = _compute_candidates(
        snapshot=snapshot,
        spec=config.spec,
        variants=config.variants,
        run_red_dwarf_pipeline=red_dwarf_runner,
    )
    candidates_with_assessments = [
        _candidate_with_assessment(candidate) for candidate in candidates
    ]
    visible_successful_candidates = [
        candidate
        for candidate in candidates_with_assessments
        if _is_visible_success_candidate(candidate)
    ]
    if not visible_successful_candidates and _has_contract_hidden_candidates(
        candidates_with_assessments
    ):
        msg = _all_candidates_hidden_contract_error_message(candidates_with_assessments)
        raise RedDwarfContractError(msg)

    successful_candidates = [
        candidate
        for candidate in candidates_with_assessments
        if candidate.outcome == AnalysisResultOutcomeEnum.success
    ]
    routing_priority_candidate = _routing_priority_candidate(visible_successful_candidates) or next(
        iter(visible_successful_candidates),
        None,
    )

    if successful_candidates:
        outcome = AnalysisResultOutcomeEnum.success
        outcome_reason = None
    else:
        outcome = AnalysisResultOutcomeEnum.insufficient_data
        outcome_reason = _first_insufficient_reason(candidates_with_assessments)

    return ComputedAnalysisBundle(
        conversation_id=snapshot.conversation_id,
        data_generation=snapshot.data_generation,
        outcome=outcome,
        outcome_reason=outcome_reason,
        candidates=candidates_with_assessments,
        snapshot_opinions=_compute_snapshot_opinion_metrics(
            snapshot=snapshot,
            routing_priority_candidate=routing_priority_candidate,
        ),
    )


def _compute_candidates(
    *,
    snapshot: PreparedInputSnapshot,
    spec: OpinionGroupSpecRecord,
    variants: list[OpinionGroupVariantRecord],
    run_red_dwarf_pipeline: RedDwarfRunner,
) -> list[ComputedOpinionGroupCandidate]:
    prechecked_candidates: dict[int, ComputedOpinionGroupCandidate] = {}
    runnable_variants: list[OpinionGroupVariantRecord] = []
    for variant in variants:
        insufficient_reason = _get_insufficient_data_reason(
            snapshot=snapshot,
            min_clusterable_participants=spec.min_clusterable_participants,
            min_votes_per_participant=spec.min_votes_per_participant,
            group_count=variant.group_count,
        )
        if insufficient_reason is None:
            runnable_variants.append(variant)
            continue
        prechecked_candidates[variant.id] = _insufficient_candidate(
            variant=variant,
            reason=insufficient_reason,
        )

    if not runnable_variants:
        return [prechecked_candidates[variant.id] for variant in variants]

    red_dwarf_result = _run_red_dwarf_for_variants(
        snapshot=snapshot,
        spec=spec,
        variants=runnable_variants,
        run_red_dwarf_pipeline=run_red_dwarf_pipeline,
    )
    computed_by_variant_id = {
        **prechecked_candidates,
        **_computed_candidates_from_red_dwarf_result(
            variants=runnable_variants,
            red_dwarf_result=red_dwarf_result,
        ),
    }
    return [computed_by_variant_id[variant.id] for variant in variants]


def _run_red_dwarf_for_variants(
    *,
    snapshot: PreparedInputSnapshot,
    spec: OpinionGroupSpecRecord,
    variants: list[OpinionGroupVariantRecord],
    run_red_dwarf_pipeline: RedDwarfRunner,
) -> object:
    candidate_group_counts = sorted({variant.group_count for variant in variants})
    if len(candidate_group_counts) == 1:
        return run_red_dwarf_pipeline(
            votes=_to_red_dwarf_votes(snapshot.votes),
            min_user_vote_threshold=spec.min_votes_per_participant,
            max_group_count=spec.max_group_count,
            force_group_count=candidate_group_counts[0],
        )
    result = run_red_dwarf_pipeline(
        votes=_to_red_dwarf_votes(snapshot.votes),
        min_user_vote_threshold=spec.min_votes_per_participant,
        max_group_count=spec.max_group_count,
        candidate_group_counts=candidate_group_counts,
    )
    return result


def _computed_candidates_from_red_dwarf_result(
    *,
    variants: list[OpinionGroupVariantRecord],
    red_dwarf_result: object,
) -> dict[int, ComputedOpinionGroupCandidate]:
    outcome = _get_red_dwarf_outcome(red_dwarf_result)
    if outcome == AnalysisResultOutcomeEnum.insufficient_data.value:
        reason, raw_reason = _get_red_dwarf_insufficient_reason(red_dwarf_result)
        return {
            variant.id: _insufficient_candidate(
                variant=variant,
                reason=reason,
                raw_reason=raw_reason,
            )
            for variant in variants
        }
    if outcome != AnalysisResultOutcomeEnum.success.value:
        msg = f"unknown red-dwarf outcome {outcome}"
        raise RedDwarfContractError(msg)

    result = _get_attr(red_dwarf_result, "result")
    if len({variant.group_count for variant in variants}) == 1:
        return {
            variant.id: _success_or_hidden_candidate_from_red_dwarf_result(
                variant=variant,
                result=result,
            )
            for variant in variants
        }

    candidate_results = _get_attr(result, "candidates")
    if not _is_object_sequence(candidate_results):
        msg = "red-dwarf candidates result missing candidates sequence"
        raise RedDwarfContractError(msg)

    result_by_group_count: dict[int, object] = {}
    duplicate_group_counts: set[int] = set()
    for candidate_result in candidate_results:
        try:
            group_count = _optional_int(_get_attr(candidate_result, "group_count"))
        except RedDwarfContractError:
            continue
        if group_count is None:
            continue
        if group_count in result_by_group_count:
            duplicate_group_counts.add(group_count)
            continue
        result_by_group_count[group_count] = candidate_result

    computed: dict[int, ComputedOpinionGroupCandidate] = {}
    for variant in variants:
        if variant.group_count in duplicate_group_counts:
            computed[variant.id] = _hidden_success_candidate(
                variant=variant,
                hidden_reason=OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output,
                detail_code="duplicate_candidate_group_count",
                detail={"group_count": variant.group_count},
            )
            continue
        candidate_result = result_by_group_count.get(variant.group_count)
        if candidate_result is None:
            computed[variant.id] = _hidden_success_candidate(
                variant=variant,
                hidden_reason=OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output,
                detail_code="candidate_not_returned",
                detail={"group_count": variant.group_count},
            )
            continue
        computed[variant.id] = _candidate_from_red_dwarf_candidate_result(
            variant=variant,
            candidate_result=candidate_result,
        )
    return computed


def _candidate_from_red_dwarf_candidate_result(
    *,
    variant: OpinionGroupVariantRecord,
    candidate_result: object,
) -> ComputedOpinionGroupCandidate:
    try:
        outcome = _get_red_dwarf_outcome(candidate_result)
    except RedDwarfContractError as error:
        return _hidden_success_candidate(
            variant=variant,
            hidden_reason=OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output,
            detail_code="missing_candidate_outcome",
            detail={"message": str(error), "group_count": variant.group_count},
        )
    if outcome == AnalysisResultOutcomeEnum.insufficient_data.value:
        try:
            reason, raw_reason = _get_red_dwarf_insufficient_reason(candidate_result)
        except RedDwarfContractError as error:
            return _hidden_success_candidate(
                variant=variant,
                hidden_reason=OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output,
                detail_code="invalid_insufficient_data_reason",
                detail={"message": str(error), "group_count": variant.group_count},
            )
        return _insufficient_candidate(
            variant=variant,
            reason=reason,
            raw_reason=raw_reason,
        )
    if outcome != AnalysisResultOutcomeEnum.success.value:
        return _hidden_success_candidate(
            variant=variant,
            hidden_reason=OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output,
            detail_code="unknown_candidate_outcome",
            detail={"outcome": outcome, "group_count": variant.group_count},
        )
    return _success_or_hidden_candidate_from_red_dwarf_result(
        variant=variant,
        result=_get_attr(candidate_result, "result"),
    )


def _success_or_hidden_candidate_from_red_dwarf_result(
    *,
    variant: OpinionGroupVariantRecord,
    result: object,
) -> ComputedOpinionGroupCandidate:
    try:
        return _success_candidate_from_red_dwarf_result(
            variant=variant,
            result=result,
        )
    except _HiddenCandidateOutputError as error:
        return _hidden_success_candidate(
            variant=variant,
            hidden_reason=error.hidden_reason,
            detail_code=error.detail_code,
            detail=error.detail,
        )
    except RedDwarfContractError as error:
        return _hidden_success_candidate(
            variant=variant,
            hidden_reason=OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output,
            detail_code="invalid_success_payload",
            detail={"message": str(error), "group_count": variant.group_count},
        )


def _success_candidate_from_red_dwarf_result(
    *,
    variant: OpinionGroupVariantRecord,
    result: object,
) -> ComputedOpinionGroupCandidate:
    participants_df = _get_dataframe_attr(result, "participants_df")
    statements_df = _get_dataframe_attr(result, "statements_df")
    group_comment_stats = _get_dataframe_attr(result, "group_comment_stats")
    repness = _get_dict_attr(result, "repness")
    consensus = _get_dict_attr(result, "consensus")

    groups = _build_groups(
        participants_df=participants_df,
        group_comment_stats=group_comment_stats,
        repness=repness,
    )
    silhouette = _calculate_silhouette_score(participants_df)
    duplicate_representative_opinion_detail = _duplicate_representative_opinion_detail(groups)
    coefficient_of_variation = _calculate_coefficient_of_variation(groups)
    balance_score = _calculate_balance_score(coefficient_of_variation)
    raw_output: JsonObject = {
        "schema_version": 1,
        "group_count": variant.group_count,
        "silhouette_score": silhouette,
        "participants_df": _dataframe_records(participants_df),
        "statements_df": _dataframe_records(statements_df),
        "group_comment_stats": _dataframe_records(group_comment_stats),
        "repness": _to_json_value(repness),
        "consensus": _to_json_value(consensus),
    }
    if duplicate_representative_opinion_detail is not None:
        raw_output["hidden_reason"] = (
            OpinionGroupCandidateHiddenReasonEnum.duplicate_representative_opinions.value
        )
        raw_output["detail_code"] = "duplicate_representative_opinions"
        raw_output["detail"] = duplicate_representative_opinion_detail
    return ComputedOpinionGroupCandidate(
        opinion_group_variant_id=variant.id,
        group_count=variant.group_count,
        outcome=AnalysisResultOutcomeEnum.success,
        outcome_reason=None,
        raw_output=raw_output,
        groups=groups,
        assessment=None
        if duplicate_representative_opinion_detail is None
        else CandidateAssessment(
            silhouette_score=silhouette,
            coefficient_of_variation=coefficient_of_variation,
            balance_score=balance_score,
            selection_score=None,
            hidden_reason=OpinionGroupCandidateHiddenReasonEnum.duplicate_representative_opinions,
        ),
        opinion_metrics=_candidate_opinion_metrics(
            statements_df=statements_df,
            consensus=consensus,
        ),
    )


def _insufficient_candidate(
    *,
    variant: OpinionGroupVariantRecord,
    reason: AnalysisInsufficientDataReasonEnum,
    raw_reason: str | None = None,
) -> ComputedOpinionGroupCandidate:
    raw_output: JsonObject = {"reason": reason.value, "group_count": variant.group_count}
    if raw_reason is not None and raw_reason != reason.value:
        raw_output["raw_reason"] = raw_reason
    return ComputedOpinionGroupCandidate(
        opinion_group_variant_id=variant.id,
        group_count=variant.group_count,
        outcome=AnalysisResultOutcomeEnum.insufficient_data,
        outcome_reason=reason,
        raw_output=raw_output,
        groups=[],
        assessment=None,
        opinion_metrics=[],
    )


def _hidden_success_candidate(
    *,
    variant: OpinionGroupVariantRecord,
    hidden_reason: OpinionGroupCandidateHiddenReasonEnum,
    detail_code: str,
    detail: JsonObject,
) -> ComputedOpinionGroupCandidate:
    return ComputedOpinionGroupCandidate(
        opinion_group_variant_id=variant.id,
        group_count=variant.group_count,
        outcome=AnalysisResultOutcomeEnum.success,
        outcome_reason=None,
        raw_output={
            "schema_version": 1,
            "group_count": variant.group_count,
            "hidden_reason": hidden_reason.value,
            "detail_code": detail_code,
            "detail": detail,
        },
        groups=[],
        assessment=CandidateAssessment(
            silhouette_score=None,
            coefficient_of_variation=None,
            balance_score=None,
            selection_score=None,
            hidden_reason=hidden_reason,
        ),
        opinion_metrics=[],
    )


def _run_red_dwarf_pipeline(
    *,
    votes: list[dict[str, int]],
    min_user_vote_threshold: int,
    max_group_count: int,
    force_group_count: int | None = None,
    candidate_group_counts: list[int] | None = None,
) -> object:
    return run_pipeline(
        votes=votes,
        min_user_vote_threshold=min_user_vote_threshold,
        max_group_count=max_group_count,
        force_group_count=force_group_count,
        candidate_group_counts=candidate_group_counts,
        random_state=0,
    )


def _get_red_dwarf_outcome(value: object) -> str:
    outcome = _get_attr(value, "outcome")
    if isinstance(outcome, str):
        return outcome
    outcome_value = _get_attr(outcome, "value")
    if isinstance(outcome_value, str):
        return outcome_value
    msg = "red-dwarf outcome is not a string"
    raise RedDwarfContractError(msg)


def _get_red_dwarf_insufficient_reason(
    value: object,
) -> tuple[AnalysisInsufficientDataReasonEnum, str | None]:
    reason = _get_attr(value, "reason")
    reason_value = reason if isinstance(reason, str) else _get_attr(reason, "value")
    if not isinstance(reason_value, str):
        msg = "red-dwarf insufficient-data reason is not a string"
        raise RedDwarfContractError(msg)
    try:
        return AnalysisInsufficientDataReasonEnum(reason_value), reason_value
    except ValueError:
        return AnalysisInsufficientDataReasonEnum.other, reason_value


def _to_red_dwarf_votes(votes: list[SnapshotVote]) -> list[dict[str, int]]:
    return [
        {
            "participant_id": vote.local_participant_index,
            "statement_id": vote.local_opinion_index,
            "vote": vote.vote,
        }
        for vote in votes
    ]


def _get_insufficient_data_reason(
    *,
    snapshot: PreparedInputSnapshot,
    min_clusterable_participants: int,
    min_votes_per_participant: int,
    group_count: int,
) -> AnalysisInsufficientDataReasonEnum | None:
    if not snapshot.votes:
        return AnalysisInsufficientDataReasonEnum.empty_vote_matrix

    vote_count_by_participant: dict[int, int] = {}
    vote_by_participant_opinion: dict[tuple[int, int], int] = {}
    for vote in snapshot.votes:
        vote_count_by_participant[vote.local_participant_index] = (
            vote_count_by_participant.get(vote.local_participant_index, 0) + 1
        )
        vote_by_participant_opinion[(vote.local_participant_index, vote.local_opinion_index)] = (
            vote.vote
        )

    clusterable_participant_indexes = sorted(
        participant_index
        for participant_index, vote_count in vote_count_by_participant.items()
        if vote_count >= min_votes_per_participant
    )
    if len(clusterable_participant_indexes) < max(2, min_clusterable_participants):
        return AnalysisInsufficientDataReasonEnum.not_enough_clusterable_participants
    if len(clusterable_participant_indexes) < group_count:
        return AnalysisInsufficientDataReasonEnum.not_enough_samples_for_group_count

    unique_vote_vectors = {
        tuple(
            vote_by_participant_opinion.get(
                (participant_index, opinion.local_opinion_index),
                0,
            )
            for opinion in snapshot.opinions
        )
        for participant_index in clusterable_participant_indexes
    }
    if len(unique_vote_vectors) < 2:
        return AnalysisInsufficientDataReasonEnum.not_enough_unique_points

    return None


def _get_attr(value: object, attr_name: str) -> object:
    if not hasattr(value, attr_name):
        msg = f"red-dwarf result missing {attr_name}"
        raise RedDwarfContractError(msg)
    attr_value: object = getattr(value, attr_name)
    return attr_value


def _get_dataframe_attr(value: object, attr_name: str) -> pd.DataFrame:
    attr_value = _get_attr(value, attr_name)
    if not isinstance(attr_value, pd.DataFrame):
        msg = f"red-dwarf result {attr_name} is not a DataFrame"
        raise RedDwarfContractError(msg)
    return attr_value


def _get_dict_attr(value: object, attr_name: str) -> dict[object, object]:
    attr_value = _get_attr(value, attr_name)
    if not isinstance(attr_value, dict):
        msg = f"red-dwarf result {attr_name} is not a dict"
        raise RedDwarfContractError(msg)
    return cast("dict[object, object]", attr_value)


def _is_object_sequence(value: object) -> TypeGuard[Sequence[object]]:
    return isinstance(value, Sequence) and not isinstance(value, str | bytes | bytearray)


def _dataframe_records(dataframe: pd.DataFrame) -> JsonValue:
    records_json = dataframe.reset_index().to_json(orient="records")
    return _to_json_value(_json_loads(records_json))


def _to_json_value(value: object) -> JsonValue:
    if value is None or isinstance(value, bool | int | str):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, np.generic):
        return _to_json_value(f"{value}")
    if isinstance(value, pd.DataFrame):
        return _dataframe_records(value)
    if isinstance(value, pd.Series):
        return _to_json_value(_json_loads(value.to_json()))
    if isinstance(value, Mapping):
        converted: dict[str, JsonValue] = {}
        for key, item in cast("Mapping[object, object]", value).items():
            converted[str(key)] = _to_json_value(item)
        return converted
    if isinstance(value, Sequence) and not isinstance(value, str | bytes | bytearray):
        converted_list: list[JsonValue] = []
        for item in cast("Sequence[object]", value):
            converted_list.append(_to_json_value(item))
        return converted_list
    return str(value)


def _to_json_object(value: Mapping[str, object]) -> JsonObject:
    converted: JsonObject = {}
    for key, item in value.items():
        converted[str(key)] = _to_json_value(item)
    return converted


def _build_groups(
    *,
    participants_df: pd.DataFrame,
    group_comment_stats: pd.DataFrame,
    repness: dict[object, object],
) -> list[ComputedOpinionGroup]:
    participants_by_external_id: dict[int, list[int]] = {}
    for record in _dataframe_record_dicts(participants_df):
        cluster_id = _optional_int(record.get("cluster_id"))
        participant_id = _optional_int(record.get("participant_id"))
        if cluster_id is None or participant_id is None:
            continue
        participants_by_external_id.setdefault(cluster_id, []).append(participant_id)

    groups: list[ComputedOpinionGroup] = []
    for key_index, external_id in enumerate(sorted(participants_by_external_id)):
        representative_opinions = _representative_opinions_for_group(
            repness.get(external_id, []),
        )
        if not representative_opinions:
            raise _HiddenCandidateOutputError(
                hidden_reason=OpinionGroupCandidateHiddenReasonEnum.missing_representative_opinions,
                detail_code="missing_representative_opinions",
                detail={"external_group_id": external_id},
            )
        groups.append(
            ComputedOpinionGroup(
                key=str(key_index),
                external_id=external_id,
                local_participant_indexes=sorted(participants_by_external_id[external_id]),
                representative_opinions=representative_opinions,
                opinion_stats=_group_opinion_stats(
                    group_comment_stats=group_comment_stats,
                    external_group_id=external_id,
                    representative_opinions=representative_opinions,
                ),
            )
        )
    return groups


def _representative_opinion_match_key(
    representative_opinions: Sequence[ComputedRepresentativeOpinion],
) -> _RepresentativeOpinionMatchKey:
    return frozenset(
        (representative.local_opinion_index, representative.agreement_type)
        for representative in representative_opinions
    )


def _format_representative_opinion_match_key(
    representative_key: _RepresentativeOpinionMatchKey,
) -> str:
    return ",".join(
        f"{local_opinion_index}:{agreement_type.value}"
        for local_opinion_index, agreement_type in sorted(representative_key)
    )


def _duplicate_representative_opinion_detail(
    groups: list[ComputedOpinionGroup],
) -> JsonObject | None:
    group_key_by_representative_key: dict[_RepresentativeOpinionMatchKey, str] = {}
    for group in groups:
        representative_key = _representative_opinion_match_key(group.representative_opinions)
        previous_group_key = group_key_by_representative_key.get(representative_key)
        if previous_group_key is not None:
            return {
                "first_group_key": previous_group_key,
                "second_group_key": group.key,
                "representative_opinions": _format_representative_opinion_match_key(
                    representative_key
                ),
            }
        group_key_by_representative_key[representative_key] = group.key
    return None


def _group_opinion_stats(
    *,
    group_comment_stats: pd.DataFrame,
    external_group_id: int,
    representative_opinions: list[ComputedRepresentativeOpinion],
) -> list[ComputedGroupOpinionStats]:
    representative_by_opinion = {
        representative.local_opinion_index: representative
        for representative in representative_opinions
    }
    stats: list[ComputedGroupOpinionStats] = []
    for record in _dataframe_record_dicts(group_comment_stats):
        group_id = _optional_int(record.get("group_id"))
        local_opinion_index = _optional_int(record.get("statement_id"))
        if group_id != external_group_id or local_opinion_index is None:
            continue

        num_agrees = _optional_int(record.get("na")) or 0
        num_disagrees = _optional_int(record.get("nd")) or 0
        total_votes = _optional_int(record.get("ns")) or 0
        num_passes = total_votes - num_agrees - num_disagrees
        if num_passes < 0:
            raise _HiddenCandidateOutputError(
                hidden_reason=OpinionGroupCandidateHiddenReasonEnum.invalid_candidate_output,
                detail_code="invalid_group_stats",
                detail={
                    "external_group_id": external_group_id,
                    "local_opinion_index": local_opinion_index,
                    "num_agrees": num_agrees,
                    "num_disagrees": num_disagrees,
                    "total_votes": total_votes,
                },
            )

        stats.append(
            ComputedGroupOpinionStats(
                local_opinion_index=local_opinion_index,
                num_agrees=num_agrees,
                num_disagrees=num_disagrees,
                num_passes=num_passes,
                representative_opinion=representative_by_opinion.get(local_opinion_index),
            )
        )
    return stats


def _representative_opinions_for_group(
    raw_repness_items: object,
) -> list[ComputedRepresentativeOpinion]:
    representative_opinions: list[ComputedRepresentativeOpinion] = []
    seen_local_opinion_indexes: set[int] = set()
    for item in _record_dicts_from_list(raw_repness_items):
        local_opinion_index = _optional_int(item.get("tid"))
        agreement_type = _agreement_type_from_value(item.get("repful-for"))
        probability_agreement = _optional_float(item.get("p-success"))
        num_agreement = _optional_int(item.get("n-success"))
        if (
            local_opinion_index is None
            or agreement_type is None
            or probability_agreement is None
            or num_agreement is None
            or local_opinion_index in seen_local_opinion_indexes
        ):
            continue
        seen_local_opinion_indexes.add(local_opinion_index)
        representative_opinions.append(
            ComputedRepresentativeOpinion(
                local_opinion_index=local_opinion_index,
                agreement_type=agreement_type,
                probability_agreement=probability_agreement,
                num_agreement=num_agreement,
                raw_repness=_to_json_object(item),
            )
        )
    return representative_opinions


def _calculate_silhouette_score(participants_df: pd.DataFrame) -> float | None:
    clusterable_df = participants_df.dropna(subset=["cluster_id"])
    if len(clusterable_df.index) == 0:
        return None

    labels = clusterable_df["cluster_id"].to_numpy(dtype=int)
    unique_labels, counts = np.unique(labels, return_counts=True)
    if len(unique_labels) < 2 or len(unique_labels) >= len(labels):
        return None
    if counts.min() < 2:
        return -1.0

    coords = clusterable_df.loc[:, ["x", "y"]].to_numpy(dtype=float)
    sample_scores: list[float] = []
    for index, label in enumerate(labels):
        same_cluster_indexes = np.flatnonzero(labels == label)
        other_cluster_scores: list[float] = []

        same_cluster_distances = [
            float(np.linalg.norm(coords[index] - coords[other_index]))
            for other_index in same_cluster_indexes
            if other_index != index
        ]
        if not same_cluster_distances:
            return -1.0
        same_cluster_mean = sum(same_cluster_distances) / len(same_cluster_distances)

        for other_label in unique_labels:
            if other_label == label:
                continue
            other_cluster_indexes = np.flatnonzero(labels == other_label)
            distances = [
                float(np.linalg.norm(coords[index] - coords[other_index]))
                for other_index in other_cluster_indexes
            ]
            if distances:
                other_cluster_scores.append(sum(distances) / len(distances))

        nearest_other_cluster_mean = min(other_cluster_scores)
        denominator = max(same_cluster_mean, nearest_other_cluster_mean)
        sample_scores.append(
            0.0
            if denominator == 0
            else (nearest_other_cluster_mean - same_cluster_mean) / denominator
        )

    return sum(sample_scores) / len(sample_scores)


def _group_size_bounds(groups: list[ComputedOpinionGroup]) -> tuple[int, int]:
    if not groups:
        return 0, 0
    sizes = _group_sizes(groups)
    return min(sizes), max(sizes)


def _group_sizes(groups: list[ComputedOpinionGroup]) -> list[int]:
    return [len(group.local_participant_indexes) for group in groups]


def _calculate_coefficient_of_variation(
    groups: list[ComputedOpinionGroup],
) -> float | None:
    sizes = _group_sizes(groups)
    if len(sizes) < 2:
        return 0.0
    total_members = sum(sizes)
    if total_members == 0:
        return None
    mean = total_members / len(sizes)
    variance = sum((size - mean) ** 2 for size in sizes) / len(sizes)
    return math.sqrt(variance) / mean


def _calculate_balance_score(coefficient_of_variation: float | None) -> float | None:
    if coefficient_of_variation is None:
        return None
    return 1 / (1 + coefficient_of_variation)


def _calculate_selection_score(
    *,
    silhouette_score: float | None,
    balance_score: float | None,
    hidden_reason: OpinionGroupCandidateHiddenReasonEnum | None,
) -> float | None:
    if hidden_reason is not None or balance_score is None:
        return None
    silhouette_component = (
        _clamp(value=(silhouette_score + 1) / 2, minimum=0, maximum=1)
        if silhouette_score is not None
        else 0
    )
    return 0.65 * silhouette_component + 0.35 * balance_score


def _clamp(*, value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def _routing_priority_candidate(
    candidates: list[ComputedOpinionGroupCandidate],
) -> ComputedOpinionGroupCandidate | None:
    selectable_candidates = [
        candidate
        for candidate in candidates
        if candidate.assessment is not None
        and candidate.assessment.hidden_reason is None
        and candidate.assessment.selection_score is not None
    ]
    if not selectable_candidates:
        return None
    return max(
        selectable_candidates,
        key=lambda candidate: (
            candidate.assessment.selection_score
            if candidate.assessment is not None and candidate.assessment.selection_score is not None
            else -math.inf,
            candidate.group_count,
        ),
    )


def _candidate_with_assessment(
    candidate: ComputedOpinionGroupCandidate,
) -> ComputedOpinionGroupCandidate:
    if candidate.outcome != AnalysisResultOutcomeEnum.success or candidate.assessment is not None:
        return candidate
    return replace(candidate, assessment=_assess_candidate(candidate))


def _is_visible_success_candidate(candidate: ComputedOpinionGroupCandidate) -> bool:
    if candidate.outcome != AnalysisResultOutcomeEnum.success:
        return False
    return candidate.assessment is None or candidate.assessment.hidden_reason is None


def _has_contract_hidden_candidates(candidates: list[ComputedOpinionGroupCandidate]) -> bool:
    return any(
        candidate.assessment is not None
        and candidate.assessment.hidden_reason in _CONTRACT_HIDDEN_REASONS
        for candidate in candidates
    )


def _all_candidates_hidden_contract_error_message(
    candidates: list[ComputedOpinionGroupCandidate],
) -> str:
    reason_counts: dict[str, int] = {}
    for candidate in candidates:
        hidden_reason = None if candidate.assessment is None else candidate.assessment.hidden_reason
        if hidden_reason is None or hidden_reason not in _CONTRACT_HIDDEN_REASONS:
            continue
        reason_counts[hidden_reason.value] = reason_counts.get(hidden_reason.value, 0) + 1

    formatted_counts = ",".join(
        f"{reason}={count}" for reason, count in sorted(reason_counts.items())
    )
    return (
        "red-dwarf produced no displayable candidates; "
        f"hidden_contract_reasons={formatted_counts}"
    )


def _assess_candidate(candidate: ComputedOpinionGroupCandidate) -> CandidateAssessment:
    min_group_size, _max_group_size = _group_size_bounds(candidate.groups)
    silhouette_score = _candidate_silhouette_score(candidate)
    coefficient_of_variation = _calculate_coefficient_of_variation(candidate.groups)
    balance_score = _calculate_balance_score(coefficient_of_variation)
    hidden_reason = (
        OpinionGroupCandidateHiddenReasonEnum.singleton_group
        if candidate.group_count == 2 and min_group_size == 1
        else None
    )
    selection_score = _calculate_selection_score(
        silhouette_score=silhouette_score,
        balance_score=balance_score,
        hidden_reason=hidden_reason,
    )

    return CandidateAssessment(
        silhouette_score=silhouette_score,
        coefficient_of_variation=coefficient_of_variation,
        balance_score=balance_score,
        selection_score=selection_score,
        hidden_reason=hidden_reason,
    )


def _candidate_silhouette_score(
    candidate: ComputedOpinionGroupCandidate,
) -> float | None:
    raw_output = candidate.raw_output
    if not isinstance(raw_output, dict):
        return None
    return _optional_float(raw_output.get("silhouette_score"))


def _first_insufficient_reason(
    candidates: list[ComputedOpinionGroupCandidate],
) -> AnalysisInsufficientDataReasonEnum:
    for candidate in candidates:
        if candidate.outcome_reason is not None:
            return candidate.outcome_reason
    return AnalysisInsufficientDataReasonEnum.not_enough_clusterable_participants


def _candidate_opinion_metrics(
    *,
    statements_df: pd.DataFrame,
    consensus: dict[object, object],
) -> list[CandidateOpinionMetrics]:
    consensus_by_opinion = _consensus_by_local_opinion_index(consensus)
    metrics_by_opinion: dict[int, CandidateOpinionMetrics] = {}

    for record in _dataframe_record_dicts(statements_df):
        local_opinion_index = _optional_int(record.get("statement_id"))
        if local_opinion_index is None:
            continue
        majority = consensus_by_opinion.get(local_opinion_index)
        metrics_by_opinion[local_opinion_index] = CandidateOpinionMetrics(
            local_opinion_index=local_opinion_index,
            group_aware_consensus_agree=_optional_float(
                record.get("group-aware-consensus-agree"),
            ),
            group_aware_consensus_disagree=_optional_float(
                record.get("group-aware-consensus-disagree"),
            ),
            divisiveness=_optional_float(record.get("extremity")),
            majority_type=majority[0] if majority is not None else None,
            majority_probability_success=majority[1] if majority is not None else None,
            agreement_rank=None,
            disagreement_rank=None,
            divisiveness_rank=None,
        )

    return _with_candidate_metric_ranks(list(metrics_by_opinion.values()))


def _with_candidate_metric_ranks(
    metrics: list[CandidateOpinionMetrics],
) -> list[CandidateOpinionMetrics]:
    agreement_rank_by_index = _rank_by_metric(
        metrics,
        lambda metric: metric.group_aware_consensus_agree,
    )
    disagreement_rank_by_index = _rank_by_metric(
        metrics,
        lambda metric: metric.group_aware_consensus_disagree,
    )
    divisiveness_rank_by_index = _rank_by_metric(
        metrics,
        lambda metric: metric.divisiveness,
    )

    return [
        replace(
            metric,
            agreement_rank=agreement_rank_by_index.get(metric.local_opinion_index),
            disagreement_rank=disagreement_rank_by_index.get(metric.local_opinion_index),
            divisiveness_rank=divisiveness_rank_by_index.get(metric.local_opinion_index),
        )
        for metric in metrics
    ]


def _rank_by_metric(
    metrics: list[CandidateOpinionMetrics],
    get_value: Callable[[CandidateOpinionMetrics], float | None],
) -> dict[int, int]:
    ranked_metrics = sorted(
        [metric for metric in metrics if get_value(metric) is not None],
        key=lambda metric: (get_value(metric) or -math.inf, -metric.local_opinion_index),
        reverse=True,
    )
    return {metric.local_opinion_index: rank for rank, metric in enumerate(ranked_metrics, start=1)}


def _consensus_by_local_opinion_index(
    consensus: dict[object, object],
) -> dict[int, tuple[VoteEnumSimple, float]]:
    consensus_by_opinion: dict[int, tuple[VoteEnumSimple, float]] = {}
    for key, vote_type in (
        ("agree", VoteEnumSimple.agree),
        ("disagree", VoteEnumSimple.disagree),
    ):
        raw_items = consensus.get(key, [])
        for item in _record_dicts_from_list(raw_items):
            local_opinion_index = _optional_int(item.get("tid"))
            probability = _optional_float(item.get("p-success"))
            if local_opinion_index is None or probability is None:
                continue
            consensus_by_opinion[local_opinion_index] = (vote_type, probability)
    return consensus_by_opinion


def _compute_snapshot_opinion_metrics(
    *,
    snapshot: PreparedInputSnapshot,
    routing_priority_candidate: ComputedOpinionGroupCandidate | None,
) -> list[SnapshotOpinionMetrics]:
    vote_counts_by_opinion = {
        opinion.local_opinion_index: {1: 0, -1: 0, 0: 0} for opinion in snapshot.opinions
    }
    for vote in snapshot.votes:
        counts = vote_counts_by_opinion.setdefault(
            vote.local_opinion_index,
            {1: 0, -1: 0, 0: 0},
        )
        counts[vote.vote] = counts.get(vote.vote, 0) + 1

    routing_priority_by_opinion = (
        {
            metric.local_opinion_index: metric.routing_priority
            for metric in _snapshot_routing_priority_metrics(routing_priority_candidate)
        }
        if routing_priority_candidate is not None
        else {}
    )

    snapshot_opinions: list[SnapshotOpinionMetrics] = []
    for opinion in snapshot.opinions:
        counts = vote_counts_by_opinion[opinion.local_opinion_index]
        snapshot_opinions.append(
            SnapshotOpinionMetrics(
                local_opinion_index=opinion.local_opinion_index,
                num_agrees=counts.get(1, 0),
                num_disagrees=counts.get(-1, 0),
                num_passes=counts.get(0, 0),
                routing_priority=routing_priority_by_opinion.get(opinion.local_opinion_index),
            )
        )
    return snapshot_opinions


@dataclass(frozen=True)
class _SnapshotRoutingPriorityMetric:
    local_opinion_index: int
    routing_priority: float | None


def _snapshot_routing_priority_metrics(
    candidate: ComputedOpinionGroupCandidate,
) -> list[_SnapshotRoutingPriorityMetric]:
    raw_output = candidate.raw_output
    if not isinstance(raw_output, dict):
        return []
    statements = raw_output.get("statements_df")
    return [
        _SnapshotRoutingPriorityMetric(
            local_opinion_index=local_opinion_index,
            routing_priority=_optional_float(record.get("priority")),
        )
        for record in _record_dicts_from_list(statements)
        if (local_opinion_index := _optional_int(record.get("statement_id"))) is not None
    ]


def _optional_int(value: object) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not math.isfinite(value) or not value.is_integer():
            return None
        return int(value)
    if isinstance(value, np.generic):
        return _optional_int(f"{value}")
    if not isinstance(value, str):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _optional_float(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, int | float):
        return float(value) if math.isfinite(float(value)) else None
    if isinstance(value, np.generic):
        return _optional_float(f"{value}")
    if not isinstance(value, str):
        return None
    try:
        float_value = float(value)
    except (TypeError, ValueError):
        return None
    return float_value if math.isfinite(float_value) else None


def _dataframe_record_dicts(dataframe: pd.DataFrame) -> list[dict[str, object]]:
    records_json = dataframe.reset_index().to_json(orient="records")
    return _record_dicts_from_list(_json_loads(records_json))


def _record_dicts_from_list(value: object) -> list[dict[str, object]]:
    if not isinstance(value, Sequence) or isinstance(value, str | bytes | bytearray):
        return []
    records: list[dict[str, object]] = []
    for item in cast("Sequence[object]", value):
        if not isinstance(item, Mapping):
            continue
        parsed: dict[str, object] = {}
        for key, record_value in cast("Mapping[object, object]", item).items():
            parsed[str(key)] = record_value
        records.append(parsed)
    return records


def _json_loads(value: str) -> object:
    parsed: object = json.loads(value)
    return parsed


def _agreement_type_from_value(value: object) -> VoteEnumSimple | None:
    if value == "agree":
        return VoteEnumSimple.agree
    if value == "disagree":
        return VoteEnumSimple.disagree
    return None
