import {
    deviceTable,
    eventTicketTable,
    userTable,
    phoneTable,
    zkPassportTable,
} from "@/shared-backend/schema.js";
import type { VerifyEventTicket200 } from "@/shared/types/dto.js";
import type {
    EventSlug,
    DeviceLoginStatusExtended,
} from "@/shared/types/zod.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import { determineAuthType } from "./auth/core/stateHelpers.js";
import type { CredentialAuthState, AuthResult } from "./auth/core/types.js";
// Types only - no runtime import to avoid broken ESM
import type { GPCProof, GPCBoundConfig, GPCRevealedClaims } from "@pcd/gpc";
import type { JSONBoundConfig, JSONRevealedClaims } from "@pcd/gpc";
import { log } from "@/app.js";
import { getZupassEventId, getZupassSignerPublicKey } from "./zupassConfig.js";
import * as authUtilService from "./authUtil.js";
import { generateUnusedRandomUsername } from "./account.js";
import { mergeGuestIntoVerifiedUser } from "./merge.js";

// Dynamic import wrapper for gpcVerify to work around broken ESM in @pcd/gpc
async function gpcVerify(
    proof: GPCProof,
    boundConfig: GPCBoundConfig,
    revealedClaims: GPCRevealedClaims,
    pathToArtifacts: string,
): Promise<boolean> {
    const gpc = await import("@pcd/gpc");
    return gpc.gpcVerify(proof, boundConfig, revealedClaims, pathToArtifacts);
}

interface VerifyEventTicketProps {
    db: PostgresDatabase;
    didWrite: string;
    proofData: unknown; // GPC proof data from request - will be validated and parsed
    eventSlug: EventSlug; // Our internal event identifier
    userAgent: string;
    now: Date;
}

/**
 * Verifies a Zupass event ticket GPC proof and stores it in the database
 * Uses ZK proofs with nullifiers for maximum privacy
 * Nullifiers are event-specific (via externalNullifier = `agora-${eventSlug}-v1`)
 * Follows castVote pattern: allows unauthenticated requests and creates guest accounts
 */
export async function verifyEventTicket({
    db,
    didWrite,
    proofData,
    eventSlug,
    userAgent,
    now,
}: VerifyEventTicketProps): Promise<VerifyEventTicket200> {
    try {
        // Step 0: Parse and validate proof data structure
        log.info({ eventSlug }, "[Zupass] Parsing GPC proof data");

        if (!proofData || typeof proofData !== "object") {
            log.error("[Zupass] Proof data is not an object");
            return {
                success: false,
                reason: "deserialization_error",
            };
        }

        const proofDataObj = proofData as Record<string, unknown>;

        if (
            !("proof" in proofDataObj) ||
            !("boundConfig" in proofDataObj) ||
            !("revealedClaims" in proofDataObj)
        ) {
            log.error("[Zupass] Proof data missing required fields");
            return {
                success: false,
                reason: "deserialization_error",
            };
        }

        const gpc = await import("@pcd/gpc");
        let boundConfig: GPCBoundConfig;
        let revealedClaims: GPCRevealedClaims;

        try {
            boundConfig = gpc.boundConfigFromJSON(
                proofDataObj.boundConfig as JSONBoundConfig,
            );
            revealedClaims = gpc.revealedClaimsFromJSON(
                proofDataObj.revealedClaims as JSONRevealedClaims,
            );
        } catch (error: unknown) {
            log.error(
                {
                    error:
                        error instanceof Error ? error.message : String(error),
                },
                "[Zupass] Failed to parse or validate GPC proof data",
            );
            return {
                success: false,
                reason: "deserialization_error",
            };
        }

        // proof field is used as-is (already in correct format for gpcVerify)
        const proof = proofDataObj.proof as GPCProof;

        // Step 1: Verify GPC proof cryptographically
        log.info({ eventSlug }, "[Zupass] Verifying GPC proof");

        // Use local artifacts package - resolve path dynamically
        // The @pcd/proto-pod-gpc-artifacts package contains the verification keys
        const { fileURLToPath } = await import("node:url");
        const path = await import("node:path");
        const artifactsPath = path.dirname(
            fileURLToPath(
                import.meta.resolve(
                    "@pcd/proto-pod-gpc-artifacts/package.json",
                ),
            ),
        );

        const isValid = await gpcVerify(
            proof,
            boundConfig,
            revealedClaims,
            artifactsPath,
        );

        if (!isValid) {
            log.info("[Zupass] Invalid GPC proof");
            return {
                success: false,
                reason: "invalid_proof",
            };
        }

        log.info("[Zupass] ✓ GPC proof cryptographically valid");

        // Step 2: Validate watermark matches didWrite (proof binding)
        // This prevents proof stealing - attacker can't use someone else's proof
        const watermark = revealedClaims.watermark;
        if (!watermark?.type || watermark.type !== "string") {
            log.error(
                { didWrite, watermark },
                "[Zupass] Missing or invalid watermark in proof",
            );
            return {
                success: false,
                reason: "invalid_proof",
            };
        }

        if (watermark.value !== didWrite) {
            log.error(
                {
                    didWrite,
                    watermarkValue: watermark.value,
                },
                "[Zupass] Watermark mismatch - proof bound to different DID (proof stealing attempt?)",
            );
            return {
                success: false,
                reason: "invalid_proof",
            };
        }

        log.info(
            { didWrite },
            "[Zupass] ✓ Watermark validated - proof bound to correct DID",
        );

        // Step 3: Validate boundConfig contains expected eventId and signerPublicKey
        // This prevents submitting valid proofs for wrong events
        const expectedEventId = getZupassEventId(eventSlug);
        const expectedSignerPublicKey = getZupassSignerPublicKey(eventSlug);

        // GPCProofInputs contains membershipLists, which is passed to the proof
        // We need to check if the proof was generated with the correct tuples
        // The tuples should contain [signerPublicKey, eventId, ...]

        // Check tuples configuration in boundConfig
        if (
            !boundConfig.tuples ||
            Object.keys(boundConfig.tuples).length === 0
        ) {
            log.error({ didWrite }, "[Zupass] Missing tuples in boundConfig");
            return {
                success: false,
                reason: "invalid_proof",
            };
        }

        // Find the ticket tuple configuration
        const ticketTupleName = Object.keys(boundConfig.tuples).find((name) =>
            name.includes("ticket"),
        );

        if (!ticketTupleName) {
            log.error(
                { didWrite },
                "[Zupass] No ticket tuple found in boundConfig",
            );
            return {
                success: false,
                reason: "invalid_proof",
            };
        }

        const ticketTuple = boundConfig.tuples[ticketTupleName];

        // Validate tuple has memberOf constraint pointing to our allowlist
        if (!ticketTuple.isMemberOf) {
            log.error(
                { didWrite },
                "[Zupass] Ticket tuple missing isMemberOf constraint",
            );
            return {
                success: false,
                reason: "invalid_proof",
            };
        }

        // Step 2b: Validate membershipLists contain expected eventId and signerPublicKey
        // This is CRITICAL - prevents submitting valid proofs for wrong events
        const membershipLists = revealedClaims.membershipLists;

        if (!membershipLists) {
            log.error(
                { didWrite },
                "[Zupass] Missing membershipLists in revealedClaims",
            );
            return {
                success: false,
                reason: "invalid_proof",
            };
        }

        // Find the allowlist for ticket tuples
        const allowlistKey = Object.keys(membershipLists).find(
            (key) => key.includes("allowlist") && key.includes("ticket"),
        );

        if (!allowlistKey) {
            log.error(
                { didWrite },
                "[Zupass] No ticket allowlist found in membershipLists",
            );
            return {
                success: false,
                reason: "invalid_proof",
            };
        }

        const allowlist = membershipLists[allowlistKey];
        if (!Array.isArray(allowlist) || allowlist.length === 0) {
            log.error(
                { didWrite },
                "[Zupass] Invalid or empty ticket allowlist",
            );
            return {
                success: false,
                reason: "invalid_proof",
            };
        }

        // Validate ALL tuples in the allowlist contain the expected eventId and signerPublicKey
        // JSONPODValue format: can be {eddsa_pubkey: string} or string directly
        const allTuplesValid = allowlist.every((tuple, index) => {
            if (!Array.isArray(tuple) || tuple.length < 2) {
                log.warn(
                    { tupleIndex: index, tuple },
                    "[Zupass] Validation failed: tuple is not array or has less than 2 elements",
                );
                return false;
            }
            // First element should be signerPublicKey
            // After deserialization, PODValue has .type and .value properties
            const signerValue = tuple[0];
            if (
                typeof signerValue !== "object" ||
                !("type" in signerValue) ||
                !("value" in signerValue)
            ) {
                log.warn(
                    { tupleIndex: index, signerValue },
                    "[Zupass] Validation failed: first element is not a PODValue object",
                );
                return false;
            }

            // Extract the actual value - could be eddsa_pubkey or string type
            const actualSignerKey = String(signerValue.value);
            const signerMatch = actualSignerKey === expectedSignerPublicKey;
            if (!signerMatch) {
                log.warn(
                    {
                        tupleIndex: index,
                        actual: actualSignerKey,
                        expected: expectedSignerPublicKey,
                        signerValueType: signerValue.type,
                    },
                    "[Zupass] Validation failed: signerPublicKey mismatch",
                );
                return false;
            }

            // Second element should be eventId
            const eventValue = tuple[1];
            if (
                typeof eventValue !== "object" ||
                !("type" in eventValue) ||
                !("value" in eventValue)
            ) {
                log.warn(
                    { tupleIndex: index, eventValue },
                    "[Zupass] Validation failed: second element is not a PODValue object",
                );
                return false;
            }

            // Extract the actual event ID value
            const eventId = String(eventValue.value);
            const eventMatch = eventId === expectedEventId;
            if (!eventMatch) {
                log.warn(
                    {
                        tupleIndex: index,
                        actual: eventId,
                        expected: expectedEventId,
                        eventValueType: eventValue.type,
                    },
                    "[Zupass] Validation failed: eventId mismatch",
                );
                return false;
            }

            return true;
        });

        if (!allTuplesValid) {
            log.error(
                { didWrite, expectedEventId, expectedSignerPublicKey },
                "[Zupass] Validation FAILED: membershipLists contain wrong eventId or signerPublicKey",
            );
            return {
                success: false,
                reason: "wrong_event",
            };
        }

        log.info(
            { didWrite, eventSlug, tuplesCount: allowlist.length },
            "[Zupass] ✓ Validated: ALL tuples match expected eventId and signerPublicKey",
        );

        // Step 3: Extract nullifier from proof
        // Nullifier is event-specific via externalNullifier = `agora-${eventSlug}-v1`
        // After deserialization, PODValue has .type and .value properties
        const nullifierValue = revealedClaims.owner?.externalNullifier;

        if (nullifierValue?.type !== "string") {
            log.error(
                { nullifierValue },
                "[Zupass] Missing or invalid nullifier type in GPC proof",
            );
            return {
                success: false,
                reason: "deserialization_error",
            };
        }

        const nullifier = nullifierValue.value;

        log.info(
            { didWrite, nullifier },
            "[Zupass] ✓ Nullifier extracted - replay protection via database uniqueness check",
        );

        // Note on replay attack prevention:
        // We rely on nullifier uniqueness (enforced by database constraint) rather than
        // timestamp validation because:
        // 1. GPC proofs don't include a "proof generation timestamp"
        // 2. POD timestamps (timestampSigned/timestampConsumed) represent ticket lifecycle events,
        //    not proof generation time
        // 3. The nullifier is cryptographically bound to the proof and event-specific,
        //    making it impossible to reuse the same proof twice

        // Step 4: Get device status (may be guest, verified, or non-existent)
        const deviceStatus = await authUtilService.getDeviceStatus({
            db,
            didWrite,
            now,
        });

        // Step 6: Determine authentication type
        const authResult = await getZupassAuthenticationType({
            db,
            nullifier,
            didWrite,
            deviceStatus,
        });

        // Step 7: Handle rejection case
        if (authResult.type === "associated_with_another_user") {
            log.info(
                { didWrite, nullifier, eventSlug },
                "[Zupass] Nullifier associated with another user",
            );
            return {
                success: false,
                reason: "ticket_already_used",
            };
        }

        // Step 8: Calculate session expiry (1000 years, same as phone/Rarimo)
        const sessionExpiry = new Date(now);
        sessionExpiry.setFullYear(sessionExpiry.getFullYear() + 1000);

        // Step 9: Execute appropriate action
        await db.transaction(async (tx) => {
            switch (authResult.type) {
                case "register":
                    // Create new user and link nullifier (or link nullifier to existing user)
                    if (deviceStatus.isKnown) {
                        // Device exists, just add ticket
                        await tx.insert(eventTicketTable).values({
                            userId: authResult.userId,
                            provider: "zupass",
                            nullifier,
                            eventSlug,
                            pcdType: "gpc",
                            providerMetadata: null, // No metadata revealed with fieldsToReveal: {}
                        });
                        log.info(
                            { userId: authResult.userId, nullifier, eventSlug },
                            "[Zupass] Added ticket to existing user",
                        );
                    } else {
                        // Create new user + device + ticket
                        await registerWithZupass({
                            db: tx,
                            didWrite,
                            nullifier,
                            eventSlug,
                            userAgent,
                            userId: authResult.userId,
                            sessionExpiry,
                        });
                        log.info(
                            { userId: authResult.userId, nullifier, eventSlug },
                            "[Zupass] Registered new user with Zupass ticket",
                        );
                    }
                    break;

                case "login_new_device":
                    // Impersonate guest or add new device to existing user
                    await loginNewDeviceWithZupass({
                        db: tx,
                        didWrite,
                        userId: authResult.userId,
                        userAgent,
                        sessionExpiry,
                    });
                    log.info(
                        { userId: authResult.userId, nullifier, eventSlug },
                        "[Zupass] Logged in new device with Zupass ticket",
                    );
                    break;

                case "login_known_device":
                    // Device already owns this ticket - just confirm (soft login, no session update)
                    log.info(
                        { userId: authResult.userId, nullifier, eventSlug },
                        "[Zupass] Confirmed existing ticket ownership",
                    );
                    break;

                case "merge":
                    await mergeGuestIntoVerifiedUser({
                        db: tx,
                        verifiedUserId: authResult.toUserId,
                        guestUserId: authResult.fromUserId,
                    });
                    await tx
                        .update(deviceTable)
                        .set({
                            userId: authResult.toUserId,
                            sessionExpiry: sessionExpiry,
                            updatedAt: now,
                        })
                        .where(eq(deviceTable.didWrite, didWrite));
                    log.info(
                        {
                            toUserId: authResult.toUserId,
                            fromUserId: authResult.fromUserId,
                        },
                        "[Zupass] Merged guest into target user and logged in device",
                    );
                    break;
            }
        });

        const userId =
            authResult.type === "merge" ? authResult.toUserId : authResult.userId;
        log.info(
            {
                userId,
                nullifier,
                eventSlug,
                type: authResult.type,
            },
            "[Zupass] Successfully verified ticket",
        );

        return {
            success: true,
            accountMerged: authResult.type === "merge",
            userId,
        };
    } catch (error) {
        log.error(
            { error, didWrite },
            "[Zupass] Unexpected error during verification",
        );
        throw error;
    }
}

/**
 * Check if a user has a verified ticket for a specific event
 * Only considers non-deleted users
 */
export async function hasEventTicket({
    db,
    userId,
    eventSlug,
}: {
    db: PostgresDatabase;
    userId: string;
    eventSlug: EventSlug;
}): Promise<boolean> {
    const tickets = await db
        .select()
        .from(eventTicketTable)
        .innerJoin(userTable, eq(eventTicketTable.userId, userTable.id))
        .where(
            and(
                eq(eventTicketTable.userId, userId),
                eq(eventTicketTable.eventSlug, eventSlug),
                eq(userTable.isDeleted, false),
            ),
        );

    return tickets.length > 0;
}

// ============================================================================
// Helper Functions for Ticket Authentication (following phone/Rarimo pattern)
// ============================================================================


interface GetZupassAuthenticationTypeProps {
    db: PostgresDatabase;
    nullifier: string;
    didWrite: string;
    deviceStatus: DeviceLoginStatusExtended;
}

/**
 * Zupass nullifier-specific credential auth state
 * Maps Zupass nullifier authentication data to generic CredentialAuthState
 */
type ZupassAuthState = CredentialAuthState & {
    metadata?: { nullifier: string };
};

interface GetZupassAuthStateParams {
    db: PostgresDatabase;
    nullifier: string;
    didWrite: string;
}

/**
 * Get combined Zupass authentication state
 * Performs both device association check and ticket user status check in one function
 * Returns discriminated union that makes impossible states unrepresentable
 */
async function getZupassAuthState({
    db,
    nullifier,
    didWrite,
}: GetZupassAuthStateParams): Promise<ZupassAuthState> {
    // Query 1: Check device association with nullifier
    const didAssociationResult = await db
        .select({
            nullifier: eventTicketTable.nullifier,
            userId: deviceTable.userId,
        })
        .from(deviceTable)
        .leftJoin(
            eventTicketTable,
            and(
                eq(eventTicketTable.userId, deviceTable.userId),
                eq(eventTicketTable.nullifier, nullifier),
            ),
        )
        .where(eq(deviceTable.didWrite, didWrite));

    const deviceExists = didAssociationResult.length > 0;
    const isAssociated =
        deviceExists && didAssociationResult[0].nullifier !== null;

    // Query 2: Check ticket user status (only active users, deleted users ignored)
    // Use denormalized isDeleted from eventTicketTable
    const ticketResults = await db
        .select({
            userId: eventTicketTable.userId,
            isDeleted: eventTicketTable.isDeleted,
        })
        .from(eventTicketTable)
        .innerJoin(userTable, eq(userTable.id, eventTicketTable.userId))
        .where(eq(eventTicketTable.nullifier, nullifier));

    const activeUser = ticketResults.find((r) => !r.isDeleted);

    // Handle "device_owns_credential" case first - it guarantees a user exists
    if (isAssociated) {
        if (activeUser) {
            return {
                deviceCredentialAssociation: "device_owns_credential",
                userId: activeUser.userId,
                metadata: { nullifier },
            };
        }
        // Fall through if no user found (shouldn't happen with FK)
    }

    // For non-associated cases, check active user
    if (activeUser) {
        const userId = activeUser.userId;
        const isVerified = await isRegistered({ db, userId });

        if (!deviceExists) {
            return {
                deviceCredentialAssociation: "device_unknown_credential_owned",
                userId,
                isRegistered: isVerified,
                metadata: { nullifier },
            };
        } else {
            return {
                deviceCredentialAssociation: "device_missing_credential_owned",
                userId,
                isRegistered: isVerified,
                metadata: { nullifier },
            };
        }
    }

    // Ticket is available (no active user, deleted users ignored)
    if (!deviceExists) {
        return {
            deviceCredentialAssociation: "device_unknown_credential_available",
            metadata: { nullifier },
        };
    } else {
        return {
            deviceCredentialAssociation: "device_missing_credential_available",
            metadata: { nullifier },
        };
    }
}

/**
 * Check if user has strong credentials (phone OR Rarimo)
 * Returns true if registered, false for guests and Zupass-only users
 * See authUtil.ts getDeviceStatus() for full authentication taxonomy
 */
export async function isRegistered({
    db,
    userId,
}: {
    db: PostgresDatabase;
    userId: string;
}): Promise<boolean> {
    // Check phone
    const phoneResult = await db
        .select()
        .from(phoneTable)
        .where(eq(phoneTable.userId, userId));

    if (phoneResult.length > 0) {
        return true;
    }

    // Check Rarimo
    const zkPassportResult = await db
        .select()
        .from(zkPassportTable)
        .where(eq(zkPassportTable.userId, userId));

    return zkPassportResult.length > 0;
}

/**
 * Determine authentication type for Zupass nullifier verification
 *
 * ZUPASS "SOFT VERIFICATION" MODEL:
 * - Zupass uses GPC zero-knowledge proofs to verify event ticket ownership
 * - Proof of ownership = credential (similar to a password)
 * - If you can prove you have the ticket (valid GPC proof), you ARE that user
 * - Allows login from new devices (unlike pure device-based auth)
 * - Guests CAN be "soft verified" - Zupass-only users are still guests but cannot be impersonated
 *
 * MERGE DIRECTION RULE:
 * - Always merge INTO the device user (the one making the request)
 * - For simplicity and security: device user retains control
 *
 * Uses combined ZupassAuthState for type-safe, assertion-free logic
 */
export async function getZupassAuthenticationType({
    db,
    nullifier,
    didWrite,
    deviceStatus,
}: GetZupassAuthenticationTypeProps): Promise<AuthResult> {
    const credentialAuthState = await getZupassAuthState({
        db,
        nullifier,
        didWrite,
    });

    return determineAuthType({
        credentialAuthState,
        deviceStatus,
        authMethod: "zupass",
    });
}

// ============================================================================
// Action Functions for Zupass Authentication (following Rarimo pattern)
// ============================================================================

interface RegisterWithZupassProps {
    db: PostgresDatabase;
    didWrite: string;
    nullifier: string;
    eventSlug: EventSlug;
    userAgent: string;
    userId: string;
    sessionExpiry: Date;
}

interface LoginNewDeviceWithZupassProps {
    db: PostgresDatabase;
    didWrite: string;
    userAgent: string;
    userId: string;
    sessionExpiry: Date;
}

interface LoginKnownDeviceWithZupassProps {
    db: PostgresDatabase;
    didWrite: string;
    now: Date;
    sessionExpiry: Date;
}

/**
 * Register a new user with Zupass nullifier
 * Follows EXACT pattern from registerWithZKP (auth.ts:564)
 */
export async function registerWithZupass({
    db,
    didWrite,
    nullifier,
    eventSlug,
    userAgent,
    userId,
    sessionExpiry,
}: RegisterWithZupassProps): Promise<void> {
    log.info("[Zupass] Register with Zupass");
    await db.transaction(async (tx) => {
        await tx.insert(userTable).values({
            username: await generateUnusedRandomUsername({ db: db }),
            id: userId,
        });
        await tx.insert(deviceTable).values({
            userId: userId,
            didWrite: didWrite,
            userAgent: userAgent,
            sessionExpiry: sessionExpiry,
        });
        await tx.insert(eventTicketTable).values({
            userId: userId,
            provider: "zupass",
            nullifier: nullifier,
            eventSlug: eventSlug,
            pcdType: "gpc",
            providerMetadata: null, // No metadata revealed with fieldsToReveal: {}
        });
    });
}

/**
 * Log in a new device with Zupass
 * Follows EXACT pattern from loginNewDeviceWithZKP (auth.ts:623)
 */
export async function loginNewDeviceWithZupass({
    db,
    didWrite,
    userId,
    userAgent,
    sessionExpiry,
}: LoginNewDeviceWithZupassProps): Promise<void> {
    log.info("[Zupass] Logging-in new device with Zupass");
    await db.insert(deviceTable).values({
        userId: userId,
        didWrite: didWrite,
        userAgent: userAgent,
        sessionExpiry: sessionExpiry,
    });
}

/**
 * Log in a known device with Zupass
 * Follows EXACT pattern from loginKnownDeviceWithZKP (auth.ts:666)
 */
export async function loginKnownDeviceWithZupass({
    db,
    didWrite,
    now,
    sessionExpiry,
}: LoginKnownDeviceWithZupassProps): Promise<void> {
    log.info("[Zupass] Logging-in known device with Zupass");
    await db
        .update(deviceTable)
        .set({
            sessionExpiry: sessionExpiry,
            updatedAt: now,
        })
        .where(eq(deviceTable.didWrite, didWrite));
}
