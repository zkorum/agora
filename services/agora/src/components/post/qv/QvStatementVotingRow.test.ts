import type { RankingItemContentTranslationPreview } from "src/utils/translation/useContentTranslationPreview";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";
import { createI18n } from "vue-i18n";

const preview = ref<RankingItemContentTranslationPreview>();
const setMode = vi.fn();
vi.mock("pinia", () => ({ storeToRefs: (store: object) => store }));
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => ({
    displayLanguage: ref("en"),
    spokenLanguages: ref(["en"]),
  }),
}));
vi.mock("src/utils/translation/useContentTranslationPreview", () => ({
  useRankingItemContentTranslationPreview: () => ({ preview, setMode }),
}));
vi.mock("src/components/translation/ContentTranslationControl.vue", () => ({
  default: defineComponent({
    props: { modelValue: { type: String, required: true } },
    emits: ["update:modelValue"],
    setup:
      (props, { emit }) =>
      () =>
        h(
          "button",
          {
            onClick: () =>
              emit(
                "update:modelValue",
                props.modelValue === "original" ? "translated" : "original"
              ),
          },
          "Switch translation"
        ),
  }),
}));

import QvStatementVotingRow from "./QvStatementVotingRow.vue";

const apps: App[] = [];
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  preview.value = undefined;
  setMode.mockReset();
  document.body.replaceChildren();
});

function mountRow() {
  const adjust = vi.fn();
  const app = createApp(QvStatementVotingRow, {
    conversationSlugId: "qv-test",
    item: {
      slugId: "item",
      displayContent: {
        sourceVersion: "00000000-0000-4000-8000-000000000001",
        status: "available",
        mode: "original",
        content: {
          title: "<p>Original <strong>title</strong></p>",
          bodyHtml: "<p>Original description</p>",
        },
        translationControl: {
          status: "completed",
          sourceLanguageLabel: "English",
          alternateMode: "translated",
          canRequestAlternate: true,
        },
      },
    },
    votes: 1,
    canDecrease: true,
    canIncrease: true,
    onAdjust: adjust,
  });
  app.use(createI18n({ legacy: false, locale: "en" }));
  app.component(
    "QBtn",
    defineComponent({
      props: { disable: Boolean, icon: { type: String, required: true } },
      emits: ["click"],
      setup:
        (props, { emit }) =>
        () =>
          h(
            "button",
            { disabled: props.disable, onClick: () => emit("click") },
            props.icon
          ),
    })
  );
  const container = document.createElement("ul");
  document.body.append(container);
  apps.push(app);
  app.mount(container);
  function button(label: string): HTMLButtonElement {
    const found = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === label
    );
    if (found === undefined) throw new Error(`Missing button: ${label}`);
    return found;
  }
  return { container, button, adjust };
}

describe("QV translated statement controls", () => {
  it("keeps accessible control labels aligned with the actually displayed translation", async () => {
    const view = mountRow();
    expect(view.button("mdi-plus").getAttribute("aria-label")).toBe(
      "Increase support for: Original title"
    );
    view.button("Switch translation").click();
    await nextTick();
    expect(setMode).toHaveBeenCalledWith("translated");
    preview.value = {
      isAvailable: true,
      isLoadingInitialTranslation: false,
      mode: "translated",
      sourceLanguageLabel: "English",
      translationStatus: "completed",
      originalContent: {
        title: "Original title",
        bodyHtml: "<p>Original description</p>",
      },
      translatedContent: {
        title: "<p>Titre <strong>traduit</strong></p>",
        bodyHtml: "<p>Description traduite</p>",
      },
    };
    await nextTick();
    expect(view.container.textContent).toContain("Titre traduit");
    expect(view.container.textContent).toContain("Description traduite");
    expect(view.container.textContent).not.toContain("Original description");
    expect(view.button("mdi-plus").getAttribute("aria-label")).toBe(
      "Increase support for: Titre traduit"
    );
    expect(view.button("mdi-minus").getAttribute("aria-label")).toBe(
      "Decrease support for: Titre traduit"
    );
    view.button("mdi-plus").click();
    expect(view.adjust).toHaveBeenCalledWith(1);
  });

  it("prevents voting when the requested translation has no readable content yet", async () => {
    const view = mountRow();
    preview.value = {
      isAvailable: true,
      isLoadingInitialTranslation: true,
      mode: "translated",
      sourceLanguageLabel: "English",
      translationStatus: "pending",
      originalContent: undefined,
      translatedContent: undefined,
    };
    await nextTick();
    expect(view.container.textContent).toContain(
      "Statement text is unavailable"
    );
    expect(view.button("mdi-plus").disabled).toBe(true);
    view.button("mdi-plus").click();
    expect(view.adjust).not.toHaveBeenCalled();
  });
});
