/**
 * Shared authentication state helpers
 *
 * This module provides reusable functions for determining authentication actions
 * across all auth methods (phone, Rarimo, Zupass, future methods).
 *
 * DESIGN PRINCIPLES:
 * - Auth method agnostic: Works for any credential type (hard or soft)
 * - Type-safe: Uses Zod discriminated unions to prevent impossible states
 * - Testable: Pure functions with no side effects
 * - Consistent: Same logic applied across phone/Rarimo/Zupass
 *
 * KEY CONCEPTS:
 * - Device-Credential Association: Relationship between a device and a credential
 * - Credential State: Whether a credential is available or already has a user
 * - Auth Result: Determined action (register, login, merge, reject)
 * - Merge Rules: Guest→Guest ✅, Guest→Hard ✅, Hard→Hard ❌, Hard→Guest ❌
 */

import { generateUUID } from "@/crypto.js";
import type {
    AuthResult,
    CredentialAuthState,
    DeviceStatus,
    AuthMethod,
    CredentialStrength,
} from "./types.js";
import { AUTH_METHOD_STRENGTH } from "./types.js";

// ============================================================================
// Authentication Type Determination
// ============================================================================

/**
 * Determine authentication action based on credential state and device status
 *
 * This is the core authentication logic used by all auth methods.
 * It implements the decision matrix documented in ZUPASS_BEHAVIOR_ANALYSIS.md
 *
 * @param credentialAuthState - State of the credential (device association + credential ownership)
 * @param deviceStatus - Status of the device making the request
 * @param authMethod - Auth method being used (for credential strength lookup)
 * @returns Authentication result (register, login, merge, or reject)
 *
 * AUTHENTICATION RULES:
 *
 * 1. Device Unknown (never seen before):
 *    - Credential available → Register new user
 *    - Credential has hard user → Reject (cannot steal verified account)
 *    - Credential has soft user → Login to existing user (ZK proof = ownership)
 *
 * 2. Device Owns Credential (re-authentication):
 *    - Always → Login known device
 *
 * 3. Device Missing Credential (device exists but doesn't own this credential):
 *    - Credential available → Register (add credential to device user)
 *    - Credential has hard user → Reject (cannot merge two hard accounts)
 *    - Credential has soft user + device hard → Merge guest into hard
 *    - Credential has soft user + device soft → Merge guest into guest
 *
 * MERGE DIRECTION:
 * - Always merge INTO the device user (the one making the request)
 * - For simplicity and security: device user retains control
 */
export function determineAuthType({
    credentialAuthState,
    deviceStatus,
    authMethod,
}: {
    credentialAuthState: CredentialAuthState;
    deviceStatus: DeviceStatus;
    authMethod: AuthMethod;
}): AuthResult {
    const credentialStrength = AUTH_METHOD_STRENGTH[authMethod];

    switch (credentialAuthState.deviceCredentialAssociation) {
        case "device_unknown_credential_available": {
            // New device + unclaimed credential → register new user
            return { type: "register", userId: generateUUID() };
        }

        case "device_unknown_credential_owned": {
            // New device + credential has owner

            if (credentialStrength === "hard") {
                // Hard credentials (phone, Rarimo): Verification itself proves ownership
                // - Phone: OTP proves you have the phone
                // - Rarimo: ZK proof + government ID verification proves identity
                // Therefore, allow login from new device
                return {
                    type: "login_new_device",
                    userId: credentialAuthState.userId,
                };
            } else {
                // Soft credentials (Zupass): ZK proof only proves ticket ownership
                // - If user is guest: ZK proof = sufficient proof, allow login
                // - If user is registered: Cannot steal verified account with soft credential
                if (credentialAuthState.isRegistered) {
                    return {
                        type: "associated_with_another_user",
                        userId: credentialAuthState.userId,
                    };
                } else {
                    return {
                        type: "login_new_device",
                        userId: credentialAuthState.userId,
                    };
                }
            }
        }

        case "device_owns_credential": {
            // Device user already owns this credential (re-authentication)
            return {
                type: "login_known_device",
                userId: credentialAuthState.userId,
            };
        }

        case "device_missing_credential_available": {
            // Known device + unclaimed credential → device user claims it
            const deviceUserId = deviceStatus.userId;
            if (!deviceUserId) {
                throw new Error(
                    "Device exists but userId is missing - data integrity issue",
                );
            }
            return { type: "register", userId: deviceUserId };
        }

        case "device_missing_credential_owned": {
            // Known device + credential has different owner
            const deviceUserId = deviceStatus.userId;
            if (!deviceUserId) {
                throw new Error(
                    "Device exists but userId is missing - data integrity issue",
                );
            }

            // MERGE RULES:
            // 1. Guest device + Hard credential (verified) → Merge guest INTO hard ✅
            // 2. Guest device + Soft credential (from guest) → Merge other guest INTO device guest ✅
            // 3. Verified device + Soft credential (from guest) → Merge guest INTO verified ✅
            // 4. Verified device + Soft credential (from verified) → ERROR ❌
            // 5. Guest device + Soft credential (from verified) → ERROR ❌
            // 6. Verified device + Hard credential → ERROR ❌

            if (deviceStatus.isRegistered) {
                // Device user is verified
                if (credentialAuthState.isRegistered) {
                    // Case 4 or 6: Verified device + credential from verified user
                    // Cannot merge two verified accounts - reject
                    return {
                        type: "associated_with_another_user",
                        userId: deviceUserId,
                    };
                } else {
                    // Case 3: Verified device + Soft credential from guest
                    // Merge guest INTO verified user
                    return {
                        type: "merge",
                        toUserId: deviceUserId, // Verified device user (target)
                        fromUserId: credentialAuthState.userId, // Guest credential owner (source)
                    };
                }
            } else {
                // Device user is guest
                if (credentialAuthState.isRegistered) {
                    // Credential owner is verified
                    if (credentialStrength === "hard") {
                        // Case 1: Guest device + Hard credential (phone/Rarimo)
                        // Hard credential verification proves ownership (OTP for phone, ZK+ID for Rarimo)
                        // Merge guest INTO verified account
                        return {
                            type: "merge",
                            toUserId: credentialAuthState.userId, // Verified credential owner (target)
                            fromUserId: deviceUserId, // Guest device user (source)
                        };
                    } else {
                        // Case 5: Guest device + Soft credential from verified user
                        // Cannot steal verified account with guest device - reject
                        return {
                            type: "associated_with_another_user",
                            userId: deviceUserId,
                        };
                    }
                } else {
                    // Case 2: Guest device + Soft credential from another guest
                    // Merge device guest INTO credential owner guest (credential owner becomes target)
                    return {
                        type: "merge",
                        toUserId: credentialAuthState.userId, // Guest credential owner (target)
                        fromUserId: deviceUserId, // Guest device user (source)
                    };
                }
            }
        }

        default: {
            // Exhaustiveness check
            const _exhaustive: never = credentialAuthState;
            throw new Error(
                `Unknown device credential association: ${JSON.stringify(_exhaustive)}`,
            );
        }
    }
}

// ============================================================================
// Future: Additional Helpers
// ============================================================================

/**
 * Validate merge operation is allowed
 *
 * TODO: Extract this logic for explicit validation before executing merges
 * Currently embedded in determineAuthType, but could be useful as standalone validator
 */
export function canMergeAccounts({
    fromUserIsRegistered,
}: {
    fromUserIsRegistered: boolean;
    toUserIsRegistered: boolean;
}): boolean {
    // MERGE RULES:
    // - Guest → Guest: Allowed ✅
    // - Guest → Hard: Allowed ✅
    // - Hard → Hard: FORBIDDEN ❌
    // - Hard → Guest: FORBIDDEN ❌

    if (fromUserIsRegistered) {
        // Cannot merge FROM a verified account
        return false;
    }

    // From user is guest - can merge into either guest or verified
    return true;
}

/**
 * Get credential strength for an auth method
 *
 * Helper to determine if an auth method provides hard or soft verification
 * Delegates to AUTH_METHOD_STRENGTH mapping from types.ts
 */
export function getCredentialStrength(method: AuthMethod): CredentialStrength {
    return AUTH_METHOD_STRENGTH[method];
}
