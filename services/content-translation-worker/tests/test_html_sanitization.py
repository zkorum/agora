import logging

import pytest

import content_translation_worker.db as db_module
from content_translation_worker.db import (
    html_to_counted_text,
    sanitize_translated_html,
)


def test_sanitize_translated_html_strips_scripts_and_attributes() -> None:
    assert (
        sanitize_translated_html('<p onclick="alert(1)">Hi<script>alert(2)</script></p>')
        == "<p>Hialert(2)</p>"
    )


def test_sanitize_translated_html_keeps_basic_formatting() -> None:
    assert sanitize_translated_html("<p><strong>Hello</strong><br><em>world</em></p>") == (
        "<p><strong>Hello</strong><br><em>world</em></p>"
    )


def test_sanitize_translated_html_removes_encoded_control_characters() -> None:
    assert sanitize_translated_html("<p>A&#1;&#x7f;&lrm;B</p>") == "<p>AB</p>"


def test_sanitize_translated_html_removes_bidi_controls() -> None:
    assert sanitize_translated_html("<p>A\u202eB</p>") == "<p>AB</p>"


def test_html_to_counted_text_preserves_paragraph_and_break_newlines() -> None:
    assert html_to_counted_text("<p>Hello<br>world</p><p>Again</p>") == (
        "Hello\nworld\nAgain"
    )


def test_html_to_counted_text_strips_tags_and_decodes_entities() -> None:
    assert html_to_counted_text("<p><strong>Fish &amp; chips</strong>&nbsp;now</p>") == (
        "Fish & chips\xa0now"
    )


def test_html_to_counted_text_preserves_list_item_boundaries() -> None:
    assert html_to_counted_text("<ul><li>A</li><li>B</li></ul>") == "A\nB"


def test_html_to_counted_text_warns_and_uses_fallback(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def fail_conversion(*_args: object, **_kwargs: object) -> str:
        raise RuntimeError("converter failed")

    monkeypatch.setattr(db_module.bleach, "clean", fail_conversion)

    with caplog.at_level(logging.WARNING):
        result = html_to_counted_text("<p>Hello<br>Fish &amp; chips</p>")

    assert result == "Hello\nFish & chips"
    assert "HTML-to-text conversion failed" in caplog.text
