from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from threading import Event
from typing import TYPE_CHECKING
from unittest.mock import patch

import pytest
from sqlalchemy import func, insert, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session
from test_stats import current_count, seed

from credit_voting_worker.capture import capture_inputs
from credit_voting_worker.generated_models import (
    Base,
    Conversation,
    CreditVotingConfig,
    QvAllocation,
    QvCalculation,
    QvCalculationState,
    QvInputAllocation,
    QvInputSnapshot,
    QvResponse,
    QvResponseVersion,
    QvResultItem,
    RealtimeEventOutbox,
    User,
)
from credit_voting_worker.stats import initialize_missing_stats, refresh_next_stats
from credit_voting_worker.tally import ItemTotal, compute_results, publish_results, rank_totals
from credit_voting_worker.work import (
    Claim,
    InvalidInputError,
    claim_next,
    release_failed_claim,
    retry_delay_seconds,
)

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy import Engine


def close(*, engine: Engine, conversation_id: int) -> None:
    with Session(engine) as session, session.begin():
        session.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(is_closed=True, closed_finalized_at=None)
        )
        session.execute(
            pg_insert(QvCalculationState)
            .values(conversation_id=conversation_id)
            .on_conflict_do_nothing()
        )
        generation = session.scalars(
            update(QvCalculationState)
            .where(QvCalculationState.conversation_id == conversation_id)
            .values(generation=QvCalculationState.generation + 1)
            .returning(QvCalculationState.generation)
        ).one()
        session.execute(
            insert(QvCalculation).values(conversation_id=conversation_id, generation=generation)
        )


def reopen(*, engine: Engine, conversation_id: int) -> None:
    with Session(engine) as session, session.begin():
        session.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(
                is_closed=False,
                closed_finalized_at=None,
                closing_target_revision=None,
            )
        )
        session.execute(
            update(QvCalculationState)
            .where(QvCalculationState.conversation_id == conversation_id)
            .values(generation=QvCalculationState.generation + 1)
        )


def claim(engine: Engine) -> Claim:
    result = claim_next(engine=engine, lease_seconds=120)
    assert result is not None
    return result


def capture(*, engine: Engine, work: Claim) -> UUID:
    snapshot = capture_inputs(
        engine=engine, claim=work, lease_seconds=120, should_stop=lambda: False
    )
    assert snapshot is not None
    return snapshot


def publish(*, engine: Engine, work: Claim, snapshot: UUID) -> bool:
    totals = compute_results(engine=engine, claim=work, snapshot_id=snapshot, lease_seconds=120)
    assert totals is not None
    return publish_results(engine=engine, claim=work, snapshot_id=snapshot, results=totals)


def test_competition_ranks_signed_units_and_deterministic_ties() -> None:
    totals = [
        ItemTotal("second", 1, 3, 1, 1, 1),
        ItemTotal("first", 0, 2, 0, 1, 0),
        ItemTotal("zero", 2, 0, 0, 0, 0),
        ItemTotal("negative", 3, 0, 2, 0, 1),
    ]
    ranked = rank_totals(totals)
    assert [row.rank for row in ranked] == [1, 1, 3, 4]
    assert [row.total.slug_id for row in ranked] == ["first", "second", "zero", "negative"]
    assert rank_totals([]) == []


def test_capture_precedes_calculation_and_publication_is_atomic(engine: Engine) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    snapshot = capture(engine=engine, work=work)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(QvResultItem)) == 0
        assert session.scalars(select(QvCalculationState.current_calculation_id)).one() is None
        assert session.scalars(select(QvInputSnapshot.participant_count)).one() == 1
    assert publish(engine=engine, work=work, snapshot=snapshot)
    with Session(engine) as session:
        assert (
            session.scalars(select(QvCalculationState.current_calculation_id)).one()
            == work.calculation_id
        )
        result = session.scalars(select(QvResultItem)).one()
        assert (result.net_units, result.support_units, result.opposition_units, result.rank) == (
            3,
            3,
            0,
            1,
        )
        assert session.scalars(select(QvCalculation.status)).one() == "ready"
        assert session.scalars(select(Conversation.closed_finalized_at)).one() is not None
        event = session.scalars(
            select(RealtimeEventOutbox).where(
                RealtimeEventOutbox.event_type == "conversation_qv_calculation_updated"
            )
        ).one()
        assert event.payload["generation"] == 1
        assert "participantCount" not in event.payload


def test_deletion_after_capture_and_transient_retry_reuse_identical_inputs(engine: Engine) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    snapshot = capture(engine=engine, work=work)
    release_failed_claim(engine=engine, claim=work, permanent=False)
    with Session(engine) as session, session.begin():
        session.execute(update(User).where(User.id == fixture.user_id).values(is_deleted=True))
        session.execute(update(QvResponse).values(account_hidden_at=datetime.now()))
        # Deliberately corrupt the working source: retry must not reread it.
        session.execute(update(QvAllocation).values(votes=1))
        session.execute(update(QvCalculation).values(next_attempt_at=func.clock_timestamp()))
    retry = claim(engine)
    assert retry.token != work.token
    assert capture(engine=engine, work=retry) == snapshot
    assert publish(engine=engine, work=retry, snapshot=snapshot)
    initialize_missing_stats(engine=engine)
    refresh_next_stats(engine=engine)
    assert current_count(engine)[0] == 0
    with Session(engine) as session:
        assert session.scalars(select(QvInputSnapshot.participant_count)).one() == 1
        assert session.scalars(select(QvResultItem.net_units)).one() == 3
        assert session.scalars(select(QvInputAllocation.votes)).one() == 3


def test_deleted_before_capture_is_excluded_and_yields_explicit_empty_input(engine: Engine) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    with Session(engine) as session, session.begin():
        session.execute(update(User).values(is_deleted=True))
    work = claim(engine)
    snapshot = capture(engine=engine, work=work)
    assert publish(engine=engine, work=work, snapshot=snapshot)
    with Session(engine) as session:
        assert session.scalars(select(QvInputSnapshot.participant_count)).one() == 0
        assert session.scalars(select(QvResultItem.net_units)).one() == 0


def test_reopen_and_reclose_fence_old_publication_and_replace_current_reference(
    engine: Engine,
) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    old = claim(engine)
    old_snapshot = capture(engine=engine, work=old)
    reopen(engine=engine, conversation_id=fixture.conversation_id)
    close(engine=engine, conversation_id=fixture.conversation_id)
    assert not publish(engine=engine, work=old, snapshot=old_snapshot)
    current = claim(engine)
    assert current.generation == 3
    new_snapshot = capture(engine=engine, work=current)
    assert new_snapshot != old_snapshot
    assert publish(engine=engine, work=current, snapshot=new_snapshot)
    with Session(engine) as session:
        assert (
            session.scalars(select(QvCalculationState.current_calculation_id)).one()
            == current.calculation_id
        )
        assert session.scalar(select(func.count()).select_from(QvInputSnapshot)) == 2


def test_reopen_does_not_wait_for_an_in_progress_capture(engine: Engine) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    copying = Event()
    release = Event()
    checks = 0

    def pause_after_items() -> bool:
        nonlocal checks
        checks += 1
        if checks == 3:
            copying.set()
            release.wait(15)
        return False

    with ThreadPoolExecutor(max_workers=2) as executor:
        captured = executor.submit(
            capture_inputs,
            engine=engine,
            claim=work,
            lease_seconds=120,
            should_stop=pause_after_items,
        )
        try:
            assert copying.wait(10)
            reopened = executor.submit(
                reopen, engine=engine, conversation_id=fixture.conversation_id
            )
            reopened.result(timeout=5)
        finally:
            release.set()
        snapshot = captured.result(timeout=10)
    assert snapshot is not None
    assert not publish(engine=engine, work=work, snapshot=snapshot)


def test_expired_lease_recovery_prevents_stale_worker_writes(engine: Engine) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    old = claim(engine)
    snapshot = capture(engine=engine, work=old)
    with Session(engine) as session, session.begin():
        session.execute(
            update(QvCalculation).values(
                lease_expires_at=func.clock_timestamp() - timedelta(seconds=1)
            )
        )
    current = claim(engine)
    assert (
        capture_inputs(engine=engine, claim=old, lease_seconds=120, should_stop=lambda: False)
        is None
    )
    release_failed_claim(engine=engine, claim=old, permanent=True)
    assert capture(engine=engine, work=current) == snapshot
    assert publish(engine=engine, work=current, snapshot=snapshot)


def test_interrupted_capture_rolls_back_partial_input_and_can_resume(engine: Engine) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    stop_checks = 0

    def stop_after_items() -> bool:
        nonlocal stop_checks
        stop_checks += 1
        return stop_checks >= 3

    with pytest.raises(InterruptedError):
        capture_inputs(engine=engine, claim=work, lease_seconds=120, should_stop=stop_after_items)
    assert stop_checks == 3
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(QvInputSnapshot)) == 0
        assert session.scalars(select(QvCalculation.input_snapshot_id)).one() is None
    assert publish(engine=engine, work=work, snapshot=capture(engine=engine, work=work))


def test_backoff_is_capped_without_exhausting_a_small_retry_budget() -> None:
    assert 0 < retry_delay_seconds(1) <= 2
    assert 0 < retry_delay_seconds(10_000) <= 300


@pytest.mark.parametrize("allow_opposition", [True, False])
def test_signed_sql_tally_and_support_only_validation(
    *, engine: Engine, allow_opposition: bool
) -> None:
    fixture = seed(engine)
    with Session(engine) as session, session.begin():
        session.execute(update(QvAllocation).values(votes=-3))
        session.execute(update(CreditVotingConfig).values(allow_opposition=allow_opposition))
        session.execute(update(QvResponseVersion).values(allow_opposition=allow_opposition))
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    if not allow_opposition:
        with pytest.raises(InvalidInputError):
            capture(engine=engine, work=work)
        return
    snapshot = capture(engine=engine, work=work)
    assert publish(engine=engine, work=work, snapshot=snapshot)
    with Session(engine) as session:
        result = session.scalars(select(QvResultItem)).one()
        assert (
            result.support_units,
            result.opposition_units,
            result.net_units,
            result.supporting_participant_count,
            result.opposing_participant_count,
        ) == (0, 3, -3, 0, 1)


def test_publication_crash_rolls_back_results_pointer_and_finalization(engine: Engine) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    snapshot = capture(engine=engine, work=work)
    totals = compute_results(engine=engine, claim=work, snapshot_id=snapshot, lease_seconds=120)
    assert totals is not None

    def fail_event(table: type[Base]):
        if table is RealtimeEventOutbox:
            raise RuntimeError("crash before event commit")
        return insert(table)

    with (
        patch("credit_voting_worker.tally.insert", side_effect=fail_event),
        pytest.raises(RuntimeError),
    ):
        publish_results(engine=engine, claim=work, snapshot_id=snapshot, results=totals)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(QvResultItem)) == 0
        assert session.scalars(select(QvCalculationState.current_calculation_id)).one() is None
        assert session.scalars(select(Conversation.closed_finalized_at)).one() is None
        assert session.scalars(select(QvCalculation.status)).one() == "running"
        assert session.scalars(select(QvCalculation.input_snapshot_id)).one() == snapshot
    assert publish_results(engine=engine, claim=work, snapshot_id=snapshot, results=totals)


def test_permanent_invalid_input_fails_without_retrying_or_publishing_partial_capture(
    engine: Engine,
) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    with Session(engine) as session, session.begin():
        session.execute(update(QvResponseVersion).values(credits_spent=8))
    with pytest.raises(InvalidInputError):
        capture(engine=engine, work=work)
    release_failed_claim(engine=engine, claim=work, permanent=True)
    assert claim_next(engine=engine, lease_seconds=120) is None
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(QvInputSnapshot)) == 0
        assert session.scalars(select(QvCalculation.status)).one() == "failed"
        event = session.scalars(
            select(RealtimeEventOutbox).where(
                RealtimeEventOutbox.event_type == "conversation_qv_calculation_updated"
            )
        ).one()
        assert event.payload["status"] == "failed"
