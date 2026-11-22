import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import type * as Pinia from "pinia";
import type {
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import { Dto } from "src/shared/types/dto";
import type { ViewerQueryScope } from "src/utils/query/viewerScope";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, ref } from "vue";
import type { z } from "zod";

import { retainQvCalculationEvent } from "./qvCalculationState";
import { useQvResults } from "./useQvResults";

const { results } = vi.hoisted(() => ({ results: vi.fn() }));
vi.mock("./qv", () => ({ useQvApi: () => ({ results }) }));
vi.mock("src/utils/query/viewerScope", () => ({
  useViewerQueryScope: () => viewer,
}));
vi.mock("pinia", async (importOriginal) => ({
  ...(await importOriginal<typeof Pinia>()),
  storeToRefs: (store: object) => store,
}));
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => ({ displayLanguage, spokenLanguages }),
}));
const displayLanguage = ref<SupportedDisplayLanguageCodes>("en");
const spokenLanguages = ref<SupportedSpokenLanguageCodes[]>(["en"]);
const viewer = ref<ViewerQueryScope>({ kind: "viewer", userId: "viewer" });

const slug = "qvtest01";
function fallback(refreshStatus: "calculating" | "failed") {
  return Dto.qvResultsResponse.parse({
    status: "ready",
    generation: 2,
    calculationId: "00000000-0000-4000-8000-000000000001",
    capturedAt: new Date(),
    participantCount: 3,
    items: [],
    refreshStatus,
  });
}

let queryClient: QueryClient;
let response: z.infer<typeof Dto.qvResultsResponse>;
const apps: App[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  response = fallback("calculating");
  displayLanguage.value = "en";
  spokenLanguages.value = ["en"];
  results.mockReset();
  results.mockImplementation(() => Promise.resolve(response));
});
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  queryClient.clear();
  document.body.replaceChildren();
  vi.useRealTimers();
});

function mount() {
  let state: ReturnType<typeof useQvResults> | undefined;
  const node = document.createElement("div");
  document.body.append(node);
  const app = createApp({
    setup() {
      state = useQvResults(slug);
      return () => null;
    },
  });
  app.use(VueQueryPlugin, { queryClient });
  apps.push(app);
  app.mount(node);
  if (state === undefined) throw new Error("QV results hook was not mounted");
  return state;
}

describe("QV result fallback query", () => {
  it("keeps viewer scope last so authentication invalidation can identify the cache", async () => {
    response = fallback("failed");
    mount();
    await vi.waitFor(() => expect(results).toHaveBeenCalled());
    const queries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ["qv-results"] });
    expect(queries).toHaveLength(1);
    expect(queries[0]?.queryKey.at(-1)).toEqual(viewer.value);
  });
  it("refreshes pending translations without changing the accepted calculation", async () => {
    const sourceVersion = "00000000-0000-4000-8000-000000000002";
    const pendingResult = {
      ...fallback("failed"),
      items: [
        {
          itemSlugId: "item0001",
          sourceVersion,
          displayContent: {
            sourceVersion,
            status: "available",
            mode: "original",
            content: { title: "Original" },
            translationControl: {
              status: "pending",
              alternateMode: "translated",
              canRequestAlternate: true,
            },
          },
          netUnits: 2,
          supportUnits: 2,
          oppositionUnits: 0,
          supportingParticipantCount: 1,
          opposingParticipantCount: 0,
          rank: 1,
        },
      ],
    };
    response = Dto.qvResultsResponse.parse(pendingResult);
    const state = mount();
    await vi.waitFor(() => expect(state.ready.value?.items).toHaveLength(1));
    response = Dto.qvResultsResponse.parse({
      ...pendingResult,
      items: pendingResult.items.map((item) => ({
        ...item,
        displayContent: {
          ...item.displayContent,
          mode: "translated",
          content: { title: "Translated" },
          translationControl: {
            ...item.displayContent.translationControl,
            status: "completed",
            alternateMode: "original",
          },
        },
      })),
    });
    results.mockRejectedValueOnce(new Error("Offline"));
    await vi.advanceTimersByTimeAsync(1100);
    expect(state.ready.value?.items[0]?.displayContent).toMatchObject({
      mode: "original",
    });
    await vi.advanceTimersByTimeAsync(1100);
    await vi.waitFor(() =>
      expect(state.ready.value?.items[0]?.displayContent).toMatchObject({
        mode: "translated",
        content: { title: "Translated" },
      })
    );
    expect(state.ready.value?.generation).toBe(2);
    const calls = results.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    expect(results).toHaveBeenCalledTimes(calls);
  });

  it("partitions result reads by display and spoken languages", async () => {
    response = fallback("failed");
    const state = mount();
    await vi.waitFor(() => expect(state.ready.value).toBeDefined());
    const initialCalls = results.mock.calls.length;
    displayLanguage.value = "fr";
    await vi.waitFor(() =>
      expect(results.mock.calls.length).toBeGreaterThan(initialCalls)
    );
    const frenchCalls = results.mock.calls.length;
    spokenLanguages.value = ["fr"];
    await vi.waitFor(() =>
      expect(results.mock.calls.length).toBeGreaterThan(frenchCalls)
    );
  });

  it("shows the accepted result and continues polling until replacement is ready", async () => {
    const state = mount();
    await vi.waitFor(() => {
      expect(state.ready.value).toMatchObject({
        participantCount: 3,
        refreshStatus: "calculating",
      });
    });
    response = Dto.qvResultsResponse.parse({
      ...response,
      refreshStatus: undefined,
      calculationId: "00000000-0000-4000-8000-000000000002",
      participantCount: 2,
    });
    await vi.advanceTimersByTimeAsync(2100);
    await vi.waitFor(() => {
      expect(state.ready.value).toMatchObject({
        participantCount: 2,
        calculationId: "00000000-0000-4000-8000-000000000002",
      });
    });
  });

  it("keeps a failed correction's accepted result without continuous polling", async () => {
    response = fallback("failed");
    const state = mount();
    await vi.waitFor(() => {
      expect(state.ready.value?.refreshStatus).toBe("failed");
    });
    const settledCalls = results.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    expect(results).toHaveBeenCalledTimes(settledCalls);
    expect(state.ready.value?.participantCount).toBe(3);
  });

  it("hides fallback data immediately on reopening even before its next read finishes", async () => {
    const state = mount();
    await vi.waitFor(() => expect(state.ready.value).toBeDefined());
    response = { status: "open", generation: 3 };
    retainQvCalculationEvent({
      queryClient,
      data: { conversationSlugId: slug, generation: 3, status: "open" },
    });
    expect(state.ready.value).toBeUndefined();
    await vi.waitFor(() => expect(state.query.data.value).toEqual(response));
  });

  it("keeps the last complete result while a read for the same close is in flight", async () => {
    response = Dto.qvResultsResponse.parse({
      ...fallback("failed"),
      refreshStatus: undefined,
      closedAnalysisSelection: {
        closeId: 7,
        selectionRevision: 1,
        status: "ready",
        isSwitchable: true,
        servedInputMode: "live",
      },
    });
    const state = mount();
    await vi.waitFor(() => expect(state.ready.value?.participantCount).toBe(3));
    let completeRead = () => {};
    results.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeRead = () => resolve(response);
        })
    );
    const calls = results.mock.calls.length;
    retainQvCalculationEvent({
      queryClient,
      data: {
        conversationSlugId: slug,
        closeId: 7,
        generation: 3,
        status: "calculating",
      },
    });
    await vi.waitFor(() =>
      expect(results.mock.calls.length).toBeGreaterThan(calls)
    );
    expect(state.ready.value?.participantCount).toBe(3);
    response = Dto.qvResultsResponse.parse({
      ...response,
      generation: 3,
      refreshStatus: "failed",
      closedAnalysisSelection: {
        ...state.ready.value?.closedAnalysisSelection,
        status: "failed",
        requestedInputMode: "live",
      },
    });
    completeRead();
    await vi.waitFor(() =>
      expect(state.ready.value?.closedAnalysisSelection?.status).toBe("failed")
    );
    expect(state.ready.value?.participantCount).toBe(3);
  });
});
