#!/usr/bin/env npx tsx

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { and, eq, exists, gt, isNull } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import { sharedConfigSchema } from "../src/shared-backend/config.js";
import { createPostgresClient } from "../src/shared-backend/db.js";
import {
    authAttemptPhoneTable,
    blockedPhoneNumberTable,
    phoneTable,
    userTable,
} from "../src/shared-backend/schema.js";
import { revokeAllSessionsWithinTransaction } from "../src/service/authSession.js";
import {
    incidentManifestSchema,
    PENDING_REVIEW_REASON,
    type IncidentManifest,
} from "./twilioIncidentManifestSchema.js";

export async function applyReviewedManifest({
    db,
    manifest,
    now,
}: {
    db: PostgresJsDatabase;
    manifest: IncidentManifest;
    now: Date;
}): Promise<void> {
    const approved = manifest.entries.filter((entry) => entry.approved);
    if (manifest.reviewedBy.trim().length === 0 || approved.length === 0) {
        throw new Error("Applying requires a reviewer and approved entries");
    }
    if (
        new Set(
            approved.map(
                (entry) => `${String(entry.pepperVersion)}:${entry.phoneHash}`,
            ),
        ).size !== approved.length ||
        approved.some((entry) => entry.reason === PENDING_REVIEW_REASON)
    ) {
        throw new Error(
            "Approved entries must be unique and individually reviewed",
        );
    }
    await db.transaction(async (tx) => {
        for (const entry of approved) {
            const identity = and(
                eq(blockedPhoneNumberTable.phoneHash, entry.phoneHash),
                eq(blockedPhoneNumberTable.pepperVersion, entry.pepperVersion),
            );
            await tx
                .insert(blockedPhoneNumberTable)
                .values({
                    phoneHash: entry.phoneHash,
                    pepperVersion: entry.pepperVersion,
                    reason: `${manifest.incidentId}: ${entry.reason} (reviewed by ${manifest.reviewedBy})`,
                    blockedAt: now,
                })
                .onConflictDoNothing();
            const stored = (
                await tx
                    .select({ revokedAt: blockedPhoneNumberTable.revokedAt })
                    .from(blockedPhoneNumberTable)
                    .where(identity)
            ).at(0);
            if (stored?.revokedAt !== null) {
                throw new Error(
                    "A reviewed block was previously revoked; re-review it separately",
                );
            }

            if (
                entry.classification === "registered_during_incident" &&
                entry.restrictAccount
            ) {
                const credentials = await tx
                    .select({ id: phoneTable.id })
                    .from(phoneTable)
                    .innerJoin(userTable, eq(userTable.id, phoneTable.userId))
                    .where(
                        and(
                            eq(phoneTable.phoneHash, entry.phoneHash),
                            eq(phoneTable.pepperVersion, entry.pepperVersion),
                            eq(phoneTable.userId, entry.associatedUserId),
                            eq(phoneTable.isDeleted, false),
                            eq(userTable.isDeleted, false),
                        ),
                    )
                    .limit(1);
                if (credentials.length === 0) {
                    throw new Error(
                        "Reviewed account no longer owns this active phone credential",
                    );
                }
                await tx
                    .update(userTable)
                    .set({
                        authRestrictedAt: now,
                        authRestrictionReason: manifest.incidentId,
                        updatedAt: now,
                    })
                    .where(
                        and(
                            eq(userTable.id, entry.associatedUserId),
                            isNull(userTable.authRestrictedAt),
                        ),
                    );
                await revokeAllSessionsWithinTransaction({
                    db: tx,
                    userId: entry.associatedUserId,
                    now,
                    reason: "revoked",
                });
            }
        }

        await tx
            .update(authAttemptPhoneTable)
            .set({ codeExpiry: now, updatedAt: now })
            .where(
                and(
                    gt(authAttemptPhoneTable.codeExpiry, now),
                    exists(
                        tx
                            .select({
                                phoneHash: blockedPhoneNumberTable.phoneHash,
                            })
                            .from(blockedPhoneNumberTable)
                            .where(
                                and(
                                    eq(
                                        blockedPhoneNumberTable.phoneHash,
                                        authAttemptPhoneTable.phoneHash,
                                    ),
                                    eq(
                                        blockedPhoneNumberTable.pepperVersion,
                                        authAttemptPhoneTable.pepperVersion,
                                    ),
                                    isNull(blockedPhoneNumberTable.revokedAt),
                                ),
                            ),
                    ),
                ),
            );
    });
}

async function main(): Promise<void> {
    const args = z
        .tuple([z.string().min(1)])
        .rest(z.string())
        .safeParse(process.argv.slice(2));
    if (!args.success) {
        throw new Error(
            "Usage: pnpm exec tsx scripts/import-blocked-phones.ts <reviewed-manifest.json> [--apply]",
        );
    }
    const [manifestPath, ...flags] = args.data;
    if (flags.length > 1 || flags.some((flag) => flag !== "--apply")) {
        throw new Error("Only --apply is supported after the manifest path");
    }
    const raw: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
    const manifest = incidentManifestSchema.parse(raw);
    const approved = manifest.entries.filter((entry) => entry.approved);
    console.info(
        `Reviewed manifest: ${String(manifest.entries.length)} candidates; ` +
            `${String(approved.length)} approved phone blocks; ${String(approved.filter((entry) => entry.restrictAccount).length)} account restrictions`,
    );
    if (flags.length === 0) {
        console.info("Preview only. No database connection or changes.");
        return;
    }

    const config = sharedConfigSchema.parse(process.env);
    const client = await createPostgresClient(config, console);
    try {
        await applyReviewedManifest({
            db: drizzle(client),
            manifest,
            now: new Date(),
        });
        console.info(
            "Applied reviewed blocks and account restrictions atomically.",
        );
    } finally {
        await client.end({ timeout: 5 });
    }
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
    await main();
}
