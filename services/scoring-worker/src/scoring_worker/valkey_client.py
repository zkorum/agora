"""Valkey operations: weighted dirty set via Sorted Set (ZADD / ZPOPMIN).

Score = comparison count (proxy for Solidago runtime).
ZPOPMIN grabs lightest conversations first (lowest latency for users).
ZADD deduplicates by member and always updates the score.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from valkey import Valkey

# Valkey key name (must match valkeyQueues.ts SCORING_DIRTY_SOLIDAGO)
DIRTY_KEY = "scoring:dirty:solidago"


def mark_dirty(vk: Valkey, *, member: str, weight: int) -> None:
    """Add/update a conversation in the dirty sorted set.

    Member format: "convId:slugId".
    Score = comparison count. Always overwrites (users can undo comparisons,
    reducing the count). Dedup: ZADD on existing member updates the score.
    """
    vk.zadd(DIRTY_KEY, {member: weight})


@dataclass(frozen=True)
class DirtyConversation:
    conversation_id: int
    slug_id: str
    weight: int
    member: str  # original member string for re-adding on failure


def zpopmin_batch(vk: Valkey, *, count: int) -> list[DirtyConversation]:
    """Atomically grab up to `count` lightest conversations.

    ZPOPMIN removes and returns members with the lowest scores.
    Lightest-first = fastest to process = lowest user-facing latency.

    Member format: "convId:slugId" (set by API's ZADD).
    """
    results = vk.zpopmin(DIRTY_KEY, count)
    if not results:
        return []
    batch: list[DirtyConversation] = []
    for member_str, score in results:
        parts = str(member_str).split(":", 1)
        conv_id = int(parts[0])
        slug_id = parts[1] if len(parts) > 1 else "unknown"
        batch.append(DirtyConversation(
            conversation_id=conv_id,
            slug_id=slug_id,
            weight=int(score),
            member=str(member_str),
        ))
    return batch


def queue_depth(vk: Valkey) -> int:
    """Number of conversations waiting to be scored (O(1)).

    Used for monitoring and future autoscaling decisions.
    """
    return vk.zcard(DIRTY_KEY)
