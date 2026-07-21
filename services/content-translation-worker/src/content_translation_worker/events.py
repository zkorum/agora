from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    import uuid


@dataclass(frozen=True)
class ContentTranslationEventData:
    payload: dict[str, object]
    topic: str


def build_content_translation_event_data(
    *,
    subject: dict[str, str],
    conversation_slug_id: str,
    target_language_code: str,
    status: Literal["completed", "failed"],
    source_version: uuid.UUID,
    timestamp_ms: int,
) -> ContentTranslationEventData:
    return ContentTranslationEventData(
        payload={
            "subject": {**subject, "sourceVersion": str(source_version)},
            "targetLanguageCode": target_language_code,
            "status": status,
            "timestamp": timestamp_ms,
        },
        topic=f"translation:conversation:{conversation_slug_id}:target:{target_language_code}",
    )
