from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta


@dataclass(frozen=True)
class RetryPolicy:
    burst_attempts: int
    burst_interval_seconds: int
    cooldown_seconds: int


def next_retry_at(*, now: datetime, attempt_count: int, policy: RetryPolicy) -> datetime:
    if attempt_count <= 0:
        msg = "attempt_count must be positive"
        raise ValueError(msg)

    if attempt_count > 1 and (attempt_count - 1) % policy.burst_attempts == 0:
        delay_seconds = policy.cooldown_seconds
    else:
        delay_seconds = policy.burst_interval_seconds

    return now.astimezone(UTC) + timedelta(seconds=delay_seconds)
