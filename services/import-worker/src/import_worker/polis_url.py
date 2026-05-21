from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True)
class PolisId:
    conversation_id: str | None
    report_id: str | None


def _has_hostname_suffix(*, hostname: str, suffix: tuple[str, str]) -> bool:
    labels = [label for label in hostname.lower().split(".") if label]
    return len(labels) >= len(suffix) and tuple(labels[-len(suffix) :]) == suffix


def _is_allowed_polis_hostname(hostname: str) -> bool:
    return _has_hostname_suffix(hostname=hostname, suffix=("pol", "is")) or _has_hostname_suffix(
        hostname=hostname,
        suffix=("deepgov", "org"),
    )


def extract_polis_id_from_url(url: str) -> PolisId:
    if not url.strip():
        raise ValueError("Polis URL is empty")

    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    is_deepgov_hostname = _has_hostname_suffix(hostname=hostname, suffix=("deepgov", "org"))
    if not _is_allowed_polis_hostname(hostname):
        raise ValueError(f"Polis URL {url} has an incorrect hostname")

    path_parts = [part for part in parsed.path.split("/") if part]
    if len(path_parts) == 1:
        if is_deepgov_hostname:
            raise ValueError("Deepgov urls start with /conversation")
        return PolisId(conversation_id=path_parts[0], report_id=None)
    if len(path_parts) == 2:
        if path_parts[0] == "report":
            return PolisId(conversation_id=None, report_id=path_parts[1])
        if path_parts[0] == "conversation":
            return PolisId(conversation_id=path_parts[1], report_id=None)
    if len(path_parts) == 3 and path_parts[1] == "report":
        return PolisId(conversation_id=None, report_id=path_parts[2])
    raise ValueError(f"Polis URL {url} has an incorrect pathname")
