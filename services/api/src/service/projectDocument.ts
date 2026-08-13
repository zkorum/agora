import { httpErrors } from "@fastify/sensible";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import pLimit from "p-limit";
import { config, log } from "@/app.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationContentTable,
    conversationTable,
    maxdiffComparisonTable,
    maxdiffResultTable,
    opinionModerationTable,
    opinionTable,
    projectDocumentFileTable,
    projectDocumentLocalizationTable,
    projectDocumentTable,
    projectTable,
    userTable,
    voteTable,
} from "@/shared-backend/schema.js";
import {
    getDisplayLanguageFallbackChain,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";
import { isInlineProjectDocumentContentType } from "@/shared/projectDocument.js";
import type {
    AccessProjectDocumentRequest,
    AccessProjectDocumentResponse,
    AdminProjectDocument,
    ListProjectDocumentsResponse,
    ProjectDocumentConversationOption,
    ProjectDocumentUploadMetadata,
    ProjectPageDocument,
    UploadProjectDocumentResponse,
} from "@/shared/types/dto.js";
import { hasProjectCapability } from "./projectAccess.js";
import {
    buildProjectDocumentContentDisposition,
    normalizeProjectDocumentLocalizations,
    normalizeProjectDocumentUploadFile,
    type ProjectDocumentFileUpload,
} from "./projectDocumentFile.js";
import { deleteFromS3, generatePresignedUrl, uploadToS3 } from "./s3.js";
export type { ProjectDocumentFileUpload } from "./projectDocumentFile.js";

interface StorageConfig {
    bucketName: string;
    region: string;
}

const STALE_PENDING_UPLOAD_AGE_MS = 60 * 60 * 1000;

function getStorageConfig(): StorageConfig {
    const bucketName = config.PROJECT_DOCUMENTS_AWS_S3_BUCKET_NAME;
    const region = config.PROJECT_DOCUMENTS_AWS_S3_REGION;
    if (bucketName === undefined || region === undefined) {
        throw httpErrors.serviceUnavailable(
            "Project document storage is not configured",
        );
    }
    return { bucketName, region };
}

async function fetchActiveProjectId({
    db,
    projectSlug,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
}): Promise<number> {
    const projects = await db
        .select({ projectId: projectTable.id })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                eq(projectTable.directoryVisibility, "listed"),
                isNull(projectTable.deletedAt),
            ),
        )
        .limit(1);
    const project = projects.at(0);
    if (project === undefined) {
        throw httpErrors.notFound("Project not found");
    }
    return project.projectId;
}

async function fetchConversationOptions({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<ProjectDocumentConversationOption[]> {
    return await db
        .select({
            conversationSlugId: conversationTable.slugId,
            conversationTitle: conversationContentTable.title,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(
            and(
                eq(conversationTable.projectId, projectId),
                eq(conversationTable.isImporting, false),
            ),
        )
        .orderBy(desc(conversationTable.createdAt));
}

async function fetchAdminDocuments({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<AdminProjectDocument[]> {
    const documentRows = await db
        .select({
            id: projectDocumentTable.id,
            documentId: projectDocumentTable.publicId,
            conversationSlugId: conversationTable.slugId,
            conversationTitle: conversationContentTable.title,
            defaultLanguageCode: projectDocumentTable.defaultLanguageCode,
            createdByUsername: projectDocumentTable.createdByUsername,
            createdAt: projectDocumentTable.createdAt,
            publishedAt: projectDocumentTable.publishedAt,
        })
        .from(projectDocumentTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, projectDocumentTable.conversationId),
        )
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(
            and(
                eq(conversationTable.projectId, projectId),
                isNull(projectDocumentTable.deletedAt),
                isNotNull(projectDocumentTable.publishedAt),
                eq(conversationTable.isImporting, false),
            ),
        )
        .orderBy(
            desc(projectDocumentTable.createdAt),
            desc(projectDocumentTable.id),
        );
    const documentIds = documentRows.map((document) => document.id);
    if (documentIds.length === 0) {
        return [];
    }
    const [localizationRows, fileRows] = await Promise.all([
        db
            .select({
                projectDocumentId:
                    projectDocumentLocalizationTable.projectDocumentId,
                languageCode: projectDocumentLocalizationTable.languageCode,
                name: projectDocumentLocalizationTable.name,
                downloadFileName:
                    projectDocumentLocalizationTable.downloadFileName,
            })
            .from(projectDocumentLocalizationTable)
            .where(
                and(
                    inArray(
                        projectDocumentLocalizationTable.projectDocumentId,
                        documentIds,
                    ),
                    isNull(projectDocumentLocalizationTable.deletedAt),
                ),
            ),
        db
            .select({
                projectDocumentId: projectDocumentFileTable.projectDocumentId,
                audience: projectDocumentFileTable.audience,
                originalFileName: projectDocumentFileTable.originalFileName,
                contentType: projectDocumentFileTable.contentType,
                byteSize: projectDocumentFileTable.byteSize,
            })
            .from(projectDocumentFileTable)
            .where(
                and(
                    inArray(
                        projectDocumentFileTable.projectDocumentId,
                        documentIds,
                    ),
                    eq(projectDocumentFileTable.status, "available"),
                    isNull(projectDocumentFileTable.deletedAt),
                ),
            ),
    ]);
    const localizationsByDocumentId = new Map<
        number,
        AdminProjectDocument["localizations"]
    >();
    for (const localization of localizationRows) {
        const localizations =
            localizationsByDocumentId.get(localization.projectDocumentId) ?? [];
        localizations.push({
            languageCode: localization.languageCode,
            name: localization.name,
            downloadFileName: localization.downloadFileName,
        });
        localizationsByDocumentId.set(
            localization.projectDocumentId,
            localizations,
        );
    }
    const filesByDocumentId = new Map<
        number,
        Partial<Pick<AdminProjectDocument, "participantFile" | "ownerFile">>
    >();
    for (const file of fileRows) {
        const files = filesByDocumentId.get(file.projectDocumentId) ?? {};
        const metadata = {
            originalFileName: file.originalFileName,
            contentType: file.contentType,
            byteSize: file.byteSize,
        };
        if (file.audience === "participant") {
            files.participantFile = metadata;
        } else {
            files.ownerFile = metadata;
        }
        filesByDocumentId.set(file.projectDocumentId, files);
    }
    return documentRows.flatMap((document) => {
        const localizations = localizationsByDocumentId.get(document.id) ?? [];
        const files = filesByDocumentId.get(document.id);
        if (
            document.publishedAt === null ||
            localizations.length === 0 ||
            files?.participantFile === undefined
        ) {
            return [];
        }
        return [
            {
                documentId: document.documentId,
                conversationSlugId: document.conversationSlugId,
                conversationTitle: document.conversationTitle,
                defaultLanguageCode: document.defaultLanguageCode,
                localizations,
                participantFile: files.participantFile,
                ownerFile: files.ownerFile,
                createdByUsername: document.createdByUsername,
                createdAt: document.createdAt,
                publishedAt: document.publishedAt,
            },
        ];
    });
}

export async function uploadProjectDocument({
    db,
    metadata,
    createdByUserId,
    participantFile: rawParticipantFile,
    ownerFile: rawOwnerFile,
}: {
    db: PostgresJsDatabase;
    metadata: ProjectDocumentUploadMetadata;
    createdByUserId: string;
    participantFile: ProjectDocumentFileUpload;
    ownerFile: ProjectDocumentFileUpload | undefined;
}): Promise<UploadProjectDocumentResponse> {
    const primaryDb = getPrimaryDatabase(db);
    const { bucketName, region } = getStorageConfig();
    const projectId = await fetchActiveProjectId({
        db: primaryDb,
        projectSlug: metadata.projectSlug,
    });
    const [conversations, uploaders] = await Promise.all([
        primaryDb
            .select({
                conversationId: conversationTable.id,
                conversationTitle: conversationContentTable.title,
            })
            .from(conversationTable)
            .innerJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .where(
                and(
                    eq(conversationTable.projectId, projectId),
                    eq(conversationTable.slugId, metadata.conversationSlugId),
                    eq(conversationTable.isImporting, false),
                ),
            )
            .limit(1),
        primaryDb
            .select({ username: userTable.username })
            .from(userTable)
            .where(eq(userTable.id, createdByUserId))
            .limit(1),
    ]);
    const conversation = conversations.at(0);
    if (conversation === undefined) {
        throw httpErrors.badRequest(
            "The selected consultation does not belong to this project",
        );
    }
    const uploader = uploaders.at(0);
    if (uploader === undefined) {
        throw httpErrors.unauthorized("Document uploader not found");
    }
    const participantFile =
        normalizeProjectDocumentUploadFile(rawParticipantFile);
    const ownerFile =
        rawOwnerFile === undefined
            ? undefined
            : normalizeProjectDocumentUploadFile(rawOwnerFile);
    const localizations = normalizeProjectDocumentLocalizations({
        localizations: metadata.localizations,
        participantFile,
        ownerFile,
    });
    const documentId = randomUUID();
    const objectUploads = [
        {
            audience: "participant" as const,
            objectKey: `projects/${String(projectId)}/documents/${documentId}/participant`,
            file: participantFile,
        },
        ...(ownerFile === undefined
            ? []
            : [
                  {
                      audience: "owner" as const,
                      objectKey: `projects/${String(projectId)}/documents/${documentId}/owner`,
                      file: ownerFile,
                  },
              ]),
    ];
    const persistedDocument = await primaryDb.transaction(async (tx) => {
        const insertedDocuments = await tx
            .insert(projectDocumentTable)
            .values({
                publicId: documentId,
                conversationId: conversation.conversationId,
                createdByUsername: uploader.username,
                defaultLanguageCode: metadata.defaultLanguageCode,
            })
            .returning({
                id: projectDocumentTable.id,
                createdAt: projectDocumentTable.createdAt,
            });
        const insertedDocument = insertedDocuments.at(0);
        if (insertedDocument === undefined) {
            throw httpErrors.internalServerError(
                "Failed to persist project document",
            );
        }
        await tx.insert(projectDocumentLocalizationTable).values(
            localizations.map((localization) => ({
                projectDocumentId: insertedDocument.id,
                languageCode: localization.languageCode,
                name: localization.name,
                downloadFileName: localization.downloadFileName,
            })),
        );
        await tx.insert(projectDocumentFileTable).values(
            objectUploads.map((upload) => ({
                projectDocumentId: insertedDocument.id,
                audience: upload.audience,
                objectKey: upload.objectKey,
                originalFileName: upload.file.originalFileName,
                contentType: upload.file.contentType,
                byteSize: upload.file.buffer.length,
            })),
        );
        return insertedDocument;
    });
    const publishedAt = new Date();
    try {
        for (const upload of objectUploads) {
            await uploadToS3({
                s3Key: upload.objectKey,
                buffer: upload.file.buffer,
                bucketName,
                contentType: upload.file.contentType,
                checksumSha256: upload.file.checksumSha256,
                region,
            });
        }
        const wasPublished = await primaryDb.transaction(async (tx) => {
            const activeConversations = await tx
                .select({ id: conversationTable.id })
                .from(conversationTable)
                .innerJoin(
                    projectTable,
                    eq(projectTable.id, conversationTable.projectId),
                )
                .where(
                    and(
                        eq(conversationTable.id, conversation.conversationId),
                        eq(conversationTable.projectId, projectId),
                        eq(conversationTable.isImporting, false),
                        isNotNull(conversationTable.currentContentId),
                        eq(projectTable.directoryVisibility, "listed"),
                        isNull(projectTable.deletedAt),
                    ),
                )
                .limit(1)
                .for("update");
            if (activeConversations.length === 0) {
                return false;
            }
            const publishedDocuments = await tx
                .update(projectDocumentTable)
                .set({ publishedAt })
                .where(
                    and(
                        eq(projectDocumentTable.id, persistedDocument.id),
                        isNull(projectDocumentTable.deletedAt),
                        isNull(projectDocumentTable.publishedAt),
                    ),
                )
                .returning({ id: projectDocumentTable.id });
            if (publishedDocuments.length === 0) {
                return false;
            }
            const publishedFiles = await tx
                .update(projectDocumentFileTable)
                .set({ status: "available" })
                .where(
                    and(
                        eq(
                            projectDocumentFileTable.projectDocumentId,
                            persistedDocument.id,
                        ),
                        eq(projectDocumentFileTable.status, "pending"),
                        isNull(projectDocumentFileTable.deletedAt),
                    ),
                )
                .returning({ id: projectDocumentFileTable.id });
            if (publishedFiles.length !== objectUploads.length) {
                throw httpErrors.conflict(
                    "Project document files changed during publication",
                );
            }
            return true;
        });
        if (!wasPublished) {
            throw httpErrors.conflict("Project document upload was cancelled");
        }
    } catch (error: unknown) {
        const deletedAt = new Date();
        await primaryDb.transaction(async (tx) => {
            await tx
                .update(projectDocumentTable)
                .set({ deletedAt })
                .where(eq(projectDocumentTable.id, persistedDocument.id));
            await tx
                .update(projectDocumentFileTable)
                .set({ deletedAt, objectDeletedAt: null })
                .where(
                    eq(
                        projectDocumentFileTable.projectDocumentId,
                        persistedDocument.id,
                    ),
                );
        });
        try {
            await cleanupProjectDocumentStorage({
                db: primaryDb,
                documentId,
                includeRecentPending: true,
            });
        } catch (cleanupError: unknown) {
            log.error(
                cleanupError,
                "[ProjectDocument] Failed upload cleanup will be retried",
            );
        }
        throw error;
    }
    return {
        document: {
            documentId,
            conversationSlugId: metadata.conversationSlugId,
            conversationTitle: conversation.conversationTitle,
            defaultLanguageCode: metadata.defaultLanguageCode,
            localizations,
            participantFile: {
                originalFileName: participantFile.originalFileName,
                contentType: participantFile.contentType,
                byteSize: participantFile.buffer.length,
            },
            ownerFile:
                ownerFile === undefined
                    ? undefined
                    : {
                          originalFileName: ownerFile.originalFileName,
                          contentType: ownerFile.contentType,
                          byteSize: ownerFile.buffer.length,
                      },
            createdByUsername: uploader.username,
            createdAt: persistedDocument.createdAt,
            publishedAt,
        },
    };
}

export async function listProjectDocuments({
    db,
    projectSlug,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
}): Promise<ListProjectDocumentsResponse> {
    const primaryDb = getPrimaryDatabase(db);
    const projectId = await fetchActiveProjectId({
        db: primaryDb,
        projectSlug,
    });
    const [documents, conversationOptions] = await Promise.all([
        fetchAdminDocuments({ db: primaryDb, projectId }),
        fetchConversationOptions({ db: primaryDb, projectId }),
    ]);
    return { documents, conversationOptions };
}

export async function deleteProjectDocument({
    db,
    projectSlug,
    documentId,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
    documentId: string;
}): Promise<void> {
    const primaryDb = getPrimaryDatabase(db);
    const documentRows = await primaryDb
        .select({ id: projectDocumentTable.id })
        .from(projectDocumentTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, projectDocumentTable.conversationId),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                eq(projectDocumentTable.publicId, documentId),
                isNull(projectDocumentTable.deletedAt),
            ),
        )
        .limit(1);
    const document = documentRows.at(0);
    if (document === undefined) {
        throw httpErrors.notFound("Project document not found");
    }
    const now = new Date();
    await primaryDb.transaction(async (tx) => {
        await tx
            .update(projectDocumentTable)
            .set({ deletedAt: now })
            .where(eq(projectDocumentTable.id, document.id));
        await tx
            .update(projectDocumentFileTable)
            .set({ deletedAt: now })
            .where(
                and(
                    eq(projectDocumentFileTable.projectDocumentId, document.id),
                    isNull(projectDocumentFileTable.deletedAt),
                ),
            );
    });
    try {
        await cleanupProjectDocumentStorage({
            db: primaryDb,
            documentId,
            includeRecentPending: true,
        });
    } catch (error: unknown) {
        log.error(error, "[ProjectDocument] Immediate storage cleanup failed");
    }
}

export async function cleanupProjectDocumentStorage({
    db,
    projectSlug,
    conversationSlugId,
    documentId,
    includeRecentPending = false,
}: {
    db: PostgresJsDatabase;
    projectSlug?: string;
    conversationSlugId?: string;
    documentId?: string;
    includeRecentPending?: boolean;
}): Promise<void> {
    let storage: StorageConfig;
    try {
        storage = getStorageConfig();
    } catch (error: unknown) {
        log.error(error, "[ProjectDocument] Storage cleanup is unavailable");
        return;
    }
    const primaryDb = getPrimaryDatabase(db);
    const stalePendingUploadCutoff = new Date(
        Date.now() - STALE_PENDING_UPLOAD_AGE_MS,
    );
    const staleDocumentRows = await primaryDb
        .select({
            documentId: projectDocumentTable.id,
        })
        .from(projectDocumentTable)
        .innerJoin(
            projectDocumentFileTable,
            eq(
                projectDocumentFileTable.projectDocumentId,
                projectDocumentTable.id,
            ),
        )
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, projectDocumentTable.conversationId),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .where(
            and(
                isNull(projectDocumentTable.deletedAt),
                isNull(projectDocumentTable.publishedAt),
                eq(projectDocumentFileTable.status, "pending"),
                lt(
                    projectDocumentFileTable.createdAt,
                    stalePendingUploadCutoff,
                ),
                projectSlug === undefined
                    ? undefined
                    : eq(projectTable.slug, projectSlug),
                conversationSlugId === undefined
                    ? undefined
                    : eq(conversationTable.slugId, conversationSlugId),
                documentId === undefined
                    ? undefined
                    : eq(projectDocumentTable.publicId, documentId),
            ),
        )
        .limit(100);
    const staleDocumentIds = [
        ...new Set(staleDocumentRows.map((row) => row.documentId)),
    ];
    const inactiveDocumentRows = await primaryDb
        .select({ documentId: projectDocumentTable.id })
        .from(projectDocumentTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, projectDocumentTable.conversationId),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .where(
            and(
                isNull(projectDocumentTable.deletedAt),
                or(
                    isNotNull(projectTable.deletedAt),
                    isNull(conversationTable.currentContentId),
                ),
                projectSlug === undefined
                    ? undefined
                    : eq(projectTable.slug, projectSlug),
                conversationSlugId === undefined
                    ? undefined
                    : eq(conversationTable.slugId, conversationSlugId),
                documentId === undefined
                    ? undefined
                    : eq(projectDocumentTable.publicId, documentId),
            ),
        )
        .limit(100);
    const inactiveDocumentIds = inactiveDocumentRows.map(
        (row) => row.documentId,
    );
    const deletedDocumentIds = [
        ...new Set([...staleDocumentIds, ...inactiveDocumentIds]),
    ];
    if (deletedDocumentIds.length > 0) {
        const deletedAt = new Date();
        await primaryDb.transaction(async (tx) => {
            const tombstonedDocumentIds: number[] = [];
            if (staleDocumentIds.length > 0) {
                const rows = await tx
                    .update(projectDocumentTable)
                    .set({ deletedAt })
                    .where(
                        and(
                            inArray(projectDocumentTable.id, staleDocumentIds),
                            isNull(projectDocumentTable.deletedAt),
                            isNull(projectDocumentTable.publishedAt),
                        ),
                    )
                    .returning({ id: projectDocumentTable.id });
                tombstonedDocumentIds.push(...rows.map((row) => row.id));
            }
            if (inactiveDocumentIds.length > 0) {
                const rows = await tx
                    .update(projectDocumentTable)
                    .set({ deletedAt })
                    .where(
                        and(
                            inArray(
                                projectDocumentTable.id,
                                inactiveDocumentIds,
                            ),
                            isNull(projectDocumentTable.deletedAt),
                        ),
                    )
                    .returning({ id: projectDocumentTable.id });
                tombstonedDocumentIds.push(...rows.map((row) => row.id));
            }
            if (tombstonedDocumentIds.length > 0) {
                await tx
                    .update(projectDocumentFileTable)
                    .set({ deletedAt })
                    .where(
                        and(
                            inArray(
                                projectDocumentFileTable.projectDocumentId,
                                tombstonedDocumentIds,
                            ),
                            isNull(projectDocumentFileTable.deletedAt),
                        ),
                    );
            }
        });
    }
    const fileRows = await primaryDb
        .select({
            fileId: projectDocumentFileTable.id,
            objectKey: projectDocumentFileTable.objectKey,
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
            conversationTable,
            eq(conversationTable.id, projectDocumentTable.conversationId),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .where(
            and(
                isNotNull(projectDocumentFileTable.deletedAt),
                isNull(projectDocumentFileTable.objectDeletedAt),
                includeRecentPending
                    ? undefined
                    : or(
                          eq(projectDocumentFileTable.status, "available"),
                          lt(
                              projectDocumentFileTable.createdAt,
                              stalePendingUploadCutoff,
                          ),
                      ),
                projectSlug === undefined
                    ? undefined
                    : eq(projectTable.slug, projectSlug),
                conversationSlugId === undefined
                    ? undefined
                    : eq(conversationTable.slugId, conversationSlugId),
                documentId === undefined
                    ? undefined
                    : eq(projectDocumentTable.publicId, documentId),
            ),
        )
        .limit(100);
    const limit = pLimit(5);
    await Promise.all(
        fileRows.map((file) =>
            limit(async () => {
                try {
                    await deleteFromS3({
                        s3Key: file.objectKey,
                        bucketName: storage.bucketName,
                        region: storage.region,
                    });
                    const now = new Date();
                    await primaryDb
                        .update(projectDocumentFileTable)
                        .set({ deletedAt: now, objectDeletedAt: now })
                        .where(eq(projectDocumentFileTable.id, file.fileId));
                } catch (error: unknown) {
                    log.error(
                        error,
                        `[ProjectDocument] Failed to delete ${file.objectKey}; cleanup will retry`,
                    );
                }
            }),
        ),
    );
}

export async function fetchProjectPageDocuments({
    db,
    projectId,
    displayLanguageCode,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    displayLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<ProjectPageDocument[]> {
    const rows = await db
        .select({
            documentId: projectDocumentTable.id,
            publicId: projectDocumentTable.publicId,
            defaultLanguageCode: projectDocumentTable.defaultLanguageCode,
            contentType: projectDocumentFileTable.contentType,
            languageCode: projectDocumentLocalizationTable.languageCode,
            name: projectDocumentLocalizationTable.name,
        })
        .from(projectDocumentTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, projectDocumentTable.conversationId),
        )
        .innerJoin(
            projectDocumentFileTable,
            and(
                eq(
                    projectDocumentFileTable.projectDocumentId,
                    projectDocumentTable.id,
                ),
                eq(projectDocumentFileTable.audience, "participant"),
                eq(projectDocumentFileTable.status, "available"),
                isNull(projectDocumentFileTable.deletedAt),
            ),
        )
        .innerJoin(
            projectDocumentLocalizationTable,
            and(
                eq(
                    projectDocumentLocalizationTable.projectDocumentId,
                    projectDocumentTable.id,
                ),
                isNull(projectDocumentLocalizationTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(conversationTable.projectId, projectId),
                isNull(projectDocumentTable.deletedAt),
                isNotNull(projectDocumentTable.publishedAt),
                isNotNull(conversationTable.currentContentId),
                eq(conversationTable.isImporting, false),
            ),
        )
        .orderBy(
            desc(projectDocumentTable.createdAt),
            desc(projectDocumentTable.id),
        );
    const documentsById = new Map<
        number,
        {
            documentId: string;
            defaultLanguageCode: SupportedDisplayLanguageCodes;
            contentType: (typeof projectDocumentFileTable.$inferSelect)["contentType"];
            localizations: {
                languageCode: SupportedDisplayLanguageCodes;
                name: string;
            }[];
        }
    >();
    for (const row of rows) {
        const document = documentsById.get(row.documentId) ?? {
            documentId: row.publicId,
            defaultLanguageCode: row.defaultLanguageCode,
            contentType: row.contentType,
            localizations: [],
        };
        document.localizations.push({
            languageCode: row.languageCode,
            name: row.name,
        });
        documentsById.set(row.documentId, document);
    }
    const fallbackLanguageCodes = getDisplayLanguageFallbackChain({
        languageCode: displayLanguageCode,
    });
    return [...documentsById.values()].flatMap((document) => {
        const localizationsByLanguageCode = new Map(
            document.localizations.map((localization) => [
                localization.languageCode,
                localization,
            ]),
        );
        const localization =
            fallbackLanguageCodes
                .map((languageCode) =>
                    localizationsByLanguageCode.get(languageCode),
                )
                .find((candidate) => candidate !== undefined) ??
            localizationsByLanguageCode.get(document.defaultLanguageCode) ??
            document.localizations.at(0);
        return localization === undefined
            ? []
            : [
                  {
                      documentId: document.documentId,
                      languageCode: localization.languageCode,
                      name: localization.name,
                      contentType: document.contentType,
                  },
              ];
    });
}

async function hasParticipatedInConversation({
    db,
    conversationId,
    conversationType,
    userId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    conversationType: "polis" | "ranking";
    userId: string;
}): Promise<boolean> {
    if (conversationType === "ranking") {
        const rows = await db
            .select({ id: maxdiffComparisonTable.id })
            .from(maxdiffResultTable)
            .innerJoin(
                maxdiffComparisonTable,
                eq(
                    maxdiffComparisonTable.maxdiffResultId,
                    maxdiffResultTable.id,
                ),
            )
            .where(
                and(
                    eq(maxdiffResultTable.conversationId, conversationId),
                    eq(maxdiffResultTable.participantId, userId),
                    isNull(maxdiffComparisonTable.deletedAt),
                ),
            )
            .limit(1);
        return rows.length > 0;
    }
    const rows = await db
        .select({ id: voteTable.id })
        .from(voteTable)
        .innerJoin(opinionTable, eq(opinionTable.id, voteTable.opinionId))
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                eq(voteTable.authorId, userId),
                isNotNull(voteTable.currentContentId),
                isNotNull(opinionTable.currentContentId),
                isNull(opinionModerationTable.id),
            ),
        )
        .limit(1);
    return rows.length > 0;
}

export async function accessProjectDocument({
    db,
    request,
    userId,
}: {
    db: PostgresJsDatabase;
    request: AccessProjectDocumentRequest;
    userId: string;
}): Promise<AccessProjectDocumentResponse> {
    const primaryDb = getPrimaryDatabase(db);
    const documentRows = await primaryDb
        .select({
            id: projectDocumentTable.id,
            projectId: conversationTable.projectId,
            conversationId: projectDocumentTable.conversationId,
            conversationType: conversationTable.conversationType,
            defaultLanguageCode: projectDocumentTable.defaultLanguageCode,
        })
        .from(projectDocumentTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, projectDocumentTable.conversationId),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .where(
            and(
                eq(projectTable.slug, request.projectSlug),
                eq(projectTable.directoryVisibility, "listed"),
                isNull(projectTable.deletedAt),
                eq(projectDocumentTable.publicId, request.documentId),
                isNull(projectDocumentTable.deletedAt),
                isNotNull(projectDocumentTable.publishedAt),
                isNotNull(conversationTable.currentContentId),
                eq(conversationTable.isImporting, false),
            ),
        )
        .limit(1);
    const document = documentRows.at(0);
    if (document === undefined) {
        throw httpErrors.notFound("Project document not found");
    }
    const isOwner = await hasProjectCapability({
        db: primaryDb,
        userId,
        projectId: document.projectId,
        capability: "project_update",
    });
    if (
        !isOwner &&
        !(await hasParticipatedInConversation({
            db: primaryDb,
            conversationId: document.conversationId,
            conversationType: document.conversationType,
            userId,
        }))
    ) {
        throw httpErrors.forbidden(
            "Only consultation participants and project owners can access this document",
        );
    }
    const [fileRows, localizationRows] = await Promise.all([
        primaryDb
            .select({
                audience: projectDocumentFileTable.audience,
                objectKey: projectDocumentFileTable.objectKey,
                contentType: projectDocumentFileTable.contentType,
            })
            .from(projectDocumentFileTable)
            .where(
                and(
                    eq(projectDocumentFileTable.projectDocumentId, document.id),
                    eq(projectDocumentFileTable.status, "available"),
                    isNull(projectDocumentFileTable.deletedAt),
                    isOwner
                        ? or(
                              eq(projectDocumentFileTable.audience, "owner"),
                              eq(
                                  projectDocumentFileTable.audience,
                                  "participant",
                              ),
                          )
                        : eq(projectDocumentFileTable.audience, "participant"),
                ),
            ),
        primaryDb
            .select({
                languageCode: projectDocumentLocalizationTable.languageCode,
                downloadFileName:
                    projectDocumentLocalizationTable.downloadFileName,
            })
            .from(projectDocumentLocalizationTable)
            .where(
                and(
                    eq(
                        projectDocumentLocalizationTable.projectDocumentId,
                        document.id,
                    ),
                    isNull(projectDocumentLocalizationTable.deletedAt),
                ),
            ),
    ]);
    const selectedFile =
        (isOwner
            ? fileRows.find((file) => file.audience === "owner")
            : undefined) ??
        fileRows.find((file) => file.audience === "participant");
    if (selectedFile === undefined) {
        throw httpErrors.notFound("Project document file not found");
    }
    const contentType = selectedFile.contentType;
    if (
        request.mode === "inline" &&
        !isInlineProjectDocumentContentType(contentType)
    ) {
        throw httpErrors.badRequest("This document cannot be viewed inline");
    }
    const filenamesByLanguageCode = new Map(
        localizationRows.map((localization) => [
            localization.languageCode,
            localization.downloadFileName,
        ]),
    );
    const downloadFileName =
        getDisplayLanguageFallbackChain({ languageCode: request.languageCode })
            .map((languageCode) => filenamesByLanguageCode.get(languageCode))
            .find((candidate) => candidate !== undefined) ??
        filenamesByLanguageCode.get(document.defaultLanguageCode) ??
        localizationRows.at(0)?.downloadFileName;
    if (downloadFileName === undefined) {
        throw httpErrors.notFound("Project document localization not found");
    }
    const { bucketName, region } = getStorageConfig();
    const signedUrl = await generatePresignedUrl({
        s3Key: selectedFile.objectKey,
        bucketName,
        region,
        expiresIn: config.PROJECT_DOCUMENTS_S3_PRESIGNED_URL_EXPIRY_SECONDS,
        responseContentType: contentType,
        responseContentDisposition: buildProjectDocumentContentDisposition({
            mode: request.mode,
            fileName: downloadFileName,
        }),
    });
    return { ...signedUrl, downloadFileName, contentType };
}
