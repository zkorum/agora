import { Dto, type FetchOpinionPageResponse } from "src/shared/types/dto";
import type { z } from "zod";

export type OpinionPageRequest =
  | z.infer<typeof Dto.fetchOpinionPageRequest>
  | (z.infer<typeof Dto.fetchHiddenOpinionPageRequest> & { filter: "hidden" });
export type OpinionPageResult = FetchOpinionPageResponse & {
  nextRequest: OpinionPageRequest | undefined;
};

export function initialOpinionPageRequest({
  conversationSlugId,
  filter,
}: {
  conversationSlugId: string;
  filter: OpinionPageRequest["filter"];
}): OpinionPageRequest {
  switch (filter) {
    case "hidden":
      return { conversationSlugId, filter, cursor: null };
    case "discover":
      return { conversationSlugId, filter, cursor: null };
    case "my_votes":
      return { conversationSlugId, filter, cursor: null };
    case "new":
    case "moderated":
      return { conversationSlugId, filter, cursor: null };
  }
}

export function parseOpinionPageResponse({
  request,
  rawResponse,
}: {
  request: OpinionPageRequest;
  rawResponse: unknown;
}): OpinionPageResult {
  // The cursor is external input, and its variant must match the request filter.
  switch (request.filter) {
    case "hidden": {
      const response = Dto.fetchOpinionPageResponse
        .extend({ nextCursor: Dto.fetchHiddenOpinionPageRequest.shape.cursor })
        .parse(rawResponse);
      return {
        ...response,
        nextRequest:
          response.nextCursor === null
            ? undefined
            : {
                conversationSlugId: request.conversationSlugId,
                filter: request.filter,
                cursor: response.nextCursor,
              },
      };
    }
    case "discover": {
      const response = Dto.fetchOpinionPageResponse
        .extend({
          nextCursor: Dto.fetchOpinionPageRequest.options[0].shape.cursor,
        })
        .parse(rawResponse);
      return {
        ...response,
        nextRequest:
          response.nextCursor === null
            ? undefined
            : {
                conversationSlugId: request.conversationSlugId,
                filter: request.filter,
                cursor: response.nextCursor,
              },
      };
    }
    case "my_votes": {
      const response = Dto.fetchOpinionPageResponse
        .extend({
          nextCursor: Dto.fetchOpinionPageRequest.options[1].shape.cursor,
        })
        .parse(rawResponse);
      return {
        ...response,
        nextRequest:
          response.nextCursor === null
            ? undefined
            : {
                conversationSlugId: request.conversationSlugId,
                filter: request.filter,
                cursor: response.nextCursor,
              },
      };
    }
    case "new":
    case "moderated": {
      const response = Dto.fetchOpinionPageResponse
        .extend({
          nextCursor: Dto.fetchOpinionPageRequest.options[2].shape.cursor,
        })
        .parse(rawResponse);
      return {
        ...response,
        nextRequest:
          response.nextCursor === null
            ? undefined
            : {
                conversationSlugId: request.conversationSlugId,
                filter: request.filter,
                cursor: response.nextCursor,
              },
      };
    }
  }
}
