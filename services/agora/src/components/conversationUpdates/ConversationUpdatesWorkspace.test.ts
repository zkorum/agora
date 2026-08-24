import {
  type SupportedDisplayLanguageCodes,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type {
  ConversationEmailUpdateHistoryRecord,
  ConversationEmailUpdateWorkspaceRequest,
} from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, type Ref, ref } from "vue";
import { createI18n } from "vue-i18n";

import { conversationUpdatesWorkspaceTranslations } from "./ConversationUpdatesWorkspace.i18n";
import type { ConversationUpdateHistoryRecord } from "./conversationUpdateTypes";

const api = vi.hoisted(() => ({
  estimateAudience: vi.fn(),
  getTestStatus: vi.fn(),
  getWorkspace: vi.fn(),
  listHistory: vi.fn(),
  send: vi.fn(),
  sendTest: vi.fn(),
}));
const showNotifyMessage = vi.hoisted(() => vi.fn());

vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => api,
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage }),
}));
vi.mock("src/stores/loginIntention", () => ({
  useLoginIntentionStore: () => ({ createEmailUpdatesIntention: vi.fn() }),
}));
vi.mock("src/stores/onboarding/flow", () => ({
  onboardingFlowStore: () => ({ onboardingMode: "LOGIN" }),
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ fullPath: "/email-updates/?tab=compose" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("./ConversationUpdateComposerForm.vue", () => ({
  default: defineComponent({
    name: "ConversationUpdateComposerForm",
    emits: ["test", "send", "update:contentConfirmed"],
    setup(_props, { emit }) {
      return () =>
        h("div", [
          h("button", { onClick: () => emit("test") }, "Send test"),
          h("button", { onClick: () => emit("send") }, "Open send"),
          h(
            "button",
            { onClick: () => emit("update:contentConfirmed", true) },
            "Confirm content"
          ),
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
    props: {
      title: { type: String, required: true },
      confirmText: { type: String, required: true },
      cancelText: { type: String, required: true },
    },
    emits: ["confirm"],
    setup(props, { emit, slots }) {
      return () =>
        h("div", [
          h("span", props.title),
          h("span", props.confirmText),
          h("span", props.cancelText),
          slots.default?.(),
          h("button", { onClick: () => emit("confirm") }, "Confirm send"),
        ]);
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
  showNotifyMessage.mockReset();
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
  it("renders workspace copy in the active display language", async () => {
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));
    api.listHistory.mockResolvedValue({
      success: true,
      items: [],
      nextCursor: "next-page",
    });
    api.estimateAudience.mockResolvedValue({
      success: true,
      estimatedEligibleRecipientCount: 12_345,
      requiredOwnerCopyCount: 1,
    });

    const { container } = mountComponent({
      context: ref({ kind: "global" }),
      initialTab: "compose",
      locale: "es",
    });
    await flushAudienceEstimate();

    expect(container.textContent).toContain(
      "Mantén conectados a los participantes con el trabajo al que se unieron"
    );
    expect(container.textContent).toContain("Redactar");
    expect(container.textContent).toContain("Historial");
    expect(container.textContent).toContain(
      "Actualmente hay 12.345 destinatarios aptos"
    );
    expect(container.textContent).not.toContain(
      "Keep participants connected to the work they joined"
    );
  });

  it("formats a test retry date using the active display locale", async () => {
    const retryAt = new Date("2026-08-24T12:34:00.000Z");
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));
    api.sendTest.mockResolvedValue({
      success: false,
      error: { reason: "test_rate_limited", retryAt },
    });

    const { container } = mountComponent({
      context: ref({ kind: "global" }),
      initialTab: "compose",
      locale: "es",
    });
    await flushAudienceEstimate();
    getButton(container, "Send test").click();
    await flushPromises();

    expect(showNotifyMessage).toHaveBeenCalledWith(
      `Se solicitaron demasiados correos de prueba. Inténtalo de nuevo después de ${retryAt.toLocaleString("es")}.`
    );
  });

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
    await flushAudienceEstimate();
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
    await flushAudienceEstimate();
    const sendTestButton = getButton(container, "Send test");
    sendTestButton.click();
    sendTestButton.click();
    await flushPromises();

    expect(api.sendTest).toHaveBeenCalledOnce();
  });

  it("submits only one final send while the request is pending", async () => {
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));
    api.sendTest.mockResolvedValue({
      success: true,
      updateId: "00000000-0000-4000-8000-000000000010",
      testAttemptId: "00000000-0000-4000-8000-000000000011",
      status: "pending",
    });
    api.getTestStatus.mockResolvedValue({
      success: true,
      status: {
        state: "provider_accepted",
        providerAcceptedAt: new Date("2026-08-24T12:00:00.000Z"),
      },
    });
    api.send.mockReturnValue(new Promise(() => undefined));

    const { container } = mountComponent({
      context: ref({ kind: "global" }),
      initialTab: "compose",
    });
    await flushAudienceEstimate();
    getButton(container, "Send test").click();
    await new Promise((resolve) => window.setTimeout(resolve, 1_600));
    await flushPromises();
    getButton(container, "Confirm content").click();
    getButton(container, "Open send").click();
    const confirmButton = getButton(container, "Confirm send");
    confirmButton.click();
    confirmButton.click();
    await flushPromises();

    expect(api.send).toHaveBeenCalledOnce();
  });

  it("does not queue a test without a verified facilitator email", async () => {
    api.getWorkspace.mockResolvedValue({
      ...workspaceResponse({ kind: "global" }),
      testDestinationEmail: undefined,
    });

    const { container } = mountComponent({
      context: ref({ kind: "global" }),
      initialTab: "compose",
    });
    await flushAudienceEstimate();
    getButton(container, "Send test").click();
    await flushPromises();

    expect(api.sendTest).not.toHaveBeenCalled();
    expect(api.estimateAudience).not.toHaveBeenCalled();
  });

  it("debounces audience estimates when the workspace context changes", async () => {
    const context = ref<ConversationEmailUpdateWorkspaceRequest["context"]>({
      kind: "global",
    });
    api.getWorkspace.mockImplementation(({ context: requestContext }) =>
      Promise.resolve(workspaceResponse(requestContext))
    );

    mountComponent({ context, initialTab: "compose" });
    await flushPromises();
    context.value = {
      kind: "conversation",
      conversationSlugId: "new-conversation",
    };
    await flushAudienceEstimate();

    expect(api.estimateAudience).toHaveBeenCalledOnce();
    expect(api.estimateAudience).toHaveBeenCalledWith({
      request: {
        selection: {
          kind: "project",
          projectSlug: "workspace-project",
          conversationSlugIds: ["new-conversation"],
        },
      },
      signal: expect.any(AbortSignal),
    });
  });

  it("does not queue a test for an empty eligible audience", async () => {
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));
    api.estimateAudience.mockResolvedValue({
      success: true,
      estimatedEligibleRecipientCount: 0,
      requiredOwnerCopyCount: 1,
    });

    const { container } = mountComponent({
      context: ref({ kind: "global" }),
      initialTab: "compose",
    });
    await flushAudienceEstimate();
    getButton(container, "Send test").click();
    await flushPromises();

    expect(api.sendTest).not.toHaveBeenCalled();
  });

  it("shows test failures as temporary notifications", async () => {
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));
    api.sendTest.mockResolvedValue({
      success: false,
      error: { reason: "no_verified_test_email" },
    });

    const { container } = mountComponent({
      context: ref({ kind: "global" }),
      initialTab: "compose",
    });
    await flushAudienceEstimate();
    getButton(container, "Send test").click();
    await flushPromises();

    expect(showNotifyMessage).toHaveBeenCalledWith(
      "Verify an email address before sending a test email."
    );
    getButton(container, "Send test").click();
    await flushPromises();

    expect(api.sendTest).toHaveBeenCalledOnce();
  });

  it("explains when a test was not sent after authorization became unavailable", async () => {
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));
    api.sendTest.mockResolvedValue({
      success: true,
      updateId: "00000000-0000-4000-8000-000000000010",
      testAttemptId: "00000000-0000-4000-8000-000000000011",
      status: "pending",
    });
    api.getTestStatus.mockResolvedValue({
      success: true,
      status: {
        state: "failed",
        reason: "authorization_rejected",
      },
    });

    const { container } = mountComponent({
      context: ref({ kind: "global" }),
      initialTab: "compose",
    });
    await flushAudienceEstimate();
    getButton(container, "Send test").click();
    await new Promise((resolve) => window.setTimeout(resolve, 1_600));
    await flushPromises();

    expect(showNotifyMessage).toHaveBeenCalledWith(
      "The test email was not sent because its destination or sending authorization was no longer available."
    );
  });

  it("blocks another final send when the eligible audience becomes empty", async () => {
    api.getWorkspace.mockResolvedValue(workspaceResponse({ kind: "global" }));
    api.sendTest.mockResolvedValue({
      success: true,
      updateId: "00000000-0000-4000-8000-000000000010",
      testAttemptId: "00000000-0000-4000-8000-000000000011",
      status: "pending",
    });
    api.getTestStatus.mockResolvedValue({
      success: true,
      status: {
        state: "provider_accepted",
        providerAcceptedAt: new Date("2026-08-24T12:00:00.000Z"),
      },
    });
    api.send.mockResolvedValue({
      success: false,
      reason: "no_eligible_participants",
    });

    const { container } = mountComponent({
      context: ref({ kind: "global" }),
      initialTab: "compose",
    });
    await flushAudienceEstimate();
    getButton(container, "Send test").click();
    await new Promise((resolve) => window.setTimeout(resolve, 1_600));
    await flushPromises();
    getButton(container, "Confirm content").click();
    getButton(container, "Open send").click();
    getButton(container, "Confirm send").click();
    await flushPromises();

    expect(showNotifyMessage).toHaveBeenCalledWith(
      "No participants are currently eligible to receive this email."
    );
    getButton(container, "Confirm send").click();
    await flushPromises();

    expect(api.send).toHaveBeenCalledOnce();
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

describe("conversationUpdatesWorkspaceTranslations", () => {
  it("provides the authorization failure message in every display language", () => {
    expect(
      Object.keys(conversationUpdatesWorkspaceTranslations).sort()
    ).toEqual([...ZodSupportedDisplayLanguageCodes.options].sort());

    for (const translations of Object.values(
      conversationUpdatesWorkspaceTranslations
    )) {
      expect(translations.testDeliveryAuthorization.trim()).not.toBe("");
      expect(translations.testDeliveryAuthorization).not.toBe(
        translations.testDeliveryPermanent
      );
    }
  });
});

function mountComponent({
  context,
  initialTab = "history",
  locale = "en",
}: {
  context: Ref<ConversationEmailUpdateWorkspaceRequest["context"]>;
  initialTab?: "compose" | "history";
  locale?: SupportedDisplayLanguageCodes;
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
  app.use(
    createI18n({
      legacy: false,
      locale,
      messages: {},
    })
  );
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
    defineComponent({
      props: { label: { type: String, required: true } },
      setup(props) {
        return () => h("span", props.label);
      },
    })
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
    testDestinationEmail: "facilitator@example.com",
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

async function flushAudienceEstimate(): Promise<void> {
  await flushPromises();
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  await flushPromises();
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
