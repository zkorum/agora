from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, cast

if TYPE_CHECKING:
    from collections.abc import Sequence

    from valkey import Valkey

ANALYSIS_DIRTY_KEY = "analysis:dirty"


@dataclass(frozen=True)
class DueConversation:
    conversation_id: int
    due_at_ms: int


def now_ms() -> int:
    return int(time.time() * 1000)


def datetime_to_epoch_ms(value: datetime) -> int:
    normalized = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    return int(normalized.timestamp() * 1000)


def format_queue_lag_ms(conversations: Sequence[DueConversation], *, current_time_ms: int) -> str:
    if not conversations:
        return "min=0 avg=0.0 max=0"
    lag_values = [max(0, current_time_ms - item.due_at_ms) for item in conversations]
    average_lag_ms = sum(lag_values) / len(lag_values)
    return f"min={min(lag_values)} avg={average_lag_ms:.1f} max={max(lag_values)}"


def _schedule_conversation(
    vk: Valkey, *, queue_key: str, conversation_id: int, due_at_ms: int
) -> None:
    vk.zadd(queue_key, {str(conversation_id): due_at_ms})


def schedule_conversation(vk: Valkey, *, conversation_id: int, due_at_ms: int) -> None:
    _schedule_conversation(
        vk,
        queue_key=ANALYSIS_DIRTY_KEY,
        conversation_id=conversation_id,
        due_at_ms=due_at_ms,
    )


def _requeue_conversations(
    vk: Valkey, *, queue_key: str, conversations: list[DueConversation]
) -> None:
    if not conversations:
        return
    vk.zadd(
        queue_key,
        {str(item.conversation_id): item.due_at_ms for item in conversations},
    )


def requeue_conversations(vk: Valkey, *, conversations: list[DueConversation]) -> None:
    _requeue_conversations(
        vk,
        queue_key=ANALYSIS_DIRTY_KEY,
        conversations=conversations,
    )


def _pop_due_conversations(
    vk: Valkey,
    *,
    queue_key: str,
    count: int,
    current_time_ms: int | None = None,
) -> tuple[list[DueConversation], int | None]:
    current_ms = current_time_ms if current_time_ms is not None else now_ms()
    raw_items = cast("list[tuple[str, float]]", vk.zpopmin(queue_key, count))
    if not raw_items:
        return [], None

    due: list[DueConversation] = []
    future: list[DueConversation] = []
    next_due_at_ms: int | None = None

    for member, score in raw_items:
        item = DueConversation(conversation_id=int(str(member)), due_at_ms=int(score))
        if item.due_at_ms <= current_ms:
            due.append(item)
        else:
            future.append(item)
            if next_due_at_ms is None or item.due_at_ms < next_due_at_ms:
                next_due_at_ms = item.due_at_ms

    _requeue_conversations(vk, queue_key=queue_key, conversations=future)
    return due, next_due_at_ms


def pop_due_conversations(
    vk: Valkey,
    *,
    count: int,
    current_time_ms: int | None = None,
) -> tuple[list[DueConversation], int | None]:
    return _pop_due_conversations(
        vk,
        queue_key=ANALYSIS_DIRTY_KEY,
        count=count,
        current_time_ms=current_time_ms,
    )


def queue_depth(vk: Valkey) -> int:
    return cast("int", vk.zcard(ANALYSIS_DIRTY_KEY))
