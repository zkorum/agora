from scoring_worker.db import ComparisonRow, checkpoint_milestones_at_or_below
from scoring_worker.valkey_client import DirtyConversation
from scoring_worker.worker import build_participant_counts, deduplicate_batch


def test_deduplicate_batch_prefers_highest_weight_per_conversation() -> None:
    batch = [
        DirtyConversation(
            conversation_id=1,
            slug_id="reconciled",
            weight=0,
            member="1:reconciled",
        ),
        DirtyConversation(
            conversation_id=2,
            slug_id="second",
            weight=1,
            member="2:second",
        ),
        DirtyConversation(
            conversation_id=1,
            slug_id="first",
            weight=4,
            member="1:first",
        ),
    ]

    deduplicated = deduplicate_batch(batch)

    assert deduplicated == [batch[2], batch[1]]


def test_checkpoint_milestones_match_polis_sequence() -> None:
    assert checkpoint_milestones_at_or_below(count=1, seeds=(2,)) == []
    assert checkpoint_milestones_at_or_below(count=2, seeds=(2,)) == [2]
    assert checkpoint_milestones_at_or_below(count=249, seeds=(2,)) == [
        2,
        10,
        25,
        50,
        100,
    ]
    assert checkpoint_milestones_at_or_below(count=250, seeds=()) == [
        10,
        25,
        50,
        100,
        250,
    ]


def test_participant_counts_exclude_invalid_or_inactive_comparisons() -> None:
    comparisons = [
        ComparisonRow(
            best_slug_id="active-a",
            worst_slug_id="active-b",
            candidate_set=["active-a", "active-b", "inactive"],
            user_idx=1,
        ),
        ComparisonRow(
            best_slug_id="active-a",
            worst_slug_id="inactive",
            candidate_set=["active-a", "active-b", "inactive"],
            user_idx=2,
        ),
    ]

    assert build_participant_counts(
        comparisons,
        entity_ids=["active-a", "active-b"],
    ) == {"active-a": 1, "active-b": 1}
