"""Fixed-scale display scores using Solidago's published post-processing step."""

from __future__ import annotations

from typing import TYPE_CHECKING

from solidago.post_process import Squash
from solidago.scoring_model import DirectScoringModel

if TYPE_CHECKING:
    from collections.abc import Mapping


def squash_display_scores(raw_scores: Mapping[int, float]) -> dict[int, float]:
    """Return 0-1 display values, without changing raw scores or their ordering.

    Solidago's Squash maps to (-1, 1) with score_max=1. Shift that fixed scale
    to (0, 1); UI percentages represent this scale, not vote percentages.
    Uncertainty remains a separate model output.
    """
    model = DirectScoringModel()
    for entity_id, score in raw_scores.items():
        model[entity_id] = (score, 0.0, 0.0)
    _, displayed = Squash(score_max=1.0)(user_models={}, global_model=model)
    return {
        entity_id: (float(score) + 1.0) / 2.0
        for entity_id, (score, _, _) in displayed.iter_entities()
    }
