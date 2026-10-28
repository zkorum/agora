import type { OpinionTarget } from "src/shared/types/dto";
import type { ConversationTypeConfig } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { describe, expect, it } from "vitest";

import {
  resolveLinkedOpinionFilter,
  resolveOpinionView,
} from "./opinionPresentation";

describe("resolveOpinionView", () => {
  it.each([
    "my_votes",
    "moderated",
    "my_statements",
    "hidden",
  ] satisfies CommentFilterOptions[])("keeps %s as a review list", (filter) => {
    expect(
      resolveOpinionView({
        metadata: {
          conversationType: "polis",
          votingPresentation: "one_at_a_time",
        },
        routeContext: { kind: "normal" },
        filter,
      })
    ).toEqual({ kind: "list" });
  });

  it.each(["discover", "new"] satisfies CommentFilterOptions[])(
    "honors the backend's list setting for %s",
    (filter) => {
      expect(
        resolveOpinionView({
          metadata: { conversationType: "polis", votingPresentation: "list" },
          routeContext: { kind: "normal" },
          filter,
        })
      ).toEqual({ kind: "list" });
    }
  );

  it("keeps Discover and New backend-owned in every route context", () => {
    for (const routeContext of [
      { kind: "normal" },
      { kind: "project", projectSlug: "project" },
      { kind: "embed" },
    ] satisfies ConversationRouteContext[]) {
      for (const filter of ["discover", "new"] satisfies Array<
        "discover" | "new"
      >) {
        expect(
          resolveOpinionView({
            metadata: {
              conversationType: "polis",
              votingPresentation: "one_at_a_time",
            },
            routeContext,
            filter,
          })
        ).toEqual({
          kind: "one_at_a_time",
          order: routeContext.kind === "embed" ? "discover" : filter,
        });
      }
    }
  });

  it("always locks a Polis embed to Discover, including list conversations", () => {
    expect(
      resolveOpinionView({
        metadata: { conversationType: "polis", votingPresentation: "list" },
        routeContext: { kind: "embed" },
        filter: "my_votes",
      })
    ).toEqual({ kind: "one_at_a_time", order: "discover" });
  });

  it("does not apply Polis presentation to ranking", () => {
    expect(
      resolveOpinionView({
        metadata: { conversationType: "ranking", rankingMode: "bws" },
        routeContext: { kind: "embed" },
        filter: "discover",
      })
    ).toEqual({ kind: "list" });
  });
});

describe("resolveLinkedOpinionFilter", () => {
  const target: OpinionTarget = {
    conversationSlugId: "conversa",
    isOwn: true,
    opinion: {
      opinionSlugId: "statement",
      opinion: "My statement",
      sourceLanguageCode: "en",
      username: "author",
      createdAt: new Date(),
      updatedAt: new Date(),
      numParticipants: 0,
      numAgrees: 0,
      numDisagrees: 0,
      numPasses: 0,
      moderation: { status: "unmoderated" },
      isSeed: false,
      displayContent: {
        sourceVersion: "source",
        status: "available",
        mode: "original",
        content: { content: "My statement" },
        translationControl: null,
      },
    },
  };

  it("resolves the same URL using the current presentation and viewer", () => {
    for (const votingPresentation of ["list", "one_at_a_time"] satisfies Array<
      "list" | "one_at_a_time"
    >) {
      const metadata = {
        conversationType: "polis",
        votingPresentation,
      } satisfies ConversationTypeConfig;
      expect(
        resolveLinkedOpinionFilter({
          metadata,
          target,
          filterSelection: { kind: "automatic" },
        })
      ).toBe(
        votingPresentation === "one_at_a_time" ? "my_statements" : "discover"
      );
      expect(
        resolveLinkedOpinionFilter({
          metadata,
          target: { ...target, isOwn: false },
          filterSelection: { kind: "automatic" },
        })
      ).toBe("discover");
    }
  });

  it("preserves an explicit filter while routing moderated statements to moderation history", () => {
    const metadata = {
      conversationType: "polis",
      votingPresentation: "one_at_a_time",
    } satisfies ConversationTypeConfig;
    expect(
      resolveLinkedOpinionFilter({
        metadata,
        target,
        filterSelection: { kind: "explicit", filter: "my_votes" },
      })
    ).toBe("my_votes");
    expect(
      resolveLinkedOpinionFilter({
        metadata,
        filterSelection: { kind: "explicit", filter: "my_votes" },
        target: {
          ...target,
          opinion: {
            ...target.opinion,
            moderation: {
              status: "moderated",
              action: "move",
              reason: "spam",
              explanation: "",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        },
      })
    ).toBe("moderated");
  });
});
