import { createPinia, setActivePinia } from "pinia";
import type * as QuasarModule from "quasar";
import type { ConversationProjectSelectOption } from "src/components/newConversation/conversationProjectSelect";
import type { PostAsSettings } from "src/composables/conversation/draft";
import type {
  GetConversationForEditResponse,
  UpdateConversationRequest,
  UpdateConversationResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  buildEditConversationRequest,
  useEditConversationStore,
} from "src/stores/editConversation";
import type { GenerateSeedSuggestionsResult } from "src/utils/api/seedSuggestion/seedSuggestion";
import type * as ProcessEnvModule from "src/utils/processEnv";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type App,
  createApp,
  type FunctionalComponent,
  h,
  nextTick,
  ref,
} from "vue";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";

const mocks = vi.hoisted(() => ({
  save: vi.fn<
    (request: UpdateConversationRequest) => Promise<UpdateConversationResponse>
  >(),
  getForEdit:
    vi.fn<(slug: string) => Promise<GetConversationForEditResponse>>(),
  notify: vi.fn(),
  generateSeedSuggestions:
    vi.fn<() => Promise<GenerateSeedSuggestionsResult>>(),
  recordSeedSuggestionUse: vi.fn(),
  aiSuggestionsEnabled: false,
}));
vi.mock("src/utils/processEnv", async (importOriginal) => {
  const actual = await importOriginal<typeof ProcessEnvModule>();
  return {
    ...actual,
    processEnv: {
      ...actual.processEnv,
      VITE_TURNSTILE_SITE_KEY: undefined,
      get VITE_AI_SUGGESTIONS_ENABLED() {
        return mocks.aiSuggestionsEnabled ? "true" : "false";
      },
    },
  };
});
vi.mock("src/utils/api/seedSuggestion/seedSuggestion", () => ({
  useBackendSeedSuggestionApi: () => ({
    generateSeedSuggestions: mocks.generateSeedSuggestions,
    recordSeedSuggestionUse: mocks.recordSeedSuggestionUse,
  }),
}));
vi.mock("src/utils/api/post/useConversationMutations", () => ({
  useUpdateConversationMutation: () => ({ mutateAsync: mocks.save }),
}));
vi.mock("src/utils/api/post/postEdit", () => ({
  useBackendPostEditApi: () => ({ getConversationForEdit: mocks.getForEdit }),
}));
vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => ({
    getConfiguration: vi.fn(() =>
      Promise.resolve({ success: false, reason: "feature_not_available" })
    ),
  }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: mocks.notify }),
}));
vi.mock("quasar", async (importOriginal) => {
  const actual = await importOriginal<typeof QuasarModule>();
  return {
    ...actual,
    useQuasar: () => ({
      lang: { rtl: false },
      platform: { is: { mobile: false } },
    }),
  };
});
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: (texts: { en: Record<string, string> }) => ({
    t: (key: string) => texts.en[key] ?? key,
    locale: ref("en"),
  }),
}));
vi.mock("src/utils/api/survey/useSurveyQueries", () => ({
  useSurveyCompletionCountsQuery: () => ({ data: ref(undefined) }),
  useSurveyConfigDeleteMutation: () => ({ mutateAsync: vi.fn() }),
  useSurveyConfigUpdateMutation: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("src/components/survey/SurveyConfigEditor.vue", () => ({
  default: () => h("div", { "data-survey-editor": "" }),
}));
vi.mock("src/components/survey/SurveyCompletionCountsCard.vue", () => ({
  default: () => null,
}));
vi.mock(
  "src/components/newConversation/NewConversationLayout.vue",
  async () => {
    const { h } = await import("vue");
    const component: FunctionalComponent = (_, { slots }) =>
      h("main", slots.default?.({ isActive: true }));
    return { default: component };
  }
);
vi.mock("src/components/navigation/header/DefaultMenuBar.vue", async () => {
  const { h } = await import("vue");
  const component: FunctionalComponent = (_, { slots }) =>
    h("nav", [slots.left?.(), slots.right?.()]);
  return { default: component };
});
vi.mock("src/components/navigation/buttons/BackButton.vue", async () => {
  const { h } = await import("vue");
  const component: FunctionalComponent = (_, { emit }) =>
    h(
      "button",
      { onClick: (event: MouseEvent) => emit("click", event) },
      "Back"
    );
  component.emits = ["click"];
  return { default: component };
});
vi.mock("src/components/features/conversation/ConversationTitle.vue", () => ({
  default: () => null,
}));
vi.mock("src/components/newConversation/NewConversationControlBar.vue", () => ({
  default: Object.assign(
    (
      props: { postAs: PostAsSettings },
      { emit, slots }: Parameters<FunctionalComponent>[1]
    ) =>
      h("div", [
        h(
          "span",
          { "data-post-as": "" },
          props.postAs.organizationName || "personal"
        ),
        h(
          "button",
          {
            onClick: () =>
              emit("update:postAs", {
                postAsOrganization: true,
                organizationName: "owner",
              }),
          },
          "Post as owner"
        ),
        h(
          "button",
          {
            onClick: () =>
              emit("update:postAs", {
                postAsOrganization: false,
                organizationName: "",
              }),
          },
          "Post as personal"
        ),
        slots["extra-controls"]?.(),
      ]),
    { props: ["postAs"], emits: ["update:postAs"] }
  ),
}));
vi.mock("src/components/newConversation/ConversationProjectSelect.vue", () => ({
  default: Object.assign(
    (
      props: { options: ConversationProjectSelectOption[] },
      { emit }: Parameters<FunctionalComponent>[1]
    ) =>
      h(
        "div",
        { "data-project-options": "" },
        props.options.map((option) =>
          h(
            "button",
            {
              onClick: () => emit("update:modelValue", option.target),
            },
            "title" in option ? option.title : "No project"
          )
        )
      ),
    { props: ["options"], emits: ["update:modelValue"] }
  ),
}));
vi.mock(
  "src/components/newConversation/ConversationProjectLanguageSettings.vue",
  () => ({ default: () => null })
);
vi.mock("src/components/editor/Editor.vue", async () => {
  const { defineComponent, h, ref } = await import("vue");
  return {
    __esModule: true,
    default: defineComponent({
      props: { modelValue: { type: String, required: true } },
      emits: ["update:modelValue"],
      setup: (props, { emit, expose }) => {
        const field = ref<HTMLTextAreaElement>();
        expose({ focus: () => field.value?.focus() });
        return () =>
          h("textarea", {
            ref: field,
            value: props.modelValue,
            onInput: (event: Event) => {
              if (event.target instanceof HTMLTextAreaElement)
                emit("update:modelValue", event.target.value);
            },
          });
      },
    }),
  };
});
vi.mock("src/components/ui-library/ZKConfirmDialog.vue", async () => {
  const { h } = await import("vue");
  const component: FunctionalComponent<{ modelValue: boolean }> = (
    props,
    { emit }
  ) =>
    props.modelValue
      ? h("button", { onClick: () => emit("confirm") }, "Discard changes")
      : null;
  component.props = { modelValue: Boolean };
  component.emits = ["confirm"];
  return { default: component };
});

import DetailsPage from "../index.vue";
import SurveyPage from "../survey/index.vue";
import SeedPage from "./index.vue";

const apps: App[] = [];
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  vi.clearAllMocks();
  mocks.getForEdit.mockReset();
  mocks.aiSuggestionsEnabled = false;
});

async function mountFlow({
  newSeeds = ["New seed"],
  detailsChanged = true,
  canEditSeed = true,
  initialSession = "cached",
  page = "seed",
  returnTo = "/",
}: {
  newSeeds?: string[];
  detailsChanged?: boolean;
  canEditSeed?: boolean;
  initialSession?: "cached" | "restoring" | "signed_out";
  page?: "seed" | "details" | "survey";
  returnTo?: string;
} = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthenticationStore();
  auth.isAuthInitialized = initialSession !== "restoring";
  if (initialSession === "cached") {
    auth.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      userId: "00000000-0000-4000-8000-000000000001",
    });
  }
  const response = Dto.getConversationForEditResponse.parse({
    success: true,
    conversationSlugId: "seedtest",
    conversationTitle: "Original title",
    conversationBody: "Original body",
    conversationTypeConfig: {
      conversationType: "polis",
      votingPresentation: "list",
    },
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
    languageSettingsSource: "conversation_override",
    currentProjectSlug: "seed-project",
    projectTarget: { kind: "project", projectSlug: "seed-project" },
    projectOptions: [
      {
        target: { kind: "no_project" },
        premiumFeatures: [],
        emailUpdates: {
          canConfigure: false,
          hasParticipantContactEmail: false,
          scopeDefaultEnabled: false,
        },
      },
      {
        target: { kind: "no_project", organizationSlug: "owner" },
        premiumFeatures: [],
        emailUpdates: {
          canConfigure: false,
          hasParticipantContactEmail: false,
          scopeDefaultEnabled: false,
        },
      },
      {
        target: { kind: "project", projectSlug: "destination" },
        title: "Destination",
        organizationSlugs: ["owner"],
        premiumFeatures: [],
        defaultLanguageCode: "en",
        languageSettings: {
          dynamicTranslationEnabled: false,
          targetLanguageCodes: [],
        },
        emailUpdates: {
          canConfigure: false,
          hasParticipantContactEmail: false,
          scopeDefaultEnabled: false,
        },
      },
    ],
    isIndexed: true,
    participationMode: "account_required",
    aiLabelingEnabled: true,
    preferredOpinionGroupCount: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isLocked: false,
    editPermissions: {
      canEditNormalSettings: true,
      canEditConversationContent: true,
      canEditSurvey: page === "survey",
      canDeleteSurvey: false,
      canAddEventTicket: false,
      canChangeEventTicket: false,
      canRemoveEventTicket: true,
      canUseAnalysisVariantsPreference: false,
      canUseDynamicTranslation: false,
      restrictedPremiumFeatures: [],
    },
    seedOpinions: [
      {
        slugId: "oldseed1",
        content: "<p>An <strong>existing</strong> seed</p>",
        sourceVersion: "00000000-0000-4000-8000-000000000010",
        editing: canEditSeed
          ? { allowed: true }
          : { allowed: false, reason: "has_votes" },
      },
    ],
    canAddSeedOpinions: true,
    externalSourceConfig: null,
  });
  if (!response.success) throw new Error("Invalid test fixture");
  const store = useEditConversationStore();
  const title = detailsChanged ? "Changed title" : response.conversationTitle;
  if (initialSession === "cached")
    store.start({
      original: response,
      form: {
        conversationTypeConfig: response.conversationTypeConfig,
        title,
        content: "Original body",
        multilingualSetting: response.multilingualSetting,
        inheritProjectLanguages: false,
        isPrivate: false,
        participationMode: "account_required",
        aiLabelingEnabled: true,
        preferredOpinionGroupCount: null,
        surveyConfig: null,
      },
      projectTarget: response.projectTarget,
      postAs: { postAsOrganization: false, organizationName: "" },
      isSaving: false,
      newSeedOpinions: newSeeds,
      emailConfiguration: undefined,
      emailOverride: undefined,
      originalEmailOverride: undefined,
    });
  if (initialSession !== "cached") {
    mocks.getForEdit.mockResolvedValue(response);
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/conversation/:conversationSlugId/edit",
        name: "/conversation/[conversationSlugId]/edit/",
        component: DetailsPage,
      },
      {
        path: "/conversation/:conversationSlugId/edit/seed",
        name: "/conversation/[conversationSlugId]/edit/seed/",
        component: SeedPage,
      },
      {
        path: "/conversation/:conversationSlugId/edit/survey",
        name: "/conversation/[conversationSlugId]/edit/survey/",
        component: SurveyPage,
      },
      {
        path: "/project/:projectSlug/conversation/:postSlugId",
        component: { render: () => h("div", "Project conversation") },
      },
      {
        path: "/conversation/:postSlugId",
        component: { render: () => h("div", "Conversation") },
      },
      {
        path: "/",
        name: "/",
        component: { render: () => h("div", "Home") },
      },
    ],
  });
  await router.push({
    path: `/conversation/seedtest/edit${page === "details" ? "" : `/${page}`}`,
    query: { returnTo },
  });
  const header = document.createElement("div");
  header.id = "page-header";
  document.body.append(header);
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(RouterView);
  app.use(pinia);
  app.use(router);
  app.component("QIcon", () => null);
  app.component("QBtn", () => null);
  app.component("QSpinnerDots", () => null);
  apps.push(app);
  app.mount(container);
  await nextTick();
  return { store, router, container, header, auth, response };
}

function clickButton(label: string): void {
  const button = Array.from(document.querySelectorAll("button, a")).find(
    (button) => button.textContent?.trim() === label
  );
  if (!(button instanceof HTMLElement))
    throw new Error(`Missing button: ${label}`);
  button.click();
}

describe.each(["details", "survey"] as const)(
  "%s edit-page initialization",
  (page) => {
    it("recovers from a confirmed denial on the initial render", async () => {
      const { router } = await mountFlow({
        initialSession: "signed_out",
        page,
      });
      await vi.waitFor(() =>
        expect(router.currentRoute.value.path).toBe("/conversation/seedtest/")
      );
      expect(mocks.notify).toHaveBeenCalledExactlyOnceWith({
        message: "You are not the facilitator of this conversation",
        force: true,
      });
      expect(mocks.getForEdit).not.toHaveBeenCalled();
    });

    it("waits for login restoration without a false denial or premature request", async () => {
      const { auth, router, container } = await mountFlow({
        initialSession: "restoring",
        page,
      });
      expect(container.querySelector(".pageLoadingSpinner")).not.toBeNull();
      expect(mocks.notify).not.toHaveBeenCalled();
      expect(mocks.getForEdit).not.toHaveBeenCalled();

      auth.setLoginStatus({
        isKnown: true,
        isLoggedIn: true,
        userId: "restored-user",
      });
      await nextTick();
      expect(mocks.getForEdit).not.toHaveBeenCalled();
      expect(mocks.notify).not.toHaveBeenCalled();

      auth.isAuthInitialized = true;
      await vi.waitFor(() =>
        expect(
          container.querySelector(
            page === "details" ? "textarea" : "[data-survey-editor]"
          )
        ).not.toBeNull()
      );
      expect(mocks.getForEdit).toHaveBeenCalledExactlyOnceWith("seedtest");
      expect(mocks.notify).not.toHaveBeenCalled();
      expect(router.currentRoute.value.path).toContain("/edit");
    });

    it("notifies and returns to the project conversation once signed-out status is confirmed", async () => {
      const returnTo = "/project/test-project/conversation/seedtest/";
      const { auth, router } = await mountFlow({
        initialSession: "restoring",
        page,
        returnTo,
      });
      expect(mocks.notify).not.toHaveBeenCalled();
      auth.isAuthInitialized = true;
      await vi.waitFor(() =>
        expect(router.currentRoute.value.path).toBe(returnTo)
      );
      expect(mocks.notify).toHaveBeenCalledExactlyOnceWith({
        message: "You are not the facilitator of this conversation",
        force: true,
      });
      expect(mocks.getForEdit).not.toHaveBeenCalled();
    });

    it.each([
      {
        reason: "not_author",
        message: "You are not the facilitator of this conversation",
      },
      { reason: "not_found", message: "Conversation not found" },
    ] as const)(
      "notifies and leaves the editor for $reason",
      async ({ reason, message }) => {
        const { auth, router, container } = await mountFlow({
          initialSession: "restoring",
          page,
        });
        mocks.getForEdit.mockResolvedValueOnce({ success: false, reason });
        auth.setLoginStatus({
          isKnown: true,
          isLoggedIn: true,
          userId: "restored-user",
        });
        auth.isAuthInitialized = true;
        await vi.waitFor(() =>
          expect(router.currentRoute.value.path).toBe("/conversation/seedtest/")
        );
        expect(mocks.notify).toHaveBeenCalledExactlyOnceWith({
          message,
          force: true,
        });
        expect(container.textContent).not.toContain(message);
      }
    );

    it("notifies and returns to the conversation when it is locked", async () => {
      const { auth, router, response } = await mountFlow({
        initialSession: "restoring",
        page,
      });
      mocks.getForEdit.mockResolvedValueOnce({ ...response, isLocked: true });
      auth.setLoginStatus({
        isKnown: true,
        isLoggedIn: true,
        userId: "restored-user",
      });
      auth.isAuthInitialized = true;
      await vi.waitFor(() =>
        expect(router.currentRoute.value.path).toBe("/conversation/seedtest/")
      );
      expect(mocks.notify).toHaveBeenCalledExactlyOnceWith({
        message: "This conversation is locked and cannot be edited",
        force: true,
      });
    });

    it("handles rejected load requests instead of stranding the user", async () => {
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const { auth, router } = await mountFlow({
          initialSession: "restoring",
          page,
        });
        mocks.getForEdit.mockRejectedValueOnce(
          new Error("Network unavailable")
        );
        auth.setLoginStatus({
          isKnown: true,
          isLoggedIn: true,
          userId: "restored-user",
        });
        auth.isAuthInitialized = true;
        await vi.waitFor(() =>
          expect(router.currentRoute.value.path).toBe("/conversation/seedtest/")
        );
        expect(mocks.notify).toHaveBeenCalledTimes(1);
        expect(errorLog).toHaveBeenCalledTimes(1);
      } finally {
        errorLog.mockRestore();
      }
    });

    it("ignores an obsolete denial after the signed-in account changes", async () => {
      const { auth, router, container } = await mountFlow({
        initialSession: "restoring",
        page,
      });
      const pending = Promise.withResolvers<GetConversationForEditResponse>();
      mocks.getForEdit.mockReturnValueOnce(pending.promise);
      auth.setLoginStatus({
        isKnown: true,
        isLoggedIn: true,
        userId: "first-user",
      });
      auth.isAuthInitialized = true;
      await nextTick();
      auth.setLoginStatus({
        isKnown: true,
        isLoggedIn: true,
        userId: "second-user",
      });
      await vi.waitFor(() =>
        expect(
          container.querySelector(
            page === "details" ? "textarea" : "[data-survey-editor]"
          )
        ).not.toBeNull()
      );
      auth.setLoginStatus({
        isKnown: true,
        isLoggedIn: true,
        userId: "first-user",
      });
      await vi.waitFor(() => expect(mocks.getForEdit).toHaveBeenCalledTimes(3));
      pending.resolve({ success: false, reason: "not_author" });
      await nextTick();
      expect(mocks.notify).not.toHaveBeenCalled();
      expect(router.currentRoute.value.path).toContain("/edit");
    });

    it("does not redirect or notify after leaving during a pending request", async () => {
      const { auth, router } = await mountFlow({
        initialSession: "restoring",
        page,
      });
      const pending = Promise.withResolvers<GetConversationForEditResponse>();
      mocks.getForEdit.mockReturnValueOnce(pending.promise);
      auth.setLoginStatus({
        isKnown: true,
        isLoggedIn: true,
        userId: "restored-user",
      });
      auth.isAuthInitialized = true;
      await nextTick();
      await router.push("/");
      pending.resolve({ success: false, reason: "not_author" });
      await nextTick();
      expect(router.currentRoute.value.path).toBe("/");
      expect(mocks.notify).not.toHaveBeenCalled();
    });
  }
);

describe("edit loading and unsaved changes", () => {
  it("protects cached edits while a survey loads, then allows failure recovery", async () => {
    const pending = Promise.withResolvers<GetConversationForEditResponse>();
    mocks.getForEdit.mockReturnValueOnce(pending.promise);
    const { router, store } = await mountFlow({ page: "survey" });
    expect(store.hasUnsavedChanges).toBe(true);
    await router.push("/");
    expect(router.currentRoute.value.path).toBe(
      "/conversation/seedtest/edit/survey"
    );
    expect(document.body.textContent).toContain("Discard changes");

    pending.resolve({ success: false, reason: "not_author" });
    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe("/conversation/seedtest/")
    );
    expect(store.session).toBeUndefined();
    expect(document.body.textContent).not.toContain("Discard changes");
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });
});

describe("edit conversation statement step", () => {
  it("generates and adds AI statements to an edit without saving automatically", async () => {
    mocks.aiSuggestionsEnabled = true;
    mocks.generateSeedSuggestions.mockResolvedValueOnce({
      status: "success",
      data: {
        confident: true,
        generationId: "00000000-0000-4000-8000-000000000020",
        suggestions: [
          { suggestionId: "suggestion-1", text: "An AI statement" },
        ],
      },
    });
    const { store, container } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    const actionLabels = Array.from(
      container.querySelectorAll(".add-actions button")
    ).map((button) => button.textContent?.trim());
    expect(actionLabels).toEqual(["Generate with AI", "Add Statement"]);

    clickButton("Generate with AI");
    await vi.waitUntil(
      () => container.textContent?.includes("An AI statement") === true
    );
    expect(mocks.generateSeedSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          draftId: store.session?.aiSuggestionDraftId,
          conversationTitle: "Original title",
          conversationBody: "Original body",
          existingStatements: ["An existing seed"],
        }),
      })
    );
    clickButton("Add");
    await nextTick();
    expect(store.session?.newSeedOpinions).toEqual(["<p>An AI statement</p>"]);
    expect(store.hasUnsavedChanges).toBe(true);
    expect(mocks.save).not.toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(container.querySelector(".seed-item textarea")).toHaveProperty(
        "value",
        "<p>An AI statement</p>"
      )
    );
  });

  it("links clarification back to editing this conversation", async () => {
    mocks.aiSuggestionsEnabled = true;
    mocks.generateSeedSuggestions.mockResolvedValueOnce({
      status: "success",
      data: {
        confident: false,
        generationId: "00000000-0000-4000-8000-000000000020",
        tip: "Please be more specific.",
      },
    });
    const { container } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    clickButton("Generate with AI");
    await vi.waitUntil(
      () => container.querySelector(".edit-conversation-link") !== null
    );
    expect(
      container.querySelector(".edit-conversation-link")?.getAttribute("href")
    ).toBe("/conversation/seedtest/edit?returnTo=/");
  });

  it.each([false, true])(
    "converts inherited languages using destination access when detaching a project (access=%s)",
    async (hasTranslationAccess) => {
      const { router, store, container } = await mountFlow({
        newSeeds: [],
        detailsChanged: false,
      });
      const session = store.session;
      if (session === undefined) throw new Error("Missing edit session");
      session.original.languageSettingsSource = "project_inherited";
      session.original.projectLanguageProject = {
        projectSlug: "seed-project",
        projectTitle: "Source project",
        defaultLanguageCode: "en",
        languageSettings: {
          dynamicTranslationEnabled: false,
          targetLanguageCodes: [],
        },
      };
      session.form.inheritProjectLanguages = true;
      const destination = session.original.projectOptions.find(
        (option) =>
          option.target.kind === "no_project" &&
          option.target.organizationSlug === undefined
      );
      if (destination === undefined) throw new Error("Missing destination");
      destination.premiumFeatures = hasTranslationAccess
        ? ["dynamic_translation"]
        : [];
      await router.push("/conversation/seedtest/edit?returnTo=/");
      await vi.waitUntil(
        () => container.querySelector("[data-project-options]") !== null
      );
      clickButton("No project");
      await nextTick();
      clickButton("Next");
      await vi.waitUntil(() =>
        router.currentRoute.value.path.endsWith("/seed")
      );
      mocks.save.mockResolvedValueOnce({
        success: false,
        reason: "not_author",
      });
      clickButton("Save");
      await vi.waitUntil(() => mocks.save.mock.calls.length === 1);
      expect(mocks.save.mock.calls.at(0)?.at(0)).toMatchObject({
        projectChange: {
          expectedProjectSlug: "seed-project",
          target: { kind: "no_project" },
        },
        languageSettingsSource: "conversation_override",
        multilingualSetting: {
          dynamicTranslationEnabled: false,
          additionalLanguageCodes: hasTranslationAccess ? ["en"] : [],
        },
        newSeedOpinionList: [],
      });
    }
  );

  it("scopes projects to Post as and preserves the identity and project through Next, Back, and Save", async () => {
    const { router, store, container } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    await router.push("/conversation/seedtest/edit?returnTo=/");
    await vi.waitUntil(
      () => container.querySelector("[data-post-as]") !== null
    );
    expect(
      container.querySelector("[data-project-options]")?.textContent
    ).not.toContain("Destination");

    clickButton("Post as owner");
    await nextTick();
    expect(container.querySelector("[data-post-as]")?.textContent).toBe(
      "owner"
    );
    expect(container.querySelector("[data-project-options]")?.textContent).toBe(
      "No projectDestination"
    );
    clickButton("Destination");
    await nextTick();
    clickButton("Post as owner");
    await nextTick();
    clickButton("Next");
    await vi.waitUntil(() => router.currentRoute.value.path.endsWith("/seed"));
    expect(store.session?.postAs.organizationName).toBe("owner");
    expect(store.session?.projectTarget).toEqual({
      kind: "project",
      projectSlug: "destination",
    });

    await router.push("/conversation/seedtest/edit?returnTo=/");
    await vi.waitUntil(
      () => container.querySelector("[data-post-as]") !== null
    );
    expect(container.querySelector("[data-post-as]")?.textContent).toBe(
      "owner"
    );
    clickButton("Post as personal");
    await nextTick();
    expect(
      container.querySelector("[data-project-options]")?.textContent
    ).not.toContain("Destination");
    clickButton("Next");
    await vi.waitUntil(() => router.currentRoute.value.path.endsWith("/seed"));
    mocks.save.mockResolvedValueOnce({ success: false, reason: "not_author" });
    clickButton("Save");
    await vi.waitUntil(() => mocks.save.mock.calls.length === 1);
    expect(mocks.save.mock.calls.at(0)?.at(0)?.projectChange).toEqual({
      expectedProjectSlug: "seed-project",
      target: { kind: "no_project", organizationSlug: undefined },
    });
  });

  it("prevents leaving or double-submitting while Save is pending", async () => {
    const { router, store } = await mountFlow({ newSeeds: [] });
    let finish = (_response: UpdateConversationResponse) => {};
    mocks.save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    clickButton("Save");
    await vi.waitUntil(() => store.isSaving);
    clickButton("Save");
    await router.push("/conversation/seedtest/edit?returnTo=/");
    expect(router.currentRoute.value.path).toBe(
      "/conversation/seedtest/edit/seed"
    );
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain("Discard changes");
    finish({ success: false, reason: "not_author" });
    await vi.waitUntil(() => !store.isSaving);
    expect(store.hasUnsavedChanges).toBe(true);
  });

  it("clears private draft content when the authenticated user changes", async () => {
    const { store, container } = await mountFlow();
    mocks.getForEdit.mockResolvedValueOnce({
      success: false,
      reason: "not_author",
    });
    useAuthenticationStore().setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      userId: "00000000-0000-4000-8000-000000000002",
    });
    expect(store.session).toBeUndefined();
    await vi.waitUntil(
      () => !container.textContent?.includes("An existing seed")
    );
    expect(store.hasUnsavedChanges).toBe(false);
  });

  it("loads a different conversation rather than reusing a stale parameter-only route", async () => {
    const { store, router, container } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    const original = store.session?.original;
    if (original === undefined) throw new Error("Missing edit fixture");
    mocks.getForEdit.mockResolvedValueOnce({
      ...original,
      conversationSlugId: "nexttest",
      conversationTitle: "Another conversation",
      seedOpinions: [
        {
          slugId: "newseed1",
          content: "Another existing seed",
          sourceVersion: "00000000-0000-4000-8000-000000000011",
          editing: { allowed: true },
        },
      ],
    });
    await router.push("/conversation/nexttest/edit/seed?returnTo=/");
    await vi.waitUntil(
      () => container.textContent?.includes("Another existing seed") === true
    );
    expect(store.session?.original.conversationSlugId).toBe("nexttest");
    expect(container.textContent).not.toContain("An existing seed");
  });

  it("preserves an absent conversation body for a seed-only save", async () => {
    const { store } = await mountFlow({ detailsChanged: false });
    if (store.session === undefined) throw new Error("Missing edit fixture");
    store.session.original.conversationBody = undefined;
    store.session.form.content = "";
    mocks.save.mockResolvedValueOnce({ success: false, reason: "not_author" });
    clickButton("Save");
    await vi.waitUntil(() => mocks.save.mock.calls.length === 1);
    expect(
      mocks.save.mock.calls.at(0)?.at(0)?.conversationBody
    ).toBeUndefined();
  });

  it("does not rewrite meaningful whitespace in conversation content", async () => {
    const { store, router, container } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    await router.push("/conversation/seedtest/edit?returnTo=/");
    await vi.waitUntil(
      () => container.querySelectorAll("textarea").length === 2
    );
    const body = container.querySelectorAll("textarea").item(1);
    body.value = "Original  body";
    body.dispatchEvent(new Event("input", { bubbles: true }));
    clickButton("Next");
    await vi.waitUntil(() => router.currentRoute.value.path.endsWith("/seed"));
    expect(store.hasUnsavedChanges).toBe(true);
    expect(store.session?.form.content).toBe("Original  body");
  });
  it("loads a direct statement-step link through a fresh edit session", async () => {
    const { router, store, container } = await mountFlow({ newSeeds: [] });
    const original = store.session?.original;
    if (original === undefined) throw new Error("Missing edit fixture");
    store.clear();
    await router.push("/");
    mocks.getForEdit.mockResolvedValueOnce(original);
    await router.push("/conversation/seedtest/edit/seed?returnTo=/");
    await vi.waitUntil(
      () => container.textContent?.includes("Existing seed statements") === true
    );
    expect(router.currentRoute.value.query.editStep).toBeUndefined();
    expect(store.session?.newSeedOpinions).toEqual([]);
    expect(mocks.getForEdit).toHaveBeenCalledTimes(1);
  });
  it("clears the edit session and returns to the conversation after a successful save", async () => {
    const { router, store } = await mountFlow({ newSeeds: [] });
    mocks.save.mockResolvedValueOnce({ success: true });
    clickButton("Save");
    await vi.waitUntil(
      () => router.currentRoute.value.path === "/conversation/seedtest/"
    );
    expect(store.session).toBeUndefined();
  });

  it("prompts before discarding unsaved edits outside the edit flow", async () => {
    const { router, store } = await mountFlow({ newSeeds: [] });
    await router.push("/");
    expect(router.currentRoute.value.path).toBe(
      "/conversation/seedtest/edit/seed"
    );
    expect(store.session).toBeDefined();
    clickButton("Discard changes");
    await vi.waitUntil(() => router.currentRoute.value.path === "/");
    expect(store.session).toBeUndefined();
  });
  it("shows existing formatted statements with draft controls and submits only additions when unchanged", async () => {
    const { container, store } = await mountFlow();
    await vi.waitUntil(() => container.querySelector("textarea") !== null);
    const existing = container.querySelector(".statement-section");
    expect(existing?.querySelector("strong")?.textContent).toBe("existing");
    expect(existing?.querySelector("textarea, [contenteditable]")).toBeNull();
    expect(existing?.textContent).toContain("Edit");
    mocks.save.mockResolvedValue({ success: false, reason: "not_author" });
    clickButton("Save");
    await vi.waitUntil(() => mocks.save.mock.calls.length === 1);
    expect(mocks.save).toHaveBeenCalledWith({
      ...(store.session === undefined
        ? {}
        : buildEditConversationRequest(store.session)),
      newSeedOpinionList: ["New seed"],
      seedOpinionChanges: [],
    });
    expect(store.session?.newSeedOpinions).toEqual(["New seed"]);
  });

  it("stages deletion visibly without saving, and undo restores an unchanged draft", async () => {
    const { container, store } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    const deletion = container.querySelector(
      'button[aria-label="Delete statement"]'
    );
    if (!(deletion instanceof HTMLButtonElement))
      throw new Error("Missing deletion control");
    deletion.click();
    await nextTick();
    expect(container.textContent).toContain("Deleted — unsaved");
    expect(
      container.querySelector(".deleted-content strong")?.textContent
    ).toBe("existing");
    expect(store.session?.original.seedOpinions).toHaveLength(1);
    expect(store.hasUnsavedChanges).toBe(true);
    expect(mocks.save).not.toHaveBeenCalled();
    clickButton("Undo deletion");
    await nextTick();
    expect(container.textContent).not.toContain("Deleted — unsaved");
    expect(store.hasUnsavedChanges).toBe(false);
  });

  it("preserves staged edits through deletion, undo, Back, and Next, then submits on Save", async () => {
    const { container, store, router } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    clickButton("Edit");
    await vi.waitUntil(() => container.querySelector("textarea") !== null);
    const field = container.querySelector("textarea");
    if (field === null) throw new Error("Missing statement editor");
    field.value = "<p>Edited seed</p>";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(container.textContent).toContain("Edited — unsaved");
    const deletion = container.querySelector(
      'button[aria-label="Delete statement"]'
    );
    if (!(deletion instanceof HTMLButtonElement))
      throw new Error("Missing deletion control");
    deletion.click();
    await nextTick();
    clickButton("Undo deletion");
    await nextTick();
    expect(container.textContent).toContain("Edited seed");
    expect(container.textContent).toContain("Edited — unsaved");
    expect(mocks.save).not.toHaveBeenCalled();
    await router.push("/conversation/seedtest/edit?returnTo=/");
    await vi.waitUntil(
      () => container.querySelectorAll("textarea").length === 2
    );
    clickButton("Next");
    await vi.waitUntil(() => router.currentRoute.value.path.endsWith("/seed"));
    expect(store.hasUnsavedChanges).toBe(true);
    mocks.save.mockResolvedValueOnce({ success: false, reason: "not_author" });
    clickButton("Save");
    await vi.waitUntil(() => mocks.save.mock.calls.length === 1);
    expect(mocks.save.mock.calls.at(0)?.at(0)?.seedOpinionChanges).toEqual([
      {
        action: "edit",
        slugId: "oldseed1",
        sourceVersion: "00000000-0000-4000-8000-000000000010",
        content: "<p>Edited seed</p>",
      },
    ]);
    await vi.waitUntil(() => !store.isSaving);
    clickButton("Undo edit");
    await nextTick();
    expect(store.session?.existingSeedOpinions.at(0)?.content).toBe(
      "<p>An <strong>existing</strong> seed</p>"
    );
  });

  it("submits draft deletion only on Save and keeps it visible after failure", async () => {
    const { container } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    const deletion = container.querySelector(
      'button[aria-label="Delete statement"]'
    );
    if (!(deletion instanceof HTMLButtonElement))
      throw new Error("Missing deletion control");
    deletion.click();
    await nextTick();
    mocks.save.mockResolvedValueOnce({ success: false, reason: "not_author" });
    clickButton("Save");
    await vi.waitUntil(() => mocks.save.mock.calls.length === 1);
    expect(mocks.save.mock.calls.at(0)?.at(0)?.seedOpinionChanges).toEqual([
      {
        action: "delete",
        slugId: "oldseed1",
        sourceVersion: "00000000-0000-4000-8000-000000000010",
      },
    ]);
    expect(container.textContent).toContain("Deleted — unsaved");
  });

  it("blocks editing voted statements while allowing draft deletion and undo", async () => {
    const { container } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
      canEditSeed: false,
    });
    expect(container.textContent).toContain(
      "has valid votes and cannot be edited while they remain"
    );
    expect(
      Array.from(container.querySelectorAll("button")).some(
        (button) => button.textContent?.trim() === "Edit"
      )
    ).toBe(false);
    const deletion = container.querySelector(
      'button[aria-label="Delete statement"]'
    );
    if (!(deletion instanceof HTMLButtonElement))
      throw new Error("Missing deletion control");
    deletion.click();
    await nextTick();
    clickButton("Undo deletion");
    await nextTick();
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("preserves a rejected draft and blocks resubmitting it after a vote arrives", async () => {
    const { container, store } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    clickButton("Edit");
    await vi.waitUntil(() => container.querySelector("textarea") !== null);
    const field = container.querySelector("textarea");
    if (field === null) throw new Error("Missing statement editor");
    field.value = "Unsaved edit";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    mocks.save.mockResolvedValueOnce({
      success: false,
      reason: "seed_opinion_change_rejected",
      seedOpinionSlugId: "oldseed1",
      changeFailure: "has_votes",
    });
    clickButton("Save");
    await vi.waitUntil(
      () => mocks.save.mock.calls.length === 1 && !store.isSaving
    );
    expect(container.textContent).toContain("Unsaved edit");
    expect(container.querySelector("textarea")).toBeNull();
    clickButton("Save");
    await nextTick();
    expect(mocks.save).toHaveBeenCalledTimes(1);
    clickButton("Undo edit");
    await nextTick();
    expect(store.hasUnsavedChanges).toBe(false);
  });

  it("shows a local validation error before submitting an oversized change batch", async () => {
    const { container, store } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    const current = store.session;
    const original = current?.existingSeedOpinions.at(0);
    if (current === undefined || original === undefined)
      throw new Error("Missing draft fixture");
    current.existingSeedOpinions = Array.from({ length: 51 }, (_, index) => ({
      ...original,
      slugId: `seed${String(index).padStart(4, "0")}`,
      deleted: true,
    }));
    await nextTick();
    clickButton("Save");
    await nextTick();
    expect(container.textContent).toContain("existing statements per save");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("preserves details and additions across Back and Next without reloading", async () => {
    const { container, router, store } = await mountFlow();
    expect(store.session?.original.conversationSlugId).toBe("seedtest");
    await router.push("/conversation/seedtest/edit?returnTo=/");
    await vi.waitUntil(() =>
      Array.from(container.querySelectorAll("textarea")).some(
        (field) => field.value === "Changed title"
      )
    );
    clickButton("Next");
    await vi.waitUntil(() => router.currentRoute.value.path.endsWith("/seed"));
    await vi.waitUntil(
      () => container.querySelector("textarea")?.value === "New seed"
    );
    expect(store.session?.form.title).toBe("Changed title");
    expect(mocks.getForEdit).not.toHaveBeenCalled();
    expect(router.currentRoute.value.query.returnTo).toBe("/");
  });

  it("allows metadata-only saves and blocks duplicates before saving", async () => {
    const { container, store } = await mountFlow({ newSeeds: [] });
    mocks.save.mockResolvedValue({ success: false, reason: "not_author" });
    clickButton("Save");
    await vi.waitUntil(() => mocks.save.mock.calls.length === 1);
    expect(mocks.save.mock.calls.at(0)?.at(0)?.newSeedOpinionList).toEqual([]);
    if (store.session === undefined) throw new Error("Missing edit session");
    store.session.newSeedOpinions = ["An existing seed"];
    await vi.waitUntil(() => container.querySelector("textarea") !== null);
    for (const element of container.querySelectorAll(
      ".seed-opinion-item-wrapper"
    )) {
      if (element instanceof HTMLElement) element.scrollIntoView = vi.fn();
    }
    clickButton("Save");
    await nextTick();
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("This statement is a duplicate");
  });

  it("keeps Next available when only new statements will change", async () => {
    const { container, router } = await mountFlow({
      newSeeds: [],
      detailsChanged: false,
    });
    await router.push("/conversation/seedtest/edit?returnTo=/");
    await vi.waitUntil(() => container.querySelector("textarea") !== null);
    clickButton("Next");
    await vi.waitUntil(() => router.currentRoute.value.path.endsWith("/seed"));
  });
});
