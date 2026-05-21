from __future__ import annotations

import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, cast

if TYPE_CHECKING:
    from valkey import Valkey

ANALYSIS_DIRTY_KEY = "analysis:dirty"
AI_DESCRIPTION_DIRTY_KEY = "analysis:ai-description:dirty"


@dataclass(frozen=True)
class DueConversation:
    conversation_id: int
    due_at_ms: int


def now_ms() -> int:
    return int(time.time() * 1000)


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


def schedule_ai_description_conversation(
    vk: Valkey, *, conversation_id: int, due_at_ms: int
) -> None:
    _schedule_conversation(
        vk,
        queue_key=AI_DESCRIPTION_DIRTY_KEY,
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


def requeue_ai_description_conversations(
    vk: Valkey, *, conversations: list[DueConversation]
) -> None:
    _requeue_conversations(
        vk,
        queue_key=AI_DESCRIPTION_DIRTY_KEY,
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


def pop_due_ai_description_conversations(
    vk: Valkey,
    *,
    count: int,
    current_time_ms: int | None = None,
) -> tuple[list[DueConversation], int | None]:
    return _pop_due_conversations(
        vk,
        queue_key=AI_DESCRIPTION_DIRTY_KEY,
        count=count,
        current_time_ms=current_time_ms,
    )


def queue_depth(vk: Valkey) -> int:
    return cast("int", vk.zcard(ANALYSIS_DIRTY_KEY))


def ai_description_queue_depth(vk: Valkey) -> int:
    return cast("int", vk.zcard(AI_DESCRIPTION_DIRTY_KEY))
