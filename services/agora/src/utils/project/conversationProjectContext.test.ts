import { describe, expect, it } from "vitest";

import { getConversationProjectContextTitle } from "./conversationProjectContext";

const baseProjectContext = {
  projectSlug: "amplify",
  originalProjectTitle: "Amplify",
  conversationSlugId: "prior01",
};

describe("getConversationProjectContextTitle", () => {
  it("uses the original project title in original mode", () => {
    expect(
      getConversationProjectContextTitle({
        projectContext: {
          ...baseProjectContext,
          translatedProjectTitle: "Amplifier",
        },
        titleMode: "original",
      })
    ).toBe("Amplify");
  });

  it("uses the translated project title in translated mode", () => {
    expect(
      getConversationProjectContextTitle({
        projectContext: {
          ...baseProjectContext,
          translatedProjectTitle: "Amplifier",
        },
        titleMode: "translated",
      })
    ).toBe("Amplifier");
  });

  it("falls back to the original project title when translation is unavailable", () => {
    expect(
      getConversationProjectContextTitle({
        projectContext: baseProjectContext,
        titleMode: "translated",
      })
    ).toBe("Amplify");
  });
});
