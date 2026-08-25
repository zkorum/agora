import type { ConversationEmailUpdatePreferenceGroup } from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick } from "vue";
import { createI18n } from "vue-i18n";

const api = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  updatePreference: vi.fn(),
}));
const showNotifyMessage = vi.hoisted(() => vi.fn());

vi.mock(
  "src/utils/api/conversationUpdates/useConversationEmailUpdateQueries",
  () => ({ useRemoveConversationEmailUpdateSummaryQueries: () => () => {} })
);

vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => api,
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage }),
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

const disabledProjectGroup = {
  ...projectGroup,
  state: "disabled",
  resolvedEnabled: false,
} satisfies ConversationEmailUpdatePreferenceGroup;

const disabledNoProjectGroup = {
  kind: "no_project",
  availability: "available",
  conversations: [
    {
      conversationSlugId: "conversation-two",
      conversationTitle: "Conversation Two",
      state: "disabled",
      resolvedEnabled: false,
      availability: "available",
    },
  ],
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
const QExpansionItemStub = defineComponent({
  name: "QExpansionItem",
  props: { modelValue: { type: Boolean, required: true } },
  emits: ["update:modelValue"],
  setup(props, { emit, slots }) {
    return () =>
      h("section", { class: "expansion-item" }, [
        h(
          "div",
          {
            class: "expansion-item__header",
            onClick: () => emit("update:modelValue", !props.modelValue),
          },
          slots.header?.()
        ),
        props.modelValue
          ? h("div", { class: "expansion-item__content" }, slots.default?.())
          : null,
      ]);
  },
});

beforeEach(() => {
  api.getPreferences.mockReset();
  api.updatePreference.mockReset();
  showNotifyMessage.mockReset();
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdatePreferenceSettings", () => {
  it("auto-expands small projects without redundant descriptions", async () => {
    api.getPreferences.mockResolvedValue({
      success: true,
      globalPaused: false,
      groups: [projectGroup, noProjectGroup],
      nextCursor: undefined,
    });

    const container = mountComponent();
    await flushPromises();

    expect(container.textContent).toContain(
      "Your project and conversation choices stay saved."
    );
    expect(container.textContent).not.toContain("On for this project");
    expect(container.textContent).not.toContain("On for this conversation");
    expect(container.textContent).toContain("Conversation One");
    expect(container.textContent).toContain("Conversation Two");

    const noProjectHeading = [...container.querySelectorAll("h2")].find(
      (heading) => heading.textContent === "No Project"
    );
    expect(noProjectHeading?.closest("section")?.textContent).toContain(
      "Conversation Two"
    );
  });

  it("keeps projects with more than five conversations collapsed", async () => {
    const largeProjectGroup = {
      ...projectGroup,
      conversations: Array.from({ length: 6 }, (_, index) => ({
        ...projectGroup.conversations[0],
        conversationSlugId: `conversation-${String(index + 1)}`,
        conversationTitle: `Conversation ${String(index + 1)}`,
      })),
    } satisfies ConversationEmailUpdatePreferenceGroup;
    api.getPreferences.mockResolvedValue({
      success: true,
      globalPaused: false,
      groups: [largeProjectGroup],
      nextCursor: undefined,
    });

    const container = mountComponent();
    await flushPromises();

    expect(container.textContent).not.toContain("Conversation 1");

    const projectHeader = container.querySelector<HTMLElement>(
      ".expansion-item__header"
    );
    if (projectHeader === null) {
      throw new Error("Project expansion header not found");
    }
    projectHeader.click();
    await nextTick();

    expect(container.textContent).toContain("Conversation 1");
  });

  it("applies global pause without rereading loaded pages", async () => {
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
    expect(api.getPreferences).toHaveBeenCalledTimes(2);
    expect(api.getPreferences).toHaveBeenNthCalledWith(2, {
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
    expect(
      getButton(container, "Pause all Email Updates").dataset.enabled
    ).toBe("true");
    expect(getButton(container, "Load more")).toBeDefined();
    expect(showNotifyMessage).toHaveBeenCalledWith("Email Updates paused.");
  });

  it("reports when a project opt-in resumes global Email Updates", async () => {
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: true,
        groups: [disabledProjectGroup],
        nextCursor: undefined,
      })
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup],
        nextCursor: undefined,
      });
    api.updatePreference.mockResolvedValue({
      success: true,
      result: {
        operation: "set_project_preference",
        projectSlug: "project-one",
        state: "enabled",
        globalResumed: true,
      },
    });

    const container = mountComponent();
    await flushPromises();
    getButton(container, "Receive Email Updates for Project One").click();
    await flushPromises();

    expect(showNotifyMessage).toHaveBeenCalledWith(
      "Email Updates were turned back on globally, and your preference was saved."
    );
  });

  it("reports when a conversation opt-in resumes global Email Updates", async () => {
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: true,
        groups: [disabledNoProjectGroup],
        nextCursor: undefined,
      })
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [noProjectGroup],
        nextCursor: undefined,
      });
    api.updatePreference.mockResolvedValue({
      success: true,
      result: {
        operation: "set_conversation_preference",
        globalResumed: true,
        conversationPreferences: [
          {
            conversationSlugId: "conversation-two",
            state: "enabled",
            resolvedEnabled: true,
          },
        ],
      },
    });

    const container = mountComponent();
    await flushPromises();
    getButton(container, "Receive Email Updates for Conversation Two").click();
    await flushPromises();

    expect(showNotifyMessage).toHaveBeenCalledWith(
      "Email Updates were turned back on globally, and your preference was saved."
    );
  });

  it("rolls back a failed preference and shows the localized error", async () => {
    const projectWrite = deferred<{
      success: false;
      reason: "feature_not_available";
    }>();
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup, noProjectGroup],
        nextCursor: undefined,
      })
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup, noProjectGroup],
        nextCursor: undefined,
      });
    api.updatePreference.mockReturnValueOnce(projectWrite.promise);

    const container = mountComponent();
    await flushPromises();

    const projectSwitch = getButton(
      container,
      "Receive Email Updates for Project One"
    );
    projectSwitch.click();
    await flushPromises();

    expect(projectSwitch.dataset.enabled).toBe("false");
    expect(projectSwitch.disabled).toBe(true);
    expect(getButton(container, "Pause all Email Updates").disabled).toBe(
      false
    );
    expect(
      getButton(container, "Receive Email Updates for Conversation Two")
        .disabled
    ).toBe(false);

    projectWrite.resolve({
      success: false,
      reason: "feature_not_available",
    });
    await flushPromises();

    expect(projectSwitch.dataset.enabled).toBe("true");
    expect(projectSwitch.disabled).toBe(false);
    expect(showNotifyMessage).toHaveBeenCalledWith(
      "Couldn’t save your email update preference."
    );
  });

  it("preserves a confirmed mutation over an in-flight stale page", async () => {
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
      .mockReturnValueOnce(stalePage.promise);
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

    expect(container.textContent).toContain("Conversation Two");
    expect(
      getButton(container, "Pause all Email Updates").dataset.enabled
    ).toBe("true");
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

  it("finishes search loading without losing a concurrent mutation", async () => {
    const searchLoad = deferred<{
      success: true;
      globalPaused: false;
      groups: ConversationEmailUpdatePreferenceGroup[];
      nextCursor: undefined;
    }>();
    const projectWrite = deferred<{
      success: true;
      result: {
        operation: "set_project_preference";
        projectSlug: string;
        state: "disabled";
        globalResumed: false;
      };
    }>();
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup],
        nextCursor: undefined,
      })
      .mockReturnValueOnce(searchLoad.promise);
    api.updatePreference.mockReturnValueOnce(projectWrite.promise);

    const container = mountComponent();
    await flushPromises();

    getButton(container, "Receive Email Updates for Project One").click();
    const searchInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="Search projects and conversations"]'
    );
    if (searchInput === null) {
      throw new Error("Search input not found");
    }
    searchInput.value = "Project";
    searchInput.dispatchEvent(new Event("input"));
    await flushPromises();

    projectWrite.resolve({
      success: true,
      result: {
        operation: "set_project_preference",
        projectSlug: "project-one",
        state: "disabled",
        globalResumed: false,
      },
    });
    await flushPromises();
    searchLoad.resolve({
      success: true,
      globalPaused: false,
      groups: [projectGroup],
      nextCursor: undefined,
    });
    await flushPromises();

    expect(container.textContent).not.toContain("Loading");
    expect(
      getButton(container, "Receive Email Updates for Project One").dataset
        .enabled
    ).toBe("false");
  });

  it("does not roll back another successful overlapping preference write", async () => {
    const projectWrite = deferred<{
      success: false;
      reason: "feature_not_available";
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
      kind: "no_project",
      availability: "available",
      conversations: [
        {
          conversationSlugId: "conversation-two",
          conversationTitle: "Conversation Two",
          state: "disabled",
          resolvedEnabled: false,
          availability: "available",
        },
      ],
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
    await flushPromises();

    expect(
      getButton(container, "Receive Email Updates for Project One").disabled
    ).toBe(true);
    expect(
      getButton(container, "Receive Email Updates for Conversation Two")
        .disabled
    ).toBe(true);
    expect(getButton(container, "Pause all Email Updates").disabled).toBe(
      false
    );

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

    expect(
      getButton(container, "Receive Email Updates for Project One").disabled
    ).toBe(true);
    expect(
      getButton(container, "Receive Email Updates for Conversation Two")
        .disabled
    ).toBe(false);

    projectWrite.resolve({
      success: false,
      reason: "feature_not_available",
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
    expect(showNotifyMessage).toHaveBeenCalledWith(
      "Email update preference saved: off."
    );
    expect(showNotifyMessage).toHaveBeenCalledWith(
      "Couldn’t save your email update preference."
    );
  });

  it("blocks overlapping writes for the same preference key", async () => {
    api.getPreferences.mockResolvedValue({
      success: true,
      globalPaused: false,
      groups: [projectGroup, noProjectGroup],
      nextCursor: undefined,
    });
    api.updatePreference.mockReturnValue(new Promise(() => undefined));

    const container = mountComponent();
    await flushPromises();

    const switches = [
      getButton(container, "Pause all Email Updates"),
      getButton(container, "Receive Email Updates for Project One"),
      getButton(container, "Receive Email Updates for Conversation Two"),
    ];
    for (const preferenceSwitch of switches) {
      preferenceSwitch.click();
      preferenceSwitch.dispatchEvent(new MouseEvent("click"));
    }
    await nextTick();

    expect(api.updatePreference).toHaveBeenCalledTimes(3);
    expect(api.updatePreference).toHaveBeenNthCalledWith(1, {
      operation: "set_global_pause",
      paused: true,
    });
    expect(api.updatePreference).toHaveBeenNthCalledWith(2, {
      operation: "set_project_preference",
      projectSlug: "project-one",
      enabled: false,
      source: { kind: "settings" },
    });
    expect(api.updatePreference).toHaveBeenNthCalledWith(3, {
      operation: "set_conversation_preference",
      conversationSlugId: "conversation-two",
      enabled: false,
      source: "settings",
    });
    expect(
      switches.every((preferenceSwitch) => preferenceSwitch.disabled)
    ).toBe(true);
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });
});

function mountComponent(): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(ConversationUpdatePreferenceSettings);
  app.use(
    createI18n({
      legacy: false,
      locale: "en",
      messages: {},
    })
  );
  app.component("QInput", QInputStub);
  app.component("QExpansionItem", QExpansionItemStub);
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
