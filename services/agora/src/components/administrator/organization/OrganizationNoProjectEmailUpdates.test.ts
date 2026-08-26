import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick } from "vue";

const api = vi.hoisted(() => ({
  getNoProjectEmailUpdates: vi.fn(),
  updateNoProjectEmailUpdates: vi.fn(),
}));
const showNotifyMessage = vi.hoisted(() => vi.fn());

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("src/utils/api/administrator/organization", () => ({
  useBackendAdministratorOrganizationApi: () => api,
}));

vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage }),
}));

vi.mock(
  "src/components/administrator/project/ProjectConversationUpdatesActivation.vue",
  () => ({
    default: defineComponent({
      props: {
        modelValue: { type: Boolean, required: true },
        disabled: { type: Boolean, required: true },
      },
      emits: ["update:modelValue"],
      setup(props, { emit }) {
        return () =>
          h("button", {
            "aria-label": "email-updates-default",
            "data-checked": String(props.modelValue),
            disabled: props.disabled,
            onClick: () => emit("update:modelValue", !props.modelValue),
          });
      },
    }),
  })
);

vi.mock("src/components/administrator/AdminSectionHeader.vue", () => ({
  default: defineComponent(() => () => null),
}));

vi.mock("src/components/ui-library/ZKButton.vue", () => ({
  default: defineComponent(() => () => null),
}));

vi.mock("src/components/ui-library/ZKCard.vue", () => ({
  default: defineComponent(
    (_, { slots }) =>
      () =>
        h("div", slots.default?.())
  ),
}));

vi.mock("src/components/ui-library/ZKConfirmDialog.vue", () => ({
  default: defineComponent(() => () => null),
}));

import OrganizationNoProjectEmailUpdates from "./OrganizationNoProjectEmailUpdates.vue";

const mountedApps: App[] = [];
const initialConfiguration = {
  hasEntitlement: true,
  defaultEnabled: false,
  contact: { name: "Agora team", email: "team@example.com" },
  canDeleteContact: true,
};

beforeEach(() => {
  api.getNoProjectEmailUpdates.mockReset();
  api.updateNoProjectEmailUpdates.mockReset();
  showNotifyMessage.mockReset();
  api.getNoProjectEmailUpdates.mockResolvedValue({
    success: true,
    configuration: initialConfiguration,
  });
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("OrganizationNoProjectEmailUpdates", () => {
  it("optimistically enables the default and confirms the saved state", async () => {
    const write = deferred();
    api.updateNoProjectEmailUpdates.mockReturnValue(write.promise);
    const container = mountComponent();
    await flushPromises();

    getToggle(container).click();
    await nextTick();

    expect(getToggle(container).dataset.checked).toBe("true");
    expect(getToggle(container).disabled).toBe(true);
    expect(api.updateNoProjectEmailUpdates).toHaveBeenCalledWith({
      organizationSlug: "agora-org",
      defaultEnabled: true,
      contact: initialConfiguration.contact,
    });

    write.resolve({
      success: true,
      configuration: { ...initialConfiguration, defaultEnabled: true },
    });
    await flushPromises();

    expect(getToggle(container).dataset.checked).toBe("true");
    expect(getToggle(container).disabled).toBe(false);
    expect(showNotifyMessage).toHaveBeenCalledWith("defaultEnabledSaved");
  });

  it("rolls the optimistic state back when the save fails", async () => {
    const write = deferred();
    api.updateNoProjectEmailUpdates.mockReturnValue(write.promise);
    const container = mountComponent();
    await flushPromises();

    getToggle(container).click();
    await nextTick();
    expect(getToggle(container).dataset.checked).toBe("true");

    write.resolve({ success: false, reason: "entitlement_required" });
    await flushPromises();

    expect(getToggle(container).dataset.checked).toBe("false");
    expect(getToggle(container).disabled).toBe(false);
    expect(showNotifyMessage).toHaveBeenCalledWith("entitlementRequired");
  });
});

function mountComponent(): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(OrganizationNoProjectEmailUpdates, {
    organizationSlug: "agora-org",
    organizationName: "Agora",
  });
  app.component(
    "QInput",
    defineComponent(() => () => h("input"))
  );
  mountedApps.push(app);
  app.mount(container);
  return container;
}

function getToggle(container: HTMLElement): HTMLButtonElement {
  const toggle = container.querySelector<HTMLButtonElement>(
    '[aria-label="email-updates-default"]'
  );
  if (toggle === null) {
    throw new Error("Email Updates default toggle not found");
  }
  return toggle;
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

function deferred(): {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
} {
  let resolvePromise: ((value: unknown) => void) | undefined;
  const promise = new Promise<unknown>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (value: unknown) => resolvePromise?.(value),
  };
}
