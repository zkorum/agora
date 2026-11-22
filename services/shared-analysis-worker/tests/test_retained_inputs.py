from __future__ import annotations

import hashlib
from dataclasses import replace
from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import UUID

import pytest
import zstandard as zstd
from pydantic import TypeAdapter
from sqlalchemy import MetaData, create_engine, func, select, update
from sqlalchemy.orm import Session

from agora_analysis_worker_shared.db import (
    AnalysisWorkStatePersistenceError,
    persist_analysis_baselines_batch,
    upsert_input_snapshots_batch,
)
from agora_analysis_worker_shared.generated_models import (
    AnalysisInputBaseline,
    AnalysisInputParticipantEligibility,
    AnalysisInputSnapshot,
    AnalysisSnapshot,
    Base,
    User,
)
from agora_analysis_worker_shared.input_snapshot import (
    OpinionInputRow,
    VoteInputRow,
    canonical_json_bytes,
    prepare_input_snapshot,
)
from agora_analysis_worker_shared.retained_inputs import (
    AnalysisSourceCounts,
    AvailableAnalysisBaseline,
    RetainedAnalysisInput,
    parse_retained_analysis_input,
    prepare_analysis_baseline,
    project_closing_analysis_input,
    resolve_retained_analysis_baseline,
)

if TYPE_CHECKING:
    from collections.abc import Iterator

    from sqlalchemy import Engine

NOW = datetime(2026, 11, 17, tzinfo=UTC)


@pytest.fixture
def engine() -> Iterator[Engine]:
    engine = create_engine("sqlite://")
    metadata = MetaData()
    for name in [
        "user",
        "analysis_input_snapshot",
        "analysis_input_participant_eligibility",
        "analysis_input_baseline",
        "analysis_snapshot",
    ]:
        Base.metadata.tables[name].to_metadata(metadata)
        if "created_at" in metadata.tables[name].c:
            metadata.tables[name].c.created_at.nullable = True
    metadata.create_all(engine)
    with Session(engine) as session, session.begin():
        session.add_all(
            [
                User(id=UUID(int=index), username=f"user-{index}", created_at=NOW, updated_at=NOW)
                for index in range(1, 4)
            ]
        )
    try:
        yield engine
    finally:
        engine.dispose()


def vote(*, user: int, opinion: int, choice: str = "agree") -> VoteInputRow:
    return VoteInputRow(
        conversation_id=1,
        data_generation=2,
        user_id=UUID(int=user),
        participant_id=UUID(int=100 + user),
        opinion_id=opinion,
        opinion_content_id=opinion * 10,
        vote=choice,
    )


@pytest.mark.parametrize("all_excluded", [False, True])
def test_complete_capture_keeps_filtered_columns_and_excluded_participants(
    engine: Engine, all_excluded: bool
) -> None:
    rows = [
        vote(user=1, opinion=1),
        vote(user=2, opinion=1, choice="disagree"),
        vote(user=2, opinion=2, choice="pass"),
        vote(user=3, opinion=2),
    ]
    effective = prepare_input_snapshot(
        conversation_id=1,
        data_generation=2,
        rows=[] if all_excluded else rows[2:],
    )
    complete = prepare_input_snapshot(conversation_id=1, data_generation=2, rows=rows)
    baseline = prepare_analysis_baseline(effective=effective, complete=complete)
    first = persist_analysis_baselines_batch(engine, baselines=[baseline])[1]
    assert persist_analysis_baselines_batch(engine, baselines=[baseline])[1] == first
    with Session(engine) as session:
        certificate = session.get_one(AnalysisInputBaseline, first.id)
        original = session.get_one(AnalysisInputSnapshot, certificate.baseline_input_snapshot_id)
        assert original.id != first.id
        assert (original.participant_count, original.opinion_count, original.vote_count) == (
            3,
            2,
            4,
        )
        assert len(parse_retained_analysis_input(original).votes) == 4
        assert certificate.participant_indices == ([] if all_excluded else [1, 2])
        assert certificate.opinion_indices == ([] if all_excluded else [1])
        stored_effective = session.get_one(AnalysisInputSnapshot, first.id)
        assert stored_effective.payload == effective.payload
        assert session.scalar(select(func.count()).select_from(AnalysisInputSnapshot)) == 2
        assert session.scalar(
            select(func.count()).select_from(AnalysisInputParticipantEligibility)
        ) == (3 if all_excluded else 5)


def test_identical_complete_and_effective_inputs_share_one_capture(engine: Engine) -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=1)]
    )
    first = persist_analysis_baselines_batch(
        engine, baselines=[prepare_analysis_baseline(effective=snapshot, complete=snapshot)]
    )[1]
    with Session(engine) as session:
        certificate = session.get_one(AnalysisInputBaseline, first.id)
        assert certificate.baseline_input_snapshot_id == first.id
        assert session.scalar(select(func.count()).select_from(AnalysisInputSnapshot)) == 1


def test_certificates_retain_broader_pre_survey_counts_separately_from_eligible_votes(
    engine: Engine,
) -> None:
    complete = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=1)]
    )
    effective = prepare_input_snapshot(conversation_id=1, data_generation=2, rows=[])
    counts = AnalysisSourceCounts(vote_count=5, participant_count=3)
    stored = persist_analysis_baselines_batch(
        engine,
        baselines=[
            prepare_analysis_baseline(effective=effective, complete=complete, source_counts=counts)
        ],
    )[1]
    with Session(engine) as session, session.begin():
        session.add(
            AnalysisSnapshot(
                id=1,
                conversation_id=1,
                input_snapshot_id=stored.id,
                data_generation=2,
                computed_at=NOW,
            )
        )
    with Session(engine) as session:
        retained = resolve_retained_analysis_baseline(
            session=session, conversation_id=1, analysis_snapshot_id=1
        )
        assert retained.status == "available"
        assert retained.source_counts == counts
        assert retained.inputs.participant_count == 1
        assert retained.effective_inputs.participant_count == 0
        certificates = session.scalars(select(AnalysisInputBaseline)).all()
        assert len(certificates) == 2
        assert all(row.source_vote_count == 5 for row in certificates)
        assert all(row.source_participant_count == 3 for row in certificates)
    with pytest.raises(AnalysisWorkStatePersistenceError, match="baseline differs"):
        persist_analysis_baselines_batch(
            engine,
            baselines=[
                prepare_analysis_baseline(
                    effective=effective,
                    complete=complete,
                    source_counts=AnalysisSourceCounts(vote_count=6, participant_count=3),
                )
            ],
        )


@pytest.mark.parametrize(
    "counts",
    [
        AnalysisSourceCounts(vote_count=0, participant_count=1),
        AnalysisSourceCounts(vote_count=1, participant_count=0),
        AnalysisSourceCounts(vote_count=1, participant_count=2),
    ],
)
def test_source_counts_must_cover_the_eligible_population(counts: AnalysisSourceCounts) -> None:
    prepared = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=1)]
    )
    with pytest.raises(ValueError, match="source counts"):
        prepare_analysis_baseline(effective=prepared, complete=prepared, source_counts=counts)


@pytest.mark.parametrize("with_votes", [False, True])
def test_complete_catalogue_certification_and_projection_keep_unvoted_opinions(
    engine: Engine, with_votes: bool
) -> None:
    catalogue = [
        OpinionInputRow(
            conversation_id=1, data_generation=2, opinion_id=index, opinion_content_id=index * 10
        )
        for index in (1, 2, 3)
    ]
    complete = prepare_input_snapshot(
        conversation_id=1,
        data_generation=2,
        rows=[vote(user=1, opinion=2)] if with_votes else [],
        opinion_rows=catalogue,
    )
    effective = prepare_input_snapshot(
        conversation_id=1,
        data_generation=2,
        rows=[],
        opinion_rows=[catalogue[0], catalogue[2]],
    )
    stored = persist_analysis_baselines_batch(
        engine, baselines=[prepare_analysis_baseline(effective=effective, complete=complete)]
    )[1]
    with Session(engine) as session, session.begin():
        session.add(
            AnalysisSnapshot(
                id=1,
                conversation_id=1,
                data_generation=2,
                input_snapshot_id=stored.id,
                computed_at=NOW,
            )
        )
    with Session(engine) as session:
        retained = resolve_retained_analysis_baseline(
            session=session, conversation_id=1, analysis_snapshot_id=1
        )
        assert retained.status == "available"
        assert len(retained.inputs.opinions) == 3
        assert len(retained.effective_inputs.opinions) == 2
        assert retained.effective_inputs.participant_count == 0
        restored = project_closing_analysis_input(
            inputs=retained.inputs, data_generation=3, moderated_opinion_ids=set()
        )
        assert len(restored.inputs.opinions) == 3
        assert len(restored.inputs.votes) == int(with_votes)
        assert restored.inputs.participant_count == int(with_votes)


def test_certification_compares_stored_bytes_with_prepared_numerical_evidence(
    engine: Engine,
) -> None:
    prepared = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=1)]
    )
    # Frozen dataclasses do not guarantee that their separately supplied payload,
    # hash and numerical fields agree. Never certify by parsing the bytes alone.
    inconsistent = replace(prepared, votes=[replace(prepared.votes[0], vote=-1)])
    baseline = prepare_analysis_baseline(effective=inconsistent, complete=inconsistent)
    with pytest.raises(AnalysisWorkStatePersistenceError, match="prepared numerical evidence"):
        persist_analysis_baselines_batch(engine, baselines=[baseline])
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(AnalysisInputBaseline)) == 0


def test_certification_rejects_a_forged_projection_before_capture(engine: Engine) -> None:
    prepared = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=1)]
    )
    baseline = replace(
        prepare_analysis_baseline(effective=prepared, complete=prepared), opinion_indices=(1,)
    )
    with pytest.raises(AnalysisWorkStatePersistenceError, match="projection differs"):
        persist_analysis_baselines_batch(engine, baselines=[baseline])
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(AnalysisInputSnapshot)) == 0


def test_certification_rejects_identical_bytes_with_different_private_sources(
    engine: Engine,
) -> None:
    snapshots = [
        prepare_input_snapshot(
            conversation_id=1, data_generation=2, rows=[vote(user=user, opinion=1)]
        )
        for user in (1, 2)
    ]
    stored = upsert_input_snapshots_batch(engine, snapshots=[snapshots[0]])[1]
    assert snapshots[0].input_hash == snapshots[1].input_hash
    with pytest.raises(AnalysisWorkStatePersistenceError, match="private sources"):
        persist_analysis_baselines_batch(
            engine,
            baselines=[prepare_analysis_baseline(effective=snapshots[1], complete=snapshots[1])],
        )
    with Session(engine) as session:
        assert session.get(AnalysisInputBaseline, stored.id) is None
        eligibility = session.scalars(select(AnalysisInputParticipantEligibility)).one()
        assert eligibility.user_id == UUID(int=1)


def test_baseline_remains_readable_after_account_unlink_without_reconstructing_identity(
    engine: Engine,
) -> None:
    complete = prepare_input_snapshot(
        conversation_id=1,
        data_generation=2,
        rows=[vote(user=1, opinion=1), vote(user=2, opinion=2)],
    )
    effective = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=2, opinion=2)]
    )
    stored = persist_analysis_baselines_batch(
        engine, baselines=[prepare_analysis_baseline(effective=effective, complete=complete)]
    )[1]
    with Session(engine) as session, session.begin():
        session.add(
            AnalysisSnapshot(
                id=1,
                conversation_id=1,
                input_snapshot_id=stored.id,
                data_generation=2,
                computed_at=NOW,
            )
        )
        before = resolve_retained_analysis_baseline(
            session=session, conversation_id=1, analysis_snapshot_id=1
        )
        session.execute(
            update(AnalysisInputParticipantEligibility)
            .where(AnalysisInputParticipantEligibility.user_id == UUID(int=1))
            .values(user_id=None, is_account_hidden=True)
        )
    with Session(engine) as session:
        after = resolve_retained_analysis_baseline(
            session=session, conversation_id=1, analysis_snapshot_id=1
        )
        assert isinstance(before, AvailableAnalysisBaseline)
        assert isinstance(after, AvailableAnalysisBaseline)
        assert after.inputs == before.inputs
        assert after == before
        projection = project_closing_analysis_input(
            inputs=after.inputs,
            data_generation=3,
            moderated_opinion_ids=set(),
        )
        assert projection.inputs.participant_count == 2
        assert projection.inputs.votes == after.inputs.votes
        assert projection.participant_indices == (0, 1)
        assert [opinion.opinion_id for opinion in after.inputs.opinions] == [1, 2]
        assert "user_id" not in repr(after.inputs)
        assert (
            resolve_retained_analysis_baseline(
                session=session, conversation_id=2, analysis_snapshot_id=1
            ).status
            == "unsupported"
        )


def test_closing_projection_filters_only_moderated_columns_without_changing_retained_evidence() -> (
    None
):
    prepared = prepare_input_snapshot(
        conversation_id=1,
        data_generation=2,
        rows=[
            vote(user=1, opinion=1),
            vote(user=2, opinion=1, choice="pass"),
            vote(user=2, opinion=2, choice="disagree"),
            vote(user=3, opinion=2),
        ],
    )
    original = RetainedAnalysisInput(
        conversation_id=prepared.conversation_id,
        data_generation=prepared.data_generation,
        participant_count=len(prepared.participants),
        opinions=tuple(prepared.opinions),
        votes=tuple(prepared.votes),
    )
    projected = project_closing_analysis_input(
        inputs=original, data_generation=3, moderated_opinion_ids={1}
    )
    assert projected.participant_indices == (1, 2)
    assert projected.opinion_indices == (1,)
    assert projected.inputs.participant_count == 2
    assert [
        (opinion.opinion_id, opinion.local_opinion_index) for opinion in projected.inputs.opinions
    ] == [(2, 0)]
    assert [
        (vote.local_participant_index, vote.local_opinion_index, vote.vote)
        for vote in projected.inputs.votes
    ] == [(0, 0, -1), (1, 0, 1)]
    assert original.data_generation == 2
    assert original.participant_count == 3
    assert len(original.opinions) == 2
    assert len(original.votes) == 4

    restored = project_closing_analysis_input(
        inputs=original, data_generation=4, moderated_opinion_ids=set()
    )
    assert restored.participant_indices == (0, 1, 2)
    assert restored.opinion_indices == (0, 1)
    assert restored.inputs.votes == original.votes
    assert restored.inputs.opinions == original.opinions
    assert restored.inputs.participant_count == 3
    assert "user_id" not in repr(restored.inputs)


@pytest.mark.parametrize("moderated", [set[int](), {1}, {1, 999}])
def test_closing_projection_handles_empty_and_fully_moderated_input(moderated: set[int]) -> None:
    prepared = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=1, choice="pass")]
    )
    retained = RetainedAnalysisInput(
        conversation_id=1,
        data_generation=2,
        participant_count=1,
        opinions=tuple(prepared.opinions),
        votes=tuple(prepared.votes),
    )
    projected = project_closing_analysis_input(
        inputs=retained, data_generation=3, moderated_opinion_ids=moderated
    )
    if 1 in moderated:
        assert projected.inputs.participant_count == 0
        assert projected.inputs.votes == ()
        assert projected.inputs.opinions == ()
        assert projected.participant_indices == ()
        assert projected.opinion_indices == ()
    else:
        assert projected.inputs.participant_count == 1
        assert projected.inputs.votes[0].vote == 0
    empty = project_closing_analysis_input(
        inputs=RetainedAnalysisInput(
            conversation_id=1, data_generation=2, participant_count=0, opinions=(), votes=()
        ),
        data_generation=3,
        moderated_opinion_ids=moderated,
    )
    assert empty.inputs.participant_count == 0
    assert empty.inputs.votes == ()


def test_legacy_placeholder_and_uncertified_inputs_are_not_rebuilt(engine: Engine) -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=1)]
    )
    stored = upsert_input_snapshots_batch(engine, snapshots=[snapshot])[1]
    with Session(engine) as session, session.begin():
        session.add(
            AnalysisSnapshot(
                id=1,
                conversation_id=1,
                input_snapshot_id=stored.id,
                data_generation=2,
                computed_at=NOW,
            )
        )
        session.flush()
        result = resolve_retained_analysis_baseline(
            session=session, conversation_id=1, analysis_snapshot_id=1
        )
        assert result.status == "unsupported"
        assert result.reason == "missing_complete_baseline"
        legacy = session.get_one(AnalysisInputSnapshot, stored.id)
        legacy.payload_version = 1
        legacy.payload = b"historical placeholder"
        with pytest.raises(ValueError, match="legacy"):
            parse_retained_analysis_input(legacy)


def test_baseline_rejects_changed_choices_instead_of_synthesizing_votes() -> None:
    original = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=1)]
    )
    changed = replace(original, votes=[replace(original.votes[0], vote=-1)])
    with pytest.raises(ValueError, match="projection"):
        prepare_analysis_baseline(effective=changed, complete=original)


def test_catalogue_is_bound_into_the_hash_without_putting_accounts_in_numerical_bytes() -> None:
    snapshots = [
        prepare_input_snapshot(
            conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=opinion)]
        )
        for opinion in (1, 2)
    ]
    assert snapshots[0].input_hash != snapshots[1].input_hash
    assert all(
        b"user_id" not in zstd.ZstdDecompressor().decompress(snapshot.payload)
        for snapshot in snapshots
    )


def test_frame_size_bound_accepts_full_width_database_identifiers() -> None:
    maximum = 2**31 - 1
    prepared = prepare_input_snapshot(
        conversation_id=maximum,
        data_generation=maximum,
        rows=[
            VoteInputRow(
                conversation_id=maximum,
                data_generation=maximum,
                user_id=UUID(int=1),
                opinion_id=maximum,
                opinion_content_id=maximum,
                vote="disagree",
            )
        ],
    )
    stored = AnalysisInputSnapshot(
        conversation_id=maximum,
        data_generation=maximum,
        payload_version=2,
        input_hash=prepared.input_hash,
        opinion_count=1,
        participant_count=1,
        vote_count=1,
        payload=prepared.payload,
    )
    retained = parse_retained_analysis_input(stored)
    assert retained.opinions == tuple(prepared.opinions)
    assert retained.votes == tuple(prepared.votes)


@pytest.mark.parametrize(
    "damage",
    [
        "hash",
        "compressed",
        "count",
        "cell",
        "catalogue",
        "choice",
        "duplicate_cell",
        "unordered_cells",
        "oversized_frame",
        "unknown_frame_size",
        "trailing_frame",
        "sparse_participants",
    ],
)
def test_corrupt_or_incomplete_evidence_is_rejected_without_live_reconstruction(
    engine: Engine, damage: str
) -> None:
    snapshot = prepare_input_snapshot(
        conversation_id=1, data_generation=2, rows=[vote(user=1, opinion=1)]
    )
    stored = persist_analysis_baselines_batch(
        engine, baselines=[prepare_analysis_baseline(effective=snapshot, complete=snapshot)]
    )[1]
    with Session(engine) as session, session.begin():
        session.add(
            AnalysisSnapshot(
                id=1,
                conversation_id=1,
                input_snapshot_id=stored.id,
                data_generation=2,
                computed_at=NOW,
            )
        )
        row = session.get_one(AnalysisInputSnapshot, stored.id)
        if damage == "hash":
            row.input_hash = "0" * 64
        elif damage == "compressed":
            row.payload = b"not compressed"
        elif damage == "count":
            row.participant_count = 2
        elif damage == "oversized_frame":
            row.payload = zstd.ZstdCompressor().compress(b" " * 10_000)
        elif damage == "unknown_frame_size":
            raw = zstd.ZstdDecompressor().decompress(snapshot.payload)
            row.payload = zstd.ZstdCompressor(write_content_size=False).compress(raw)
        elif damage == "trailing_frame":
            row.payload += zstd.ZstdCompressor().compress(b"{}")
        else:
            payload = TypeAdapter(dict[str, object]).validate_json(
                zstd.ZstdDecompressor().decompress(snapshot.payload)
            )
            if damage == "catalogue":
                payload["opinions"] = []
            elif damage == "sparse_participants":
                payload["participant_count"] = 2_000_000_000
                row.participant_count = 2_000_000_000
            elif damage in ("duplicate_cell", "unordered_cells"):
                payload["participant_count"] = 2
                row.participant_count = 2
                row.vote_count = 2
                payload["votes"] = [
                    {"participant_index": 1, "opinion_index": 0, "vote": 1},
                    {
                        "participant_index": 1 if damage == "duplicate_cell" else 0,
                        "opinion_index": 0,
                        "vote": -1,
                    },
                ]
            else:
                payload["votes"] = [
                    {
                        "participant_index": 1 if damage == "cell" else 0,
                        "opinion_index": 0,
                        "vote": True if damage == "choice" else 1,
                    }
                ]
            raw = canonical_json_bytes(payload)
            row.input_hash = hashlib.sha256(raw).hexdigest()
            row.payload = zstd.ZstdCompressor().compress(raw)
    with Session(engine) as session:
        result = resolve_retained_analysis_baseline(
            session=session, conversation_id=1, analysis_snapshot_id=1
        )
        assert result.status == "unsupported"
        assert result.reason == "invalid_numerical_evidence"
