import type { ConversationEmailUpdatePreferenceGroup } from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";

const api = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  updatePreference: vi.fn(),
}));

vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => api,
}));

vi.mock("src/components/ui/PageLoadingSpinner.vue", () => ({
  default: defineComponent(() => () => h("div", "Loading")),
}));
vi.mock("src/components/ui/ErrorRetryBlock.vue", () => ({
  default: defineComponent(() => () => h("div", "Error")),
}));
vi.mock("src/components/ui-library/SpaLink.vue", () => ({
  default: defineComponent({
    name: "SpaLink",
    props: { to: { type: String, required: true } },
    setup(_props, { slots }) {
      return () => h("a", slots.default?.());
    },
  }),
}));
vi.mock("src/components/ui-library/ZKButton.vue", () => ({
  default: defineComponent({
    name: "ZKButton",
    props: { label: { type: String, required: true } },
    emits: ["click"],
    setup(props, { emit }) {
      return () => h("button", { onClick: () => emit("click") }, props.label);
    },
  }),
}));
vi.mock("src/components/ui-library/ZKInfoBanner.vue", () => ({
  default: defineComponent(() => () => null),
}));
vi.mock("src/components/ui-library/ZKSwitch.vue", () => ({
  default: defineComponent({
    name: "ZKSwitch",
    props: {
      modelValue: { type: Boolean, required: true },
      disable: { type: Boolean, default: false },
      ariaLabel: { type: String, required: true },
    },
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      return () =>
        h("button", {
          "aria-label": props.ariaLabel,
          "data-enabled": String(props.modelValue),
          disabled: props.disable,
          onClick: () => emit("update:modelValue", !props.modelValue),
        });
    },
  }),
}));

import ConversationUpdatePreferenceSettings from "./ConversationUpdatePreferenceSettings.vue";

const projectGroup = {
  kind: "project",
  projectSlug: "project-one",
  projectTitle: "Project One",
  state: "enabled",
  resolvedEnabled: true,
  availability: "available",
  conversations: [
    {
      conversationSlugId: "conversation-one",
      conversationTitle: "Conversation One",
      state: "enabled",
      resolvedEnabled: true,
      availability: "available",
    },
  ],
} satisfies ConversationEmailUpdatePreferenceGroup;

const noProjectGroup = {
  kind: "no_project",
  availability: "available",
  conversations: [
    {
      conversationSlugId: "conversation-two",
      conversationTitle: "Conversation Two",
      state: "enabled",
      resolvedEnabled: true,
      availability: "available",
    },
  ],
} satisfies ConversationEmailUpdatePreferenceGroup;

const pausedProjectGroup = {
  ...projectGroup,
  resolvedEnabled: false,
  conversations: projectGroup.conversations.map((conversation) => ({
    ...conversation,
    resolvedEnabled: false,
  })),
} satisfies ConversationEmailUpdatePreferenceGroup;

const pausedNoProjectGroup = {
  ...noProjectGroup,
  conversations: noProjectGroup.conversations.map((conversation) => ({
    ...conversation,
    resolvedEnabled: false,
  })),
} satisfies ConversationEmailUpdatePreferenceGroup;

const mountedApps: App[] = [];
const QInputStub = defineComponent({
  name: "QInput",
  props: { modelValue: { type: String, required: true } },
  emits: ["update:modelValue"],
  setup(_props, { emit }) {
    return () =>
      h("input", {
        "aria-label": "Search projects and conversations",
        onInput(event: Event) {
          if (event.target instanceof HTMLInputElement) {
            emit("update:modelValue", event.target.value);
          }
        },
      });
  },
});

beforeEach(() => {
  api.getPreferences.mockReset();
  api.updatePreference.mockReset();
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdatePreferenceSettings", () => {
  it("refreshes every loaded page after changing the global pause", async () => {
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup],
        nextCursor: "project:project-one",
      })
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [noProjectGroup],
        nextCursor: "no-project",
      })
      .mockResolvedValueOnce({
        success: true,
        globalPaused: true,
        groups: [pausedProjectGroup],
        nextCursor: "project:project-one",
      })
      .mockResolvedValueOnce({
        success: true,
        globalPaused: true,
        groups: [pausedNoProjectGroup],
        nextCursor: "no-project",
      });
    api.updatePreference.mockResolvedValue({
      success: true,
      result: { operation: "set_global_pause", globalPaused: true },
    });

    const container = mountComponent();
    await flushPromises();

    getButton(container, "Load more").click();
    await flushPromises();

    getButton(container, "Pause all Email Updates").click();
    await flushPromises();

    expect(api.updatePreference).toHaveBeenCalledWith({
      operation: "set_global_pause",
      paused: true,
    });
    expect(api.getPreferences).toHaveBeenCalledTimes(4);
    expect(api.getPreferences).toHaveBeenNthCalledWith(4, {
      search: undefined,
      cursor: "project:project-one",
      limit: 20,
    });
    expect(
      getButton(container, "Receive Email Updates for Project One").dataset
        .enabled
    ).toBe("true");
    expect(
      getButton(container, "Receive Email Updates for Conversation Two").dataset
        .enabled
    ).toBe("true");
    expect(getButton(container, "Load more")).toBeDefined();
  });

  it("drops a stale load-more response after a refresh", async () => {
    const stalePage = deferred<{
      success: true;
      globalPaused: false;
      groups: ConversationEmailUpdatePreferenceGroup[];
      nextCursor: undefined;
    }>();
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup],
        nextCursor: "project:project-one",
      })
      .mockReturnValueOnce(stalePage.promise)
      .mockResolvedValueOnce({
        success: true,
        globalPaused: true,
        groups: [pausedProjectGroup],
        nextCursor: undefined,
      });
    api.updatePreference.mockResolvedValue({
      success: true,
      result: { operation: "set_global_pause", globalPaused: true },
    });

    const container = mountComponent();
    await flushPromises();

    getButton(container, "Load more").click();
    getButton(container, "Pause all Email Updates").click();
    await flushPromises();

    stalePage.resolve({
      success: true,
      globalPaused: false,
      groups: [noProjectGroup],
      nextCursor: undefined,
    });
    await flushPromises();

    expect(container.textContent).not.toContain("Conversation Two");
    expect(
      getButton(container, "Receive Email Updates for Project One").dataset
        .enabled
    ).toBe("true");
  });

  it("drops a stale load-more response after the search changes", async () => {
    const stalePage = deferred<{
      success: true;
      globalPaused: false;
      groups: ConversationEmailUpdatePreferenceGroup[];
      nextCursor: undefined;
    }>();
    const searchResult = {
      ...noProjectGroup,
      conversations: [
        {
          ...noProjectGroup.conversations[0],
          conversationSlugId: "search-result",
          conversationTitle: "Search Result",
        },
      ],
    } satisfies ConversationEmailUpdatePreferenceGroup;
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup],
        nextCursor: "project:project-one",
      })
      .mockReturnValueOnce(stalePage.promise)
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [searchResult],
        nextCursor: undefined,
      });

    const container = mountComponent();
    await flushPromises();

    getButton(container, "Load more").click();
    const searchInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="Search projects and conversations"]'
    );
    if (searchInput === null) {
      throw new Error("Search input not found");
    }
    searchInput.value = "Search";
    searchInput.dispatchEvent(new Event("input"));
    await flushPromises();

    stalePage.resolve({
      success: true,
      globalPaused: false,
      groups: [noProjectGroup],
      nextCursor: undefined,
    });
    await flushPromises();

    expect(api.getPreferences).toHaveBeenNthCalledWith(3, {
      search: "Search",
      limit: 20,
    });
    expect(container.textContent).toContain("Search Result");
    expect(container.textContent).not.toContain("Conversation Two");
  });

  it("does not roll back another successful overlapping preference write", async () => {
    const projectWrite = deferred<{
      success: false;
      reason: "preference_conflict";
    }>();
    const conversationWrite = deferred<{
      success: true;
      result: {
        operation: "set_conversation_preference";
        conversationPreferences: Array<{
          conversationSlugId: string;
          state: "disabled";
        }>;
      };
    }>();
    const disabledConversationGroup = {
      ...noProjectGroup,
      conversations: noProjectGroup.conversations.map((conversation) => ({
        ...conversation,
        state: "disabled" as const,
        resolvedEnabled: false,
      })),
    } satisfies ConversationEmailUpdatePreferenceGroup;
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup, noProjectGroup],
        nextCursor: undefined,
      })
      .mockResolvedValue({
        success: true,
        globalPaused: false,
        groups: [projectGroup, disabledConversationGroup],
        nextCursor: undefined,
      });
    api.updatePreference
      .mockReturnValueOnce(projectWrite.promise)
      .mockReturnValueOnce(conversationWrite.promise);

    const container = mountComponent();
    await flushPromises();

    getButton(container, "Receive Email Updates for Project One").click();
    getButton(container, "Receive Email Updates for Conversation Two").click();

    conversationWrite.resolve({
      success: true,
      result: {
        operation: "set_conversation_preference",
        conversationPreferences: [
          { conversationSlugId: "conversation-two", state: "disabled" },
        ],
      },
    });
    await flushPromises();
    projectWrite.resolve({
      success: false,
      reason: "preference_conflict",
    });
    await flushPromises();

    expect(
      getButton(container, "Receive Email Updates for Project One").dataset
        .enabled
    ).toBe("true");
    expect(
      getButton(container, "Receive Email Updates for Conversation Two").dataset
        .enabled
    ).toBe("false");
  });
});

function mountComponent(): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(ConversationUpdatePreferenceSettings);
  app.component("QInput", QInputStub);
  mountedApps.push(app);
  app.mount(container);
  return container;
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) =>
      candidate.textContent === label ||
      candidate.getAttribute("aria-label") === label
  );
  if (button === undefined) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value) {
      resolvePromise?.(value);
    },
  };
}
