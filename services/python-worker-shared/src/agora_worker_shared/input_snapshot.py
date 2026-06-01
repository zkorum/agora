from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import zstandard as zstd

if TYPE_CHECKING:
    from uuid import UUID


@dataclass(frozen=True)
class VoteInputRow:
    conversation_id: int
    data_generation: int
    user_id: UUID
    opinion_id: int
    opinion_content_id: int
    vote: str


@dataclass(frozen=True)
class SnapshotOpinion:
    opinion_id: int
    opinion_content_id: int
    local_opinion_index: int


@dataclass(frozen=True)
class SnapshotParticipant:
    user_id: UUID
    local_participant_index: int


@dataclass(frozen=True)
class SnapshotVote:
    local_participant_index: int
    local_opinion_index: int
    vote: int


@dataclass(frozen=True)
class PreparedInputSnapshot:
    conversation_id: int
    data_generation: int
    input_hash: str
    compression: str
    payload: bytes
    canonical_payload: dict[str, Any]
    opinions: list[SnapshotOpinion]
    participants: list[SnapshotParticipant]
    votes: list[SnapshotVote]


def _vote_to_numeric(vote: str) -> int:
    if vote == "agree":
        return 1
    if vote == "disagree":
        return -1
    return 0


def canonical_json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(
        payload,
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def prepare_input_snapshot(
    *,
    conversation_id: int,
    data_generation: int,
    rows: list[VoteInputRow],
) -> PreparedInputSnapshot:
    opinion_ids = sorted({row.opinion_id for row in rows})
    user_ids = sorted({row.user_id for row in rows}, key=str)

    local_opinion_index_by_id = {opinion_id: index for index, opinion_id in enumerate(opinion_ids)}
    local_participant_index_by_id = {user_id: index for index, user_id in enumerate(user_ids)}

    opinion_content_id_by_id: dict[int, int] = {}
    for row in rows:
        opinion_content_id_by_id[row.opinion_id] = row.opinion_content_id

    opinions = [
        SnapshotOpinion(
            opinion_id=opinion_id,
            opinion_content_id=opinion_content_id_by_id[opinion_id],
            local_opinion_index=local_opinion_index_by_id[opinion_id],
        )
        for opinion_id in opinion_ids
    ]
    participants = [
        SnapshotParticipant(
            user_id=user_id,
            local_participant_index=local_participant_index_by_id[user_id],
        )
        for user_id in user_ids
    ]
    votes = sorted(
        [
            SnapshotVote(
                local_participant_index=local_participant_index_by_id[row.user_id],
                local_opinion_index=local_opinion_index_by_id[row.opinion_id],
                vote=_vote_to_numeric(row.vote),
            )
            for row in rows
        ],
        key=lambda vote: (vote.local_participant_index, vote.local_opinion_index),
    )

    payload = {
        "schema_version": 1,
        "conversation_id": conversation_id,
        "data_generation": data_generation,
        "opinion_count": len(opinions),
        "participant_count": len(participants),
        "votes": [
            {
                "participant_index": vote.local_participant_index,
                "opinion_index": vote.local_opinion_index,
                "vote": vote.vote,
            }
            for vote in votes
        ],
    }
    raw_payload = canonical_json_bytes(payload)
    compressed_payload = zstd.ZstdCompressor(level=3).compress(raw_payload)

    return PreparedInputSnapshot(
        conversation_id=conversation_id,
        data_generation=data_generation,
        input_hash=hashlib.sha256(raw_payload).hexdigest(),
        compression="zstd",
        payload=compressed_payload,
        canonical_payload=payload,
        opinions=opinions,
        participants=participants,
        votes=votes,
    )


def prepare_input_snapshots_batch(
    *,
    data_generation_by_conversation_id: dict[int, int],
    rows_by_conversation_id: dict[int, list[VoteInputRow]],
) -> dict[int, PreparedInputSnapshot]:
    snapshots: dict[int, PreparedInputSnapshot] = {}
    for conversation_id, data_generation in data_generation_by_conversation_id.items():
        rows = rows_by_conversation_id.get(conversation_id, [])
        data_generations = {row.data_generation for row in rows}
        if len(data_generations) > 1:
            msg = f"mixed data generations for conversation {conversation_id}"
            raise ValueError(msg)
        if data_generations and data_generations.pop() != data_generation:
            msg = f"stale input rows for conversation {conversation_id}"
            raise ValueError(msg)
        snapshots[conversation_id] = prepare_input_snapshot(
            conversation_id=conversation_id,
            data_generation=data_generation,
            rows=rows,
        )
    return snapshots
