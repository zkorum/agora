import { describe, expect, it } from "vitest";
import {
    authStateChangedPayload,
    decideSessionExpiryUpdate,
} from "./authSession.js";

describe("decideSessionExpiryUpdate", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");

    it("does not refresh sessions outside the refresh window", () => {
        expect(
            decideSessionExpiryUpdate({
                now,
                currentExpiry: new Date("2026-08-20T00:00:00.000Z"),
                refreshThresholdDays: 7,
                sessionLifetimeDays: 30,
            }),
        ).toEqual({ type: "not_needed" });
    });

    it("returns the observed expiry for a compare-and-set refresh", () => {
        const currentExpiry = new Date("2026-08-05T00:00:00.000Z");
        expect(
            decideSessionExpiryUpdate({
                now,
                currentExpiry,
                refreshThresholdDays: 7,
                sessionLifetimeDays: 30,
            }),
        ).toEqual({
            type: "update",
            expectedExpiry: currentExpiry,
            nextExpiry: new Date("2026-08-31T00:00:00.000Z"),
        });
    });

    it("caps sessions issued with a longer lifetime", () => {
        const currentExpiry = new Date("2026-10-01T00:00:00.000Z");
        expect(
            decideSessionExpiryUpdate({
                now,
                currentExpiry,
                refreshThresholdDays: 7,
                sessionLifetimeDays: 30,
            }),
        ).toEqual({
            type: "update",
            expectedExpiry: currentExpiry,
            nextExpiry: new Date("2026-08-31T00:00:00.000Z"),
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
