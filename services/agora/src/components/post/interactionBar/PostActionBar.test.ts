import type { ConversationTypeConfig } from "src/shared/types/zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, ref } from "vue";

vi.mock("quasar", () => ({
  useQuasar: () => ({ dialog: vi.fn() }),
  copyToClipboard: vi.fn(),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/composables/share/useShareActions", () => ({
  useShareActions: () => ({
    dialogState: ref({ isVisible: false, actions: [] }),
    closeDialog: vi.fn(),
    showShareActions: vi.fn(),
    handleAction: vi.fn(),
  }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showCopiedToClipboard: vi.fn() }),
}));
vi.mock("src/utils/url/conversationUrl", () => ({
  useConversationUrl: () => ({
    getConversationUrl: () => "/conversation/qvtest01",
  }),
}));
vi.mock("./InteractionTab.vue", () => ({
  default: { template: "<div>Statements / Analysis</div>" },
}));
vi.mock("./CountBreakdownDialog.vue", () => ({
  default: { template: '<div class="breakdown" />' },
}));
vi.mock("../../ui-library/AnimatedAmountText.vue", () => ({
  default: {
    props: ["amount"],
    template: '<span class="amount">{{amount}}</span>',
  },
}));
vi.mock("../../ui-library/ZKButton.vue", () => ({
  default: { template: "<button><slot /></button>" },
}));
vi.mock("../../ui-library/ZKIcon.vue", () => ({
  default: { template: "<span />" },
}));
vi.mock("../../ui-library/ZKActionDialog.vue", () => ({
  default: { template: "<div />" },
}));

import PostActionBar from "./PostActionBar.vue";
const apps: App[] = [];
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
});
describe("method-specific community counters", () => {
  it.each([
    {
      config: { conversationType: "polis", votingPresentation: "list" },
      counts: true,
    },
    {
      config: {
        conversationType: "prioritizing",
        prioritizationType: "comparisons",
        comparisonMethod: "bws",
      },
      counts: true,
    },
    {
      config: {
        conversationType: "prioritizing",
        prioritizationType: "qv",
        creditPricing: "quadratic",
        allowOpposition: true,
      },
      counts: false,
    },
  ] satisfies { config: ConversationTypeConfig; counts: boolean }[])(
    "exposes community counters only when available ($config.conversationType)",
    ({ config, counts }) => {
      const container = document.createElement("div");
      document.body.append(container);
      const app = createApp(PostActionBar, {
        modelValue: "comment",
        compactMode: false,
        opinionCount: 2,
        participantCount: 0,
        voteCount: 0,
        totalParticipantCount: 0,
        totalVoteCount: 0,
        conversationSlugId: "qvtest01",
        conversationTitle: "Title",
        authorUsername: "author",
        conversationTypeConfig: config,
        enableRouteNavigation: false,
      });
      apps.push(app);
      app.mount(container);
      expect(container.querySelectorAll(".amount")).toHaveLength(
        counts ? 2 : 1
      );
      expect(container.querySelectorAll(".breakdown")).toHaveLength(
        counts ? 2 : 0
      );
      expect(container.textContent).toContain("Statements / Analysis");
      expect(container.textContent).toContain("share");
    }
  );
});
