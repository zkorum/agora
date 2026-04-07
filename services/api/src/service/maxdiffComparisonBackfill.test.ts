import { describe, expect, it, vi } from "vitest";
import {
    finalizeLegacyMaxdiffComparisonBackfill,
    prepareLegacyMaxdiffComparisonBackfill,
} from "@/service/maxdiffComparisonBackfill.js";

describe("prepareLegacyMaxdiffComparisonBackfill", () => {
    it("builds normalized rows for legacy-only results", () => {
        const prepared = prepareLegacyMaxdiffComparisonBackfill({
            candidates: [
                {
                    resultId: 11,
                    conversationId: 7,
                    conversationSlugId: "conv1234",
                    comparisons: [
                        {
                            best: "itemA",
                            worst: "itemC",
                            set: ["itemA", "itemB", "itemC"],
                        },
                        {
                            best: "itemB",
                            worst: "itemC",
                            set: ["itemA", "itemB", "itemC"],
                        },
                    ],
                    activeComparisonCount: 0,
                },
            ],
        });

        expect(prepared.invalidResultIds).toEqual([]);
        expect(prepared.backfilledResultIds).toEqual([11]);
        expect(prepared.affectedConversations).toEqual([
            {
                conversationId: 7,
                conversationSlugId: "conv1234",
            },
        ]);
        expect(prepared.insertRows).toEqual([
            {
                maxdiffResultId: 11,
                position: 0,
                bestSlugId: "itemA",
                worstSlugId: "itemC",
                candidateSet: ["itemA", "itemB", "itemC"],
            },
            {
                maxdiffResultId: 11,
                position: 1,
                bestSlugId: "itemB",
                worstSlugId: "itemC",
                candidateSet: ["itemA", "itemB", "itemC"],
            },
        ]);
    });

    it("skips results that already have normalized rows", () => {
        const prepared = prepareLegacyMaxdiffComparisonBackfill({
            candidates: [
                {
                    resultId: 11,
                    conversationId: 7,
                    conversationSlugId: "conv1234",
                    comparisons: [
                        {
                            best: "itemA",
                            worst: "itemC",
                            set: ["itemA", "itemB", "itemC"],
                        },
                    ],
                    activeComparisonCount: 1,
                },
            ],
        });

        expect(prepared.backfilledResultIds).toEqual([]);
        expect(prepared.affectedConversations).toEqual([]);
        expect(prepared.insertRows).toEqual([]);
    });

    it("repairs results with only some active normalized rows present", () => {
        const prepared = prepareLegacyMaxdiffComparisonBackfill({
            candidates: [
                {
                    resultId: 11,
                    conversationId: 7,
                    conversationSlugId: "conv1234",
                    comparisons: [
                        {
                            best: "itemA",
                            worst: "itemC",
                            set: ["itemA", "itemB", "itemC"],
                        },
                        {
                            best: "itemB",
                            worst: "itemC",
                            set: ["itemA", "itemB", "itemC"],
                        },
                    ],
                    activeComparisonCount: 1,
                },
            ],
        });

        expect(prepared.backfilledResultIds).toEqual([11]);
        expect(prepared.affectedConversations).toEqual([
            {
                conversationId: 7,
                conversationSlugId: "conv1234",
            },
        ]);
        expect(prepared.insertRows).toHaveLength(2);
    });

    it("skips empty or invalid legacy payloads without marking the conversation dirty", () => {
        const prepared = prepareLegacyMaxdiffComparisonBackfill({
            candidates: [
                {
                    resultId: 11,
                    conversationId: 7,
                    conversationSlugId: "conv1234",
                    comparisons: [],
                    activeComparisonCount: 0,
                },
                {
                    resultId: 12,
                    conversationId: 8,
                    conversationSlugId: "conv5678",
                    comparisons: [{ best: "itemA", set: ["itemA", "itemB"] }],
                    activeComparisonCount: 0,
                },
            ],
        });

        expect(prepared.backfilledResultIds).toEqual([]);
        expect(prepared.affectedConversations).toEqual([]);
        expect(prepared.insertRows).toEqual([]);
        expect(prepared.invalidResultIds).toEqual([12]);
    });

    it("clears cached rankings when Valkey is unavailable", async () => {
        const invalidateRankingScores = vi.fn(() => Promise.resolve());

        await finalizeLegacyMaxdiffComparisonBackfill({
            preparedBackfill: {
                insertRows: [
                    {
                        maxdiffResultId: 11,
                        position: 0,
                        bestSlugId: "itemA",
                        worstSlugId: "itemC",
                        candidateSet: ["itemA", "itemB", "itemC"],
                    },
                ],
                backfilledResultIds: [11],
                affectedConversations: [
                    {
                        conversationId: 7,
                        conversationSlugId: "conv1234",
                    },
                ],
                invalidResultIds: [],
            },
            valkey: undefined,
            invalidateRankingScores,
        });

        expect(invalidateRankingScores).toHaveBeenCalledTimes(1);
        expect(invalidateRankingScores).toHaveBeenCalledWith({
            conversationIds: [7],
        });
    });

    it("clears cached rankings when queueing repaired conversations fails", async () => {
        const invalidateRankingScores = vi.fn(() => Promise.resolve());
        const valkey = {
            zadd: vi.fn().mockRejectedValue(new Error("valkey unavailable")),
        };

        await finalizeLegacyMaxdiffComparisonBackfill({
            preparedBackfill: {
                insertRows: [
                    {
                        maxdiffResultId: 11,
                        position: 0,
                        bestSlugId: "itemA",
                        worstSlugId: "itemC",
                        candidateSet: ["itemA", "itemB", "itemC"],
                    },
                ],
                backfilledResultIds: [11],
                affectedConversations: [
                    {
                        conversationId: 7,
                        conversationSlugId: "conv1234",
                    },
                ],
                invalidResultIds: [],
            },
            valkey,
            invalidateRankingScores,
        });

        expect(valkey.zadd).toHaveBeenCalledTimes(1);
        expect(invalidateRankingScores).toHaveBeenCalledTimes(1);
        expect(invalidateRankingScores).toHaveBeenCalledWith({
            conversationIds: [7],
        });
    });
});
