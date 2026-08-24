import { describe, expect, it } from "vitest";

import { zodSerializableConversationDraft } from "./conversationDraft.schema";
import { createEmptyDraft } from "./conversationDraft.utils";

describe("zodSerializableConversationDraft", () => {
  it.each([undefined, true, false])(
    "preserves the Email Updates override %s",
    (conversationEmailUpdateEnabledOverride) => {
      const draft = zodSerializableConversationDraft.parse({
        ...createEmptyDraft(),
        conversationEmailUpdateEnabledOverride,
      });

      expect(draft.conversationEmailUpdateEnabledOverride).toBe(
        conversationEmailUpdateEnabledOverride
      );
    }
  );
});
