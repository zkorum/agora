from __future__ import annotations

import logging
import signal
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any
from urllib.parse import unquote, urlparse

from pydantic import TypeAdapter
from valkey import Valkey

from import_worker.config import Settings
from import_worker.database import create_primary_engine, create_session_factory
from import_worker.google_language_detection import initialize_google_language_detection_service
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
    from sqlalchemy.engine import Engine
    from sqlalchemy.orm import Session, sessionmaker

    from import_worker.importer import (
        AnalysisQueueSchedule,
        ContentTranslationQueueSchedule,
        ImportProcessResult,
    )
    from import_worker.language_detection import GoogleLanguageDetector
    from import_worker.queue import ImportNotificationEvent, ImportRequest, InvalidImportItem

ANALYSIS_DIRTY_KEY = "analysis:dirty"
CONTENT_TRANSLATION_DIRTY_KEY = "content-translation:dirty"
CONTENT_TRANSLATION_EAGER_VISIBLE_PRIORITY = 1
CONTENT_TRANSLATION_PRIORITY_SCORE_OFFSET = 10_000_000_000_000
STARTUP_RETRY_INTERVAL_SECONDS = 5.0

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
)
LOGGER = logging.getLogger(__name__)
type LpopResult = str | list[str] | None
LPOP_RESULT: TypeAdapter[LpopResult] = TypeAdapter(LpopResult)
INT_RESULT = TypeAdapter(int)
_running = True


class SyncValkeyClient:
    def __init__(self, client: Any) -> None:
        self._client = client

    def lpop(self, name: str, count: int | None = None) -> str | list[str] | None:
        return LPOP_RESULT.validate_python(self._client.lpop(name, count=count))

    def llen(self, name: str) -> int:
        return INT_RESULT.validate_python(self._client.llen(name))

    def rpush(self, name: str, *values: str) -> int:
        return INT_RESULT.validate_python(self._client.rpush(name, *values))

    def zadd(self, name: str, mapping: dict[str, int], nx: bool = False) -> int:
        return INT_RESULT.validate_python(self._client.zadd(name, mapping, nx=nx))

    def close(self) -> None:
        self._client.close()


@dataclass(frozen=True)
class ProcessedImport:
    result: ImportProcessResult | None
    failure_event: ImportNotificationEvent | None


@dataclass(frozen=True)
class ConnectedImportQueue:
    client: ImportValkeyClient
    queue_depth: int


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


def _sleep_before_retry(seconds: float) -> None:
    deadline = time.monotonic() + seconds
    while _running:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(min(0.5, remaining))


def _create_primary_engine_with_retry(*, connection_string: str) -> Engine | None:
    while _running:
        try:
            return create_primary_engine(connection_string)
        except Exception as error:
            LOGGER.warning(
                "Import worker PostgreSQL unavailable (%s); retrying in %.1fs",
                error,
                STARTUP_RETRY_INTERVAL_SECONDS,
            )
            _sleep_before_retry(STARTUP_RETRY_INTERVAL_SECONDS)
    return None


def _connect_to_valkey_with_retry(*, url: str) -> ConnectedImportQueue | None:
    while _running:
        vk: ImportValkeyClient | None = None
        try:
            vk = _create_valkey_client(url)
            queue_depth = vk.llen(IMPORT_BUFFER_KEY)
            return ConnectedImportQueue(client=vk, queue_depth=queue_depth)
        except Exception as error:
            if vk is not None:
                try:
                    vk.close()
                except Exception:
                    LOGGER.exception("Failed to close unavailable import Valkey client")
            LOGGER.warning(
                "Import worker Valkey unavailable at %s (%s); retrying in %.1fs",
                url,
                error,
                STARTUP_RETRY_INTERVAL_SECONDS,
            )
            _sleep_before_retry(STARTUP_RETRY_INTERVAL_SECONDS)
    return None


def _schedule_analysis(
    vk: ImportValkeyClient,
    *,
    schedule: AnalysisQueueSchedule | None,
) -> None:
    if schedule is None:
        return
    LOGGER.info(
        "Queueing imported conversation for math work conversationId=%s "
        "conversationSlugId=%s enqueuedAtMs=%s",
        schedule.conversation_id,
        schedule.conversation_slug_id,
        schedule.enqueued_at_ms,
    )
    vk.zadd(
        ANALYSIS_DIRTY_KEY,
        {str(schedule.conversation_id): schedule.enqueued_at_ms},
        nx=True,
    )


def _schedule_content_translation(
    vk: ImportValkeyClient,
    *,
    schedule: ContentTranslationQueueSchedule | None,
) -> None:
    if schedule is None:
        return
    score = (
        CONTENT_TRANSLATION_EAGER_VISIBLE_PRIORITY
        * CONTENT_TRANSLATION_PRIORITY_SCORE_OFFSET
        + schedule.enqueued_at_ms
    )
    LOGGER.info(
        "Queueing imported content translation work count=%s enqueuedAtMs=%s",
        len(schedule.work_ids),
        schedule.enqueued_at_ms,
    )
    vk.zadd(
        CONTENT_TRANSLATION_DIRTY_KEY,
        {str(work_id): score for work_id in schedule.work_ids},
    )


def _push_result_events(vk: ImportValkeyClient, *, processed: ProcessedImport) -> None:
    if processed.result is not None:
        if processed.result.event is not None:
            push_import_event(vk, event=processed.result.event)
        _schedule_analysis(
            vk,
            schedule=processed.result.analysis_schedule,
        )
        _schedule_content_translation(
            vk,
            schedule=processed.result.content_translation_schedule,
        )
    if processed.failure_event is not None:
        push_import_event(vk, event=processed.failure_event)


def _process_request(
    *,
    session_factory: sessionmaker[Session],
    request: ImportRequest,
    google_detector: GoogleLanguageDetector | None,
) -> ProcessedImport:
    with session_factory() as session:
        try:
            LOGGER.info("Processing %s import %s", request.type, request.import_slug_id)
            result = process_import_request(
                session,
                request=request,
                google_detector=google_detector,
            )
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


def _create_google_language_detector(settings: Settings) -> GoogleLanguageDetector | None:
    if settings.google_application_credentials_path is None:
        LOGGER.info("Import worker Google language detection is not configured")
        return None
    return initialize_google_language_detection_service(
        google_application_credentials_path=settings.google_application_credentials_path,
        google_cloud_project_id=settings.google_cloud_project_id,
        google_cloud_translation_location=settings.google_cloud_translation_location,
        google_cloud_translation_endpoint=settings.google_cloud_translation_endpoint,
        google_cloud_translation_timeout_seconds=settings.google_cloud_translation_timeout_seconds,
    )


def run_worker(settings: Settings) -> None:
    global _running

    LOGGER.info(
        "Starting import worker (flush_interval_ms=%s, max_batch_size=%s, max_concurrency=%s)",
        settings.flush_interval_ms,
        settings.max_batch_size,
        settings.max_concurrency,
    )
    should_stop = False

    def request_stop(signum: int, frame: object) -> None:
        del frame
        nonlocal should_stop
        global _running
        LOGGER.info("Signal %s received, stopping import worker", signum)
        should_stop = True
        _running = False

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)

    engine = _create_primary_engine_with_retry(
        connection_string=settings.connection_string,
    )
    if engine is None:
        LOGGER.info("Import worker shutdown before PostgreSQL became available")
        return

    LOGGER.info("Import worker PostgreSQL connection verified")
    session_factory = create_session_factory(engine)
    google_detector = _create_google_language_detector(settings)
    connected_queue = _connect_to_valkey_with_retry(url=str(settings.valkey_url))
    if connected_queue is None:
        engine.dispose()
        LOGGER.info("Import worker shutdown before Valkey became available")
        return

    vk = connected_queue.client
    queue_depth = connected_queue.queue_depth
    LOGGER.info("Import worker Valkey connected (queue_depth=%s)", queue_depth)
    flush_count = 0

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
            try:
                batch = pop_import_requests(vk, count=settings.max_batch_size)
            except Exception:
                LOGGER.exception("Import queue poll failed")
                time.sleep(settings.flush_interval_ms / 1000)
                continue

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
                    try:
                        idle_queue_depth: int | str = vk.llen(IMPORT_BUFFER_KEY)
                    except Exception:
                        LOGGER.exception("Failed to read import queue depth")
                        idle_queue_depth = "unknown"
                    LOGGER.info(
                        "Import worker idle (queue_depth=%s)",
                        idle_queue_depth,
                    )
                time.sleep(settings.flush_interval_ms / 1000)
                continue

            LOGGER.info("Dequeued %s import requests", len(batch.requests))

            futures = [
                executor.submit(
                    _process_request,
                    session_factory=session_factory,
                    request=request,
                    google_detector=google_detector,
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
    while _running:
        try:
            run_worker(Settings())
            return
        except Exception:
            LOGGER.exception(
                "Import worker crashed; restarting in %.1fs",
                STARTUP_RETRY_INTERVAL_SECONDS,
            )
            _sleep_before_retry(STARTUP_RETRY_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
