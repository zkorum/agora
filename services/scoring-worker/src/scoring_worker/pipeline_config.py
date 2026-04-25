from solidago.preference_learning import PreferenceLearning, UniformGBT

try:
    from solidago.preference_learning import LBFGSUniformGBT
except ImportError:
    LBFGSUniformGBT = None


from scoring_worker.maxdiff_sequential import SequentialMaxDiffLearning

PAIRWISE_PREFERENCE_LEARNING_NAME = (
    "LBFGSUniformGBT" if LBFGSUniformGBT is not None else "UniformGBT"
)
MAXDIFF_PREFERENCE_LEARNING_NAME = "SequentialMaxDiffLearning"

PIPELINE_CONFIG = {
    "preference_learning": MAXDIFF_PREFERENCE_LEARNING_NAME,
    "voting_rights": "AffineOvertrust",
    "aggregation": "EntitywiseQrQuantile(quantile=0.5)",
}


def create_pairwise_preference_learning() -> PreferenceLearning:
    if LBFGSUniformGBT is None:
        return UniformGBT(
            prior_std_dev=7.0,
            convergence_error=1e-5,
        )

    return LBFGSUniformGBT(
        prior_std_dev=7.0,
        convergence_error=1e-5,
    )


def create_maxdiff_preference_learning() -> PreferenceLearning:
    return SequentialMaxDiffLearning(
        prior_std_dev=7.0,
        convergence_error=1e-5,
        high_likelihood_range_threshold=1.0,
        max_iter=100,
    )
