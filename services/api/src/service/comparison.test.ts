import { describe, it, expect } from "vitest";
import { zodComparisonAnswer } from "@/shared/types/zod.js";
import { Dto } from "@/shared/types/dto.js";

describe("zodComparisonAnswer", () => {
    it("accepts valid comparisons", () => {
        expect(
            zodComparisonAnswer.safeParse({
                best: "A",
                worst: "C",
                set: ["A", "B", "C"],
            }).success,
        ).toBe(true);
    });

    it("rejects invalid best-worst choices", () => {
        expect(
            zodComparisonAnswer.safeParse({
                best: "A",
                worst: "A",
                set: ["A", "B"],
            }).success,
        ).toBe(false);
    });

    it("rejects choices outside the candidate set", () => {
        expect(
            zodComparisonAnswer.safeParse({
                best: "A",
                worst: "C",
                set: ["A", "B"],
            }).success,
        ).toBe(false);
    });

    it("rejects duplicate candidate set items", () => {
        expect(
            zodComparisonAnswer.safeParse({
                best: "A",
                worst: "B",
                set: ["A", "B", "B"],
            }).success,
        ).toBe(false);
    });

    it("rejects entity IDs with surrounding whitespace", () => {
        expect(
            zodComparisonAnswer.safeParse({
                best: " A",
                worst: "B",
                set: [" A", "B"],
            }).success,
        ).toBe(false);
    });
});

describe("ranking snapshot request IDs", () => {
    it("accepts PostgreSQL integer identity values", () => {
        expect(
            Dto.comparisonResultsRequest.safeParse({
                conversationSlugId: "ranking1",
                rankingStatsSnapshotId: 2_147_483_647,
            }).success,
        ).toBe(true);
    });

    it("rejects values outside the PostgreSQL integer range", () => {
        expect(
            Dto.comparisonResultsRequest.safeParse({
                conversationSlugId: "ranking1",
                rankingStatsSnapshotId: 2_147_483_648,
            }).success,
        ).toBe(false);
        expect(
            Dto.rankingStatsCheckpointsRequest.safeParse({
                conversationSlugId: "ranking1",
                requestedRankingStatsSnapshotId: 2_147_483_648,
            }).success,
        ).toBe(false);
    });

    it("rejects incompatible live and historical selectors", () => {
        expect(
            Dto.comparisonResultsRequest.safeParse({
                conversationSlugId: "ranking1",
                rankingStatsSnapshotId: 1,
                requestedRankingStatsSnapshotId: 2,
            }).success,
        ).toBe(false);
        expect(
            Dto.comparisonResultsRequest.safeParse({
                conversationSlugId: "ranking1",
                lifecycleFilter: "completed",
                rankingStatsSnapshotId: 1,
            }).success,
        ).toBe(false);
    });
});
