"""Solidago scoring pipeline.

Extracted from python-bridge/main.py score_conversation().
Calls Solidago directly (no HTTP hop).
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
from solidago.preference_learning import LBFGSUniformGBT
from solidago.privacy_settings import PrivacySettings
from solidago.scaling import NoScaling
from solidago.trust_propagation import TrustPropagation
from solidago.voting_rights import AffineOvertrust

from scoring_worker.bws_conversion import BWSComparison, bws_to_pairwise
from scoring_worker.entity_mapping import (
    EntityIdMapper,
    map_pairwise_wins_to_solidago,
    map_scores_from_solidago,
)

if TYPE_CHECKING:
    from scoring_worker.db import ComparisonRow

log = logging.getLogger(__name__)


class _IdentityTrustPropagation(TrustPropagation):
    """Pass-through: preserves pre-set trust_score values."""

    def __call__(self, users: pd.DataFrame, vouches: pd.DataFrame) -> pd.DataFrame:
        if "trust_score" not in users.columns:
            return users.assign(trust_score=1.0)
        return users


def _create_pipeline() -> Pipeline:
    return Pipeline(
        trust_propagation=_IdentityTrustPropagation(),
        preference_learning=LBFGSUniformGBT(
            prior_std_dev=7.0,
            convergence_error=1e-5,
        ),
        voting_rights=AffineOvertrust(
            privacy_penalty=0.5,
            min_overtrust=2.0,
            overtrust_ratio=0.1,
        ),
        scaling=NoScaling(),
        aggregation=EntitywiseQrQuantile(quantile=0.5, lipschitz=0.1, error=1e-3),
        post_process=NoPostProcess(),
    )


# Create pipeline once at module load (reused across scoring calls)
_pipeline = _create_pipeline()


@dataclass(frozen=True)
class ScoringResult:
    entity_id: str
    score: float  # normalized 0-1
    uncertainty_left: float
    uncertainty_right: float


def warmup() -> None:
    """Run a tiny dummy scoring to initialize PyTorch/LBFGS.

    Prevents first real call from timing out due to lazy init.
    """
    log.info("[Scoring] Warming up Solidago/LBFGS...")
    # Suppress Solidago's verbose pipeline logs during warmup
    solidago_logger = logging.getLogger("solidago")
    prev_level = solidago_logger.level
    solidago_logger.setLevel(logging.WARNING)
    try:
        dummy_df = pd.DataFrame([{
            "user_id": 0, "entity_a": 0, "entity_b": 1,
            "comparison": -1.0, "comparison_max": 1.0,
        }])
        users_df = pd.DataFrame(
            {"is_pretrusted": [True], "trust_score": [1.0]},
            index=pd.Index([0], name="user_id"),
        )
        entities_df = pd.DataFrame(index=pd.Index([0, 1], name="entity_id"))
        vouches_df = pd.DataFrame(columns=["voucher", "vouchee", "vouch"])
        judgments = DataFrameJudgments(comparisons=dummy_df)
        privacy = PrivacySettings()
        _pipeline(
            users=users_df,
            vouches=vouches_df,
            entities=entities_df,
            privacy=privacy,
            judgments=judgments,
        )
    finally:
        solidago_logger.setLevel(prev_level)
    log.info("[Scoring] Warmup complete")


def score_comparisons(
    *,
    entity_ids: list[str],
    comparisons: list[ComparisonRow],
) -> list[ScoringResult]:
    """Run Solidago on BWS comparisons and return normalized scores.

    Args:
        entity_ids: All active item slugIds for this conversation.
        comparisons: Normalized comparison rows from maxdiff_comparison table.

    Returns:
        Scored entities sorted by score descending, normalized to [0, 1].
    """
    if len(entity_ids) < 2 or not comparisons:
        return []

    # Filter comparisons to only active items
    entity_id_set = set(entity_ids)
    bws_list: list[BWSComparison] = []
    for comp in comparisons:
        if comp.best_slug_id not in entity_id_set or comp.worst_slug_id not in entity_id_set:
            continue
        filtered_set = [s for s in comp.candidate_set if s in entity_id_set]
        if len(filtered_set) < 2:
            continue
        bws_list.append(
            BWSComparison(
                user_id=comp.user_idx,
                best=comp.best_slug_id,
                worst=comp.worst_slug_id,
                candidate_set=filtered_set,
            )
        )

    if not bws_list:
        return []

    # BWS to pairwise conversion
    pairwise_wins = bws_to_pairwise(bws_comparisons=bws_list, entity_ids=entity_ids)
    log.info(
        "[Scoring] BWS: %d comparisons -> %d pairwise wins (%.1fx)",
        len(bws_list),
        len(pairwise_wins),
        len(pairwise_wins) / max(len(bws_list), 1),
    )

    if not pairwise_wins:
        return []

    # Map string IDs to ints for Solidago
    mapper = EntityIdMapper(entity_ids=entity_ids)
    solidago_comparisons = map_pairwise_wins_to_solidago(wins=pairwise_wins, mapper=mapper)
    comparisons_df = pd.DataFrame(solidago_comparisons)

    if comparisons_df.empty:
        return []

    # Build Solidago input DataFrames
    user_ids = sorted(comparisons_df["user_id"].unique())
    users_df = pd.DataFrame(
        {"is_pretrusted": [True] * len(user_ids), "trust_score": [1.0] * len(user_ids)},
        index=pd.Index(user_ids, name="user_id"),
    )
    entities_df = pd.DataFrame(index=pd.Index(mapper.all_int_ids(), name="entity_id"))
    vouches_df = pd.DataFrame(columns=["voucher", "vouchee", "vouch"])

    log.info(
        "[Scoring] Solidago: %d comparison rows, %d users, %d entities",
        len(comparisons_df),
        len(user_ids),
        len(mapper.all_int_ids()),
    )

    # Run Solidago pipeline
    judgments = DataFrameJudgments(comparisons=comparisons_df)
    privacy = PrivacySettings()
    _, _, _, global_model = _pipeline(
        users=users_df,
        vouches=vouches_df,
        entities=entities_df,
        privacy=privacy,
        judgments=judgments,
    )

    # Map back to string IDs
    solidago_scores = list(global_model.iter_entities())
    entity_scores = map_scores_from_solidago(solidago_scores=solidago_scores, mapper=mapper)

    if not entity_scores:
        return []

    # Normalize scores to [0, 1]
    raw_scores = [s.score for s in entity_scores]
    min_score = min(raw_scores)
    max_score = max(raw_scores)
    score_range = max_score - min_score

    results: list[ScoringResult] = []
    for s in entity_scores:
        normalized = 0.5 if score_range < 1e-6 else (s.score - min_score) / score_range
        results.append(
            ScoringResult(
                entity_id=s.entity_id,
                score=normalized,
                uncertainty_left=s.uncertainty_left,
                uncertainty_right=s.uncertainty_right,
            )
        )

    results.sort(key=lambda r: r.score, reverse=True)
    return results
