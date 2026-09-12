from __future__ import annotations

from content_translation_worker.generated_models import DisplayLanguageCode


def translation_target_languages(target: DisplayLanguageCode) -> tuple[DisplayLanguageCode, ...]:
    """Chinese script variants share generation, publication, and durable lease ownership."""
    if target in {DisplayLanguageCode.zh_hans, DisplayLanguageCode.zh_hant}:
        return (DisplayLanguageCode.zh_hant, DisplayLanguageCode.zh_hans)
    return (target,)


def retry_delays_seconds(*, initial_seconds: float, maximum_seconds: float) -> tuple[float, ...]:
    """The final delay applies to every subsequent attempt."""
    delays = [min(initial_seconds, maximum_seconds)]
    while delays[-1] < maximum_seconds:
        delays.append(min(maximum_seconds, delays[-1] * 2))
    return tuple(delays)
