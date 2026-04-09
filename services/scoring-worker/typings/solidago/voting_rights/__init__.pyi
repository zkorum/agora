from .base import VotingRights as VotingRights
from .base import VotingRightsAssignment as VotingRightsAssignment

class AffineOvertrust(VotingRightsAssignment):
    def __init__(
        self,
        *,
        privacy_penalty: float,
        min_overtrust: float,
        overtrust_ratio: float,
    ) -> None: ...
