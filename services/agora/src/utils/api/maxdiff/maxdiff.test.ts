import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMaxDiffApi } from "./maxdiff";

const mocks = vi.hoisted(() => ({
  load: vi.fn<() => Promise<{ data: unknown }>>(),
  sync: vi.fn<() => Promise<{ data: unknown }>>(),
  preview: vi.fn<() => Promise<{ data: unknown }>>(),
}));
vi.mock("src/api", () => ({
  DefaultApiFactory: () => ({
    apiV1RankingBwsLoadPost: mocks.load,
    apiV1RankingBwsSyncPost: mocks.sync,
    apiV1RankingBwsGithubPreviewPost: mocks.preview,
  }),
  DefaultApiAxiosParamCreator: () => ({
    apiV1RankingBwsLoadPost: () => ({ url: "/load", options: {} }),
    apiV1RankingBwsSyncPost: () => ({ url: "/sync", options: {} }),
    apiV1RankingBwsGithubPreviewPost: () => ({ url: "/preview", options: {} }),
  }),
}));
vi.mock("../client", () => ({ api: {} }));
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

  it("returns parsed ranking state and identifies malformed responses as contract errors", async () => {
    const api = useMaxDiffApi();
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
      await api.loadMaxDiffResult({ conversationSlugId: "ranking" })
    ).toMatchObject({ status: "success", data: { isComplete: false } });
    mocks.load.mockResolvedValueOnce({ data: { isComplete: "false" } });
    expect(
      await api.loadMaxDiffResult({ conversationSlugId: "ranking" })
    ).toMatchObject({ status: "error", kind: "contract", code: undefined });
  });

  it("parses sync and external preview data before exposing it", async () => {
    const api = useMaxDiffApi();
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
      await api.syncMaxDiff({ conversationSlugId: "ranking" })
    ).toMatchObject({ kind: "contract" });
    expect(
      await api.previewGitHubIssues({ repository: "owner/repo", label: "item" })
    ).toMatchObject({ kind: "contract" });
  });

  it("keeps network failures distinguishable from contract failures", async () => {
    mocks.load.mockRejectedValue(new AxiosError("offline", "ERR_NETWORK"));
    expect(
      await useMaxDiffApi().loadMaxDiffResult({ conversationSlugId: "ranking" })
    ).toMatchObject({ kind: "transport", code: "ERR_NETWORK" });
  });
});
