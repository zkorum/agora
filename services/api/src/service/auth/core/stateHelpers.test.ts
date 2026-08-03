import { describe, expect, it } from "vitest";
import { determineAuthType } from "./stateHelpers.js";

const availableEmail = {
    deviceCredentialAssociation: "device_missing_credential_available",
} as const;

const guestOwnedZupass = {
    deviceCredentialAssociation: "device_missing_credential_owned",
    userId: "guest-2",
    isRegistered: false,
} as const;

describe("determineAuthType", () => {
    it("allows an active registered device to attach an available credential", () => {
        expect(
            determineAuthType({
                credentialAuthState: availableEmail,
                deviceStatus: {
                    isKnown: true,
                    isRegistered: true,
                    isLoggedIn: true,
                    userId: "user-1",
                },
                authMethod: "email",
            }),
        ).toEqual({ type: "register", userId: "user-1" });
    });

    it("requires a registered device to log in before attaching a credential", () => {
        expect(
            determineAuthType({
                credentialAuthState: availableEmail,
                deviceStatus: {
                    isKnown: true,
                    isRegistered: true,
                    isLoggedIn: false,
                    userId: "user-1",
                },
                authMethod: "email",
            }),
        ).toEqual({
            type: "associated_with_another_user",
            userId: "user-1",
        });
    });

    it("requires a registered device to log in before merging a soft credential", () => {
        expect(
            determineAuthType({
                credentialAuthState: guestOwnedZupass,
                deviceStatus: {
                    isKnown: true,
                    isRegistered: true,
                    isLoggedIn: false,
                    userId: "user-1",
                },
                authMethod: "zupass",
            }),
        ).toEqual({
            type: "associated_with_another_user",
            userId: "user-1",
        });
    });

    it("requires a registered device to log in before attaching an available soft credential", () => {
        expect(
            determineAuthType({
                credentialAuthState: {
                    deviceCredentialAssociation:
                        "device_missing_credential_available",
                },
                deviceStatus: {
                    isKnown: true,
                    isRegistered: true,
                    isLoggedIn: false,
                    userId: "user-1",
                },
                authMethod: "zupass",
            }),
        ).toEqual({
            type: "associated_with_another_user",
            userId: "user-1",
        });
    });

    it("requires a registered device to log in before using another registered user's soft credential", () => {
        expect(
            determineAuthType({
                credentialAuthState: {
                    deviceCredentialAssociation:
                        "device_missing_credential_owned",
                    userId: "user-2",
                    isRegistered: true,
                },
                deviceStatus: {
                    isKnown: true,
                    isRegistered: true,
                    isLoggedIn: false,
                    userId: "user-1",
                },
                authMethod: "zupass",
            }),
        ).toEqual({
            type: "associated_with_another_user",
            userId: "user-1",
        });
    });

    it("allows an active registered device to merge a guest soft credential", () => {
        expect(
            determineAuthType({
                credentialAuthState: guestOwnedZupass,
                deviceStatus: {
                    isKnown: true,
                    isRegistered: true,
                    isLoggedIn: true,
                    userId: "user-1",
                },
                authMethod: "zupass",
            }),
        ).toEqual({
            type: "merge",
            toUserId: "user-1",
            fromUserId: "guest-2",
        });
    });

    it("retires a registered DID after its session expires", () => {
        expect(
            determineAuthType({
                credentialAuthState: {
                    deviceCredentialAssociation: "device_owns_credential",
                    userId: "user-1",
                },
                deviceStatus: {
                    isKnown: true,
                    isRegistered: true,
                    isLoggedIn: false,
                    userId: "user-1",
                },
                authMethod: "email",
            }),
        ).toEqual({
            type: "associated_with_another_user",
            userId: "user-1",
        });
    });

    it("allows a guest device to register its first credential", () => {
        expect(
            determineAuthType({
                credentialAuthState: availableEmail,
                deviceStatus: {
                    isKnown: true,
                    isRegistered: false,
                    isLoggedIn: false,
                    userId: "guest-1",
                },
                authMethod: "email",
            }),
        ).toEqual({ type: "register", userId: "guest-1" });
    });
});
