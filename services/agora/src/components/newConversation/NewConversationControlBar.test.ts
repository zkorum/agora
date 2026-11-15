import type { ConversationTypeConfig } from "src/shared/types/zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";

vi.mock("pinia", () => ({
  defineStore: () => () => ({}),
  storeToRefs: (store: object) => store,
}));

vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: () => ({
    isLoggedIn: ref(false),
    userId: ref<string>(),
  }),
}));

vi.mock("src/stores/user", () => ({
  useUserStore: () => ({
    profileData: ref({
      userName: "",
      organizationList: [],
    }),
  }),
}));

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({
    t: (key: string) => key,
    locale: ref("en"),
  }),
}));

vi.mock("src/utils/api/premiumFeature", () => ({
  usePremiumFeatureApi: () => ({
    checkPremiumFeatureAccess: vi.fn(),
  }),
}));

vi.mock("src/shared-app-api/featureAccess", () => ({
  checkFeatureAccess: () => ({ allowed: false }),
  DEFAULT_FEATURE_ALLOWED_ORGS: "",
  DEFAULT_FEATURE_ALLOWED_USERS: "",
}));

vi.mock("src/utils/processEnv", () => ({
  processEnv: {},
}));

vi.mock("src/components/account/DynamicProfileImage.vue", () => ({
  default: defineComponent(() => () => null),
}));

vi.mock("src/components/newConversation/ConversationControlButton.vue", () => ({
  default: {
    props: {
      label: { type: String, required: true },
      disabled: Boolean,
    },
    setup(props: { label: string; disabled: boolean }) {
      return () => h("button", { disabled: props.disabled }, props.label);
    },
  },
}));

vi.mock(
  "src/components/newConversation/dialog/AiLabelingOptionsDialog.vue",
  () => ({
    default: () => null,
  })
);
vi.mock(
  "src/components/newConversation/dialog/AnalysisPreferenceDialog.vue",
  () => ({
    default: () => null,
  })
);
vi.mock(
  "src/components/newConversation/dialog/ConversationLanguageSettingDialog.vue",
  () => ({ default: () => null })
);
vi.mock(
  "src/components/newConversation/dialog/LoginRequirementDialog.vue",
  () => ({
    default: () => null,
  })
);
vi.mock(
  "src/components/newConversation/dialog/ModeChangeConfirmationDialog.vue",
  () => ({
    default: defineComponent({
      props: { modelValue: Boolean },
      emits: ["confirm", "cancel"],
      setup:
        (props, { emit }) =>
        () =>
          props.modelValue
            ? h("div", [
                h(
                  "button",
                  { onClick: () => emit("confirm") },
                  "Confirm import"
                ),
                h("button", { onClick: () => emit("cancel") }, "Cancel import"),
              ])
            : null,
    }),
  })
);
vi.mock(
  "src/components/newConversation/dialog/PostAsAccountDialog.vue",
  () => ({
    default: () => null,
  })
);
vi.mock(
  "src/components/newConversation/dialog/VisibilityOptionsDialog.vue",
  () => ({
    default: () => null,
  })
);
vi.mock("./dialog/ComparisonSourceDialog.vue", () => ({ default: () => null }));
vi.mock("./dialog/PostTypeDialog.vue", () => ({
  default: defineComponent({
    emits: ["modeChangeRequested"],
    setup:
      (_, { emit }) =>
      () =>
        h(
          "button",
          {
            onClick: () =>
              emit("modeChangeRequested", {
                importType: "polis-url",
                conversationTypeConfig: {
                  conversationType: "polis",
                  votingPresentation: "list",
                },
              }),
          },
          "Request import"
        ),
  }),
}));

import NewConversationControlBar from "./NewConversationControlBar.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("NewConversationControlBar", () => {
  it.each(["cancel", "confirm"] as const)(
    "keeps QV settings intact until an import switch is confirmed: %s",
    async (decision) => {
      const originalConfig = {
        conversationType: "prioritizing",
        prioritizationType: "qv",
        creditPricing: "quadratic",
        allowOpposition: false,
      } as const;
      const conversationTypeConfig =
        ref<ConversationTypeConfig>(originalConfig);
      const importSettings = ref<ConversationImportSettings>({
        importType: null,
        polisUrl: "",
        csvFileMetadata: { summary: null, comments: null, votes: null },
      });
      const container = document.createElement("div");
      document.body.append(container);
      const app = createApp(
        defineComponent(
          () => () =>
            h(NewConversationControlBar, {
              isEditMode: false,
              allowedPostAs: undefined,
              conversationTypeConfig: conversationTypeConfig.value,
              "onUpdate:conversationTypeConfig": (value) => {
                conversationTypeConfig.value = value;
              },
              importSettings: importSettings.value,
              "onUpdate:importSettings": (value) => {
                importSettings.value = value;
              },
              isPrivate: false,
              participationMode: "account_required",
              postAs: { postAsOrganization: false, organizationName: "" },
              externalSourceConfig: null,
              aiLabelingEnabled: true,
              preferredOpinionGroupCount: null,
              multilingualSetting: {
                additionalLanguageCodes: [],
                dynamicTranslationEnabled: false,
              },
              title: "Keep the QV draft",
              content: "Keep its description",
            })
        )
      );
      mountedApps.push(app);
      app.mount(container);
      function click(label: string): void {
        const button = [...container.querySelectorAll("button")].find(
          (candidate) => candidate.textContent === label
        );
        if (button === undefined) throw new Error(`Missing button: ${label}`);
        button.click();
      }
      click("Request import");
      await nextTick();
      expect(conversationTypeConfig.value).toEqual(originalConfig);
      expect(importSettings.value.importType).toBeNull();
      click(decision === "cancel" ? "Cancel import" : "Confirm import");
      await nextTick();
      expect(conversationTypeConfig.value).toEqual(
        decision === "cancel"
          ? originalConfig
          : { conversationType: "polis", votingPresentation: "list" }
      );
      expect(importSettings.value.importType).toBe(
        decision === "cancel" ? null : "polis-url"
      );
    }
  );
  it("does not clear existing premium settings when mounting an edit without creation access", async () => {
    const updateAnalysis = vi.fn();
    const updateLanguages = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp(
      defineComponent(
        () => () =>
          h(NewConversationControlBar, {
            isEditMode: true,
            allowedPostAs: undefined,
            canUseAnalysisVariantsPreference: false,
            canUseDynamicTranslation: false,
            isPrivate: false,
            participationMode: "account_required",
            postAs: { postAsOrganization: false, organizationName: "" },
            conversationTypeConfig: {
              conversationType: "polis",
              votingPresentation: "list",
            },
            importSettings: {
              importType: null,
              polisUrl: "",
              csvFileMetadata: { summary: null, comments: null, votes: null },
            },
            externalSourceConfig: null,
            aiLabelingEnabled: true,
            preferredOpinionGroupCount: 3,
            multilingualSetting: {
              additionalLanguageCodes: ["fr"],
              dynamicTranslationEnabled: true,
            },
            title: "Original title",
            content: "Original body",
            "onUpdate:preferredOpinionGroupCount": updateAnalysis,
            "onUpdate:multilingualSetting": updateLanguages,
          })
      )
    );
    mountedApps.push(app);
    app.mount(container);
    await nextTick();
    expect(updateAnalysis).not.toHaveBeenCalled();
    expect(updateLanguages).not.toHaveBeenCalled();
    expect(container.textContent).toContain("groupsLabel");
    expect(container.textContent).not.toContain("Request import");
    const buttons = [...container.querySelectorAll("button")];
    expect(
      buttons.find((button) => button.textContent === "newConversation")
    ).toBeUndefined();
    expect(
      buttons.find((button) => button.textContent === "list")?.disabled
    ).toBe(false);
  });

  it("only shows opinion-group controls for Polis conversations", async () => {
    const conversationTypeConfig = ref<ConversationTypeConfig>({
      conversationType: "polis",
      votingPresentation: "list",
    });
    const TestRoot = defineComponent({
      setup() {
        return () =>
          h(NewConversationControlBar, {
            isEditMode: false,
            allowedPostAs: undefined,
            isPrivate: false,
            participationMode: "account_required",
            postAs: {
              postAsOrganization: false,
              organizationName: "",
            },
            conversationTypeConfig: conversationTypeConfig.value,
            importSettings: {
              importType: null,
              polisUrl: "",
              csvFileMetadata: {
                summary: null,
                comments: null,
                votes: null,
              },
            },
            externalSourceConfig: null,
            aiLabelingEnabled: true,
            preferredOpinionGroupCount: null,
            multilingualSetting: {
              additionalLanguageCodes: [],
              dynamicTranslationEnabled: false,
            },
            title: "",
            content: "",
          });
      },
    });
    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp(TestRoot);
    mountedApps.push(app);
    app.mount(container);

    expect(container.textContent).toContain("aiOn");
    expect(container.textContent).toContain("recommendedDefault");

    conversationTypeConfig.value = {
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "bws",
    };
    await nextTick();

    expect(container.textContent).not.toContain("aiOn");
    expect(container.textContent).not.toContain("recommendedDefault");
  });
});
import type { ConversationImportSettings } from "src/composables/conversation/draft";
