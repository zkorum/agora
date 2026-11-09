import { createPinia } from "pinia";
import { zodOpinionModerationProperties } from "src/shared/types/zod";
import { describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";
import { createI18n } from "vue-i18n";

import CommentModeration from "./CommentModeration.vue";

vi.mock("src/stores/user", async () => {
  const { defineStore } = await import("pinia");
  return {
    useUserStore: defineStore("moderation-test-user", {
      state: () => ({
        profileData: {
          isSiteModerator: false,
          userName: "viewer",
          organizationList: [{ name: "unrelated-organization" }],
        },
      }),
    }),
  };
});

vi.mock("src/components/post/common/moderation/ModerationTime.vue", () => ({
  default: { render: () => null },
}));

vi.mock("src/components/ui-library/ZKButton.vue", () => ({
  default: { render: () => null },
}));

describe("statement moderation reason display", () => {
  it.each([
    { reason: "off_topic", english: "Off-topic", french: "Hors sujet" },
    { reason: "other", english: "Other", french: "Autre" },
  ])(
    "localizes $reason without rendering explanation HTML",
    async (testCase) => {
      const explanation = '<img src="x" onerror="alert(1)">';
      const moderation = zodOpinionModerationProperties.parse({
        status: "moderated",
        reason: testCase.reason,
        action: "move",
        explanation,
        createdAt: "2026-11-09T12:00:00Z",
        updatedAt: "2026-11-09T12:00:00Z",
      });
      const container = document.createElement("div");
      const i18n = createI18n({ legacy: false, locale: "en", messages: {} });
      const app = createApp({
        render: () =>
          h(CommentModeration, {
            moderation,
            opinionSlugId: "opinion123",
            postSlugId: "convo123",
            conversationAuthorUsername: "author",
            conversationOrganizationName: "",
          }),
      });
      app.use(createPinia());
      app.use(i18n);
      app.mount(container);

      try {
        expect(container.textContent).toContain(`"${testCase.english}"`);
        expect(container.textContent).toContain(explanation);
        expect(container.querySelector("img")).toBeNull();

        i18n.global.locale.value = "fr";
        await nextTick();

        expect(container.textContent).toContain(`"${testCase.french}"`);
        expect(container.querySelector("img")).toBeNull();
      } finally {
        app.unmount();
      }
    }
  );
});
