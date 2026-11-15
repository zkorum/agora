import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { AxiosError, AxiosHeaders } from "axios";
import type { Dto, PrioritizationItem } from "src/shared/types/dto";
import type { useRankingItemDisplayContent } from "src/utils/translation/useRankingItemDisplayContent";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type App,
  computed,
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  ref,
  toValue,
} from "vue";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import type { z } from "zod";

import type { QvConversationMetadata } from "./QvVoting.types";

const api = vi.hoisted(() => ({
  fetchItems: vi.fn(),
  save: vi.fn(),
  withdraw: vi.fn(),
  applyAuth: vi.fn(),
  forceRefreshAuth: vi.fn(),
  blocked: vi.fn(),
}));
const viewer = ref<{ kind: "viewer"; userId: string | undefined }>({
  kind: "viewer",
  userId: undefined,
});
vi.mock("pinia", () => ({ storeToRefs: (store: object) => store }));
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => ({
    displayLanguage: ref("en"),
    spokenLanguages: ref(["en"]),
  }),
}));
vi.mock("src/utils/query/viewerScope", () => ({
  useViewerQueryScope: () => viewer,
}));
vi.mock("src/utils/api/post/qv", () => ({
  useQvApi: () => ({
    load: async (input: unknown) => ({
      viewerId: viewer.value.userId,
      statementSetRevision: 0,
      allowOpposition: true,
      isClosed: false,
      response: { revision: 0 },
      ...(await api.fetchItems(input)),
    }),
    save: async (input: unknown) => ({
      ...(await api.save(input)),
      didWrite: "did:key:qv",
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: viewer.value.userId ?? "created-guest",
        credentials: { email: null, phone: null, rarimo: null },
      },
    }),
    withdraw: async (input: unknown) => ({
      ...(await api.withdraw(input)),
      didWrite: "did:key:qv",
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: viewer.value.userId ?? "created-guest",
        credentials: { email: null, phone: null, rarimo: null },
      },
    }),
  }),
}));
vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => ({
    applyAcceptedParticipationAuth: api.applyAuth,
    refreshAuthState: api.forceRefreshAuth,
  }),
}));
vi.mock("src/composables/conversation/useParticipationGate", () => ({
  useParticipationGate: () => ({
    captureParticipationAction: () => ({ handleBlockedReason: api.blocked }),
  }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/utils/translation/useRankingItemDisplayContent", () => ({
  useRankingItemDisplayContent: (
    input: Parameters<typeof useRankingItemDisplayContent>[0]
  ) => ({
    displayedTitle: computed(() => {
      const content = toValue(input.displayContent);
      return content?.status === "available" ? content.content.title : "";
    }),
    displayedBody: ref(""),
    resolvedDisplayContent: computed(() => toValue(input.displayContent)),
    translationPreview: ref(undefined),
    setTranslationMode: vi.fn(),
  }),
}));
vi.mock("src/components/ui-library/ZKConfirmDialog.vue", () => ({
  default: defineComponent({
    props: { modelValue: Boolean },
    emits: ["confirm", "update:modelValue"],
    setup:
      (props, { emit }) =>
      () =>
        props.modelValue
          ? h("div", { role: "dialog" }, [
              h(
                "button",
                {
                  onClick: () => {
                    emit("update:modelValue", false);
                  },
                },
                "Keep editing"
              ),
              h(
                "button",
                {
                  onClick: () => {
                    emit("confirm");
                    emit("update:modelValue", false);
                  },
                },
                "Confirm discard"
              ),
            ])
          : null,
  }),
}));

import QvVotingTab from "./QvVotingTab.vue";

const mountedApps: App[] = [];
afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  api.fetchItems.mockReset();
  api.save.mockReset();
  api.withdraw.mockReset();
  api.applyAuth.mockReset();
  api.forceRefreshAuth.mockReset();
  api.blocked.mockReset();
  viewer.value = { kind: "viewer", userId: undefined };
  document.body.replaceChildren();
});

function item({
  version = "one",
  slugId = "a",
}: { version?: string; slugId?: string } = {}): PrioritizationItem {
  return {
    slugId,
    displayContent: {
      sourceVersion: version,
      status: "available",
      mode: "original",
      content: { title: `Proposal ${slugId}`, bodyHtml: undefined },
      translationControl: null,
    },
    lifecycleStatus: "active",
    externalUrl: null,
    snapshotScore: null,
    snapshotRank: null,
    snapshotParticipantCount: null,
    createdAt: "2026-11-04T00:00:00Z",
  };
}
function conversation(): { metadata: QvConversationMetadata } {
  return {
    metadata: {
      participantStatements: { supported: false },
      conversationSlugId: "qvtest01",
      conversationViewSnapshotId: 1,
      createdAt: new Date(),
      lastReactedAt: new Date(),
      opinionCount: 1,
      voteCount: 0,
      participantCount: 0,
      totalOpinionCount: 1,
      totalVoteCount: 0,
      totalParticipantCount: 0,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      authorUsername: "author",
      participationMode: "guest",
      conversationType: "prioritizing",
      prioritizationType: "qv",
      creditPricing: "quadratic",
      allowOpposition: true,
      isIndexed: true,
      aiLabelingEnabled: false,
      preferredOpinionGroupCount: null,
      isClosed: false,
      isEdited: false,
      moderation: { status: "unmoderated" },
      contentLanguageMetadata: {
        detectedDisplayLanguageCode: null,
        detectedSourceLanguageCode: null,
        detectedRawLanguageCode: null,
        detectionConfidence: null,
        autoDetectionStatus: "not_attempted",
      },
      languageSetting: {
        mode: "auto",
        languageCode: null,
        detectedLanguageCode: null,
        detectedSourceLanguageCode: null,
        detectedRawLanguageCode: null,
        detectionConfidence: null,
        autoDetectionStatus: "not_attempted",
      },
      multilingualSetting: {
        additionalLanguageCodes: [],
        dynamicTranslationEnabled: false,
      },
      externalSourceConfig: null,
    },
  };
}

async function mountTab(
  initial: Partial<z.infer<typeof Dto.qvLoadResponse>> = {}
) {
  const data = ref(conversation());
  api.fetchItems.mockResolvedValue({ items: [item()], ...initial });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: 0 },
    },
  });
  const routeComponent = defineComponent({
    props: { postSlugId: { type: String, required: true } },
    setup: (props) => () =>
      h(QvVotingTab, {
        conversationMetadata: {
          ...data.value.metadata,
          conversationSlugId: props.postSlugId,
        },
      }),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/conversation/:postSlugId",
        component: routeComponent,
        props: true,
      },
      { path: "/outside", component: { template: "<div>Outside</div>" } },
    ],
  });
  await router.push("/conversation/qvtest01");
  const app = createApp(
    defineComponent(
      () => () =>
        h(RouterView, null, {
          default: ({ Component }: { Component: object }) =>
            h(KeepAlive, null, [h(Component)]),
        })
    )
  );
  app.use(router).use(VueQueryPlugin, { queryClient });
  app.component(
    "QBtn",
    defineComponent({
      props: { disable: Boolean, icon: { type: String, required: true } },
      emits: ["click"],
      setup:
        (props, { emit }) =>
        () =>
          h(
            "button",
            { disabled: props.disable, onClick: () => emit("click") },
            props.icon
          ),
    })
  );
  app.component(
    "PrimeButton",
    defineComponent({
      props: { disabled: Boolean, label: { type: String, required: true } },
      emits: ["click"],
      setup:
        (props, { emit }) =>
        () =>
          h(
            "button",
            { disabled: props.disabled, onClick: () => emit("click") },
            props.label
          ),
    })
  );
  const container = document.createElement("div");
  document.body.append(container);
  mountedApps.push(app);
  app.mount(container);
  await vi.waitFor(() =>
    expect(container.querySelectorAll("output")).toHaveLength(
      initial.items?.length ?? 1
    )
  );
  async function click(label: string): Promise<void> {
    const button = [...container.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === label
    );
    if (button === undefined) throw new Error(`Missing button: ${label}`);
    button.click();
    await nextTick();
  }
  function replaceItems(items: PrioritizationItem[]): void {
    queryClient.setQueriesData<z.infer<typeof Dto.qvLoadResponse>>(
      { queryKey: ["qv-load"] },
      (old) =>
        old === undefined
          ? old
          : {
              ...old,
              items,
              statementSetRevision:
                old.statementSetRevision +
                (JSON.stringify(
                  old.items.map((item) => [
                    item.slugId,
                    item.displayContent.sourceVersion,
                  ])
                ) ===
                JSON.stringify(
                  items.map((item) => [
                    item.slugId,
                    item.displayContent.sourceVersion,
                  ])
                )
                  ? 0
                  : 1),
            }
    );
  }
  async function refresh(): Promise<void> {
    await queryClient.refetchQueries({ queryKey: ["qv-load"] });
    await nextTick();
  }
  return { data, router, container, click, replaceItems, refresh, queryClient };
}

describe("QV local response lifecycle", () => {
  it("refreshes the private closed flag after reopening without resetting unsaved edits", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    api.fetchItems.mockResolvedValue({ items: [item()], isClosed: true });
    view.data.value.metadata.isClosed = true;
    view.data.value.metadata.qvGeneration = 1;
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(2));
    api.fetchItems.mockResolvedValue({ items: [item()], isClosed: false });
    view.data.value.metadata.isClosed = false;
    view.data.value.metadata.qvGeneration = 2;
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(3));
    await vi.waitFor(() =>
      expect(
        view.container.querySelector<HTMLButtonElement>(".increase")?.disabled
      ).toBe(false)
    );
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    expect(view.container.textContent).toContain("unsaved");
    expect(api.save).not.toHaveBeenCalled();
  });
  it("does not seed a reopened session with a pre-close snapshot when a Save receipt arrives late", async () => {
    viewer.value = { kind: "viewer", userId: "known-user" };
    const view = await mountTab();
    await view.click("mdi-plus");
    let finishSave:
      | ((value: {
          success: true;
          response: ReturnType<typeof response>;
        }) => void)
      | undefined;
    api.save.mockImplementationOnce(
      async () =>
        await new Promise((resolve) => {
          finishSave = resolve;
        })
    );
    await view.click("save");
    await view.click("mdi-plus");
    api.fetchItems.mockResolvedValue({
      items: [item()],
      isClosed: true,
      response: response(),
    });
    view.data.value.metadata.isClosed = true;
    view.data.value.metadata.qvGeneration = 1;
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(2));
    let finishOldLoad:
      | ((value: {
          items: PrioritizationItem[];
          isClosed: boolean;
          response: ReturnType<typeof response>;
        }) => void)
      | undefined;
    api.fetchItems.mockImplementationOnce(
      async () =>
        await new Promise((resolve) => {
          finishOldLoad = resolve;
        })
    );
    view.data.value.metadata.isClosed = false;
    view.data.value.metadata.qvGeneration = 2;
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(3));
    api.fetchItems.mockResolvedValue({
      items: [item()],
      isClosed: false,
      response: response(),
    });
    if (finishSave === undefined || finishOldLoad === undefined)
      throw new Error("Missing in-flight QV requests");
    finishSave({ success: true, response: response() });
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(4));
    finishOldLoad({ items: [item()], isClosed: true, response: response() });
    await vi.waitFor(() =>
      expect(
        view.container.querySelector<HTMLButtonElement>(".increase")?.disabled
      ).toBe(false)
    );
    expect(view.container.querySelector("output")?.textContent).toBe("+2");
    expect(view.container.textContent).toContain("unsaved");
    expect(api.save).toHaveBeenCalledTimes(1);
  });
  it("refreshes all pending translations through one snapshot request and stops once complete", async () => {
    const pendingItems = [item(), item({ slugId: "b" })].map((entry) => ({
      ...entry,
      displayContent: {
        ...entry.displayContent,
        translationControl: {
          status: "pending" as const,
          sourceLanguageLabel: "English",
          alternateMode: "translated" as const,
          canRequestAlternate: true,
        },
      },
    }));
    const view = await mountTab({ items: pendingItems });
    expect(view.container.querySelectorAll("output")).toHaveLength(2);
    api.fetchItems.mockResolvedValue({
      items: [item(), item({ slugId: "b" })],
    });
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(2), {
      timeout: 4000,
    });
    await nextTick();
    vi.useFakeTimers();
    try {
      await vi.advanceTimersByTimeAsync(6000);
      expect(api.fetchItems).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
  function response({
    revision = 1,
    votes = 1,
  }: { revision?: number; votes?: number } = {}) {
    return {
      revision,
      saved: {
        savedAt: new Date(),
        creditsSpent: votes ** 2,
        allocations: [{ itemId: "a", sourceVersion: "one", votes }],
      },
    };
  }
  it("writes only on explicit Save and treats the accepted response as the new baseline", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    expect(api.save).not.toHaveBeenCalled();
    expect(api.withdraw).not.toHaveBeenCalled();
    api.save.mockResolvedValue({ success: true, response: response() });
    await view.click("save");
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("savedBaseline")
    );
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).not.toContain("unsaved");
    await vi.waitFor(() =>
      expect(
        view.container.querySelector<HTMLButtonElement>(".increase")?.disabled
      ).toBe(false)
    );
    await view.click("mdi-plus");
    await view.click("discard");
    await view.click("Confirm discard");
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.withdraw).not.toHaveBeenCalled();
    expect(view.data.value.metadata.participantCount).toBe(0);
  });
  it("loads a saved response without dirty navigation and tracks clearing it as an unsaved change", async () => {
    const view = await mountTab({ response: response() });
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    expect(view.container.textContent).not.toContain("unsaved");
    const cleanUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanUnload);
    expect(cleanUnload.defaultPrevented).toBe(false);
    await view.click("mdi-minus");
    expect(view.container.textContent).toContain("unsaved");
    expect(
      [...view.container.querySelectorAll("button")].find(
        (button) => button.textContent === "save"
      )?.disabled
    ).toBe(true);
  });
  it("keeps newer local edits through an in-flight save and prevents overlapping commands", async () => {
    viewer.value = { kind: "viewer", userId: "known-user" };
    const view = await mountTab();
    await view.click("mdi-plus");
    let finish:
      | ((value: {
          success: true;
          response: ReturnType<typeof response>;
        }) => void)
      | undefined;
    api.save.mockImplementationOnce(
      async () =>
        await new Promise((resolve) => {
          finish = resolve;
        })
    );
    await view.click("save");
    await view.click("mdi-plus");
    await view.click("save");
    expect(api.save).toHaveBeenCalledTimes(1);
    if (finish === undefined) throw new Error("Save not started");
    finish({ success: true, response: response() });
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("savedBaseline")
    );
    expect(view.container.querySelector("output")?.textContent).toBe("+2");
    expect(view.container.textContent).toContain("unsaved");
    await view.click("discard");
    await view.click("Confirm discard");
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
  });
  it("retries an ambiguous save with its original command rather than uploading newer edits", async () => {
    viewer.value = { kind: "viewer", userId: "known-user" };
    const view = await mountTab();
    await view.click("mdi-plus");
    api.save.mockRejectedValueOnce(new Error("Connection lost"));
    await view.click("save");
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("commandUncertain")
    );
    await view.click("mdi-plus");
    api.save.mockResolvedValueOnce({ success: true, response: response() });
    await view.click("retryCommand");
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("savedBaseline")
    );
    const requests = api.save.mock.calls.map(([call]) => call.request);
    expect(requests[0]).toEqual(requests[1]);
    expect(requests[1].allocations).toEqual([
      { itemId: "a", sourceVersion: "one", votes: 1 },
    ]);
    expect(view.container.querySelector("output")?.textContent).toBe("+2");
  });
  it("withdraws separately and only after confirmation", async () => {
    const view = await mountTab({ response: response() });
    api.withdraw.mockResolvedValue({
      success: true,
      response: { revision: 2 },
    });
    await view.click("withdraw");
    expect(api.withdraw).not.toHaveBeenCalled();
    await view.click("Confirm discard");
    await vi.waitFor(() =>
      expect(view.container.querySelector("output")?.textContent).toBe("0")
    );
    expect(api.withdraw).toHaveBeenCalledTimes(1);
    expect(api.save).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain("unsaved");
  });
  it("keeps local work on a revision conflict until explicit discard adopts the server baseline", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    api.save.mockResolvedValue({ success: false, reason: "response_conflict" });
    api.fetchItems.mockResolvedValue({
      items: [item()],
      response: response({ votes: 7 }),
    });
    await view.click("save");
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("responseConflict")
    );
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    await vi.waitFor(() =>
      expect(
        [...view.container.querySelectorAll("button")].find(
          (button) => button.textContent === "discard"
        )?.disabled
      ).toBe(false)
    );
    await view.click("discard");
    await view.click("Confirm discard");
    expect(view.container.querySelector("output")?.textContent).toBe("+7");
    expect(view.container.textContent).not.toContain("unsaved");
  });
  it("installs first-guest identity from the accepted save while preserving its cached response", async () => {
    const view = await mountTab();
    const acceptedResponse = response();
    await view.click("mdi-plus");
    let finish:
      | ((value: {
          success: true;
          response: ReturnType<typeof response>;
        }) => void)
      | undefined;
    api.save.mockImplementationOnce(
      async () =>
        await new Promise((resolve) => {
          finish = resolve;
        })
    );
    api.applyAuth.mockImplementationOnce(() => {
      api.fetchItems.mockResolvedValue({
        items: [item()],
        response: response(),
      });
      viewer.value = { kind: "viewer", userId: "created-guest" };
    });
    await view.click("save");
    expect(
      view.container.querySelector<HTMLButtonElement>(".increase")?.disabled
    ).toBe(true);
    if (finish === undefined) throw new Error("Save not started");
    finish({ success: true, response: acceptedResponse });
    await vi.waitFor(() =>
      expect(view.container.querySelector("output")?.textContent).toBe("+1")
    );
    await vi.waitFor(() => expect(api.applyAuth).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(
        view.queryClient.getQueryData([
          "qv-load",
          "qvtest01",
          "en",
          ["en"],
          0,
          { kind: "viewer", userId: "created-guest" },
        ])
      ).toMatchObject({ viewerId: "created-guest", response: acceptedResponse })
    );
    expect(api.fetchItems).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).not.toContain("unsaved");
  });
  it("does not install an owner snapshot under a different viewer cache key", async () => {
    viewer.value = { kind: "viewer", userId: "known-user" };
    const view = await mountTab();
    await view.click("mdi-plus");
    api.fetchItems.mockResolvedValue({
      viewerId: "another-user",
      items: [item({ slugId: "private-other" })],
      response: response(),
    });
    await view.refresh();
    await vi.waitFor(() => expect(api.forceRefreshAuth).toHaveBeenCalled());
    expect(view.container.querySelectorAll("output")).toHaveLength(0);
    expect(view.container.textContent).not.toContain("Proposal private-other");
  });
  it("refreshes a known stale identity rather than treating the local session as already current", async () => {
    viewer.value = { kind: "viewer", userId: "old-user" };
    const view = await mountTab();
    await view.click("mdi-plus");
    api.save.mockResolvedValue({ success: false, reason: "identity_conflict" });
    api.forceRefreshAuth.mockImplementationOnce(() => {
      viewer.value = { kind: "viewer", userId: "current-user" };
    });
    await view.click("save");
    await vi.waitFor(() =>
      expect(api.forceRefreshAuth).toHaveBeenCalledTimes(1)
    );
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(2));
    expect(api.applyAuth).not.toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(view.container.querySelector("output")?.textContent).toBe("0")
    );
  });
  it.each([400, 404, 410, 422])(
    "settles a definitive HTTP %s rejection instead of retaining an uncertain command",
    async (status) => {
      const view = await mountTab();
      await view.click("mdi-plus");
      api.save.mockRejectedValue(
        new AxiosError("Rejected", undefined, undefined, undefined, {
          status,
          statusText: "Rejected",
          headers: new AxiosHeaders(),
          config: { headers: new AxiosHeaders() },
          data: {},
        })
      );
      await view.click("save");
      await vi.waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
      await vi.waitFor(() =>
        expect(view.container.textContent).not.toContain("retryCommand")
      );
      expect(view.container.textContent).not.toContain("commandUncertain");
      if ([404, 410].includes(status))
        expect(view.container.querySelectorAll("output")).toHaveLength(0);
      else {
        expect(view.container.querySelector("output")?.textContent).toBe("+1");
        expect(view.container.textContent).toContain("saveError");
      }
    }
  );
  it("keeps 5xx outcomes uncertain and does not optimistically install a saved baseline", async () => {
    viewer.value = { kind: "viewer", userId: "known-user" };
    const view = await mountTab();
    await view.click("mdi-plus");
    api.save.mockRejectedValue(
      new AxiosError("Server error", undefined, undefined, undefined, {
        status: 500,
        statusText: "Server error",
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: {},
      })
    );
    await view.click("save");
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("commandUncertain")
    );
    expect(view.container.textContent).toContain("notSaved");
    expect(view.container.textContent).toContain("retryCommand");
    expect(api.applyAuth).not.toHaveBeenCalled();
  });
  it("ignores a save result after the voting identity changes", async () => {
    viewer.value = { kind: "viewer", userId: "old-user" };
    const view = await mountTab();
    await view.click("mdi-plus");
    let finish:
      | ((value: {
          success: true;
          response: ReturnType<typeof response>;
        }) => void)
      | undefined;
    api.save.mockImplementationOnce(
      async () =>
        await new Promise((resolve) => {
          finish = resolve;
        })
    );
    await view.click("save");
    viewer.value = { kind: "viewer", userId: "new-user" };
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(2));
    if (finish === undefined) throw new Error("Save not started");
    finish({ success: true, response: response() });
    await nextTick();
    expect(view.container.querySelector("output")?.textContent).toBe("0");
    expect(api.applyAuth).not.toHaveBeenCalled();
  });
  it("protects a pending command even when local allocations return to the baseline, and discards only newer local edits on leave", async () => {
    viewer.value = { kind: "viewer", userId: "known-user" };
    const view = await mountTab();
    await view.click("mdi-plus");
    let finish:
      | ((value: {
          success: true;
          response: ReturnType<typeof response>;
        }) => void)
      | undefined;
    api.save.mockImplementationOnce(
      async () =>
        await new Promise((resolve) => {
          finish = resolve;
        })
    );
    await view.click("save");
    await view.click("mdi-minus");
    expect(view.container.textContent).not.toContain("unsaved");
    await view.router.push("/outside");
    expect(view.router.currentRoute.value.path).toBe("/conversation/qvtest01");
    await view.click("Confirm discard");
    await vi.waitFor(() =>
      expect(view.router.currentRoute.value.path).toBe("/outside")
    );
    if (finish === undefined) throw new Error("Save not started");
    finish({ success: true, response: response() });
    await vi.waitFor(() => expect(api.applyAuth).toHaveBeenCalledTimes(1));
    await view.router.push("/conversation/qvtest01");
    await vi.waitFor(() =>
      expect(view.container.querySelector("output")?.textContent).toBe("+1")
    );
    expect(view.container.textContent).not.toContain("unsaved");
  });
  it("does not roll back an accepted save when local identity installation fails", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    api.save.mockResolvedValue({ success: true, response: response() });
    api.applyAuth.mockRejectedValueOnce(new Error("Keystore unavailable"));
    await view.click("save");
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("sessionRefreshError")
    );
    expect(view.container.textContent).toContain("savedBaseline");
    expect(view.container.textContent).not.toContain("unsaved");
    await view.click("retry");
    await vi.waitFor(() =>
      expect(view.container.textContent).not.toContain("sessionRefreshError")
    );
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.applyAuth).toHaveBeenCalledTimes(1);
    expect(api.forceRefreshAuth).toHaveBeenCalledTimes(1);
  });
  it("blocks navigation and browser unload for dirty allocations, supports cancel and explicit discard", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await view.router.push("/outside");
    expect(view.router.currentRoute.value.path).toBe("/conversation/qvtest01");
    await view.click("Keep editing");
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    await view.router.push("/outside");
    await view.click("Confirm discard");
    await vi.waitFor(() =>
      expect(view.router.currentRoute.value.path).toBe("/outside")
    );
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
    await view.router.push("/conversation/qvtest01");
    await vi.waitFor(() =>
      expect(view.container.querySelector("output")?.textContent).toBe("0")
    );
    expect(api.fetchItems).toHaveBeenCalledTimes(1);
  });

  it("retains a dirty statement snapshot on refresh until confirmed discard", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    view.replaceItems([item({ version: "two" }), item({ slugId: "b" })]);
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("changed")
    );
    expect(view.container.querySelectorAll("output")).toHaveLength(1);
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    expect(
      [...view.container.querySelectorAll<HTMLButtonElement>(".adjust")].every(
        (button) => button.disabled
      )
    ).toBe(true);
    await view.click("discard");
    await view.click("Keep editing");
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    await view.click("discard");
    await view.click("Confirm discard");
    expect(view.container.querySelectorAll("output")).toHaveLength(2);
    expect(view.container.querySelector("output")?.textContent).toBe("0");
    expect(view.container.textContent).not.toContain("changed");
    expect(api.fetchItems).toHaveBeenCalledTimes(1);
  });

  it("refreshes clean statements without a prompt", async () => {
    const view = await mountTab();
    view.replaceItems([item({ version: "two" }), item({ slugId: "b" })]);
    await vi.waitFor(() =>
      expect(view.container.querySelectorAll("output")).toHaveLength(2)
    );
    expect(view.container.textContent).not.toContain("changed");
    await view.router.push("/outside");
    expect(view.router.currentRoute.value.path).toBe("/outside");
  });

  it.each(["closed", "locked"])(
    "disables allocation changes if the activity becomes %s",
    async (state) => {
      const view = await mountTab();
      await view.click("mdi-plus");
      if (state === "closed") view.data.value.metadata.isClosed = true;
      else
        view.data.value.metadata.moderation = {
          status: "moderated",
          action: "lock",
          reason: "spam",
          explanation: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      await nextTick();
      expect(
        [
          ...view.container.querySelectorAll<HTMLButtonElement>(".adjust"),
        ].every((button) => button.disabled)
      ).toBe(true);
      expect(view.container.querySelector("output")?.textContent).toBe("+1");
    }
  );

  it("never transfers unsaved allocations to another signed-in identity", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    viewer.value = { kind: "viewer", userId: "another-account" };
    await vi.waitFor(() =>
      expect(view.container.querySelector("output")?.textContent).toBe("0")
    );
    expect(view.container.textContent).not.toContain("unsaved");
  });

  it("does not expose the previous identity's statement snapshot while the new request is pending", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    let finishRequest:
      | ((value: { items: PrioritizationItem[] }) => void)
      | undefined;
    api.fetchItems.mockImplementationOnce(
      async () =>
        await new Promise<{ items: PrioritizationItem[] }>((resolve) => {
          finishRequest = resolve;
        })
    );
    viewer.value = { kind: "viewer", userId: "different-account" };
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(2));
    expect(view.container.querySelectorAll("output")).toHaveLength(0);
    expect(view.container.textContent).not.toContain("Proposal a");
    if (finishRequest === undefined) throw new Error("Request not started");
    finishRequest({ items: [item({ slugId: "b" })] });
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("Proposal b")
    );
    expect(view.container.querySelector("output")?.textContent).toBe("0");
  });

  it("preserves local edits through a transient refetch failure and re-enables controls after retry", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    api.fetchItems.mockRejectedValueOnce(new Error("Offline"));
    await view.refresh();
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("loadError")
    );
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    expect(
      [...view.container.querySelectorAll<HTMLButtonElement>(".adjust")].every(
        (button) => button.disabled
      )
    ).toBe(true);
    await view.refresh();
    await vi.waitFor(() =>
      expect(view.container.textContent).not.toContain("loadError")
    );
    await view.click("mdi-plus");
    expect(view.container.querySelector("output")?.textContent).toBe("+2");
  });

  it.each([401, 403, 404, 410])(
    "hides cached statement content after access is revoked (%s)",
    async (status) => {
      const view = await mountTab();
      await view.click("mdi-plus");
      const config = { headers: new AxiosHeaders() };
      api.fetchItems.mockRejectedValueOnce(
        new AxiosError("Access revoked", "ERR_BAD_REQUEST", config, undefined, {
          status,
          statusText: "Unavailable",
          headers: {},
          config,
          data: {},
        })
      );
      await view.refresh();
      await vi.waitFor(() =>
        expect(view.container.textContent).toContain("loadError")
      );
      expect(view.container.querySelectorAll("output")).toHaveLength(0);
      expect(view.container.textContent).not.toContain("Proposal a");
      await view.router.push("/outside");
      expect(view.router.currentRoute.value.path).toBe(
        "/conversation/qvtest01"
      );
      await view.click("Confirm discard");
      await vi.waitFor(() =>
        expect(view.router.currentRoute.value.path).toBe("/outside")
      );
    }
  );

  it("keeps dirty navigation protected when a later guard cancels an accepted discard", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    const removeGuard = view.router.beforeResolve(() => false);
    await view.router.push("/outside");
    const canceled = new Promise<void>((resolve) => {
      const removeAfter = view.router.afterEach((_to, _from, failure) => {
        if (failure !== undefined) {
          removeAfter();
          resolve();
        }
      });
    });
    await view.click("Confirm discard");
    await canceled;
    await nextTick();
    await vi.waitFor(() =>
      expect(view.container.querySelector("output")?.textContent).toBe("0")
    );
    removeGuard();
    await vi.waitFor(() =>
      expect(
        view.container.querySelector<HTMLButtonElement>(".increase")?.disabled
      ).toBe(false)
    );
    await view.click("mdi-plus");
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    await view.router.push("/outside");
    expect(view.router.currentRoute.value.path).toBe("/conversation/qvtest01");
    expect(view.container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });

  it("retains allocations when only a translation refreshes, without stale-content rejection", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    const translated = item();
    translated.displayContent = {
      sourceVersion: "one",
      status: "available",
      mode: "translated",
      content: { title: "Proposition traduite" },
      translationControl: null,
    };
    view.replaceItems([translated]);
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("Proposition traduite")
    );
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    expect(view.container.textContent).not.toContain("changed");
  });

  it("does not let an inactive cached tab refetch or block browser unload", async () => {
    const view = await mountTab();
    await view.router.push("/outside");
    await view.queryClient.invalidateQueries({
      queryKey: ["qv-load"],
    });
    expect(api.fetchItems).toHaveBeenCalledTimes(1);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("prompts before changing conversations but not for an in-place query update", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    await view.router.push("/conversation/qvtest01?view=statements");
    expect(view.router.currentRoute.value.query.view).toBe("statements");
    expect(view.container.querySelector("output")?.textContent).toBe("+1");
    await view.router.push("/conversation/other-qv");
    expect(view.router.currentRoute.value.path).toBe("/conversation/qvtest01");
    await view.click("Confirm discard");
    await vi.waitFor(() =>
      expect(view.router.currentRoute.value.path).toBe("/conversation/other-qv")
    );
    await vi.waitFor(() =>
      expect(view.container.querySelector("output")?.textContent).toBe("0")
    );
  });

  it("does not let a late response from a previous identity overwrite the new session", async () => {
    const view = await mountTab();
    await view.click("mdi-plus");
    let finishOld:
      | ((value: { items: PrioritizationItem[] }) => void)
      | undefined;
    api.fetchItems.mockImplementationOnce(
      async () =>
        await new Promise<{ items: PrioritizationItem[] }>((resolve) => {
          finishOld = resolve;
        })
    );
    const oldRefresh = view.refresh();
    await vi.waitFor(() => expect(api.fetchItems).toHaveBeenCalledTimes(2));
    api.fetchItems.mockResolvedValue({
      items: [item({ slugId: "new-user-item" })],
    });
    viewer.value = { kind: "viewer", userId: "new-user" };
    await vi.waitFor(() =>
      expect(view.container.textContent).toContain("Proposal new-user-item")
    );
    if (finishOld === undefined) throw new Error("Old request not started");
    finishOld({ items: [item({ slugId: "old-user-item" })] });
    await oldRefresh;
    expect(view.container.textContent).not.toContain("Proposal old-user-item");
    expect(view.container.querySelector("output")?.textContent).toBe("0");
  });
});
