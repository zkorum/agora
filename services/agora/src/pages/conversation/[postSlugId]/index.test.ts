import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, createApp, ref } from "vue";

vi.mock("src/components/post/ConversationCommentTab.vue", () => ({
  default: { template: '<div data-testid="comment-tab"></div>' },
}));

vi.mock("src/components/post/maxdiff/MaxDiffVotingTab.vue", () => ({
  default: { template: '<div data-testid="maxdiff-tab"></div>' },
}));

import ConversationIndexRoute from "./index.vue";

afterEach(() => {
  document.body.replaceChildren();
});

describe("conversation index route", () => {
  it("mounts neither conversation tab while data is unavailable", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp(ConversationIndexRoute, {
      conversationData: undefined,
      opinionState: {
        filter: computed(() => "moderated"),
        selectFilter: vi.fn(),
        targetOpinion: computed(() => null),
        highlightState: computed<{ kind: "none" }>(() => ({ kind: "none" })),
        isResolvingLink: ref(false),
        clearHighlight: vi.fn(),
        highlightOpinion: vi.fn(),
        captureHighlight: () => vi.fn(),
      },
      editingOpinion: undefined,
      onViewAnalysis: vi.fn(),
      conversationRouteContext: { kind: "normal" },
    });

    app.mount(container);

    expect(container.querySelector('[data-testid="comment-tab"]')).toBeNull();
    expect(container.querySelector('[data-testid="maxdiff-tab"]')).toBeNull();
    app.unmount();
  });
});
