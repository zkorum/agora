import type { ParticipantStatements } from "src/shared/types/zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";

import ParticipantStatementsSetting from "./ParticipantStatementsSetting.vue";

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: (translations: { en: Record<string, string> }) => ({
    t: (key: string) => translations.en[key] ?? key,
  }),
}));
let app: App | undefined;
afterEach(() => {
  app?.unmount();
  document.body.replaceChildren();
});
function mountSetting({
  policy,
  disabled = false,
}: {
  policy: ParticipantStatements;
  disabled?: boolean;
}) {
  const value = ref(policy);
  const host = document.createElement("div");
  document.body.append(host);
  app = createApp(
    defineComponent({
      setup: () => () =>
        h(ParticipantStatementsSetting, {
          modelValue: value.value,
          disabled,
          "onUpdate:modelValue": (next) => {
            value.value = next;
          },
        }),
    })
  );
  app.component(
    "QToggle",
    defineComponent({
      props: {
        modelValue: Boolean,
        disable: Boolean,
        label: { type: String, required: true },
      },
      emits: ["update:modelValue"],
      setup(props, { emit }) {
        return () =>
          h("label", [
            h("input", {
              type: "checkbox",
              checked: props.modelValue,
              disabled: props.disable,
              onChange: () => emit("update:modelValue", !props.modelValue),
            }),
            props.label,
          ]);
      },
    })
  );
  app.mount(host);
  return { host, value };
}
describe("participant statement toggle", () => {
  it.each([true, false])(
    "toggles supported policy starting from %s",
    async (enabled) => {
      const { host, value } = mountSetting({
        policy: { supported: true, enabled },
      });
      const input = host.querySelector("input");
      if (!(input instanceof HTMLInputElement))
        throw new Error("Missing toggle");
      expect(input.checked).toBe(enabled);
      input.click();
      await nextTick();
      expect(value.value).toEqual({ supported: true, enabled: !enabled });
    }
  );
  it("hides unsupported QV policy", () => {
    const { host } = mountSetting({ policy: { supported: false } });
    expect(host.querySelector("input")).toBeNull();
    expect(host.textContent).toBe("");
  });
  it("does not change a disabled setting", async () => {
    const { host, value } = mountSetting({
      policy: { supported: true, enabled: false },
      disabled: true,
    });
    const input = host.querySelector("input");
    if (!(input instanceof HTMLInputElement)) throw new Error("Missing toggle");
    expect(input.disabled).toBe(true);
    input.click();
    await nextTick();
    expect(value.value).toEqual({ supported: true, enabled: false });
  });
});
