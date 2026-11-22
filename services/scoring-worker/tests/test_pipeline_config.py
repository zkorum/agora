import pytest
from pydantic import ValidationError

from scoring_worker.pipeline_config import (
    COMPARISON_RECIPE,
    MAXDIFF_PREFERENCE_LEARNING_NAME,
    PAIRWISE_PREFERENCE_LEARNING_NAME,
    ComparisonRecipe,
    create_pairwise_preference_learning,
)


def test_pipeline_config_matches_selected_preference_learning() -> None:
    pairwise_learner = create_pairwise_preference_learning()
    maxdiff_learner = COMPARISON_RECIPE.create_learner()

    assert type(pairwise_learner).__name__ == PAIRWISE_PREFERENCE_LEARNING_NAME
    assert PAIRWISE_PREFERENCE_LEARNING_NAME in {"UniformGBT", "LBFGSUniformGBT"}
    assert type(maxdiff_learner).__name__ == MAXDIFF_PREFERENCE_LEARNING_NAME
    assert COMPARISON_RECIPE.preference_learning == MAXDIFF_PREFERENCE_LEARNING_NAME
    parsed = ComparisonRecipe.model_validate(COMPARISON_RECIPE.model_dump(mode="json"))
    assert parsed == COMPARISON_RECIPE
    assert parsed.create_learner().prior_std_dev == parsed.prior_std_dev


def test_saved_recipe_parameters_build_the_learner_without_hardcoded_defaults() -> None:
    recipe = ComparisonRecipe(prior_std_dev=3.0, convergence_error=1e-4, max_iter=50)
    parsed = ComparisonRecipe.model_validate(recipe.model_dump(mode="json"))
    learner = parsed.create_learner()
    assert learner.prior_std_dev == 3.0
    assert learner.convergence_error == 1e-4
    assert learner.max_iter == 50


@pytest.mark.parametrize(
    "change",
    [
        {"user_id": "private"},
        {"choice_scale": 2},
        {"trust_score": 2},
        {"max_iter": 0},
        {"quantile": float("nan")},
    ],
)
def test_persisted_provenance_rejects_unsupported_or_invalid_context(
    change: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        ComparisonRecipe.model_validate({**COMPARISON_RECIPE.model_dump(mode="json"), **change})
