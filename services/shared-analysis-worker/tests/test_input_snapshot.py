from __future__ import annotations

import json
from dataclasses import replace
from uuid import UUID

import pytest
import zstandard as zstd
from pydantic import TypeAdapter

from agora_analysis_worker_shared.input_snapshot import (
    OpinionInputRow,
    VoteInputRow,
    canonical_json_bytes,
    prepare_input_snapshot,
)

USER_A = UUID("00000000-0000-0000-0000-00000000000a")
USER_B = UUID("00000000-0000-0000-0000-00000000000b")


def test_prepare_input_snapshot_uses_local_participant_indexes_and_content_free_catalogue() -> None:
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
        "schema_version": 2,
        "conversation_id": 10,
        "data_generation": 3,
        "opinion_count": 2,
        "participant_count": 2,
        "opinions": [
            {"opinion_id": 100, "opinion_content_id": 1000},
            {"opinion_id": 200, "opinion_content_id": 2000},
        ],
        "votes": [
            {"participant_index": 0, "opinion_index": 0, "vote": 1},
            {"participant_index": 1, "opinion_index": 1, "vote": -1},
        ],
    }
    assert "00000000" not in raw_payload.decode("utf-8")


def test_prepare_empty_input_snapshot_for_insufficient_data() -> None:
    snapshot = prepare_input_snapshot(conversation_id=10, data_generation=4, rows=[])
    payload = TypeAdapter(dict[str, object]).validate_json(
        zstd.ZstdDecompressor().decompress(snapshot.payload)
    )
    assert payload["opinion_count"] == 0
    assert payload["participant_count"] == 0
    assert payload["votes"] == []


def test_canonical_json_bytes_are_stable() -> None:
    left = canonical_json_bytes({"b": 1, "a": [2, 3]})
    right = canonical_json_bytes({"a": [2, 3], "b": 1})

    assert left == right


def test_explicit_catalogue_retains_unvoted_opinions_without_inventing_participants() -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=10,
        data_generation=3,
        rows=[],
        opinion_rows=[
            OpinionInputRow(
                conversation_id=10, data_generation=3, opinion_id=100, opinion_content_id=1000
            )
        ],
    )
    assert snapshot.participant_count == 0
    assert snapshot.votes == []
    assert len(snapshot.opinions) == 1
    payload = TypeAdapter(dict[str, object]).validate_json(
        zstd.ZstdDecompressor().decompress(snapshot.payload)
    )
    assert payload["opinions"] == [{"opinion_id": 100, "opinion_content_id": 1000}]


@pytest.mark.parametrize("damage", ["conversation", "generation", "catalogue", "version", "choice"])
def test_input_preparation_rejects_inconsistent_capture(damage: str) -> None:
    vote = VoteInputRow(
        conversation_id=10,
        data_generation=3,
        user_id=USER_A,
        opinion_id=100,
        opinion_content_id=1000,
        vote="agree",
    )
    opinion = OpinionInputRow(
        conversation_id=10, data_generation=3, opinion_id=100, opinion_content_id=1000
    )
    if damage == "conversation":
        vote = replace(vote, conversation_id=11)
    elif damage == "generation":
        opinion = replace(opinion, data_generation=4)
    elif damage == "catalogue":
        opinion = replace(opinion, opinion_id=101)
    elif damage == "version":
        vote = replace(vote, opinion_content_id=1001)
    else:
        vote = replace(vote, vote="not-a-choice")
    with pytest.raises(ValueError, match=r"Analysis|analysis"):
        prepare_input_snapshot(
            conversation_id=10, data_generation=3, rows=[vote], opinion_rows=[opinion]
        )
