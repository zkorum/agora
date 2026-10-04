import { QueryClient, QueryObserver } from "@tanstack/vue-query";
import { describe, expect, it } from "vitest";

import { getConversationQueryKey } from "./conversationQueryKeys";
import { seedNewGuestQueries } from "./guestQueryCache";

describe("new guest cache transition", () => {
  it("keeps a mounted conversation available when its viewer key changes", () => {
    const queryClient = new QueryClient();
    const publicKey = getConversationQueryKey({
      conversationSlugId: "conversation",
      displayLanguage: "en",
      spokenLanguages: ["en"],
      viewerScope: { kind: "viewer", userId: undefined },
    });
    const guestKey = getConversationQueryKey({
      conversationSlugId: "conversation",
      displayLanguage: "en",
      spokenLanguages: ["en"],
      viewerScope: { kind: "viewer", userId: "guest" },
    });
    const data = { title: "A conversation already on screen" };
    queryClient.setQueryData(publicKey, data);
    const observer = new QueryObserver(queryClient, {
      queryKey: publicKey,
      enabled: false,
    });
    const observed: boolean[] = [];
    const unsubscribe = observer.subscribe((result) =>
      observed.push(result.isPending)
    );

    seedNewGuestQueries({ queryClient, userId: "guest" });
    observer.setOptions({ queryKey: guestKey, enabled: false });

    expect(observer.getCurrentResult().data).toEqual(data);
    expect(observer.getCurrentResult().isPending).toBe(false);
    expect(observed).not.toContain(true);
    expect(queryClient.getQueryData(publicKey)).toEqual(data);
    unsubscribe();
    queryClient.clear();
  });

  it("carries the optimistic anonymous vote without copying another user's state", () => {
    const queryClient = new QueryClient();
    const votes = [{ opinionSlugId: "statement", votingAction: "agree" }];
    queryClient.setQueryData(["userVotes", "conversation", undefined], votes);
    queryClient.setQueryData(
      [
        "maxdiff-load",
        "conversation",
        { kind: "viewer", userId: "another-user" },
      ],
      { comparisons: ["private"] }
    );

    seedNewGuestQueries({ queryClient, userId: "guest" });

    expect(
      queryClient.getQueryData(["userVotes", "conversation", "guest"])
    ).toEqual(votes);
    expect(
      queryClient.getQueryData(["userVotes", "conversation", undefined])
    ).toBeUndefined();
    expect(
      queryClient.getQueryData([
        "maxdiff-load",
        "conversation",
        { kind: "viewer", userId: "guest" },
      ])
    ).toBeUndefined();
    queryClient.clear();
  });

  it("retires anonymous votes without overwriting an already seeded guest cache", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      ["userVotes", "conversation", undefined],
      [{ opinionSlugId: "pending", votingAction: "agree" }]
    );
    const guestVotes = [{ opinionSlugId: "confirmed", votingAction: "pass" }];
    queryClient.setQueryData(
      ["userVotes", "conversation", "guest"],
      guestVotes
    );

    seedNewGuestQueries({ queryClient, userId: "guest" });

    expect(
      queryClient.getQueryData(["userVotes", "conversation", "guest"])
    ).toEqual(guestVotes);
    expect(
      queryClient.getQueryData(["userVotes", "conversation", undefined])
    ).toBeUndefined();
    queryClient.clear();
  });
});
