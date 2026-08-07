import { QueryClient } from "@tanstack/vue-query";
import { describe, expect, it } from "vitest";

import {
  getConversationContentQueryKey,
  getConversationDisplayContentQueryKey,
  invalidateConversationContentQueries,
} from "./conversationContentQuery";

describe("invalidateConversationContentQueries", () => {
  it("invalidates conversation display and translation content caches", async () => {
    const queryClient = new QueryClient();
    const conversationSlugId = "conversation-1";
    const conversationKey = ["conversation", conversationSlugId, "en", []];
    const contentKey = getConversationContentQueryKey({
      conversationSlugId,
      sourceVersion: "source-version",
      mode: "translated",
      targetLanguageCode: "en",
      spokenLanguages: [],
    });
    const displayContentKey = getConversationDisplayContentQueryKey({
      conversationSlugId,
      targetLanguageCode: "en",
      spokenLanguages: [],
    });
    const otherConversationKey = ["conversation", "conversation-2", "en", []];

    queryClient.setQueryData(conversationKey, { status: "cached" });
    queryClient.setQueryData(contentKey, { status: "cached" });
    queryClient.setQueryData(displayContentKey, { status: "cached" });
    queryClient.setQueryData(otherConversationKey, { status: "cached" });

    await invalidateConversationContentQueries({
      queryClient,
      conversationSlugId,
    });

    expect(queryClient.getQueryState(conversationKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(contentKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(displayContentKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherConversationKey)?.isInvalidated).toBe(
      false
    );
  });
});
