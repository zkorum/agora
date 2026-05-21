from __future__ import annotations

import html
import re
from html.parser import HTMLParser

INPUT_ALLOWED_TAGS = {
    "b",
    "strong",
    "i",
    "em",
    "strike",
    "s",
    "u",
    "p",
    "br",
    "ul",
    "ol",
    "li",
}
OUTPUT_ALLOWED_TAGS = INPUT_ALLOWED_TAGS | {"div"}
URL_PATTERN = re.compile(r"(?<![\"'=])(https?://[^\s<]+)")


class _SanitizingParser(HTMLParser):
    def __init__(self, *, allowed_tags: set[str]) -> None:
        super().__init__(convert_charrefs=False)
        self._allowed_tags = allowed_tags
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        if tag in self._allowed_tags:
            self._parts.append(f"<{tag}>")

    def handle_endtag(self, tag: str) -> None:
        if tag in self._allowed_tags and tag != "br":
            self._parts.append(f"</{tag}>")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        if tag in self._allowed_tags:
            self._parts.append(f"<{tag}>")

    def handle_data(self, data: str) -> None:
        self._parts.append(html.escape(data, quote=False))

    def handle_entityref(self, name: str) -> None:
        self._parts.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self._parts.append(f"&#{name};")

    def result(self) -> str:
        return "".join(self._parts)


def _sanitize_rich_text_content(value: str, *, mode: str) -> str:
    parser = _SanitizingParser(
        allowed_tags=INPUT_ALLOWED_TAGS if mode == "input" else OUTPUT_ALLOWED_TAGS,
    )
    parser.feed(value)
    parser.close()
    return parser.result()


def _normalize_empty_lines(value: str) -> str:
    if not value.strip():
        return value
    value = re.sub(r"^(\s*<p>\s*</p>)+\s*", "", value, flags=re.IGNORECASE)
    value = re.sub(r"\s*(<p>\s*</p>)+\s*$", "", value, flags=re.IGNORECASE)
    value = re.sub(r"^(\s*<br\s*/?>)+\s*", "", value, flags=re.IGNORECASE)
    return re.sub(r"\s*(<br\s*/?>)+\s*$", "", value, flags=re.IGNORECASE)


def _linkify_html_content(value: str) -> str:
    def replace(match: re.Match[str]) -> str:
        url = match.group(1)
        escaped_url = html.escape(url, quote=True)
        return (
            f'<a href="{escaped_url}" target="_blank" rel="noopener noreferrer nofollow">{url}</a>'
        )

    return URL_PATTERN.sub(replace, value)


def process_user_generated_html(
    value: str,
    *,
    enable_links: bool,
    mode: str = "output",
) -> str:
    sanitized = _sanitize_rich_text_content(value, mode=mode)
    normalized = _normalize_empty_lines(sanitized)
    if enable_links:
        return _linkify_html_content(normalized)
    return normalized
