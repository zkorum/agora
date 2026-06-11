from __future__ import annotations

from agora_analysis_worker_shared.analysis_compute import (
    CandidateAssessment,
    ComputedAnalysisBundle,
    ComputedOpinionGroupCandidate,
)
from agora_analysis_worker_shared.db import ClaimedWorkItem, artifact_candidate_ids_by_pair
from agora_analysis_worker_shared.generated_models import (
    AnalysisResultOutcomeEnum,
    OpinionGroupCandidateHiddenReasonEnum,
)


def _claim() -> ClaimedWorkItem:
    return ClaimedWorkItem(
        id=1,
        conversation_id=10,
        conversation_slug_id="convslug",
        opinion_group_spec_id=3,
        data_generation=7,
        attempt_count=1,
        lease_token="lease-token",
        persisted_analysis_snapshot_id=None,
    )


def _candidate(
    *,
    variant_id: int,
    group_count: int,
    selection_score: float | None,
    hidden_reason: OpinionGroupCandidateHiddenReasonEnum | None = None,
) -> ComputedOpinionGroupCandidate:
    assessment = CandidateAssessment(
        silhouette_score=0.5,
        coefficient_of_variation=0.1,
        balance_score=0.9,
        selection_score=selection_score,
        hidden_reason=hidden_reason,
    )
    return ComputedOpinionGroupCandidate(
        opinion_group_variant_id=variant_id,
        group_count=group_count,
        outcome=AnalysisResultOutcomeEnum.success,
        outcome_reason=None,
        raw_output={},
        groups=[],
        assessment=assessment,
        opinion_metrics=[],
    )


def _bundle(*candidates: ComputedOpinionGroupCandidate) -> ComputedAnalysisBundle:
    return ComputedAnalysisBundle(
        conversation_id=10,
        data_generation=7,
        outcome=AnalysisResultOutcomeEnum.success,
        outcome_reason=None,
        candidates=list(candidates),
        snapshot_opinions=[],
    )


def test_non_premium_artifacts_only_include_selected_candidate() -> None:
    claim = _claim()
    candidate_id_by_conversation_variant = {
        (10, 20): 200,
        (10, 30): 300,
        (10, 40): 400,
    }
    bundle = _bundle(
        _candidate(variant_id=20, group_count=2, selection_score=0.4),
        _candidate(variant_id=30, group_count=3, selection_score=0.9),
        _candidate(variant_id=40, group_count=4, selection_score=0.7),
    )

    candidate_ids_by_pair = artifact_candidate_ids_by_pair(
        claims=[claim],
        bundles_by_conversation_id={10: bundle},
        candidate_id_by_conversation_variant=candidate_id_by_conversation_variant,
        premium_analysis_conversation_ids=set(),
    )

    assert candidate_ids_by_pair[(10, 3)] == {300}


def test_premium_artifacts_include_all_visible_candidates_only() -> None:
    claim = _claim()
    candidate_id_by_conversation_variant = {
        (10, 20): 200,
        (10, 30): 300,
        (10, 40): 400,
    }
    bundle = _bundle(
        _candidate(variant_id=20, group_count=2, selection_score=0.4),
        _candidate(variant_id=30, group_count=3, selection_score=0.9),
        _candidate(
            variant_id=40,
            group_count=4,
            selection_score=None,
            hidden_reason=OpinionGroupCandidateHiddenReasonEnum.singleton_group,
        ),
    )

    candidate_ids_by_pair = artifact_candidate_ids_by_pair(
        claims=[claim],
        bundles_by_conversation_id={10: bundle},
        candidate_id_by_conversation_variant=candidate_id_by_conversation_variant,
        premium_analysis_conversation_ids={10},
    )

    assert candidate_ids_by_pair[(10, 3)] == {200, 300}
