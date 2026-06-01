import { describe, expect, it } from "vitest";

import { getConversationEditReturnPath } from "./conversationEditReturn";

describe("getConversationEditReturnPath", () => {
  it("keeps same-conversation tabs and query state", () => {
    expect(
      getConversationEditReturnPath({
        conversationSlugId: "abc123",
        returnTo: "/conversation/abc123/analysis?view=groups#top",
      })
    ).toBe("/conversation/abc123/analysis?view=groups#top");
  });

  it("keeps same-conversation report routes", () => {
    expect(
      getConversationEditReturnPath({
        conversationSlugId: "abc123",
        returnTo: "/conversation/abc123/report",
      })
    ).toBe("/conversation/abc123/report");
  });

  it("falls back to the base conversation page for other conversations", () => {
    expect(
      getConversationEditReturnPath({
        conversationSlugId: "abc123",
        returnTo: "/conversation/other/analysis",
      })
    ).toBe("/conversation/abc123/");
  });

  it("falls back to the base conversation page for edit routes", () => {
    expect(
      getConversationEditReturnPath({
        conversationSlugId: "abc123",
        returnTo: "/conversation/abc123/edit/survey",
      })
    ).toBe("/conversation/abc123/");
  });

  it("falls back to the base conversation page for non-path return values", () => {
    expect(
      getConversationEditReturnPath({
        conversationSlugId: "abc123",
        returnTo: "https://example.com/conversation/abc123",
      })
    ).toBe("/conversation/abc123/");
  });
});
