import type { ConversationMultilingualSetting } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import {
  areConversationMultilingualSettingsEqual,
  cloneConversationMultilingualSetting,
  removeConversationAdditionalLanguage,
  setConversationDynamicTranslation,
} from "./conversationMultilingualSetting";

const setting: ConversationMultilingualSetting = {
  dynamicTranslationEnabled: true,
  additionalLanguageCodes: ["fr", "es"],
};

describe("conversation multilingual settings", () => {
  it("compares language selections without depending on their order", () => {
    expect(
      areConversationMultilingualSettingsEqual({
        left: setting,
        right: {
          dynamicTranslationEnabled: true,
          additionalLanguageCodes: ["es", "fr"],
        },
      })
    ).toBe(true);
    expect(
      areConversationMultilingualSettingsEqual({
        left: setting,
        right: {
          dynamicTranslationEnabled: false,
          additionalLanguageCodes: ["fr", "es"],
        },
      })
    ).toBe(false);
  });

  it("clones nested language codes", () => {
    const snapshot = cloneConversationMultilingualSetting(setting);

    snapshot.additionalLanguageCodes.splice(0, 1);

    expect(setting.additionalLanguageCodes).toEqual(["fr", "es"]);
  });

  it("updates dynamic translation without mutating the input", () => {
    const updated = setConversationDynamicTranslation({
      setting,
      enabled: false,
    });

    expect(updated.dynamicTranslationEnabled).toBe(false);
    expect(setting.dynamicTranslationEnabled).toBe(true);
    expect(
      setConversationDynamicTranslation({ setting, enabled: true })
    ).toBe(setting);
  });

  it("removes an additional language without mutating the input", () => {
    const updated = removeConversationAdditionalLanguage({
      setting,
      languageCode: "fr",
    });

    expect(updated.additionalLanguageCodes).toEqual(["es"]);
    expect(setting.additionalLanguageCodes).toEqual(["fr", "es"]);
    expect(
      removeConversationAdditionalLanguage({ setting, languageCode: "ja" })
    ).toBe(setting);
  });
});
