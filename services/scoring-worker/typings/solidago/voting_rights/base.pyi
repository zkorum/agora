from pandas import DataFrame

from ..privacy_settings import PrivacySettings
from ..scoring_model import ScoringModel

class VotingRights:
    def __setitem__(self, key: tuple[int, int], value: float) -> None: ...

class VotingRightsAssignment:
    def __call__(
        self,
        users: DataFrame,
        entities: DataFrame,
        vouches: DataFrame,
        privacy: PrivacySettings,
        user_models: dict[int, ScoringModel] | None,
    ) -> tuple[VotingRights, DataFrame]: ...
    def to_json(self) -> tuple[str, dict[str, object]]: ...
    def __str__(self) -> str: ...
