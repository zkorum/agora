import { describe, expect, it } from "vitest";
import { decideWorkerTickMode } from "./workerTransition.js";

describe("worker tick mode", () => {
    it("prioritizes kill-switch draining when sending is disabled", () => {
        expect(decideWorkerTickMode({ enabled: false, killSwitch: true })).toBe(
            "kill_switch",
        );
    });

    it("does no send orchestration when disabled without the kill switch", () => {
        expect(
            decideWorkerTickMode({ enabled: false, killSwitch: false }),
        ).toBe("disabled");
    });
});
