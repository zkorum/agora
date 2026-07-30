import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, onMounted, ref } from "vue";

vi.mock("quasar", () => ({
  useQuasar: () => ({
    platform: {
      is: {
        mobile: false,
      },
    },
  }),
}));

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("src/components/ui-library/ZKConfirmDialog.vue", () => ({
  default: () => null,
}));

import SeedOpinionItem from "./SeedOpinionItem.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("SeedOpinionItem", () => {
  it("fulfills a focus request made before the editor is ready", async () => {
    const TestRoot = defineComponent({
      setup() {
        const seedOpinionItem = ref<InstanceType<typeof SeedOpinionItem>>();

        onMounted(() => {
          seedOpinionItem.value?.focus();
        });

        return () =>
          h(SeedOpinionItem, {
            ref: seedOpinionItem,
            modelValue: "",
            errorMessage: undefined,
            isActive: false,
            disabled: false,
          });
      },
    });
    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp(TestRoot);
    app.component("QIcon", () => null);
    mountedApps.push(app);

    app.mount(container);

    const editorElement = await vi.waitUntil(() => {
      const element = container.querySelector(".ProseMirror");
      return element instanceof HTMLElement ? element : undefined;
    });
    await vi.waitUntil(() => document.activeElement === editorElement);

    expect(document.activeElement).toBe(editorElement);
  });
});
