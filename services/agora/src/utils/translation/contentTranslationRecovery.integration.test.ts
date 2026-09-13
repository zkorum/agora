import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { Dto } from "src/shared/types/dto";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import type {
  ContentTranslationResponse,
  ConversationContentFetchResponse,
  useBackendContentTranslationApi,
} from "src/utils/api/contentTranslation/contentTranslation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type EffectScope, effectScope } from "vue";

import { publishContentTranslationEvent } from "./contentTranslationEvents";
import { useConversationDisplayContent } from "./useConversationDisplayContent";
import {
  type OpinionItemDisplayContentInput,
  useOpinionItemDisplayContent,
} from "./useOpinionItemDisplayContent";

const api = vi.hoisted(() => ({
  requestContentTranslation:
    vi.fn<
      ReturnType<
        typeof useBackendContentTranslationApi
      >["requestContentTranslation"]
    >(),
  fetchConversationContent:
    vi.fn<
      ReturnType<
        typeof useBackendContentTranslationApi
      >["fetchConversationContent"]
    >(),
  updateAuthState: vi.fn(),
  showNotifyMessage: vi.fn(),
}));

vi.mock("src/utils/api/contentTranslation/contentTranslation", () => ({
  useBackendContentTranslationApi: () => api,
}));
vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => api,
}));
vi.mock("src/utils/ui/notify", () => ({ useNotify: () => api }));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/utils/api/post/useConversationQuery", () => ({
  updateConversationQueryCache: vi.fn(),
}));
vi.mock("src/stores/language", async () => {
  const { defineStore } = await import("pinia");
  return {
    useLanguageStore: defineStore("translation-test-language", {
      state: () => ({ displayLanguage: "en", spokenLanguages: ["en"] }),
    }),
  };
});

const sourceVersion = "00000000-0000-4000-8000-000000000001";
const conversationSlugId = "MyuO00A";

function subject(opinionSlugId: string) {
  return {
    kind: "opinion" as const,
    conversationSlugId,
    opinionSlugId,
    sourceVersion,
  };
}

function response({
  opinionSlugId,
  completed,
}: {
  opinionSlugId: string;
  completed: boolean;
}): ContentTranslationResponse {
  return {
    success: true,
    subject: subject(opinionSlugId),
    content: {
      kind: "translatable",
      sourceVersion,
      initialMode: "original",
      translation: {
        targetLanguageCode: "en",
        sourceLanguage: {
          kind: "recognized",
          languageCode: "fr",
          label: "French",
        },
        status: completed ? "completed" : "pending",
      },
      variants: {
        original: { content: "Bonjour" },
        translated: completed
          ? { content: `Hello ${opinionSlugId}` }
          : undefined,
      },
    },
  };
}

function completion(opinionSlugId: string): void {
  publishContentTranslationEvent({
    subject: subject(opinionSlugId),
    targetLanguageCode: "en",
    status: "completed",
    timestamp: 10,
  });
}

const scopes: EffectScope[] = [];
let queryClient: QueryClient;
let app: ReturnType<typeof createApp>;

function mountFlow<T>(setup: () => T): T {
  const scope = effectScope();
  scopes.push(scope);
  const flow = app.runWithContext(() => scope.run(setup));
  if (flow === undefined) throw new Error("Test scope did not initialize");
  return flow;
}

function mountOpinion({
  opinionSlugId = "opinion1",
  pending = true,
}: {
  opinionSlugId?: string;
  pending?: boolean;
} = {}) {
  const opinionItem: OpinionItemDisplayContentInput = {
    opinionSlugId,
    opinion: "Bonjour",
    sourceLanguageCode: "fr",
    displayContent: {
      sourceVersion,
      status: "available",
      mode: "original",
      content: { content: "Bonjour" },
      translationControl: {
        status: pending ? "pending" : "not_requested",
        alternateMode: "translated",
        canRequestAlternate: !pending,
      },
    },
  };
  return mountFlow(() =>
    useOpinionItemDisplayContent({ conversationSlugId, opinionItem })
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = new QueryClient();
  app = createApp({});
  app.use(createPinia());
  app.use(VueQueryPlugin, { queryClient });
});

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
  queryClient.clear();
  queryClient.unmount();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("statement translation completion", () => {
  it.each([true, false])(
    "shows completion immediately after an older request returns (automatic=%s)",
    async (automatic) => {
      const initial = Promise.withResolvers<ContentTranslationResponse>();
      api.requestContentTranslation.mockReturnValueOnce(initial.promise);
      api.requestContentTranslation.mockResolvedValue(
        response({ opinionSlugId: "opinion1", completed: true })
      );
      const flow = mountOpinion({ pending: automatic });
      if (!automatic) flow.setTranslationMode("translated");
      await vi.advanceTimersByTimeAsync(0);
      expect(api.requestContentTranslation).toHaveBeenCalledOnce();

      completion("opinion1");
      await vi.advanceTimersByTimeAsync(0);
      expect(api.requestContentTranslation).toHaveBeenCalledOnce();

      initial.resolve(
        response({ opinionSlugId: "opinion1", completed: false })
      );
      await vi.advanceTimersByTimeAsync(0);

      expect(flow.translationPreview.value?.translationStatus).toBe(
        "completed"
      );
      expect(flow.displayedOpinion.value).toBe("Hello opinion1");
      expect(api.requestContentTranslation).toHaveBeenCalledTimes(2);
      expect(api.requestContentTranslation).toHaveBeenLastCalledWith(
        expect.objectContaining({ requestMode: "read_existing" })
      );
      expect(api.showNotifyMessage).not.toHaveBeenCalled();
    }
  );

  it("updates every statement when translations finish in parallel", async () => {
    const first = Promise.withResolvers<ContentTranslationResponse>();
    const second = Promise.withResolvers<ContentTranslationResponse>();
    api.requestContentTranslation.mockImplementation((params) => {
      const { subject: current } = Dto.contentTranslationRequest.parse(params);
      if (current.kind !== "opinion")
        throw new Error("Expected an opinion request");
      return current.opinionSlugId === "opinion1"
        ? first.promise
        : second.promise;
    });
    const firstFlow = mountOpinion({ opinionSlugId: "opinion1" });
    const secondFlow = mountOpinion({ opinionSlugId: "opinion2" });
    completion("opinion2");
    completion("opinion1");

    api.requestContentTranslation.mockImplementation((params) => {
      const { subject: current } = Dto.contentTranslationRequest.parse(params);
      if (current.kind !== "opinion")
        throw new Error("Expected an opinion request");
      return Promise.resolve(
        response({ opinionSlugId: current.opinionSlugId, completed: true })
      );
    });
    first.resolve(response({ opinionSlugId: "opinion1", completed: false }));
    second.resolve(response({ opinionSlugId: "opinion2", completed: false }));
    await vi.advanceTimersByTimeAsync(0);

    expect(firstFlow.displayedOpinion.value).toBe("Hello opinion1");
    expect(secondFlow.displayedOpinion.value).toBe("Hello opinion2");
    expect(api.requestContentTranslation).toHaveBeenCalledTimes(4);
  });

  it("shares one refresh between multiple views of the same statement", async () => {
    const initial = Promise.withResolvers<ContentTranslationResponse>();
    api.requestContentTranslation.mockReturnValueOnce(initial.promise);
    api.requestContentTranslation.mockResolvedValue(
      response({ opinionSlugId: "opinion1", completed: true })
    );
    const firstFlow = mountOpinion();
    const secondFlow = mountOpinion();
    completion("opinion1");
    initial.resolve(response({ opinionSlugId: "opinion1", completed: false }));
    await vi.advanceTimersByTimeAsync(0);

    expect(firstFlow.displayedOpinion.value).toBe("Hello opinion1");
    expect(secondFlow.displayedOpinion.value).toBe("Hello opinion1");
    expect(api.requestContentTranslation).toHaveBeenCalledTimes(2);
  });

  it("recovers a missed completion event through fallback polling", async () => {
    api.requestContentTranslation.mockResolvedValueOnce(
      response({ opinionSlugId: "opinion1", completed: false })
    );
    api.requestContentTranslation.mockResolvedValue(
      response({ opinionSlugId: "opinion1", completed: true })
    );
    const flow = mountOpinion();
    await vi.advanceTimersByTimeAsync(0);
    expect(flow.translationPreview.value?.translationStatus).toBe("pending");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(flow.displayedOpinion.value).toBe("Hello opinion1");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.requestContentTranslation).toHaveBeenCalledTimes(2);
  });
});

describe("conversation translation completion", () => {
  it("uses read-only recovery after completion during a queue request", async () => {
    const conversationData: ExtendedConversationDisplayData = {
      metadata: {
        conversationSlugId,
        conversationType: "polis",
        createdAt: new Date(),
        lastReactedAt: new Date(),
        opinionCount: 0,
        voteCount: 0,
        participantCount: 0,
        totalOpinionCount: 0,
        totalVoteCount: 0,
        totalParticipantCount: 0,
        moderatedOpinionCount: 0,
        hiddenOpinionCount: 0,
        authorUsername: "author",
        participationMode: "guest",
        isIndexed: true,
        aiLabelingEnabled: false,
        preferredOpinionGroupCount: null,
        contentLanguageMetadata: {
          detectedDisplayLanguageCode: "fr",
          detectedSourceLanguageCode: "fr",
          detectedRawLanguageCode: "fr",
          detectionConfidence: 1,
          autoDetectionStatus: "detected",
        },
        languageSetting: {
          mode: "manual",
          languageCode: "fr",
          detectedLanguageCode: "fr",
          detectedSourceLanguageCode: "fr",
          detectedRawLanguageCode: "fr",
          detectionConfidence: 1,
          autoDetectionStatus: "detected",
        },
        multilingualSetting: {
          additionalLanguageCodes: ["en"],
          dynamicTranslationEnabled: true,
        },
        isClosed: false,
        isEdited: false,
        moderation: { status: "unmoderated" },
        externalSourceConfig: null,
      },
      interaction: { hasVoted: false, votedIndex: 0 },
    };
    const initialDisplayContent: ConversationContentFetchResponse = {
      sourceVersion,
      status: "available",
      mode: "original",
      content: { title: "Bonjour" },
      translationControl: {
        status: "not_requested",
        alternateMode: "translated",
        canRequestAlternate: true,
      },
    };
    const queued = Promise.withResolvers<ConversationContentFetchResponse>();
    api.fetchConversationContent.mockReturnValueOnce(queued.promise);
    api.fetchConversationContent.mockResolvedValue({
      sourceVersion,
      status: "available",
      mode: "translated",
      content: { title: "Hello" },
      translationControl: {
        status: "completed",
        alternateMode: "original",
        canRequestAlternate: true,
      },
    });
    const flow = mountFlow(() =>
      useConversationDisplayContent({
        conversationData,
        initialDisplayContent,
      })
    );
    flow.setTranslationMode("translated");
    await vi.advanceTimersByTimeAsync(0);
    publishContentTranslationEvent({
      subject: { kind: "conversation", conversationSlugId, sourceVersion },
      targetLanguageCode: "en",
      status: "completed",
      timestamp: 10,
    });
    queued.resolve({
      sourceVersion,
      status: "pending",
      translationControl: {
        status: "pending",
        alternateMode: "original",
        canRequestAlternate: true,
      },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(flow.displayedTitle.value).toBe("Hello");
    expect(
      api.fetchConversationContent.mock.calls.map(
        ([request]) => request.requestMode
      )
    ).toEqual(["queue_if_missing", "read_existing"]);
  });
});
