import { describe, expect, it } from "vitest";
import {
    authStateChangedPayload,
    decideSessionRefresh,
} from "./authSession.js";

describe("decideSessionRefresh", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");

    it("does not refresh sessions outside the refresh window", () => {
        expect(
            decideSessionRefresh({
                now,
                currentExpiry: new Date("2026-10-01T00:00:00.000Z"),
                refreshThresholdDays: 45,
                sessionLifetimeDays: 90,
            }),
        ).toEqual({ type: "not_needed" });
    });

    it("returns the observed expiry for a compare-and-set refresh", () => {
        const currentExpiry = new Date("2026-08-10T00:00:00.000Z");
        expect(
            decideSessionRefresh({
                now,
                currentExpiry,
                refreshThresholdDays: 45,
                sessionLifetimeDays: 90,
            }),
        ).toEqual({
            type: "refresh",
            expectedExpiry: currentExpiry,
            refreshedExpiry: new Date("2026-10-30T00:00:00.000Z"),
        });
    });
});

describe("auth session events", () => {
    it("rejects empty auth-state user lists", () => {
        expect(
            authStateChangedPayload.safeParse({
                userIds: [],
                reason: "logout",
            }).success,
        ).toBe(false);
    });
});
