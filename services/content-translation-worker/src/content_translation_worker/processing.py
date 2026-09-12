from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from threading import Event, Thread
from typing import TYPE_CHECKING, Literal

from sqlalchemy.orm import Session

from content_translation_worker.db import (
    LostContentTranslationWorkLeaseError,
    fail_claimed_work,
    heartbeat_claim,
    prepare_claimed_work,
    publish_translation_bundle,
)
from content_translation_worker.generation import generate_translation_bundle
from content_translation_worker.models import ProcessWorkResult

if TYPE_CHECKING:
    from collections.abc import Callable, Generator

    from sqlalchemy import Engine

    from content_translation_worker.config import Settings
    from content_translation_worker.models import ClaimedContentTranslationWork
    from content_translation_worker.translation import ContentTranslationService

log = logging.getLogger(__name__)


@contextmanager
def maintain_translation_lease(
    *, engine: Engine, claim: ClaimedContentTranslationWork, settings: Settings
) -> Generator[Callable[[], None]]:
    stopped = Event()
    lost = Event()
    deadline = time.monotonic() + settings.operation_timeout_seconds

    def check_active() -> None:
        if lost.is_set():
            raise LostContentTranslationWorkLeaseError(
                f"Translation lease heartbeat failed work_id={claim.id}"
            )
        if time.monotonic() >= deadline:
            raise TimeoutError(f"Translation operation deadline exceeded work_id={claim.id}")

    def heartbeat() -> None:
        while not stopped.wait(settings.heartbeat_interval_seconds):
            if time.monotonic() >= deadline:
                return
            try:
                check_active()
                with Session(engine) as session, session.begin():
                    heartbeat_claim(
                        session, claim=claim, lease_ttl_seconds=settings.lease_ttl_seconds
                    )
            except Exception as error:
                log.warning(
                    "[Worker] Translation heartbeat stopped work_id=%d errorType=%s",
                    claim.id,
                    type(error).__name__,
                )
                lost.set()
                return

    thread = Thread(target=heartbeat, name="content-translation-lease", daemon=True)
    thread.start()
    try:
        yield check_active
    finally:
        stopped.set()
        thread.join()


def process_claimed_work(
    *,
    engine: Engine,
    claim: ClaimedContentTranslationWork,
    translation_service: ContentTranslationService,
    settings: Settings,
) -> ProcessWorkResult:
    phase: Literal["prepare", "generate", "publish"] = "prepare"
    try:
        with Session(engine) as session, session.begin():
            prepared = prepare_claimed_work(session, claim=claim)
        if isinstance(prepared, ProcessWorkResult):
            return prepared

        with maintain_translation_lease(
            engine=engine, claim=claim, settings=settings
        ) as check_active:
            phase = "generate"
            bundle = generate_translation_bundle(
                prepared=prepared,
                translation_service=translation_service,
                check_active=check_active,
            )
            check_active()
        # Stop and join the heartbeat before finalization so it cannot race completion.
        check_active()
        phase = "publish"
        with Session(engine) as session, session.begin():
            return publish_translation_bundle(session, claim=claim, bundle=bundle)
    except LostContentTranslationWorkLeaseError as error:
        log.warning("[Worker] %s", error)
        return ProcessWorkResult(work_id=claim.id, status="lost_lease")
    except Exception as error:
        log.error(
            "[Worker] Translation attempt failed work_id=%d phase=%s errorType=%s",
            claim.id,
            phase,
            type(error).__name__,
        )
        try:
            # The failed prepare/publication transaction has already rolled back.
            with Session(engine) as session, session.begin():
                return fail_claimed_work(session, claim=claim, error_type=type(error).__name__)
        except LostContentTranslationWorkLeaseError:
            return ProcessWorkResult(work_id=claim.id, status="lost_lease")
