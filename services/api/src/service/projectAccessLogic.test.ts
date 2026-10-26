import { describe, expect, it } from "vitest";
import {
    getConversationCreateEmailUpdateConfiguration,
    hasActivePremiumFeatureEntitlement,
} from "@/service/projectAccessLogic.js";

describe("getConversationCreateEmailUpdateConfiguration", () => {
    it("offers entitled No Project settings off before a container exists", () => {
        expect(
            getConversationCreateEmailUpdateConfiguration({
                canConfigure: true,
                participantContactEmail: undefined,
                scopeDefaultEnabled: undefined,
            }),
        ).toEqual({
            canConfigure: true,
            hasParticipantContactEmail: false,
            scopeDefaultEnabled: false,
        });
    });

    it("reports when an existing scope can be enabled", () => {
        expect(
            getConversationCreateEmailUpdateConfiguration({
                canConfigure: true,
                participantContactEmail: "updates@example.com",
                scopeDefaultEnabled: true,
            }),
        ).toEqual({
            canConfigure: true,
            hasParticipantContactEmail: true,
            scopeDefaultEnabled: true,
        });
    });
});

describe("hasActivePremiumFeatureEntitlement", () => {
    const now = new Date("2026-06-10T12:00:00Z");

    it("allows a non-expiring matching entitlement", () => {
        expect(
            hasActivePremiumFeatureEntitlement({
                grants: [
                    {
                        organizationId: 1,
                        feature: "analysis_variants",
                        expiresAt: null,
                    },
                ],
                feature: "analysis_variants",
                now,
            }),
        ).toBe(true);
    });

    it("allows a matching entitlement that expires in the future", () => {
        expect(
            hasActivePremiumFeatureEntitlement({
                grants: [
                    {
                        organizationId: 1,
                        feature: "survey",
                        expiresAt: new Date("2026-06-11T12:00:00Z"),
                    },
                ],
                feature: "survey",
                now,
            }),
        ).toBe(true);
    });

    it("denies expired or different-feature entitlements", () => {
        expect(
            hasActivePremiumFeatureEntitlement({
                grants: [
                    {
                        organizationId: 1,
                        feature: "survey",
                        expiresAt: new Date("2026-06-09T12:00:00Z"),
                    },
                    {
                        organizationId: 1,
                        feature: "event_ticket",
                        expiresAt: null,
                    },
                ],
                feature: "survey",
                now,
            }),
        ).toBe(false);
    });
});
