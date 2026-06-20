from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


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
    source_version: str,
    timestamp_ms: int,
) -> ContentTranslationEventData:
    return ContentTranslationEventData(
        payload={
            "subject": subject,
            "targetLanguageCode": target_language_code,
            "status": status,
            "sourceVersion": source_version,
            "timestamp": timestamp_ms,
        },
        topic=f"translation:conversation:{conversation_slug_id}:target:{target_language_code}",
    )
