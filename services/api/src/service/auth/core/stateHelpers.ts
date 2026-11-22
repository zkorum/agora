import { generateUUID } from "@/crypto.js";
import type { AuthResult, DeviceStatus } from "./types.js";

export function determineAuthType({
    credentialOwner,
    deviceStatus,
}: {
    credentialOwner: { userId: string; isDeleted: boolean } | undefined;
    deviceStatus: DeviceStatus;
}): AuthResult {
    if (credentialOwner?.isDeleted) {
        return { type: "restore_deleted", userId: credentialOwner.userId };
    }
    const credentialOwnerId = credentialOwner?.userId;
    if (!deviceStatus.isKnown) {
        return credentialOwnerId === undefined
            ? { type: "register", userId: generateUUID() }
            : { type: "login_new_device", userId: credentialOwnerId };
    }

    // A retired registered DID cannot be reused, even with its own credential.
    if (deviceStatus.isRegistered && !deviceStatus.isLoggedIn) {
        return {
            type: "associated_with_another_user",
            userId: deviceStatus.userId,
        };
    }
    if (credentialOwnerId === undefined) {
        return { type: "register", userId: deviceStatus.userId };
    }
    if (credentialOwnerId === deviceStatus.userId) {
        return { type: "login_known_device", userId: deviceStatus.userId };
    }
    if (deviceStatus.isRegistered) {
        // Proving another credential must not merge two registered accounts.
        return {
            type: "associated_with_another_user",
            userId: deviceStatus.userId,
        };
    }
    return {
        type: "merge",
        toUserId: credentialOwnerId,
        fromUserId: deviceStatus.userId,
    };
}
