from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

type ZpopminResult = list[tuple[str, float]]


class ContentTranslationValkey(Protocol):
    def zpopmin(self, name: str, count: int) -> ZpopminResult: ...

    def zadd(self, name: str, mapping: dict[str, float]) -> int: ...

    def zcard(self, name: str) -> int: ...

    def ping(self) -> bool: ...

    def close(self) -> None: ...

DIRTY_KEY = "content-translation:dirty"


@dataclass(frozen=True)
class DirtyWorkItem:
    work_id: int
    score: float
    member: str


def zpopmin_batch(vk: ContentTranslationValkey, *, count: int) -> list[DirtyWorkItem]:
    results = vk.zpopmin(DIRTY_KEY, count)
    if not results:
        return []
    return [
        DirtyWorkItem(work_id=int(member), score=float(score), member=str(member))
        for member, score in results
    ]


def requeue(vk: ContentTranslationValkey, *, item: DirtyWorkItem) -> None:
    vk.zadd(DIRTY_KEY, {item.member: item.score})


def queue_depth(vk: ContentTranslationValkey) -> int:
    return vk.zcard(DIRTY_KEY)
