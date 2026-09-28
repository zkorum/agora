import type { ConversationTypeConfig } from "src/shared/types/zod";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { describe, expect, it } from "vitest";

import { resolveOpinionView } from "./opinionPresentation";

describe("resolveOpinionView", () => {
  it("uses the facilitator's setting for Discover and New, but keeps review lists", () => {
    const metadata = {
      conversationType: "polis",
      votingPresentation: "one_at_a_time",
    } satisfies ConversationTypeConfig;
    const routeContext = { kind: "normal" } satisfies ConversationRouteContext;
    expect(
      resolveOpinionView({ metadata, routeContext, filter: "discover" })
    ).toEqual({ kind: "one_at_a_time", order: "discover" });
    expect(
      resolveOpinionView({ metadata, routeContext, filter: "new" })
    ).toEqual({ kind: "one_at_a_time", order: "new" });
    expect(
      resolveOpinionView({ metadata, routeContext, filter: "my_votes" })
    ).toEqual({ kind: "list", filter: "my_votes" });
    expect(
      resolveOpinionView({ metadata, routeContext, filter: "moderated" })
    ).toEqual({ kind: "list", filter: "moderated" });
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
    ).toEqual({ kind: "list", filter: "discover" });
  });
});
