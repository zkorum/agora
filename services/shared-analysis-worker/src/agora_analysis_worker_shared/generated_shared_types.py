# WARNING: GENERATED FROM ../shared/src/languages.ts, ../shared/src/shared.ts. DO NOT EDIT.
from __future__ import annotations

from .generated_models import DisplayLanguageCode

# Display Languages
SUPPORTED_DISPLAY_LANGUAGE_CODES: tuple[DisplayLanguageCode, ...] = (
    DisplayLanguageCode.en,
    DisplayLanguageCode.es,
    DisplayLanguageCode.fr,
    DisplayLanguageCode.zh_hant,
    DisplayLanguageCode.zh_hans,
    DisplayLanguageCode.ja,
    DisplayLanguageCode.ar,
    DisplayLanguageCode.fa,
    DisplayLanguageCode.he,
    DisplayLanguageCode.ky,
    DisplayLanguageCode.ru,
)

SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES: tuple[DisplayLanguageCode, ...] = (
    DisplayLanguageCode.es,
    DisplayLanguageCode.fr,
    DisplayLanguageCode.zh_hant,
    DisplayLanguageCode.zh_hans,
    DisplayLanguageCode.ja,
    DisplayLanguageCode.ar,
    DisplayLanguageCode.fa,
    DisplayLanguageCode.he,
    DisplayLanguageCode.ky,
    DisplayLanguageCode.ru,
)

# Length Constants
MAX_LENGTH_TITLE: int = 140
MAX_LENGTH_BODY_HTML: int = 3000
MAX_LENGTH_CONVERSATION_BODY: int = 5000
MAX_LENGTH_CONVERSATION_BODY_HTML: int = 30000
LEGACY_MAX_LENGTH_CONVERSATION_BODY_HTML_OUTPUT: int = 60000
MAX_CONVERSATION_LANGUAGE_DETECTION_BODY_CHARS: int = 1000
MIN_CONVERSATION_LANGUAGE_DETECTION_CHARS: int = 2
MAX_LENGTH_OPINION_HTML_OUTPUT: int = 3000
