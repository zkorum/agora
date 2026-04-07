from scoring_worker.pipeline_config import PIPELINE_CONFIG, create_preference_learning


def test_pipeline_config_matches_selected_preference_learning() -> None:
    learner = create_preference_learning()

    assert PIPELINE_CONFIG["preference_learning"] == type(learner).__name__
    assert PIPELINE_CONFIG["preference_learning"] in {"UniformGBT", "LBFGSUniformGBT"}
