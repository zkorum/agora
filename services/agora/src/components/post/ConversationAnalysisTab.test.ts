import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
}));

vi.mock("src/utils/api/comment/useCommentQueries", () => {
  function readRef(value: unknown): void {
    if (typeof value === "object" && value !== null && "value" in value) {
      void value.value;
    }
  }

  function createQueryResult() {
    return {
      isPending: { value: false },
      isRefetching: { value: false },
      data: { value: undefined },
      refetch: vi.fn(),
    };
  }

  return {
    useAnalysisQuery: (options: {
      conversationSlugId: unknown;
      voteCount: unknown;
      aiLabelingEnabled: unknown;
      enabled: unknown;
    }) => {
      readRef(options.conversationSlugId);
      readRef(options.voteCount);
      readRef(options.aiLabelingEnabled);
      readRef(options.enabled);
      return createQueryResult();
    },
    useAnalysisCheckpointsQuery: (options: {
      conversationSlugId: unknown;
      enabled: unknown;
    }) => {
      readRef(options.conversationSlugId);
      readRef(options.enabled);
      return createQueryResult();
    },
  };
});

vi.mock("src/utils/api/survey/useSurveyQueries", () => ({
  useSurveyResultsAggregatedQuery: (options: {
    conversationSlugId: unknown;
    enabled: unknown;
  }) => {
    if (
      typeof options.conversationSlugId === "object" &&
      options.conversationSlugId !== null &&
      "value" in options.conversationSlugId
    ) {
      void options.conversationSlugId.value;
    }
    if (
      typeof options.enabled === "object" &&
      options.enabled !== null &&
      "value" in options.enabled
    ) {
      void options.enabled.value;
    }
    return {
      isPending: { value: false },
      isRefetching: { value: false },
      data: { value: undefined },
      refetch: vi.fn(),
    };
  },
}));

vi.mock("./analysis/AnalysisPage.vue", () => ({
  default: { template: '<div data-testid="analysis-page"></div>' },
}));

import ConversationAnalysisTab from "./ConversationAnalysisTab.vue";

afterEach(() => {
  document.body.replaceChildren();
});

describe("ConversationAnalysisTab", () => {
  it("does not read metadata while conversation data is unavailable", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const app = createApp(ConversationAnalysisTab, {
      conversationData: undefined,
      navigateToDiscoverTab: vi.fn(),
      conversationScrollContext: {
        actionBarElement: null,
        scrollContainerElement: null,
        getScrollPosition: () => 0,
        getElementScrollPosition: () => 0,
        scrollToPosition: vi.fn(),
      },
    });

    expect(() => app.mount(container)).not.toThrow();
    expect(container.querySelector('[data-testid="analysis-page"]')).toBeNull();

    app.unmount();
  });
});
