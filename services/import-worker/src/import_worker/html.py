from __future__ import annotations

import html
import logging
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
EMPTY_PARAGRAPH_PATTERN = r"<p>(?:[\s\u00a0]|&nbsp;|<br\s*/?>)*</p>"
PARAGRAPH_CONTENT_PATTERN = re.compile(r"<p>(.*?)</p>", flags=re.IGNORECASE | re.DOTALL)
LEADING_EMPTY_PARAGRAPHS_PATTERN = re.compile(
    rf"^(?:\s*{EMPTY_PARAGRAPH_PATTERN})+\s*",
    flags=re.IGNORECASE,
)
TRAILING_EMPTY_PARAGRAPHS_PATTERN = re.compile(
    rf"\s*(?:{EMPTY_PARAGRAPH_PATTERN}\s*)+$",
    flags=re.IGNORECASE,
)
REPEATED_EMPTY_PARAGRAPHS_PATTERN = re.compile(
    rf"{EMPTY_PARAGRAPH_PATTERN}(?:\s*{EMPTY_PARAGRAPH_PATTERN})+",
    flags=re.IGNORECASE,
)
EMPTY_PARAGRAPH_REGEX = re.compile(EMPTY_PARAGRAPH_PATTERN, flags=re.IGNORECASE)
LEADING_BREAKS_PATTERN = re.compile(r"^(\s*<br\s*/?>)+\s*", flags=re.IGNORECASE)
TRAILING_BREAKS_PATTERN = re.compile(r"\s*(<br\s*/?>)+\s*$", flags=re.IGNORECASE)
NUMERIC_CHARACTER_REFERENCE_PATTERN = re.compile(
    r"&#(?:(?P<decimal>\d+)|[xX](?P<hexadecimal>[\da-fA-F]+));?"
)
BIDI_CHARACTER_REFERENCE_PATTERN = re.compile(r"&(?:lrm|rlm);", flags=re.IGNORECASE)
BASIC_HTML_ENTITY_PATTERN = re.compile(
    r"&#(?:(?P<decimal>\d+)|[xX](?P<hexadecimal>[\da-fA-F]+));?"
    r"|&(?P<named>amp|apos|gt|lt|nbsp|quot);",
    flags=re.IGNORECASE,
)
BIDI_CONTROL_CODE_POINTS = {
    0x061C,
    0x200E,
    0x200F,
    *range(0x202A, 0x202F),
    *range(0x2066, 0x206A),
}
log = logging.getLogger(__name__)


def _remove_non_display_control_characters(value: str) -> str:
    without_literal_controls = "".join(
        character
        for character in value
        if not (
            ord(character) <= 0x08
            or 0x0B <= ord(character) <= 0x0C
            or 0x0E <= ord(character) <= 0x1F
            or 0x7F <= ord(character) <= 0x9F
            or ord(character) in BIDI_CONTROL_CODE_POINTS
        )
    )

    def remove_encoded_control(match: re.Match[str]) -> str:
        decimal = match.group("decimal")
        hexadecimal = match.group("hexadecimal")
        encoded_code_point = decimal if decimal is not None else hexadecimal
        if encoded_code_point is None:
            return match.group(0)
        normalized_code_point = encoded_code_point.lstrip("0") or "0"
        if len(normalized_code_point) > 4:
            return match.group(0)
        code_point = int(normalized_code_point, 10 if decimal is not None else 16)
        if (
            code_point <= 0x08
            or 0x0B <= code_point <= 0x0C
            or 0x0E <= code_point <= 0x1F
            or 0x7F <= code_point <= 0x9F
            or code_point in BIDI_CONTROL_CODE_POINTS
        ):
            return ""
        return match.group(0)

    return NUMERIC_CHARACTER_REFERENCE_PATTERN.sub(
        remove_encoded_control,
        BIDI_CHARACTER_REFERENCE_PATTERN.sub("", without_literal_controls),
    )


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
    parser.feed(_remove_non_display_control_characters(value))
    parser.close()
    return _remove_non_display_control_characters(parser.result())


def _normalize_empty_lines(value: str) -> str:
    if not value.strip():
        return value

    value = PARAGRAPH_CONTENT_PATTERN.sub(
        lambda match: f"<p>{match.group(1).strip()}</p>",
        value,
    )
    value = LEADING_EMPTY_PARAGRAPHS_PATTERN.sub("", value)
    value = TRAILING_EMPTY_PARAGRAPHS_PATTERN.sub("", value)
    value = REPEATED_EMPTY_PARAGRAPHS_PATTERN.sub("<p></p>", value)
    value = EMPTY_PARAGRAPH_REGEX.sub("<p></p>", value)
    value = LEADING_BREAKS_PATTERN.sub("", value)
    return TRAILING_BREAKS_PATTERN.sub("", value)


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


def _normalize_counted_text(value: str) -> str:
    return re.sub(r"\n+", "\n", value).strip("\n")


def _decode_basic_html_entities(value: str) -> str:
    named_entities = {
        "amp": "&",
        "apos": "'",
        "gt": ">",
        "lt": "<",
        "nbsp": "\xa0",
        "quot": '"',
    }

    def decode_entity(match: re.Match[str]) -> str:
        named = match.group("named")
        if named is not None:
            return named_entities[named.lower()]
        decimal = match.group("decimal")
        hexadecimal = match.group("hexadecimal")
        encoded_code_point = decimal if decimal is not None else hexadecimal
        if encoded_code_point is None:
            return match.group(0)
        try:
            code_point = int(encoded_code_point, 10 if decimal is not None else 16)
            if code_point > 0x10FFFF or 0xD800 <= code_point <= 0xDFFF:
                return match.group(0)
            return chr(code_point)
        except ValueError:
            return match.group(0)

    return BASIC_HTML_ENTITY_PATTERN.sub(decode_entity, value)


def convert_html_to_counted_text(value: str) -> str:
    text_with_newlines = re.sub(
        r"</(?:p|li|div|h[1-6])>",
        "\n",
        value,
        flags=re.IGNORECASE,
    )
    text_with_newlines = re.sub(
        r"<br\s*/?>",
        "\n",
        text_with_newlines,
        flags=re.IGNORECASE,
    )
    plain_text = text_with_newlines
    while True:
        stripped = re.sub(r"<[^>]*>", "", plain_text)
        if stripped == plain_text:
            break
        plain_text = stripped

    plain_text = re.sub(r"<[^>]*$", "", plain_text)
    return _normalize_counted_text(html.unescape(plain_text))


def convert_html_to_counted_text_fallback(value: str) -> str:
    text_with_newlines = re.sub(
        r"</(?:p|li|div|h[1-6])>",
        "\n",
        value,
        flags=re.IGNORECASE,
    )
    text_with_newlines = re.sub(
        r"<br\s*/?>",
        "\n",
        text_with_newlines,
        flags=re.IGNORECASE,
    )
    plain_text = re.sub(r"<[^>]*>", "", text_with_newlines)
    plain_text = re.sub(r"<[^>]*$", "", plain_text)
    return _normalize_counted_text(_decode_basic_html_entities(plain_text))


def html_to_counted_text(value: str) -> str:
    try:
        return convert_html_to_counted_text(value)
    except Exception:
        log.warning(
            "HTML-to-text conversion failed; using best-effort text (HTML length: %d)",
            len(value),
            exc_info=True,
        )
        return convert_html_to_counted_text_fallback(value)
