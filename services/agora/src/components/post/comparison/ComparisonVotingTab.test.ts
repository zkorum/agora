import type {
  ComparisonSaveResponse,
  ConversationParticipationStatus,
} from "src/shared/types/dto";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import type { useComparisonSaveMutation } from "src/utils/api/comparison/useComparisonQueries";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  ref,
  toValue,
} from "vue";
import { createI18n } from "vue-i18n";

type SaveParams = Parameters<
  ReturnType<typeof useComparisonSaveMutation>["mutateAsync"]
>[0];

const mocks = vi.hoisted(() => ({
  save: vi.fn<(params: SaveParams) => Promise<ComparisonSaveResponse>>(),
  method: vi.fn(),
  notify: vi.fn(),
  onboarding: vi.fn(),
}));
vi.mock("./ComparisonStatementComposer.vue", () => ({ default: { template: "<div />" } }));
const status = ref<ConversationParticipationStatus>({ status: "ready" });
const viewerId = ref<string | undefined>("user");
const isVisible = ref(true);
const unavailableSlugId = ref<string | undefined>();
let initialCandidates = ["a", "b"];
let catalogSlugIds = ["a", "b", "c", "d"];
let loadFailed = false;
let showTranslation = false;

vi.mock("@tanstack/vue-query", () => ({
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));
vi.mock("pinia", () => ({ storeToRefs: (store: object) => store }));
vi.mock("quasar", () => ({ useQuasar: () => ({ dialog: vi.fn() }) }));
vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: () => ({ userId: viewerId, isGuest: false }),
}));
vi.mock("src/utils/query/viewerScope", () => ({
  useViewerQueryScope: () => ref("user"),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: mocks.notify }),
}));
vi.mock("src/composables/conversation/useParticipationGate", () => ({
  useParticipationGate: () => ({
    participationStatus: status,
    openParticipationOnboarding: mocks.onboarding,
    captureParticipationAction: () => ({
      isCurrent: () => true,
      handleBlockedReason: vi.fn(),
    }),
  }),
}));
vi.mock("src/utils/api/comparison/comparison", () => ({
  useComparisonApi: () => ({ loadComparisonResponse: vi.fn() }),
}));
vi.mock("src/utils/translation/useRankingItemDisplayContent", () => ({
  useRankingItemDisplayContent: ({
    displayContent,
  }: {
    displayContent: () => { content: { title: string; bodyHtml?: string } };
  }) => {
    const mode = ref("original");
    return {
      displayedTitle: computed(() =>
        displayContent().content.title ===
        `Statement ${unavailableSlugId.value}`
          ? ""
          : mode.value === "translated"
            ? "Translated statement ".repeat(25)
            : displayContent().content.title
      ),
      displayedBody: computed(() =>
        displayContent().content.title ===
        `Statement ${unavailableSlugId.value}`
          ? ""
          : (displayContent().content.bodyHtml ?? "")
      ),
      translationPreview: computed(() =>
        showTranslation
          ? {
              mode: mode.value,
              translationStatus: "completed",
              sourceLanguageLabel: "French",
            }
          : undefined
      ),
      setTranslationMode: (nextMode: string) => {
        mode.value = nextMode;
      },
    };
  },
}));
vi.mock("src/components/translation/ContentTranslationControl.vue", () => ({
  default: defineComponent({
    emits: ["update:modelValue"],
    setup:
      (_props, { emit }) =>
      () =>
        h(
          "button",
          {
            "data-testid": "translate",
            onClick: () => emit("update:modelValue", "translated"),
          },
          "Translate"
        ),
  }),
}));
vi.mock("src/components/ui-library/ZKHtmlContent.vue", () => ({
  default: defineComponent({
    props: { htmlBody: { type: String, required: true } },
    setup: (props) => () => h("div", String(props.htmlBody)),
  }),
}));
vi.mock("./ComparisonStatementDialog.vue", () => ({
  default: defineComponent({
    props: { modelValue: Boolean },
    setup: (props) => () =>
      props.modelValue
        ? h("div", { "data-testid": "details" }, "Details")
        : null,
  }),
}));
vi.mock("./ComparisonCandidateCardContent.vue", () => ({
  default: defineComponent({
    setup: (_props, { expose }) => {
      expose({ isTruncated: () => false });
      return () => h("div", "BWS content");
    },
  }),
}));
vi.mock("src/components/post/voting/VotingSessionToolbar.vue", () => ({
  default: defineComponent({
    props: { canUndo: Boolean, isBusy: Boolean, isDisabled: Boolean },
    emits: ["undo"],
    setup:
      (props, { emit }) =>
      () =>
        h(
          "button",
          {
            "data-testid": "undo",
            disabled: !props.canUndo || props.isBusy || props.isDisabled,
            onClick: () => emit("undo"),
          },
          "Undo"
        ),
  }),
}));
vi.mock("src/components/post/analysis/common/AnalysisActionButton.vue", () => ({
  default: defineComponent(() => () => null),
}));
vi.mock("src/components/ui/ErrorRetryBlock.vue", () => ({
  default: defineComponent(() => () => h("div", { "data-testid": "error" })),
}));
vi.mock("src/components/ui/PageLoadingSpinner.vue", () => ({
  default: defineComponent(() => () => h("div", { "data-testid": "loading" })),
}));
vi.mock("src/components/ui-library/ZKBottomDialogContainer.vue", () => ({
  default: defineComponent(() => () => null),
}));
vi.mock("src/utils/api/comparison/useComparisonQueries", () => ({
  useComparisonItemsQuery: () => ({
    data: ref(
      catalogSlugIds.map((slugId) => ({
        slugId,
        displayContent: {
          status: "available",
          mode: "original",
          sourceVersion: slugId,
          content: {
            title: `Statement ${slugId}`,
            ...(slugId === "a" ? { bodyHtml: "Full statement details" } : {}),
          },
          translationControl: null,
        },
        externalUrl: slugId === "a" ? "https://example.com/source" : null,
      }))
    ),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn(),
  }),
  useComparisonLoadQuery: () => ({
    data: ref(
      loadFailed
        ? undefined
        : { comparisons: null, candidateSets: [initialCandidates] }
    ),
    isPending: ref(false),
    isError: ref(loadFailed),
    refetch: vi.fn(),
  }),
  useComparisonSaveMutation: ({
    comparisonMethod,
    onRollback,
    onNetworkError,
  }: Parameters<typeof useComparisonSaveMutation>[0]) => ({
    mutateAsync: async (params: Parameters<typeof mocks.save>[0]) => {
      mocks.method(toValue(comparisonMethod));
      try {
        return await mocks.save(params);
      } catch (error) {
        onRollback(params.context);
        onNetworkError();
        throw error;
      }
    },
  }),
}));

import ComparisonVotingTab from "./ComparisonVotingTab.vue";

function conversation({
  method = "pairwise",
  closed = false,
}: {
  method?: "pairwise" | "bws";
  closed?: boolean;
} = {}): ExtendedConversationDisplayData {
  return {
    metadata: {
      participantStatements: { supported: true, enabled: false },
      conversationSlugId: "example",
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: method,
      createdAt: new Date(),
      lastReactedAt: new Date(),
      opinionCount: 4,
      voteCount: 0,
      participantCount: 0,
      totalOpinionCount: 4,
      totalVoteCount: 0,
      totalParticipantCount: 0,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      authorUsername: "author",
      participationMode: "guest",
      isIndexed: true,
      aiLabelingEnabled: false,
      preferredOpinionGroupCount: null,
      isClosed: closed,
      isEdited: false,
      moderation: { status: "unmoderated" },
      externalSourceConfig: null,
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
    },
    interaction: {
      hasVoted: false,
      votedIndex: 0,
      conversationCapabilities: { canEdit: false, canDelete: false, canModerate: false, canClose: false, canReopen: false },
    },
  };
}

let app: ReturnType<typeof createApp> | undefined;
function mount(data = conversation()) {
  const container = document.createElement("div");
  document.body.append(container);
  app = createApp({
    setup: () => () =>
      h(KeepAlive, () =>
        isVisible.value
          ? h(ComparisonVotingTab, {
              conversationData: data,
              onViewAnalysis: vi.fn(),
            })
          : null
      ),
  });
  app.use(createI18n({ legacy: false, locale: "en" }));
  app.component(
    "QDialog",
    defineComponent(() => () => null)
  );
  app.component(
    "QBtn",
    defineComponent({
      props: { label: { type: String, default: "" } },
      setup: (props) => () => h("button", String(props.label)),
    })
  );
  app.component(
    "QIcon",
    defineComponent(() => () => h("span"))
  );
  app.component(
    "QSpinnerDots",
    defineComponent(() => () => h("span"))
  );
  app.provide("registerChildRefreshHandler", () => () => undefined);
  app.mount(container);
  return container;
}
function button({
  container,
  selector,
}: {
  container: HTMLElement;
  selector: string;
}): HTMLButtonElement {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLButtonElement))
    throw new Error(`Missing button: ${selector}`);
  return element;
}
async function flush() {
  for (let i = 0; i < 8; i++) await nextTick();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  initialCandidates = ["a", "b"];
  catalogSlugIds = ["a", "b", "c", "d"];
  loadFailed = false;
  showTranslation = false;
  isVisible.value = true;
  viewerId.value = "user";
  unavailableSlugId.value = undefined;
  status.value = { status: "ready" };
  mocks.save.mockResolvedValue({ success: true, candidateSets: [["c", "d"]] });
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("Pairwise voting content", () => {
  it.each([[], ["a"]])(
    "preserves the empty/single-statement message (%j)",
    (...slugIds) => {
      catalogSlugIds = slugIds;
      initialCandidates = [];
      const container = mount();
      expect(container.querySelector('[data-testid="error"]')).toBeNull();
      expect(container.textContent).toContain(
        slugIds.length === 0
          ? "No statements to rank yet."
          : "At least 2 statements are needed for ranking."
      );
    }
  );

  it("does not allow choosing either card until both are readable", async () => {
    unavailableSlugId.value = "a";
    const container = mount();
    await flush();
    expect(container.textContent).toContain(
      "Statement content is not available yet."
    );
    const choices =
      container.querySelectorAll<HTMLButtonElement>(".pairwise-choice");
    expect([...choices].every((choice) => choice.disabled)).toBe(true);
    choices.item(1).click();
    await flush();
    expect(mocks.save).not.toHaveBeenCalled();
    unavailableSlugId.value = undefined;
    await flush();
    expect([...choices].every((choice) => !choice.disabled)).toBe(true);
    unavailableSlugId.value = "b";
    await flush();
    expect([...choices].every((choice) => choice.disabled)).toBe(true);
  });

  it("keeps keyboard focus on the failed second choice rather than moving to the first", async () => {
    mocks.save.mockRejectedValue(new Error("Network failure"));
    const container = mount();
    await flush();
    const choices =
      container.querySelectorAll<HTMLButtonElement>(".pairwise-choice");
    choices.item(1).focus();
    choices.item(1).click();
    await flush();
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(document.activeElement).toBe(choices.item(1));
  });

  it("does not restore an old action's focus into a replacement viewer session", async () => {
    const container = mount();
    await flush();
    const choice = button({ container, selector: ".pairwise-choice" });
    choice.focus();
    choice.click();
    await flush();
    viewerId.value = "another-user";
    await flush();
    choice.blur();
    expect(document.activeElement).toBe(document.body);
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(document.activeElement).toBe(document.body);
    expect(container.textContent).toContain("Statement a");
  });

  it("does not move focus when a saved Pairwise view is inactive", async () => {
    const container = mount();
    await flush();
    const choice = button({ container, selector: ".pairwise-choice" });
    choice.focus();
    choice.click();
    await flush();
    isVisible.value = false;
    await flush();
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(document.activeElement).toBe(document.body);
    isVisible.value = true;
    await flush();
    expect(container.textContent).toContain("Statement c");
    expect(document.activeElement).toBe(document.body);
  });
  it("shows completion only after saving and allows undoing the final pair", async () => {
    catalogSlugIds = ["a", "b"];
    mocks.save.mockResolvedValue({ success: true, candidateSets: [] });
    const container = mount();
    await flush();
    const choice = button({ container, selector: ".pairwise-choice" });
    choice.focus();
    choice.click();
    await flush();
    expect(container.textContent).not.toContain("Ranking complete!");
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(container.textContent).toContain("Ranking complete!");
    expect(document.activeElement).toBe(
      container.querySelector("[tabindex='-1']")
    );
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ isComplete: true, ranking: ["a", "b"] })
    );
    button({ container, selector: '[data-testid="undo"]' }).click();
    await flush();
    expect(container.querySelectorAll(".pairwise-choice")).toHaveLength(2);
    expect(mocks.method).toHaveBeenLastCalledWith("pairwise");
  });
  it("shows the design-backed two-card choice with full details, without BWS steps", async () => {
    const container = mount();
    await flush();
    expect(container.querySelectorAll(".pairwise-card")).toHaveLength(2);
    expect(container.querySelector(".step-indicator")).toBeNull();
    expect(container.textContent).toContain(
      "Choose the statement you would prioritise"
    );
    expect(container.textContent).toContain("Full statement details");
    expect(container.querySelector(".pairwise-grid-stacked")).not.toBeNull();
  });

  it.each([0, 1])(
    "saves one complete binary answer on choice %s, then advances",
    async (index) => {
      const container = mount();
      await flush();
      const choices =
        container.querySelectorAll<HTMLButtonElement>(".pairwise-choice");
      const choice = choices.item(index);
      choice.focus();
      choice.click();
      await flush();
      expect(mocks.save).toHaveBeenCalledOnce();
      expect(mocks.method).toHaveBeenCalledWith("pairwise");
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          comparisons: [
            {
              best: index === 0 ? "a" : "b",
              worst: index === 0 ? "b" : "a",
              set: ["a", "b"],
            },
          ],
        })
      );
      expect(choice.getAttribute("aria-pressed")).toBe("true");
      expect(choice.closest("article")?.classList.contains("is-selected")).toBe(
        true
      );
      expect([...choices].every((element) => element.disabled)).toBe(true);
      choices.item(1 - index).click();
      expect(mocks.save).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(400);
      await flush();
      expect(container.textContent).toContain("Statement c");
      expect(container.textContent).not.toContain("Statement a");
      expect(document.activeElement).toBe(
        container.querySelector(".pairwise-choice")
      );
    }
  );

  it("restores the exact displayed pair on undo", async () => {
    const container = mount();
    await flush();
    button({ container, selector: ".pairwise-choice" }).click();
    await flush();
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    button({ container, selector: '[data-testid="undo"]' }).click();
    await flush();
    expect(mocks.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ comparisons: [] })
    );
    expect(container.textContent).toContain("Statement a");
    expect(container.textContent).toContain("Statement b");
    expect(container.querySelector(".is-selected")).toBeNull();
  });

  it("rolls back failed saves without losing the pair", async () => {
    mocks.save.mockRejectedValue(new Error("Network failure"));
    const container = mount();
    await flush();
    button({ container, selector: ".pairwise-choice" }).click();
    await flush();
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(container.textContent).toContain("Statement a");
    expect(container.querySelector(".is-selected")).toBeNull();
    expect(button({ container, selector: ".pairwise-choice" }).disabled).toBe(
      false
    );
    expect(mocks.notify).toHaveBeenCalled();
  });

  it("opens external details without casting a vote", async () => {
    const container = mount();
    await flush();
    button({ container, selector: ".card-details" }).click();
    await flush();
    expect(container.querySelector('[data-testid="details"]')).not.toBeNull();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("lets translation controls update content and long-text layout without voting", async () => {
    initialCandidates = ["b", "c"];
    showTranslation = true;
    const container = mount();
    await flush();
    expect(container.querySelector(".pairwise-grid-stacked")).toBeNull();
    button({ container, selector: '[data-testid="translate"]' }).click();
    await flush();
    expect(container.textContent).toContain("Translated statement");
    expect(container.querySelector(".pairwise-grid-stacked")).not.toBeNull();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("routes a gated choice through onboarding instead of saving", async () => {
    status.value = {
      status: "onboarding_required",
      nextStep: { kind: "account", purpose: "login" },
    };
    const container = mount();
    await flush();
    button({ container, selector: ".pairwise-choice" }).click();
    await flush();
    expect(mocks.onboarding).toHaveBeenCalledOnce();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("does not accept a choice in a closed conversation", async () => {
    const container = mount(conversation({ closed: true }));
    await flush();
    button({ container, selector: ".pairwise-choice" }).click();
    await flush();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it.each(["non-binary", "load failure", "duplicate"])(
    "shows a recoverable error for %s",
    async (scenario) => {
      initialCandidates =
        scenario === "duplicate" ? ["a", "a"] : ["a", "b", "c", "d"];
      loadFailed = scenario === "load failure";
      const container = mount();
      await flush();
      expect(container.querySelector('[data-testid="error"]')).not.toBeNull();
      expect(container.querySelector(".pairwise-choice")).toBeNull();
    }
  );

  it("preserves BWS best-then-worst behavior", async () => {
    initialCandidates = ["a", "b", "c", "d"];
    const container = mount(conversation({ method: "bws" }));
    await flush();
    expect(container.querySelector(".step-indicator")).not.toBeNull();
    const cards = container.querySelectorAll<HTMLElement>(".candidate-card");
    cards.item(1).click();
    await flush();
    expect(mocks.save).not.toHaveBeenCalled();
    cards.item(2).click();
    await flush();
    expect(mocks.method).toHaveBeenCalledWith("bws");
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        comparisons: [{ best: "b", worst: "c", set: ["a", "b", "c", "d"] }],
      })
    );
    await vi.advanceTimersByTimeAsync(400);
  });
});
