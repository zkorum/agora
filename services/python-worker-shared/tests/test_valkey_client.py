from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

from agora_worker_shared.valkey_client import datetime_to_epoch_ms


def test_datetime_to_epoch_ms_treats_naive_datetimes_as_utc() -> None:
    value = datetime(2026, 5, 30, 12, 0, 0)

    assert datetime_to_epoch_ms(value) == 1_780_142_400_000


def test_datetime_to_epoch_ms_preserves_aware_offsets() -> None:
    value = datetime(2026, 5, 30, 14, 0, 0, tzinfo=timezone(timedelta(hours=2)))

    assert datetime_to_epoch_ms(value) == datetime_to_epoch_ms(
        datetime(2026, 5, 30, 12, 0, 0, tzinfo=UTC)
    )
