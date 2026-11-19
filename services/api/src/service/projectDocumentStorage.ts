import { httpErrors } from "@fastify/sensible";
import {
    and,
    asc,
    eq,
    inArray,
    isNull,
    isNotNull,
    lt,
    ne,
    notExists,
    or,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomUUID } from "node:crypto";
import pLimit from "p-limit";
import {
    projectDocumentFileTable,
    projectDocumentRepresentationTable,
    projectDocumentTable,
    projectTable,
} from "@/shared-backend/schema.js";
import { compressProjectDocument } from "./projectDocumentCompression.js";
import {
    createProjectDocumentUploadDeadline,
    STALE_PENDING_UPLOAD_AGE_MS,
    type ProjectDocumentUploadDeadline,
} from "./projectDocumentPolicy.js";
import { deleteFromS3, downloadFromS3, uploadToS3 } from "./s3.js";

export interface ProjectDocumentStorage {
    bucketName: string;
    region: string;
}

const storageLimit = pLimit(5);

async function lockActiveFile({
    db,
    fileId,
}: {
    db: PostgresJsDatabase;
    fileId: number;
}) {
    const rows = await db
        .select({
            compressedAt: projectDocumentFileTable.compressedAt,
            status: projectDocumentFileTable.status,
            objectDeletedAt: projectDocumentFileTable.objectDeletedAt,
        })
        .from(projectDocumentFileTable)
        .innerJoin(
            projectDocumentTable,
            eq(
                projectDocumentTable.id,
                projectDocumentFileTable.projectDocumentId,
            ),
        )
        .where(
            and(
                eq(projectDocumentFileTable.id, fileId),
                isNull(projectDocumentFileTable.deletedAt),
                isNull(projectDocumentTable.deletedAt),
            ),
        )
        .for("update", { of: projectDocumentFileTable });
    const file = rows.at(0);
    if (file === undefined)
        throw httpErrors.notFound("Project document file not found");
    return file;
}

/**
 * Publish gzip and Brotli together. New uploads never store an identity object;
 * legacy files keep serving identity until this transaction switches delivery.
 */
export async function publishProjectDocumentRepresentations({
    db,
    file,
    storage,
    buffer,
    deadline = createProjectDocumentUploadDeadline(),
}: {
    db: PostgresJsDatabase;
    file: Pick<
        typeof projectDocumentFileTable.$inferSelect,
        "id" | "objectKey" | "contentType"
    >;
    storage: ProjectDocumentStorage;
    buffer: Buffer;
    deadline?: ProjectDocumentUploadDeadline;
}): Promise<0 | 2> {
    // Include compression/queueing and reservation waits, not only the PUTs.
    deadline.check();
    const compressed = await compressProjectDocument({
        buffer,
        contentType: file.contentType,
        abortSignal: deadline.abortSignal,
    });
    if (compressed.length === 0) return 0;
    deadline.check();
    const reserved = await db.transaction(async (tx) => {
        const active = await lockActiveFile({ db: tx, fileId: file.id });
        deadline.check();
        if (active.compressedAt !== null) return [];
        const existing = await tx
            .select({ id: projectDocumentRepresentationTable.id })
            .from(projectDocumentRepresentationTable)
            .where(
                and(
                    eq(projectDocumentRepresentationTable.fileId, file.id),
                    isNull(projectDocumentRepresentationTable.deletedAt),
                ),
            )
            .limit(1);
        // A concurrent publisher owns the pending set, or this file is prepared.
        if (existing.length > 0) return [];
        const representationsByEncoding = {
            br: compressed[0],
            gzip: compressed[1],
        };
        const prefix = `${file.objectKey}/representations/${randomUUID()}`;
        const rows = await tx
            .insert(projectDocumentRepresentationTable)
            .values(
                compressed.map((representation) => ({
                    fileId: file.id,
                    encoding: representation.encoding,
                    objectKey: `${prefix}/${representation.encoding}`,
                    byteSize: representation.buffer.length,
                    checksumSha256: representation.checksumSha256,
                })),
            )
            .returning({
                id: projectDocumentRepresentationTable.id,
                objectKey: projectDocumentRepresentationTable.objectKey,
                encoding: projectDocumentRepresentationTable.encoding,
            });
        return rows.map((row) => ({
            ...representationsByEncoding[row.encoding],
            ...row,
        }));
    });
    if (reserved.length === 0) return 0;
    const ids = reserved.map(({ id }) => id);
    try {
        for (const representation of reserved) {
            deadline.check();
            await uploadToS3({
                s3Key: representation.objectKey,
                bucketName: storage.bucketName,
                region: storage.region,
                contentType: file.contentType,
                contentEncoding: representation.encoding,
                buffer: representation.buffer,
                checksumSha256: representation.checksumSha256,
                abortSignal: deadline.abortSignal,
            });
        }
        await db.transaction(async (tx) => {
            const active = await lockActiveFile({ db: tx, fileId: file.id });
            deadline.check();
            const published = await tx
                .update(projectDocumentRepresentationTable)
                .set({ status: "available" })
                .where(
                    and(
                        inArray(projectDocumentRepresentationTable.id, ids),
                        eq(
                            projectDocumentRepresentationTable.status,
                            "pending",
                        ),
                        isNull(projectDocumentRepresentationTable.deletedAt),
                        isNull(
                            projectDocumentRepresentationTable.objectDeletedAt,
                        ),
                    ),
                )
                .returning({ id: projectDocumentRepresentationTable.id });
            if (published.length !== reserved.length)
                throw httpErrors.conflict(
                    "Document representation publication was cancelled",
                );
            const now = new Date();
            await tx
                .update(projectDocumentFileTable)
                .set({
                    compressedAt: sql`clock_timestamp() AT TIME ZONE 'UTC'`,
                    // Pending files are new uploads: no identity object was created.
                    objectDeletedAt:
                        active.status === "pending"
                            ? now
                            : active.objectDeletedAt,
                })
                .where(eq(projectDocumentFileTable.id, file.id));
        });
        return compressed.length;
    } catch (error) {
        const committed = await db.transaction(async (tx) => {
            const files = await tx
                .select({
                    compressedAt: projectDocumentFileTable.compressedAt,
                    deletedAt: projectDocumentFileTable.deletedAt,
                })
                .from(projectDocumentFileTable)
                .where(eq(projectDocumentFileTable.id, file.id))
                .for("update");
            const current = files.at(0);
            if (current?.deletedAt === null && current.compressedAt !== null) {
                const available = await tx
                    .select({ id: projectDocumentRepresentationTable.id })
                    .from(projectDocumentRepresentationTable)
                    .where(
                        and(
                            inArray(projectDocumentRepresentationTable.id, ids),
                            eq(
                                projectDocumentRepresentationTable.status,
                                "available",
                            ),
                            isNull(
                                projectDocumentRepresentationTable.deletedAt,
                            ),
                            isNull(
                                projectDocumentRepresentationTable.objectDeletedAt,
                            ),
                        ),
                    );
                // A COMMIT can succeed even if its acknowledgement is lost.
                // Never invalidate the only live copies after a successful cutover.
                if (available.length === reserved.length) return true;
            }
            await tx
                .update(projectDocumentRepresentationTable)
                .set({ status: "failed", deletedAt: new Date() })
                .where(
                    and(
                        inArray(projectDocumentRepresentationTable.id, ids),
                        isNull(
                            projectDocumentRepresentationTable.objectDeletedAt,
                        ),
                    ),
                );
            return false;
        });
        if (committed) return compressed.length;
        throw error;
    }
}

export async function cleanupProjectDocumentRepresentations({
    db,
    storage,
    projectSlug,
    documentId,
}: {
    db: PostgresJsDatabase;
    storage: ProjectDocumentStorage;
    projectSlug: string | undefined;
    documentId: string | undefined;
}): Promise<void> {
    // Use the database clock for DB-created reservations. statement_timestamp()
    // is stable within the query, so the cutoff remains usable by an index scan.
    const cutoff = sql`(statement_timestamp() AT TIME ZONE 'UTC') - ${STALE_PENDING_UPLOAD_AGE_MS} * interval '1 millisecond'`;
    // Claim/tombstone on the writer before deleting S3 objects. A replica read
    // could miss a recent deletion or mistake a completed upload for abandoned.
    const rows = await db.transaction(async (tx) => {
        const candidates = await tx
            .select({
                id: projectDocumentRepresentationTable.id,
                objectKey: projectDocumentRepresentationTable.objectKey,
            })
            .from(projectDocumentRepresentationTable)
            .innerJoin(
                projectDocumentFileTable,
                eq(
                    projectDocumentFileTable.id,
                    projectDocumentRepresentationTable.fileId,
                ),
            )
            .innerJoin(
                projectDocumentTable,
                eq(
                    projectDocumentTable.id,
                    projectDocumentFileTable.projectDocumentId,
                ),
            )
            .innerJoin(
                projectTable,
                eq(projectTable.id, projectDocumentTable.projectId),
            )
            .where(
                and(
                    isNull(projectDocumentRepresentationTable.objectDeletedAt),
                    or(
                        isNotNull(projectDocumentFileTable.deletedAt),
                        isNotNull(projectDocumentRepresentationTable.deletedAt),
                        and(
                            eq(
                                projectDocumentRepresentationTable.status,
                                "pending",
                            ),
                            lt(
                                projectDocumentRepresentationTable.createdAt,
                                cutoff,
                            ),
                        ),
                    ),
                    // Do not race an active upload, even if its parent was deleted.
                    or(
                        ne(
                            projectDocumentRepresentationTable.status,
                            "pending",
                        ),
                        lt(
                            projectDocumentRepresentationTable.createdAt,
                            cutoff,
                        ),
                    ),
                    projectSlug === undefined
                        ? undefined
                        : eq(projectTable.slug, projectSlug),
                    documentId === undefined
                        ? undefined
                        : eq(projectDocumentTable.publicId, documentId),
                ),
            )
            .orderBy(asc(projectDocumentRepresentationTable.id))
            .limit(100)
            .for("update", {
                of: projectDocumentRepresentationTable,
                skipLocked: true,
            });
        if (candidates.length === 0) return [];
        return await tx
            .update(projectDocumentRepresentationTable)
            .set({ deletedAt: new Date() })
            .where(
                inArray(
                    projectDocumentRepresentationTable.id,
                    candidates.map(({ id }) => id),
                ),
            )
            .returning({
                id: projectDocumentRepresentationTable.id,
                objectKey: projectDocumentRepresentationTable.objectKey,
            });
    });
    const results = await Promise.allSettled(
        rows.map((row) =>
            storageLimit(async () => {
                await deleteFromS3({
                    s3Key: row.objectKey,
                    bucketName: storage.bucketName,
                    region: storage.region,
                });
                const now = new Date();
                await db
                    .update(projectDocumentRepresentationTable)
                    .set({ objectDeletedAt: now })
                    .where(eq(projectDocumentRepresentationTable.id, row.id));
            }),
        ),
    );
    // Finish every deletion before returning/closing the backfill's DB client.
    for (const result of results) {
        if (result.status === "rejected") throw result.reason;
    }
}

export async function backfillProjectDocumentRepresentations({
    db,
    storage,
    projectSlug,
    documentId,
    apply,
    limit,
}: {
    db: PostgresJsDatabase;
    storage: ProjectDocumentStorage;
    projectSlug: string;
    documentId: string | undefined;
    apply: boolean;
    limit: number;
}): Promise<{ selected: number; prepared: number }> {
    const files = await db
        .select({
            id: projectDocumentFileTable.id,
            objectKey: projectDocumentFileTable.objectKey,
            contentType: projectDocumentFileTable.contentType,
            byteSize: projectDocumentFileTable.byteSize,
        })
        .from(projectDocumentFileTable)
        .innerJoin(
            projectDocumentTable,
            eq(
                projectDocumentTable.id,
                projectDocumentFileTable.projectDocumentId,
            ),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, projectDocumentTable.projectId),
        )
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                eq(projectTable.directoryVisibility, "listed"),
                isNotNull(projectTable.currentContentId),
                isNull(projectTable.deletedAt),
                isNotNull(projectDocumentTable.publishedAt),
                isNull(projectDocumentTable.deletedAt),
                isNull(projectDocumentFileTable.deletedAt),
                eq(projectDocumentFileTable.status, "available"),
                isNull(projectDocumentFileTable.compressedAt),
                ne(projectDocumentFileTable.contentType, "application/pdf"),
                documentId === undefined
                    ? undefined
                    : eq(projectDocumentTable.publicId, documentId),
                notExists(
                    db
                        .select({ id: projectDocumentRepresentationTable.id })
                        .from(projectDocumentRepresentationTable)
                        .where(
                            and(
                                eq(
                                    projectDocumentRepresentationTable.fileId,
                                    projectDocumentFileTable.id,
                                ),
                                isNull(
                                    projectDocumentRepresentationTable.deletedAt,
                                ),
                            ),
                        ),
                ),
            ),
        )
        .orderBy(asc(projectDocumentFileTable.id))
        .limit(limit);
    if (!apply) return { selected: files.length, prepared: 0 };
    let prepared = 0;
    // One file at a time bounds S3 download memory as well as compression work.
    for (const file of files) {
        const buffer = await downloadFromS3({
            s3Key: file.objectKey,
            bucketName: storage.bucketName,
            region: storage.region,
        });
        if (buffer.length !== file.byteSize) {
            throw new Error(
                "Stored project document size does not match its metadata",
            );
        }
        // Preserve the old CSP and execution policy; do not normalize it again.
        const published = await publishProjectDocumentRepresentations({
            db,
            file,
            storage,
            buffer,
        });
        if (published > 0) prepared += 1;
    }
    return { selected: files.length, prepared };
}
