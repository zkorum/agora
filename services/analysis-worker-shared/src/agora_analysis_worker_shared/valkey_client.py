from __future__ import annotations

import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, cast

if TYPE_CHECKING:
    from collections.abc import Sequence

    from valkey import Valkey

ANALYSIS_DIRTY_KEY = "analysis:dirty"


@dataclass(frozen=True)
class QueuedConversation:
    conversation_id: int
    enqueued_at_ms: int


def now_ms() -> int:
    return int(time.time() * 1000)


def format_queue_lag_ms(
    conversations: Sequence[QueuedConversation], *, current_time_ms: int
) -> str:
    if not conversations:
        return "min=0 avg=0.0 max=0"
    lag_values = [max(0, current_time_ms - item.enqueued_at_ms) for item in conversations]
    average_lag_ms = sum(lag_values) / len(lag_values)
    return f"min={min(lag_values)} avg={average_lag_ms:.1f} max={max(lag_values)}"


def _enqueue_conversation(
    vk: Valkey, *, queue_key: str, conversation_id: int, enqueued_at_ms: int
) -> None:
    vk.zadd(queue_key, {str(conversation_id): enqueued_at_ms}, nx=True)


def enqueue_conversation(
    vk: Valkey, *, conversation_id: int, enqueued_at_ms: int
) -> None:
    _enqueue_conversation(
        vk,
        queue_key=ANALYSIS_DIRTY_KEY,
        conversation_id=conversation_id,
        enqueued_at_ms=enqueued_at_ms,
    )


def _requeue_conversations(
    vk: Valkey, *, queue_key: str, conversations: list[QueuedConversation]
) -> None:
    if not conversations:
        return
    vk.zadd(
        queue_key,
        {str(item.conversation_id): item.enqueued_at_ms for item in conversations},
    )


def requeue_conversations(vk: Valkey, *, conversations: list[QueuedConversation]) -> None:
    _requeue_conversations(
        vk,
        queue_key=ANALYSIS_DIRTY_KEY,
        conversations=conversations,
    )


def _pop_conversations(
    vk: Valkey,
    *,
    queue_key: str,
    count: int,
) -> list[QueuedConversation]:
    raw_items = cast("list[tuple[str, float]]", vk.zpopmin(queue_key, count))
    return [
        QueuedConversation(conversation_id=int(str(member)), enqueued_at_ms=int(score))
        for member, score in raw_items
    ]


def pop_conversations(
    vk: Valkey,
    *,
    count: int,
) -> list[QueuedConversation]:
    return _pop_conversations(
        vk,
        queue_key=ANALYSIS_DIRTY_KEY,
        count=count,
    )


def queue_depth(vk: Valkey) -> int:
    return cast("int", vk.zcard(ANALYSIS_DIRTY_KEY))
