import { QInput, Quasar } from "quasar";
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";

import ZKInput from "./ZKInput.vue";

describe("ZKInput", () => {
  it("shares edits between two fields and preserves the value when the required copy is hidden", async () => {
    const email = ref<string | number | null>("");
    const asksParticipants = ref(true);
    const app = createApp(
      defineComponent(
        () => () =>
          h("div", [
            h(ZKInput, {
              name: "main-email",
              type: "email",
              label: "Contact email",
              required: false,
              modelValue: email.value,
              "onUpdate:modelValue": (value) => (email.value = value),
            }),
            asksParticipants.value
              ? h(ZKInput, {
                  name: "ask-email",
                  type: "email",
                  label: "Contact email",
                  required: true,
                  modelValue: email.value,
                  "onUpdate:modelValue": (value) => (email.value = value),
                })
              : null,
          ])
      )
    );
    app.use(Quasar, { components: { QInput } });
    const target = document.createElement("div");
    document.body.append(target);
    app.mount(target);
    try {
      const main = target.querySelector('input[name="main-email"]');
      const ask = target.querySelector('input[name="ask-email"]');
      if (
        !(main instanceof HTMLInputElement) ||
        !(ask instanceof HTMLInputElement)
      )
        throw new Error("Missing contact inputs");
      expect(main.required).toBe(false);
      expect(ask.required).toBe(true);
      expect(ask.type).toBe("email");
      expect(ask.labels?.[0]?.textContent).toContain("Contact email");
      expect(
        ask.labels?.[0]
          ?.querySelector(".zk-field-label__required")
          ?.getAttribute("aria-hidden")
      ).toBe("true");
      ask.value = "team@example.com";
      ask.dispatchEvent(new Event("input", { bubbles: true }));
      await nextTick();
      expect(main.value).toBe("team@example.com");
      main.value = "contact@example.com";
      main.dispatchEvent(new Event("input", { bubbles: true }));
      await nextTick();
      expect(ask.value).toBe("contact@example.com");
      asksParticipants.value = false;
      await nextTick();
      expect(target.querySelector('input[name="ask-email"]')).toBeNull();
      expect(main.value).toBe("contact@example.com");
    } finally {
      app.unmount();
      target.remove();
    }
  });
});
