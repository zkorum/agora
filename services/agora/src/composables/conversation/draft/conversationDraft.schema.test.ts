import { describe, expect, it } from "vitest";

import { zodSerializableConversationDraft } from "./conversationDraft.schema";
import { createEmptyDraft } from "./conversationDraft.utils";

describe("zodSerializableConversationDraft", () => {
  it.each(["polis", "comparisons", "qv"])(
    "migrates a missing %s policy using the family default",
    (family) => {
      const { participantStatements, ...base } = createEmptyDraft();
      void participantStatements;
      const config =
        family === "polis"
          ? { conversationType: "polis", votingPresentation: "list" }
          : family === "comparisons"
            ? {
                conversationType: "prioritizing",
                prioritizationType: "comparisons",
                comparisonMethod: "pairwise",
              }
            : {
                conversationType: "prioritizing",
                prioritizationType: "qv",
                creditPricing: "quadratic",
                allowOpposition: true,
              };
      expect(
        zodSerializableConversationDraft.parse({ ...base, ...config })
          .participantStatements
      ).toEqual(
        family === "qv"
          ? { supported: false }
          : { supported: true, enabled: family === "polis" }
      );
    }
  );
  it.each(["ranking", "maxdiff"])(
    "migrates a legacy %s draft without losing content",
    (conversationType) => {
      const draft = zodSerializableConversationDraft.parse({
        ...createEmptyDraft(),
        conversationType,
        rankingMode: "bws",
        seedOpinions: ["Existing statement"],
      });
      expect(draft).toMatchObject({
        conversationType: "prioritizing",
        prioritizationType: "comparisons",
        comparisonMethod: "bws",
        seedOpinions: ["Existing statement"],
      });
      expect(draft).not.toHaveProperty("rankingMode");
    }
  );
  it("round-trips incomplete structured QV drafts and the opposition choice", () => {
    const input = {
      ...createEmptyDraft(),
      conversationType: "prioritizing",
      prioritizationType: "qv",
      participantStatements: { supported: false },
      creditPricing: "quadratic",
      allowOpposition: false,
      qvStatements: [
        {
          localKey: "local-1",
          title: "",
          description: "<p>Details in progress</p>",
        },
      ],
    };
    const restored = zodSerializableConversationDraft.parse(
      JSON.parse(JSON.stringify(input))
    );
    expect(restored).toMatchObject({
      conversationType: "prioritizing",
      prioritizationType: "qv",
      creditPricing: "quadratic",
      allowOpposition: false,
      qvStatements: input.qvStatements,
    });
    expect(restored).not.toHaveProperty("votingPresentation");
  });
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
