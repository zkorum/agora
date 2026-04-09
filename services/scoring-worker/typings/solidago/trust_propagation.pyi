from pandas import DataFrame

class TrustPropagation:
    def __call__(self, users: DataFrame, vouches: DataFrame) -> DataFrame: ...
