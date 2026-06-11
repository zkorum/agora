from __future__ import annotations

import json
from uuid import UUID

import zstandard as zstd

from agora_analysis_worker_shared.input_snapshot import (
    VoteInputRow,
    canonical_json_bytes,
    prepare_input_snapshot,
    prepare_input_snapshots_batch,
)

USER_A = UUID("00000000-0000-0000-0000-00000000000a")
USER_B = UUID("00000000-0000-0000-0000-00000000000b")


def test_prepare_input_snapshot_uses_local_indexes_only() -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=3,
        rows=[
            VoteInputRow(
                conversation_id=10,
                data_generation=3,
                user_id=USER_B,
                opinion_id=200,
                opinion_content_id=2000,
                vote="disagree",
            ),
            VoteInputRow(
                conversation_id=10,
                data_generation=3,
                user_id=USER_A,
                opinion_id=100,
                opinion_content_id=1000,
                vote="agree",
            ),
        ],
    )

    raw_payload = zstd.ZstdDecompressor().decompress(snapshot.payload)
    payload = json.loads(raw_payload.decode("utf-8"))

    assert payload == {
        "schema_version": 1,
        "conversation_id": 10,
        "data_generation": 3,
        "opinion_count": 2,
        "participant_count": 2,
        "votes": [
            {"participant_index": 0, "opinion_index": 0, "vote": 1},
            {"participant_index": 1, "opinion_index": 1, "vote": -1},
        ],
    }
    assert "00000000" not in raw_payload.decode("utf-8")
    assert "1000" not in raw_payload.decode("utf-8")


def test_prepare_empty_input_snapshot_for_insufficient_data() -> None:
    snapshots = prepare_input_snapshots_batch(
        data_generation_by_conversation_id={10: 4},
        rows_by_conversation_id={10: []},
    )

    snapshot = snapshots[10]
    assert snapshot.canonical_payload["opinion_count"] == 0
    assert snapshot.canonical_payload["participant_count"] == 0
    assert snapshot.canonical_payload["votes"] == []


def test_canonical_json_bytes_are_stable() -> None:
    left = canonical_json_bytes({"b": 1, "a": [2, 3]})
    right = canonical_json_bytes({"a": [2, 3], "b": 1})

    assert left == right
