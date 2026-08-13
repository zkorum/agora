import { describe, expect, it } from "vitest";
import { calculateProjectParticipantCounts } from "./projectParticipantCounts.js";

describe("calculateProjectParticipantCounts", () => {
    it("counts a mapped person once globally and once per consultation", () => {
        const counts = calculateProjectParticipantCounts({
            participantIdsByConversationId: new Map([
                [1, new Set(["person-a", "person-b"])],
                [2, new Set(["person-a", "person-c"])],
                [3, new Set(["person-a"])],
            ]),
        });

        expect(counts).toEqual({
            participantCount: 3,
            participationCount: 5,
        });
    });

    it("returns zero counts when no consultation has participants", () => {
        const counts = calculateProjectParticipantCounts({
            participantIdsByConversationId: new Map(),
        });

        expect(counts).toEqual({
            participantCount: 0,
            participationCount: 0,
        });
    });
});
