"""Structured performance events captured by the root dev log runner."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

log = logging.getLogger(__name__)
type Metadata = dict[str, str | int | float | bool | None]


def emit_performance_event(
    *,
    enabled: bool,
    action: str,
    outcome: str,
    conversation_slug_id: str | None = None,
    duration_ms: float | None = None,
    metadata: Metadata | None = None,
) -> None:
    if not enabled:
        return
    log.info(
        "AGORA_LOAD_EVENT %s",
        json.dumps(
            {
                "schemaVersion": 1,
                "timestamp": datetime.now(UTC).isoformat(),
                "scenario": "solidago-ranking",
                "phase": "scoring-worker",
                "action": action,
                "outcome": outcome,
                "conversationSlugId": conversation_slug_id,
                "responseTimeMs": duration_ms,
                "metadata": metadata or {},
            }
        ),
    )
