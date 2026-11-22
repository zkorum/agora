from importlib.metadata import version
from typing import Literal

import pandas as pd
from pydantic import BaseModel, ConfigDict, Field
from solidago.aggregation import EntitywiseQrQuantile
from solidago.pipeline import Pipeline
from solidago.post_process import NoPostProcess
from solidago.preference_learning import PreferenceLearning, UniformGBT
from solidago.scaling import NoScaling
from solidago.trust_propagation import TrustPropagation
from solidago.voting_rights import AffineOvertrust

try:
    from solidago.preference_learning import LBFGSUniformGBT
except ImportError:
    LBFGSUniformGBT = None

from scoring_worker.maxdiff_joint import CHOICE_SCALE, JointMaxDiffLearning

PAIRWISE_PREFERENCE_LEARNING_NAME = (
    "LBFGSUniformGBT" if LBFGSUniformGBT is not None else "UniformGBT"
)
# Bump when normalization or the numerical recipe changes; never reinterpret old captures.
SCORING_ALGORITHM_VERSION = 1
SOLIDAGO_VERSION = version("solidago")


class ComparisonRecipe(BaseModel):
    """Executable numerical parameters plus version-pinned descriptive provenance.

    The privacy/display labels describe Solidago behavior, not Agora policy.
    Parse persisted JSON with model_validate before using it as a replay recipe.
    """

    model_config = ConfigDict(frozen=True, extra="forbid", allow_inf_nan=False)

    preference_learning: Literal["JointMaxDiffLearning"] = "JointMaxDiffLearning"
    choice_scale: float = Field(default=CHOICE_SCALE, ge=CHOICE_SCALE, le=CHOICE_SCALE)
    prior_std_dev: float = Field(default=7.0, gt=0)
    convergence_error: float = Field(default=1e-5, gt=0)
    high_likelihood_range_threshold: float = Field(default=1.0, gt=0)
    max_iter: int = Field(default=100, gt=0)
    trust: Literal["equal"] = "equal"
    trust_score: float = Field(default=1.0, ge=1.0, le=1.0)
    is_pretrusted: Literal[True] = True
    vouches: Literal["none"] = "none"
    privacy: Literal["Solidago version defaults"] = "Solidago version defaults"
    display_scores: Literal["Solidago Squash shifted to 0-1"] = "Solidago Squash shifted to 0-1"
    voting_rights: Literal["AffineOvertrust"] = "AffineOvertrust"
    privacy_penalty: float = Field(default=0.5, ge=0)
    min_overtrust: float = Field(default=2.0, ge=0)
    overtrust_ratio: float = Field(default=0.1, ge=0)
    scaling: Literal["NoScaling"] = "NoScaling"
    aggregation: Literal["EntitywiseQrQuantile"] = "EntitywiseQrQuantile"
    quantile: float = Field(default=0.5, ge=0, le=1)
    lipschitz: float = Field(default=0.1, gt=0)
    aggregation_error: float = Field(default=1e-3, gt=0)
    post_process: Literal["NoPostProcess"] = "NoPostProcess"

    @property
    def aggregation_label(self) -> str:
        return f"{self.aggregation}(quantile={self.quantile})"

    def create_learner(self) -> JointMaxDiffLearning:
        return JointMaxDiffLearning(
            prior_std_dev=self.prior_std_dev,
            convergence_error=self.convergence_error,
            high_likelihood_range_threshold=self.high_likelihood_range_threshold,
            max_iter=self.max_iter,
        )

    def create_pipeline(self, *, learner: PreferenceLearning | None = None) -> Pipeline:
        return Pipeline(
            trust_propagation=_IdentityTrustPropagation(),
            preference_learning=self.create_learner() if learner is None else learner,
            voting_rights=AffineOvertrust(
                privacy_penalty=self.privacy_penalty,
                min_overtrust=self.min_overtrust,
                overtrust_ratio=self.overtrust_ratio,
            ),
            scaling=NoScaling(),
            aggregation=EntitywiseQrQuantile(
                quantile=self.quantile, lipschitz=self.lipschitz, error=self.aggregation_error
            ),
            post_process=NoPostProcess(),
        )


COMPARISON_RECIPE = ComparisonRecipe()
MAXDIFF_PREFERENCE_LEARNING_NAME = COMPARISON_RECIPE.preference_learning


class _IdentityTrustPropagation(TrustPropagation):
    """Solidago interface: preserve the supplied equal or evaluation-only weights."""

    def __call__(self, users: pd.DataFrame, vouches: pd.DataFrame) -> pd.DataFrame:
        return users


def create_pairwise_preference_learning() -> PreferenceLearning:
    if LBFGSUniformGBT is None:
        return UniformGBT(
            prior_std_dev=COMPARISON_RECIPE.prior_std_dev,
            convergence_error=COMPARISON_RECIPE.convergence_error,
        )
    return LBFGSUniformGBT(
        prior_std_dev=COMPARISON_RECIPE.prior_std_dev,
        convergence_error=COMPARISON_RECIPE.convergence_error,
    )
