from content_translation_worker.db import html_to_counted_text, sanitize_translated_html


def test_sanitize_translated_html_strips_scripts_and_attributes() -> None:
    assert (
        sanitize_translated_html('<p onclick="alert(1)">Hi<script>alert(2)</script></p>')
        == "<p>Hialert(2)</p>"
    )


def test_sanitize_translated_html_keeps_basic_formatting() -> None:
    assert sanitize_translated_html("<p><strong>Hello</strong><br><em>world</em></p>") == (
        "<p><strong>Hello</strong><br><em>world</em></p>"
    )


def test_html_to_counted_text_preserves_paragraph_and_break_newlines() -> None:
    assert html_to_counted_text("<p>Hello<br>world</p><p>Again</p>") == (
        "Hello\nworld\nAgain"
    )


def test_html_to_counted_text_strips_tags_and_decodes_entities() -> None:
    assert html_to_counted_text("<p><strong>Fish &amp; chips</strong>&nbsp;now</p>") == (
        "Fish & chips\xa0now"
    )
