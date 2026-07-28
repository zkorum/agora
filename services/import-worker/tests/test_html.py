import logging

import pytest

import import_worker.html as html_module
from import_worker.html import html_to_counted_text, process_user_generated_html


def test_html_to_counted_text_preserves_block_boundaries_and_entities() -> None:
    assert (
        html_to_counted_text("<ul><li>A &amp; B</li><li>C</li></ul>")
        == "A & B\nC"
    )


def test_process_html_removes_literal_encoded_and_bidi_controls() -> None:
    assert (
        process_user_generated_html(
            "<p>A\x01&#x7f;&lrm;\u202eB</p>",
            enable_links=False,
            mode="input",
        )
        == "<p>AB</p>"
    )


def test_html_to_counted_text_warns_and_uses_fallback(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def fail_conversion(_value: str) -> str:
        raise RuntimeError("converter failed")

    monkeypatch.setattr(html_module.html, "unescape", fail_conversion)

    with caplog.at_level(logging.WARNING):
        result = html_to_counted_text("<p>Hello<br>Fish &amp; chips</p>")

    assert result == "Hello\nFish & chips"
    assert "HTML-to-text conversion failed" in caplog.text
