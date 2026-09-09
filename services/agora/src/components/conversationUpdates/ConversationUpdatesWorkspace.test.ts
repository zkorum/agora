import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { Dto } from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick } from "vue";
import { createI18n } from "vue-i18n";

const api = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  estimateAudience: vi.fn(),
  listHistory: vi.fn(),
  prepareDraft: vi.fn(),
  cancelDraft: vi.fn(),
  sendTest: vi.fn(),
  getTestStatus: vi.fn(),
  send: vi.fn(),
  getHistoryDetail: vi.fn(),
}));
const showNotifyMessage = vi.hoisted(() => vi.fn());
const navigation = vi.hoisted(() => {
  const guards: {
    leave?: () => Promise<boolean>;
    update?: () => Promise<boolean>;
  } = {};
  return { ...guards, replace: vi.fn(), push: vi.fn() };
});
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
vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: () => ({ userId: "author" }),
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ fullPath: "/email-updates/?tab=compose", query: {} }),
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  onBeforeRouteLeave: (guard: () => Promise<boolean>) => {
    navigation.leave = guard;
  },
  onBeforeRouteUpdate: (guard: () => Promise<boolean>) => {
    navigation.update = guard;
  },
}));
vi.mock("./ConversationUpdateComposerForm.vue", () => ({
  default: defineComponent({
    props: {
      subject: { type: String, required: true },
      bodyHtml: { type: String, required: true },
      preparePending: Boolean,
      selectedConversationIds: { type: Array, required: true },
    },
    emits: [
      "review",
      "update:subject",
      "update:bodyHtml",
      "update:bodyPlainText",
    ],
    setup(props, { emit }) {
      return () =>
        h("section", { "data-composer": "" }, [
          h("input", {
            value: props.subject,
            onInput: (event: Event) => {
              if (event.target instanceof HTMLInputElement)
                emit("update:subject", event.target.value);
            },
          }),
          h("span", props.bodyHtml),
          h("span", JSON.stringify(props.selectedConversationIds)),
          h(
            "button",
            {
              onClick: () => {
                emit("update:subject", "My draft");
                emit("update:bodyHtml", "<p>My message</p>");
                emit("update:bodyPlainText", "My message");
              },
            },
            "Write draft"
          ),
          h(
            "button",
            { disabled: props.preparePending, onClick: () => emit("review") },
            "Review email"
          ),
        ]);
    },
  }),
}));
vi.mock("./ConversationUpdateEmailPreview.vue", () => ({
  default: defineComponent({
    props: { review: { type: Object, required: true } },
    setup(props) {
      return () =>
        h("div", { "data-preview": "" }, JSON.stringify(props.review));
    },
  }),
}));
vi.mock("./ConversationUpdateHistoryList.vue", () => ({
  default: defineComponent(() => () => h("div", "History records")),
}));
vi.mock("src/components/ui/PageLoadingSpinner.vue", () => ({
  default: defineComponent(() => () => h("p", "Loading")),
}));
vi.mock("src/components/ui/ErrorRetryBlock.vue", () => ({
  default: defineComponent({
    props: {
      title: { type: String, required: true },
      retryLabel: { type: String, required: true },
    },
    emits: ["retry"],
    setup(props, { emit }) {
      return () =>
        h("div", [
          h("p", props.title),
          h("button", { onClick: () => emit("retry") }, props.retryLabel),
        ]);
    },
  }),
}));
vi.mock("src/components/ui-library/ZKInfoBanner.vue", () => ({
  default: defineComponent({
    props: { message: { type: String, required: true } },
    setup(props) {
      return () => h("p", props.message);
    },
  }),
}));
vi.mock("primevue/button", () => ({
  default: defineComponent({
    props: {
      label: { type: String, required: true },
      disabled: Boolean,
      loading: Boolean,
    },
    emits: ["click"],
    setup(props, { emit }) {
      return () =>
        h(
          "button",
          {
            disabled: props.disabled,
            "data-loading": props.loading,
            onClick: () => emit("click"),
          },
          props.label
        );
    },
  }),
}));
vi.mock("src/components/ui-library/ZKCheckbox.vue", () => ({
  default: defineComponent({
    props: { modelValue: Boolean, disabled: Boolean },
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      return () =>
        h(
          "button",
          {
            disabled: props.disabled,
            onClick: () => emit("update:modelValue", !props.modelValue),
          },
          "Acknowledge policy"
        );
    },
  }),
}));
vi.mock("src/components/ui-library/ZKConfirmDialog.vue", () => ({
  default: defineComponent({
    props: {
      modelValue: Boolean,
      title: { type: String, required: true },
      persistent: Boolean,
    },
    emits: ["confirm", "cancel", "update:modelValue"],
    setup(props, { emit, slots }) {
      return () =>
        props.modelValue
          ? h(
              "div",
              {
                "data-dialog": props.title,
                "data-persistent": props.persistent,
              },
              [
                h("h2", props.title),
                slots.default?.(),
                h(
                  "button",
                  {
                    onClick: () => {
                      emit("confirm");
                      emit("update:modelValue", false);
                    },
                  },
                  `Confirm: ${props.title}`
                ),
                h(
                  "button",
                  {
                    onClick: () => {
                      emit("cancel");
                      emit("update:modelValue", false);
                    },
                  },
                  `Stay: ${props.title}`
                ),
              ]
            )
          : null;
    },
  }),
}));
import ConversationUpdatesWorkspace from "./ConversationUpdatesWorkspace.vue";

const updateId = "00000000-0000-4000-8000-000000000001";
const testAttemptId = "00000000-0000-4000-8000-000000000002";
const prepared = Dto.conversationEmailUpdatePrepareDraftResponse.parse({
  success: true,
  review: {
    updateId,
    preview: {
      subject: "Locked subject",
      html: "Server HTML",
      text: "Server text",
    },
    language: "ar",
    senderName: "Server sender",
    replyToName: "Server reply",
    replyToEmail: "reply@example.com",
    branding: { name: "Server brand", palette: "blue" },
    unsubscribeScope: "project",
    estimatedEligibleRecipientCount: 42,
    requiredOwnerCopyCount: 2,
    testDestinationEmail: "test@example.com",
    expiresAt: new Date("2099-01-01"),
  },
});
const delivered = Dto.conversationEmailUpdateHistoryDetailResponse.parse({
  success: true,
  record: {
    updateId,
    subject: "Locked subject",
    bodyHtml: "<p>My message</p>",
    unsubscribeScope: "project",
    scope: {
      kind: "project",
      projectSlug: "project-one",
      title: "Project One",
    },
    conversations: [
      { conversationSlugId: "conv000001", title: "Conversation One" },
    ],
    audienceEstimate: 42,
    ownerCopyCount: 2,
    acceptedAt: new Date(),
    status: "queued",
  },
});
let app: App | undefined;
let queryClient: QueryClient;
beforeEach(() => {
  vi.useFakeTimers();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  api.getWorkspace.mockResolvedValue(
    Dto.conversationEmailUpdateWorkspaceResponse.parse({
      success: true,
      resolvedContext: { kind: "global" },
      testDestinationEmail: "verified@example.com",
      scopes: [
        {
          kind: "project",
          projectSlug: "project-one",
          title: "Project One",
          unsubscribeScope: "project",
          participantContactEmail: "contact@example.com",
          conversations: [
            {
              conversationSlugId: "conv000001",
              title: "Conversation One",
              participationMode: "account_required",
              estimatedEligibleRecipientCount: 10,
              sendingEnabled: true,
            },
          ],
        },
      ],
    })
  );
  api.estimateAudience.mockResolvedValue({
    success: true,
    estimatedEligibleRecipientCount: 10,
    requiredOwnerCopyCount: 1,
  });
  api.prepareDraft.mockResolvedValue(prepared);
  api.cancelDraft.mockResolvedValue({ success: true });
  api.sendTest.mockResolvedValue({
    success: true,
    updateId,
    testAttemptId,
    status: "pending",
  });
  api.getTestStatus.mockResolvedValue({
    success: true,
    status: { state: "provider_accepted", providerAcceptedAt: new Date() },
  });
  api.listHistory.mockResolvedValue({ success: true, items: [] });
  api.getHistoryDetail.mockResolvedValue(delivered);
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  queryClient.clear();
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetAllMocks();
});
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  await nextTick();
}
async function mountWorkspace(pinia = createPinia()) {
  const container = document.createElement("div");
  document.body.append(container);
  app = createApp(ConversationUpdatesWorkspace, {
    initialTab: "compose",
    context: { kind: "global" },
  });
  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });
  app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
  app.component(
    "QTabs",
    defineComponent({
      emits: ["update:modelValue"],
      setup(_props, { emit, slots }) {
        return () =>
          h("div", [
            slots.default?.(),
            h(
              "button",
              { onClick: () => emit("update:modelValue", "history") },
              "History tab"
            ),
          ]);
      },
    })
  );
  app.component(
    "QTab",
    defineComponent(() => () => null)
  );
  app.mount(container);
  await vi.advanceTimersByTimeAsync(300);
  await nextTick();
  return container;
}
function click({
  container,
  label,
}: {
  container: HTMLElement;
  label: string;
}): void {
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === label
  );
  expect(button, label).toBeDefined();
  button?.click();
}
async function openReview(container: HTMLElement): Promise<void> {
  click({ container, label: "Write draft" });
  await nextTick();
  click({ container, label: "Review email" });
  await flush();
}
async function requestTest(container: HTMLElement): Promise<void> {
  click({ container, label: "Send test email" });
  await nextTick();
  click({ container, label: "Confirm: Send this test email?" });
  await flush();
}
async function requestFinalSend(container: HTMLElement): Promise<void> {
  await requestTest(container);
  await vi.advanceTimersByTimeAsync(1500);
  click({ container, label: "Acknowledge policy" });
  await nextTick();
  click({ container, label: "Send update" });
  await nextTick();
  click({ container, label: "Confirm: Send this update?" });
  await flush();
}
describe("locked review workspace", () => {
  it("restores composer content but never review or test IDs after route remount", async () => {
    const pinia = createPinia();
    const container = await mountWorkspace(pinia);
    await openReview(container);
    await requestTest(container);
    const navigationResult = navigation.leave?.();
    await nextTick();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(await navigationResult).toBe(true);
    app?.unmount();
    const reopened = await mountWorkspace(pinia);
    expect(reopened.querySelector("input")?.value).toBe("My draft");
    expect(reopened.textContent).toContain("<p>My message</p>");
    expect(reopened.querySelector("[data-preview]")).toBeNull();
    expect(api.prepareDraft).toHaveBeenCalledTimes(1);
    expect(api.sendTest).toHaveBeenCalledTimes(1);
  });
  it("prepares without UI language and displays backend review metadata even when its language differs", async () => {
    const container = await mountWorkspace();
    expect(container.querySelector("[data-preview], iframe")).toBeNull();
    await openReview(container);
    expect(api.prepareDraft).toHaveBeenCalledWith({
      selection: {
        kind: "project",
        projectSlug: "project-one",
        conversationSlugIds: ["conv000001"],
      },
      subject: "My draft",
      bodyHtml: "<p>My message</p>",
    });
    expect(container.querySelector("[data-composer], input")).toBeNull();
    expect(container.textContent).toContain("Locked subject");
    expect(container.textContent).toContain("Server sender");
    expect(container.textContent).toContain("test@example.com");
    expect(container.querySelector("[data-preview]")?.textContent).toContain(
      '"language":"ar"'
    );
    expect(api.sendTest).not.toHaveBeenCalled();
  });
  it("Stay preserves review and Leave waits for cancel before restoring composer", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    await requestTest(container);
    click({ container, label: "Back to editing" });
    await nextTick();
    expect(container.textContent).toContain("You must send a new test");
    expect(
      container
        .querySelector('[data-dialog="Leave this review?"]')
        ?.getAttribute("data-persistent")
    ).toBe("true");
    click({ container, label: "Stay: Leave this review?" });
    await flush();
    expect(api.cancelDraft).not.toHaveBeenCalled();
    expect(container.querySelector("[data-preview]")).not.toBeNull();
    const cancel = Promise.withResolvers<{ success: true }>();
    api.cancelDraft.mockReturnValueOnce(cancel.promise);
    click({ container, label: "Back to editing" });
    await nextTick();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(container.querySelector("[data-composer]")).toBeNull();
    cancel.resolve({ success: true });
    await flush();
    expect(container.querySelector("input")?.value).toBe("My draft");
    expect(container.textContent).toContain("<p>My message</p>");
    click({ container, label: "Review email" });
    await flush();
    expect(api.prepareDraft).toHaveBeenCalledTimes(2);
    expect(
      [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "Send update"
      )?.disabled
    ).toBe(true);
  });
  it("keeps review on cancellation failure and allows Stay or retry", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    api.cancelDraft.mockRejectedValueOnce(new Error("Offline"));
    click({ container, label: "Back to editing" });
    await nextTick();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(container.textContent).toContain("Cancellation was not confirmed");
    expect(container.querySelector("[data-composer]")).toBeNull();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(container.querySelector("[data-composer]")).not.toBeNull();
    expect(api.cancelDraft).toHaveBeenCalledTimes(2);
  });
  it("routes only after cancellation succeeds and warns natively before unload", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    const route = navigation.leave?.();
    await nextTick();
    click({ container, label: "Stay: Leave this review?" });
    expect(await route).toBe(false);
    const retry = navigation.update?.();
    await nextTick();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(await retry).toBe(true);
    expect(api.cancelDraft).toHaveBeenCalledWith({ updateId });
  });
  it("cancels stale prepare after navigation without resurrecting review", async () => {
    const container = await mountWorkspace();
    const pending =
      Promise.withResolvers<
        ReturnType<typeof Dto.conversationEmailUpdatePrepareDraftResponse.parse>
      >();
    api.prepareDraft.mockReturnValueOnce(pending.promise);
    await openReview(container);
    expect(await navigation.leave?.()).toBe(true);
    pending.resolve(prepared);
    await flush();
    expect(container.querySelector("[data-preview]")).toBeNull();
    expect(api.cancelDraft).toHaveBeenCalledWith({ updateId });
  });
  it("uses snapshot estimate in final confirmation and blocks navigation during send", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    await requestTest(container);
    await vi.advanceTimersByTimeAsync(1500);
    click({ container, label: "Acknowledge policy" });
    await nextTick();
    click({ container, label: "Send update" });
    await nextTick();
    expect(container.textContent).toContain("Currently 42 eligible recipients");
    const pending = Promise.withResolvers<unknown>();
    api.send.mockReturnValueOnce(pending.promise);
    click({ container, label: "Confirm: Send this update?" });
    await flush();
    expect(await navigation.leave?.()).toBe(false);
    expect(api.cancelDraft).not.toHaveBeenCalled();
    expect(api.send).toHaveBeenCalledWith({
      updateId,
      testAttemptId,
      displayedParticipantEstimate: 42,
      contentPolicyAcknowledged: true,
    });
    pending.resolve({
      success: false,
      reason: "required_owner_copy_unavailable",
    });
    await flush();
    expect(container.querySelector("[data-preview]")).not.toBeNull();
  });
  it("Cancel update clears the whole operation only after confirmation", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    click({ container, label: "Cancel update" });
    await nextTick();
    expect(container.textContent).toContain(
      "clears your subject, message, and selection"
    );
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(container.querySelector("input")?.value).toBe("");
    expect(container.textContent).not.toContain("<p>My message</p>");
    expect(container.textContent).toContain("[]");
  });
  it("switching to history invalidates review but retains the message", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    click({ container, label: "History tab" });
    await nextTick();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(container.textContent).toContain("History records");
    expect(api.cancelDraft).toHaveBeenCalledWith({ updateId });
  });
  it("clears a failed exit on Stay without leaving a dangling Retry or invalidating the test", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    await requestTest(container);
    await vi.advanceTimersByTimeAsync(1500);
    click({ container, label: "Acknowledge policy" });
    await nextTick();
    const snapshot = container.querySelector("[data-preview]")?.textContent;
    api.cancelDraft.mockRejectedValueOnce(new Error("Offline"));
    const leaving = navigation.leave?.();
    await nextTick();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(container.textContent).toContain("Cancellation was not confirmed");
    click({ container, label: "Stay: Leave this review?" });
    await flush();
    expect(await leaving).toBe(false);
    expect(container.textContent).not.toContain(
      "Cancellation was not confirmed"
    );
    expect(
      [...container.querySelectorAll("button")].some(
        (button) => button.textContent === "Retry"
      )
    ).toBe(false);
    expect(container.querySelector("[data-preview]")?.textContent).toBe(
      snapshot
    );
    expect(
      [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "Send update"
      )?.disabled
    ).toBe(false);
    expect(api.sendTest).toHaveBeenCalledTimes(1);
    click({ container, label: "Back to editing" });
    await nextTick();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(container.querySelector("[data-composer]")).not.toBeNull();
  });
  it("offers only same-request final retry when the acceptance response is lost", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    api.send.mockRejectedValueOnce(new Error("Response lost"));
    await requestFinalSend(container);
    expect(container.textContent).toContain("Delivery was not confirmed");
    expect(container.textContent).not.toContain(
      "Nobody else receives anything"
    );
    expect(showNotifyMessage).toHaveBeenLastCalledWith(
      expect.stringContaining("may already have been accepted")
    );
    expect(
      [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "Send another test email"
      )?.disabled
    ).toBe(true);
    click({ container, label: "Send another test email" });
    expect(api.sendTest).toHaveBeenCalledTimes(1);
    api.send.mockResolvedValueOnce(delivered);
    click({ container, label: "Retry same send request" });
    await flush();
    expect(api.send.mock.calls[1]).toEqual(api.send.mock.calls[0]);
    expect(container.textContent).toContain("History records");
    expect(container.querySelector("[data-dialog]")).toBeNull();
  });
  it("resolves a lost accepted send through cancellation and shows history rather than the exit dialog", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    api.send.mockRejectedValueOnce(new Error("Response lost"));
    await requestFinalSend(container);
    api.cancelDraft.mockResolvedValueOnce({
      success: false,
      reason: "delivery_already_accepted",
    });
    const leaving = navigation.leave?.();
    await nextTick();
    expect(container.textContent).toContain(
      "Leaving cannot stop an accepted delivery"
    );
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(await leaving).toBe(false);
    expect(api.getHistoryDetail).toHaveBeenCalledWith({ updateId });
    expect(container.textContent).toContain("History records");
    expect(container.querySelector("[data-dialog]")).toBeNull();
    expect(container.textContent).not.toContain(
      "Cancellation was not confirmed"
    );
  });
  it("uses history-only retry after definitive acceptance but a failed detail lookup", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    api.cancelDraft.mockResolvedValueOnce({
      success: false,
      reason: "delivery_already_accepted",
    });
    api.getHistoryDetail.mockRejectedValueOnce(new Error("Offline"));
    const leaving = navigation.leave?.();
    await nextTick();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(await leaving).toBe(false);
    expect(container.querySelector("[data-dialog]")).toBeNull();
    expect(container.textContent).toContain(
      "This update has already been accepted"
    );
    click({ container, label: "Check accepted delivery" });
    await flush();
    expect(api.cancelDraft).toHaveBeenCalledTimes(1);
    expect(api.getHistoryDetail).toHaveBeenCalledTimes(2);
    expect(api.send).not.toHaveBeenCalled();
    expect(container.textContent).toContain("History records");
  });
  it("lets a missing review exit safely without a cancellation error", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    api.cancelDraft.mockResolvedValueOnce({
      success: false,
      reason: "review_not_found",
    });
    click({ container, label: "Back to editing" });
    await nextTick();
    click({ container, label: "Confirm: Leave this review?" });
    await flush();
    expect(container.querySelector("input")?.value).toBe("My draft");
    expect(container.querySelector("[data-dialog]")).toBeNull();
    expect(container.textContent).not.toContain(
      "Cancellation was not confirmed"
    );
  });
  it("labels an unknown test as same-request retry, then resumes polling without another confirmation", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    api.sendTest.mockRejectedValueOnce(new Error("Response lost"));
    await requestTest(container);
    expect(container.textContent).toContain("It may already be queued");
    expect(container.textContent).not.toContain("Send another test email");
    expect(showNotifyMessage).toHaveBeenLastCalledWith(
      expect.stringContaining("Retry the same request")
    );
    api.getTestStatus.mockResolvedValueOnce({
      success: true,
      status: { state: "pending" },
    });
    click({ container, label: "Retry same test request" });
    await flush();
    expect(container.querySelector("[data-dialog]")).toBeNull();
    expect(api.sendTest.mock.calls[1]).toEqual(api.sendTest.mock.calls[0]);
    expect(container.textContent).toContain("Sending test email...");
    await vi.advanceTimersByTimeAsync(2000);
    expect(container.textContent).toContain("Send another test email");
  });
  it.each(["transport", "unavailable"])(
    "retries a %s status failure without submitting another test",
    async (failure) => {
      const container = await mountWorkspace();
      await openReview(container);
      click({ container, label: "Acknowledge policy" });
      await nextTick();
      if (failure === "transport")
        api.getTestStatus.mockRejectedValueOnce(new Error("Offline"));
      else
        api.getTestStatus.mockResolvedValueOnce({
          success: false,
          reason: "test_status_unavailable",
        });
      await requestTest(container);
      expect(api.getTestStatus).toHaveBeenCalledTimes(1);
      const errorMessage =
        "The test status is temporarily unavailable. Keep checking the existing test instead of requesting another.";
      expect(container.textContent).toContain(errorMessage);
      const testButton = [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "Sending test email..."
      );
      expect(testButton?.disabled).toBe(true);
      expect(testButton?.getAttribute("data-loading")).toBe("false");
      expect(container.querySelector('[data-loading="true"]')).toBeNull();
      const sendButton = [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "Send update"
      );
      expect(sendButton?.disabled).toBe(true);
      click({ container, label: "Sending test email..." });
      click({ container, label: "Send update" });
      expect(container.querySelector("[data-dialog]")).toBeNull();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(api.getTestStatus).toHaveBeenCalledTimes(1);
      const status = Promise.withResolvers<unknown>();
      api.getTestStatus.mockReturnValueOnce(status.promise);
      click({ container, label: "Retry" });
      await flush();
      expect(container.querySelector("[data-dialog]")).toBeNull();
      expect(container.textContent).not.toContain(errorMessage);
      expect(
        container.querySelector('[data-loading="true"]')?.textContent
      ).toBe("Sending test email...");
      expect(testButton?.disabled).toBe(true);
      expect(sendButton?.disabled).toBe(true);
      expect(api.getTestStatus).toHaveBeenCalledTimes(2);
      expect(api.getTestStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          request: { testAttemptId },
          signal: expect.any(AbortSignal),
        })
      );
      expect(api.sendTest).toHaveBeenCalledTimes(1);
      expect(api.prepareDraft).toHaveBeenCalledTimes(1);
      status.resolve({
        success: true,
        status: { state: "provider_accepted", providerAcceptedAt: new Date() },
      });
      await flush();
      expect(container.querySelector('[data-loading="true"]')).toBeNull();
      expect(container.textContent).not.toContain(errorMessage);
      expect(container.textContent).toContain("Send another test email");
      expect(sendButton?.disabled).toBe(false);
      click({ container, label: "Acknowledge policy" });
      await nextTick();
      expect(sendButton?.disabled).toBe(true);
      click({ container, label: "Acknowledge policy" });
      await nextTick();
      expect(sendButton?.disabled).toBe(false);
      click({ container, label: "Send update" });
      await nextTick();
      expect(
        container.querySelector('[data-dialog="Send this update?"]')
      ).not.toBeNull();
      expect(api.send).not.toHaveBeenCalled();
      expect(api.sendTest).toHaveBeenCalledTimes(1);
      expect(api.prepareDraft).toHaveBeenCalledTimes(1);
    }
  );
  it("continues successful pending status polling every two seconds beyond a minute", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    const submission = Promise.withResolvers<unknown>();
    api.sendTest.mockReturnValueOnce(submission.promise);
    api.getTestStatus.mockResolvedValue({
      success: true,
      status: { state: "pending" },
    });
    await requestTest(container);
    expect(container.querySelector('[data-loading="true"]')?.textContent).toBe(
      "Sending test email..."
    );
    expect(api.getTestStatus).not.toHaveBeenCalled();
    submission.resolve({
      success: true,
      updateId,
      testAttemptId,
      status: "pending",
    });
    await flush();
    expect(api.getTestStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(62_000);
    expect(api.getTestStatus).toHaveBeenCalledTimes(32);
    expect(container.querySelector('[data-loading="true"]')?.textContent).toBe(
      "Sending test email..."
    );
    expect(
      [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "Sending test email..."
      )?.disabled
    ).toBe(true);
    expect(
      [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "Send update"
      )?.disabled
    ).toBe(true);
    expect(container.textContent).not.toContain(
      "The test status is temporarily unavailable"
    );
    expect(api.sendTest).toHaveBeenCalledTimes(1);
    expect(api.prepareDraft).toHaveBeenCalledTimes(1);
    api.getTestStatus.mockResolvedValueOnce({
      success: true,
      status: { state: "provider_accepted", providerAcceptedAt: new Date() },
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect(api.getTestStatus).toHaveBeenCalledTimes(33);
    expect(container.querySelector('[data-loading="true"]')).toBeNull();
    expect(container.textContent).toContain("Send another test email");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(api.getTestStatus).toHaveBeenCalledTimes(33);
  });
  it.each([
    {
      reason: "request_id_conflict",
      expected: "This request ID belongs to another operation.",
    },
    { reason: "review_expired", expected: "This review is no longer active." },
    {
      reason: "sending_disabled",
      expected: "Email Updates are currently disabled",
    },
  ])(
    "shows explicit DTO copy for $reason, not a transport-failure fallback",
    async ({ reason, expected }) => {
      const container = await mountWorkspace();
      await openReview(container);
      api.sendTest.mockResolvedValueOnce(
        Dto.conversationEmailUpdateSendTestResponse.parse({
          success: false,
          error: { reason },
        })
      );
      await requestTest(container);
      expect(showNotifyMessage).toHaveBeenLastCalledWith(
        expect.stringContaining(expected)
      );
      expect(container.textContent).not.toContain("Retry same test request");
    }
  );
  it("uses the parsed DTO rate-limit time rather than reporting an unknown send", async () => {
    const container = await mountWorkspace();
    await openReview(container);
    const retryAt = new Date("2026-10-01T12:00:00Z");
    api.sendTest.mockResolvedValueOnce(
      Dto.conversationEmailUpdateSendTestResponse.parse({
        success: false,
        error: { reason: "test_rate_limited", retryAt },
      })
    );
    await requestTest(container);
    expect(showNotifyMessage).toHaveBeenLastCalledWith(
      `Too many requests. Try again after ${retryAt.toLocaleString("en")}.`
    );
    expect(container.textContent).not.toContain("Retry same test request");
  });
});
