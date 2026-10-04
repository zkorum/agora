import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h } from "vue";

const mocks = vi.hoisted(() => ({ getConversationSummary: vi.fn() }));
vi.mock("./conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => ({ getConversationSummary: mocks.getConversationSummary }),
}));

import { type ConversationEmailUpdateOnboardingResolution, useConversationEmailUpdateSummaryQuery } from "./useConversationEmailUpdateQueries";

describe("email update participation eligibility", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it.each(["anonymous", "guest"])("does not manually fetch the account-only summary for %s", async identity => {
    const authStore = useAuthenticationStore();
    authStore.isAuthInitialized = true;
    if (identity === "guest") {
      authStore.setLoginStatus({ isKnown: true, userId: "guest", isRegistered: false });
    }
    const queryClient = new QueryClient();
    let resolveOnboarding: () => Promise<ConversationEmailUpdateOnboardingResolution> =
      () => Promise.resolve({ status: "loading" });
    const app = createApp(defineComponent({
      setup() {
        const query = useConversationEmailUpdateSummaryQuery({ conversationSlugId: "conversation", enabled: true });
        resolveOnboarding = query.resolveOnboarding;
        return () => h("div");
      },
    }));
    app.use(VueQueryPlugin, { queryClient });
    const container = document.createElement("div");
    app.mount(container);
    try {
      await expect(resolveOnboarding()).resolves.toEqual({ status: "not_required" });
      expect(mocks.getConversationSummary).not.toHaveBeenCalled();
    } finally {
      app.unmount();
      queryClient.clear();
    }
  });
});
