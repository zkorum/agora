from __future__ import annotations

from content_translation_worker.events import build_content_translation_event_data


def test_build_content_translation_event_data() -> None:
    event_data = build_content_translation_event_data(
        subject={"kind": "conversation", "conversationSlugId": "conv1234"},
        conversation_slug_id="conv1234",
        target_language_code="fr",
        status="completed",
        source_version="conversation_content:10",
        timestamp_ms=123456,
    )

    assert event_data.payload == {
        "subject": {"kind": "conversation", "conversationSlugId": "conv1234"},
        "targetLanguageCode": "fr",
        "status": "completed",
        "sourceVersion": "conversation_content:10",
        "timestamp": 123456,
    }
    assert event_data.topic == "translation:conversation:conv1234:target:fr"


def test_build_survey_question_content_translation_event_data() -> None:
    event_data = build_content_translation_event_data(
        subject={
            "kind": "survey_question",
            "conversationSlugId": "conv1234",
            "questionSlugId": "ques1234",
        },
        conversation_slug_id="conv1234",
        target_language_code="fr",
        status="failed",
        source_version="survey_question_content:10:option_content:21,22",
        timestamp_ms=123456,
    )

    assert event_data.payload["subject"] == {
        "kind": "survey_question",
        "conversationSlugId": "conv1234",
        "questionSlugId": "ques1234",
    }
    assert event_data.payload["status"] == "failed"
    assert event_data.topic == "translation:conversation:conv1234:target:fr"
