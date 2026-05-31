from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Annotated, Any, Protocol

from pydantic import Field, TypeAdapter, ValidationError

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
        parsed_json: Any
        try:
            parsed_json = json.loads(_decode_item(item))
        except json.JSONDecodeError as error:
            invalid_items.append(
                InvalidImportItem(parsed_json=None, error_message=f"Malformed JSON: {error}"),
            )
            continue

        try:
            requests.append(IMPORT_REQUEST_ADAPTER.validate_python(parsed_json))
        except ValidationError as error:
            invalid_items.append(
                InvalidImportItem(parsed_json=parsed_json, error_message=str(error)),
            )

    return PoppedImportBatch(requests=requests, invalid_items=invalid_items)


def extract_minimal_import_request(parsed_json: object | None) -> MinimalImportRequest | None:
    if parsed_json is None:
        return None
    try:
        return MinimalImportRequest.model_validate(parsed_json)
    except ValidationError:
        return None


def push_import_event(vk: ImportValkeyClient, *, event: ImportNotificationEvent) -> None:
    payload = event.model_dump_json(by_alias=True)
    vk.rpush(IMPORT_EVENTS_KEY, payload)
