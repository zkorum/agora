from scoring_worker.pipeline_config import (
    MAXDIFF_PREFERENCE_LEARNING_NAME,
    PAIRWISE_PREFERENCE_LEARNING_NAME,
    PIPELINE_CONFIG,
    create_maxdiff_preference_learning,
    create_pairwise_preference_learning,
)


def test_pipeline_config_matches_selected_preference_learning() -> None:
    pairwise_learner = create_pairwise_preference_learning()
    maxdiff_learner = create_maxdiff_preference_learning()

    assert type(pairwise_learner).__name__ == PAIRWISE_PREFERENCE_LEARNING_NAME
    assert PAIRWISE_PREFERENCE_LEARNING_NAME in {"UniformGBT", "LBFGSUniformGBT"}
    assert type(maxdiff_learner).__name__ == MAXDIFF_PREFERENCE_LEARNING_NAME
    assert PIPELINE_CONFIG["preference_learning"] == MAXDIFF_PREFERENCE_LEARNING_NAME
