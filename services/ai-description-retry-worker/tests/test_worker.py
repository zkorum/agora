from __future__ import annotations

import logging
from threading import Event
from typing import TYPE_CHECKING
from unittest.mock import Mock

import pytest
from agora_analysis_worker_shared.config import AiDescriptionWorkerSettings
from sqlalchemy import create_engine, event
from sqlalchemy.exc import OperationalError

from ai_description_retry_worker import worker

if TYPE_CHECKING:
    from collections.abc import Generator
    from pathlib import Path

    from sqlalchemy import Engine


@pytest.fixture
def settings(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> AiDescriptionWorkerSettings:
    monkeypatch.chdir(tmp_path)
    return AiDescriptionWorkerSettings(
        connection_string="postgresql://test/db",
        connection_string_read="postgresql://test/db",
        worker_poll_idle_sleep_seconds=0.5,
        db_materialization_interval_seconds=5,
        running_recovery_interval_seconds=10,
    )


@pytest.fixture
def database(monkeypatch: pytest.MonkeyPatch) -> Generator[Engine]:
    engine = create_engine("sqlite://")
    monkeypatch.setattr(worker, "create_ready_postgres_engine", Mock(return_value=engine))
    monkeypatch.setattr(worker, "recover_expired_ai_description_work", Mock(return_value=[]))
    monkeypatch.setattr(
        worker, "materialize_requested_lineage_description_work", Mock(return_value=[])
    )
    monkeypatch.setattr(
        worker, "fetch_claimable_ai_description_work_conversation_ids", Mock(return_value=[])
    )
    monkeypatch.setattr(worker, "process_ai_description_conversation_ids", Mock(return_value=0))
    try:
        yield engine
    finally:
        engine.dispose()


def test_database_failures_back_off_recover_and_redact_secrets(
    monkeypatch: pytest.MonkeyPatch,
    settings: AiDescriptionWorkerSettings,
    database: Engine,
    caplog: pytest.LogCaptureFixture,
) -> None:
    error = OperationalError(
        "SELECT :password",
        {"password": "sensitive-password"},
        RuntimeError("sensitive-password"),
        connection_invalidated=True,
    )
    scan = Mock(side_effect=[error, error, error, error, error, error, [], error])
    monkeypatch.setattr(worker, "fetch_claimable_ai_description_work_conversation_ids", scan)
    sleeps: list[float] = []
    with caplog.at_level(logging.INFO):
        worker.run_worker(
            settings=settings,
            worker_id="test",
            description_generator=Mock(),
            simulation_runtime=None,
            should_continue=lambda: len(sleeps) < 8,
            sleep=sleeps.append,
        )
    assert sleeps == [5, 10, 20, 40, 60, 60, 0.5, 5]
    assert "Database polling recovered after 6 failed cycle(s)" in caplog.text
    assert "phase=scanning-primary" in caplog.text
    assert "connection_invalidated=true" in caplog.text
    assert "sensitive-password" not in caplog.text
    assert "SELECT" not in caplog.text


def test_empty_polls_back_off_and_do_not_rematerialize_every_cycle(
    monkeypatch: pytest.MonkeyPatch,
    settings: AiDescriptionWorkerSettings,
    database: Engine,
) -> None:
    elapsed = 0.0
    sleeps: list[float] = []

    def sleep(seconds: float) -> None:
        nonlocal elapsed
        elapsed += seconds
        sleeps.append(seconds)

    monkeypatch.setattr(worker.time, "monotonic", lambda: elapsed)
    materialize = Mock(return_value=[])
    monkeypatch.setattr(worker, "materialize_requested_lineage_description_work", materialize)
    worker.run_worker(
        settings=settings,
        worker_id="test",
        description_generator=Mock(),
        simulation_runtime=None,
        should_continue=lambda: len(sleeps) < 6,
        sleep=sleep,
    )
    assert sleeps == [0.5, 1, 2, 4, 5, 5]
    assert materialize.call_count == 3


def test_materialization_failure_is_retried_before_any_claim(
    monkeypatch: pytest.MonkeyPatch,
    settings: AiDescriptionWorkerSettings,
    database: Engine,
    caplog: pytest.LogCaptureFixture,
) -> None:
    materialize = Mock(side_effect=[OperationalError(None, None, RuntimeError("offline")), []])
    scan = Mock(return_value=[])
    monkeypatch.setattr(worker, "materialize_requested_lineage_description_work", materialize)
    monkeypatch.setattr(worker, "fetch_claimable_ai_description_work_conversation_ids", scan)
    sleeps: list[float] = []
    with caplog.at_level(logging.INFO):
        worker.run_worker(
            settings=settings,
            worker_id="test",
            description_generator=Mock(),
            simulation_runtime=None,
            should_continue=lambda: len(sleeps) < 2,
            sleep=sleeps.append,
        )
    assert materialize.call_count == 2
    assert scan.call_count == 1
    assert sleeps == [5, 0.5]
    assert "phase=materializing-primary" in caplog.text


def test_processing_work_resets_idle_backoff(
    monkeypatch: pytest.MonkeyPatch,
    settings: AiDescriptionWorkerSettings,
    database: Engine,
) -> None:
    monkeypatch.setattr(
        worker,
        "fetch_claimable_ai_description_work_conversation_ids",
        Mock(side_effect=[[], [], [], [], [], [10], []]),
    )
    monkeypatch.setattr(worker, "process_ai_description_conversation_ids", Mock(return_value=1))
    sleeps: list[float] = []
    worker.run_worker(
        settings=settings,
        worker_id="test",
        description_generator=Mock(),
        simulation_runtime=None,
        should_continue=lambda: len(sleeps) < 6,
        sleep=sleeps.append,
    )
    assert sleeps == [0.5, 1, 2, 4, 5, 0.5]


def test_shutdown_during_scan_does_not_claim_more_work(
    monkeypatch: pytest.MonkeyPatch,
    settings: AiDescriptionWorkerSettings,
    database: Engine,
) -> None:
    stop = Event()

    def scan(engine: Engine, **kwargs: object) -> list[int]:
        stop.set()
        return [10]

    process = Mock()
    sleep = Mock()
    monkeypatch.setattr(worker, "fetch_claimable_ai_description_work_conversation_ids", scan)
    monkeypatch.setattr(worker, "process_ai_description_conversation_ids", process)
    worker.run_worker(
        settings=settings,
        worker_id="test",
        description_generator=Mock(),
        simulation_runtime=None,
        should_continue=lambda: not stop.is_set(),
        sleep=sleep,
    )
    process.assert_not_called()
    sleep.assert_not_called()


def test_recent_materialization_scans_writer_once_and_preserves_priority(
    monkeypatch: pytest.MonkeyPatch,
    settings: AiDescriptionWorkerSettings,
    database: Engine,
) -> None:
    read_engine = create_engine("sqlite://")
    disposed: list[Engine] = []
    record_disposal = disposed.append
    event.listen(database, "engine_disposed", record_disposal)
    event.listen(read_engine, "engine_disposed", record_disposal)
    create = Mock(side_effect=[database, read_engine])
    scan = Mock(return_value=[20, 10])
    process = Mock(return_value=1)
    monkeypatch.setattr(worker, "create_ready_postgres_engine", create)
    monkeypatch.setattr(
        worker, "materialize_requested_lineage_description_work", Mock(return_value=[10])
    )
    monkeypatch.setattr(worker, "fetch_claimable_ai_description_work_conversation_ids", scan)
    monkeypatch.setattr(worker, "process_ai_description_conversation_ids", process)
    settings.connection_string_read = "postgresql://replica/db"
    worker.run_worker(
        settings=settings,
        worker_id="test",
        description_generator=Mock(),
        simulation_runtime=None,
        should_continue=lambda: process.call_count == 0,
        sleep=Mock(),
    )
    assert scan.call_count == 1
    assert scan.call_args.args == (database,)
    assert process.call_args.kwargs["conversation_ids"] == [20, 10]
    assert disposed == [read_engine, database]
    event.remove(database, "engine_disposed", record_disposal)
    event.remove(read_engine, "engine_disposed", record_disposal)


def test_unexpected_errors_exit_and_dispose_instead_of_retrying_forever(
    monkeypatch: pytest.MonkeyPatch,
    settings: AiDescriptionWorkerSettings,
    database: Engine,
) -> None:
    disposed = Mock()
    event.listen(database, "engine_disposed", disposed)
    monkeypatch.setattr(
        worker,
        "fetch_claimable_ai_description_work_conversation_ids",
        Mock(side_effect=ValueError("programming error")),
    )
    with pytest.raises(ValueError, match="programming error"):
        worker.run_worker(
            settings=settings,
            worker_id="test",
            description_generator=Mock(),
            simulation_runtime=None,
            should_continue=lambda: True,
            sleep=Mock(),
        )
    assert disposed.call_count == 1
    event.remove(database, "engine_disposed", disposed)
