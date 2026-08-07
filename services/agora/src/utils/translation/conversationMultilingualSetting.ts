import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { ConversationMultilingualSetting } from "src/shared/types/zod";

export function areConversationMultilingualSettingsEqual({
  left,
  right,
}: {
  left: ConversationMultilingualSetting;
  right: ConversationMultilingualSetting;
}): boolean {
  return (
    left.dynamicTranslationEnabled === right.dynamicTranslationEnabled &&
    left.additionalLanguageCodes.length === right.additionalLanguageCodes.length &&
    left.additionalLanguageCodes.every((languageCode) =>
      right.additionalLanguageCodes.includes(languageCode)
    )
  );
}

export function cloneConversationMultilingualSetting(
  setting: ConversationMultilingualSetting
): ConversationMultilingualSetting {
  return {
    ...setting,
    additionalLanguageCodes: [...setting.additionalLanguageCodes],
  };
}

export function setConversationDynamicTranslation({
  setting,
  enabled,
}: {
  setting: ConversationMultilingualSetting;
  enabled: boolean;
}): ConversationMultilingualSetting {
  if (setting.dynamicTranslationEnabled === enabled) {
    return setting;
  }
  return { ...setting, dynamicTranslationEnabled: enabled };
}

export function removeConversationAdditionalLanguage({
  setting,
  languageCode,
}: {
  setting: ConversationMultilingualSetting;
  languageCode: SupportedDisplayLanguageCodes;
}): ConversationMultilingualSetting {
  if (!setting.additionalLanguageCodes.includes(languageCode)) {
    return setting;
  }
  return {
    ...setting,
    additionalLanguageCodes: setting.additionalLanguageCodes.filter(
      (candidate) => candidate !== languageCode
    ),
  };
}
