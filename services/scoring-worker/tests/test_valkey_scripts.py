"""Integration tests for the scoring worker's dirty queue contract."""

from __future__ import annotations

from typing import TYPE_CHECKING

from scoring_worker.valkey_client import DirtyConversation, mark_dirty, queue_depth, zpopmin_batch

if TYPE_CHECKING:
    import valkey as valkey_lib


def test_marking_dirty_again_replaces_weight_after_a_comparison_is_undone(
    vk: valkey_lib.Valkey,
) -> None:
    mark_dirty(vk, member="42:project-vote", weight=10)
    mark_dirty(vk, member="42:project-vote", weight=3)

    assert queue_depth(vk) == 1
    assert zpopmin_batch(vk, count=1) == [
        DirtyConversation(
            conversation_id=42, slug_id="project-vote", weight=3, member="42:project-vote"
        )
    ]
    assert queue_depth(vk) == 0


def test_popping_a_bounded_batch_leaves_heavier_work_queued(vk: valkey_lib.Valkey) -> None:
    mark_dirty(vk, member="1:heavier", weight=100)
    mark_dirty(vk, member="2:lighter", weight=5)
    mark_dirty(vk, member="3:lightest", weight=1)

    assert [item.slug_id for item in zpopmin_batch(vk, count=2)] == ["lightest", "lighter"]
    assert queue_depth(vk) == 1
    assert [item.slug_id for item in zpopmin_batch(vk, count=2)] == ["heavier"]
    assert zpopmin_batch(vk, count=2) == []
