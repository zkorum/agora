from __future__ import annotations

import uuid

from content_translation_worker.events import build_content_translation_event_data


def test_build_content_translation_event_data() -> None:
    source_version = uuid.UUID("798ef559-29c0-4972-a701-969d977c2ee0")
    event_data = build_content_translation_event_data(
        subject={"kind": "conversation", "conversationSlugId": "conv1234"},
        conversation_slug_id="conv1234",
        target_language_code="fr",
        status="completed",
        source_version=source_version,
        timestamp_ms=123456,
    )

    assert event_data.payload == {
        "subject": {"kind": "conversation", "conversationSlugId": "conv1234"},
        "targetLanguageCode": "fr",
        "status": "completed",
        "sourceVersion": str(source_version),
        "timestamp": 123456,
    }
    assert event_data.topic == "translation:conversation:conv1234:target:fr"


def test_build_survey_question_content_translation_event_data() -> None:
    source_version = uuid.UUID("ac01f173-f623-4f34-b10b-5266d2caa42e")
    event_data = build_content_translation_event_data(
        subject={
            "kind": "survey_question",
            "conversationSlugId": "conv1234",
            "questionSlugId": "ques1234",
        },
        conversation_slug_id="conv1234",
        target_language_code="fr",
        status="failed",
        source_version=source_version,
        timestamp_ms=123456,
    )

    assert event_data.payload["subject"] == {
        "kind": "survey_question",
        "conversationSlugId": "conv1234",
        "questionSlugId": "ques1234",
    }
    assert event_data.payload["status"] == "failed"
    assert event_data.payload["sourceVersion"] == str(source_version)
    assert event_data.topic == "translation:conversation:conv1234:target:fr"
