from content_translation_worker.generated_models import DisplayLanguageCode
from content_translation_worker.work_policy import (
    retry_delays_seconds,
    translation_target_languages,
)


def test_chinese_requests_resolve_to_the_same_execution_group() -> None:
    assert translation_target_languages(
        DisplayLanguageCode.zh_hans
    ) == translation_target_languages(DisplayLanguageCode.zh_hant)
    assert set(translation_target_languages(DisplayLanguageCode.zh_hans)) == {
        DisplayLanguageCode.zh_hans,
        DisplayLanguageCode.zh_hant,
    }
    assert translation_target_languages(DisplayLanguageCode.fr) == (DisplayLanguageCode.fr,)


def test_retry_backoff_grows_and_remains_bounded() -> None:
    assert retry_delays_seconds(initial_seconds=30, maximum_seconds=900) == (
        30,
        60,
        120,
        240,
        480,
        900,
    )
    assert retry_delays_seconds(initial_seconds=30, maximum_seconds=30) == (30,)
    assert retry_delays_seconds(initial_seconds=30, maximum_seconds=90) == (30, 60, 90)
