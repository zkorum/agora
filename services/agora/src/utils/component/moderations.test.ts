import { zodModerationReason } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createI18n } from "vue-i18n";

import { useModerationMappings } from "./moderations";
import { moderationsTranslations } from "./moderations.i18n";

describe("moderation reasons", () => {
  it("offers every reason and updates the labels when the language changes", async () => {
    const container = document.createElement("div");
    const component = defineComponent(() => {
      const { moderationReasonMapping } = useModerationMappings();
      return () =>
        h(
          "ul",
          moderationReasonMapping.value.map(({ label, value }) =>
            h("li", { "data-reason": value }, label)
          )
        );
    });
    const i18n = createI18n({ legacy: false, locale: "en", messages: {} });
    const app = createApp(component);
    app.use(i18n);
    app.mount(container);

    try {
      expect(
        Array.from(container.querySelectorAll("li"), (item) =>
          item.getAttribute("data-reason")
        )
      ).toEqual(zodModerationReason.options);
      expect(
        container.querySelector('[data-reason="off_topic"]')?.textContent
      ).toBe("Off-topic");
      expect(
        container.querySelector('[data-reason="other"]')?.textContent
      ).toBe("Other");

      i18n.global.locale.value = "fr";
      await nextTick();

      expect(
        container.querySelector('[data-reason="off_topic"]')?.textContent
      ).toBe("Hors sujet");
      expect(
        container.querySelector('[data-reason="other"]')?.textContent
      ).toBe("Autre");
    } finally {
      app.unmount();
    }
  });

  it("provides a label for every reason in every supported language", () => {
    for (const translations of Object.values(moderationsTranslations)) {
      for (const reason of zodModerationReason.options) {
        expect(translations[reason].trim().length).toBeGreaterThan(0);
      }
    }
  });
});
