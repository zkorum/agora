from __future__ import annotations

import logging
import signal
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any
from urllib.parse import unquote, urlparse

from pydantic import TypeAdapter
from valkey import Valkey

from import_worker.config import Settings
from import_worker.database import create_primary_engine, create_session_factory
from import_worker.importer import (
    cleanup_stale_imports,
    complete_ready_imports,
    mark_import_failed,
    process_import_request,
)
from import_worker.queue import (
    IMPORT_BUFFER_KEY,
    ImportValkeyClient,
    extract_minimal_import_request,
    pop_import_requests,
    push_import_event,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session, sessionmaker

    from import_worker.importer import ImportProcessResult
    from import_worker.queue import ImportNotificationEvent, ImportRequest, InvalidImportItem

ANALYSIS_DIRTY_KEY = "analysis:dirty"

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
)
LOGGER = logging.getLogger(__name__)
type LpopResult = str | list[str] | None
LPOP_RESULT: TypeAdapter[LpopResult] = TypeAdapter(LpopResult)
INT_RESULT = TypeAdapter(int)


class SyncValkeyClient:
    def __init__(self, client: Any) -> None:
        self._client = client

    def lpop(self, name: str, count: int | None = None) -> str | list[str] | None:
        return LPOP_RESULT.validate_python(self._client.lpop(name, count=count))

    def llen(self, name: str) -> int:
        return INT_RESULT.validate_python(self._client.llen(name))

    def rpush(self, name: str, *values: str) -> int:
        return INT_RESULT.validate_python(self._client.rpush(name, *values))

    def zadd(self, name: str, mapping: dict[str, int]) -> int:
        return INT_RESULT.validate_python(self._client.zadd(name, mapping))

    def close(self) -> None:
        self._client.close()


@dataclass(frozen=True)
class ProcessedImport:
    result: ImportProcessResult | None
    failure_event: ImportNotificationEvent | None


def _create_valkey_client(url: str) -> ImportValkeyClient:
    parsed_url = urlparse(url)
    use_tls = parsed_url.scheme in {"valkeys", "rediss"}
    host = parsed_url.hostname or "localhost"
    port = parsed_url.port or 6379
    username = unquote(parsed_url.username) if parsed_url.username is not None else None
    password = unquote(parsed_url.password) if parsed_url.password is not None else None
    return SyncValkeyClient(
        Valkey(
            host=host,
            port=port,
            username=username,
            password=password,
            ssl=use_tls,
            decode_responses=True,
        ),
    )


def _schedule_analysis(
    vk: ImportValkeyClient,
    *,
    conversation_id: int | None,
    due_at_ms: int | None,
) -> None:
    if conversation_id is None or due_at_ms is None:
        return
    vk.zadd(ANALYSIS_DIRTY_KEY, {str(conversation_id): due_at_ms})


def _push_result_events(vk: ImportValkeyClient, *, processed: ProcessedImport) -> None:
    if processed.result is not None:
        if processed.result.event is not None:
            push_import_event(vk, event=processed.result.event)
        _schedule_analysis(
            vk,
            conversation_id=processed.result.analysis_conversation_id,
            due_at_ms=processed.result.analysis_due_at_ms,
        )
    if processed.failure_event is not None:
        push_import_event(vk, event=processed.failure_event)


def _process_request(
    *,
    session_factory: sessionmaker[Session],
    request: ImportRequest,
) -> ProcessedImport:
    with session_factory() as session:
        try:
            LOGGER.info("Processing %s import %s", request.type, request.import_slug_id)
            result = process_import_request(session, request=request)
            LOGGER.info("Completed %s import %s", request.type, request.import_slug_id)
            return ProcessedImport(result=result, failure_event=None)
        except Exception:
            LOGGER.exception("Import %s failed", request.import_slug_id)
            session.rollback()
            failure_event = mark_import_failed(
                session,
                import_slug_id=request.import_slug_id,
                failure_reason="processing_error",
            )
            return ProcessedImport(result=None, failure_event=failure_event)


def _handle_invalid_item(
    *,
    session_factory: sessionmaker[Session],
    invalid_item: InvalidImportItem,
) -> ImportNotificationEvent | None:
    minimal = extract_minimal_import_request(invalid_item.parsed_json)
    if minimal is None:
        LOGGER.warning("Cannot extract importSlugId/userId from invalid item")
        return None
    LOGGER.warning(
        "Marking invalid import item %s failed: %s",
        minimal.import_slug_id,
        invalid_item.error_message,
    )
    with session_factory() as session:
        return mark_import_failed(
            session,
            import_slug_id=minimal.import_slug_id,
            failure_reason="invalid_data_format",
        )


def _cleanup_stale(
    *,
    session_factory: sessionmaker[Session],
    stale_threshold_ms: int,
) -> list[ImportNotificationEvent]:
    with session_factory() as session:
        events = cleanup_stale_imports(session, stale_threshold_ms=stale_threshold_ms)
        if events:
            LOGGER.info("Cleaned up %s stale imports", len(events))
        return events


def _push_stale_cleanup_events(
    *,
    vk: ImportValkeyClient,
    session_factory: sessionmaker[Session],
    stale_threshold_ms: int,
) -> None:
    for event in _cleanup_stale(
        session_factory=session_factory,
        stale_threshold_ms=stale_threshold_ms,
    ):
        push_import_event(vk, event=event)


def _push_ready_import_events(
    *,
    vk: ImportValkeyClient,
    session_factory: sessionmaker[Session],
) -> None:
    with session_factory() as session:
        for event in complete_ready_imports(session):
            push_import_event(vk, event=event)


def run_worker(settings: Settings) -> None:
    LOGGER.info(
        "Starting import worker (flush_interval_ms=%s, max_batch_size=%s, max_concurrency=%s)",
        settings.flush_interval_ms,
        settings.max_batch_size,
        settings.max_concurrency,
    )
    engine = create_primary_engine(settings.connection_string)
    LOGGER.info("Import worker PostgreSQL connection verified")
    session_factory = create_session_factory(engine)
    vk = _create_valkey_client(str(settings.valkey_url))
    queue_depth = vk.llen(IMPORT_BUFFER_KEY)
    LOGGER.info("Import worker Valkey connected (queue_depth=%s)", queue_depth)
    should_stop = False
    flush_count = 0

    def request_stop(signum: int, frame: object) -> None:
        del frame
        nonlocal should_stop
        LOGGER.info("Signal %s received, stopping import worker", signum)
        should_stop = True

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)

    if queue_depth == 0:
        try:
            _push_stale_cleanup_events(
                vk=vk,
                session_factory=session_factory,
                stale_threshold_ms=settings.stale_threshold_ms,
            )
        except Exception:
            LOGGER.exception("Initial stale import cleanup failed")

    with ThreadPoolExecutor(max_workers=settings.max_concurrency) as executor:
        while not should_stop:
            if settings.max_batch_size <= 0:
                time.sleep(settings.flush_interval_ms / 1000)
                continue

            flush_count += 1
            batch = pop_import_requests(vk, count=settings.max_batch_size)
            for invalid_item in batch.invalid_items:
                try:
                    event = _handle_invalid_item(
                        session_factory=session_factory,
                        invalid_item=invalid_item,
                    )
                    if event is not None:
                        push_import_event(vk, event=event)
                except Exception:
                    LOGGER.exception("Failed to mark invalid import item failed")

            if not batch.requests:
                try:
                    _push_ready_import_events(vk=vk, session_factory=session_factory)
                except Exception:
                    LOGGER.exception("Ready import completion failed")

                if flush_count % settings.stale_cleanup_every_n_flushes == 0:
                    try:
                        _push_stale_cleanup_events(
                            vk=vk,
                            session_factory=session_factory,
                            stale_threshold_ms=settings.stale_threshold_ms,
                        )
                    except Exception:
                        LOGGER.exception("Stale import cleanup failed")
                    LOGGER.info(
                        "Import worker idle (queue_depth=%s)",
                        vk.llen(IMPORT_BUFFER_KEY),
                    )
                time.sleep(settings.flush_interval_ms / 1000)
                continue

            LOGGER.info("Dequeued %s import requests", len(batch.requests))

            futures = [
                executor.submit(
                    _process_request,
                    session_factory=session_factory,
                    request=request,
                )
                for request in batch.requests
            ]
            for future in as_completed(futures):
                try:
                    _push_result_events(vk, processed=future.result())
                except Exception:
                    LOGGER.exception("Failed to handle import result")

            try:
                _push_ready_import_events(vk=vk, session_factory=session_factory)
            except Exception:
                LOGGER.exception("Ready import completion failed")

    vk.close()
    engine.dispose()


def main() -> None:
    try:
        run_worker(Settings())
    except Exception:
        LOGGER.exception("Import worker crashed")
        sys.exit(1)


if __name__ == "__main__":
    main()
