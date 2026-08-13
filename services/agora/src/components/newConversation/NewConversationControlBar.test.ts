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

vi.mock("src/shared-app-api/maxdiffLogic", () => ({
  DEFAULT_MAXDIFF_GITHUB_ALLOWED_ORGS: "",
  DEFAULT_MAXDIFF_GITHUB_ALLOWED_USERS: "",
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
    },
    setup(props: { label: string }) {
      return () => h("button", props.label);
    },
  },
}));

vi.mock("src/components/newConversation/dialog/AiLabelingOptionsDialog.vue", () => ({
  default: () => null,
}));
vi.mock("src/components/newConversation/dialog/AnalysisPreferenceDialog.vue", () => ({
  default: () => null,
}));
vi.mock(
  "src/components/newConversation/dialog/ConversationLanguageSettingDialog.vue",
  () => ({ default: () => null })
);
vi.mock(
  "src/components/newConversation/dialog/EventTicketRequirementDialog.vue",
  () => ({ default: () => null })
);
vi.mock("src/components/newConversation/dialog/LoginRequirementDialog.vue", () => ({
  default: () => null,
}));
vi.mock(
  "src/components/newConversation/dialog/ModeChangeConfirmationDialog.vue",
  () => ({ default: () => null })
);
vi.mock("src/components/newConversation/dialog/PostAsAccountDialog.vue", () => ({
  default: () => null,
}));
vi.mock("src/components/newConversation/dialog/VisibilityOptionsDialog.vue", () => ({
  default: () => null,
}));
vi.mock("./dialog/MaxDiffSourceDialog.vue", () => ({ default: () => null }));
vi.mock("./dialog/PostTypeDialog.vue", () => ({ default: () => null }));

import NewConversationControlBar from "./NewConversationControlBar.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("NewConversationControlBar", () => {
  it("only shows opinion-group controls for Polis conversations", async () => {
    const conversationTypeConfig = ref<ConversationTypeConfig>({
      conversationType: "polis",
    });
    const TestRoot = defineComponent({
      setup() {
        return () =>
          h(NewConversationControlBar, {
            isPrivate: false,
            participationMode: "account_required",
            requiresEventTicket: undefined,
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
      conversationType: "ranking",
      rankingMode: "bws",
    };
    await nextTick();

    expect(container.textContent).not.toContain("aiOn");
    expect(container.textContent).not.toContain("recommendedDefault");
  });
});
