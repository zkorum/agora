import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";
import { z } from "zod";

const api = vi.hoisted(() => ({
  getProjectSummary: vi.fn(),
  updatePreference: vi.fn(),
}));
const showNotifyMessage = vi.hoisted(() => vi.fn());

vi.mock(
  "src/utils/api/conversationUpdates/useConversationEmailUpdateQueries",
  () => ({ useRemoveConversationEmailUpdateSummaryQueries: () => () => {} })
);

vi.mock("pinia", () => ({
  storeToRefs: (store: object) => store,
}));

vi.mock("quasar", () => ({
  useQuasar: () => ({ lang: { rtl: false } }),
}));

vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: () => ({ isLoggedIn: ref(true) }),
}));

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => api,
}));

vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage }),
}));

vi.mock("src/components/ui-library/ZKButton.vue", () => ({
  default: defineComponent({
    name: "ZKButton",
    emits: ["click"],
    setup(_props, { attrs, emit }) {
      return () =>
        h("button", {
          ...attrs,
          onClick: (event: MouseEvent) => emit("click", event),
        });
    },
  }),
}));

const testActionSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    disabled: z.boolean().optional(),
    closeOnSelect: z.boolean().optional(),
    trailingControl: z
      .object({ type: z.literal("switch"), checked: z.boolean() })
      .optional(),
  })
  .passthrough();

vi.mock("src/components/ui-library/ZKActionDialog.vue", () => ({
  default: defineComponent({
    name: "ZKActionDialog",
    props: {
      modelValue: { type: Boolean, required: true },
      actions: { type: Array, required: true },
      dialogLabel: { type: String, required: true },
    },
    emits: ["update:modelValue", "actionSelected"],
    setup(props, { emit }) {
      return () => {
        if (!props.modelValue) {
          return null;
        }
        const actions = z.array(testActionSchema).parse(props.actions);
        return h(
          "div",
          {
            "data-testid": "action-drawer",
            "aria-label": props.dialogLabel,
          },
          actions.map((action) =>
            h(
              "button",
              {
                "aria-label": action.label,
                "data-checked": String(
                  action.trailingControl?.checked ?? false
                ),
                disabled: action.disabled === true,
                onClick: () => {
                  emit("actionSelected", action);
                  if (action.closeOnSelect !== false) {
                    emit("update:modelValue", false);
                  }
                },
              },
              action.label
            )
          )
        );
      };
    },
  }),
}));

import ProjectEmailUpdatesMenu from "./ProjectEmailUpdatesMenu.vue";

const mountedApps: App[] = [];

beforeEach(() => {
  api.getProjectSummary.mockReset();
  api.updatePreference.mockReset();
  showNotifyMessage.mockReset();
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ProjectEmailUpdatesMenu", () => {
  it("hides the menu when the project has no available actions", async () => {
    api.getProjectSummary.mockResolvedValue({
      success: true,
      authoringAction: "none",
    });

    const container = mountMenu();
    await flushPromises();

    expect(container.querySelector("button")).toBeNull();
  });

  it.each([
    ["compose", "manageUpdates"],
    ["history", "viewHistory"],
  ])(
    "shows the %s author action with no subtitle",
    async (authoringAction, label) => {
      api.getProjectSummary.mockResolvedValue({
        success: true,
        authoringAction,
      });

      const container = mountMenu();
      await flushPromises();
      getButton(container, "projectActions").click();
      await nextTick();

      expect(getButton(container, label).textContent).toBe(label);
      expect(
        container
          .querySelector('[data-testid="action-drawer"]')
          ?.getAttribute("aria-label")
      ).toBe("projectActions");
      expect(container.querySelectorAll("button")).toHaveLength(2);
    }
  );

  it.each([
    ["disabled", "enabled", false, "saveEnabled"],
    ["disabled", "enabled", true, "preferenceSavedAndGlobalResumed"],
    ["enabled", "disabled", false, "saveDisabled"],
  ])(
    "optimistically saves a %s to %s toggle and keeps the drawer open",
    async (initialState, savedState, globalResumed, successMessage) => {
      const write = deferred();
      api.getProjectSummary.mockResolvedValue({
        success: true,
        authoringAction: "none",
        participantPreference: {
          state: initialState,
          resolvedEnabled: initialState === "enabled",
        },
      });
      api.updatePreference.mockReturnValue(write.promise);

      const container = mountMenu();
      await flushPromises();
      getButton(container, "projectActions").click();
      await nextTick();

      const toggle = getButton(container, "receiveUpdates");
      toggle.click();
      await nextTick();

      expect(getButton(container, "receiveUpdates").dataset.checked).toBe(
        String(savedState === "enabled")
      );
      expect(getButton(container, "receiveUpdates").disabled).toBe(true);
      expect(
        container.querySelector('[data-testid="action-drawer"]')
      ).not.toBeNull();

      write.resolve({
        success: true,
        result: {
          operation: "set_project_preference",
          projectSlug: "project-one",
          state: savedState,
          globalResumed,
        },
      });
      await flushPromises();

      expect(getButton(container, "receiveUpdates").disabled).toBe(false);
      expect(showNotifyMessage).toHaveBeenCalledWith(successMessage);
    }
  );

  it("restores the exact toggle state when saving fails", async () => {
    const write = deferred();
    api.getProjectSummary.mockResolvedValue({
      success: true,
      authoringAction: "none",
      participantPreference: {
        state: "enabled",
        resolvedEnabled: false,
      },
    });
    api.updatePreference.mockReturnValue(write.promise);

    const container = mountMenu();
    await flushPromises();
    getButton(container, "projectActions").click();
    await nextTick();
    getButton(container, "receiveUpdates").click();
    await nextTick();

    expect(getButton(container, "receiveUpdates").dataset.checked).toBe(
      "false"
    );
    write.resolve({ success: false, reason: "feature_not_available" });
    await flushPromises();

    expect(getButton(container, "receiveUpdates").dataset.checked).toBe("true");
    expect(getButton(container, "receiveUpdates").disabled).toBe(false);
    expect(showNotifyMessage).toHaveBeenCalledWith("saveError");
  });

  it("ignores an old project mutation after the slug changes", async () => {
    const write = deferred();
    const projectSlug = ref("project-one");
    api.getProjectSummary
      .mockResolvedValueOnce({
        success: true,
        authoringAction: "none",
        participantPreference: {
          state: "disabled",
          resolvedEnabled: false,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        authoringAction: "none",
        participantPreference: {
          state: "disabled",
          resolvedEnabled: false,
        },
      });
    api.updatePreference.mockReturnValue(write.promise);

    const container = mountMenu(projectSlug);
    await flushPromises();
    getButton(container, "projectActions").click();
    await nextTick();
    getButton(container, "receiveUpdates").click();
    await nextTick();

    projectSlug.value = "project-two";
    await flushPromises();
    getButton(container, "projectActions").click();
    await nextTick();
    expect(getButton(container, "receiveUpdates").dataset.checked).toBe(
      "false"
    );

    write.resolve({
      success: true,
      result: {
        operation: "set_project_preference",
        projectSlug: "project-one",
        state: "enabled",
        globalResumed: false,
      },
    });
    await flushPromises();

    expect(getButton(container, "receiveUpdates").dataset.checked).toBe(
      "false"
    );
    expect(
      container.querySelector('[data-testid="action-drawer"]')
    ).not.toBeNull();
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });
});

function mountMenu(projectSlug = ref("project-one")): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const root = defineComponent(
    () => () =>
      h(ProjectEmailUpdatesMenu, {
        projectSlug: projectSlug.value,
      })
  );
  const app = createApp(root);
  mountedApps.push(app);
  app.mount(container);
  return container;
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
  if (button === undefined) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
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
    resolve(value) {
      resolvePromise?.(value);
    },
  };
}
