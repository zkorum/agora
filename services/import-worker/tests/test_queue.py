import json
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


class LegacyQueue:
    def __init__(self, *, unexpected_key: bool = False, raw_payload: str | None = None) -> None:
        self.unexpected_key = unexpected_key
        self.raw_payload = raw_payload

    def lpop(self, name: str, count: int | None = None) -> str:
        if self.raw_payload is not None:
            return self.raw_payload
        form_data: dict[str, object] = {
            "participationMode": "email_verification",
            "isIndexed": False,
            "requiresEventTicket": "devconnect-2025",
            "languageTargetPolicy": {
                "source": "conversation_override",
                "dynamicTranslationEnabled": False,
                "manualTargetLanguageCodes": [],
            },
        }
        if self.unexpected_key:
            form_data["misspelledSetting"] = True
        return json.dumps(
            {
                "type": "url",
                "importSlugId": "abc12345",
                "userId": "00000000-0000-4000-8000-000000000001",
                "actorUserId": "00000000-0000-4000-8000-000000000001",
                "projectId": 1,
                "didWrite": "did:key:guest",
                "polisUrl": "https://pol.is/example",
                "formData": form_data,
            }
        )

    def llen(self, name: str) -> int:
        return 1

    def rpush(self, name: str, *values: str) -> int:
        return 0

    def zadd(self, name: str, mapping: dict[str, int], nx: bool = False) -> int:
        return 0

    def close(self) -> None:
        pass


def test_legacy_import_discards_only_the_retired_ticket_setting() -> None:
    batch = pop_import_requests(LegacyQueue(), count=1)
    assert not batch.invalid_items
    assert len(batch.requests) == 1
    request = batch.requests[0]
    assert request.form_data.participation_mode == "email_verification"
    assert request.form_data.is_indexed is False
    assert "requiresEventTicket" not in request.form_data.model_dump(by_alias=True)


def test_legacy_normalization_keeps_unknown_settings_invalid() -> None:
    batch = pop_import_requests(LegacyQueue(unexpected_key=True), count=1)
    assert not batch.requests
    assert len(batch.invalid_items) == 1


@pytest.mark.parametrize("raw_payload", ["{", "[]", "null", '"not an import"'])
def test_invalid_payloads_are_reported_without_crashing_the_consumer(raw_payload: str) -> None:
    batch = pop_import_requests(LegacyQueue(raw_payload=raw_payload), count=1)
    assert not batch.requests
    assert len(batch.invalid_items) == 1


@pytest.mark.parametrize(
    "raw_payload", ['{"private": "private-import-text"', '{"formData": "private-import-text"}']
)
def test_validation_diagnostics_do_not_expose_imported_content(raw_payload: str) -> None:
    batch = pop_import_requests(LegacyQueue(raw_payload=raw_payload), count=1)
    assert len(batch.invalid_items) == 1
    assert "private-import-text" not in batch.invalid_items[0].error_message


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
