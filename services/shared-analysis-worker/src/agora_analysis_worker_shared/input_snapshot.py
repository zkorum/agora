from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

import zstandard as zstd

if TYPE_CHECKING:
    from collections.abc import Sequence
    from uuid import UUID


@dataclass(frozen=True)
class OpinionInputRow:
    conversation_id: int
    data_generation: int
    opinion_id: int
    opinion_content_id: int


@dataclass(frozen=True)
class VoteInputRow:
    conversation_id: int
    data_generation: int
    user_id: UUID
    opinion_id: int
    opinion_content_id: int
    vote: str
    participant_id: UUID | None = None


@dataclass(frozen=True)
class SnapshotOpinion:
    opinion_id: int
    opinion_content_id: int
    local_opinion_index: int


@dataclass(frozen=True)
class SnapshotParticipant:
    user_id: UUID
    local_participant_index: int
    participant_id: UUID | None = None


@dataclass(frozen=True)
class SnapshotVote:
    local_participant_index: int
    local_opinion_index: int
    vote: int


class NumericalAnalysisInput(Protocol):
    """The engine needs numerical cells/catalogues, never private source identities."""

    @property
    def conversation_id(self) -> int: ...
    @property
    def data_generation(self) -> int: ...
    @property
    def participant_count(self) -> int: ...
    @property
    def opinions(self) -> Sequence[SnapshotOpinion]: ...
    @property
    def votes(self) -> Sequence[SnapshotVote]: ...


@dataclass(frozen=True)
class PreparedInputSnapshot:
    conversation_id: int
    data_generation: int
    input_hash: str
    payload: bytes
    opinions: list[SnapshotOpinion]
    participants: list[SnapshotParticipant]
    votes: list[SnapshotVote]

    @property
    def participant_count(self) -> int:
        return len(self.participants)


def _vote_to_numeric(vote: str) -> int:
    if vote == "agree":
        return 1
    if vote == "disagree":
        return -1
    if vote == "pass":
        return 0
    raise ValueError("Invalid analysis vote choice")


def canonical_json_bytes(payload: dict[str, object]) -> bytes:
    return json.dumps(
        payload,
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def encode_numerical_analysis_input(
    *,
    conversation_id: int,
    data_generation: int,
    participant_count: int,
    opinions: Sequence[SnapshotOpinion],
    votes: Sequence[SnapshotVote],
) -> tuple[str, bytes]:
    payload = canonical_json_bytes(
        {
            "schema_version": 2,
            "conversation_id": conversation_id,
            "data_generation": data_generation,
            "opinion_count": len(opinions),
            "participant_count": participant_count,
            # Retain source identifiers, never text or account IDs.
            "opinions": [
                {"opinion_id": opinion.opinion_id, "opinion_content_id": opinion.opinion_content_id}
                for opinion in opinions
            ],
            "votes": [
                {
                    "participant_index": vote.local_participant_index,
                    "opinion_index": vote.local_opinion_index,
                    "vote": vote.vote,
                }
                for vote in votes
            ],
        }
    )
    return hashlib.sha256(payload).hexdigest(), zstd.ZstdCompressor(level=3).compress(payload)


def prepare_input_snapshot(
    *,
    conversation_id: int,
    data_generation: int,
    rows: list[VoteInputRow],
    opinion_rows: Sequence[OpinionInputRow] | None = None,
) -> PreparedInputSnapshot:
    if any(
        (row.conversation_id, row.data_generation) != (conversation_id, data_generation)
        for row in rows
    ):
        raise ValueError("Analysis vote input scope/generation mismatch")
    opinion_content_id_by_id: dict[int, int] = {}
    for opinion_row in opinion_rows if opinion_rows is not None else rows:
        if (opinion_row.conversation_id, opinion_row.data_generation) != (
            conversation_id,
            data_generation,
        ):
            raise ValueError("Analysis opinion catalogue scope/generation mismatch")
        previous = opinion_content_id_by_id.setdefault(
            opinion_row.opinion_id, opinion_row.opinion_content_id
        )
        if previous != opinion_row.opinion_content_id:
            raise ValueError("Analysis opinion catalogue has conflicting versions")
    if any(opinion_content_id_by_id.get(row.opinion_id) != row.opinion_content_id for row in rows):
        raise ValueError("Analysis vote is outside its opinion catalogue")
    opinion_ids = sorted(opinion_content_id_by_id)
    participant_id_by_user_id = {row.user_id: row.participant_id for row in rows}
    user_ids = sorted(
        participant_id_by_user_id,
        key=lambda user_id: str(participant_id_by_user_id[user_id] or user_id),
    )

    local_opinion_index_by_id = {opinion_id: index for index, opinion_id in enumerate(opinion_ids)}
    local_participant_index_by_id = {user_id: index for index, user_id in enumerate(user_ids)}

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
            participant_id=participant_id_by_user_id[user_id],
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

    input_hash, payload = encode_numerical_analysis_input(
        conversation_id=conversation_id,
        data_generation=data_generation,
        participant_count=len(participants),
        opinions=opinions,
        votes=votes,
    )
    return PreparedInputSnapshot(
        conversation_id=conversation_id,
        data_generation=data_generation,
        input_hash=input_hash,
        payload=payload,
        opinions=opinions,
        participants=participants,
        votes=votes,
    )
