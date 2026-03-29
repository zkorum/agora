"""Tests for Valkey sorted set operations used by the scoring worker.

Only tests the critical behaviors of our wrapper functions,
not Valkey's sorted set implementation itself.

Run with: uv run pytest tests/test_valkey_scripts.py -v
Podman users: see tests/conftest.py for DOCKER_HOST setup.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import valkey as valkey_lib

from scoring_worker.valkey_client import (
    mark_dirty,
    queue_depth,
    zpopmin_batch,
)


def _mark(vk: valkey_lib.Valkey, conv_id: int, weight: int) -> None:
    """Helper: mark_dirty with member format matching API ("convId:slugId")."""
    mark_dirty(vk, member=f"{conv_id}:slug{conv_id}", weight=weight)


class TestMarkDirtyDedup:
    """ZADD dedup: same member updated, not duplicated."""

    def test_second_zadd_updates_score_not_count(self, vk: valkey_lib.Valkey):
        _mark(vk, conv_id=42, weight=5)
        _mark(vk, conv_id=42, weight=10)
        assert queue_depth(vk) == 1

    def test_score_decreases_on_undo(self, vk: valkey_lib.Valkey):
        """Users can undo comparisons, reducing the count."""
        _mark(vk, conv_id=42, weight=10)
        _mark(vk, conv_id=42, weight=3)
        batch = zpopmin_batch(vk, count=1)
        assert batch[0].weight == 3


class TestZpopminBatch:
    """ZPOPMIN: lightest first, up to N, atomic, preserves weights + slugId."""

    def test_lightest_first(self, vk: valkey_lib.Valkey):
        _mark(vk, conv_id=1, weight=1000)
        _mark(vk, conv_id=2, weight=5)
        _mark(vk, conv_id=3, weight=500)
        batch = zpopmin_batch(vk, count=3)
        assert [item.conversation_id for item in batch] == [2, 3, 1]

    def test_preserves_weight_and_slug(self, vk: valkey_lib.Valkey):
        _mark(vk, conv_id=42, weight=150)
        batch = zpopmin_batch(vk, count=1)
        assert batch[0].conversation_id == 42
        assert batch[0].slug_id == "slug42"
        assert batch[0].weight == 150

    def test_returns_up_to_count(self, vk: valkey_lib.Valkey):
        _mark(vk, conv_id=1, weight=1)
        _mark(vk, conv_id=2, weight=2)
        _mark(vk, conv_id=3, weight=3)
        batch = zpopmin_batch(vk, count=2)
        assert [item.conversation_id for item in batch] == [1, 2]
        assert queue_depth(vk) == 1

    def test_empty_returns_empty_list(self, vk: valkey_lib.Valkey):
        assert zpopmin_batch(vk, count=10) == []

    def test_parallel_zpopmin_no_overlap(self, vk: valkey_lib.Valkey):
        """Two ZPOPMIN calls get disjoint sets (simulates two workers)."""
        for i in range(6):
            _mark(vk, conv_id=i, weight=i)
        batch_a = zpopmin_batch(vk, count=3)
        batch_b = zpopmin_batch(vk, count=3)
        ids_a = {item.conversation_id for item in batch_a}
        ids_b = {item.conversation_id for item in batch_b}
        assert len(ids_a) == 3
        assert len(ids_b) == 3
        assert ids_a.isdisjoint(ids_b)
