from __future__ import annotations

from dataclasses import dataclass, replace
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from datetime import datetime, timedelta


@dataclass(frozen=True)
class WorkState:
    last_completed_data_generation: int = 0
    running_data_generation: int | None = None
    dirty_since: datetime | None = None
    next_run_at: datetime | None = None
    attempt_generation: int | None = None
    attempt_count: int = 0
    non_retryable_generation: int | None = None
    lease_owner: str | None = None
    lease_token: str | None = None
    lease_expires_at: datetime | None = None


def work_needed(*, state: WorkState, current_generation: int) -> bool:
    if current_generation <= state.last_completed_data_generation:
        return False
    return (
        state.non_retryable_generation is None
        or current_generation > state.non_retryable_generation
    )


def can_claim(*, state: WorkState, current_generation: int, now: datetime) -> bool:
    if state.running_data_generation is not None:
        return False
    if not work_needed(state=state, current_generation=current_generation):
        return False
    return state.next_run_at is None or state.next_run_at <= now


def on_mutation(
    *,
    state: WorkState,
    now: datetime,
    debounce: timedelta,
    max_debounce: timedelta,
) -> WorkState:
    dirty_since = state.dirty_since or now
    if state.running_data_generation is not None:
        return replace(state, dirty_since=dirty_since)

    return replace(
        state,
        dirty_since=dirty_since,
        next_run_at=min(dirty_since + max_debounce, now + debounce),
    )


def on_claim(
    *,
    state: WorkState,
    current_generation: int,
    now: datetime,
    lease_owner: str,
    lease_token: str,
    lease_ttl: timedelta,
) -> WorkState:
    attempt_count = state.attempt_count + 1 if state.attempt_generation == current_generation else 1
    return replace(
        state,
        running_data_generation=current_generation,
        dirty_since=None,
        next_run_at=None,
        attempt_generation=current_generation,
        attempt_count=attempt_count,
        lease_owner=lease_owner,
        lease_token=lease_token,
        lease_expires_at=now + lease_ttl,
    )


def on_success(*, state: WorkState, current_generation: int, now: datetime) -> WorkState:
    if state.running_data_generation is None:
        msg = "cannot complete work state without running generation"
        raise ValueError(msg)

    completed_generation = state.running_data_generation
    next_generation_exists = current_generation > completed_generation
    return replace(
        state,
        last_completed_data_generation=max(
            state.last_completed_data_generation,
            completed_generation,
        ),
        running_data_generation=None,
        dirty_since=now if next_generation_exists else None,
        next_run_at=now if next_generation_exists else None,
        non_retryable_generation=None
        if state.non_retryable_generation is None
        or state.non_retryable_generation <= completed_generation
        else state.non_retryable_generation,
        lease_owner=None,
        lease_token=None,
        lease_expires_at=None,
    )


def on_retryable_failure(
    *,
    state: WorkState,
    current_generation: int,
    now: datetime,
    retry_delay: timedelta,
) -> WorkState:
    if state.running_data_generation is None:
        msg = "cannot fail work state without running generation"
        raise ValueError(msg)

    failed_generation = state.running_data_generation
    newer_generation_exists = current_generation > failed_generation
    return replace(
        state,
        running_data_generation=None,
        dirty_since=now if newer_generation_exists else state.dirty_since,
        next_run_at=now if newer_generation_exists else now + retry_delay,
        lease_owner=None,
        lease_token=None,
        lease_expires_at=None,
    )


def on_non_retryable_failure(
    *,
    state: WorkState,
    current_generation: int,
    now: datetime,
) -> WorkState:
    if state.running_data_generation is None:
        msg = "cannot fail work state without running generation"
        raise ValueError(msg)

    failed_generation = state.running_data_generation
    newer_generation_exists = current_generation > failed_generation
    return replace(
        state,
        running_data_generation=None,
        dirty_since=now if newer_generation_exists else state.dirty_since,
        next_run_at=now if newer_generation_exists else None,
        non_retryable_generation=None if newer_generation_exists else failed_generation,
        lease_owner=None,
        lease_token=None,
        lease_expires_at=None,
    )


def recover_expired_running(
    *,
    state: WorkState,
    current_generation: int,
    now: datetime,
) -> WorkState:
    if state.running_data_generation is None:
        return state
    if state.lease_expires_at is None or state.lease_expires_at >= now:
        return state

    should_run_latest = work_needed(state=state, current_generation=current_generation)
    return replace(
        state,
        running_data_generation=None,
        dirty_since=now if should_run_latest else None,
        next_run_at=now if should_run_latest else None,
        lease_owner=None,
        lease_token=None,
        lease_expires_at=None,
    )
