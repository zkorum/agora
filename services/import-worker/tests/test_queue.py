from datetime import UTC, datetime
from unittest.mock import Mock
from uuid import UUID

import pytest
from pydantic import ValidationError

from import_worker.generated_import_contracts import FailureReason
from import_worker.queue import (
    JSON_ADAPTER,
    ImportNotificationEvent,
    ImportValkeyClient,
    extract_minimal_import_request,
    pop_import_requests,
    serialize_import_event,
)


def test_extract_minimal_import_request_from_partial_payload() -> None:
    minimal = extract_minimal_import_request(
        {
            "importSlugId": "abc12345",
            "userId": "00000000-0000-4000-8000-000000000001",
            "type": "invalid",
        },
    )

    assert minimal is not None
    assert minimal.import_slug_id == "abc12345"
    assert minimal.user_id == UUID("00000000-0000-4000-8000-000000000001")


def test_extract_minimal_import_request_returns_none_for_unusable_payload() -> None:
    assert extract_minimal_import_request({"type": "invalid"}) is None
    assert (
        extract_minimal_import_request({"importSlugId": "import01", "userId": "not-a-uuid"}) is None
    )


def test_invalid_queue_diagnostics_do_not_include_imported_text() -> None:
    queue = Mock(spec=ImportValkeyClient)
    queue.lpop.return_value = [
        '{"type":"private imported statement","importSlugId":"import01",'
        '"userId":"00000000-0000-4000-8000-000000000001"}'
    ]

    batch = pop_import_requests(queue, count=1)

    assert batch.requests == []
    assert len(batch.invalid_items) == 1
    invalid_item = batch.invalid_items[0]
    assert invalid_item.error_message == "Invalid import request (union_tag_invalid)"
    assert "private imported statement" not in invalid_item.error_message
    minimal = extract_minimal_import_request(invalid_item.parsed_json)
    assert minimal is not None
    assert minimal.import_slug_id == "import01"


def test_failure_event_serialization_matches_api_optional_and_nullable_fields() -> None:
    event = ImportNotificationEvent(
        type="import_notification",
        userId="user-1",
        notificationSlugId="notify01",
        notificationCreatedAt=datetime(2026, 11, 3, tzinfo=UTC),
        notificationIsRead=False,
        importId=1,
        importSlugId="import01",
        conversationId=None,
        conversationSlugId=None,
        conversationTitle=None,
        failureReason=FailureReason.timeout,
        broadcastNewConversation=False,
    )

    payload = serialize_import_event(event)

    assert JSON_ADAPTER.validate_json(payload) == {
        "type": "import_notification",
        "userId": "user-1",
        "notificationSlugId": "notify01",
        "notificationCreatedAt": "2026-11-03T00:00:00Z",
        "notificationIsRead": False,
        "importId": 1,
        "importSlugId": "import01",
        "conversationId": None,
        "failureReason": "timeout",
        "broadcastNewConversation": False,
    }
    assert ImportNotificationEvent.model_validate_json(payload) == event


def test_notification_contract_still_rejects_timestamps_without_a_timezone() -> None:
    with pytest.raises(ValidationError):
        ImportNotificationEvent(
            type="import_notification",
            userId="user-1",
            notificationSlugId="notify01",
            notificationCreatedAt=datetime(2026, 11, 3),
            notificationIsRead=False,
            importId=1,
            importSlugId="import01",
            conversationId=None,
            conversationSlugId=None,
            conversationTitle=None,
            failureReason=None,
            broadcastNewConversation=False,
        )
