from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Protocol

from pydantic import Field, JsonValue, TypeAdapter, ValidationError

from import_worker.generated_import_contracts import (
    CsvImportRequest,
    MinimalImportRequest,
    UrlImportRequest,
)
from import_worker.generated_import_contracts import ImportWorkerEvent as ImportNotificationEvent

IMPORT_BUFFER_KEY = "queue:imports"
IMPORT_EVENTS_KEY = "queue:imports:events"

type ImportRequest = Annotated[
    CsvImportRequest | UrlImportRequest,
    Field(discriminator="type"),
]
IMPORT_REQUEST_ADAPTER: TypeAdapter[ImportRequest] = TypeAdapter(ImportRequest)
JSON_ADAPTER: TypeAdapter[JsonValue] = TypeAdapter(JsonValue)


class ImportValkeyClient(Protocol):
    def lpop(self, name: str, count: int | None = None) -> str | list[str] | None: ...

    def llen(self, name: str) -> int: ...

    def rpush(self, name: str, *values: str) -> int: ...

    def zadd(self, name: str, mapping: dict[str, int], nx: bool = False) -> int: ...

    def close(self) -> None: ...


@dataclass(frozen=True)
class InvalidImportItem:
    parsed_json: object | None
    error_message: str


@dataclass(frozen=True)
class PoppedImportBatch:
    requests: list[ImportRequest]
    invalid_items: list[InvalidImportItem]


def _decode_item(item: bytes | str) -> str:
    if isinstance(item, bytes):
        return item.decode("utf-8")
    return item


def pop_import_requests(vk: ImportValkeyClient, *, count: int) -> PoppedImportBatch:
    raw_items = vk.lpop(IMPORT_BUFFER_KEY, count=count)
    if raw_items is None:
        return PoppedImportBatch(requests=[], invalid_items=[])

    items = raw_items if isinstance(raw_items, list) else [raw_items]
    requests: list[ImportRequest] = []
    invalid_items: list[InvalidImportItem] = []

    for item in items:
        try:
            parsed_json = JSON_ADAPTER.validate_json(_decode_item(item))
        except ValidationError:
            invalid_items.append(
                InvalidImportItem(parsed_json=None, error_message="Malformed JSON"),
            )
            continue

        try:
            requests.append(IMPORT_REQUEST_ADAPTER.validate_python(parsed_json))
        except ValidationError as error:
            # Rendered Pydantic errors include input values, including CSV text.
            error_types = sorted(
                {entry["type"] for entry in error.errors(include_input=False, include_url=False)}
            )
            invalid_items.append(
                InvalidImportItem(
                    parsed_json=parsed_json,
                    error_message=f"Invalid import request ({', '.join(error_types)})",
                ),
            )

    return PoppedImportBatch(requests=requests, invalid_items=invalid_items)


def extract_minimal_import_request(parsed_json: object | None) -> MinimalImportRequest | None:
    if parsed_json is None:
        return None
    try:
        return MinimalImportRequest.model_validate(parsed_json)
    except ValidationError:
        return None


def serialize_import_event(event: ImportNotificationEvent) -> str:
    # Zod optional fields accept absence, not JSON null. conversationId is
    # deliberately nullable and required, so exclude_none=True would drop it.
    optional_values = {
        "conversation_slug_id": event.conversation_slug_id,
        "conversation_title": event.conversation_title,
        "failure_reason": event.failure_reason,
    }
    return event.model_dump_json(
        by_alias=True,
        exclude={name for name, value in optional_values.items() if value is None},
    )


def push_import_event(vk: ImportValkeyClient, *, event: ImportNotificationEvent) -> None:
    vk.rpush(IMPORT_EVENTS_KEY, serialize_import_event(event))
