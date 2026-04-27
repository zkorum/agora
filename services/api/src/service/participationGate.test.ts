import { describe, expect, it } from "vitest";
import type { DeviceLoginStatusExtended } from "@/shared/types/zod.js";
import {
    getParticipationBlockedReasonFromSurveyGateStatus,
    resolveParticipantIdentityFromDeviceStatus,
} from "./participationGate.js";

function createUnknownDeviceStatus(): Extract<
    DeviceLoginStatusExtended,
    { isKnown: false }
> {
    return {
        isKnown: false,
        isRegistered: false,
        isLoggedIn: false,
        credentials: {
            email: null,
            phone: null,
            rarimo: null,
        },
    };
}

function createKnownDeviceStatus({
    isRegistered,
    isLoggedIn,
}: {
    isRegistered: boolean;
    isLoggedIn: boolean;
}): Extract<DeviceLoginStatusExtended, { isKnown: true }> {
    return {
        isKnown: true,
        isRegistered,
        isLoggedIn,
        userId: "user-1",
        credentials: {
            email: null,
            phone: null,
            rarimo: null,
        },
    };
}

describe("resolveParticipantIdentityFromDeviceStatus", () => {
    it("allows unknown devices for guest participation without a participant id", () => {
        expect(
            resolveParticipantIdentityFromDeviceStatus({
                deviceStatus: createUnknownDeviceStatus(),
                participationMode: "guest",
                hasStrongVerification: false,
                hasEmailVerification: false,
            }),
        ).toEqual({ success: true, participantId: undefined });
    });

    it("blocks unknown devices for account-required participation", () => {
        expect(
            resolveParticipantIdentityFromDeviceStatus({
                deviceStatus: createUnknownDeviceStatus(),
                participationMode: "account_required",
                hasStrongVerification: false,
                hasEmailVerification: false,
            }),
        ).toEqual({ success: false, reason: "account_required" });
    });

    it("allows known guest devices to participate as themselves", () => {
        expect(
            resolveParticipantIdentityFromDeviceStatus({
                deviceStatus: createKnownDeviceStatus({
                    isRegistered: false,
                    isLoggedIn: false,
                }),
                participationMode: "guest",
                hasStrongVerification: false,
                hasEmailVerification: false,
            }),
        ).toEqual({ success: true, participantId: "user-1" });
    });

    it("blocks registered but logged-out devices even in guest mode", () => {
        expect(
            resolveParticipantIdentityFromDeviceStatus({
                deviceStatus: createKnownDeviceStatus({
                    isRegistered: true,
                    isLoggedIn: false,
                }),
                participationMode: "guest",
                hasStrongVerification: false,
                hasEmailVerification: false,
            }),
        ).toEqual({ success: false, reason: "account_required" });
    });

    it("blocks strong verification mode when the device lacks strong verification", () => {
        expect(
            resolveParticipantIdentityFromDeviceStatus({
                deviceStatus: createKnownDeviceStatus({
                    isRegistered: true,
                    isLoggedIn: true,
                }),
                participationMode: "strong_verification",
                hasStrongVerification: false,
                hasEmailVerification: false,
            }),
        ).toEqual({
            success: false,
            reason: "strong_verification_required",
        });
    });

    it("blocks email verification mode when the device lacks email verification", () => {
        expect(
            resolveParticipantIdentityFromDeviceStatus({
                deviceStatus: createKnownDeviceStatus({
                    isRegistered: true,
                    isLoggedIn: true,
                }),
                participationMode: "email_verification",
                hasStrongVerification: false,
                hasEmailVerification: false,
            }),
        ).toEqual({
            success: false,
            reason: "email_verification_required",
        });
    });

    it("allows email verification mode once the email credential exists", () => {
        expect(
            resolveParticipantIdentityFromDeviceStatus({
                deviceStatus: createKnownDeviceStatus({
                    isRegistered: true,
                    isLoggedIn: true,
                }),
                participationMode: "email_verification",
                hasStrongVerification: false,
                hasEmailVerification: true,
            }),
        ).toEqual({ success: true, participantId: "user-1" });
    });
});

describe("getParticipationBlockedReasonFromSurveyGateStatus", () => {
    it("returns no block reason for conversations without a survey", () => {
        expect(
            getParticipationBlockedReasonFromSurveyGateStatus({
                surveyGateStatus: "no_survey",
            }),
        ).toBeUndefined();
    });

    it("returns survey_required for incomplete survey statuses", () => {
        expect(
            getParticipationBlockedReasonFromSurveyGateStatus({
                surveyGateStatus: "not_started",
            }),
        ).toBe("survey_required");
        expect(
            getParticipationBlockedReasonFromSurveyGateStatus({
                surveyGateStatus: "in_progress",
            }),
        ).toBe("survey_required");
    });

    it("returns survey_outdated when the survey response is stale", () => {
        expect(
            getParticipationBlockedReasonFromSurveyGateStatus({
                surveyGateStatus: "needs_update",
            }),
        ).toBe("survey_outdated");
    });

    it("returns no block reason for a complete valid survey", () => {
        expect(
            getParticipationBlockedReasonFromSurveyGateStatus({
                surveyGateStatus: "complete_valid",
            }),
        ).toBeUndefined();
    });

    it("returns no block reason for optional surveys", () => {
        expect(
            getParticipationBlockedReasonFromSurveyGateStatus({
                surveyGateStatus: "not_started",
                isOptional: true,
            }),
        ).toBeUndefined();
    });
});
