from __future__ import annotations

import logging
from threading import Event, Lock, Thread
from typing import TYPE_CHECKING

from agora_analysis_worker_shared.ai_description_work import (
    ClaimedAiDescriptionLocaleWorkItem,
    extend_ai_description_locale_work_leases,
)

if TYPE_CHECKING:
    from collections.abc import Callable

    from sqlalchemy import Engine

log = logging.getLogger(__name__)


def _format_ids(ids: list[int]) -> str:
    limit = 20
    head = ids[:limit]
    suffix = "" if len(ids) <= limit else f", ... +{len(ids) - limit}"
    return ", ".join(str(item_id) for item_id in head) + suffix


def start_ai_description_lease_heartbeat(
    *,
    primary_engine: Engine,
    claims: list[ClaimedAiDescriptionLocaleWorkItem],
    lease_ttl_seconds: int,
    interval_seconds: int,
    log_prefix: str,
    thread_name: str,
) -> Callable[[], None]:
    if not claims:
        return lambda: None

    stop_event = Event()
    stop_lock = Lock()
    stopped = False

    def run_heartbeat() -> None:
        while not stop_event.wait(interval_seconds):
            try:
                lease_extension = extend_ai_description_locale_work_leases(
                    primary_engine,
                    claims=claims,
                    lease_ttl_seconds=lease_ttl_seconds,
                )
                log.info(
                    "%s AI description lease heartbeat extended rows=%d "
                    "claims=%d lineageWorkIds=%s translationWorkIds=%s",
                    log_prefix,
                    lease_extension.extended_count,
                    len(claims),
                    _format_ids(lease_extension.extended_lineage_work_ids),
                    _format_ids(lease_extension.extended_translation_work_ids),
                )
            except Exception:
                log.exception(
                    "%s AI description lease heartbeat failed claims=%d",
                    log_prefix,
                    len(claims),
                )

    heartbeat_thread = Thread(
        target=run_heartbeat,
        name=thread_name,
        daemon=True,
    )
    heartbeat_thread.start()

    def stop_heartbeat() -> None:
        nonlocal stopped
        with stop_lock:
            if stopped:
                return
            stopped = True
        stop_event.set()
        heartbeat_thread.join(timeout=interval_seconds)

    return stop_heartbeat
