import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, createApp, ref } from "vue";

vi.mock("pinia", () => ({
  storeToRefs: () => ({ profileData: { value: { userName: "" } } }),
}));

vi.mock("src/stores/user", () => ({
  useUserStore: () => ({}),
}));

vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => ({
    loadAuthenticatedModules: vi.fn(),
  }),
}));

vi.mock("src/utils/api/comment/useCommentQueries", () => {
  return {
    useInvalidateCommentQueries: () => ({
      markAnalysisAsStale: vi.fn(),
      markCommentsAsStale: vi.fn(),
    }),
  };
});

vi.mock("./comments/OpinionList.vue", () => ({
  default: { template: '<div data-testid="comment-section"></div>' },
}));
vi.mock("./comments/OneAtATimeSection.vue", () => ({
  default: { template: '<div data-testid="one-at-a-time"></div>' },
}));

import ConversationCommentTab from "./ConversationCommentTab.vue";

afterEach(() => {
  document.body.replaceChildren();
});

describe("ConversationCommentTab", () => {
  it("does not read metadata while conversation data is unavailable", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const app = createApp(ConversationCommentTab, {
      conversationData: undefined,
      opinionState: {
        filter: computed(() => "discover"),
        selectFilter: vi.fn(),
        targetOpinion: computed(() => null),
        highlightState: computed<{ kind: "none" }>(() => ({ kind: "none" })),
        isResolvingLink: ref(false),
        clearHighlight: vi.fn(),
        highlightOpinion: vi.fn(),
        captureHighlight: () => vi.fn(),
      },
      onViewAnalysis: vi.fn(),
      conversationRouteContext: { kind: "normal" },
      editingOpinion: undefined,
    });

    expect(() => app.mount(container)).not.toThrow();
    expect(
      container.querySelector('[data-testid="comment-section"]')
    ).toBeNull();

    app.unmount();
  });
});
