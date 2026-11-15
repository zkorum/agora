import {
  type ConversationMultilingualSetting,
  zodConversationMultilingualSetting,
} from "src/shared/types/zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";

vi.mock("quasar", () => ({ useQuasar: () => ({ lang: { rtl: false } }) }));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key, locale: ref("en") }),
}));
vi.mock("src/components/newConversation/ConversationControlButton.vue", () => ({
  default: defineComponent({
    emits: ["click"],
    setup(_props, { emit }) {
      return () =>
        h("button", { "data-action": "open", onClick: () => emit("click") });
    },
  }),
}));
vi.mock("src/components/ui-library/ZKBottomDialogContainer.vue", () => ({
  default: defineComponent({
    setup(_props, { slots }) {
      return () => h("div", slots.default?.());
    },
  }),
}));
vi.mock(
  "src/components/newConversation/dialog/ConversationLanguageSettingsRow.vue",
  () => ({
    default: defineComponent({
      setup(_props, { slots }) {
        return () => h("div", slots.actions?.());
      },
    }),
  })
);
vi.mock(
  "src/components/newConversation/dialog/ConversationAdditionalLanguagesDialog.vue",
  () => ({
    default: defineComponent({
      props: {
        showDialog: Boolean,
        multilingualSetting: { type: Object, required: true },
      },
      emits: ["update:multilingualSetting", "back"],
      setup(props, { emit, slots }) {
        return () =>
          props.showDialog
            ? h("div", [
                h("button", {
                  "data-action": "select-language",
                  onClick: () =>
                    emit("update:multilingualSetting", {
                      ...zodConversationMultilingualSetting.parse(
                        props.multilingualSetting
                      ),
                      additionalLanguageCodes: ["fr"],
                    }),
                }),
                ...(slots.actions?.() ?? []),
              ])
            : null;
      },
    }),
  })
);

import ConversationProjectLanguageSettings from "./ConversationProjectLanguageSettings.vue";

let app: App | undefined;
afterEach(() => {
  app?.unmount();
  document.body.replaceChildren();
});

describe("project language editing", () => {
  it.each([true, false])(
    "keeps inherited settings until the user explicitly chooses a valid subset (translation=%s)",
    async (translationEnabled) => {
      const inherited = ref(true);
      const setting = ref<ConversationMultilingualSetting>({
        additionalLanguageCodes: [],
        dynamicTranslationEnabled: !translationEnabled,
      });
      const host = document.createElement("div");
      document.body.append(host);
      app = createApp(
        defineComponent({
          setup() {
            return () =>
              h(ConversationProjectLanguageSettings, {
                project: {
                  projectSlug: "project",
                  projectTitle: "Project",
                  defaultLanguageCode: "en",
                  languageSettings: {
                    dynamicTranslationEnabled: true,
                    targetLanguageCodes: ["fr", "ar"],
                  },
                },
                canUseDynamicTranslation: true,
                detectedLanguageCode: undefined,
                inheritProjectLanguages: inherited.value,
                overrideMultilingualSetting: setting.value,
                "onUpdate:inheritProjectLanguages": (value) => {
                  inherited.value = value;
                },
                "onUpdate:overrideMultilingualSetting": (value) => {
                  setting.value = value;
                },
              });
          },
        })
      );
      app.component(
        "QDialog",
        defineComponent({
          props: { modelValue: Boolean },
          setup(props, { slots }) {
            return () =>
              props.modelValue ? h("div", slots.default?.()) : null;
          },
        })
      );
      app.component(
        "QToggle",
        defineComponent({
          props: { modelValue: Boolean },
          emits: ["update:modelValue"],
          setup(props, { emit }) {
            return () =>
              h("button", {
                "data-action": "toggle",
                onClick: () => emit("update:modelValue", !props.modelValue),
              });
          },
        })
      );
      app.mount(host);
      host.querySelector<HTMLButtonElement>('[data-action="open"]')?.click();
      await nextTick();
      host
        .querySelectorAll<HTMLButtonElement>('[data-action="toggle"]')
        [translationEnabled ? 0 : 1]?.click();
      await nextTick();
      expect(inherited.value).toBe(true);
      expect(setting.value.additionalLanguageCodes).toEqual([]);
      host
        .querySelector<HTMLButtonElement>('[data-action="select-language"]')
        ?.click();
      await nextTick();
      expect(inherited.value).toBe(false);
      expect(setting.value).toEqual({
        additionalLanguageCodes: ["fr"],
        dynamicTranslationEnabled: translationEnabled,
      });
    }
  );
});
