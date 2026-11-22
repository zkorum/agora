import { QBtn, QCheckbox, QSelect, Quasar } from "quasar";
import type { SurveyOptionText } from "src/shared/surveyChoiceText";
import type { SurveyChoiceDisplay } from "src/shared/types/zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";
import { createI18n } from "vue-i18n";

import SurveyChoiceInput from "./SurveyChoiceInput.vue";

const mounted: Array<{ app: App; target: HTMLElement }> = [];
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "scrollIntoView"
);
beforeEach(() => {
  // jsdom has no layout or media-query implementation.
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false }))
  );
});
afterEach(() => {
  for (const { app, target } of mounted.splice(0)) {
    app.unmount();
    target.remove();
  }
  if (originalScrollIntoView === undefined) {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  } else {
    Object.defineProperty(
      Element.prototype,
      "scrollIntoView",
      originalScrollIntoView
    );
  }
  vi.unstubAllGlobals();
});

async function mountChoice({
  multiple = false,
  display = "list",
  allowsText = true,
  initialHtml = "<p>Saved text</p>",
}: {
  multiple?: boolean;
  display?: SurveyChoiceDisplay;
  allowsText?: boolean;
  initialHtml?: string;
} = {}) {
  const single = ref<string | null>(multiple ? null : "other");
  const multi = ref<string[]>([]);
  const texts = ref<Record<string, SurveyOptionText>>({
    other: { textValueHtml: initialHtml },
  });
  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(SurveyChoiceInput, {
            choiceDisplay: display,
            isMultipleSelection: multiple,
            isRequired: true,
            options: [
              { value: "bicycle", label: "Bicycle", allowsText: true },
              { value: "other", label: "Other", allowsText },
            ],
            selectedSingleOptionSlugId: single.value,
            selectedMultiOptionSlugIds: multi.value,
            optionTextValues: texts.value,
            selectOptionLabel: "Select an option",
            maxSelections: multiple ? 2 : 1,
            popupBottomBoundary: undefined,
            "onUpdate:selectedSingleOptionSlugId": (value: string | null) => {
              single.value = value;
            },
            "onUpdate:selectedMultiOptionSlugIds": (value: string[]) => {
              multi.value = value;
            },
            "onUpdate:optionTextValues": (
              value: Record<string, SurveyOptionText>
            ) => {
              texts.value = value;
            },
          });
      },
    })
  );
  app.use(Quasar, { components: { QBtn, QCheckbox, QSelect } });
  app.use(
    createI18n({
      legacy: false,
      locale: "en",
      messages: { en: { common: { loading: "Loading" } } },
    })
  );
  const target = document.createElement("div");
  document.body.append(target);
  app.mount(target);
  mounted.push({ app, target });
  if (!multiple && allowsText) {
    await vi.waitUntil(() => target.querySelector(".ProseMirror") !== null);
  }
  return { target, single, multi, texts };
}

describe("choice option text inputs", () => {
  it("pastes text and line breaks without formatting or active HTML", async () => {
    const { target, texts } = await mountChoice({ initialHtml: "" });
    const input = target.querySelector(".ProseMirror");
    if (input === null) throw new Error("Expected option editor");
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) =>
          type === "text/html"
            ? '<p><strong>Pasted</strong><br><em>Next</em></p><img src="x" onerror="alert(1)">'
            : "Pasted\nNext",
        files: [],
      },
    });
    input.dispatchEvent(event);
    await vi.waitFor(() =>
      expect(texts.value.other).toEqual({
        textValueHtml: "<p>Pasted<br>Next</p>",
      })
    );
    expect(input.querySelector("strong, em, img")).toBeNull();
  });

  it("keeps the submitted model consistent when the simple editor strips incoming formatting", async () => {
    const { target, texts } = await mountChoice({
      initialHtml: "<p><strong>First</strong><br><em>Second</em></p>",
    });
    await vi.waitFor(() =>
      expect(texts.value.other).toEqual({
        textValueHtml: "<p>First<br>Second</p>",
      })
    );
    expect(
      target.querySelector(".ProseMirror strong, .ProseMirror em")
    ).toBeNull();
    expect(target.querySelector(".ProseMirror br")).not.toBeNull();
  });

  it.each(["list", "dropdown"] satisfies SurveyChoiceDisplay[])(
    "edits saved text in the %s layout without changing the selection",
    async (display) => {
      const { target, single, texts } = await mountChoice({ display });
      const input = target.querySelector(".ProseMirror p");
      if (input === null) throw new Error("Expected option text input");
      expect(input.textContent).toBe("Saved text");
      expect(target.querySelector(".toolbar, .bubble-menu-content")).toBeNull();
      const labelId = input.parentElement?.getAttribute("aria-labelledby");
      expect(
        labelId === null || labelId === undefined
          ? undefined
          : document.getElementById(labelId)?.textContent
      ).toContain("Other");
      input.textContent = "Updated text";
      await vi.waitFor(() =>
        expect(texts.value.other).toEqual({
          textValueHtml: "<p>Updated text</p>",
        })
      );
      expect(single.value).toBe("other");
      input.textContent = "";
      await vi.waitFor(() =>
        expect(texts.value.other).toEqual({ textValueHtml: "" })
      );
      expect(single.value).toBe("other");
    }
  );

  it("keeps independent texts for checkboxes and restores drafts after reselecting", async () => {
    const { target, multi, texts } = await mountChoice({ multiple: true });
    const [bicycle, other] =
      target.querySelectorAll<HTMLElement>('[role="checkbox"]');
    if (bicycle === undefined || other === undefined)
      throw new Error("Expected choice checkboxes");
    other.click();
    await nextTick();
    expect(multi.value).toEqual(["other"]);
    bicycle.click();
    await nextTick();
    await vi.waitUntil(
      () => target.querySelectorAll(".ProseMirror").length === 2
    );
    const bicycleInput = target.querySelector(".ProseMirror p");
    if (bicycleInput === null) throw new Error("Expected bicycle text input");
    bicycleInput.textContent = "Electric bicycle";
    await vi.waitFor(() =>
      expect(texts.value).toEqual({
        other: { textValueHtml: "<p>Saved text</p>" },
        bicycle: { textValueHtml: "<p>Electric bicycle</p>" },
      })
    );
    other.click();
    await nextTick();
    expect(target.querySelectorAll(".ProseMirror")).toHaveLength(1);
    other.click();
    await nextTick();
    await vi.waitFor(() =>
      expect(target.querySelectorAll(".ProseMirror")[1]?.textContent).toBe(
        "Saved text"
      )
    );
  });

  it("displays collected text read-only after the author disables its field", async () => {
    const { target, texts } = await mountChoice({ allowsText: false });
    texts.value.other = { textValueHtml: "<p><strong>Saved text</strong></p>" };
    await nextTick();
    expect(
      target.querySelector(".option-text-input__read-only")?.textContent
    ).toBe("Saved text");
    expect(target.querySelector("strong")).toBeNull();
    expect(target.querySelector('[contenteditable="true"]')).toBeNull();
  });

  it("renders escaped literal markup without creating HTML elements", async () => {
    const { target, texts } = await mountChoice();
    const literal = '<img data-survey-injected="yes" src="x" />';
    texts.value.other = {
      textValueHtml: '<p>&lt;img data-survey-injected="yes" src="x" /&gt;</p>',
    };
    await nextTick();
    expect(target.querySelector(".ProseMirror")?.textContent).toBe(literal);
    expect(target.querySelector("[data-survey-injected]")).toBeNull();
  });
});
