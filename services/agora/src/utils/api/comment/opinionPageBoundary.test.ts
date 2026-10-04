import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  initialOpinionPageRequest,
  parseOpinionPageResponse,
} from "./opinionPageBoundary";

describe("pagination boundary correlation", () => {
  const createdCursor = {
    kind: "created",
    opinionSlugId: "last",
    opinionId: 1,
    createdAt: "2026-10-04T12:00:00Z",
  };
  it("uses a complete request for the first page and preserves the filter for subsequent pages", () => {
    const request = initialOpinionPageRequest({
      conversationSlugId: "conversation",
      filter: "moderated",
    });
    expect(request.cursor).toBeNull();
    const page = parseOpinionPageResponse({
      request,
      rawResponse: { items: [], nextCursor: createdCursor },
    });
    expect(page.nextRequest).toMatchObject({
      filter: "moderated",
      conversationSlugId: "conversation",
      cursor: { kind: "created" },
    });
    expect(
      parseOpinionPageResponse({
        request,
        rawResponse: { items: [], nextCursor: null },
      }).nextRequest
    ).toBeUndefined();
  });

  it("rejects a server cursor for another filter before it can enter pagination state", () => {
    const request = initialOpinionPageRequest({
      conversationSlugId: "conversation",
      filter: "discover",
    });
    expect(() =>
      parseOpinionPageResponse({
        request,
        rawResponse: { items: [], nextCursor: createdCursor },
      })
    ).toThrow(ZodError);
  });
});
