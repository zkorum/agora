from __future__ import annotations

import logging
import signal
import sys
import time
import uuid
from typing import TYPE_CHECKING, Protocol, TypeGuard

import valkey as valkey_lib
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from content_translation_worker.config import Settings
from content_translation_worker.db import (
    claim_content_translation_work,
    recover_expired_leases,
    retry_failed_eager_work,
)
from content_translation_worker.processing import process_claimed_work
from content_translation_worker.translation import (
    ContentTranslationProviderError,
)
from content_translation_worker.translation_service import build_content_translation_service
from content_translation_worker.valkey_client import (
    ContentTranslationValkey,
    zpopmin_batch,
)

if TYPE_CHECKING:
    from collections.abc import Callable

    from sqlalchemy.engine import Engine

    from content_translation_worker.models import ClaimedContentTranslationWork


class ValkeyFromUrl(Protocol):
    def __call__(self, url: str, *, decode_responses: bool) -> object: ...


class Closable(Protocol):
    def close(self) -> object: ...


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_running = True
WORKER_ID = "content-translation-worker"


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("[Worker] Received signal %d, shutting down...", signum)
    _running = False


def _sleep_before_retry(seconds: float) -> None:
    deadline = time.monotonic() + seconds
    while _running:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(min(0.5, remaining))


def _create_engine_with_retry(
    *,
    connection_string: str,
    role: str,
    retry_interval_seconds: float,
) -> Engine | None:
    while _running:
        engine: Engine | None = None
        try:
            url = make_url(connection_string)
            if url.drivername in {"postgres", "postgresql"}:
                url = url.set(drivername="postgresql+psycopg")
            defaults = {
                "application_name": WORKER_ID,
                "connect_timeout": "10",
                "keepalives": "1",
                "keepalives_idle": "15",
                "keepalives_interval": "5",
                "keepalives_count": "3",
                "tcp_user_timeout": "30000",
            }
            url = url.update_query_dict(
                {key: value for key, value in defaults.items() if key not in url.query}
            )
            existing_options = url.query.get("options", "")
            if not isinstance(existing_options, str):
                raise ValueError("PostgreSQL options must be specified once")
            url = url.update_query_dict(
                {
                    "options": (
                        "-c statement_timeout=30000 -c lock_timeout=5000 "
                        "-c idle_in_transaction_session_timeout=60000 "
                        f"{existing_options}"
                    )
                }
            )
            engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_timeout=10,
                hide_parameters=True,
            )
            with engine.connect() as connection:
                connection.execute(select(1))
            log.info("[Worker] PostgreSQL %s connection verified", role)
            return engine
        except Exception as error:
            if engine is not None:
                engine.dispose()
            log.warning(
                "[Worker] PostgreSQL %s unavailable errorType=%s; retrying in %.1fs",
                role,
                type(error).__name__,
                retry_interval_seconds,
            )
            _sleep_before_retry(retry_interval_seconds)
    return None


def _connect_to_valkey_with_retry(settings: Settings) -> ContentTranslationValkey | None:
    valkey_url = str(settings.valkey_url)
    while _running:
        vk: object | None = None
        try:
            vk = _get_valkey_from_url()(valkey_url, decode_responses=True)
            if not _is_content_translation_valkey(vk):
                msg = "Valkey client does not expose required synchronous methods"
                raise TypeError(msg)
            vk.ping()
            log.info("[Worker] Valkey connected")
            return vk
        except Exception as error:
            log.warning(
                "[Worker] Valkey unavailable errorType=%s; retrying in %.1fs",
                type(error).__name__,
                settings.valkey_retry_interval_seconds,
            )
            if _is_closable(vk):
                vk.close()
            _sleep_before_retry(settings.valkey_retry_interval_seconds)
    return None


def _load_settings() -> Settings | None:
    try:
        return Settings()
    except ValidationError:
        log.error(
            "[Worker] Invalid configuration errorType=ValidationError. "
            "The worker cannot process translations.",
        )
        return None


def create_work_poller(
    *,
    engine: Engine,
    vk: ContentTranslationValkey,
    settings: Settings,
    worker_id: str,
) -> Callable[[], ClaimedContentTranslationWork | None]:
    last_reconcile = time.monotonic() - settings.reconcile_interval_seconds
    last_retry = time.monotonic() - settings.retry_initial_seconds

    def poll() -> ClaimedContentTranslationWork | None:
        nonlocal last_reconcile, last_retry
        now = time.monotonic()
        if now - last_reconcile >= settings.reconcile_interval_seconds:
            with Session(engine) as session, session.begin():
                recovered = recover_expired_leases(session)
            if recovered:
                log.info("[Worker] Recovered %d expired lease(s)", recovered)
            last_reconcile = now
        if now - last_retry >= settings.retry_initial_seconds:
            with Session(engine) as session, session.begin():
                retried = retry_failed_eager_work(
                    session,
                    limit=settings.batch_size,
                    initial_seconds=settings.retry_initial_seconds,
                    maximum_seconds=settings.retry_maximum_seconds,
                )
            if retried:
                log.info("[Worker] Retrying %d failed eager work item(s)", retried)
            last_retry = now

        work_ids = [item.work_id for item in zpopmin_batch(vk, count=1)]
        with Session(engine) as session, session.begin():
            claim = claim_content_translation_work(
                session,
                worker_id=worker_id,
                work_ids=work_ids if work_ids else None,
                candidate_limit=settings.batch_size,
                lease_ttl_seconds=settings.lease_ttl_seconds,
            )
            if claim is None and work_ids:
                # A stale wakeup must not delay other durable database work.
                claim = claim_content_translation_work(
                    session,
                    worker_id=worker_id,
                    work_ids=None,
                    candidate_limit=settings.batch_size,
                    lease_ttl_seconds=settings.lease_ttl_seconds,
                )
            return claim

    return poll


def main() -> int:
    settings = _load_settings()
    if settings is None:
        return 1

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    worker_id = f"{WORKER_ID}:{uuid.uuid4()}"
    log.info(
        "[Worker] Starting content-translation-worker id=%s provider=%s translation_model=%s",
        worker_id,
        settings.translation_provider.value,
        settings.google_cloud_translation_model.value,
    )

    try:
        translation_service = build_content_translation_service(settings)
    except ContentTranslationProviderError as error:
        log.error("[Worker] Translation provider initialization failed: %s", error)
        return 1

    vk = _connect_to_valkey_with_retry(settings)
    if vk is None:
        return 0

    primary_engine = _create_engine_with_retry(
        connection_string=settings.connection_string,
        role="primary",
        retry_interval_seconds=settings.db_retry_interval_seconds,
    )
    if primary_engine is None:
        vk.close()
        return 0

    poll_work = create_work_poller(
        engine=primary_engine, vk=vk, settings=settings, worker_id=worker_id
    )
    log.info("[Worker] Ready")

    try:
        while _running:
            try:
                claim = poll_work()
                if claim is None:
                    _sleep_before_retry(settings.poll_interval_seconds)
                    continue

                log.info(
                    "[Worker] Processing translation work_id=%d source_kind=%s "
                    "target_language=%s conversationSlugId=%s",
                    claim.id,
                    claim.source_kind.value,
                    claim.display_language_code.value,
                    claim.conversation_slug_id,
                )
                result = process_claimed_work(
                    engine=primary_engine,
                    claim=claim,
                    translation_service=translation_service,
                    settings=settings,
                )
                log.info(
                    "[Worker] Processed translation work_id=%d source_kind=%s "
                    "target_language=%s status=%s",
                    result.work_id,
                    claim.source_kind.value,
                    claim.display_language_code.value,
                    result.status,
                )
            except SQLAlchemyError as error:
                log.error(
                    "[Worker] Database operation failed errorType=%s; retrying in %.1fs",
                    type(error).__name__,
                    settings.db_retry_interval_seconds,
                )
                _sleep_before_retry(settings.db_retry_interval_seconds)
    finally:
        primary_engine.dispose()
        vk.close()
        log.info("[Worker] Shutdown complete")

    return 0


def _is_content_translation_valkey(value: object) -> TypeGuard[ContentTranslationValkey]:
    return (
        callable(getattr(value, "zpopmin", None))
        and callable(getattr(value, "zadd", None))
        and callable(getattr(value, "zcard", None))
        and callable(getattr(value, "ping", None))
        and callable(getattr(value, "close", None))
    )


def _is_closable(value: object) -> TypeGuard[Closable]:
    return callable(getattr(value, "close", None))


def _get_valkey_from_url() -> ValkeyFromUrl:
    candidate: object = getattr(valkey_lib, "from_url", None)
    if not _is_valkey_from_url(candidate):
        msg = "valkey.from_url is unavailable"
        raise TypeError(msg)
    return candidate


def _is_valkey_from_url(value: object) -> TypeGuard[ValkeyFromUrl]:
    return callable(value)


if __name__ == "__main__":
    sys.exit(main())
