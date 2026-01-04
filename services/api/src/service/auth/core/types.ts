/**
 * Core authentication types shared across all auth methods
 *
 * This module defines the fundamental building blocks for authentication:
 * - Credential types (hard vs soft verification)
 * - Authentication state patterns
 * - Authentication result types
 *
 * DESIGN PRINCIPLES:
 * - Type-safe discriminated unions prevent impossible states
 * - Extensible for adding new auth methods (email, passkey, etc.)
 * - Clear separation between hard (phone/Rarimo) and soft (Zupass) verification
 * - Zod schemas provide runtime validation and type inference
 */

import { z } from "zod";

// ============================================================================
// Credential Classification
// ============================================================================

/**
 * Credential verification strength
 *
 * HARD VERIFICATION:
 * - Phone OTP (SMS-based verification)
 * - Rarimo ZK Passport (biometric + government ID)
 * // - Future: Email verification, OAuth providers
 *
 * SOFT VERIFICATION:
 * - Zupass (event ticket ownership via ZK proofs)
 * // - Future: NFT ownership, DAO membership proofs
 *
 * Key difference:
 * - Hard: Can add new devices, upgrade guest → registered
 * - Soft: Cannot add new devices alone, remain as guests
 */
export const zodCredentialStrength = z.enum(["hard", "soft"]);
export type CredentialStrength = z.infer<typeof zodCredentialStrength>;

/**
 * Authentication method identifier
 * Extensible for future auth methods
 */
export const zodAuthMethod = z.enum([
    "phone",
    "rarimo",
    "zupass",
    // "email", // Future
    // "passkey", // Future
]);
export type AuthMethod = z.infer<typeof zodAuthMethod>;

/**
 * Credential strength mapping for each auth method
 * TypeScript enforces that ALL AuthMethod values are present
 */
export const AUTH_METHOD_STRENGTH = {
    phone: "hard",
    rarimo: "hard",
    zupass: "soft",
    // email: "hard", // Future
    // passkey: "hard", // Future - might be hard or soft depending on implementation
} as const satisfies Record<AuthMethod, CredentialStrength>;

/**
 * Hard verification methods (can add devices, upgrade guests)
 */
export const HARD_AUTH_METHODS: ReadonlySet<AuthMethod> = new Set(
    zodAuthMethod.options.filter((method) => AUTH_METHOD_STRENGTH[method] === "hard"),
);

/**
 * Soft verification methods (cannot add devices alone)
 */
export const SOFT_AUTH_METHODS: ReadonlySet<AuthMethod> = new Set(
    zodAuthMethod.options.filter((method) => AUTH_METHOD_STRENGTH[method] === "soft"),
);

/**
 * Get credential strength for an auth method
 * Type-safe: TypeScript ensures all AuthMethod values are in AUTH_METHOD_STRENGTH
 */
export function getCredentialStrength(method: AuthMethod): CredentialStrength {
    return AUTH_METHOD_STRENGTH[method];
}

// ============================================================================
// Device-Credential Association States
// ============================================================================

/**
 * Device-credential association status
 *
 * Describes the relationship between a device and a specific credential.
 * Combined with credential state for full authentication context:
 * - device_unknown_credential_available: New device + unclaimed credential
 * - device_unknown_credential_owned: New device + credential has owner
 * - device_owns_credential: Device user owns this credential (re-authentication)
 * - device_missing_credential_available: Known device + unclaimed credential
 * - device_missing_credential_owned: Known device + credential has different owner
 */
export const zodDeviceCredentialAssociation = z.enum([
    "device_unknown_credential_available",
    "device_unknown_credential_owned",
    "device_owns_credential",
    "device_missing_credential_available",
    "device_missing_credential_owned",
]);
export type DeviceCredentialAssociation = z.infer<typeof zodDeviceCredentialAssociation>;

// ============================================================================
// Credential State Patterns
// ============================================================================

/**
 * State of a credential (phone hash, nullifier, email, etc.)
 *
 * Two mutually exclusive states:
 * - available: No user owns this credential yet
 * - has_user: Credential is already linked to a user account
 */
export const zodCredentialState = z.enum(["available", "has_user"]);
export type CredentialState = z.infer<typeof zodCredentialState>;

/**
 * Generic credential authentication state
 *
 * Discriminated union based on device-credential relationship.
 * Metadata can include credential-specific information (phoneHash, nullifier, etc).
 */
export const zodCredentialAuthState = z.discriminatedUnion("deviceCredentialAssociation", [
    // Device unknown + credential available
    z.object({
        deviceCredentialAssociation: z.literal("device_unknown_credential_available"),
        metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    // Device unknown + credential owned
    z.object({
        deviceCredentialAssociation: z.literal("device_unknown_credential_owned"),
        userId: z.string(),
        isRegistered: z.boolean(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    // Device owns credential
    z.object({
        deviceCredentialAssociation: z.literal("device_owns_credential"),
        userId: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    // Device missing credential + credential available
    z.object({
        deviceCredentialAssociation: z.literal("device_missing_credential_available"),
        metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    // Device missing credential + credential owned
    z.object({
        deviceCredentialAssociation: z.literal("device_missing_credential_owned"),
        userId: z.string(),
        isRegistered: z.boolean(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    }),
]);
export type CredentialAuthState = z.infer<typeof zodCredentialAuthState>;

// ============================================================================
// Authentication Result Types
// ============================================================================

/**
 * Authentication type determination result
 *
 * Five possible authentication actions:
 * - register: Create new user or link credential to existing user
 * - login_known_device: Re-authenticate existing device
 * - login_new_device: Add new device to existing user account
 * - merge: Merge one account into another (guest-to-guest, guest-to-verified, etc.)
 * - associated_with_another_user: Reject (credential belongs to different user)
 *
 * Design notes:
 * - userId is the primary target for simple operations (register/login)
 * - toUserId is the merge target (device user - the account that will remain)
 * - fromUserId is the merge source (credential owner - the account to be merged away)
 * - Merge direction: Always merge FROM credential owner INTO device user
 *
 * IMPORTANT MERGE RULES:
 * - Guest → Guest: Allowed (soft-to-soft merge)
 * - Guest → Hard (phone/Rarimo): Allowed (hard account claims guest data)
 * - Hard → Hard: FORBIDDEN (cannot merge two verified accounts)
 * - Hard → Guest: FORBIDDEN (never merge from hard account into soft/guest account)
 */
export const zodAuthResult = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("register"),
        userId: z.string(),
    }),
    z.object({
        type: z.literal("login_known_device"),
        userId: z.string(),
    }),
    z.object({
        type: z.literal("login_new_device"),
        userId: z.string(),
    }),
    z.object({
        type: z.literal("merge"),
        toUserId: z.string(), // Merge target (device user)
        fromUserId: z.string(), // Merge source (credential owner)
    }),
    z.object({
        type: z.literal("associated_with_another_user"),
        userId: z.string(), // The conflicting user's ID
    }),
]);
export type AuthResult = z.infer<typeof zodAuthResult>;

// ============================================================================
// Device Status (from authUtil.ts - referenced for clarity)
// ============================================================================

/**
 * Device authentication status
 * This type is defined in authUtil.ts but referenced here for documentation
 *
 * Key fields:
 * - isKnown: Device exists in database
 * - isLoggedIn: Device has valid session (only true for registered users)
 * - isRegistered: User has hard credentials (phone OR Rarimo)
 * - userId: User associated with device (if isKnown)
 */
export interface DeviceStatus {
    isKnown: boolean;
    isLoggedIn: boolean;
    isRegistered: boolean;
    userId?: string;
}

// ============================================================================
// Authentication Strategy Interface (for future extensibility)
// ============================================================================

/**
 * Authentication strategy interface
 *
 * Future enhancement: Each auth method can implement this interface
 * to provide consistent APIs for registration, login, and state checking
 *
 * This enables:
 * - Easy addition of new auth methods
 * - Consistent testing patterns
 * - Strategy pattern for auth method selection
 */
export interface AuthStrategy {
    readonly method: AuthMethod;
    readonly strength: CredentialStrength;

    // Get authentication state for this credential
    getAuthState(params: {
        credential: unknown; // Method-specific credential (hash, nullifier, etc.)
        deviceId: string;
    }): Promise<CredentialAuthState>;

    // Determine authentication type based on state
    determineAuthType(
        authState: CredentialAuthState,
        deviceStatus: DeviceStatus,
    ): Promise<AuthResult>;

    // Execute authentication action
    executeAuth(authResult: AuthResult, params: unknown): Promise<void>;
}
