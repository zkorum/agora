from __future__ import annotations

from threading import Event
from unittest.mock import Mock, patch

import pytest

from credit_voting_worker.__main__ import main
from credit_voting_worker.config import Settings


def test_fatal_calculation_failure_stops_statistics_and_propagates() -> None:
    engine = Mock()
    with (
        patch(
            "credit_voting_worker.__main__.Settings",
            return_value=Settings(
                connection_string="postgresql://unused",
                _env_file=None,
            ),
        ),
        patch("credit_voting_worker.__main__.signal.signal"),
        patch("credit_voting_worker.__main__.create_postgres_engine", return_value=engine),
        patch("credit_voting_worker.__main__.run_calculations", side_effect=ValueError("fatal")),
        pytest.raises(ValueError, match="fatal"),
    ):
        main()
    engine.dispose.assert_called_once()


def test_discovery_is_not_repeated_for_every_refresh() -> None:
    engine = Mock()
    stopping_slot: list[Event] = []
    started = Event()

    def calculate(*, engine: object, stopping: Event, lease_seconds: int) -> None:
        stopping_slot.append(stopping)
        started.set()
        stopping.wait(5)

    attempts = 0

    def refresh(**kwargs: object) -> int:
        nonlocal attempts
        assert started.wait(5)
        attempts += 1
        if attempts == 3:
            stopping_slot[0].set()
        return 1

    with (
        patch(
            "credit_voting_worker.__main__.Settings",
            return_value=Settings(
                connection_string="postgresql://unused",
                _env_file=None,
            ),
        ),
        patch("credit_voting_worker.__main__.signal.signal"),
        patch("credit_voting_worker.__main__.create_postgres_engine", return_value=engine),
        patch("credit_voting_worker.__main__.run_calculations", side_effect=calculate),
        patch(
            "credit_voting_worker.__main__.initialize_missing_stats", return_value=0
        ) as discovery,
        patch("credit_voting_worker.__main__.refresh_next_stats", side_effect=refresh),
    ):
        main()
    assert attempts == 3
    discovery.assert_called_once()
    engine.dispose.assert_called_once()
