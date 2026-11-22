import { describe, expect, it } from "vitest";
import { determineAuthType } from "./stateHelpers.js";
import type { AuthResult, DeviceStatus } from "./types.js";

const devices = {
    unknown: { isKnown: false, isRegistered: false, isLoggedIn: false },
    guest: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: "guest",
    },
    registered: {
        isKnown: true,
        isRegistered: true,
        isLoggedIn: true,
        userId: "registered",
    },
    expired: {
        isKnown: true,
        isRegistered: true,
        isLoggedIn: false,
        userId: "registered",
    },
} satisfies Record<string, DeviceStatus>;

describe("verified credential authentication", () => {
    it("creates a fresh identity only for an unknown device with an unclaimed credential", () => {
        const result = determineAuthType({
            credentialOwner: undefined,
            deviceStatus: devices.unknown,
        });
        expect(result.type).toBe("register");
        if (result.type === "register") {
            expect(result.userId).toMatch(
                /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/,
            );
        }
    });

    it.each([
        {
            description: "fresh device logs into the credential owner",
            deviceStatus: devices.unknown,
            credentialOwnerId: "owner",
            expected: { type: "login_new_device", userId: "owner" },
        },
        {
            description: "guest retains identity when claiming a credential",
            deviceStatus: devices.guest,
            credentialOwnerId: undefined,
            expected: { type: "register", userId: "guest" },
        },
        {
            description: "same guest identity reauthenticates without merging",
            deviceStatus: devices.guest,
            credentialOwnerId: "guest",
            expected: { type: "login_known_device", userId: "guest" },
        },
        {
            description: "guest merges into the credential owner",
            deviceStatus: devices.guest,
            credentialOwnerId: "owner",
            expected: { type: "merge", fromUserId: "guest", toUserId: "owner" },
        },
        {
            description: "registered device attaches an unclaimed credential",
            deviceStatus: devices.registered,
            credentialOwnerId: undefined,
            expected: { type: "register", userId: "registered" },
        },
        {
            description: "registered device reauthenticates its own credential",
            deviceStatus: devices.registered,
            credentialOwnerId: "registered",
            expected: { type: "login_known_device", userId: "registered" },
        },
        {
            description: "registered device cannot merge another account",
            deviceStatus: devices.registered,
            credentialOwnerId: "other",
            expected: {
                type: "associated_with_another_user",
                userId: "registered",
            },
        },
        {
            description: "expired DID cannot attach an unclaimed credential",
            deviceStatus: devices.expired,
            credentialOwnerId: undefined,
            expected: {
                type: "associated_with_another_user",
                userId: "registered",
            },
        },
        {
            description: "expired DID cannot reuse its own credential",
            deviceStatus: devices.expired,
            credentialOwnerId: "registered",
            expected: {
                type: "associated_with_another_user",
                userId: "registered",
            },
        },
        {
            description: "expired DID cannot claim another account",
            deviceStatus: devices.expired,
            credentialOwnerId: "other",
            expected: {
                type: "associated_with_another_user",
                userId: "registered",
            },
        },
    ] satisfies {
        description: string;
        deviceStatus: DeviceStatus;
        credentialOwnerId: string | undefined;
        expected: AuthResult;
    }[])("$description", ({ deviceStatus, credentialOwnerId, expected }) => {
        expect(
            determineAuthType({
                deviceStatus,
                credentialOwner:
                    credentialOwnerId === undefined
                        ? undefined
                        : { userId: credentialOwnerId, isDeleted: false },
            }),
        ).toEqual(expected);
    });

    it.each(Object.values(devices))(
        "never treats a reserved deleted identity as a normal login or merge ($isKnown/$isRegistered)",
        (deviceStatus) => {
            expect(
                determineAuthType({
                    deviceStatus,
                    credentialOwner: { userId: "pending", isDeleted: true },
                }),
            ).toEqual({ type: "restore_deleted", userId: "pending" });
        },
    );
});
