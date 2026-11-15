"""Community-ranking scoring pipelines.

Uses Solidago end to end for graded pairwise comparisons and a native joint
MaxDiff learner for best-worst tasks, while keeping the shared trust,
voting-rights, and aggregation stages aligned with Solidago.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING

import pandas as pd
from solidago.judgments import DataFrameJudgments
from solidago.privacy_settings import PrivacySettings

from scoring_worker.display_scores import squash_display_scores
from scoring_worker.entity_mapping import (
    EntityIdMapper,
    SolidagoEntityScore,
    map_scores_from_solidago,
)
from scoring_worker.maxdiff_joint import JointMaxDiffJudgments
from scoring_worker.observations import (
    ComparisonObservation,
    PairwiseObservation,
    comparison_observations_to_tasks_frame,
    comparison_rows_to_observations,
    pairwise_observations_to_solidago_rows,
)
from scoring_worker.pipeline_config import (
    COMPARISON_RECIPE,
    MAXDIFF_PREFERENCE_LEARNING_NAME,
    PAIRWISE_PREFERENCE_LEARNING_NAME,
    ComparisonRecipe,
    create_pairwise_preference_learning,
)

if TYPE_CHECKING:
    from collections.abc import Sequence

    from solidago.pipeline import Pipeline

    from scoring_worker.db import ComparisonRow

log = logging.getLogger(__name__)


_pairwise_pipeline = COMPARISON_RECIPE.create_pipeline(
    learner=create_pairwise_preference_learning()
)
_comparison_pipeline = COMPARISON_RECIPE.create_pipeline()


@dataclass(frozen=True)
class ScoringResult:
    entity_id: str
    score: float
    display_score: float
    uncertainty_left: float
    uncertainty_right: float


@dataclass(frozen=True)
class ConversationScoringOutput:
    global_scores: list[ScoringResult]
    user_scores: dict[int, list[ScoringResult]]  # user_idx → per-entity scores


def warmup() -> None:
    """Run tiny dummy scorings to initialize both preference-learning paths."""

    log.info(
        "[Scoring] Warming up graded pairwise (%s) and comparison (%s) pipelines...",
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
            pipeline=_pairwise_pipeline,
            preference_learning_name=PAIRWISE_PREFERENCE_LEARNING_NAME,
        )
        _run_pipeline(
            mapper=EntityIdMapper(entity_ids=["max-a", "max-b", "max-c"]),
            user_ids=[0],
            judgments=JointMaxDiffJudgments(
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
            pipeline=_comparison_pipeline,
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
) -> ConversationScoringOutput | None:
    if len(entity_ids) < 2 or not observations:
        return None

    mapper = EntityIdMapper(entity_ids=entity_ids)
    rows = pairwise_observations_to_solidago_rows(observations=observations, mapper=mapper)
    if not rows:
        return None

    comparisons_df = pd.DataFrame(rows)
    return _run_pipeline(
        mapper=mapper,
        user_ids=sorted(int(user_id) for user_id in comparisons_df["user_id"].unique()),
        judgments=DataFrameJudgments(comparisons=comparisons_df),
        pipeline=_pairwise_pipeline,
        preference_learning_name=PAIRWISE_PREFERENCE_LEARNING_NAME,
        trust_scores=trust_scores,
    )


def score_comparison_observations(
    *,
    entity_ids: Sequence[str],
    observations: Sequence[ComparisonObservation],
    trust_scores: dict[int, float] | None = None,
    recipe: ComparisonRecipe = COMPARISON_RECIPE,
) -> ConversationScoringOutput | None:
    if len(entity_ids) < 2 or not observations:
        return None

    mapper = EntityIdMapper(entity_ids=entity_ids)
    tasks_df = comparison_observations_to_tasks_frame(observations=observations, mapper=mapper)
    if tasks_df.empty:
        return None

    return _run_pipeline(
        mapper=mapper,
        user_ids=sorted(int(user_id) for user_id in tasks_df["user_id"].unique()),
        judgments=JointMaxDiffJudgments(maxdiff_tasks=tasks_df),
        pipeline=recipe.create_pipeline(),
        preference_learning_name=recipe.preference_learning,
        trust_scores=trust_scores,
    )


def score_comparisons(
    *,
    entity_ids: list[str],
    comparisons: list[ComparisonRow],
    trust_scores: dict[int, float] | None = None,
) -> ConversationScoringOutput | None:
    """Learn joint best/worst and binary pairwise tasks on a shared utility scale."""

    observations = comparison_rows_to_observations(
        entity_ids=entity_ids,
        comparisons=comparisons,
    )
    return score_comparison_observations(
        entity_ids=entity_ids,
        observations=observations,
        trust_scores=trust_scores,
    )


def _run_pipeline(
    *,
    mapper: EntityIdMapper,
    user_ids: list[int],
    judgments: DataFrameJudgments | JointMaxDiffJudgments,
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
        mapper.size,
        preference_learning_name,
    )

    privacy = PrivacySettings()
    pipeline_started = time.perf_counter()
    _, _, user_models, global_model = pipeline(
        users=users_df,
        vouches=vouches_df,
        entities=entities_df,
        privacy=privacy,
        judgments=judgments,
    )
    # Solidago 0.5.0 truncates its total-duration log to whole seconds.
    log.info(
        "[Scoring] Pipeline completed in %.3fs (%d users, %d entities, %s)",
        time.perf_counter() - pipeline_started,
        len(user_ids),
        mapper.size,
        preference_learning_name,
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
        trust_scores.get(int(user_id), COMPARISON_RECIPE.trust_score)
        if trust_scores is not None
        else COMPARISON_RECIPE.trust_score
        for user_id in user_ids
    ]
    return pd.DataFrame(
        {
            "is_pretrusted": [COMPARISON_RECIPE.is_pretrusted] * len(user_ids),
            "trust_score": user_trust_scores,
        },
        index=pd.Index(user_ids, name="user_id"),
    )


def to_scoring_results(entity_scores: list[SolidagoEntityScore]) -> list[ScoringResult]:
    """Convert raw model scores into sorted scoring results."""

    displayed = squash_display_scores(
        {index: entity.score for index, entity in enumerate(entity_scores)}
    )
    results = [
        ScoringResult(
            entity_id=entity_score.entity_id,
            score=entity_score.score,
            display_score=displayed[index],
            uncertainty_left=entity_score.uncertainty_left,
            uncertainty_right=entity_score.uncertainty_right,
        )
        for index, entity_score in enumerate(entity_scores)
    ]
    results.sort(key=lambda result: result.score, reverse=True)
    return results
