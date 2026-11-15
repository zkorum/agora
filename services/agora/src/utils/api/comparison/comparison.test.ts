import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useComparisonApi } from "./comparison";

const mocks = vi.hoisted(() => ({
  save: vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>(),
  load: vi.fn<() => Promise<{ data: unknown }>>(),
  sync: vi.fn<() => Promise<{ data: unknown }>>(),
  preview: vi.fn<() => Promise<{ data: unknown }>>(),
  create: vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>(),
  applyAuth: vi.fn(() =>
    Promise.resolve({ authStateChanged: false, needsCacheRefresh: false })
  ),
}));
vi.mock("src/api", () => ({
  DefaultApiFactory: () => ({
    apiV1RankingBwsSavePost: mocks.save,
    apiV1RankingBwsLoadPost: mocks.load,
    apiV1RankingBwsSyncPost: mocks.sync,
    apiV1RankingBwsGithubPreviewPost: mocks.preview,
    apiV1PrioritizationComparisonsStatementsCreatePost: mocks.create,
  }),
  DefaultApiAxiosParamCreator: () => ({
    apiV1RankingBwsSavePost: () => ({ url: "/save", options: {} }),
    apiV1RankingBwsLoadPost: () => ({ url: "/load", options: {} }),
    apiV1RankingBwsSyncPost: () => ({ url: "/sync", options: {} }),
    apiV1RankingBwsGithubPreviewPost: () => ({ url: "/preview", options: {} }),
    apiV1PrioritizationComparisonsStatementsCreatePost: () => ({
      url: "/create",
      options: { method: "POST" },
    }),
  }),
}));
vi.mock("../client", () => ({ api: {} }));
vi.mock("../auth", () => ({
  useBackendAuthApi: () => ({
    applyAcceptedParticipationAuth: mocks.applyAuth,
  }),
}));
vi.mock("src/utils/crypto/ucan/operation", () => ({
  buildUcanForRequestWithDid: () =>
    Promise.resolve({ encodedUcan: "ucan", didWrite: "did:key:request" }),
}));
vi.mock("../common", async () => {
  const { classifyApiError } = await import("../error");
  return {
    useCommonApi: () => ({
      buildEncodedUcan: () => "ucan",
      createRawAxiosRequestConfig: () => ({}),
      createAxiosErrorResponse: classifyApiError,
    }),
  };
});

describe("ranking response ingress", () => {
  beforeEach(() => vi.clearAllMocks());
  it("installs the accepted statement's identity without a follow-up auth request", async () => {
    const loginStatus = {
      isKnown: true,
      isRegistered: false,
      isLoggedIn: false,
      userId: "accepted-guest",
      credentials: { email: null, phone: null, rarimo: null },
    };
    mocks.create.mockResolvedValue({
      data: {
        success: true,
        itemSlugId: "item1234",
        sourceVersion: "00000000-0000-4000-8000-000000000001",
        loginStatus,
      },
    });
    const isCurrent = () => true;
    expect(
      await useComparisonApi().createStatement({
        conversationSlugId: "ranking",
        statementBody: "<p>Improve transit</p>",
        isCurrent,
      })
    ).toMatchObject({ success: true, loginStatus });
    expect(mocks.applyAuth).toHaveBeenCalledExactlyOnceWith({
      loginStatus,
      didWrite: "did:key:request",
      isCurrent,
    });
    expect(mocks.create).toHaveBeenCalledWith(
      {
        conversationSlugId: "ranking",
        statementBody: "<p>Improve transit</p>",
      },
      expect.anything()
    );
  });

  it.each([undefined, "bws", "pairwise"] as const)(
    "uses the shared save contract and preserves the requested method (%s)",
    async (comparisonMethod) => {
      mocks.save.mockResolvedValue({
        data: { success: true, candidateSets: [] },
      });
      const response = await useComparisonApi().saveComparisonResponse({
        conversationSlugId: "ranking",
        comparisonMethod,
        ranking: null,
        comparisons: [{ best: "a", worst: "b", set: ["a", "b"] }],
        isComplete: false,
      });
      expect(response).toMatchObject({
        status: "success",
        data: { success: true },
      });
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          comparisonMethod: comparisonMethod ?? "bws",
        }),
        expect.anything()
      );
    }
  );

  it("does not send malformed or obsolete-session answers", async () => {
    const request = {
      conversationSlugId: "ranking",
      ranking: null,
      isComplete: false,
    };
    const api = useComparisonApi();
    expect(
      await api.saveComparisonResponse({
        ...request,
        comparisons: [{ best: "a", worst: "a", set: ["a", "b"] }],
      })
    ).toMatchObject({ status: "error", kind: "contract" });
    await api.saveComparisonResponse({
      ...request,
      comparisons: [],
      isCurrent: () => false,
    });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("returns parsed ranking state and identifies malformed responses as contract errors", async () => {
    const api = useComparisonApi();
    mocks.load.mockResolvedValueOnce({
      data: {
        ranking: null,
        comparisons: null,
        isComplete: false,
        candidateSets: [],
        perUserScores: null,
      },
    });
    expect(
      await api.loadComparisonResponse({ conversationSlugId: "ranking" })
    ).toMatchObject({ status: "success", data: { isComplete: false } });
    mocks.load.mockResolvedValueOnce({ data: { isComplete: "false" } });
    expect(
      await api.loadComparisonResponse({ conversationSlugId: "ranking" })
    ).toMatchObject({ status: "error", kind: "contract", code: undefined });
  });

  it("parses sync and external preview data before exposing it", async () => {
    const api = useComparisonApi();
    mocks.sync.mockResolvedValue({ data: { created: "one", updated: 0 } });
    mocks.preview.mockResolvedValue({
      data: {
        issues: [
          {
            number: 1,
            title: "item",
            body: null,
            state: "unexpected",
            htmlUrl: "https://example.com",
          },
        ],
      },
    });
    expect(
      await api.syncComparisonSource({ conversationSlugId: "ranking" })
    ).toMatchObject({ kind: "contract" });
    expect(
      await api.previewGitHubIssues({ repository: "owner/repo", label: "item" })
    ).toMatchObject({ kind: "contract" });
  });

  it("keeps network failures distinguishable from contract failures", async () => {
    mocks.load.mockRejectedValue(new AxiosError("offline", "ERR_NETWORK"));
    expect(
      await useComparisonApi().loadComparisonResponse({
        conversationSlugId: "ranking",
      })
    ).toMatchObject({ kind: "transport", code: "ERR_NETWORK" });
  });
});
