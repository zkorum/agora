import { describe, expect, it } from "vitest";

import { isBackToConversationCommentTab } from "./historyBack";

describe("isBackToConversationCommentTab", () => {
  const prefix = "/conversation/abc123";

  it("returns true when back is the comment tab with trailing slash", () => {
    expect(
      isBackToConversationCommentTab({
        historyBack: "/conversation/abc123/",
        conversationPathPrefix: prefix,
      })
    ).toBe(true);
  });

  it("returns true when back is the exact prefix (no trailing slash)", () => {
    expect(
      isBackToConversationCommentTab({
        historyBack: "/conversation/abc123",
        conversationPathPrefix: prefix,
      })
    ).toBe(true);
  });

  it("returns true when back has a query string (no analysis)", () => {
    expect(
      isBackToConversationCommentTab({
        historyBack: "/conversation/abc123/?opinion=xyz",
        conversationPathPrefix: prefix,
      })
    ).toBe(true);
  });

  it("returns false when back is the analysis tab", () => {
    expect(
      isBackToConversationCommentTab({
        historyBack: "/conversation/abc123/analysis",
        conversationPathPrefix: prefix,
      })
    ).toBe(false);
  });

  it("returns false when back is the analysis tab with query", () => {
    expect(
      isBackToConversationCommentTab({
        historyBack: "/conversation/abc123/analysis?tab=Me",
        conversationPathPrefix: prefix,
      })
    ).toBe(false);
  });

  it("returns false when back is a different conversation", () => {
    expect(
      isBackToConversationCommentTab({
        historyBack: "/conversation/other456/",
        conversationPathPrefix: prefix,
      })
    ).toBe(false);
  });

  it("returns false when back is null", () => {
    expect(
      isBackToConversationCommentTab({
        historyBack: null,
        conversationPathPrefix: prefix,
      })
    ).toBe(false);
  });

  it("returns false when back is undefined", () => {
    expect(
      isBackToConversationCommentTab({
        historyBack: undefined,
        conversationPathPrefix: prefix,
      })
    ).toBe(false);
  });

  it("returns false when back is a number", () => {
    expect(
      isBackToConversationCommentTab({
        historyBack: 42,
        conversationPathPrefix: prefix,
      })
    ).toBe(false);
  });

  it("works with embed route prefix", () => {
    const embedPrefix = "/conversation/abc123/embed";
    expect(
      isBackToConversationCommentTab({
        historyBack: "/conversation/abc123/embed/",
        conversationPathPrefix: embedPrefix,
      })
    ).toBe(true);
  });

  it("returns false for embed analysis tab", () => {
    const embedPrefix = "/conversation/abc123/embed";
    expect(
      isBackToConversationCommentTab({
        historyBack: "/conversation/abc123/embed/analysis",
        conversationPathPrefix: embedPrefix,
      })
    ).toBe(false);
  });
});
