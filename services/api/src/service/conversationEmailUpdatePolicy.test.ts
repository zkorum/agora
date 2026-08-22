import { describe, expect, it } from "vitest";
import {
    decideConversationEmailFinalSend,
    decideConversationEmailTestRateLimit,
    resolveConversationEmailOnboardingAction,
    resolveConversationEmailPreference,
    resolveConversationEmailSendingAvailability,
    type ConversationEmailTestedBasis,
} from "./conversationEmailUpdatePolicy.js";

describe("resolveConversationEmailPreference", () => {
    it("preserves lower-level choices while global delivery is paused", () => {
        expect(
            resolveConversationEmailPreference({
                globalPaused: true,
                projectEnabled: true,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(false);
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: true,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(true);
    });

    it("requires the applicable explicit scope choice", () => {
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: undefined,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(false);
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: true,
                conversationEnabled: false,
                scopeKind: "project",
            }),
        ).toBe(false);
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: undefined,
                conversationEnabled: true,
                scopeKind: "no_project",
            }),
        ).toBe(true);
    });
});

describe("resolveConversationEmailSendingAvailability", () => {
    const availableFacts = {
        operationallyEnabled: true,
        featureAvailable: true,
        safetyBlocked: false,
        configuredEnabled: true,
        hasParticipantContactEmail: true,
    };

    it("requires every independent sending condition", () => {
        expect(
            resolveConversationEmailSendingAvailability(availableFacts),
        ).toEqual({ available: true });
        expect(
            resolveConversationEmailSendingAvailability({
                ...availableFacts,
                operationallyEnabled: false,
            }),
        ).toEqual({
            available: false,
            reason: "operationally_disabled",
        });
        expect(
            resolveConversationEmailSendingAvailability({
                ...availableFacts,
                safetyBlocked: true,
            }),
        ).toEqual({
            available: false,
            reason: "legal_or_abuse_block",
        });
        expect(
            resolveConversationEmailSendingAvailability({
                ...availableFacts,
                configuredEnabled: false,
            }),
        ).toEqual({
            available: false,
            reason: "configuration_disabled",
        });
    });
});

describe("resolveConversationEmailOnboardingAction", () => {
    it("returns an exact backend-authored preference mutation", () => {
        expect(
            resolveConversationEmailOnboardingAction({
                hasVerifiedEmail: true,
                preferenceState: "undisclosed",
                availability: { available: true },
                scope: { kind: "project", projectSlug: "public-plan" },
            }),
        ).toEqual({
            operation: "set_project_preference",
            projectSlug: "public-plan",
            initialEnabled: true,
        });
    });

    it("does not offer onboarding when delivery is unavailable", () => {
        expect(
            resolveConversationEmailOnboardingAction({
                hasVerifiedEmail: true,
                preferenceState: "undisclosed",
                availability: {
                    available: false,
                    reason: "configuration_disabled",
                },
                scope: { kind: "no_project", conversationSlugId: "direct01" },
            }),
        ).toBeUndefined();
    });
});

describe("decideConversationEmailTestRateLimit", () => {
    const now = new Date("2026-08-22T12:00:00.000Z");

    it("allows a user below both limits", () => {
        expect(
            decideConversationEmailTestRateLimit({
                now,
                attemptCreatedAt: Array.from(
                    { length: 9 },
                    (_, index) => new Date(now.getTime() - (index + 1) * 1_000),
                ),
            }),
        ).toEqual({ allowed: true });
    });

    it("returns the first time both user limits permit another test", () => {
        const attempts = Array.from(
            { length: 30 },
            (_, index) => new Date(now.getTime() - index * 10 * 60 * 1_000),
        );
        const decision = decideConversationEmailTestRateLimit({
            now,
            attemptCreatedAt: attempts,
        });
        expect(decision).toEqual({
            allowed: false,
            retryAt: new Date("2026-08-23T07:10:00.000Z"),
        });
    });
});

describe("decideConversationEmailFinalSend", () => {
    const basis: ConversationEmailTestedBasis = {
        authorizingOrganizationId: 3,
        authorizingEntitlementId: 7,
        replyToName: "Public Plan",
        replyToEmail: "contact@example.com",
        conversationIds: [11, 12],
    };

    it("allows an accepted unused test followed by the exact tested update", () => {
        expect(
            decideConversationEmailFinalSend({
                testStatus: "provider_accepted",
                testUsed: false,
                activeDelivery: false,
                testedBasis: basis,
                currentBasis: { ...basis, conversationIds: [12, 11] },
                everyConversationSendingEnabled: true,
            }),
        ).toEqual({ allowed: true });
    });

    it("rejects reused, unauthorized, contact-changed, and scope-changed tests", () => {
        expect(
            decideConversationEmailFinalSend({
                testStatus: "provider_accepted",
                testUsed: true,
                activeDelivery: false,
                testedBasis: basis,
                currentBasis: basis,
                everyConversationSendingEnabled: true,
            }),
        ).toEqual({ allowed: false, reason: "test_used" });
        expect(
            decideConversationEmailFinalSend({
                testStatus: "provider_accepted",
                testUsed: false,
                activeDelivery: false,
                testedBasis: basis,
                currentBasis: { ...basis, authorizingEntitlementId: 8 },
                everyConversationSendingEnabled: true,
            }),
        ).toEqual({ allowed: false, reason: "authorization_changed" });
        expect(
            decideConversationEmailFinalSend({
                testStatus: "provider_accepted",
                testUsed: false,
                activeDelivery: false,
                testedBasis: basis,
                currentBasis: {
                    ...basis,
                    replyToEmail: "new-contact@example.com",
                },
                everyConversationSendingEnabled: true,
            }),
        ).toEqual({ allowed: false, reason: "contact_changed" });
        expect(
            decideConversationEmailFinalSend({
                testStatus: "provider_accepted",
                testUsed: false,
                activeDelivery: false,
                testedBasis: basis,
                currentBasis: { ...basis, conversationIds: [11] },
                everyConversationSendingEnabled: true,
            }),
        ).toEqual({ allowed: false, reason: "scope_changed" });
    });
});
