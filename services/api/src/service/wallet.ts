/**
 * Wallet authentication service for Jomhoor wallet integration
 *
 * 2-step challenge-response flow, mirroring Rarimo's verificator-svc pattern:
 *
 * Step 1: generateWalletChallenge (UCAN-authenticated)
 *   Browser/WebView requests a challenge → Backend generates crypto-random token,
 *   stores in DB with 5-min TTL → Returns challenge string.
 *   Frontend shows QR code (desktop) or sends via postMessage (WebView).
 *
 * Step 2a: submitWalletChallenge (NO UCAN — called by Jomhoor native app)
 *   Jomhoor app receives challenge via deep link or postMessage → Posts
 *   { challenge, walletAddress, nationality } → Backend validates challenge
 *   and marks as 'submitted'.
 *
 * Step 2b: verifyWalletStatusAndAuthenticate (UCAN-authenticated — frontend polls)
 *   Frontend polls every 2s → When status='submitted', completes auth
 *   (register/login/merge) using existing auth functions → Returns result.
 *
 * Security model:
 * - Challenge token is 32 bytes of crypto-random hex (256-bit entropy)
 * - One-time use, expires after 5 minutes
 * - One active challenge per device (didWrite as PK, upsert overwrites)
 * - Wallet address uniqueness enforced by walletTable partial unique index
 * - Future: Add EdDSA signature verification for defense-in-depth
 */

import {
    deviceTable,
    walletAuthChallengeTable,
} from "@/shared-backend/schema.js";
import type {
    GenerateWalletChallenge200,
    WalletChallengeSubmit200,
    WalletVerifyStatus200,
} from "@/shared/types/dto.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { nowZeroMs } from "@/shared/util.js";
import {
    getWalletAuthenticationType,
    loginKnownDeviceWithWallet,
    loginNewDeviceWithWallet,
    registerWithWallet,
} from "@/service/auth.js";
import * as authUtilService from "@/service/authUtil.js";
import { log } from "@/app.js";
import { mergeGuestIntoVerifiedUser } from "./merge.js";
import { generateRandomHex } from "@/crypto.js";
import { isLoggedInOrExistsAndAssociatedWithNoNullifier } from "./rarimo.js";

const CHALLENGE_TTL_MINUTES = 5;

// ─── Step 1: Generate Challenge ────────────────────────────────────────────────

interface GenerateWalletChallengeProps {
    db: PostgresDatabase;
    didWrite: string;
}

/**
 * Generate a crypto-random challenge for wallet authentication.
 * Mirrors generateVerificationLink() in rarimo.ts.
 *
 * - Checks the device isn't already hard-logged in
 * - Creates/overwrites a challenge record (one per didWrite)
 * - Returns the challenge string for the frontend to pass to the Jomhoor app
 */
export async function generateWalletChallenge({
    db,
    didWrite,
}: GenerateWalletChallengeProps): Promise<GenerateWalletChallenge200> {
    const now = nowZeroMs();

    // Same guard as Rarimo: check if already logged in with a hard credential
    const badStatus = await isLoggedInOrExistsAndAssociatedWithNoNullifier({
        db,
        didWrite,
        now,
    });
    if (badStatus !== undefined) {
        return { success: false, reason: badStatus };
    }

    // Generate challenge: 32 bytes of crypto-random hex (256-bit entropy)
    const challenge = generateRandomHex();

    // Calculate expiry
    const expiresAt = new Date(now);
    expiresAt.setMinutes(expiresAt.getMinutes() + CHALLENGE_TTL_MINUTES);

    // Upsert: one active challenge per device (didWrite is PK)
    await db
        .insert(walletAuthChallengeTable)
        .values({
            didWrite,
            challenge,
            status: "pending",
            expiresAt,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: walletAuthChallengeTable.didWrite,
            set: {
                challenge,
                walletAddress: null,
                nationality: null,
                status: "pending",
                expiresAt,
                updatedAt: now,
            },
        });

    log.info(
        { didWrite, expiresAt },
        "[Wallet] Generated challenge for wallet authentication",
    );

    return {
        success: true,
        challenge,
    };
}

// ─── Step 2a: Submit Challenge ─────────────────────────────────────────────────

interface SubmitWalletChallengeProps {
    db: PostgresDatabase;
    challenge: string;
    walletAddress: string;
    nationality: string;
}

/**
 * Submit wallet data for a pending challenge.
 * Called by the Jomhoor native app (NO UCAN required).
 *
 * Security: The challenge token itself authenticates the request —
 * it's 256-bit random, one-time use, and expires in 5 minutes.
 * Only the browser and app that received it (via QR/deep link/postMessage) know it.
 *
 * Future: Add EdDSA (BabyJubjub) signature verification for defense-in-depth.
 */
export async function submitWalletChallenge({
    db,
    challenge,
    walletAddress,
    nationality,
}: SubmitWalletChallengeProps): Promise<WalletChallengeSubmit200> {
    const now = nowZeroMs();

    // Look up challenge by token
    const results = await db
        .select()
        .from(walletAuthChallengeTable)
        .where(eq(walletAuthChallengeTable.challenge, challenge));

    if (results.length === 0) {
        log.warn("[Wallet] Submit failed: invalid challenge token");
        return { success: false, reason: "invalid_challenge" };
    }

    const record = results[0];

    // Check expiry
    if (record.expiresAt < now) {
        log.warn(
            { didWrite: record.didWrite },
            "[Wallet] Submit failed: challenge expired",
        );
        // Clean up expired challenge
        await db
            .delete(walletAuthChallengeTable)
            .where(eq(walletAuthChallengeTable.challenge, challenge));
        return { success: false, reason: "challenge_expired" };
    }

    // Check not already submitted
    if (record.status !== "pending") {
        log.warn(
            { didWrite: record.didWrite, status: record.status },
            "[Wallet] Submit failed: challenge already used",
        );
        return { success: false, reason: "challenge_already_used" };
    }

    // Update with wallet data and mark as 'submitted'
    const normalisedAddress = walletAddress.toLowerCase();
    await db
        .update(walletAuthChallengeTable)
        .set({
            walletAddress: normalisedAddress,
            nationality,
            status: "submitted",
            updatedAt: now,
        })
        .where(eq(walletAuthChallengeTable.challenge, challenge));

    log.info(
        { didWrite: record.didWrite, nationality },
        "[Wallet] Challenge submitted with wallet data",
    );

    return { success: true };
}

// ─── Step 2b: Verify Status + Authenticate ─────────────────────────────────────

interface VerifyWalletStatusProps {
    db: PostgresDatabase;
    didWrite: string;
    userAgent: string;
}

/**
 * Poll for wallet challenge status and complete authentication when ready.
 * Mirrors verifyUserStatusAndAuthenticate() in rarimo.ts.
 *
 * - If status='pending': returns { walletStatus: "pending" }
 * - If expired: cleans up and returns { walletStatus: "expired" }
 * - If status='submitted': processes auth (register/login/merge),
 *   cleans up challenge, returns verified result
 */
export async function verifyWalletStatusAndAuthenticate({
    db,
    didWrite,
    userAgent,
}: VerifyWalletStatusProps): Promise<WalletVerifyStatus200> {
    const now = nowZeroMs();

    // Same guard as Rarimo: check if already hard-logged in
    const badStatus = await isLoggedInOrExistsAndAssociatedWithNoNullifier({
        db,
        didWrite,
        now,
    });
    if (badStatus !== undefined) {
        return { success: false, reason: badStatus };
    }

    // Look up challenge for this device
    const results = await db
        .select()
        .from(walletAuthChallengeTable)
        .where(eq(walletAuthChallengeTable.didWrite, didWrite));

    if (results.length === 0) {
        return { success: false, reason: "no_challenge" };
    }

    const record = results[0];

    // Check expiry
    if (record.expiresAt < now) {
        await db
            .delete(walletAuthChallengeTable)
            .where(eq(walletAuthChallengeTable.didWrite, didWrite));
        return { success: true, walletStatus: "expired" };
    }

    // Still waiting for Jomhoor app to submit
    if (record.status === "pending") {
        return { success: true, walletStatus: "pending" };
    }

    // status === 'submitted' — process authentication
    const walletAddress = record.walletAddress!;
    const nationality = record.nationality!;

    // Get device status and determine auth type
    const deviceStatus = await authUtilService.getDeviceStatus({
        db,
        didWrite,
        now,
    });

    const authResult = await getWalletAuthenticationType({
        db,
        walletAddress,
        didWrite,
        deviceStatus,
    });

    // Set up long-lived session
    const loginSessionExpiry = new Date(now);
    loginSessionExpiry.setFullYear(loginSessionExpiry.getFullYear() + 1000);
    let accountMerged = false;

    // Wrap all operations in transaction for atomicity
    await db.transaction(async (tx) => {
        switch (authResult.type) {
            case "associated_with_another_user":
                break;
            case "register":
                await registerWithWallet({
                    db: tx,
                    didWrite,
                    walletAddress,
                    nationality,
                    userAgent,
                    userId: authResult.userId,
                    sessionExpiry: loginSessionExpiry,
                });
                break;
            case "login_known_device":
                await loginKnownDeviceWithWallet({
                    db: tx,
                    didWrite,
                    now,
                    sessionExpiry: loginSessionExpiry,
                });
                break;
            case "login_new_device":
                await loginNewDeviceWithWallet({
                    db: tx,
                    didWrite,
                    userId: authResult.userId,
                    userAgent,
                    sessionExpiry: loginSessionExpiry,
                });
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
                        sessionExpiry: loginSessionExpiry,
                        updatedAt: now,
                    })
                    .where(eq(deviceTable.didWrite, didWrite));
                log.info(
                    {
                        toUserId: authResult.toUserId,
                        fromUserId: authResult.fromUserId,
                    },
                    "[Wallet] Merged guest into target user and updated device",
                );
                accountMerged = true;
                break;
        }

        // Clean up challenge (inside transaction for atomicity)
        await tx
            .delete(walletAuthChallengeTable)
            .where(eq(walletAuthChallengeTable.didWrite, didWrite));
    });

    if (authResult.type === "associated_with_another_user") {
        // Clean up challenge outside transaction (the transaction above skipped DB ops for this case)
        await db
            .delete(walletAuthChallengeTable)
            .where(eq(walletAuthChallengeTable.didWrite, didWrite));
        return { success: false, reason: "associated_with_another_user" };
    }

    const userId =
        authResult.type === "merge" ? authResult.toUserId : authResult.userId;

    log.info(
        { userId, walletAddress, nationality },
        "[Wallet] Authentication completed successfully",
    );

    return { success: true, walletStatus: "verified", accountMerged, userId };
}
