from pandas import DataFrame

class Judgments:
    def __getitem__(self, user: int) -> dict[str, DataFrame] | None: ...

class DataFrameJudgments(Judgments):
    def __init__(self, *, comparisons: DataFrame) -> None: ...
