from content_translation_worker.db import sanitize_translated_html


def test_sanitize_translated_html_strips_scripts_and_attributes() -> None:
    assert (
        sanitize_translated_html('<p onclick="alert(1)">Hi<script>alert(2)</script></p>')
        == "<p>Hialert(2)</p>"
    )


def test_sanitize_translated_html_keeps_basic_formatting() -> None:
    assert sanitize_translated_html("<p><strong>Hello</strong><br><em>world</em></p>") == (
        "<p><strong>Hello</strong><br><em>world</em></p>"
    )
