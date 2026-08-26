import type {
  ConversationEmailUpdatePreferenceFocus,
  ConversationEmailUpdatePreferenceGroup,
} from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick } from "vue";
import { createI18n } from "vue-i18n";

const api = vi.hoisted(() => ({
  getPreferenceConversations: vi.fn(),
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
    setup(props, { slots }) {
      return () => h("a", { href: props.to }, slots.default?.());
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
      preferenceKind: "explicit",
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
      preferenceKind: "explicit",
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
      preferenceKind: "explicit",
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
  api.getPreferenceConversations.mockReset();
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
  it("requests an exact conversation focus", async () => {
    api.getPreferences.mockResolvedValue({
      success: true,
      globalPaused: false,
      groups: [projectGroup],
      nextCursor: undefined,
    });

    mountComponent({
      initialFocus: {
        kind: "conversation",
        conversationSlugId: "conversation-one",
      },
      initialSearch: "ignored search",
    });
    await flushPromises();

    expect(api.getPreferences).toHaveBeenCalledWith({
      mode: "focus",
      focus: {
        kind: "conversation",
        conversationSlugId: "conversation-one",
      },
    });
  });

  it("uses a blocking retry state when the initial load fails", async () => {
    api.getPreferences.mockResolvedValue({
      success: false,
      reason: "preferences_unavailable",
    });

    const container = mountComponent();
    await flushPromises();

    expect(container.textContent).toContain("Error");
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });

  it("shows a retry state when a changed query fails", async () => {
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup],
        nextCursor: undefined,
      })
      .mockResolvedValueOnce({
        success: false,
        reason: "preferences_unavailable",
      });

    const container = mountComponent();
    await flushPromises();
    const searchInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="Search projects and conversations"]'
    );
    if (searchInput === null) {
      throw new Error("Search input not found");
    }
    searchInput.value = "Project";
    searchInput.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(container.textContent).toContain("Error");
    expect(container.textContent).not.toContain("Project One");
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });

  it("disables stale pagination and mutations while a changed query loads", async () => {
    const searchPage = deferred<{
      success: true;
      globalPaused: false;
      groups: ConversationEmailUpdatePreferenceGroup[];
      nextCursor: undefined;
    }>();
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [
          { ...projectGroup, conversationNextCursor: "conversation-cursor" },
        ],
        nextCursor: "group-cursor",
      })
      .mockReturnValueOnce(searchPage.promise);

    const container = mountComponent();
    await flushPromises();
    const searchInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="Search projects and conversations"]'
    );
    if (searchInput === null) {
      throw new Error("Search input not found");
    }
    searchInput.value = "Project";
    searchInput.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(container.textContent).not.toContain("Load more");
    expect(container.textContent).not.toContain("Show more");
    expect(getButton(container, "Receive Email Updates").disabled).toBe(true);
    expect(
      getButton(container, "Email Updates by default for Project One").disabled
    ).toBe(true);

    searchPage.resolve({
      success: true,
      globalPaused: false,
      groups: [projectGroup],
      nextCursor: undefined,
    });
    await flushPromises();
  });

  it("offers an inline retry when loading another group page fails", async () => {
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup],
        nextCursor: "opaque-group-cursor",
      })
      .mockResolvedValueOnce({
        success: false,
        reason: "preferences_unavailable",
      })
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [noProjectGroup],
        nextCursor: undefined,
      });

    const container = mountComponent();
    await flushPromises();
    getButton(container, "Load more").click();
    await flushPromises();

    expect(container.textContent).toContain(
      "Email Update preferences are unavailable right now."
    );
    getButton(container, "Try again").click();
    await flushPromises();

    expect(container.textContent).toContain("Conversation Two");
    expect(container.textContent).not.toContain(
      "Email Update preferences are unavailable right now."
    );
  });

  it("appends a backend-authorized conversation page within its group", async () => {
    api.getPreferences.mockResolvedValue({
      success: true,
      globalPaused: false,
      groups: [
        {
          ...projectGroup,
          conversationNextCursor: "opaque-conversation-cursor",
        },
      ],
      nextCursor: undefined,
    });
    api.getPreferenceConversations.mockResolvedValue({
      success: true,
      conversations: [
        {
          conversationSlugId: "conversation-next",
          conversationTitle: "Conversation Next",
          preferenceKind: "project_inherited",
          state: "undisclosed",
          resolvedEnabled: true,
          availability: "available",
        },
      ],
      nextCursor: undefined,
    });

    const container = mountComponent();
    await flushPromises();
    getButton(container, "Show more").click();
    await flushPromises();

    expect(api.getPreferenceConversations).toHaveBeenCalledWith({
      scope: { kind: "project", projectSlug: "project-one" },
      search: undefined,
      cursor: "opaque-conversation-cursor",
    });
    expect(container.textContent).toContain("Conversation Next");
    expect(container.textContent).toContain("Inherited from project");
    expect(container.textContent).not.toContain("Show more");
  });

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
      "You’ll receive updates from your selected projects and conversations."
    );
    expect(getButton(container, "Receive Email Updates").dataset.enabled).toBe(
      "true"
    );
    expect(container.textContent).not.toContain("On for this project");
    expect(container.textContent).not.toContain("On for this conversation");
    expect(container.textContent).toContain("Conversation One");
    expect(container.textContent).toContain("Conversation Two");

    const noProjectHeader = [
      ...container.querySelectorAll(".expansion-item__header"),
    ].find((header) => header.textContent?.includes("No Project") === true);
    expect(noProjectHeader).toBeDefined();
    expect(container.querySelectorAll("h2")).toHaveLength(0);
    const noProjectConversationLink = [
      ...container.querySelectorAll<HTMLAnchorElement>("a"),
    ].find((link) => link.textContent === "Conversation Two");
    expect(noProjectConversationLink?.getAttribute("href")).toBe(
      "/conversation/conversation-two"
    );
    expect(noProjectConversationLink?.getAttribute("target")).toBeNull();
    expect(noProjectConversationLink?.classList).toContain(
      "conversation-preference-row__link"
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
        nextCursor: "opaque-group-cursor",
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

    getButton(container, "Receive Email Updates").click();
    await flushPromises();

    expect(api.updatePreference).toHaveBeenCalledWith({
      operation: "set_global_pause",
      paused: true,
    });
    expect(api.getPreferences).toHaveBeenCalledTimes(2);
    expect(api.getPreferences).toHaveBeenNthCalledWith(2, {
      mode: "browse",
      search: undefined,
      cursor: "opaque-group-cursor",
      limit: 20,
    });
    expect(
      getButton(container, "Email Updates by default for Project One").dataset
        .enabled
    ).toBe("true");
    expect(
      getButton(container, "Receive Email Updates for Conversation Two").dataset
        .enabled
    ).toBe("true");
    expect(getButton(container, "Receive Email Updates").dataset.enabled).toBe(
      "false"
    );
    expect(getButton(container, "Load more")).toBeDefined();
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });

  it("shows paused delivery as off and turns it back on", async () => {
    api.getPreferences.mockResolvedValue({
      success: true,
      globalPaused: true,
      groups: [projectGroup],
      nextCursor: undefined,
    });
    api.updatePreference.mockResolvedValue({
      success: true,
      result: { operation: "set_global_pause", globalPaused: false },
    });

    const container = mountComponent();
    await flushPromises();

    const globalSwitch = getButton(container, "Receive Email Updates");
    expect(globalSwitch.dataset.enabled).toBe("false");
    expect(container.textContent).toContain(
      "All Email Updates are paused. Your project and conversation choices stay saved."
    );

    globalSwitch.click();
    await flushPromises();

    expect(api.updatePreference).toHaveBeenCalledWith({
      operation: "set_global_pause",
      paused: false,
    });
    expect(globalSwitch.dataset.enabled).toBe("true");
    expect(container.textContent).toContain(
      "You’ll receive updates from your selected projects and conversations."
    );
    expect(showNotifyMessage).not.toHaveBeenCalled();
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
    getButton(container, "Email Updates by default for Project One").click();
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
      "Email Updates by default for Project One"
    );
    projectSwitch.click();
    await flushPromises();

    expect(projectSwitch.dataset.enabled).toBe("false");
    expect(projectSwitch.disabled).toBe(true);
    expect(getButton(container, "Receive Email Updates").disabled).toBe(true);
    expect(
      getButton(container, "Receive Email Updates for Conversation Two")
        .disabled
    ).toBe(true);

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

  it("reconciles an unexpected successful mutation response", async () => {
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup],
        nextCursor: undefined,
      })
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [disabledProjectGroup],
        nextCursor: undefined,
      });
    api.updatePreference.mockResolvedValue({
      success: true,
      result: { operation: "set_global_pause", globalPaused: false },
    });

    const container = mountComponent();
    await flushPromises();
    getButton(container, "Email Updates by default for Project One").click();
    await flushPromises();

    expect(api.getPreferences).toHaveBeenCalledTimes(2);
    expect(
      getButton(container, "Email Updates by default for Project One").dataset
        .enabled
    ).toBe("false");
    expect(showNotifyMessage).toHaveBeenCalledWith(
      "Couldn’t save your email update preference."
    );
  });

  it("keeps an uncertain mutation blocked when reconciliation fails", async () => {
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [projectGroup],
        nextCursor: undefined,
      })
      .mockResolvedValueOnce({
        success: false,
        reason: "preferences_unavailable",
      });
    api.updatePreference.mockResolvedValue({
      success: true,
      result: { operation: "set_global_pause", globalPaused: false },
    });

    const container = mountComponent();
    await flushPromises();
    getButton(container, "Email Updates by default for Project One").click();
    await flushPromises();

    expect(api.getPreferences).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Error");
    expect(container.textContent).not.toContain("Project One");
    expect(showNotifyMessage).toHaveBeenCalledTimes(1);
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
        nextCursor: "opaque-group-cursor",
      })
      .mockReturnValueOnce(stalePage.promise);
    api.updatePreference.mockResolvedValue({
      success: true,
      result: { operation: "set_global_pause", globalPaused: true },
    });

    const container = mountComponent();
    await flushPromises();

    getButton(container, "Load more").click();
    getButton(container, "Receive Email Updates").click();
    await flushPromises();

    stalePage.resolve({
      success: true,
      globalPaused: false,
      groups: [noProjectGroup],
      nextCursor: undefined,
    });
    await flushPromises();

    expect(container.textContent).toContain("Conversation Two");
    expect(getButton(container, "Receive Email Updates").dataset.enabled).toBe(
      "false"
    );
    expect(
      getButton(container, "Email Updates by default for Project One").dataset
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
      mode: "browse",
      search: "Search",
      limit: 20,
    });
    expect(container.textContent).toContain("Search Result");
    expect(container.textContent).not.toContain("Conversation Two");
  });

  it("keeps a newer conversation page locked when a stale request finishes", async () => {
    const stalePage = deferred<{
      success: true;
      conversations: typeof projectGroup.conversations;
      nextCursor: undefined;
    }>();
    const currentPage = deferred<{
      success: true;
      conversations: typeof projectGroup.conversations;
      nextCursor: undefined;
    }>();
    api.getPreferences
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [
          { ...projectGroup, conversationNextCursor: "stale-conversation-cursor" },
        ],
        nextCursor: undefined,
      })
      .mockResolvedValueOnce({
        success: true,
        globalPaused: false,
        groups: [
          {
            ...projectGroup,
            conversationNextCursor: "current-conversation-cursor",
          },
        ],
        nextCursor: undefined,
      });
    api.getPreferenceConversations
      .mockReturnValueOnce(stalePage.promise)
      .mockReturnValueOnce(currentPage.promise);

    const container = mountComponent();
    await flushPromises();
    getButton(container, "Show more").click();

    const searchInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="Search projects and conversations"]'
    );
    if (searchInput === null) {
      throw new Error("Search input not found");
    }
    searchInput.value = "Project";
    searchInput.dispatchEvent(new Event("input"));
    await flushPromises();
    getButton(container, "Show more").click();

    stalePage.resolve({
      success: true,
      conversations: projectGroup.conversations,
      nextCursor: undefined,
    });
    await flushPromises();

    expect(
      [...container.querySelectorAll("button")].some(
        (button) => button.textContent === "Show more"
      )
    ).toBe(false);

    currentPage.resolve({
      success: true,
      conversations: [
        {
          ...projectGroup.conversations[0],
          conversationSlugId: "current-conversation",
          conversationTitle: "Current Conversation",
        },
      ],
      nextCursor: undefined,
    });
    await flushPromises();
    expect(container.textContent).toContain("Current Conversation");
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

    getButton(container, "Email Updates by default for Project One").click();
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
      getButton(container, "Email Updates by default for Project One").dataset
        .enabled
    ).toBe("false");
  });

  it("serializes writes that can change the effective preference hierarchy", async () => {
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
          preferenceKind: "explicit",
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

    getButton(container, "Email Updates by default for Project One").click();
    getButton(container, "Receive Email Updates for Conversation Two").click();
    await flushPromises();

    expect(api.updatePreference).toHaveBeenCalledTimes(1);
    expect(
      getButton(container, "Email Updates by default for Project One").disabled
    ).toBe(true);
    expect(
      getButton(container, "Receive Email Updates for Conversation Two")
        .disabled
    ).toBe(true);
    expect(getButton(container, "Receive Email Updates").disabled).toBe(true);

    projectWrite.resolve({
      success: false,
      reason: "feature_not_available",
    });
    await flushPromises();

    getButton(container, "Receive Email Updates for Conversation Two").click();
    await flushPromises();
    expect(api.updatePreference).toHaveBeenCalledTimes(2);

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
      getButton(container, "Email Updates by default for Project One").dataset
        .enabled
    ).toBe("true");
    expect(
      getButton(container, "Receive Email Updates for Conversation Two").dataset
        .enabled
    ).toBe("false");
    expect(showNotifyMessage).toHaveBeenCalledWith(
      "Couldn’t save your email update preference."
    );
  });

  it("blocks all overlapping preference writes", async () => {
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
      getButton(container, "Receive Email Updates"),
      getButton(container, "Email Updates by default for Project One"),
      getButton(container, "Receive Email Updates for Conversation Two"),
    ];
    for (const preferenceSwitch of switches) {
      preferenceSwitch.click();
      preferenceSwitch.dispatchEvent(new MouseEvent("click"));
    }
    await nextTick();

    expect(api.updatePreference).toHaveBeenCalledTimes(1);
    expect(api.updatePreference).toHaveBeenNthCalledWith(1, {
      operation: "set_global_pause",
      paused: true,
    });
    expect(
      switches.every((preferenceSwitch) => preferenceSwitch.disabled)
    ).toBe(true);
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });
});

function mountComponent({
  initialFocus = undefined,
  initialSearch = undefined,
}: {
  initialFocus?: ConversationEmailUpdatePreferenceFocus;
  initialSearch?: string;
} = {}): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(ConversationUpdatePreferenceSettings, {
    initialFocus,
    initialSearch,
  });
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
