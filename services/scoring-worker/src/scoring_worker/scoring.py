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
from solidago.privacy_settings import PrivacySettings
from solidago.scaling import NoScaling
from solidago.trust_propagation import TrustPropagation
from solidago.voting_rights import AffineOvertrust
from solidago.voting_rights.base import VotingRights, VotingRightsAssignment

from scoring_worker.bws_conversion import BWSComparison, bws_to_pairwise
from scoring_worker.cocm_voting import COCMVotingRights, GroupSource
from scoring_worker.entity_mapping import (
    EntityIdMapper,
    SolidagoEntityScore,
    map_pairwise_wins_to_solidago,
    map_scores_from_solidago,
)
from scoring_worker.pipeline_config import PIPELINE_CONFIG, create_preference_learning

if TYPE_CHECKING:
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
    """Solidago VotingRightsAssignment backed by COCM.

    Uses group membership data to attenuate connected voters.
    Trust scores from the users DataFrame are preserved and used
    as the base weight before COCM attenuation:
        voting_right = trust_score / sqrt(1 + connected_co_scorers)
    """

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

        # Determine which users scored each entity
        entity_to_users: dict[int, set[int]] = {entity_id: set() for entity_id in entities.index}
        if user_models is None:
            for entity_id in privacy.entities():
                entity_to_users[entity_id] = privacy.users(entity_id)
        else:
            for user_id, model in user_models.items():
                for entity_id in model.scored_entities():
                    entity_to_users[entity_id].add(user_id)

        trust_scores_series = users["trust_score"]
        all_user_ids = list(users.index)
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

    def to_json(self):
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
    voting_rights: VotingRightsAssignment | None = None,
) -> Pipeline:
    return Pipeline(
        trust_propagation=_IdentityTrustPropagation(),
        preference_learning=create_preference_learning(),
        voting_rights=voting_rights or _DEFAULT_VOTING_RIGHTS,
        scaling=NoScaling(),
        aggregation=EntitywiseQrQuantile(quantile=0.5, lipschitz=0.1, error=1e-3),
        post_process=NoPostProcess(),
    )


# Default pipeline (no COCM), reused across scoring calls
_default_pipeline = _create_pipeline()


@dataclass(frozen=True)
class ScoringResult:
    entity_id: str
    score: float  # normalized 0-1
    uncertainty_left: float
    uncertainty_right: float


@dataclass(frozen=True)
class ConversationScoringOutput:
    global_scores: list[ScoringResult]
    user_scores: dict[int, list[ScoringResult]]  # user_idx → per-entity scores


def warmup() -> None:
    """Run a tiny dummy scoring to initialize the configured Solidago pipeline.

    Prevents first real call from timing out due to lazy init.
    """
    log.info(
        "[Scoring] Warming up Solidago pipeline (%s)...",
        PIPELINE_CONFIG["preference_learning"],
    )
    # Suppress Solidago's verbose pipeline logs during warmup
    solidago_logger = logging.getLogger("solidago")
    prev_level = solidago_logger.level
    solidago_logger.setLevel(logging.WARNING)
    try:
        dummy_df = pd.DataFrame(
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
        users_df = pd.DataFrame(
            {"is_pretrusted": [True], "trust_score": [1.0]},
            index=pd.Index([0], name="user_id"),
        )
        entities_df = pd.DataFrame(index=pd.Index([0, 1], name="entity_id"))
        vouches_df = pd.DataFrame(columns=["voucher", "vouchee", "vouch"])
        judgments = DataFrameJudgments(comparisons=dummy_df)
        privacy = PrivacySettings()
        _default_pipeline(
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
    trust_scores: dict[int, float] | None = None,
    group_sources: list[GroupSource] | None = None,
) -> ConversationScoringOutput | None:
    """Run Solidago on BWS comparisons and return global + per-user scores.

    Args:
        entity_ids: All active item slugIds for this conversation.
        comparisons: Normalized comparison rows from maxdiff_comparison table.
        trust_scores: Optional per-user trust (keyed by user_idx). Defaults to 1.0 for all.
        group_sources: Optional group memberships for COCM voting rights.
            When provided, uses COCM attenuation instead of AffineOvertrust.

    Returns:
        ConversationScoringOutput with global and per-user scores, or None if not enough data.
    """
    if len(entity_ids) < 2 or not comparisons:
        return None

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
        return None

    # BWS to pairwise conversion
    pairwise_wins = bws_to_pairwise(bws_comparisons=bws_list, entity_ids=entity_ids)
    log.info(
        "[Scoring] BWS: %d comparisons -> %d pairwise wins (%.1fx)",
        len(bws_list),
        len(pairwise_wins),
        len(pairwise_wins) / max(len(bws_list), 1),
    )

    if not pairwise_wins:
        return None

    # Map string IDs to ints for Solidago
    mapper = EntityIdMapper(entity_ids=entity_ids)
    solidago_comparisons = map_pairwise_wins_to_solidago(wins=pairwise_wins, mapper=mapper)
    comparisons_df = pd.DataFrame(solidago_comparisons)

    if comparisons_df.empty:
        return None

    # Build Solidago input DataFrames
    user_ids = sorted(comparisons_df["user_id"].unique())
    user_trust = [
        trust_scores.get(int(uid), 1.0) if trust_scores is not None else 1.0 for uid in user_ids
    ]
    users_df = pd.DataFrame(
        {"is_pretrusted": [True] * len(user_ids), "trust_score": user_trust},
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

    # Select pipeline: COCM if group_sources provided, otherwise default (AffineOvertrust)
    if group_sources is not None and len(group_sources) > 0:
        pipeline = _create_pipeline(
            voting_rights=_COCMVotingRightsAssignment(group_sources=group_sources),
        )
        log.info("[Scoring] Using COCM voting rights (%d group sources)", len(group_sources))
    else:
        pipeline = _default_pipeline

    # Run Solidago pipeline
    judgments = DataFrameJudgments(comparisons=comparisons_df)
    privacy = PrivacySettings()
    _, _, user_models, global_model = pipeline(
        users=users_df,
        vouches=vouches_df,
        entities=entities_df,
        privacy=privacy,
        judgments=judgments,
    )

    # --- Global scores ---
    solidago_scores = list(global_model.iter_entities())
    entity_scores = map_scores_from_solidago(solidago_scores=solidago_scores, mapper=mapper)

    if not entity_scores:
        return None

    global_results = _normalize_scores(entity_scores)

    # --- Per-user scores ---
    per_user_results: dict[int, list[ScoringResult]] = {}
    for solidago_user_id, user_model in user_models.items():
        user_solidago_scores = list(user_model.iter_entities())
        user_entity_scores = map_scores_from_solidago(
            solidago_scores=user_solidago_scores,
            mapper=mapper,
        )
        if user_entity_scores:
            per_user_results[int(solidago_user_id)] = _normalize_scores(user_entity_scores)

    return ConversationScoringOutput(
        global_scores=global_results,
        user_scores=per_user_results,
    )


def _normalize_scores(
    entity_scores: list[SolidagoEntityScore],
) -> list[ScoringResult]:
    """Normalize raw Solidago scores to [0, 1] and sort descending."""
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
