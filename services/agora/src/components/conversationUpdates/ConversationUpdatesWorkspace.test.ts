import type {
  ConversationEmailUpdateHistoryRecord,
  ConversationEmailUpdateWorkspaceRequest,
} from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, type Ref, ref } from "vue";

import type { ConversationUpdateHistoryRecord } from "./conversationUpdateTypes";

const api = vi.hoisted(() => ({
  estimateAudience: vi.fn(),
  getTestStatus: vi.fn(),
  getWorkspace: vi.fn(),
  listHistory: vi.fn(),
  send: vi.fn(),
  sendTest: vi.fn(),
}));

vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => api,
}));
vi.mock("./ConversationUpdateComposerForm.vue", () => ({
  default: defineComponent({
    name: "ConversationUpdateComposerForm",
    emits: ["test", "send"],
    setup(_props, { emit }) {
      return () =>
        h("div", [
          h("button", { onClick: () => emit("test") }, "Send test"),
          h("button", { onClick: () => emit("send") }, "Open send"),
        ]);
    },
  }),
}));
vi.mock("./ConversationUpdateEmailPreview.vue", () => ({
  default: defineComponent(() => () => null),
}));
vi.mock("./ConversationUpdateHistoryList.vue", () => ({
  default: defineComponent({
    name: "ConversationUpdateHistoryList",
    props: {
      records: { type: Array, required: true },
    },
    setup(props) {
      return () =>
        h(
          "div",
          props.records
            .filter(isHistoryRecord)
            .map((record) =>
              h("span", { key: String(record.id) }, String(record.subject))
            )
        );
    },
  }),
}));
vi.mock("src/components/ui/PageLoadingSpinner.vue", () => ({
  default: defineComponent(() => () => h("div", "Loading")),
}));
vi.mock("src/components/ui/ErrorRetryBlock.vue", () => ({
  default: defineComponent(() => () => h("div", "Error")),
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
vi.mock("src/components/ui-library/ZKConfirmDialog.vue", () => ({
  default: defineComponent({
    name: "ZKConfirmDialog",
    emits: ["confirm"],
    setup(_props, { emit }) {
      return () =>
        h("button", { onClick: () => emit("confirm") }, "Confirm send");
    },
  }),
}));

import ConversationUpdatesWorkspace from "./ConversationUpdatesWorkspace.vue";

const mountedApps: App[] = [];

function isHistoryRecord(
  value: unknown
): value is ConversationUpdateHistoryRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "subject" in value &&
    typeof value.id === "string" &&
    typeof value.subject === "string"
  );
}

beforeEach(() => {
  for (const mock of Object.values(api)) {
    mock.mockReset();
  }
  api.estimateAudience.mockResolvedValue({
    success: true,
    estimatedEligibleRecipientCount: 10,
    requiredOwnerCopyCount: 1,
  });
  api.listHistory.mockResolvedValue({
    success: true,
    items: [],
    nextCursor: undefined,
  });
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdatesWorkspace", () => {
  it("loads subsequent history pages with the returned cursor", async () => {
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));
    api.listHistory
      .mockResolvedValueOnce({
        success: true,
        items: [historyRecord(1)],
        nextCursor: "next-page",
      })
      .mockResolvedValueOnce({
        success: true,
        items: [historyRecord(2)],
        nextCursor: undefined,
      });
    const { container } = mountComponent({
      context: ref({ kind: "global" }),
    });
    await flushPromises();

    expect(container.textContent).toContain("Update 1");
    getButton(container, "Load more").click();
    await flushPromises();

    expect(api.listHistory).toHaveBeenNthCalledWith(2, {
      context: { kind: "global" },
      cursor: "next-page",
      limit: 20,
    });
    expect(container.textContent).toContain("Update 1");
    expect(container.textContent).toContain("Update 2");
  });

  it("discards an old workspace response after the context changes", async () => {
    const oldWorkspace = deferred<ReturnType<typeof workspaceResponse>>();
    const context = ref<ConversationEmailUpdateWorkspaceRequest["context"]>({
      kind: "project",
      projectSlug: "old-project",
    });
    api.getWorkspace
      .mockReturnValueOnce(oldWorkspace.promise)
      .mockResolvedValueOnce(
        workspaceResponse({
          kind: "conversation",
          conversationSlugId: "new-conversation",
        })
      );

    mountComponent({ context });
    context.value = {
      kind: "conversation",
      conversationSlugId: "new-conversation",
    };
    await flushPromises();
    oldWorkspace.resolve(
      workspaceResponse({ kind: "project", projectSlug: "old-project" })
    );
    await flushPromises();

    expect(api.listHistory).toHaveBeenCalledOnce();
    expect(api.listHistory).toHaveBeenCalledWith({
      context: {
        kind: "conversation",
        conversationSlugId: "new-conversation",
      },
      limit: 20,
    });
  });

  it("discards a pending history page after a context refresh", async () => {
    const stalePage = deferred<{
      success: true;
      items: ConversationEmailUpdateHistoryRecord[];
      nextCursor: undefined;
    }>();
    const context = ref<ConversationEmailUpdateWorkspaceRequest["context"]>({
      kind: "project",
      projectSlug: "old-project",
    });
    api.getWorkspace.mockImplementation(({ context: requestContext }) =>
      Promise.resolve(workspaceResponse(requestContext))
    );
    api.listHistory
      .mockResolvedValueOnce({
        success: true,
        items: [historyRecord(1)],
        nextCursor: "old-next-page",
      })
      .mockReturnValueOnce(stalePage.promise)
      .mockResolvedValueOnce({
        success: true,
        items: [historyRecord(2)],
        nextCursor: undefined,
      });
    const { container } = mountComponent({ context });
    await flushPromises();
    getButton(container, "Load more").click();

    context.value = {
      kind: "conversation",
      conversationSlugId: "new-conversation",
    };
    await flushPromises();
    stalePage.resolve({
      success: true,
      items: [historyRecord(3)],
      nextCursor: undefined,
    });
    await flushPromises();

    expect(container.textContent).not.toContain("Update 1");
    expect(container.textContent).toContain("Update 2");
  });

  it("cannot authorize a send from a stale-scope test response", async () => {
    const testResponse = deferred<{
      success: true;
      updateId: string;
      testAttemptId: string;
      status: "pending";
    }>();
    const context = ref<ConversationEmailUpdateWorkspaceRequest["context"]>({
      kind: "project",
      projectSlug: "old-project",
    });
    api.getWorkspace.mockImplementation(({ context: requestContext }) =>
      Promise.resolve(workspaceResponse(requestContext))
    );
    api.sendTest.mockReturnValue(testResponse.promise);

    const { container } = mountComponent({ context });
    await flushPromises();
    getButton(container, "Send test").click();
    await flushPromises();

    context.value = {
      kind: "conversation",
      conversationSlugId: "new-conversation",
    };
    await flushPromises();
    testResponse.resolve({
      success: true,
      updateId: "00000000-0000-4000-8000-000000000010",
      testAttemptId: "00000000-0000-4000-8000-000000000011",
      status: "pending",
    });
    await flushPromises();
    getButton(container, "Confirm send").click();
    await flushPromises();

    expect(api.getTestStatus).not.toHaveBeenCalled();
    expect(api.send).not.toHaveBeenCalled();
  });

  it("queues only one test while the request is pending", async () => {
    const testResponse = deferred<{
      success: true;
      updateId: string;
      testAttemptId: string;
      status: "pending";
    }>();
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));
    api.sendTest.mockReturnValue(testResponse.promise);

    const { container } = mountComponent({
      context: ref({ kind: "global" }),
    });
    await flushPromises();
    const sendTestButton = getButton(container, "Send test");
    sendTestButton.click();
    sendTestButton.click();
    await flushPromises();

    expect(api.sendTest).toHaveBeenCalledOnce();
  });

  it("does not load history while opening the composer", async () => {
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));

    mountComponent({
      context: ref({ kind: "global" }),
      initialTab: "compose",
    });
    await flushPromises();

    expect(api.listHistory).not.toHaveBeenCalled();
  });
});

function mountComponent({
  context,
  initialTab = "history",
}: {
  context: Ref<ConversationEmailUpdateWorkspaceRequest["context"]>;
  initialTab?: "compose" | "history";
}): { container: HTMLElement } {
  const container = document.createElement("div");
  document.body.append(container);
  const root = defineComponent(
    () => () =>
      h(ConversationUpdatesWorkspace, {
        context: context.value,
        initialTab,
      })
  );
  const app = createApp(root);
  const slotStub = defineComponent(
    (_props, { slots }) =>
      () =>
        slots.default?.()
  );
  app.component("QTabs", slotStub);
  app.component("QTabPanels", slotStub);
  app.component("QTabPanel", slotStub);
  app.component(
    "QTab",
    defineComponent(() => () => null)
  );
  app.component(
    "QIcon",
    defineComponent(() => () => null)
  );
  mountedApps.push(app);
  app.mount(container);
  return { container };
}

function workspaceResponse(
  context: ConversationEmailUpdateWorkspaceRequest["context"]
) {
  const projectSlug =
    context.kind === "project" ? context.projectSlug : "workspace-project";
  const conversationSlugId =
    context.kind === "conversation"
      ? context.conversationSlugId
      : "workspace-conversation";
  return {
    success: true as const,
    resolvedContext: context,
    initialSelection: {
      kind: "project" as const,
      projectSlug,
      conversationSlugIds: [conversationSlugId],
    },
    scopes: [
      {
        kind: "project" as const,
        projectSlug,
        title: "Workspace project",
        participantContactEmail: "owner@example.com",
        conversations: [
          {
            conversationSlugId,
            title: "Workspace conversation",
            participationMode: "account_required" as const,
            estimatedEligibleRecipientCount: 10,
            sendingEnabled: true,
          },
        ],
      },
    ],
  };
}

function historyRecord(index: number): ConversationEmailUpdateHistoryRecord {
  const id = String(index).padStart(12, "0");
  return {
    updateId: `00000000-0000-4000-8000-${id}`,
    subject: `Update ${String(index)}`,
    bodyHtml: "<p>Body</p>",
    acceptedAt: new Date("2026-08-22T12:00:00.000Z"),
    audienceEstimate: 10,
    ownerCopyCount: 1,
    scope: {
      kind: "project",
      title: "Project",
      projectSlug: "project",
    },
    conversations: [
      { conversationSlugId: "conversation", title: "Conversation" },
    ],
    status: "completed",
  };
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent === label
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
