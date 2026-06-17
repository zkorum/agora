from __future__ import annotations

import logging
import signal
import socket
import sys
import time
from typing import TYPE_CHECKING, Protocol, TypeGuard
from uuid import uuid4

import valkey as valkey_lib
from pydantic import ValidationError
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from content_translation_worker.config import Settings
from content_translation_worker.db import (
    claim_content_translation_work_batch,
    process_claimed_work,
    recover_expired_leases,
)
from content_translation_worker.translation import (
    ContentTranslationProviderError,
)
from content_translation_worker.translation_service import build_content_translation_service
from content_translation_worker.valkey_client import (
    ContentTranslationValkey,
    zpopmin_batch,
)

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine


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


def _handle_signal(signum: int, frame: object) -> None:
    global _running
    log.info("[Worker] Received signal %d, shutting down...", signum)
    _running = False


def _postgres_dsn(connection_string: str) -> str:
    if connection_string.startswith("postgresql://"):
        return connection_string.replace("postgresql://", "postgresql+psycopg://", 1)
    if connection_string.startswith("postgres://"):
        return connection_string.replace("postgres://", "postgresql+psycopg://", 1)
    return connection_string


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
        engine = create_engine(_postgres_dsn(connection_string), pool_pre_ping=True)
        try:
            with engine.connect() as connection:
                connection.execute(text("select 1"))
            log.info("[Worker] PostgreSQL %s connection verified", role)
            return engine
        except Exception as error:
            engine.dispose()
            log.warning(
                "[Worker] PostgreSQL %s unavailable (%s); retrying in %.1fs",
                role,
                error,
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
                "[Worker] Valkey unavailable at %s (%s); retrying in %.1fs",
                valkey_url,
                error,
                settings.valkey_retry_interval_seconds,
            )
            if _is_closable(vk):
                vk.close()
            _sleep_before_retry(settings.valkey_retry_interval_seconds)
    return None


def _load_settings() -> Settings | None:
    try:
        return Settings()
    except ValidationError as error:
        log.error(
            "[Worker] Invalid configuration. The worker cannot process translations. %s",
            error,
        )
        return None


def main() -> int:
    settings = _load_settings()
    if settings is None:
        return 1

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    worker_id = f"{socket.gethostname()}:{uuid4()}"
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

    last_reconcile = time.monotonic()
    log.info("[Worker] Ready")

    try:
        while _running:
            now = time.monotonic()
            if now - last_reconcile >= settings.reconcile_interval_seconds:
                with Session(primary_engine) as session, session.begin():
                    recovered = recover_expired_leases(session)
                    if recovered > 0:
                        log.info("[Worker] Recovered %d expired lease(s)", recovered)
                last_reconcile = now

            dirty_batch = zpopmin_batch(vk, count=settings.batch_size)
            work_ids = [item.work_id for item in dirty_batch]
            with Session(primary_engine) as session, session.begin():
                claims = claim_content_translation_work_batch(
                    session,
                    worker_id=worker_id,
                    work_ids=work_ids if work_ids else None,
                    batch_size=settings.batch_size,
                    lease_ttl_seconds=settings.lease_ttl_seconds,
                )

            if not claims:
                time.sleep(settings.poll_interval_seconds)
                continue

            log.info("[Worker] Processing %d translation work item(s)", len(claims))
            for claim in claims:
                with Session(primary_engine) as session, session.begin():
                    result = process_claimed_work(
                        session,
                        claim=claim,
                        translation_service=translation_service,
                    )
                log.info(
                    "[Worker] Processed work_id=%d status=%s",
                    result.work_id,
                    result.status,
                )
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
