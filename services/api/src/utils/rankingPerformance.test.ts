import { describe, it, expect, vi } from "vitest";
import { createRankingPerformance } from "./rankingPerformance.js";

describe("ranking performance events", () => {
    it("measures failures while preserving the original exception", async () => {
        const info = vi.fn();
        const trace = createRankingPerformance({
            enabled: true,
            logger: { info },
            requestId: "req-1",
            conversationSlugId: "slug",
            operation: "save",
            historyLength: 20,
        });
        const failure = new Error("private request data");
        await expect(
            trace.measure({
                phase: "transaction",
                run: () => Promise.reject(failure),
            }),
        ).rejects.toBe(failure);
        trace.finish("failure");
        expect(info).toHaveBeenCalledOnce();
        expect(JSON.stringify(info.mock.calls)).toContain("transaction");
        expect(JSON.stringify(info.mock.calls)).not.toContain(failure.message);
    });
    it("does not emit events when disabled", async () => {
        const info = vi.fn();
        const trace = createRankingPerformance({
            enabled: false,
            logger: { info },
            requestId: "req-1",
            conversationSlugId: "slug",
            operation: "load",
            historyLength: undefined,
        });
        expect(
            await trace.measure({
                phase: "load",
                run: () => Promise.resolve(42),
            }),
        ).toBe(42);
        expect(trace.measureSync({ phase: "routing", run: () => 7 })).toBe(7);
        trace.finish("success");
        expect(info).not.toHaveBeenCalled();
    });
});
