from collections.abc import Iterable
from typing import Any

class ScoringModel:
    def __call__(
        self,
        entity_id: int,
        entity_features: Any | None = ...,
    ) -> tuple[float, float, float] | None: ...
    def scored_entities(self, entities: Any | None = ...) -> set[int]: ...
    def iter_entities(
        self,
        entities: Any | None = ...,
    ) -> Iterable[tuple[int, tuple[float, float, float]]]: ...

class DirectScoringModel(ScoringModel):
    def __getitem__(self, entity_id: int) -> tuple[float, float, float] | None: ...
    def __setitem__(self, entity_id: int, value: tuple[float, float, float]) -> None: ...
