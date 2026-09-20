import { Dto } from "src/shared/types/dto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useBackendProjectPageApi } from "./projectPage";

const transport = vi.hoisted(() => ({
  post: vi.fn(),
  buildEncodedUcan: vi.fn(() => Promise.resolve("ucan")),
}));

vi.mock("./client", () => ({ api: { post: transport.post } }));
vi.mock("./common", () => ({ useCommonApi: () => transport }));

afterEach(() => {
  vi.clearAllMocks();
});

const baseRequest = {
  projectSlug: "example-project",
  documentId: "00000000-0000-4000-8000-000000000001",
  languageCode: "en",
  mode: "inline",
};

function accessResponse(audience: "participant" | "owner") {
  return Dto.accessProjectDocumentResponse.parse({
    url: "https://documents.example.com/report.html",
    expiresAt: new Date("2099-01-01"),
    downloadFileName: "report.html",
    contentType: "text/html",
    audience,
    htmlScriptsEnabled: true,
  });
}

describe("project document access API", () => {
  it("requests participant versions without creating a UCAN", async () => {
    const request = Dto.accessProjectDocumentRequest.parse({
      ...baseRequest,
      audience: "participant",
    });
    const response = accessResponse("participant");
    transport.post.mockResolvedValueOnce({ data: response });

    await expect(
      useBackendProjectPageApi().accessProjectDocument(request)
    ).resolves.toEqual(response);
    expect(transport.buildEncodedUcan).not.toHaveBeenCalled();
    expect(transport.post).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/project/document/access",
      request
    );
  });

  it("authenticates facilitator-version requests", async () => {
    const request = Dto.accessProjectDocumentRequest.parse({
      ...baseRequest,
      audience: "owner",
    });
    const response = accessResponse("owner");
    transport.post.mockResolvedValueOnce({ data: response });

    await expect(
      useBackendProjectPageApi().accessProjectDocument(request)
    ).resolves.toEqual(response);
    expect(transport.buildEncodedUcan).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/project/document/access",
      { method: "POST" }
    );
    expect(transport.post).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/project/document/access",
      request,
      { headers: { Authorization: "Bearer ucan" } }
    );
  });
});
