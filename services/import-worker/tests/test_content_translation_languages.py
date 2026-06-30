from import_worker.generated_models import DisplayLanguageCode
from import_worker.importer import configured_translation_display_language_codes


def test_configured_translation_languages_include_source_display_language() -> None:
    language_codes = configured_translation_display_language_codes(
        source_language_code="en",
        target_language_codes={DisplayLanguageCode.ky, DisplayLanguageCode.ru},
    )

    assert language_codes == {
        DisplayLanguageCode.en,
        DisplayLanguageCode.ky,
        DisplayLanguageCode.ru,
    }


def test_configured_translation_languages_deduplicate_source_language() -> None:
    language_codes = configured_translation_display_language_codes(
        source_language_code="en",
        target_language_codes={DisplayLanguageCode.en, DisplayLanguageCode.fr},
    )

    assert language_codes == {DisplayLanguageCode.en, DisplayLanguageCode.fr}
