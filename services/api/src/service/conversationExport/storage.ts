import { randomUUID } from "node:crypto";
import {
    and,
    eq,
    exists,
    gt,
    isNotNull,
    isNull,
    lte,
    max,
    ne,
    notExists,
    or,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import {
    conversationExportArtifactTable as artifact,
    conversationExportGenerationTable as generation,
    conversationExportObjectTable as object,
    conversationExportRequestFileTable as requestFile,
    conversationExportRequestTable as request,
    conversationTable,
    projectTable,
    polisConversationConfigTable,
    userTable,
} from "@/shared-backend/schema.js";
import { deleteFromS3, uploadToS3 } from "../s3.js";
import { log } from "@/app.js";
import { logApiError } from "@/logging/privacy.js";

interface ExportAttempt {
    id: number;
    conversationId: number;
    attempts: number;
}

// Lease/expiry decisions use PostgreSQL time so application clock skew cannot
// extend access. Drizzle predicates compose the remaining clock, interval and
// earliest-deadline expressions; those functions have no Drizzle equivalents.
// Lifecycle columns are UTC timestamp-without-time-zone, including comparisons.
const utcNow = sql`(clock_timestamp() AT TIME ZONE 'UTC')`;

export async function lockCurrentExportAttempt({
    db,
    attempt,
}: {
    db: PostgresTransaction;
    attempt: ExportAttempt;
}): Promise<boolean> {
    // Match source deletion's parent lock before reading attempt/publication state.
    const parents = await db
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .where(
            and(
                eq(conversationTable.id, attempt.conversationId),
                isNotNull(conversationTable.currentContentId),
                isNull(projectTable.deletedAt),
            ),
        )
        .for("no key update", { of: conversationTable });
    if (parents.length === 0) return false;
    const attempts = await db
        .select({ id: generation.id })
        .from(generation)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, generation.conversationId),
        )
        .innerJoin(
            polisConversationConfigTable,
            eq(
                polisConversationConfigTable.id,
                conversationTable.polisConfigId,
            ),
        )
        .where(
            and(
                eq(generation.id, attempt.id),
                eq(generation.status, "processing"),
                eq(generation.attempts, attempt.attempts),
                eq(
                    generation.sourceDataGeneration,
                    polisConversationConfigTable.analysisDataGeneration,
                ),
                gt(sql`${generation.createdAt} + interval '30 days'`, utcNow),
                exists(
                    db
                        .select({ id: request.id })
                        .from(request)
                        .innerJoin(
                            userTable,
                            and(
                                eq(userTable.id, request.userId),
                                eq(userTable.isDeleted, false),
                            ),
                        )
                        .where(
                            and(
                                eq(request.generationId, generation.id),
                                eq(request.status, "processing"),
                                isNull(request.deletedAt),
                                gt(request.expiresAt, utcNow),
                            ),
                        ),
                ),
            ),
        )
        .for("update", { of: generation });
    return attempts.length === 1;
}

/** Register an immutable attempt-specific key before dispatching any upload. */
export async function storeExportObject({
    db,
    attempt,
    artifactId,
    baseKey,
    bucketName,
    region,
    buffer,
    fileName,
    artifactFileName,
    contentType,
    recordCount,
}: {
    db: PostgresJsDatabase;
    attempt: ExportAttempt;
    artifactId: number;
    baseKey: string;
    bucketName: string;
    region: string;
    buffer: Buffer;
    fileName: string;
    artifactFileName: string;
    contentType: string;
    recordCount: number;
}): Promise<string> {
    const primary = getPrimaryDatabase(db);
    const id = randomUUID();
    const key = `${baseKey}.${id}`;
    await primary.transaction(async (tx) => {
        if (!(await lockCurrentExportAttempt({ db: tx, attempt }))) {
            throw new Error("Export generation is no longer publishable");
        }
        await tx.insert(object).values({
            id,
            artifactId,
            generationAttempt: attempt.attempts,
            bucketName,
            region,
            s3Key: key,
            // The S3 operation is bounded to one minute. A crashed uploader leaves
            // its known address recoverable after this additional safety interval.
            uploadExpiresAt: sql`${utcNow} + interval '2 minutes'`,
        });
    });
    let uploaded = false;
    try {
        await uploadToS3({
            s3Key: key,
            bucketName,
            region,
            buffer,
            fileName,
            contentType,
        });
        uploaded = true;
    } finally {
        // A stale uploader cannot attach bytes. Retain its address even when PUT
        // succeeded but publication or its acknowledgment failed.
        if (!uploaded) {
            await primary
                .update(object)
                .set({
                    uploadFinishedAt: utcNow,
                    cleanupRequestedAt: sql`coalesce(${object.cleanupRequestedAt}, ${utcNow})`,
                })
                .where(eq(object.id, id));
        }
    }
    const publishable = await primary.transaction(async (tx) => {
        if (!(await lockCurrentExportAttempt({ db: tx, attempt }))) {
            await tx
                .update(object)
                .set({
                    uploadFinishedAt: utcNow,
                    objectDeletedAt: null,
                    cleanupRequestedAt: sql`coalesce(${object.cleanupRequestedAt}, ${utcNow})`,
                })
                .where(eq(object.id, id));
            return false;
        }
        const ready = await tx
            .update(object)
            .set({ uploadFinishedAt: utcNow })
            .where(
                and(
                    eq(object.id, id),
                    isNull(object.cleanupRequestedAt),
                    isNull(object.objectDeletedAt),
                    gt(object.uploadExpiresAt, utcNow),
                ),
            )
            .returning({ id: object.id });
        if (ready.length === 0) {
            await tx
                .update(object)
                .set({
                    uploadFinishedAt: utcNow,
                    objectDeletedAt: null,
                    cleanupRequestedAt: sql`coalesce(${object.cleanupRequestedAt}, ${utcNow})`,
                })
                .where(eq(object.id, id));
            return false;
        }
        await tx
            .update(artifact)
            .set({
                s3Key: key,
                status: "completed",
                fileName: artifactFileName,
                fileSize: buffer.length,
                recordCount,
                failureReason: null,
                updatedAt: utcNow,
            })
            .where(
                and(
                    eq(artifact.id, artifactId),
                    eq(artifact.generationId, attempt.id),
                ),
            );
        return true;
    });
    if (!publishable)
        throw new Error("Export generation is no longer publishable");
    return key;
}

/** Discover failures independently of requests newly transitioned this sweep. */
export async function cleanupExportObjects({
    db,
    bucketName,
    region,
    limit = 100,
    mode,
}: {
    db: PostgresJsDatabase;
    bucketName: string;
    region: string;
    limit?: number;
    mode: "queue" | "execute";
}): Promise<{ queued: number; deleted: number; failed: number }> {
    const primary = getPrimaryDatabase(db);
    // Legacy addresses must also become durable work before references are cleared.
    const legacy = await primary
        .select({
            artifactId: artifact.id,
            generationAttempt: generation.attempts,
            s3Key: artifact.s3Key,
            updatedAt: artifact.updatedAt,
        })
        .from(artifact)
        .innerJoin(generation, eq(generation.id, artifact.generationId))
        .where(
            and(
                isNotNull(artifact.s3Key),
                notExists(
                    primary
                        .select({ id: object.id })
                        .from(object)
                        .where(
                            and(
                                eq(object.artifactId, artifact.id),
                                eq(object.s3Key, artifact.s3Key),
                            ),
                        ),
                ),
            ),
        )
        .orderBy(artifact.id)
        .limit(limit);
    const legacyObjects = legacy.flatMap((row) =>
        row.s3Key === null
            ? []
            : [
                  {
                      artifactId: row.artifactId,
                      generationAttempt: row.generationAttempt,
                      bucketName,
                      region,
                      s3Key: row.s3Key,
                      uploadExpiresAt: row.updatedAt,
                      uploadFinishedAt: row.updatedAt,
                  },
              ],
    );
    if (legacyObjects.length > 0)
        await primary
            .insert(object)
            .values(legacyObjects)
            .onConflictDoNothing();

    const activeReferences = primary
        .select({ id: request.id })
        .from(requestFile)
        .innerJoin(request, eq(request.id, requestFile.requestId))
        .innerJoin(
            userTable,
            and(
                eq(userTable.id, request.userId),
                eq(userTable.isDeleted, false),
            ),
        )
        .where(
            and(
                eq(requestFile.artifactId, artifact.id),
                isNull(request.deletedAt),
                gt(request.expiresAt, utcNow),
                or(
                    eq(request.status, "processing"),
                    eq(request.status, "completed"),
                ),
            ),
        );
    const eligibility = or(
        isNotNull(object.cleanupRequestedAt),
        notExists(activeReferences),
        lte(sql`${generation.createdAt} + interval '30 days'`, utcNow),
        isNull(conversationTable.currentContentId),
        isNotNull(projectTable.deletedAt),
        and(
            isNotNull(object.uploadFinishedAt),
            or(isNull(artifact.s3Key), ne(artifact.s3Key, object.s3Key)),
        ),
        and(
            isNull(object.uploadFinishedAt),
            lte(object.uploadExpiresAt, utcNow),
        ),
    );
    const referenceDeadline = primary
        .select({
            at: max(
                sql`least(coalesce(${request.deletedAt}, ${request.expiresAt}), ${request.expiresAt}, ${userTable.deletedAt})`,
            ).as("reference_deadline"),
        })
        .from(requestFile)
        .innerJoin(request, eq(request.id, requestFile.requestId))
        .leftJoin(userTable, eq(userTable.id, request.userId))
        .where(eq(requestFile.artifactId, artifact.id));
    const eligibleObjects = primary
        .select({
            id: object.id,
            conversationId: generation.conversationId,
            lastDeleteAttemptAt: object.lastDeleteAttemptAt,
            // Known expiry/deletion times win; only unknown legacy intent uses
            // discovery time. Retries preserve this first eligible timestamp.
            eligibleAt:
                sql<Date>`least(${utcNow}, ${generation.createdAt} + interval '30 days', ${projectTable.deletedAt}, ${conversationTable.deletedAt}, ${object.cleanupRequestedAt}, (${referenceDeadline}))`
                    .mapWith(object.uploadExpiresAt)
                    .as("eligible_at"),
        })
        .from(object)
        .innerJoin(artifact, eq(artifact.id, object.artifactId))
        .innerJoin(generation, eq(generation.id, artifact.generationId))
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, generation.conversationId),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .where(
            and(
                isNull(object.objectDeletedAt),
                // A queue-only sweep must advance past work it already registered.
                mode === "queue"
                    ? isNull(object.cleanupRequestedAt)
                    : undefined,
                eligibility,
                or(
                    isNotNull(object.uploadFinishedAt),
                    lte(object.uploadExpiresAt, utcNow),
                ),
                or(
                    isNull(object.leaseExpiresAt),
                    lte(object.leaseExpiresAt, utcNow),
                ),
            ),
        )
        .as("eligible_export_objects");
    const candidates = await primary
        .select()
        .from(eligibleObjects)
        // Give untouched work priority over repeated failures in earlier IDs.
        .orderBy(
            sql`${eligibleObjects.lastDeleteAttemptAt} ASC NULLS FIRST`,
            eligibleObjects.id,
        )
        .limit(limit);
    let deleted = 0;
    let failed = 0;
    let queued = 0;
    for (const candidate of candidates) {
        const token = randomUUID();
        const claimed = await primary.transaction(async (tx) => {
            await tx
                .select({ id: conversationTable.id })
                .from(conversationTable)
                .where(eq(conversationTable.id, candidate.conversationId))
                .for("no key update");
            return await tx
                .update(object)
                .set({
                    cleanupRequestedAt: sql`coalesce(${object.cleanupRequestedAt}, (${tx.select({ at: eligibleObjects.eligibleAt }).from(eligibleObjects).where(eq(eligibleObjects.id, candidate.id))}))`,
                    ...(mode === "execute"
                        ? {
                              leaseToken: token,
                              leaseExpiresAt: sql`${utcNow} + interval '2 minutes'`,
                              deleteAttempts: sql`${object.deleteAttempts} + 1`,
                              lastDeleteAttemptAt: utcNow,
                          }
                        : {}),
                })
                .where(
                    and(
                        eq(object.id, candidate.id),
                        exists(
                            tx
                                .select({ id: eligibleObjects.id })
                                .from(eligibleObjects)
                                .where(eq(eligibleObjects.id, candidate.id)),
                        ),
                        isNull(object.objectDeletedAt),
                        or(
                            isNull(object.leaseExpiresAt),
                            lte(object.leaseExpiresAt, utcNow),
                        ),
                    ),
                )
                .returning();
        });
        const work = claimed.at(0);
        if (work === undefined) continue;
        queued += 1;
        if (mode === "queue") continue;
        try {
            await deleteFromS3({
                s3Key: work.s3Key,
                bucketName: work.bucketName,
                region: work.region,
            });
        } catch (error: unknown) {
            logApiError({
                logger: log,
                level: "error",
                event: { event: "application_error" },
                error,
            });
            failed += 1;
            await primary
                .update(object)
                .set({ leaseToken: null, leaseExpiresAt: null })
                .where(
                    and(eq(object.id, work.id), eq(object.leaseToken, token)),
                );
            continue;
        }
        await primary.transaction(async (tx) => {
            const acknowledged = await tx
                .update(object)
                .set({
                    objectDeletedAt: utcNow,
                    leaseToken: null,
                    leaseExpiresAt: null,
                })
                .where(
                    and(
                        eq(object.id, work.id),
                        eq(object.leaseToken, token),
                        gt(object.leaseExpiresAt, utcNow),
                    ),
                )
                .returning({ id: object.id });
            if (acknowledged.length === 0) return;
            await tx
                .update(artifact)
                .set({ s3Key: null, fileSize: null })
                .where(
                    and(
                        eq(artifact.id, work.artifactId),
                        eq(artifact.s3Key, work.s3Key),
                    ),
                );
            deleted += 1;
        });
    }
    return { queued, deleted, failed };
}
