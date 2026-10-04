import {
  Dto,
  type FetchOpinionPageResponse,
  zodCreatedOpinionPageCursor,
  zodDiscoverOpinionPageCursor,
  zodVotedOpinionPageCursor,
} from "src/shared/types/dto";
import type { z } from "zod";

export type OpinionPageRequest =
  | z.infer<typeof Dto.fetchOpinionPageRequest>
  | (z.infer<typeof Dto.fetchHiddenOpinionPageRequest> & { filter: "hidden" });
export type OpinionPageResult = FetchOpinionPageResponse & {
  nextRequest: OpinionPageRequest | undefined;
};

const createdPageResponse = Dto.fetchOpinionPageResponse.extend({
  nextCursor: zodCreatedOpinionPageCursor.nullable(),
});
const discoverPageResponse = Dto.fetchOpinionPageResponse.extend({
  nextCursor: zodDiscoverOpinionPageCursor.nullable(),
});
const votedPageResponse = Dto.fetchOpinionPageResponse.extend({
  nextCursor: zodVotedOpinionPageCursor.nullable(),
});

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
      const response = createdPageResponse.parse(rawResponse);
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
      const response = discoverPageResponse.parse(rawResponse);
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
      const response = votedPageResponse.parse(rawResponse);
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
      const response = createdPageResponse.parse(rawResponse);
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
