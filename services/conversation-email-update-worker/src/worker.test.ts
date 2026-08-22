import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "./worker.js";

describe("worker concurrency", () => {
    it("finishes every claimed item before reporting an item failure", async () => {
        const processed: number[] = [];

        await expect(
            runWithConcurrency({
                items: [1, 2, 3, 4],
                concurrency: 2,
                process: async (item) => {
                    processed.push(item);
                    if (item === 1) throw new Error("item failed");
                    await Promise.resolve();
                },
            }),
        ).rejects.toThrow("item failed");

        expect(processed.toSorted()).toEqual([1, 2, 3, 4]);
    });
});
