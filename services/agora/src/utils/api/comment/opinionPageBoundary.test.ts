import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  initialOpinionPageRequest,
  type OpinionPageRequest,
  parseOpinionPageResponse,
} from "./opinionPageBoundary";

describe("pagination boundary correlation", () => {
  const createdCursor = {
    kind: "created",
    opinionSlugId: "last",
    opinionId: 1,
    createdAt: "2026-10-04T12:00:00Z",
  };
  const cases = [
    { filter: "hidden", cursor: createdCursor },
    { filter: "new", cursor: createdCursor },
    { filter: "moderated", cursor: createdCursor },
    {
      filter: "discover",
      cursor: {
        ...createdCursor,
        kind: "discover",
        wasVoted: false,
        routingPriority: null,
        routingSnapshotId: null,
      },
    },
    {
      filter: "my_votes",
      cursor: {
        kind: "votes",
        opinionSlugId: "last",
        voteId: 1,
        voteUpdatedAt: "2026-10-04T12:00:00Z",
      },
    },
  ] satisfies Array<{ filter: OpinionPageRequest["filter"]; cursor: unknown }>;

  it.each(cases)(
    "preserves the $filter cursor variant",
    ({ filter, cursor }) => {
      const request = initialOpinionPageRequest({
        conversationSlugId: "conv",
        filter,
      });
      const page = parseOpinionPageResponse({
        request,
        rawResponse: { items: [], nextCursor: cursor },
      });
      expect(page.nextRequest).toMatchObject({
        conversationSlugId: "conv",
        filter,
        cursor: { opinionSlugId: "last" },
      });
      expect(page.nextRequest?.cursor).toEqual(page.nextCursor);
    }
  );
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
