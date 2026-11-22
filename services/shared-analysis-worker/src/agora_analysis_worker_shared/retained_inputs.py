from __future__ import annotations

import hashlib
from dataclasses import dataclass, field, replace
from itertools import pairwise
from typing import TYPE_CHECKING, Annotated, Literal

import zstandard as zstd
from pydantic import BaseModel, ConfigDict, Field, StrictInt, ValidationError
from sqlalchemy import select

from agora_analysis_worker_shared.generated_models import (
    AnalysisInputBaseline,
    AnalysisInputSnapshot,
    AnalysisSnapshot,
    AnalysisSnapshotResult,
    ConversationViewSnapshot,
    ConversationViewSnapshotCheckpointReason,
    ConversationViewSnapshotCheckpointReasonEnum,
    Opinion,
    OpinionModeration,
    OpinionModerationAction,
)
from agora_analysis_worker_shared.input_snapshot import (
    PreparedInputSnapshot,
    SnapshotOpinion,
    SnapshotVote,
)

if TYPE_CHECKING:
    from collections.abc import Set

    from sqlalchemy.orm import Session


class _OpinionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    opinion_id: StrictInt
    opinion_content_id: StrictInt


class _VotePayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    participant_index: StrictInt
    opinion_index: StrictInt
    vote: Annotated[StrictInt, Field(ge=-1, le=1)]


class _InputPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal[2]
    conversation_id: StrictInt
    data_generation: StrictInt
    opinion_count: StrictInt
    participant_count: StrictInt
    opinions: list[_OpinionPayload]
    votes: list[_VotePayload]


@dataclass(frozen=True)
class RetainedAnalysisInput:
    """Numerical evidence usable after unlinking; no account lookup is required."""

    conversation_id: int
    data_generation: int
    participant_count: int
    opinions: tuple[SnapshotOpinion, ...]
    votes: tuple[SnapshotVote, ...]


@dataclass(frozen=True)
class AnalysisViewCounters:
    opinion_count: int
    total_opinion_count: int
    total_vote_count: int
    total_participant_count: int
    moderated_opinion_count: int
    hidden_opinion_count: int


@dataclass(frozen=True)
class LiveAnalysisResultInput:
    numerical: PreparedInputSnapshot
    kind: Literal["live"] = field(default="live", init=False)


@dataclass(frozen=True)
class ClosingAnalysisResultInput:
    """Reference the certified close; publication derives its own counters.

    Original survey aggregates remain bound to their original groups. A
    replacement can regroup separately retained choices without account data.
    """

    numerical: RetainedAnalysisInput
    source_view_snapshot_id: int
    kind: Literal["closing"] = field(default="closing", init=False)


type AnalysisResultInput = LiveAnalysisResultInput | ClosingAnalysisResultInput


@dataclass(frozen=True)
class ClosingAnalysisProjection:
    inputs: RetainedAnalysisInput
    participant_indices: tuple[int, ...]
    opinion_indices: tuple[int, ...]


def project_closing_analysis_input(
    *,
    inputs: RetainedAnalysisInput,
    data_generation: int,
    moderated_opinion_ids: Set[int],
) -> ClosingAnalysisProjection:
    """Project moderation only; live account/survey eligibility is not an input."""
    opinions = tuple(
        opinion for opinion in inputs.opinions if opinion.opinion_id not in moderated_opinion_ids
    )
    opinion_indices = tuple(opinion.local_opinion_index for opinion in opinions)
    opinion_map = {source: effective for effective, source in enumerate(opinion_indices)}
    votes = tuple(vote for vote in inputs.votes if vote.local_opinion_index in opinion_map)
    participant_indices = tuple(sorted({vote.local_participant_index for vote in votes}))
    participant_map = {source: effective for effective, source in enumerate(participant_indices)}
    return ClosingAnalysisProjection(
        inputs=RetainedAnalysisInput(
            conversation_id=inputs.conversation_id,
            data_generation=data_generation,
            participant_count=len(participant_indices),
            opinions=tuple(
                replace(opinion, local_opinion_index=index)
                for index, opinion in enumerate(opinions)
            ),
            votes=tuple(
                replace(
                    vote,
                    local_participant_index=participant_map[vote.local_participant_index],
                    local_opinion_index=opinion_map[vote.local_opinion_index],
                )
                for vote in votes
            ),
        ),
        participant_indices=participant_indices,
        opinion_indices=opinion_indices,
    )


@dataclass(frozen=True)
class AnalysisSourceCounts:
    vote_count: int
    participant_count: int


@dataclass(frozen=True)
class PreparedAnalysisBaseline:
    effective: PreparedInputSnapshot
    complete: PreparedInputSnapshot
    participant_indices: tuple[int, ...]
    opinion_indices: tuple[int, ...]
    source_counts: AnalysisSourceCounts


@dataclass(frozen=True)
class AvailableAnalysisBaseline:
    input_snapshot_id: int
    baseline_input_snapshot_id: int
    inputs: RetainedAnalysisInput
    effective_inputs: RetainedAnalysisInput
    source_counts: AnalysisSourceCounts
    status: Literal["available"] = "available"


@dataclass(frozen=True)
class UnsupportedAnalysisBaseline:
    reason: Literal[
        "missing_publication",
        "missing_complete_baseline",
        "invalid_numerical_evidence",
    ]
    status: Literal["unsupported"] = "unsupported"


def prepare_analysis_baseline(
    *,
    effective: PreparedInputSnapshot,
    complete: PreparedInputSnapshot,
    source_counts: AnalysisSourceCounts | None = None,
) -> PreparedAnalysisBaseline:
    """Certify exact row/column projection while source associations still exist."""
    if (effective.conversation_id, effective.data_generation) != (
        complete.conversation_id,
        complete.data_generation,
    ):
        raise ValueError("Analysis baseline scope/provenance mismatch")
    complete_participants = {
        (participant.user_id, participant.participant_id): participant.local_participant_index
        for participant in complete.participants
    }
    complete_opinions = {
        (opinion.opinion_id, opinion.opinion_content_id): opinion.local_opinion_index
        for opinion in complete.opinions
    }
    participant_indices = tuple(
        complete_participants[(participant.user_id, participant.participant_id)]
        for participant in effective.participants
    )
    opinion_indices = tuple(
        complete_opinions[(opinion.opinion_id, opinion.opinion_content_id)]
        for opinion in effective.opinions
    )
    participant_set = set(participant_indices)
    opinion_set = set(opinion_indices)
    expected = {
        (
            participant_indices[vote.local_participant_index],
            opinion_indices[vote.local_opinion_index],
        ): vote.vote
        for vote in effective.votes
    }
    projected = {
        (vote.local_participant_index, vote.local_opinion_index): vote.vote
        for vote in complete.votes
        if vote.local_participant_index in participant_set
        and vote.local_opinion_index in opinion_set
    }
    if expected != projected:
        raise ValueError("Analysis baseline numerical projection mismatch")
    counts = source_counts or AnalysisSourceCounts(
        vote_count=len(complete.votes), participant_count=complete.participant_count
    )
    if (
        counts.vote_count < len(complete.votes)
        or counts.participant_count < complete.participant_count
        or counts.participant_count > counts.vote_count
    ):
        raise ValueError("Analysis baseline source counts do not cover its numerical population")
    return PreparedAnalysisBaseline(
        effective=effective,
        complete=complete,
        participant_indices=participant_indices,
        opinion_indices=opinion_indices,
        source_counts=counts,
    )


def parse_retained_analysis_input(snapshot: AnalysisInputSnapshot) -> RetainedAnalysisInput:
    """Parse stored bytes at the persistence boundary; never invent legacy evidence."""
    if snapshot.payload_version != 2:
        raise ValueError("Unsupported legacy analysis input")
    if min(snapshot.opinion_count, snapshot.participant_count, snapshot.vote_count) < 0:
        raise ValueError("Invalid analysis input counts")
    # V2 is compact canonical JSON with 32-bit database IDs/indices. Each
    # catalogue/cell entry fits within 96 bytes; metadata fits within 512.
    # Check the frame before decompression rather than trusting its claimed size.
    max_payload_bytes = 512 + 96 * (snapshot.opinion_count + snapshot.vote_count)
    try:
        content_size = zstd.frame_content_size(snapshot.payload)
        if content_size < 0 or content_size > max_payload_bytes:
            raise ValueError("Invalid analysis input frame size")
        raw = zstd.ZstdDecompressor().decompress(snapshot.payload, allow_extra_data=False)
    except zstd.ZstdError as error:
        raise ValueError("Invalid compressed analysis input") from error
    if hashlib.sha256(raw).hexdigest() != snapshot.input_hash:
        raise ValueError("Analysis input hash mismatch")
    try:
        payload = _InputPayload.model_validate_json(raw)
    except ValidationError:
        # Validation diagnostics may echo malformed stored values into worker logs.
        raise ValueError("Invalid retained analysis input schema") from None
    if (
        payload.conversation_id != snapshot.conversation_id
        or payload.data_generation != snapshot.data_generation
        or payload.opinion_count != snapshot.opinion_count
        or payload.participant_count != snapshot.participant_count
        or len(payload.opinions) != snapshot.opinion_count
        or len(payload.votes) != snapshot.vote_count
        or payload.participant_count < 0
        or payload.opinion_count < 0
    ):
        raise ValueError("Analysis input count/provenance mismatch")
    if any(
        previous.opinion_id >= current.opinion_id
        for previous, current in pairwise(payload.opinions)
    ) or any(
        (previous.participant_index, previous.opinion_index)
        >= (current.participant_index, current.opinion_index)
        for previous, current in pairwise(payload.votes)
    ):
        raise ValueError("Analysis input catalogue/cell ordering mismatch")
    if any(
        not 0 <= vote.participant_index < payload.participant_count
        or not 0 <= vote.opinion_index < payload.opinion_count
        for vote in payload.votes
    ):
        raise ValueError("Analysis input index outside catalogue")
    if len({vote.participant_index for vote in payload.votes}) != payload.participant_count or any(
        opinion.opinion_id <= 0 or opinion.opinion_content_id <= 0 for opinion in payload.opinions
    ):
        raise ValueError("Analysis input incomplete catalogue")
    return RetainedAnalysisInput(
        conversation_id=payload.conversation_id,
        data_generation=payload.data_generation,
        participant_count=payload.participant_count,
        opinions=tuple(
            SnapshotOpinion(
                opinion_id=opinion.opinion_id,
                opinion_content_id=opinion.opinion_content_id,
                local_opinion_index=index,
            )
            for index, opinion in enumerate(payload.opinions)
        ),
        votes=tuple(
            SnapshotVote(
                local_participant_index=vote.participant_index,
                local_opinion_index=vote.opinion_index,
                vote=vote.vote,
            )
            for vote in payload.votes
        ),
    )


def resolve_retained_analysis_baseline(
    *,
    session: Session,
    conversation_id: int,
    analysis_snapshot_id: int,
) -> AvailableAnalysisBaseline | UnsupportedAnalysisBaseline:
    """Resolve only explicitly certified evidence, even after private unlinking."""
    publication = session.get(AnalysisSnapshot, analysis_snapshot_id)
    if publication is None or publication.conversation_id != conversation_id:
        return UnsupportedAnalysisBaseline(reason="missing_publication")
    certificate = session.get(AnalysisInputBaseline, publication.input_snapshot_id)
    if certificate is None:
        return UnsupportedAnalysisBaseline(reason="missing_complete_baseline")
    complete_certificate = session.get(
        AnalysisInputBaseline, certificate.baseline_input_snapshot_id
    )
    effective = session.get(AnalysisInputSnapshot, certificate.input_snapshot_id)
    complete = session.get(AnalysisInputSnapshot, certificate.baseline_input_snapshot_id)
    if (
        complete_certificate is None
        or complete_certificate.baseline_input_snapshot_id != certificate.baseline_input_snapshot_id
        or certificate.conversation_id != conversation_id
        or complete_certificate.conversation_id != conversation_id
        or effective is None
        or complete is None
        or complete.conversation_id != conversation_id
        or effective.conversation_id != conversation_id
        or effective.data_generation != publication.data_generation
        or complete.data_generation != effective.data_generation
        or certificate.source_vote_count != complete_certificate.source_vote_count
        or certificate.source_participant_count != complete_certificate.source_participant_count
        or complete_certificate.source_vote_count < complete.vote_count
        or complete_certificate.source_participant_count < complete.participant_count
        or complete_certificate.source_participant_count > complete_certificate.source_vote_count
    ):
        return UnsupportedAnalysisBaseline(reason="invalid_numerical_evidence")
    try:
        effective_input = parse_retained_analysis_input(effective)
        complete_input = (
            effective_input
            if complete.id == effective.id
            else parse_retained_analysis_input(complete)
        )
        participants = certificate.participant_indices
        opinions = certificate.opinion_indices
        participant_set = set(participants)
        opinion_set = set(opinions)
        if (
            len(participants) != effective_input.participant_count
            or len(opinions) != len(effective_input.opinions)
            or len(set(participants)) != len(participants)
            or len(set(opinions)) != len(opinions)
            or any(not 0 <= index < complete_input.participant_count for index in participants)
            or any(not 0 <= index < len(complete_input.opinions) for index in opinions)
            or complete_certificate.participant_indices
            != list(range(complete_input.participant_count))
            or complete_certificate.opinion_indices != list(range(len(complete_input.opinions)))
        ):
            return UnsupportedAnalysisBaseline(reason="invalid_numerical_evidence")
        for effective_opinion, baseline_index in zip(
            effective_input.opinions, opinions, strict=True
        ):
            original = complete_input.opinions[baseline_index]
            if (effective_opinion.opinion_id, effective_opinion.opinion_content_id) != (
                original.opinion_id,
                original.opinion_content_id,
            ):
                return UnsupportedAnalysisBaseline(reason="invalid_numerical_evidence")
        projected = {
            (vote.local_participant_index, vote.local_opinion_index): vote.vote
            for vote in complete_input.votes
            if vote.local_participant_index in participant_set
            and vote.local_opinion_index in opinion_set
        }
        effective_votes = {
            (
                participants[vote.local_participant_index],
                opinions[vote.local_opinion_index],
            ): vote.vote
            for vote in effective_input.votes
        }
        if effective_votes != projected:
            return UnsupportedAnalysisBaseline(reason="invalid_numerical_evidence")
    except ValueError:
        return UnsupportedAnalysisBaseline(reason="invalid_numerical_evidence")
    return AvailableAnalysisBaseline(
        input_snapshot_id=effective.id,
        baseline_input_snapshot_id=complete.id,
        inputs=complete_input,
        effective_inputs=effective_input,
        source_counts=AnalysisSourceCounts(
            vote_count=complete_certificate.source_vote_count,
            participant_count=complete_certificate.source_participant_count,
        ),
    )


@dataclass(frozen=True)
class PreparedClosingAnalysisInput:
    projection: ClosingAnalysisProjection
    source_view_snapshot_id: int
    baseline_input_snapshot_id: int
    counters: AnalysisViewCounters

    @property
    def result_input(self) -> ClosingAnalysisResultInput:
        return ClosingAnalysisResultInput(
            numerical=self.projection.inputs,
            source_view_snapshot_id=self.source_view_snapshot_id,
        )


def prepare_closing_analysis_input(
    *,
    session: Session,
    conversation_id: int,
    opinion_group_spec_id: int,
    source_view_snapshot_id: int,
    data_generation: int,
) -> PreparedClosingAnalysisInput:
    """Resolve numerical provenance, not authority to publish after finalization.

    Counts must be provable from certified evidence. A legacy catalogue missing
    unvoted opinions cannot be completed from today's potentially erased sources.
    """
    closing_checkpoint = (
        select(ConversationViewSnapshotCheckpointReason.id)
        .where(
            ConversationViewSnapshotCheckpointReason.conversation_view_snapshot_id
            == ConversationViewSnapshot.id,
            ConversationViewSnapshotCheckpointReason.conversation_id == conversation_id,
            ConversationViewSnapshotCheckpointReason.opinion_group_spec_id == opinion_group_spec_id,
            ConversationViewSnapshotCheckpointReason.reason
            == ConversationViewSnapshotCheckpointReasonEnum.conversation_closed,
        )
        .exists()
    )
    native_result = (
        select(AnalysisSnapshotResult.id)
        .where(
            AnalysisSnapshotResult.analysis_snapshot_id
            == ConversationViewSnapshot.analysis_snapshot_id,
            AnalysisSnapshotResult.conversation_id == conversation_id,
            AnalysisSnapshotResult.opinion_group_spec_id == opinion_group_spec_id,
        )
        .exists()
    )
    view = session.scalars(
        select(ConversationViewSnapshot).where(
            ConversationViewSnapshot.id == source_view_snapshot_id,
            ConversationViewSnapshot.conversation_id == conversation_id,
            ConversationViewSnapshot.opinion_group_spec_id == opinion_group_spec_id,
            ConversationViewSnapshot.is_closed.is_(True),
            ConversationViewSnapshot.activated_at.is_not(None),
            ConversationViewSnapshot.analysis_snapshot_id.is_not(None),
            closing_checkpoint,
            native_result,
        )
    ).one_or_none()
    if view is None or view.analysis_snapshot_id is None:
        raise ValueError("Closing source is not an activated closing analysis in this scope")
    baseline = resolve_retained_analysis_baseline(
        session=session,
        conversation_id=conversation_id,
        analysis_snapshot_id=view.analysis_snapshot_id,
    )
    if baseline.status != "available":
        raise ValueError("Closing source requires certified complete numerical evidence")
    complete = baseline.inputs
    effective = baseline.effective_inputs
    if data_generation <= complete.data_generation:
        raise ValueError("Closing calculation must follow its source generation")
    if (
        view.opinion_count,
        view.vote_count,
        view.participant_count,
        view.total_opinion_count,
        view.total_vote_count,
        view.total_participant_count,
    ) != (
        len(effective.opinions),
        len(effective.votes),
        effective.participant_count,
        len(complete.opinions),
        baseline.source_counts.vote_count,
        baseline.source_counts.participant_count,
    ):
        raise ValueError("Closing source counts are not covered by its certified catalogue")

    opinion_ids = {opinion.opinion_id for opinion in complete.opinions}
    # Moderation still applies to retained numerical columns after text/account
    # removal. Do not route this through current-source or account eligibility.
    moderations = {
        opinion_id: action
        for opinion_id, action in session.execute(
            select(OpinionModeration.opinion_id, OpinionModeration.moderation_action)
            .join(Opinion, Opinion.id == OpinionModeration.opinion_id)
            .where(
                Opinion.conversation_id == conversation_id,
                OpinionModeration.deleted_at.is_(None),
            )
        ).tuples()
        if opinion_id in opinion_ids
    }
    projected = project_closing_analysis_input(
        inputs=complete,
        data_generation=data_generation,
        moderated_opinion_ids=moderations.keys(),
    )
    return PreparedClosingAnalysisInput(
        projection=projected,
        source_view_snapshot_id=source_view_snapshot_id,
        baseline_input_snapshot_id=baseline.baseline_input_snapshot_id,
        counters=AnalysisViewCounters(
            opinion_count=len(projected.inputs.opinions),
            total_opinion_count=len(complete.opinions),
            total_vote_count=baseline.source_counts.vote_count,
            total_participant_count=baseline.source_counts.participant_count,
            moderated_opinion_count=sum(
                action == OpinionModerationAction.move for action in moderations.values()
            ),
            hidden_opinion_count=sum(
                action == OpinionModerationAction.hide for action in moderations.values()
            ),
        ),
    )


def prepare_closing_analysis_result_input(
    *,
    session: Session,
    conversation_id: int,
    opinion_group_spec_id: int,
    source_view_snapshot_id: int,
    data_generation: int,
) -> tuple[ClosingAnalysisResultInput, AnalysisViewCounters]:
    prepared = prepare_closing_analysis_input(
        session=session,
        conversation_id=conversation_id,
        opinion_group_spec_id=opinion_group_spec_id,
        source_view_snapshot_id=source_view_snapshot_id,
        data_generation=data_generation,
    )
    return prepared.result_input, prepared.counters
