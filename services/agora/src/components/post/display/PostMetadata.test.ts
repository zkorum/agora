import type {
  ContentAction,
  ContentActionContext,
} from "src/utils/actions/core/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";
import { z } from "zod";

const api = vi.hoisted(() => ({
  getConversationSummary: vi.fn(),
  updatePreference: vi.fn(),
}));
const showNotifyMessage = vi.hoisted(() => vi.fn());
const routerPush = vi.hoisted(() => vi.fn());
const removeSummaryQueries = vi.hoisted(() => vi.fn());

vi.mock(
  "src/utils/api/conversationUpdates/useConversationEmailUpdateQueries",
  () => ({
    useRemoveConversationEmailUpdateSummaryQueries: () => removeSummaryQueries,
  })
);

vi.mock("pinia", () => ({
  storeToRefs: (store: object) => store,
}));

vi.mock("quasar", () => ({
  copyToClipboard: vi.fn(),
  useQuasar: () => ({ dialog: vi.fn() }),
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
  useNotify: () => ({
    showNotifyMessage,
    showCopiedToClipboard: vi.fn(),
  }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({
    name: "conversation",
    path: "/conversation",
    fullPath: "/conversation",
  }),
  useRouter: () => ({
    push: routerPush,
    resolve: (to: object) => ({ href: JSON.stringify(to) }),
  }),
}));

vi.mock("src/utils/actions/definitions/content-actions", () => ({
  useContentActions: () => {
    const context: ContentActionContext = {
      isOwner: false,
      isSiteModerator: false,
      isConversationOwner: false,
      isOrgMember: false,
      isLoggedIn: true,
      isEmbeddedMode: false,
      targetType: "post",
      targetId: "conversation-one",
      targetAuthor: "owner",
    };
    const dialogState = ref<{
      isVisible: boolean;
      context: ContentActionContext | null;
      actions: ContentAction[];
    }>({
      isVisible: false,
      context: null,
      actions: [],
    });
    return {
      dialogState,
      confirmationState: ref({
        isVisible: false,
        message: "",
        confirmText: "",
        cancelText: "",
        variant: "default",
      }),
      showPostActions: () => {
        dialogState.value = {
          isVisible: true,
          context,
          actions: [],
        };
      },
      executeAction: async (action: ContentAction) => {
        if (action.handler !== undefined) {
          await action.handler(context);
        }
      },
      closeDialog: () => {
        dialogState.value = {
          isVisible: false,
          context: null,
          actions: [],
        };
      },
      handleConfirmation: vi.fn(),
      handleConfirmationCancel: vi.fn(),
    };
  },
}));

vi.mock("src/composables/share/useShareActions", () => ({
  useShareActions: () => ({
    dialogState: ref({ isVisible: false, context: null, actions: [] }),
    showShareActions: vi.fn(),
    executeAction: vi.fn(),
    closeDialog: vi.fn(),
  }),
}));

vi.mock("src/composables/auth/useConversationLoginIntentions", () => ({
  useConversationLoginIntentions: () => ({ setReportIntention: vi.fn() }),
}));

vi.mock("src/utils/ui/embedMode", () => ({
  useEmbedMode: () => ({ isEmbeddedMode: () => false }),
}));

vi.mock("src/utils/api/maxdiff/maxdiff", () => ({
  useMaxDiffApi: () => ({ syncMaxDiff: vi.fn() }),
}));

vi.mock("src/utils/api/muteUser", () => ({
  useBackendUserMuteApi: () => ({ muteUser: vi.fn() }),
}));

vi.mock("src/utils/api/post/useConversationMutations", () => ({
  useCloseConversationMutation: () => ({ mutate: vi.fn() }),
  useOpenConversationMutation: () => ({ mutate: vi.fn() }),
}));

vi.mock("src/utils/api/post/useFeedQuery", () => ({
  useInvalidateFeedQuery: () => ({ invalidateFeed: vi.fn() }),
}));

vi.mock("src/utils/url/conversationUrl", () => ({
  useConversationUrl: () => ({
    getEmbedUrl: vi.fn(),
    getConversationUrl: vi.fn(),
  }),
}));

vi.mock(
  "src/components/authentication/intention/PreParticipationIntentionDialog.vue",
  () => ({ default: defineComponent(() => () => null) })
);

vi.mock("src/components/features/user/UserIdentityCard.vue", () => ({
  default: defineComponent(() => () => null),
}));

vi.mock("src/components/report/ReportContentDialog.vue", () => ({
  default: defineComponent(() => () => null),
}));

vi.mock("src/components/ui-library/ZKConfirmDialog.vue", () => ({
  default: defineComponent(() => () => null),
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
    },
    emits: ["update:modelValue", "actionSelected", "dialogClosed"],
    setup(props, { emit }) {
      return () => {
        if (!props.modelValue) {
          return null;
        }
        const actions = z.array(testActionSchema).parse(props.actions);
        return h(
          "div",
          { "data-testid": "action-drawer" },
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

import PostMetadata from "./PostMetadata.vue";

const mountedApps: App[] = [];

beforeEach(() => {
  api.getConversationSummary.mockReset();
  api.updatePreference.mockReset();
  showNotifyMessage.mockReset();
  routerPush.mockReset();
  removeSummaryQueries.mockReset();
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("PostMetadata email update actions", () => {
  it.each([
    ["compose", "manageEmailUpdatesLabel"],
    ["history", "viewEmailUpdateHistoryLabel"],
  ])(
    "shows the %s author action and participant action",
    async (authoringAction, label) => {
      api.getConversationSummary.mockResolvedValue({
        success: true,
        authoringAction,
        participantPreference: {
          state: "undisclosed",
          resolvedEnabled: true,
        },
      });

      const container = mountMetadata();
      getMenuButton(container).click();
      await flushPromises();

      expect(getButton(container, label).textContent).toBe(label);
      expect(
        getButton(container, "receiveEmailUpdatesLabel").dataset.checked
      ).toBe("true");
      expect(
        container.querySelectorAll('[data-testid="action-drawer"] button')
      ).toHaveLength(3);
    }
  );

  it("hides participant actions when the summary has no preference", async () => {
    api.getConversationSummary.mockResolvedValue({
      success: true,
      authoringAction: "compose",
    });

    const container = mountMetadata();
    getMenuButton(container).click();
    await flushPromises();

    expect(getButton(container, "manageEmailUpdatesLabel").textContent).toBe(
      "manageEmailUpdatesLabel"
    );
    expect(findButton(container, "receiveEmailUpdatesLabel")).toBeUndefined();
    expect(findButton(container, "manageMyEmailUpdatesLabel")).toBeUndefined();
  });

  it("opens the history tab for a history-only owner action", async () => {
    api.getConversationSummary.mockResolvedValue({
      success: true,
      authoringAction: "history",
    });

    const container = mountMetadata();
    getMenuButton(container).click();
    await flushPromises();
    getButton(container, "viewEmailUpdateHistoryLabel").click();
    await flushPromises();

    expect(routerPush).toHaveBeenCalledWith({
      path: "/email-updates/",
      query: {
        tab: "history",
        conversationSlugId: "conversation-one",
      },
    });
  });

  it.each([
    ["enabled", false, "true"],
    ["disabled", true, "false"],
    ["undisclosed", false, "false"],
    ["undisclosed", true, "true"],
  ])(
    "renders choice %s with resolved=%s as checked=%s",
    async (state, resolvedEnabled, expectedChecked) => {
      api.getConversationSummary.mockResolvedValue({
        success: true,
        authoringAction: "none",
        participantPreference: { state, resolvedEnabled },
      });

      const container = mountMetadata();
      getMenuButton(container).click();
      await flushPromises();

      expect(
        getButton(container, "receiveEmailUpdatesLabel").dataset.checked
      ).toBe(expectedChecked);
    }
  );

  it("optimistically saves a toggle and keeps the drawer open", async () => {
    const write = deferred();
    api.getConversationSummary.mockResolvedValue({
      success: true,
      authoringAction: "none",
      participantPreference: {
        state: "disabled",
        resolvedEnabled: false,
      },
    });
    api.updatePreference.mockReturnValue(write.promise);

    const container = mountMetadata();
    getMenuButton(container).click();
    await flushPromises();
    getButton(container, "receiveEmailUpdatesLabel").click();
    await nextTick();

    expect(api.updatePreference).toHaveBeenCalledWith({
      operation: "set_conversation_preference",
      conversationSlugId: "conversation-one",
      enabled: true,
      source: "menu",
    });
    expect(
      getButton(container, "receiveEmailUpdatesLabel").dataset.checked
    ).toBe("true");
    expect(getButton(container, "receiveEmailUpdatesLabel").disabled).toBe(
      true
    );
    expect(
      container.querySelector('[data-testid="action-drawer"]')
    ).not.toBeNull();

    write.resolve({
      success: true,
      result: {
        operation: "set_conversation_preference",
        globalResumed: true,
        conversationPreferences: [
          {
            conversationSlugId: "conversation-one",
            state: "enabled",
            resolvedEnabled: true,
          },
        ],
      },
    });
    await flushPromises();

    expect(getButton(container, "receiveEmailUpdatesLabel").disabled).toBe(
      false
    );
    expect(showNotifyMessage).toHaveBeenCalledWith(
      "preferenceSavedAndGlobalResumed"
    );
    expect(removeSummaryQueries).toHaveBeenCalledWith({
      operation: "set_conversation_preference",
      globalResumed: true,
      conversationPreferences: [
        {
          conversationSlugId: "conversation-one",
          state: "enabled",
          resolvedEnabled: true,
        },
      ],
    });
  });

  it("restores the exact toggle state when saving fails", async () => {
    const write = deferred();
    api.getConversationSummary.mockResolvedValue({
      success: true,
      authoringAction: "none",
      participantPreference: {
        state: "enabled",
        resolvedEnabled: false,
      },
    });
    api.updatePreference.mockReturnValue(write.promise);

    const container = mountMetadata();
    getMenuButton(container).click();
    await flushPromises();
    getButton(container, "receiveEmailUpdatesLabel").click();
    await nextTick();

    expect(
      getButton(container, "receiveEmailUpdatesLabel").dataset.checked
    ).toBe("false");
    write.resolve({ success: false, reason: "feature_not_available" });
    await flushPromises();

    expect(
      getButton(container, "receiveEmailUpdatesLabel").dataset.checked
    ).toBe("true");
    expect(showNotifyMessage).toHaveBeenCalledWith(
      "emailUpdatesPreferenceSaveError"
    );
  });

  it("ignores an old conversation mutation after the slug changes", async () => {
    const write = deferred();
    const postSlugId = ref("conversation-one");
    api.getConversationSummary
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

    const container = mountMetadata(postSlugId);
    getMenuButton(container).click();
    await flushPromises();
    getButton(container, "receiveEmailUpdatesLabel").click();
    await nextTick();

    postSlugId.value = "conversation-two";
    await nextTick();
    getMenuButton(container).click();
    await flushPromises();
    expect(
      getButton(container, "receiveEmailUpdatesLabel").dataset.checked
    ).toBe("false");

    write.resolve({
      success: true,
      result: {
        operation: "set_conversation_preference",
        globalResumed: false,
        conversationPreferences: [
          {
            conversationSlugId: "conversation-one",
            state: "enabled",
            resolvedEnabled: true,
          },
        ],
      },
    });
    await flushPromises();

    expect(
      getButton(container, "receiveEmailUpdatesLabel").dataset.checked
    ).toBe("false");
    expect(
      container.querySelector('[data-testid="action-drawer"]')
    ).not.toBeNull();
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });
});

function mountMetadata(postSlugId = ref("conversation-one")): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const root = defineComponent(
    () => () =>
      h(PostMetadata, {
        authorVerified: false,
        posterUserName: "owner",
        authorUsername: "owner",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        isEdited: false,
        postSlugId: postSlugId.value,
        organizationUrl: "",
        organizationName: "",
        participationMode: "account_required",
        isClosed: false,
        conversationTitle: "Conversation One",
        conversationTypeConfig: { conversationType: "polis" },
        externalSourceConfig: null,
        showIdentityCard: false,
      })
  );
  const app = createApp(root);
  mountedApps.push(app);
  app.mount(container);
  return container;
}

function getMenuButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector('button[icon="mdi-dots-vertical"]');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Conversation action button not found");
  }
  return button;
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = findButton(container, label);
  if (button === undefined) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}

function findButton(
  container: HTMLElement,
  label: string
): HTMLButtonElement | undefined {
  return [...container.querySelectorAll("button")].find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
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
