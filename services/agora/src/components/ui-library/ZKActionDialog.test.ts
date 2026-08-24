import type { ContentAction } from "src/utils/actions/core/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";

vi.mock("./SpaLink.vue", () => ({
  default: defineComponent({
    setup(_props, { slots }) {
      return () => h("a", slots.default?.());
    },
  }),
}));

vi.mock("./ZKBottomDialogContainer.vue", () => ({
  default: defineComponent({
    setup(_props, { slots }) {
      return () => h("div", slots.default?.());
    },
  }),
}));

import ZKActionDialog from "./ZKActionDialog.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
});

function mountDialog({
  action,
  onActionSelected,
}: {
  action: ContentAction;
  onActionSelected: (selected: ContentAction) => void;
}): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const isVisible = ref(true);
  const app = createApp({
    setup() {
      return () =>
        h(ZKActionDialog, {
          modelValue: isVisible.value,
          actions: [action],
          "onUpdate:modelValue": (value: boolean) => {
            isVisible.value = value;
          },
          onActionSelected,
        });
    },
  });
  app.component(
    "QDialog",
    defineComponent({
      props: { modelValue: { type: Boolean, required: true } },
      setup(props, { slots }) {
        return () => (props.modelValue ? h("div", slots.default?.()) : null);
      },
    })
  );
  app.component(
    "QIcon",
    defineComponent({
      setup() {
        return () => h("span");
      },
    })
  );
  app.mount(host);
  mountedApps.push(app);
  return host;
}

describe("ZKActionDialog", () => {
  it("selects a switch action when the row is clicked", async () => {
    const onActionSelected = vi.fn();
    const action: ContentAction = {
      id: "email-updates",
      label: "Receive email updates",
      icon: "mdi-email-outline",
      closeOnSelect: false,
      trailingControl: { type: "switch", checked: false },
      handler: vi.fn(),
      isVisible: () => true,
    };
    const host = mountDialog({ action, onActionSelected });
    await nextTick();

    const row = host.querySelector<HTMLElement>("[role='switch']");
    expect(row?.textContent).toContain("Receive email updates");
    expect(row?.getAttribute("aria-checked")).toBe("false");
    const visualSwitch = row?.querySelector(".zk-switch");
    expect(visualSwitch?.tagName).toBe("SPAN");
    expect(visualSwitch?.getAttribute("role")).toBeNull();
    row?.click();
    await nextTick();

    expect(onActionSelected).toHaveBeenCalledOnce();
    expect(onActionSelected).toHaveBeenCalledWith(action);
    expect(host.querySelector("[role='switch']")).not.toBeNull();
  });

  it("does not select a disabled switch action", async () => {
    const onActionSelected = vi.fn();
    const action: ContentAction = {
      id: "email-updates",
      label: "Receive email updates",
      icon: "mdi-email-outline",
      closeOnSelect: false,
      disabled: true,
      trailingControl: { type: "switch", checked: true },
      handler: vi.fn(),
      isVisible: () => true,
    };
    const host = mountDialog({ action, onActionSelected });
    await nextTick();

    const row = host.querySelector<HTMLButtonElement>("[role='switch']");
    expect(row?.disabled).toBe(true);
    row?.click();
    await nextTick();

    expect(onActionSelected).not.toHaveBeenCalled();
  });
});
