# WARNING: GENERATED FROM ../shared/src/languages.ts, ../shared/src/shared.ts. DO NOT EDIT.
from __future__ import annotations

from .generated_models import DisplayLanguageCode

# Display Languages
SUPPORTED_DISPLAY_LANGUAGE_CODES: tuple[DisplayLanguageCode, ...] = (
    DisplayLanguageCode.en,
    DisplayLanguageCode.ar,
    DisplayLanguageCode.zh_hans,
    DisplayLanguageCode.zh_hant,
    DisplayLanguageCode.fr,
    DisplayLanguageCode.de,
    DisplayLanguageCode.he,
    DisplayLanguageCode.hi,
    DisplayLanguageCode.ja,
    DisplayLanguageCode.ky,
    DisplayLanguageCode.fa,
    DisplayLanguageCode.ru,
    DisplayLanguageCode.es,
)

SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES: tuple[DisplayLanguageCode, ...] = (
    DisplayLanguageCode.ar,
    DisplayLanguageCode.zh_hans,
    DisplayLanguageCode.zh_hant,
    DisplayLanguageCode.fr,
    DisplayLanguageCode.de,
    DisplayLanguageCode.he,
    DisplayLanguageCode.hi,
    DisplayLanguageCode.ja,
    DisplayLanguageCode.ky,
    DisplayLanguageCode.fa,
    DisplayLanguageCode.ru,
    DisplayLanguageCode.es,
)

# Length Constants
MAX_LENGTH_CONVERSATION_TITLE: int = 150
MAX_LENGTH_BODY_HTML: int = 3000
MAX_LENGTH_CONVERSATION_BODY: int = 5000
MAX_LENGTH_CONVERSATION_BODY_HTML: int = 30000
LEGACY_MAX_LENGTH_CONVERSATION_BODY_HTML_OUTPUT: int = 60000
MAX_CONVERSATION_LANGUAGE_DETECTION_BODY_CHARS: int = 1000
MIN_CONVERSATION_LANGUAGE_DETECTION_CHARS: int = 2
MAX_LENGTH_OPINION_HTML_OUTPUT: int = 3000

# Import Lifecycle
MAX_CONVERSATION_IMPORT_DURATION_MS: int = 3600000
