import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, ref } from "vue";

const emailUpdatesApi = vi.hoisted(() => ({
  getConversationSummary: vi.fn(),
  updatePreference: vi.fn(),
}));
const exitToConversation = vi.hoisted(() => vi.fn());
const showNotifyMessage = vi.hoisted(() => vi.fn());

vi.mock("pinia", () => ({
  storeToRefs: (store: object) => store,
}));
vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: () => ({ isAuthInitialized: ref(true) }),
}));
vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => emailUpdatesApi,
}));
vi.mock("src/composables/conversation/useConversationOnboardingExit", () => ({
  useConversationOnboardingExit: () => ({ exitToConversation }),
}));
vi.mock("src/composables/conversation/useConversationOnboardingRoute", () => ({
  useConversationOnboardingRoute: () => ({
    routeConversationSlugId: ref("conversation-one"),
    routeContext: ref({ kind: "normal" }),
  }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({
    t: (key: string) =>
      key === "continueWithoutSavingLabel"
        ? "Continue without saving an Email Update choice"
        : key === "emailUpdatePreferenceSaveError"
          ? "Your Email Update choice could not be saved. Please try again."
          : key,
  }),
}));
vi.mock("src/utils/api/post/useConversationQuery", () => ({
  useConversationQuery: () => ({
    data: ref({
      conversationData: {
        metadata: {
          projectContext: { projectSlug: "project-one" },
        },
      },
      displayContent: undefined,
    }),
  }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage }),
}));
vi.mock("src/components/ui/ErrorRetryBlock.vue", () => ({
  default: defineComponent({
    name: "ErrorRetryBlock",
    emits: ["retry"],
    setup(_props, { emit }) {
      return () =>
        h("div", { role: "alert" }, [
          "Summary unavailable",
          h("button", { onClick: () => emit("retry") }, "Try again"),
        ]);
    },
  }),
}));
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("src/utils/survey/navigation", () => ({
  getConversationSurveySummaryPath: () => "/summary",
}));
vi.mock(
  "src/components/onboarding/backgrounds/ConversationSurveyOnboardingHero.vue",
  () => ({ default: defineComponent(() => () => null) })
);
vi.mock("src/layouts/OnboardingLayout.vue", () => ({
  default: defineComponent({
    name: "OnboardingLayout",
    setup(_props, { slots }) {
      return () => h("main", [slots.body?.(), slots.footer?.()]);
    },
  }),
}));
vi.mock(
  "src/components/onboarding/ConversationOnboardingCompleteStep.vue",
  () => ({
    default: defineComponent({
      name: "ConversationOnboardingCompleteStep",
      props: {
        conversationUpdatesChecked: { type: Boolean, required: true },
        showConversationUpdatesPreference: { type: Boolean, required: true },
        scopeKind: { type: String, required: true },
        isSaving: { type: Boolean, required: true },
        continueWithoutSavingLabel: { type: String, default: undefined },
      },
      emits: [
        "continue",
        "continueWithoutSaving",
        "reviewAnswers",
        "update:conversationUpdatesChecked",
      ],
      setup(props, { emit }) {
        return () =>
          h(
            "section",
            {
              "data-testid": "complete-step",
              "data-show-preference": String(
                props.showConversationUpdatesPreference
              ),
              "data-scope-kind": props.scopeKind,
              "data-saving": String(props.isSaving),
            },
            [
              h("button", { onClick: () => emit("continue") }, "Continue"),
              props.continueWithoutSavingLabel === undefined
                ? null
                : h(
                    "button",
                    { onClick: () => emit("continueWithoutSaving") },
                    props.continueWithoutSavingLabel
                  ),
              h(
                "button",
                {
                  onClick: () =>
                    emit(
                      "update:conversationUpdatesChecked",
                      !props.conversationUpdatesChecked
                    ),
                },
                "Toggle consent"
              ),
            ]
          );
      },
    }),
  })
);

import ConversationOnboardingComplete from "./complete.vue";

const mountedApps: App[] = [];

beforeEach(() => {
  emailUpdatesApi.getConversationSummary.mockReset();
  emailUpdatesApi.updatePreference.mockReset();
  exitToConversation.mockReset();
  showNotifyMessage.mockReset();
  exitToConversation.mockResolvedValue(undefined);
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("conversation onboarding completion", () => {
  it("shows project consent and saves it before exiting", async () => {
    emailUpdatesApi.getConversationSummary.mockResolvedValue({
      success: true,
      authoringAction: "none",
      participantPreference: {
        state: "undisclosed",
        resolvedEnabled: false,
        onboardingAction: {
          operation: "set_project_preference",
          projectSlug: "project-one",
          initialEnabled: true,
        },
      },
    });
    emailUpdatesApi.updatePreference.mockResolvedValue({
      success: true,
      result: {
        operation: "set_project_preference",
        projectSlug: "project-one",
        state: "enabled",
      },
    });
    const container = mountComponent();
    await flushPromises();

    const step = getStep(container);
    expect(step.dataset.showPreference).toBe("true");
    expect(step.dataset.scopeKind).toBe("project");

    getButton(container, "Continue").click();
    await flushPromises();

    expect(emailUpdatesApi.updatePreference).toHaveBeenCalledWith({
      operation: "set_project_preference",
      projectSlug: "project-one",
      enabled: true,
      source: "onboarding",
    });
    expect(exitToConversation).toHaveBeenCalledAfter(
      emailUpdatesApi.updatePreference
    );
  });

  it("does not exit when the preference save fails", async () => {
    emailUpdatesApi.getConversationSummary.mockResolvedValue({
      success: true,
      authoringAction: "none",
      participantPreference: {
        state: "undisclosed",
        resolvedEnabled: false,
        onboardingAction: {
          operation: "set_conversation_preference",
          conversationSlugId: "conversation-one",
          initialEnabled: true,
        },
      },
    });
    emailUpdatesApi.updatePreference.mockResolvedValue({
      success: false,
      reason: "preference_conflict",
    });
    const container = mountComponent();
    await flushPromises();

    expect(getStep(container).dataset.scopeKind).toBe("no-project");
    getButton(container, "Continue").click();
    await flushPromises();

    expect(exitToConversation).not.toHaveBeenCalled();
    expect(showNotifyMessage).toHaveBeenCalledWith({
      message: "Your Email Update choice could not be saved. Please try again.",
      force: true,
    });

    getButton(
      container,
      "Continue without saving an Email Update choice"
    ).click();
    await flushPromises();
    expect(emailUpdatesApi.updatePreference).toHaveBeenCalledOnce();
    expect(exitToConversation).toHaveBeenCalledOnce();
  });

  it("records an unchecked one-time prompt as declined", async () => {
    emailUpdatesApi.getConversationSummary.mockResolvedValue({
      success: true,
      authoringAction: "none",
      participantPreference: {
        state: "undisclosed",
        resolvedEnabled: false,
        onboardingAction: {
          operation: "set_conversation_preference",
          conversationSlugId: "conversation-one",
          initialEnabled: true,
        },
      },
    });
    emailUpdatesApi.updatePreference.mockResolvedValue({
      success: true,
      result: {
        operation: "set_conversation_preference",
        conversationPreferences: [
          { conversationSlugId: "conversation-one", state: "disabled" },
        ],
      },
    });
    const container = mountComponent();
    await flushPromises();

    getButton(container, "Toggle consent").click();
    getButton(container, "Continue").click();
    await flushPromises();

    expect(emailUpdatesApi.updatePreference).toHaveBeenCalledWith({
      operation: "set_conversation_preference",
      conversationSlugId: "conversation-one",
      enabled: false,
      source: "onboarding",
    });
  });

  it("offers retry or an explicit exit after a transient summary failure", async () => {
    emailUpdatesApi.getConversationSummary
      .mockResolvedValueOnce({
        success: false,
        reason: "summary_unavailable",
      })
      .mockResolvedValueOnce({
        success: true,
        authoringAction: "none",
        participantPreference: {
          state: "undisclosed",
          resolvedEnabled: false,
          onboardingAction: {
            operation: "set_conversation_preference",
            conversationSlugId: "conversation-one",
            initialEnabled: true,
          },
        },
      });
    const container = mountComponent();
    await flushPromises();

    expect(getStep(container).dataset.saving).toBe("true");
    getButton(container, "Continue").click();
    await flushPromises();
    expect(exitToConversation).not.toHaveBeenCalled();

    getButton(
      container,
      "Continue without saving an Email Update choice"
    ).click();
    await flushPromises();
    expect(emailUpdatesApi.updatePreference).not.toHaveBeenCalled();
    expect(exitToConversation).toHaveBeenCalledOnce();

    getButton(container, "Try again").click();
    await flushPromises();
    expect(getStep(container).dataset.saving).toBe("false");
    expect(getStep(container).dataset.showPreference).toBe("true");
  });

  it("allows continuing when the feature is unavailable", async () => {
    emailUpdatesApi.getConversationSummary.mockResolvedValue({
      success: false,
      reason: "feature_not_available",
    });
    const container = mountComponent();
    await flushPromises();

    expect(getStep(container).dataset.saving).toBe("false");
    expect(getStep(container).dataset.showPreference).toBe("false");
    getButton(container, "Continue").click();
    await flushPromises();

    expect(emailUpdatesApi.updatePreference).not.toHaveBeenCalled();
    expect(exitToConversation).toHaveBeenCalledOnce();
  });

  it("allows continuing when the conversation no longer exists", async () => {
    emailUpdatesApi.getConversationSummary.mockResolvedValue({
      success: false,
      reason: "conversation_not_found",
    });
    const container = mountComponent();
    await flushPromises();

    expect(getStep(container).dataset.saving).toBe("false");
    expect(getStep(container).dataset.showPreference).toBe("false");
    getButton(container, "Continue").click();
    await flushPromises();

    expect(emailUpdatesApi.updatePreference).not.toHaveBeenCalled();
    expect(exitToConversation).toHaveBeenCalledOnce();
  });

  it("allows an explicit no-save exit after a network summary failure", async () => {
    emailUpdatesApi.getConversationSummary.mockRejectedValue(
      new Error("network unavailable")
    );
    const container = mountComponent();
    await flushPromises();

    expect(getStep(container).dataset.saving).toBe("true");
    expect(getButton(container, "Try again")).toBeDefined();
    getButton(container, "Continue").click();
    await flushPromises();
    expect(exitToConversation).not.toHaveBeenCalled();

    getButton(
      container,
      "Continue without saving an Email Update choice"
    ).click();
    await flushPromises();
    expect(exitToConversation).toHaveBeenCalledOnce();
  });
});

function mountComponent(): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(ConversationOnboardingComplete);
  mountedApps.push(app);
  app.mount(container);
  return container;
}

function getStep(container: HTMLElement): HTMLElement {
  const step = container.querySelector<HTMLElement>(
    '[data-testid="complete-step"]'
  );
  if (step === null) {
    throw new Error("Completion step not found");
  }
  return step;
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
