import { describe, expect, it } from "vitest";

import { hasConversationUpdatesPartialEmailReach } from "./conversationUpdatesParticipation";

describe("conversationUpdatesParticipation", () => {
  it("identifies participation modes with partial email reach", () => {
    expect(hasConversationUpdatesPartialEmailReach("account_required")).toBe(
      true
    );
    expect(hasConversationUpdatesPartialEmailReach("guest")).toBe(true);
    expect(hasConversationUpdatesPartialEmailReach("email_verification")).toBe(
      false
    );
    expect(
      hasConversationUpdatesPartialEmailReach("strong_verification")
    ).toBe(true);
  });
});
