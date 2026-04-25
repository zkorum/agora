"""Community-ranking scoring pipelines.

Uses Solidago end to end for pairwise comparisons and a native sequential
MaxDiff learner for best-worst tasks, while keeping the shared trust,
voting-rights, and aggregation stages aligned with Solidago.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

import pandas as pd
from solidago.aggregation import EntitywiseQrQuantile
from solidago.judgments import DataFrameJudgments
from solidago.pipeline import Pipeline
from solidago.post_process import NoPostProcess
from solidago.privacy_settings import PrivacySettings
from solidago.scaling import NoScaling
from solidago.trust_propagation import TrustPropagation
from solidago.voting_rights import AffineOvertrust
from solidago.voting_rights.base import VotingRights, VotingRightsAssignment

from scoring_worker.cocm_voting import COCMVotingRights, GroupSource
from scoring_worker.entity_mapping import (
    EntityIdMapper,
    SolidagoEntityScore,
    map_scores_from_solidago,
)
from scoring_worker.maxdiff_sequential import SequentialMaxDiffJudgments
from scoring_worker.observations import (
    MaxDiffObservation,
    PairwiseObservation,
    comparison_rows_to_maxdiff_observations,
    maxdiff_observations_to_tasks_frame,
    pairwise_observations_to_solidago_rows,
)
from scoring_worker.pipeline_config import (
    MAXDIFF_PREFERENCE_LEARNING_NAME,
    PAIRWISE_PREFERENCE_LEARNING_NAME,
    create_maxdiff_preference_learning,
    create_pairwise_preference_learning,
)

if TYPE_CHECKING:
    from solidago.preference_learning import PreferenceLearning
    from solidago.scoring_model import ScoringModel

    from scoring_worker.db import ComparisonRow

log = logging.getLogger(__name__)


class _IdentityTrustPropagation(TrustPropagation):
    """Pass-through: preserves pre-set trust_score values."""

    def __call__(self, users: pd.DataFrame, vouches: pd.DataFrame) -> pd.DataFrame:
        if "trust_score" not in users.columns:
            return users.assign(trust_score=1.0)
        return users


class _COCMVotingRightsAssignment(VotingRightsAssignment):
    """Solidago VotingRightsAssignment backed by COCM."""

    def __init__(self, *, group_sources: list[GroupSource]) -> None:
        self._cocm = COCMVotingRights(group_sources=group_sources)

    def __call__(
        self,
        users: pd.DataFrame,
        entities: pd.DataFrame,
        vouches: pd.DataFrame,
        privacy: PrivacySettings,
        user_models: dict[int, ScoringModel] | None,
    ) -> tuple[VotingRights, pd.DataFrame]:
        voting_rights = VotingRights()
        if len(users) == 0 or len(entities) == 0:
            return voting_rights, entities

        entity_ids = [int(entity_id) for entity_id in entities.index]
        entity_to_users: dict[int, set[int]] = {entity_id: set() for entity_id in entity_ids}
        if user_models is None:
            for entity_id in privacy.entities():
                entity_to_users[entity_id] = privacy.users(entity_id)
        else:
            for user_id, model in user_models.items():
                for entity_id in model.scored_entities():
                    entity_to_users[entity_id].add(user_id)

        trust_scores_series = users["trust_score"]
        all_user_ids = [int(user_id) for user_id in users.index]
        trust_dict = {int(uid): float(trust_scores_series[uid]) for uid in all_user_ids}

        for entity_id, user_ids in entity_to_users.items():
            if not user_ids:
                continue
            rights = self._cocm.compute_entity_voting_rights(
                scorers=list(user_ids),
                trust_scores=trust_dict,
                user_ids=all_user_ids,
            )
            for user_id, right in rights.items():
                voting_rights[user_id, entity_id] = right

        return voting_rights, entities

    def to_json(self) -> tuple[str, dict[str, object]]:
        return "COCMVotingRights", {}

    def __str__(self) -> str:
        return "COCMVotingRights"


_DEFAULT_VOTING_RIGHTS = AffineOvertrust(
    privacy_penalty=0.5,
    min_overtrust=2.0,
    overtrust_ratio=0.1,
)


def _create_pipeline(
    *,
    preference_learning: PreferenceLearning,
    voting_rights: VotingRightsAssignment | None = None,
) -> Pipeline:
    return Pipeline(
        trust_propagation=_IdentityTrustPropagation(),
        preference_learning=preference_learning,
        voting_rights=voting_rights or _DEFAULT_VOTING_RIGHTS,
        scaling=NoScaling(),
        aggregation=EntitywiseQrQuantile(quantile=0.5, lipschitz=0.1, error=1e-3),
        post_process=NoPostProcess(),
    )


_default_pairwise_pipeline = _create_pipeline(
    preference_learning=create_pairwise_preference_learning()
)
_default_maxdiff_pipeline = _create_pipeline(
    preference_learning=create_maxdiff_preference_learning()
)


@dataclass(frozen=True)
class ScoringResult:
    entity_id: str
    score: float
    uncertainty_left: float
    uncertainty_right: float


@dataclass(frozen=True)
class ConversationScoringOutput:
    global_scores: list[ScoringResult]
    user_scores: dict[int, list[ScoringResult]]  # user_idx → per-entity scores


def warmup() -> None:
    """Run tiny dummy scorings to initialize both preference-learning paths."""

    log.info(
        "[Scoring] Warming up pairwise (%s) and maxdiff (%s) pipelines...",
        PAIRWISE_PREFERENCE_LEARNING_NAME,
        MAXDIFF_PREFERENCE_LEARNING_NAME,
    )

    solidago_logger = logging.getLogger("solidago")
    previous_level = solidago_logger.level
    solidago_logger.setLevel(logging.WARNING)
    try:
        _run_pipeline(
            mapper=EntityIdMapper(entity_ids=["pair-a", "pair-b"]),
            user_ids=[0],
            judgments=DataFrameJudgments(
                comparisons=pd.DataFrame(
                    [
                        {
                            "user_id": 0,
                            "entity_a": 0,
                            "entity_b": 1,
                            "comparison": -1.0,
                            "comparison_max": 1.0,
                        }
                    ]
                )
            ),
            pipeline=_default_pairwise_pipeline,
            preference_learning_name=PAIRWISE_PREFERENCE_LEARNING_NAME,
        )
        _run_pipeline(
            mapper=EntityIdMapper(entity_ids=["max-a", "max-b", "max-c"]),
            user_ids=[0],
            judgments=SequentialMaxDiffJudgments(
                maxdiff_tasks=pd.DataFrame(
                    [
                        {
                            "user_id": 0,
                            "best_entity": 0,
                            "worst_entity": 2,
                            "candidate_set": (0, 1, 2),
                        }
                    ]
                )
            ),
            pipeline=_default_maxdiff_pipeline,
            preference_learning_name=MAXDIFF_PREFERENCE_LEARNING_NAME,
        )
    finally:
        solidago_logger.setLevel(previous_level)

    log.info("[Scoring] Warmup complete")


def score_pairwise_observations(
    *,
    entity_ids: list[str],
    observations: list[PairwiseObservation],
    trust_scores: dict[int, float] | None = None,
    group_sources: list[GroupSource] | None = None,
) -> ConversationScoringOutput | None:
    if len(entity_ids) < 2 or not observations:
        return None

    mapper = EntityIdMapper(entity_ids=entity_ids)
    rows = pairwise_observations_to_solidago_rows(observations=observations, mapper=mapper)
    if not rows:
        return None

    comparisons_df = pd.DataFrame(rows)
    pipeline = _get_pairwise_pipeline(group_sources=group_sources)
    return _run_pipeline(
        mapper=mapper,
        user_ids=sorted(int(user_id) for user_id in comparisons_df["user_id"].unique()),
        judgments=DataFrameJudgments(comparisons=comparisons_df),
        pipeline=pipeline,
        preference_learning_name=PAIRWISE_PREFERENCE_LEARNING_NAME,
        trust_scores=trust_scores,
    )


def score_maxdiff_observations(
    *,
    entity_ids: list[str],
    observations: list[MaxDiffObservation],
    trust_scores: dict[int, float] | None = None,
    group_sources: list[GroupSource] | None = None,
) -> ConversationScoringOutput | None:
    if len(entity_ids) < 2 or not observations:
        return None

    mapper = EntityIdMapper(entity_ids=entity_ids)
    tasks_df = maxdiff_observations_to_tasks_frame(observations=observations, mapper=mapper)
    if tasks_df.empty:
        return None

    pipeline = _get_maxdiff_pipeline(group_sources=group_sources)
    return _run_pipeline(
        mapper=mapper,
        user_ids=sorted(int(user_id) for user_id in tasks_df["user_id"].unique()),
        judgments=SequentialMaxDiffJudgments(maxdiff_tasks=tasks_df),
        pipeline=pipeline,
        preference_learning_name=MAXDIFF_PREFERENCE_LEARNING_NAME,
        trust_scores=trust_scores,
    )


def score_comparisons(
    *,
    entity_ids: list[str],
    comparisons: list[ComparisonRow],
    trust_scores: dict[int, float] | None = None,
    group_sources: list[GroupSource] | None = None,
) -> ConversationScoringOutput | None:
    """Compatibility wrapper for the current MaxDiff-only worker path."""

    observations = comparison_rows_to_maxdiff_observations(
        entity_ids=entity_ids,
        comparisons=comparisons,
    )
    return score_maxdiff_observations(
        entity_ids=entity_ids,
        observations=observations,
        trust_scores=trust_scores,
        group_sources=group_sources,
    )


def _get_pairwise_pipeline(*, group_sources: list[GroupSource] | None) -> Pipeline:
    if group_sources is not None and len(group_sources) > 0:
        log.info("[Scoring] Using COCM voting rights (%d group sources)", len(group_sources))
        return _create_pipeline(
            preference_learning=create_pairwise_preference_learning(),
            voting_rights=_COCMVotingRightsAssignment(group_sources=group_sources),
        )
    return _default_pairwise_pipeline


def _get_maxdiff_pipeline(*, group_sources: list[GroupSource] | None) -> Pipeline:
    if group_sources is not None and len(group_sources) > 0:
        log.info("[Scoring] Using COCM voting rights (%d group sources)", len(group_sources))
        return _create_pipeline(
            preference_learning=create_maxdiff_preference_learning(),
            voting_rights=_COCMVotingRightsAssignment(group_sources=group_sources),
        )
    return _default_maxdiff_pipeline


def _run_pipeline(
    *,
    mapper: EntityIdMapper,
    user_ids: list[int],
    judgments: DataFrameJudgments | SequentialMaxDiffJudgments,
    pipeline: Pipeline,
    preference_learning_name: str,
    trust_scores: dict[int, float] | None = None,
) -> ConversationScoringOutput | None:
    users_df = _build_users_dataframe(user_ids=user_ids, trust_scores=trust_scores)
    entities_df = pd.DataFrame(index=pd.Index(mapper.all_int_ids(), name="entity_id"))
    vouches_df = pd.DataFrame(columns=pd.Index(["voucher", "vouchee", "vouch"]))

    log.info(
        "[Scoring] Pipeline input: %d users, %d entities, %s",
        len(user_ids),
        len(mapper.all_int_ids()),
        preference_learning_name,
    )

    privacy = PrivacySettings()
    _, _, user_models, global_model = pipeline(
        users=users_df,
        vouches=vouches_df,
        entities=entities_df,
        privacy=privacy,
        judgments=judgments,
    )

    global_scores = map_scores_from_solidago(
        solidago_scores=list(global_model.iter_entities()),
        mapper=mapper,
    )
    if not global_scores:
        return None

    user_scores: dict[int, list[ScoringResult]] = {}
    for solidago_user_id, user_model in user_models.items():
        mapped_user_scores = map_scores_from_solidago(
            solidago_scores=list(user_model.iter_entities()),
            mapper=mapper,
        )
        if mapped_user_scores:
            user_scores[int(solidago_user_id)] = to_scoring_results(mapped_user_scores)

    return ConversationScoringOutput(
        global_scores=to_scoring_results(global_scores),
        user_scores=user_scores,
    )


def _build_users_dataframe(
    *,
    user_ids: list[int],
    trust_scores: dict[int, float] | None,
) -> pd.DataFrame:
    user_trust_scores = [
        trust_scores.get(int(user_id), 1.0) if trust_scores is not None else 1.0
        for user_id in user_ids
    ]
    return pd.DataFrame(
        {"is_pretrusted": [True] * len(user_ids), "trust_score": user_trust_scores},
        index=pd.Index(user_ids, name="user_id"),
    )


def to_scoring_results(entity_scores: list[SolidagoEntityScore]) -> list[ScoringResult]:
    """Convert raw model scores into sorted scoring results."""

    results = [
        ScoringResult(
            entity_id=entity_score.entity_id,
            score=entity_score.score,
            uncertainty_left=entity_score.uncertainty_left,
            uncertainty_right=entity_score.uncertainty_right,
        )
        for entity_score in entity_scores
    ]
    results.sort(key=lambda result: result.score, reverse=True)
    return results
