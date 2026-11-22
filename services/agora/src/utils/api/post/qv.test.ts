import { beforeEach, describe, expect, it, vi } from "vitest";

import { useQvApi } from "./qv";

const mocks = vi.hoisted(() => ({
  save: vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>(),
  withdraw: vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>(),
  load: vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>(),
  sign: vi.fn<() => Promise<string>>(),
  results: vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>(),
}));
vi.mock("src/api", () => ({
  DefaultApiFactory: () => ({
    apiV1PrioritizationQvSavePost: mocks.save,
    apiV1PrioritizationQvWithdrawPost: mocks.withdraw,
    apiV1PrioritizationQvLoadPost: mocks.load,
    apiV1PrioritizationQvResultsPost: mocks.results,
  }),
  DefaultApiAxiosParamCreator: () => ({
    apiV1PrioritizationQvSavePost: () => ({ url: "/save", options: {} }),
    apiV1PrioritizationQvWithdrawPost: () => ({
      url: "/withdraw",
      options: {},
    }),
    apiV1PrioritizationQvLoadPost: () => ({ url: "/load", options: {} }),
    apiV1PrioritizationQvResultsPost: () => ({ url: "/results", options: {} }),
  }),
}));
vi.mock("../client", () => ({ api: {} }));
vi.mock("src/utils/crypto/ucan/operation", () => ({
  buildUcanForRequestWithDid: async () => ({
    encodedUcan: await mocks.sign(),
    didWrite: "did:key:qv",
  }),
}));
vi.mock("../common", () => ({
  useCommonApi: () => ({
    buildEncodedUcan: mocks.sign,
    createRawAxiosRequestConfig: (input: unknown) => input,
  }),
}));

const command = {
  conversationSlugId: "qvtest01",
  commandId: "00000000-0000-4000-8000-000000000001",
  expectedResponseRevision: 0,
  expectedViewerId: "00000000-0000-4000-8000-000000000002",
};
const allocation = {
  itemId: "proposal",
  sourceVersion: "00000000-0000-4000-8000-000000000003",
  votes: 3,
};
describe("QV typed API boundary", () => {
  it("parses only lifecycle-guarded result responses and supports cancellation", async () => {
    mocks.sign.mockResolvedValue("ucan");
    const signal = new AbortController().signal;
    mocks.results.mockResolvedValue({
      data: { status: "calculating", generation: 1 },
    });
    expect(
      await useQvApi().results({ conversationSlugId: "qvtest01", signal })
    ).toEqual({ status: "calculating", generation: 1 });
    expect(mocks.results).toHaveBeenCalledWith(
      { conversationSlugId: "qvtest01" },
      { encodedUcan: "ucan", signal }
    );
    mocks.results.mockResolvedValue({
      data: { status: "open", generation: 2, items: [] },
    });
    await expect(
      useQvApi().results({ conversationSlugId: "qvtest01", signal })
    ).rejects.toThrow();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.sign.mockResolvedValue("ucan");
  });
  it("preserves identity/revisions/command ID and parses accepted state", async () => {
    mocks.save.mockResolvedValue({
      data: {
        success: true,
        loginStatus: {
          isKnown: true,
          isRegistered: false,
          isLoggedIn: false,
          userId: command.expectedViewerId,
          credentials: { email: null, phone: null, rarimo: null },
        },
        response: {
          revision: 1,
          saved: {
            savedAt: "2026-11-04T00:00:00Z",
            creditsSpent: 9,
            allocations: [allocation],
          },
        },
      },
    });
    const request = {
      ...command,
      expectedStatementSetRevision: 2,
      allocations: [allocation],
    };
    const result = await useQvApi().save({ request, isCurrent: () => true });
    expect(mocks.save).toHaveBeenCalledWith(request, { encodedUcan: "ucan" });
    expect(result).toMatchObject({
      success: true,
      didWrite: "did:key:qv",
      loginStatus: { userId: command.expectedViewerId },
      response: { revision: 1, saved: { allocations: [allocation] } },
    });
  });
  it("does not send a command when identity changes during signing", async () => {
    let current = true;
    mocks.sign.mockImplementationOnce(() => {
      current = false;
      return Promise.resolve("ucan");
    });
    await expect(
      useQvApi().save({
        request: {
          ...command,
          expectedStatementSetRevision: 0,
          allocations: [allocation],
        },
        isCurrent: () => current,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      useQvApi().withdraw({ request: command, isCurrent: () => false })
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });
  it("rejects empty saves and malformed server responses at the boundary", async () => {
    await expect(
      useQvApi().save({
        request: {
          ...command,
          expectedStatementSetRevision: 0,
          allocations: [],
        },
        isCurrent: () => true,
      })
    ).rejects.toThrow();
    expect(mocks.sign).not.toHaveBeenCalled();
    mocks.withdraw.mockResolvedValue({
      data: { success: true, response: { revision: -1 } },
    });
    await expect(
      useQvApi().withdraw({ request: command, isCurrent: () => true })
    ).rejects.toThrow();
  });
  it("uses cancellation for owner-only snapshot reads and keeps transport failures throwable", async () => {
    const signal = new AbortController().signal;
    mocks.load.mockResolvedValue({
      data: {
        viewerId: command.expectedViewerId,
        statementSetRevision: 2,
        allowOpposition: true,
        isClosed: false,
        items: [],
        response: { revision: 0 },
      },
    });
    expect(
      await useQvApi().load({ conversationSlugId: "qvtest01", signal })
    ).toMatchObject({ viewerId: command.expectedViewerId });
    expect(mocks.load).toHaveBeenCalledWith(
      { conversationSlugId: "qvtest01" },
      { encodedUcan: "ucan", signal }
    );
    mocks.load.mockRejectedValue(new Error("Offline"));
    await expect(
      useQvApi().load({ conversationSlugId: "qvtest01", signal })
    ).rejects.toThrow("Offline");
  });
});
