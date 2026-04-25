class PreferenceLearning: ...

class UniformGBT(PreferenceLearning):
    def __init__(
        self,
        *,
        prior_std_dev: float,
        convergence_error: float,
    ) -> None: ...

class LBFGSUniformGBT(PreferenceLearning):
    def __init__(
        self,
        *,
        prior_std_dev: float,
        convergence_error: float,
    ) -> None: ...
