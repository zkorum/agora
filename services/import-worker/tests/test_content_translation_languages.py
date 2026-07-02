from import_worker.generated_models import DisplayLanguageCode
from import_worker.importer import import_translation_target_language_codes


def test_import_translation_targets_include_detected_language_for_override() -> None:
    language_codes = import_translation_target_language_codes(
        detected_language_code="en",
        manual_language_codes=[DisplayLanguageCode.ky, DisplayLanguageCode.ru],
        effective_language_codes=[],
        policy_source="conversation_override",
    )

    assert language_codes == [
        DisplayLanguageCode.en,
        DisplayLanguageCode.ky,
        DisplayLanguageCode.ru,
    ]


def test_import_translation_targets_do_not_include_detected_language_for_inherited() -> None:
    language_codes = import_translation_target_language_codes(
        detected_language_code="en",
        manual_language_codes=[DisplayLanguageCode.ky, DisplayLanguageCode.ru],
        effective_language_codes=[DisplayLanguageCode.fr, DisplayLanguageCode.es],
        policy_source="project_inherited",
    )

    assert language_codes == [DisplayLanguageCode.fr, DisplayLanguageCode.es]


def test_import_translation_targets_deduplicate_and_cap_effective_targets() -> None:
    language_codes = import_translation_target_language_codes(
        detected_language_code="en",
        manual_language_codes=[
            DisplayLanguageCode.en,
            DisplayLanguageCode.fr,
            DisplayLanguageCode.ky,
        ],
        effective_language_codes=[],
        policy_source="conversation_override",
    )

    assert language_codes == [
        DisplayLanguageCode.en,
        DisplayLanguageCode.fr,
        DisplayLanguageCode.ky,
    ]
