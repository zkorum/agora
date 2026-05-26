from __future__ import annotations

from datetime import UTC, datetime, timedelta

from agora_worker_shared.work_state import (
    WorkState,
    can_claim,
    on_claim,
    on_mutation,
    on_non_retryable_failure,
    on_retryable_failure,
    on_success,
    recover_expired_running,
    work_needed,
)

NOW = datetime(2026, 5, 13, 12, 0, 0, tzinfo=UTC)
DEBOUNCE = timedelta(seconds=5)
MAX_DEBOUNCE = timedelta(seconds=30)
LEASE_TTL = timedelta(minutes=10)


def test_work_needed_is_generation_comparison() -> None:
    state = WorkState(last_completed_data_generation=10)

    assert not work_needed(state=state, current_generation=10)
    assert work_needed(state=state, current_generation=11)


def test_can_claim_only_when_not_running_and_due() -> None:
    due_state = WorkState(last_completed_data_generation=10, next_run_at=NOW)
    future_state = WorkState(
        last_completed_data_generation=10,
        next_run_at=NOW + timedelta(seconds=1),
    )
    running_state = WorkState(
        last_completed_data_generation=9,
        running_data_generation=10,
    )

    assert can_claim(state=due_state, current_generation=11, now=NOW)
    assert not can_claim(state=future_state, current_generation=11, now=NOW)
    assert not can_claim(state=running_state, current_generation=11, now=NOW)


def test_mutation_debounces_without_starvation() -> None:
    first_dirty = on_mutation(
        state=WorkState(last_completed_data_generation=10),
        now=NOW,
        debounce=DEBOUNCE,
        max_debounce=MAX_DEBOUNCE,
    )
    later_dirty = on_mutation(
        state=first_dirty,
        now=NOW + timedelta(seconds=29),
        debounce=DEBOUNCE,
        max_debounce=MAX_DEBOUNCE,
    )

    assert first_dirty.next_run_at == NOW + DEBOUNCE
    assert later_dirty.dirty_since == NOW
    assert later_dirty.next_run_at == NOW + MAX_DEBOUNCE


def test_claim_records_running_generation_and_resets_dirty_state() -> None:
    state = WorkState(
        last_completed_data_generation=10,
        dirty_since=NOW,
        next_run_at=NOW,
    )

    claimed = on_claim(
        state=state,
        current_generation=11,
        now=NOW,
        lease_owner="worker-1",
        lease_token="token-1",
        lease_ttl=LEASE_TTL,
    )

    assert claimed.running_data_generation == 11
    assert claimed.dirty_since is None
    assert claimed.next_run_at is None
    assert claimed.attempt_generation == 11
    assert claimed.attempt_count == 1
    assert claimed.lease_expires_at == NOW + LEASE_TTL


def test_success_requeues_immediately_when_newer_generation_exists() -> None:
    state = WorkState(
        last_completed_data_generation=9,
        running_data_generation=10,
        lease_owner="worker-1",
        lease_token="token-1",
        lease_expires_at=NOW + LEASE_TTL,
    )

    finished = on_success(state=state, current_generation=11, now=NOW)

    assert finished.last_completed_data_generation == 10
    assert finished.running_data_generation is None
    assert finished.next_run_at == NOW
    assert finished.dirty_since == NOW


def test_retryable_failure_retries_only_same_generation_when_no_newer_generation() -> None:
    state = WorkState(
        last_completed_data_generation=9,
        running_data_generation=10,
        lease_owner="worker-1",
        lease_token="token-1",
        lease_expires_at=NOW + LEASE_TTL,
    )

    same_generation = on_retryable_failure(
        state=state,
        current_generation=10,
        now=NOW,
        retry_delay=timedelta(minutes=5),
    )
    newer_generation = on_retryable_failure(
        state=state,
        current_generation=11,
        now=NOW,
        retry_delay=timedelta(minutes=5),
    )

    assert same_generation.next_run_at == NOW + timedelta(minutes=5)
    assert newer_generation.next_run_at == NOW


def test_non_retryable_failure_blocks_only_failed_generation() -> None:
    state = WorkState(
        last_completed_data_generation=9,
        running_data_generation=10,
        lease_owner="worker-1",
        lease_token="token-1",
        lease_expires_at=NOW + LEASE_TTL,
    )

    same_generation = on_non_retryable_failure(state=state, current_generation=10, now=NOW)
    newer_generation = on_non_retryable_failure(state=state, current_generation=11, now=NOW)

    assert same_generation.non_retryable_generation == 10
    assert same_generation.next_run_at is None
    assert newer_generation.non_retryable_generation is None
    assert newer_generation.next_run_at == NOW


def test_recover_expired_running_requeues_latest_needed_work() -> None:
    state = WorkState(
        last_completed_data_generation=9,
        running_data_generation=10,
        lease_owner="worker-1",
        lease_token="token-1",
        lease_expires_at=NOW - timedelta(seconds=1),
    )

    recovered = recover_expired_running(state=state, current_generation=11, now=NOW)

    assert recovered.running_data_generation is None
    assert recovered.next_run_at == NOW
    assert recovered.dirty_since == NOW
    assert recovered.lease_token is None
