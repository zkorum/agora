import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";

vi.mock("src/components/post/ConversationAnalysisTab.vue", () => ({
  default: { template: '<div data-testid="analysis-tab"></div>' },
}));

vi.mock("src/components/post/comparison/ComparisonResultsTab.vue", () => ({
  default: { template: '<div data-testid="comparison-results"></div>' },
}));

import AnalysisRoute from "./analysis.vue";

afterEach(() => {
  document.body.replaceChildren();
});

describe("conversation analysis route", () => {
  it("does not read metadata while conversation data is unavailable", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const app = createApp(AnalysisRoute, {
      conversationData: undefined,
      navigateToDiscoverTab: vi.fn(),
      conversationScrollContext: {
        actionBarElement: null,
        scrollContainerElement: null,
        getScrollPosition: () => 0,
        getElementScrollPosition: () => 0,
        scrollToPosition: vi.fn(),
      },
      conversationRouteContext: { kind: "normal" },
    });

    expect(() => app.mount(container)).not.toThrow();
    expect(container.querySelector('[data-testid="analysis-tab"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="comparison-results"]')
    ).toBeNull();

    app.unmount();
  });
});
