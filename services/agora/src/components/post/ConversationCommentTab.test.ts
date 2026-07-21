import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";

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
  function readRef(value: unknown): void {
    if (typeof value === "object" && value !== null && "value" in value) {
      void value.value;
    }
  }

  return {
    useCommentsQuery: (options: {
      conversationSlugId: unknown;
      voteCount: unknown;
    }) => {
      readRef(options.conversationSlugId);
      readRef(options.voteCount);
      return {};
    },
    useHiddenCommentsQuery: (options: {
      conversationSlugId: unknown;
      voteCount: unknown;
    }) => {
      readRef(options.conversationSlugId);
      readRef(options.voteCount);
      return {};
    },
    useInvalidateCommentQueries: () => ({
      markAnalysisAsStale: vi.fn(),
      markCommentsAsStale: vi.fn(),
    }),
  };
});

vi.mock("./comments/CommentSection.vue", () => ({
  default: { template: '<div data-testid="comment-section"></div>' },
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
      moderationHistoryTrigger: 0,
      commentFilter: "discover",
      onViewAnalysis: vi.fn(),
      conversationRouteContext: { kind: "normal" },
    });

    expect(() => app.mount(container)).not.toThrow();
    expect(container.querySelector('[data-testid="comment-section"]')).toBeNull();

    app.unmount();
  });
});
