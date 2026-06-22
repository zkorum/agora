import { describe, expect, it } from "vitest";
import { Dto } from "@/shared/types/dto.js";

const validCreateEntitlementRequest = {
    subject: { username: "alice" },
    features: ["survey"],
    startsAt: "2026-06-22T10:00:00.000Z",
    expiresAt: "2026-06-23T10:00:00.000Z",
};

describe("premium feature entitlement DTOs", () => {
    it("accepts a create entitlement request with a later expiry", () => {
        expect(
            Dto.createPremiumFeatureEntitlementRequest.safeParse(
                validCreateEntitlementRequest,
            ).success,
        ).toBe(true);
    });

    it("rejects a create entitlement request with an expiry before the start", () => {
        expect(
            Dto.createPremiumFeatureEntitlementRequest.safeParse({
                ...validCreateEntitlementRequest,
                expiresAt: "2026-06-21T10:00:00.000Z",
            }).success,
        ).toBe(false);
    });

    it("rejects an update entitlement request with an expiry equal to the start", () => {
        expect(
            Dto.updatePremiumFeatureEntitlementRequest.safeParse({
                entitlementId: 1,
                startsAt: "2026-06-22T10:00:00.000Z",
                expiresAt: "2026-06-22T10:00:00.000Z",
            }).success,
        ).toBe(false);
    });
});
