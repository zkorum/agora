from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from threading import Event
from typing import TYPE_CHECKING, Literal
from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlalchemy import func, insert, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session
from test_stats import current_count, seed

from credit_voting_worker.capture import capture_inputs
from credit_voting_worker.generated_models import (
    AnalysisInputMode,
    Base,
    Conversation,
    ConversationAnalysisClose,
    CreditVotingConfig,
    QvAllocation,
    QvCalculation,
    QvCalculationState,
    QvInputAllocation,
    QvInputBallot,
    QvInputBallotEligibility,
    QvInputItem,
    QvInputSnapshot,
    QvResponse,
    QvResponseVersion,
    QvResultItem,
    RankingItem,
    RankingItemContent,
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
                vote_buffer_epoch=uuid4(),
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


def add_opposing_choice(*, engine: Engine, conversation_id: int) -> str:
    with Session(engine) as session, session.begin():
        original = session.scalars(select(RankingItemContent)).one()
        version = session.scalars(select(QvResponseVersion)).one()
        config = session.scalars(select(CreditVotingConfig)).one()
        item = session.scalars(
            insert(RankingItem)
            .values(
                conversation_id=conversation_id, slug_id=uuid4().hex[:8], is_seed=True, position=1
            )
            .returning(RankingItem)
        ).one()
        content = session.scalars(
            insert(RankingItemContent)
            .values(
                ranking_item_id=item.id,
                conversation_content_id=original.conversation_content_id,
                title="B",
            )
            .returning(RankingItemContent)
        ).one()
        item.current_content_id = content.id
        session.execute(
            insert(QvAllocation).values(
                version_id=version.id,
                conversation_id=conversation_id,
                item_id=item.id,
                content_id=content.id,
                votes=-2,
            )
        )
        version.credits_spent = 13
        config.item_count = 2
        return item.slug_id


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
        eligibility = session.scalars(select(QvInputBallotEligibility)).one()
        assert eligibility.snapshot_id == snapshot
        assert eligibility.ballot_index == 0
        assert eligibility.user_id == fixture.user_id
        assert eligibility.is_account_hidden is False
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


def test_live_refresh_keeps_original_close_and_publishes_only_the_requested_generation(
    engine: Engine,
) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    original = claim(engine)
    original_snapshot = capture(engine=engine, work=original)
    assert publish(engine=engine, work=original, snapshot=original_snapshot)
    with Session(engine) as session, session.begin():
        bound_close = session.scalars(select(ConversationAnalysisClose)).one()
        bound_close.selected_input_mode = AnalysisInputMode.live
        bound_close.served_input_mode = AnalysisInputMode.live
        bound_close.served_result_revision = original.generation
        bound_close.requested_result_revision = original.generation + 1
        session.execute(update(QvResponse).values(current_version_id=None))
        session.execute(update(QvCalculationState).values(generation=original.generation + 1))
        session.execute(
            insert(QvCalculation).values(
                conversation_id=fixture.conversation_id, generation=original.generation + 1
            )
        )
    live = claim(engine)
    live_snapshot = capture(engine=engine, work=live)
    assert publish(engine=engine, work=live, snapshot=live_snapshot)
    with Session(engine) as session:
        bound_close = session.scalars(select(ConversationAnalysisClose)).one()
        assert bound_close.source_revision == original.generation
        assert bound_close.served_result_revision == live.generation
        conversation = session.scalars(select(Conversation)).one()
        assert conversation.closing_target_revision == original.generation
        assert conversation.closed_finalized_at == bound_close.finalized_at
        totals = dict(
            session.execute(select(QvResultItem.snapshot_id, QvResultItem.net_units)).tuples().all()
        )
        assert totals == {original_snapshot: 3, live_snapshot: 0}


def test_deletion_after_capture_and_transient_retry_reuse_identical_inputs(engine: Engine) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    snapshot = capture(engine=engine, work=work)
    release_failed_claim(engine=engine, claim=work, permanent=False)
    with Session(engine) as session, session.begin():
        session.execute(update(User).where(User.id == fixture.user_id).values(is_deleted=True))
        session.execute(update(QvResponse).values(account_hidden_at=datetime.now()))
        session.execute(
            insert(QvCalculation).values(conversation_id=fixture.conversation_id, generation=2)
        )
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
    follow_up = claim(engine)
    assert follow_up.generation == 2
    live_snapshot = capture(engine=engine, work=follow_up)
    assert publish(engine=engine, work=follow_up, snapshot=live_snapshot)
    with Session(engine) as session:
        assert session.get_one(QvInputSnapshot, live_snapshot).participant_count == 0
        bound = session.scalars(select(ConversationAnalysisClose)).one()
        assert bound.source_revision == work.generation
        assert bound.served_input_mode == AnalysisInputMode.closing


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


@pytest.mark.parametrize(
    "change",
    ["item_deleted", "account_hidden", "content_unavailable", "allocation_deleted", "edited"],
)
def test_capture_projects_only_unavailable_choices_without_rewriting_the_saved_ballot(
    engine: Engine, change: str
) -> None:
    fixture = seed(engine)
    surviving_slug = add_opposing_choice(engine=engine, conversation_id=fixture.conversation_id)
    with Session(engine) as session, session.begin():
        item = session.scalars(
            select(RankingItem).where(RankingItem.slug_id != surviving_slug)
        ).one()
        excluded_slug = item.slug_id
        if change == "item_deleted":
            item.current_content_id = None
            item.deleted_at = datetime.now()
        elif change == "account_hidden":
            item.account_hidden_at = datetime.now()
        elif change == "content_unavailable":
            item.current_content_id = None
        elif change == "allocation_deleted":
            session.execute(
                update(QvAllocation)
                .where(QvAllocation.item_id == item.id)
                .values(deleted_at=datetime.now())
            )
        else:
            original = session.scalars(
                select(RankingItemContent).where(RankingItemContent.ranking_item_id == item.id)
            ).one()
            item.current_content_id = session.scalars(
                insert(RankingItemContent)
                .values(
                    ranking_item_id=item.id,
                    conversation_content_id=original.conversation_content_id,
                    title="A replacement",
                )
                .returning(RankingItemContent.id)
            ).one()
    initialize_missing_stats(engine=engine)
    refresh_next_stats(engine=engine)
    assert current_count(engine)[0] == 1
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    snapshot = capture(engine=engine, work=work)
    assert publish(engine=engine, work=work, snapshot=snapshot)
    with Session(engine) as session:
        allocations = (
            session.execute(
                select(
                    QvInputAllocation.ballot_index,
                    QvInputAllocation.item_slug_id,
                    QvInputAllocation.votes,
                ).where(QvInputAllocation.snapshot_id == snapshot)
            )
            .tuples()
            .all()
        )
        assert allocations == [(0, surviving_slug, -2)]
        assert session.scalars(select(QvInputSnapshot.participant_count)).one() == 1
        assert session.scalar(select(func.count()).select_from(QvInputBallot)) == 1
        eligibility = session.scalars(select(QvInputBallotEligibility)).one()
        assert eligibility.user_id == fixture.user_id
        result = session.scalars(
            select(QvResultItem).where(QvResultItem.item_slug_id == surviving_slug)
        ).one()
        assert (result.support_units, result.opposition_units, result.net_units) == (0, 2, -2)
        assert (result.supporting_participant_count, result.opposing_participant_count) == (0, 1)
        # The original 9 + 4 credit spending is not rewritten as the projected cost.
        assert session.scalars(select(QvResponseVersion.credits_spent)).one() == 13
        assert sorted(session.scalars(select(QvAllocation.votes)).all()) == [-2, 3]
        if change in ("allocation_deleted", "edited"):
            excluded = session.scalars(
                select(QvResultItem).where(QvResultItem.item_slug_id == excluded_slug)
            ).one()
            assert excluded.net_units == 0
        else:
            assert (
                session.scalar(
                    select(QvInputItem.item_slug_id).where(
                        QvInputItem.item_slug_id == excluded_slug
                    )
                )
                is None
            )


@pytest.mark.parametrize("change", ["items", "allocations"])
def test_fully_excluded_ballot_publishes_empty_input_without_counting_a_participant(
    engine: Engine, change: str
) -> None:
    fixture = seed(engine)
    add_opposing_choice(engine=engine, conversation_id=fixture.conversation_id)
    with Session(engine) as session, session.begin():
        if change == "items":
            session.execute(
                update(RankingItem).values(current_content_id=None, deleted_at=datetime.now())
            )
        else:
            session.execute(update(QvAllocation).values(deleted_at=datetime.now()))
    initialize_missing_stats(engine=engine)
    refresh_next_stats(engine=engine)
    assert current_count(engine)[0] == 0
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    snapshot = capture(engine=engine, work=work)
    assert publish(engine=engine, work=work, snapshot=snapshot)
    with Session(engine) as session:
        assert session.scalars(select(QvInputSnapshot.participant_count)).one() == 0
        assert session.scalar(select(func.count()).select_from(QvInputBallot)) == 0
        assert session.scalar(select(func.count()).select_from(QvInputBallotEligibility)) == 0
        assert session.scalar(select(func.count()).select_from(QvInputAllocation)) == 0
        assert all(result.net_units == 0 for result in session.scalars(select(QvResultItem)))
        assert session.scalars(select(QvCalculation.status)).one() == "ready"
        assert session.scalars(select(QvResponseVersion.credits_spent)).one() == 13


@pytest.mark.parametrize("damage", ["credits", "opposition"])
@pytest.mark.parametrize("exclusion", ["partial", "items", "allocations"])
def test_unavailable_allocations_do_not_hide_invalid_original_ballot_provenance(
    engine: Engine,
    damage: Literal["credits", "opposition"],
    exclusion: Literal["partial", "items", "allocations"],
) -> None:
    fixture = seed(engine)
    surviving_slug = add_opposing_choice(engine=engine, conversation_id=fixture.conversation_id)
    with Session(engine) as session, session.begin():
        item = session.scalars(
            select(RankingItem).where(RankingItem.slug_id != surviving_slug)
        ).one()
        item.current_content_id = None
        item.deleted_at = datetime.now()
        if damage == "credits":
            session.execute(update(QvResponseVersion).values(credits_spent=12))
        else:
            session.execute(update(CreditVotingConfig).values(allow_opposition=False))
            session.execute(update(QvResponseVersion).values(allow_opposition=False))
            # The invalid opposition is on the excluded item, not the surviving one.
            session.execute(
                update(QvAllocation).where(QvAllocation.item_id == item.id).values(votes=-3)
            )
            session.execute(
                update(QvAllocation).where(QvAllocation.item_id != item.id).values(votes=2)
            )
        if exclusion == "items":
            session.execute(
                update(RankingItem).values(current_content_id=None, deleted_at=datetime.now())
            )
        elif exclusion == "allocations":
            session.execute(update(QvAllocation).values(deleted_at=datetime.now()))
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    with pytest.raises(InvalidInputError):
        capture(engine=engine, work=work)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(QvInputSnapshot)) == 0
        assert session.scalar(select(func.count()).select_from(QvInputBallotEligibility)) == 0
        assert session.scalars(select(QvCalculation.input_snapshot_id)).one() is None


def test_projected_capture_is_reused_on_retry_even_if_live_sources_change(engine: Engine) -> None:
    fixture = seed(engine)
    surviving_slug = add_opposing_choice(engine=engine, conversation_id=fixture.conversation_id)
    with Session(engine) as session, session.begin():
        session.execute(
            update(RankingItem)
            .where(RankingItem.slug_id != surviving_slug)
            .values(account_hidden_at=datetime.now())
        )
    close(engine=engine, conversation_id=fixture.conversation_id)
    work = claim(engine)
    snapshot = capture(engine=engine, work=work)
    release_failed_claim(engine=engine, claim=work, permanent=False)
    with Session(engine) as session, session.begin():
        session.execute(update(RankingItem).values(account_hidden_at=None))
        session.execute(update(QvResponseVersion).values(credits_spent=12))
        session.execute(update(QvCalculation).values(next_attempt_at=func.clock_timestamp()))
    retry = claim(engine)
    assert capture(engine=engine, work=retry) == snapshot
    assert publish(engine=engine, work=retry, snapshot=snapshot)
    with Session(engine) as session:
        assert session.execute(
            select(QvInputAllocation.item_slug_id, QvInputAllocation.votes).where(
                QvInputAllocation.snapshot_id == snapshot
            )
        ).tuples().all() == [(surviving_slug, -2)]
        assert session.scalar(select(func.count()).select_from(QvInputSnapshot)) == 1


def test_reopen_and_reclose_fence_old_publication_and_replace_current_reference(
    engine: Engine,
) -> None:
    fixture = seed(engine)
    close(engine=engine, conversation_id=fixture.conversation_id)
    old = claim(engine)
    old_snapshot = capture(engine=engine, work=old)
    with Session(engine) as session, session.begin():
        session.execute(
            insert(QvCalculation).values(
                conversation_id=fixture.conversation_id, generation=old.generation + 1
            )
        )
    reopen(engine=engine, conversation_id=fixture.conversation_id)
    assert claim_next(engine=engine, lease_seconds=120) is None
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
