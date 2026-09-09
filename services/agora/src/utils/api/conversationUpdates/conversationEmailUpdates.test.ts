import { Dto } from "src/shared/types/dto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useBackendConversationEmailUpdatesApi } from "./conversationEmailUpdates";

const transport = vi.hoisted(() => ({
  post: vi.fn(),
  buildEncodedUcan: vi.fn(() => Promise.resolve("ucan")),
  createRawAxiosRequestConfig: vi.fn(() => ({
    headers: { Authorization: "Bearer ucan" },
    timeout: 8000,
  })),
}));
vi.mock("../client", () => ({ api: { post: transport.post } }));
vi.mock("../common", () => ({ useCommonApi: () => transport }));
afterEach(() => {
  vi.clearAllMocks();
});
const updateId = "00000000-0000-4000-8000-000000000001";
const requestId = "00000000-0000-4000-8000-000000000002";
describe("conversation Email Updates review API", () => {
  it("keeps explicit dev comparison language and uses the shared request timeout", async () => {
    const api = useBackendConversationEmailUpdatesApi();
    transport.createRawAxiosRequestConfig.mockReturnValueOnce({
      headers: { Authorization: "Bearer ucan" },
      timeout: 30_000,
    });
    const request = Dto.conversationEmailUpdateDevComparisonRequest.parse({
      selection: {
        kind: "project",
        projectSlug: "actual-project",
        conversationSlugIds: ["conv000001", "conv000002"],
      },
      participantConversationSlugIds: ["conv000002"],
      subject: "Actual subject",
      bodyHtml: "<p>Actual body</p>",
      language: "fr",
    });
    const response = Dto.conversationEmailUpdateDevComparisonResponse.parse({
      success: true,
      metadata: {
        senderName: "Actual Project",
        replyToName: "Project team",
        replyToEmail: "contact@example.org",
        branding: { name: "Actual Project", palette: "blue" },
        language: "fr",
        unsubscribeScope: "project",
        sendingEnabled: true,
      },
      previews: {
        participant: {
          subject: "Subject",
          html: "Participant HTML",
          text: "Participant text",
        },
        ownerCopy: {
          subject: "Owner subject",
          html: "Owner HTML",
          text: "Owner text",
        },
        test: { subject: "Test subject", html: "Test HTML", text: "Test text" },
      },
    });
    transport.post.mockResolvedValueOnce({ data: response });
    expect(await api.getDevComparison(request)).toEqual(response);
    expect(request.language).toBe("fr");
    expect(transport.post).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/conversation/email-update/dev/compare",
      request,
      {
        headers: { Authorization: "Bearer ucan" },
        timeout: 30_000,
        signal: undefined,
      }
    );
    expect(transport.buildEncodedUcan).toHaveBeenCalledWith(
      "/api/v1/conversation/email-update/dev/compare",
      { method: "POST" }
    );
    transport.post.mockResolvedValueOnce({
      data: { success: true, previews: {} },
    });
    await expect(api.getDevComparison(request)).rejects.toBeDefined();
    transport.post.mockResolvedValueOnce({
      data: { success: false, reason: "configuration_disabled" },
    });
    expect(await api.getDevComparison(request)).toEqual({
      success: false,
      reason: "configuration_disabled",
    });
  });

  it("forwards the status query signal and inherits the authenticated request timeout", async () => {
    const api = useBackendConversationEmailUpdatesApi();
    const controller = new AbortController();
    transport.post.mockResolvedValueOnce({
      data: {
        success: true,
        status: {
          state: "provider_accepted",
          providerAcceptedAt: "2026-09-06T16:00:00Z",
        },
      },
    });
    expect(
      await api.getTestStatus({
        request: { testAttemptId: requestId },
        signal: controller.signal,
      })
    ).toEqual({
      success: true,
      status: {
        state: "provider_accepted",
        providerAcceptedAt: new Date("2026-09-06T16:00:00Z"),
      },
    });
    expect(transport.post).toHaveBeenCalledWith(
      "/api/v1/conversation/email-update/test/status",
      { testAttemptId: requestId },
      {
        headers: { Authorization: "Bearer ucan" },
        timeout: 8000,
        signal: controller.signal,
      }
    );
    expect(transport.buildEncodedUcan).toHaveBeenCalledWith(
      "/api/v1/conversation/email-update/test/status",
      { method: "POST" }
    );
  });
  it("posts production prepare without language and parses prepare and cancel DTOs", async () => {
    const api = useBackendConversationEmailUpdatesApi();
    const request = Dto.conversationEmailUpdatePrepareDraftRequest.parse({
      selection: { kind: "no_project", conversationSlugId: "conv000001" },
      subject: "Subject",
      bodyHtml: "<p>Message</p>",
    });
    transport.post.mockResolvedValueOnce({
      data: {
        success: false,
        error: {
          reason: "review_rate_limited",
          retryAt: "2026-09-06T16:00:00Z",
        },
      },
    });
    const response = await api.prepareDraft(request);
    expect(response).toEqual({
      success: false,
      error: {
        reason: "review_rate_limited",
        retryAt: new Date("2026-09-06T16:00:00Z"),
      },
    });
    expect(transport.post).toHaveBeenCalledWith(
      "/api/v1/conversation/email-update/draft/prepare",
      {
        selection: { kind: "no_project", conversationSlugId: "conv000001" },
        subject: "Subject",
        bodyHtml: "<p>Message</p>",
      },
      expect.objectContaining({ headers: { Authorization: "Bearer ucan" } })
    );
    transport.post.mockResolvedValueOnce({ data: { success: true } });
    await api.cancelDraft({ updateId });
    expect(transport.buildEncodedUcan).toHaveBeenLastCalledWith(
      "/api/v1/conversation/email-update/draft/cancel",
      { method: "POST" }
    );
    expect(transport.post).toHaveBeenLastCalledWith(
      "/api/v1/conversation/email-update/draft/cancel",
      { updateId },
      expect.any(Object)
    );
  });
  it("sends only the locked review and idempotency IDs for test requests", async () => {
    const api = useBackendConversationEmailUpdatesApi();
    transport.post.mockResolvedValue({
      data: {
        success: true,
        updateId,
        testAttemptId: requestId,
        status: "pending",
      },
    });
    await api.sendTest({ updateId, requestId });
    expect(transport.post).toHaveBeenCalledWith(
      "/api/v1/conversation/email-update/test/send",
      { updateId, requestId },
      expect.any(Object)
    );
  });
  it("uses the shared preview response for lazy history and bounded dev fixtures", async () => {
    const api = useBackendConversationEmailUpdatesApi();
    const response = {
      success: true,
      preview: { subject: "Subject", html: "Server HTML", text: "Server text" },
      reconstructed: true,
    };
    transport.post.mockResolvedValue({ data: response });
    expect(await api.getHistoryPreview({ updateId, language: "ar" })).toEqual(
      response
    );
    expect(transport.post).toHaveBeenLastCalledWith(
      "/api/v1/conversation/email-update/history/preview",
      { updateId, language: "ar" },
      expect.any(Object)
    );
    expect(
      await api.getDevPreview({
        fixture: "organization",
        variant: "test",
        language: "ja",
      })
    ).toEqual(response);
    expect(transport.post).toHaveBeenLastCalledWith(
      "/api/v1/conversation/email-update/dev/preview",
      { fixture: "organization", variant: "test", language: "ja" },
      expect.any(Object)
    );
  });
  it("rejects invalid server preview shapes rather than constructing HTML locally", async () => {
    const api = useBackendConversationEmailUpdatesApi();
    transport.post.mockResolvedValue({
      data: { success: true, html: "old preview" },
    });
    await expect(
      api.getHistoryPreview({ updateId, language: "en" })
    ).rejects.toBeDefined();
  });
});
