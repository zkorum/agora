from solidago.preference_learning import PreferenceLearning, UniformGBT

try:
    from solidago.preference_learning import LBFGSUniformGBT
except ImportError:
    LBFGSUniformGBT = None


PREFERENCE_LEARNING_NAME = "LBFGSUniformGBT" if LBFGSUniformGBT is not None else "UniformGBT"

PIPELINE_CONFIG = {
    "preference_learning": PREFERENCE_LEARNING_NAME,
    "voting_rights": "AffineOvertrust",
    "aggregation": "EntitywiseQrQuantile(quantile=0.5)",
}


def create_preference_learning() -> PreferenceLearning:
    if LBFGSUniformGBT is None:
        return UniformGBT(
            prior_std_dev=7.0,
            convergence_error=1e-5,
        )

    return LBFGSUniformGBT(
        prior_std_dev=7.0,
        convergence_error=1e-5,
    )
