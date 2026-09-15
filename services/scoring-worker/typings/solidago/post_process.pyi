from collections.abc import Mapping

from solidago.scoring_model import ScoringModel

class NoPostProcess:
    def __init__(self) -> None: ...

class Squash:
    def __init__(self, score_max: float = 100.0) -> None: ...
    def __call__(
        self,
        user_models: Mapping[int, ScoringModel],
        global_model: ScoringModel,
    ) -> tuple[Mapping[int, ScoringModel], ScoringModel]: ...
