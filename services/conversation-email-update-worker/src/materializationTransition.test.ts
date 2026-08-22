import { describe, expect, it } from "vitest";
import { decideMaterializationFailure } from "./materializationTransition.js";

describe("conversation email materialization failure transitions", () => {
    it("retries a bounded number of failures", () => {
        expect(
            decideMaterializationFailure({
                previousFailureCount: 3,
                maximumFailureCount: 5,
            }),
        ).toEqual({ kind: "retry", failureCount: 4 });
    });

    it("makes the final failure terminal", () => {
        expect(
            decideMaterializationFailure({
                previousFailureCount: 4,
                maximumFailureCount: 5,
            }),
        ).toEqual({ kind: "failed", failureCount: 5 });
    });
});
