import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, defineStore } from "pinia";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type * as ViewerScopeModule from "src/utils/query/viewerScope";
import type { ViewerQueryScope } from "src/utils/query/viewerScope";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, h, nextTick, ref } from "vue";

import type { useBackendPostApi } from "./post";

const mocks = vi.hoisted(() => ({
  fetch:
    vi.fn<
      ReturnType<
        typeof useBackendPostApi
      >["fetchConversationBySlugIdWithDisplayContent"]
    >(),
}));
const useTestLanguageStore = defineStore("conversation-language-test", () => ({
  displayLanguage: ref<SupportedDisplayLanguageCodes>("fr"),
  spokenLanguages: ref(["fr"]),
}));
const viewerScope = ref<ViewerQueryScope>({ kind: "viewer", userId: "user-a" });
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => useTestLanguageStore(),
}));
vi.mock("./post", () => ({
  useBackendPostApi: () => ({
    fetchConversationBySlugIdWithDisplayContent: mocks.fetch,
  }),
}));
vi.mock("src/utils/query/viewerScope", async (importOriginal) => {
  const original = await importOriginal<typeof ViewerScopeModule>();
  return { ...original, useViewerQueryScope: () => viewerScope };
});

import { useConversationQuery } from "./useConversationQuery";

let app: App | undefined;
let queryClient: QueryClient | undefined;
afterEach(() => {
  app?.unmount();
  queryClient?.clear();
  app = undefined;
  queryClient = undefined;
  mocks.fetch.mockReset();
});

describe("conversation request language", () => {
  it("pins each request to its query identity and aborts an obsolete language/viewer request", async () => {
    let completeOldRequest: (() => void) | undefined;
    const oldRequest = new Promise<void>((resolve) => {
      completeOldRequest = resolve;
    });
    const readObsoleteResponse = vi.fn<() => never>(() => {
      throw new Error("An aborted response must not be inspected or cached");
    });
    let oldRequestCompleted = false;
    mocks.fetch.mockImplementation(async ({ displayLanguage }) => {
      if (displayLanguage === "fr") {
        await oldRequest;
        oldRequestCompleted = true;
        // Typed getters avoid building unrelated data for a response that the
        // cancellation guard must discard before reading either field.
        return {
          get conversationData() {
            return readObsoleteResponse();
          },
          get displayContent() {
            return readObsoleteResponse();
          },
        };
      }
      throw new Error("No response needed for this request-identity test");
    });
    const pinia = createPinia();
    const languageStore = useTestLanguageStore(pinia);
    viewerScope.value = { kind: "viewer", userId: "user-a" };
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    app = createApp({
      setup() {
        useConversationQuery({ conversationSlugId: "abcdefgh" });
        return () => h("div");
      },
    });
    app.use(pinia);
    app.use(VueQueryPlugin, { queryClient });
    app.mount(document.createElement("div"));
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const firstRequest = mocks.fetch.mock.calls[0]?.[0];
    expect(firstRequest).toMatchObject({
      postSlugId: "abcdefgh",
      displayLanguage: "fr",
      loadPersonalizedData: true,
    });

    languageStore.displayLanguage = "es";
    viewerScope.value = { kind: "viewer" };
    await nextTick();
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(firstRequest?.signal?.aborted).toBe(true);
    expect(firstRequest?.displayLanguage).toBe("fr");
    expect(mocks.fetch.mock.calls[1]?.[0]).toMatchObject({
      displayLanguage: "es",
      loadPersonalizedData: false,
    });
    completeOldRequest?.();
    await vi.waitFor(() => expect(oldRequestCompleted).toBe(true));
    await nextTick();
    expect(readObsoleteResponse).not.toHaveBeenCalled();
  });
});
