from pandas import DataFrame

from .judgments import Judgments
from .privacy_settings import PrivacySettings
from .scoring_model import ScoringModel
from .trust_propagation import TrustPropagation
from .voting_rights.base import VotingRightsAssignment

class Pipeline:
    def __init__(
        self,
        *,
        trust_propagation: TrustPropagation,
        preference_learning: object,
        voting_rights: VotingRightsAssignment,
        scaling: object,
        aggregation: object,
        post_process: object,
    ) -> None: ...
    def __call__(
        self,
        *,
        users: DataFrame,
        vouches: DataFrame,
        entities: DataFrame,
        privacy: PrivacySettings,
        judgments: Judgments,
    ) -> tuple[object, object, dict[int, ScoringModel], ScoringModel]: ...
