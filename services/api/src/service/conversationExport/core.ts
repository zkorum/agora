import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    and,
    asc,
    count,
    desc,
    eq,
    isNull,
    lt,
    lte,
    ne,
    or,
    sql,
} from "drizzle-orm";
import JSZip from "jszip";
import { config, log } from "@/app.js";
import { httpErrors } from "@fastify/sensible";
import {
    conversationContentTable,
    conversationExportArtifactTable,
    conversationExportGenerationTable,
    conversationExportRequestFileTable,
    conversationExportRequestTable,
    conversationTable,
    opinionModerationTable,
    opinionTable,
} from "@/shared-backend/schema.js";
import { deleteFromS3, generatePresignedUrl, uploadToS3 } from "../s3.js";
import type {
    GetConversationExportHistoryResponse,
    GetConversationExportStatusResponse,
    RequestConversationExportResponse,
} from "@/shared/types/dto.js";
import type {
    ExportBundleInfo,
    ExportFailureReason,
    ExportFileAudience,
    ExportFileInfo,
    ExportFileType,
} from "@/shared/types/zod.js";
import {
    getExportFileAudience,
    getExportGeneratorByFileType,
    getExportGenerators,
} from "./generators/factory.js";
import { createExportParticipantMap } from "./generators/participantMap.js";
import {
    generateArtifactBundleS3Key,
    generateArtifactS3Key,
    generateDownloadBundleFileName,
    generateDownloadFileName,
    generateFileName,
} from "./utils.js";
import { createExportNotification } from "./notifications.js";
import { getActiveSurveyConfigRecord } from "../survey.js";
import type { ExportAccessLevel } from "./generators/base.js";
import { getConversationViewAccessLevel } from "@/service/conversationAccess.js";
import { generateRandomSlugId } from "@/crypto.js";
import type { RealtimeSSEManager } from "../realtimeSSE.js";

const MAX_EXPORTS_PER_CONVERSATION = 7;
const EXPORT_COLLECTION_WINDOW_MS = 2_000;
const EXPORT_WORKER_POLL_INTERVAL_MS = 1_000;
const EXPORT_WORKER_MAX_GENERATIONS_PER_TICK = 5;
const EXPORT_WORKER_MAX_ATTEMPTS = 3;

type ExportRequestStatus =
    (typeof conversationExportRequestTable.$inferSelect)["status"];
type ExportGenerationStatus =
    (typeof conversationExportGenerationTable.$inferSelect)["status"];
type ExportArtifactStatus =
    (typeof conversationExportArtifactTable.$inferSelect)["status"];
type ExportCancellationReason = NonNullable<
    (typeof conversationExportRequestTable.$inferSelect)["cancellationReason"]
>;

interface ExportWorker {
    shutdown: () => Promise<void>;
}

interface FileRequirement {
    fileType: ExportFileType;
    audience: ExportFileAudience;
    subjectUserId: string | null;
}

interface ArtifactRecord {
    id: number;
    fileType: ExportFileType;
    audience: ExportFileAudience;
    subjectUserId: string | null;
    status: ExportArtifactStatus;
    fileName: string;
    fileSize: number | null;
    recordCount: number | null;
    s3Key: string | null;
}

interface GenerationRecord {
    id: number;
    slugId: string;
    conversationId: number;
    conversationSlugId: string;
    status: ExportGenerationStatus;
    attempts: number;
    createdAt: Date;
}

interface ExportFileRecord {
    fileType: ExportFileInfo["fileType"];
    fileName: string;
    fileSize: number;
    recordCount: number;
    s3Key: string;
}

export function getVisibleExportFiles({
    fileRecords,
    exportAccessLevel,
}: {
    fileRecords: ExportFileRecord[];
    exportAccessLevel: ExportAccessLevel;
}): ExportFileRecord[] {
    return fileRecords.filter((file) => {
        const audience = getExportFileAudience({ fileType: file.fileType });
        if (audience === undefined) {
            return false;
        }

        return canAccessArtifactAudience({
            audience,
            subjectUserId: null,
            userId: "",
            exportAccessLevel,
        });
    });
}

function getBundleAudience({
    exportAccessLevel,
}: {
    exportAccessLevel: ExportAccessLevel;
}): ExportFileAudience {
    return exportAccessLevel === "owner" ? "owner" : "redacted";
}

function getExportAccessLevelForAudience({
    audience,
}: {
    audience: ExportFileAudience;
}): ExportAccessLevel {
    return audience === "owner" ? "owner" : "public";
}

function canAccessArtifactAudience({
    audience,
    subjectUserId,
    userId,
    exportAccessLevel,
}: {
    audience: ExportFileAudience;
    subjectUserId: string | null;
    userId: string;
    exportAccessLevel: ExportAccessLevel;
}): boolean {
    if (audience === "redacted") {
        return true;
    }

    if (audience === "owner") {
        return exportAccessLevel === "owner";
    }

    return subjectUserId === userId;
}

function getBackoffMs({ attempts }: { attempts: number }): number {
    return Math.min(60_000, 5_000 * 2 ** Math.max(0, attempts - 1));
}

function getArtifactFileName({ fileType }: { fileType: ExportFileType }): string {
    return fileType === "bundle" ? "bundle.zip" : generateFileName(fileType);
}

async function generateExportBundleZip({
    files,
}: {
    files: {
        fileName: string;
        csvBuffer: Buffer;
    }[];
}): Promise<Buffer> {
    const zip = new JSZip();
    for (const file of files) {
        zip.file(file.fileName, file.csvBuffer);
    }

    return await zip.generateAsync({ type: "nodebuffer" });
}

async function findConversationRecord({
    db,
    conversationSlugId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
}): Promise<{ id: number; slugId: string; title: string } | undefined> {
    const conversations = await db
        .select({
            id: conversationTable.id,
            slugId: conversationTable.slugId,
            title: conversationContentTable.title,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationTable.currentContentId, conversationContentTable.id),
        )
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    return conversations[0];
}

async function getConversationRecord({
    db,
    conversationSlugId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
}): Promise<{ id: number; slugId: string; title: string }> {
    const conversation = await findConversationRecord({ db, conversationSlugId });

    if (conversation === undefined) {
        throw httpErrors.notFound("Conversation not found");
    }

    return conversation;
}

async function getOpinionCount({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<number> {
    const [{ count: opinionCount }] = await db
        .select({ count: count() })
        .from(opinionTable)
        .leftJoin(
            opinionModerationTable,
            eq(opinionTable.id, opinionModerationTable.opinionId),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                or(
                    isNull(opinionModerationTable.moderationAction),
                    ne(opinionModerationTable.moderationAction, "move"),
                ),
            ),
        );

    return opinionCount;
}

async function buildFileRequirements({
    db,
    conversationId,
    userId,
    exportAccessLevel,
}: {
    db: PostgresDatabase;
    conversationId: number;
    userId: string;
    exportAccessLevel: ExportAccessLevel;
}): Promise<FileRequirement[]> {
    const hasSurvey =
        (await getActiveSurveyConfigRecord({ db, conversationId })) !== undefined;
    const generators = getExportGenerators({ exportAccessLevel, hasSurvey });
    const requirements: FileRequirement[] = [];

    for (const generator of generators) {
        const audience = getExportFileAudience({ fileType: generator.fileType });
        if (audience === undefined) {
            continue;
        }

        requirements.push({
            fileType: generator.fileType,
            audience,
            subjectUserId: audience === "requester" ? userId : null,
        });
    }

    requirements.push({
        fileType: "bundle",
        audience: getBundleAudience({ exportAccessLevel }),
        subjectUserId: null,
    });

    return requirements;
}

async function lockConversationForExport({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<void> {
    await db.execute(sql`SELECT pg_advisory_xact_lock(${conversationId})`);
}

async function findJoinableGeneration({
    db,
    conversationId,
    requirements,
}: {
    db: PostgresDatabase;
    conversationId: number;
    requirements: FileRequirement[];
}): Promise<{ generationId: number; canAddArtifacts: boolean } | undefined> {
    const collectingGenerations = await db
        .select({ id: conversationExportGenerationTable.id })
        .from(conversationExportGenerationTable)
        .where(
            and(
                eq(conversationExportGenerationTable.conversationId, conversationId),
                eq(conversationExportGenerationTable.status, "collecting"),
            ),
        )
        .orderBy(desc(conversationExportGenerationTable.createdAt))
        .limit(1);

    if (collectingGenerations.length > 0) {
        return {
            generationId: collectingGenerations[0].id,
            canAddArtifacts: true,
        };
    }

    const processingGenerations = await db
        .select({ id: conversationExportGenerationTable.id })
        .from(conversationExportGenerationTable)
        .where(
            and(
                eq(conversationExportGenerationTable.conversationId, conversationId),
                eq(conversationExportGenerationTable.status, "processing"),
            ),
        )
        .orderBy(desc(conversationExportGenerationTable.startedAt))
        .limit(1);

    if (processingGenerations.length === 0) {
        return undefined;
    }

    const generationId = processingGenerations[0].id;
    const artifacts = await db
        .select({
            fileType: conversationExportArtifactTable.fileType,
            audience: conversationExportArtifactTable.audience,
            subjectUserId: conversationExportArtifactTable.subjectUserId,
        })
        .from(conversationExportArtifactTable)
        .where(eq(conversationExportArtifactTable.generationId, generationId));

    const hasAllArtifacts = requirements.every((requirement) =>
        artifacts.some(
            (artifact) =>
                artifact.fileType === requirement.fileType &&
                artifact.audience === requirement.audience &&
                artifact.subjectUserId === requirement.subjectUserId,
        ),
    );

    if (!hasAllArtifacts) {
        return undefined;
    }

    return { generationId, canAddArtifacts: false };
}

async function createGeneration({
    db,
    conversationId,
    now,
}: {
    db: PostgresDatabase;
    conversationId: number;
    now: Date;
}): Promise<number> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const slugId = generateRandomSlugId();
        const collectingEndsAt = new Date(
            now.getTime() + EXPORT_COLLECTION_WINDOW_MS,
        );
        const inserted = await db
            .insert(conversationExportGenerationTable)
            .values({
                slugId,
                conversationId,
                status: "collecting",
                collectingEndsAt,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoNothing()
            .returning({ id: conversationExportGenerationTable.id });

        if (inserted.length === 1) {
            return inserted[0].id;
        }
    }

    throw new Error("Failed to allocate a unique export generation");
}

async function ensureArtifacts({
    db,
    generationId,
    requirements,
}: {
    db: PostgresDatabase;
    generationId: number;
    requirements: FileRequirement[];
}): Promise<ArtifactRecord[]> {
    for (const requirement of requirements) {
        await db
            .insert(conversationExportArtifactTable)
            .values({
                generationId,
                fileType: requirement.fileType,
                audience: requirement.audience,
                subjectUserId: requirement.subjectUserId,
                status: "queued",
                fileName: getArtifactFileName({ fileType: requirement.fileType }),
            })
            .onConflictDoNothing();
    }

    return await getArtifactsForRequirements({
        db,
        generationId,
        requirements,
    });
}

async function getArtifactsForRequirements({
    db,
    generationId,
    requirements,
}: {
    db: PostgresDatabase;
    generationId: number;
    requirements: FileRequirement[];
}): Promise<ArtifactRecord[]> {
    const artifacts = await db
        .select({
            id: conversationExportArtifactTable.id,
            fileType: conversationExportArtifactTable.fileType,
            audience: conversationExportArtifactTable.audience,
            subjectUserId: conversationExportArtifactTable.subjectUserId,
            status: conversationExportArtifactTable.status,
            fileName: conversationExportArtifactTable.fileName,
            fileSize: conversationExportArtifactTable.fileSize,
            recordCount: conversationExportArtifactTable.recordCount,
            s3Key: conversationExportArtifactTable.s3Key,
        })
        .from(conversationExportArtifactTable)
        .where(eq(conversationExportArtifactTable.generationId, generationId));

    const matchedArtifacts: ArtifactRecord[] = [];
    for (const requirement of requirements) {
        const artifact = artifacts.find(
            (candidate) =>
                candidate.fileType === requirement.fileType &&
                candidate.audience === requirement.audience &&
                candidate.subjectUserId === requirement.subjectUserId,
        );
        if (artifact === undefined) {
            throw new Error(
                `Missing export artifact ${requirement.fileType}/${requirement.audience} for generation ${String(generationId)}`,
            );
        }
        matchedArtifacts.push(artifact);
    }

    return matchedArtifacts;
}

interface ExportRequestNotificationRecord {
    id: number;
    slugId: string;
    userId: string;
    conversationId: number;
    failureReason: ExportFailureReason | null;
    cancellationReason: ExportCancellationReason | null;
}

interface RequestConversationExportParams {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
    realtimeSSEManager?: RealtimeSSEManager;
}

type RequestCreationResult =
    | { status: "active_export_in_progress" }
    | { status: "cooldown_active"; cooldownEndsAt: Date }
    | { status: "queued"; requestId: number; exportSlugId: string };

interface CreateRequestResult {
    requestId: number;
    exportSlugId: string;
}

function getExpiresAt({ now }: { now: Date }): Date {
    return new Date(
        now.getTime() + config.EXPORT_CONVOS_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
}

async function findActiveRequest({
    db,
    conversationId,
    userId,
}: {
    db: PostgresDatabase;
    conversationId: number;
    userId: string;
}): Promise<{ exportSlugId: string; createdAt: Date } | undefined> {
    const activeRequests = await db
        .select({
            exportSlugId: conversationExportRequestTable.slugId,
            createdAt: conversationExportRequestTable.createdAt,
        })
        .from(conversationExportRequestTable)
        .where(
            and(
                eq(conversationExportRequestTable.conversationId, conversationId),
                eq(conversationExportRequestTable.userId, userId),
                eq(conversationExportRequestTable.status, "processing"),
                isNull(conversationExportRequestTable.deletedAt),
            ),
        )
        .orderBy(desc(conversationExportRequestTable.createdAt))
        .limit(1);

    return activeRequests[0];
}

async function findCooldown({
    db,
    conversationId,
    userId,
    now,
}: {
    db: PostgresDatabase;
    conversationId: number;
    userId: string;
    now: Date;
}): Promise<
    | {
          cooldownEndsAt: Date;
          lastExportSlugId: string;
      }
    | undefined
> {
    if (config.EXPORT_CONVOS_COOLDOWN_SECONDS <= 0) {
        return undefined;
    }

    const cooldownStart = new Date(
        now.getTime() - config.EXPORT_CONVOS_COOLDOWN_SECONDS * 1000,
    );
    const lastRequests = await db
        .select({
            exportSlugId: conversationExportRequestTable.slugId,
            createdAt: conversationExportRequestTable.createdAt,
        })
        .from(conversationExportRequestTable)
        .where(
            and(
                eq(conversationExportRequestTable.conversationId, conversationId),
                eq(conversationExportRequestTable.userId, userId),
                eq(conversationExportRequestTable.status, "completed"),
                isNull(conversationExportRequestTable.deletedAt),
            ),
        )
        .orderBy(desc(conversationExportRequestTable.createdAt))
        .limit(1);

    if (lastRequests.length === 0) {
        return undefined;
    }

    const lastRequest = lastRequests[0];
    if (lastRequest.createdAt <= cooldownStart) {
        return undefined;
    }

    return {
        cooldownEndsAt: new Date(
            lastRequest.createdAt.getTime() +
                config.EXPORT_CONVOS_COOLDOWN_SECONDS * 1000,
        ),
        lastExportSlugId: lastRequest.exportSlugId,
    };
}

async function createRequest({
    db,
    conversationId,
    generationId,
    userId,
    now,
}: {
    db: PostgresDatabase;
    conversationId: number;
    generationId: number;
    userId: string;
    now: Date;
}): Promise<CreateRequestResult | undefined> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const slugId = generateRandomSlugId();
        const inserted = await db
            .insert(conversationExportRequestTable)
            .values({
                slugId,
                conversationId,
                generationId,
                userId,
                status: "processing",
                expiresAt: getExpiresAt({ now }),
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoNothing()
            .returning({ id: conversationExportRequestTable.id });

        if (inserted.length === 1) {
            return {
                requestId: inserted[0].id,
                exportSlugId: slugId,
            };
        }

        const activeRequest = await findActiveRequest({
            db,
            conversationId,
            userId,
        });
        if (activeRequest !== undefined) {
            return undefined;
        }
    }

    throw new Error("Failed to allocate a unique export request");
}

async function linkRequestArtifacts({
    db,
    requestId,
    artifacts,
}: {
    db: PostgresDatabase;
    requestId: number;
    artifacts: ArtifactRecord[];
}): Promise<void> {
    for (const artifact of artifacts) {
        await db
            .insert(conversationExportRequestFileTable)
            .values({
                requestId,
                artifactId: artifact.id,
                fileType: artifact.fileType,
                audience: artifact.audience,
            })
            .onConflictDoNothing();
    }
}

export async function requestConversationExport({
    db,
    conversationSlugId,
    userId,
    realtimeSSEManager,
}: RequestConversationExportParams): Promise<RequestConversationExportResponse> {
    const conversation = await findConversationRecord({ db, conversationSlugId });
    if (conversation === undefined) {
        return { success: false, reason: "conversation_not_found" };
    }

    const exportAccessLevel = await getConversationViewAccessLevel({
        db,
        conversationId: conversation.id,
        userId,
    });

    const opinionCount = await getOpinionCount({
        db,
        conversationId: conversation.id,
    });
    if (opinionCount === 0) {
        return { success: false, reason: "no_opinions" };
    }

    const requirements = await buildFileRequirements({
        db,
        conversationId: conversation.id,
        userId,
        exportAccessLevel,
    });

    const creationResult: RequestCreationResult = await db.transaction(
        async (tx): Promise<RequestCreationResult> => {
        await lockConversationForExport({
            db: tx,
            conversationId: conversation.id,
        });

        const now = new Date();
        const activeRequest = await findActiveRequest({
            db: tx,
            conversationId: conversation.id,
            userId,
        });
        if (activeRequest !== undefined) {
            return { status: "active_export_in_progress" };
        }

        const cooldown = await findCooldown({
            db: tx,
            conversationId: conversation.id,
            userId,
            now,
        });
        if (cooldown !== undefined) {
            return {
                status: "cooldown_active",
                cooldownEndsAt: cooldown.cooldownEndsAt,
            };
        }

        const joinableGeneration = await findJoinableGeneration({
            db: tx,
            conversationId: conversation.id,
            requirements,
        });
        const generationId =
            joinableGeneration?.generationId ??
            (await createGeneration({
                db: tx,
                conversationId: conversation.id,
                now,
            }));
        const artifacts = joinableGeneration?.canAddArtifacts === false
            ? await getArtifactsForRequirements({
                  db: tx,
                  generationId,
                  requirements,
              })
            : await ensureArtifacts({
                  db: tx,
                  generationId,
                  requirements,
              });

        const request = await createRequest({
            db: tx,
            conversationId: conversation.id,
            generationId,
            userId,
            now,
        });
        if (request === undefined) {
            return { status: "active_export_in_progress" };
        }

        await linkRequestArtifacts({
            db: tx,
            requestId: request.requestId,
            artifacts,
        });

        return {
            status: "queued",
            requestId: request.requestId,
            exportSlugId: request.exportSlugId,
        };
        },
    );

    if (creationResult.status === "active_export_in_progress") {
        return { success: false, reason: "active_export_in_progress" };
    }

    if (creationResult.status === "cooldown_active") {
        return {
            success: true,
            status: "cooldown_active",
            cooldownEndsAt: creationResult.cooldownEndsAt,
        };
    }

    await createExportNotification({
        db,
        userId,
        exportRequestId: creationResult.requestId,
        exportSlugId: creationResult.exportSlugId,
        conversationId: conversation.id,
        type: "export_started",
        realtimeSSEManager,
    });

    return {
        success: true,
        status: "queued",
        exportSlugId: creationResult.exportSlugId,
    };
}

interface GetConversationExportStatusParams {
    db: PostgresDatabase;
    exportSlugId: string;
    userId: string;
}

interface RequestStatusRecord {
    id: number;
    exportSlugId: string;
    status: ExportRequestStatus;
    conversationId: number;
    conversationSlugId: string;
    failureReason: ExportFailureReason | null;
    cancellationReason: ExportCancellationReason | null;
    createdAt: Date;
    expiresAt: Date;
    deletedAt: Date | null;
}

async function getRequestStatusRecord({
    db,
    exportSlugId,
    userId,
}: GetConversationExportStatusParams): Promise<RequestStatusRecord> {
    const requests = await db
        .select({
            id: conversationExportRequestTable.id,
            exportSlugId: conversationExportRequestTable.slugId,
            status: conversationExportRequestTable.status,
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
            failureReason: conversationExportRequestTable.failureReason,
            cancellationReason: conversationExportRequestTable.cancellationReason,
            createdAt: conversationExportRequestTable.createdAt,
            expiresAt: conversationExportRequestTable.expiresAt,
            deletedAt: conversationExportRequestTable.deletedAt,
        })
        .from(conversationExportRequestTable)
        .innerJoin(
            conversationTable,
            eq(conversationExportRequestTable.conversationId, conversationTable.id),
        )
        .where(
            and(
                eq(conversationExportRequestTable.slugId, exportSlugId),
                eq(conversationExportRequestTable.userId, userId),
            ),
        )
        .limit(1);

    if (requests.length === 0) {
        throw httpErrors.notFound("Export not found");
    }

    const request = requests[0];
    return request;
}

async function getRequestArtifacts({
    db,
    requestId,
}: {
    db: PostgresDatabase;
    requestId: number;
}): Promise<ArtifactRecord[]> {
    return await db
        .select({
            id: conversationExportArtifactTable.id,
            fileType: conversationExportArtifactTable.fileType,
            audience: conversationExportArtifactTable.audience,
            subjectUserId: conversationExportArtifactTable.subjectUserId,
            status: conversationExportArtifactTable.status,
            fileName: conversationExportArtifactTable.fileName,
            fileSize: conversationExportArtifactTable.fileSize,
            recordCount: conversationExportArtifactTable.recordCount,
            s3Key: conversationExportArtifactTable.s3Key,
        })
        .from(conversationExportRequestFileTable)
        .innerJoin(
            conversationExportArtifactTable,
            eq(
                conversationExportRequestFileTable.artifactId,
                conversationExportArtifactTable.id,
            ),
        )
        .where(eq(conversationExportRequestFileTable.requestId, requestId))
        .orderBy(asc(conversationExportRequestFileTable.id));
}

function assertCompletedArtifactMetadata({
    artifact,
}: {
    artifact: ArtifactRecord;
}): { fileSize: number; recordCount: number; s3Key: string } {
    if (
        artifact.status !== "completed" ||
        artifact.fileSize === null ||
        artifact.recordCount === null ||
        artifact.s3Key === null
    ) {
        throw new Error(
            `Export artifact ${String(artifact.id)} is missing completed metadata`,
        );
    }

    return {
        fileSize: artifact.fileSize,
        recordCount: artifact.recordCount,
        s3Key: artifact.s3Key,
    };
}

async function buildFileInfo({
    artifact,
    bucketName,
}: {
    artifact: ArtifactRecord;
    bucketName: string;
}): Promise<ExportFileInfo> {
    const metadata = assertCompletedArtifactMetadata({ artifact });
    const { url, expiresAt } = await generatePresignedUrl({
        s3Key: metadata.s3Key,
        bucketName,
        expiresIn: config.EXPORT_CONVOS_S3_PRESIGNED_URL_EXPIRY_SECONDS,
    });

    return {
        fileType: artifact.fileType,
        fileName: artifact.fileName,
        fileSize: metadata.fileSize,
        recordCount: metadata.recordCount,
        downloadUrl: url,
        urlExpiresAt: expiresAt,
    };
}

async function buildBundleInfo({
    artifact,
    bucketName,
}: {
    artifact: ArtifactRecord;
    bucketName: string;
}): Promise<ExportBundleInfo> {
    const metadata = assertCompletedArtifactMetadata({ artifact });
    const { url, expiresAt } = await generatePresignedUrl({
        s3Key: metadata.s3Key,
        bucketName,
        expiresIn: config.EXPORT_CONVOS_S3_PRESIGNED_URL_EXPIRY_SECONDS,
    });

    return {
        fileName: artifact.fileName,
        fileSize: metadata.fileSize,
        downloadUrl: url,
        urlExpiresAt: expiresAt,
    };
}

export async function getConversationExportStatus({
    db,
    exportSlugId,
    userId,
}: GetConversationExportStatusParams): Promise<GetConversationExportStatusResponse> {
    const request = await getRequestStatusRecord({ db, exportSlugId, userId });
    const exportAccessLevel = await getConversationViewAccessLevel({
        db,
        conversationId: request.conversationId,
        userId,
    });

    if (request.deletedAt !== null || request.expiresAt < new Date()) {
        return {
            status: "expired",
            exportSlugId: request.exportSlugId,
            conversationSlugId: request.conversationSlugId,
            failureReason: request.failureReason ?? undefined,
            cancellationReason: request.cancellationReason ?? undefined,
            createdAt: request.createdAt,
            expiresAt: request.expiresAt,
            deletedAt: request.deletedAt ?? request.expiresAt,
        };
    }

    const baseResponse = {
        exportSlugId: request.exportSlugId,
        conversationSlugId: request.conversationSlugId,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt,
    };

    if (request.status === "processing") {
        return {
            ...baseResponse,
            status: "processing",
        };
    }

    if (request.status === "failed") {
        return {
            ...baseResponse,
            status: "failed",
            failureReason: request.failureReason ?? undefined,
        };
    }

    if (request.status === "cancelled") {
        return {
            ...baseResponse,
            status: "cancelled",
            cancellationReason: request.cancellationReason ?? "",
        };
    }

    if (!config.EXPORT_CONVOS_AWS_S3_BUCKET_NAME) {
        throw new Error("S3 configuration is missing");
    }

    const artifacts = await getRequestArtifacts({ db, requestId: request.id });
    const visibleArtifacts = artifacts.filter((artifact) =>
        canAccessArtifactAudience({
            audience: artifact.audience,
            subjectUserId: artifact.subjectUserId,
            userId,
            exportAccessLevel,
        }),
    );
    const bucketName = config.EXPORT_CONVOS_AWS_S3_BUCKET_NAME;
    const files = await Promise.all(
        visibleArtifacts
            .filter((artifact) => artifact.fileType !== "bundle")
            .map(async (artifact) =>
                await buildFileInfo({ artifact, bucketName }),
            ),
    );
    const bundleArtifact = visibleArtifacts.find(
        (artifact) => artifact.fileType === "bundle",
    );
    const bundle = bundleArtifact
        ? await buildBundleInfo({ artifact: bundleArtifact, bucketName })
        : undefined;

    return {
        ...baseResponse,
        status: "completed",
        files,
        bundle,
    };
}

interface GetActiveExportForConversationParams {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

type GetActiveExportResponse =
    | {
          hasActiveExport: true;
          exportSlugId: string;
          createdAt: Date;
      }
    | {
          hasActiveExport: false;
      };

export async function getActiveExportForConversation({
    db,
    conversationSlugId,
    userId,
}: GetActiveExportForConversationParams): Promise<GetActiveExportResponse> {
    const conversation = await getConversationRecord({ db, conversationSlugId });
    const activeRequest = await findActiveRequest({
        db,
        conversationId: conversation.id,
        userId,
    });

    if (activeRequest === undefined) {
        return { hasActiveExport: false };
    }

    return {
        hasActiveExport: true,
        exportSlugId: activeRequest.exportSlugId,
        createdAt: activeRequest.createdAt,
    };
}

interface GetConversationExportHistoryParams {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

export async function getConversationExportHistory({
    db,
    conversationSlugId,
    userId,
}: GetConversationExportHistoryParams): Promise<GetConversationExportHistoryResponse> {
    const exports = await db
        .select({
            exportSlugId: conversationExportRequestTable.slugId,
            status: conversationExportRequestTable.status,
            createdAt: conversationExportRequestTable.createdAt,
        })
        .from(conversationExportRequestTable)
        .innerJoin(
            conversationTable,
            eq(conversationExportRequestTable.conversationId, conversationTable.id),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationExportRequestTable.userId, userId),
                isNull(conversationExportRequestTable.deletedAt),
            ),
        )
        .orderBy(desc(conversationExportRequestTable.createdAt))
        .limit(MAX_EXPORTS_PER_CONVERSATION);

    return exports.map((exportRecord) => ({
        exportSlugId: exportRecord.exportSlugId,
        status: exportRecord.status,
        createdAt: exportRecord.createdAt,
    }));
}

interface ClaimedGenerationRecord extends GenerationRecord {
    conversationTitle: string;
}

async function claimNextGeneration({
    db,
}: {
    db: PostgresDatabase;
}): Promise<ClaimedGenerationRecord | undefined> {
    return await db.transaction(async (tx) => {
        const now = new Date();
        const candidates = await tx
            .select({
                id: conversationExportGenerationTable.id,
                slugId: conversationExportGenerationTable.slugId,
                conversationId: conversationExportGenerationTable.conversationId,
                conversationSlugId: conversationTable.slugId,
                conversationTitle: conversationContentTable.title,
                status: conversationExportGenerationTable.status,
                attempts: conversationExportGenerationTable.attempts,
                createdAt: conversationExportGenerationTable.createdAt,
            })
            .from(conversationExportGenerationTable)
            .innerJoin(
                conversationTable,
                eq(
                    conversationExportGenerationTable.conversationId,
                    conversationTable.id,
                ),
            )
            .innerJoin(
                conversationContentTable,
                eq(conversationTable.currentContentId, conversationContentTable.id),
            )
            .where(
                or(
                    and(
                        eq(conversationExportGenerationTable.status, "collecting"),
                        lte(conversationExportGenerationTable.collectingEndsAt, now),
                    ),
                    and(
                        eq(conversationExportGenerationTable.status, "queued"),
                        or(
                            isNull(conversationExportGenerationTable.nextAttemptAt),
                            lte(conversationExportGenerationTable.nextAttemptAt, now),
                        ),
                    ),
                ),
            )
            .orderBy(asc(conversationExportGenerationTable.createdAt))
            .limit(EXPORT_WORKER_MAX_GENERATIONS_PER_TICK);

        for (const candidate of candidates) {
            await lockConversationForExport({
                db: tx,
                conversationId: candidate.conversationId,
            });

            const updated = await tx
                .update(conversationExportGenerationTable)
                .set({
                    status: "processing",
                    attempts: candidate.attempts + 1,
                    startedAt: now,
                    heartbeatAt: now,
                    nextAttemptAt: null,
                    updatedAt: now,
                })
                .where(
                    and(
                        eq(conversationExportGenerationTable.id, candidate.id),
                        or(
                            and(
                                eq(
                                    conversationExportGenerationTable.status,
                                    "collecting",
                                ),
                                lte(
                                    conversationExportGenerationTable.collectingEndsAt,
                                    now,
                                ),
                            ),
                            and(
                                eq(
                                    conversationExportGenerationTable.status,
                                    "queued",
                                ),
                                or(
                                    isNull(
                                        conversationExportGenerationTable.nextAttemptAt,
                                    ),
                                    lte(
                                        conversationExportGenerationTable.nextAttemptAt,
                                        now,
                                    ),
                                ),
                            ),
                        ),
                    ),
                )
                .returning({ id: conversationExportGenerationTable.id });

            if (updated.length === 1) {
                return {
                    ...candidate,
                    status: "processing",
                    attempts: candidate.attempts + 1,
                };
            }
        }

        return undefined;
    });
}

async function getGenerationArtifacts({
    db,
    generationId,
}: {
    db: PostgresDatabase;
    generationId: number;
}): Promise<ArtifactRecord[]> {
    return await db
        .select({
            id: conversationExportArtifactTable.id,
            fileType: conversationExportArtifactTable.fileType,
            audience: conversationExportArtifactTable.audience,
            subjectUserId: conversationExportArtifactTable.subjectUserId,
            status: conversationExportArtifactTable.status,
            fileName: conversationExportArtifactTable.fileName,
            fileSize: conversationExportArtifactTable.fileSize,
            recordCount: conversationExportArtifactTable.recordCount,
            s3Key: conversationExportArtifactTable.s3Key,
        })
        .from(conversationExportArtifactTable)
        .where(eq(conversationExportArtifactTable.generationId, generationId))
        .orderBy(asc(conversationExportArtifactTable.id));
}

function isArtifactIncludedInBundle({
    artifact,
    bundleArtifact,
}: {
    artifact: ArtifactRecord;
    bundleArtifact: ArtifactRecord;
}): boolean {
    if (artifact.fileType === "bundle") {
        return false;
    }

    if (bundleArtifact.audience === "redacted") {
        return artifact.audience === "redacted";
    }

    if (bundleArtifact.audience === "owner") {
        return artifact.audience === "redacted" || artifact.audience === "owner";
    }

    return (
        artifact.audience === "redacted" ||
        (artifact.audience === "requester" &&
            artifact.subjectUserId === bundleArtifact.subjectUserId)
    );
}

async function generateCsvForArtifact({
    db,
    generation,
    artifact,
    participantMap,
}: {
    db: PostgresDatabase;
    generation: ClaimedGenerationRecord;
    artifact: ArtifactRecord;
    participantMap: ReturnType<typeof createExportParticipantMap>;
}): Promise<{ fileName: string; csvBuffer: Buffer; recordCount: number }> {
    const generator = getExportGeneratorByFileType({
        fileType: artifact.fileType,
    });
    if (generator === undefined) {
        throw new Error(`No export generator found for ${artifact.fileType}`);
    }

    const { csvBuffer, recordCount } = await generator.generate({
        db,
        conversationId: generation.conversationId,
        conversationSlugId: generation.conversationSlugId,
        participantMap,
        exportAccessLevel: getExportAccessLevelForAudience({
            audience: artifact.audience,
        }),
    });

    return {
        fileName: generateFileName(artifact.fileType),
        csvBuffer,
        recordCount,
    };
}

async function processCsvArtifact({
    db,
    generation,
    artifact,
    participantMap,
    bucketName,
}: {
    db: PostgresDatabase;
    generation: ClaimedGenerationRecord;
    artifact: ArtifactRecord;
    participantMap: ReturnType<typeof createExportParticipantMap>;
    bucketName: string;
}): Promise<{ fileName: string; csvBuffer: Buffer }> {
    const now = new Date();
    await db
        .update(conversationExportArtifactTable)
        .set({ status: "processing", updatedAt: now })
        .where(eq(conversationExportArtifactTable.id, artifact.id));

    try {
        const { fileName, csvBuffer, recordCount } = await generateCsvForArtifact({
            db,
            generation,
            artifact,
            participantMap,
        });
        const s3Key = generateArtifactS3Key({
            conversationSlugId: generation.conversationSlugId,
            generationSlugId: generation.slugId,
            audience: artifact.audience,
            subjectUserId: artifact.subjectUserId,
            fileType: artifact.fileType,
        });
        const downloadFileName = generateDownloadFileName({
            conversationTitle: generation.conversationTitle,
            conversationSlugId: generation.conversationSlugId,
            fileType: artifact.fileType,
            createdAt: generation.createdAt,
        });

        await uploadToS3({
            s3Key,
            buffer: csvBuffer,
            bucketName,
            fileName: downloadFileName,
        });

        await db
            .update(conversationExportArtifactTable)
            .set({
                status: "completed",
                fileName,
                fileSize: csvBuffer.length,
                recordCount,
                s3Key,
                failureReason: null,
                updatedAt: new Date(),
            })
            .where(eq(conversationExportArtifactTable.id, artifact.id));

        log.info(
            `Generated ${artifact.fileType}.csv for export generation ${generation.slugId}: ${String(recordCount)} records, ${String(csvBuffer.length)} bytes`,
        );

        return { fileName, csvBuffer };
    } catch (error) {
        await db
            .update(conversationExportArtifactTable)
            .set({
                status: "failed",
                failureReason: "processing_error",
                updatedAt: new Date(),
            })
            .where(eq(conversationExportArtifactTable.id, artifact.id));
        throw error;
    }
}

async function processBundleArtifact({
    db,
    generation,
    artifact,
    allArtifacts,
    generatedCsvByArtifactId,
    participantMap,
    bucketName,
}: {
    db: PostgresDatabase;
    generation: ClaimedGenerationRecord;
    artifact: ArtifactRecord;
    allArtifacts: ArtifactRecord[];
    generatedCsvByArtifactId: Map<number, { fileName: string; csvBuffer: Buffer }>;
    participantMap: ReturnType<typeof createExportParticipantMap>;
    bucketName: string;
}): Promise<void> {
    await db
        .update(conversationExportArtifactTable)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(conversationExportArtifactTable.id, artifact.id));

    try {
        const bundleCsvFiles: { fileName: string; csvBuffer: Buffer }[] = [];
        const includedArtifacts = allArtifacts.filter((candidate) =>
            isArtifactIncludedInBundle({ artifact: candidate, bundleArtifact: artifact }),
        );

        for (const includedArtifact of includedArtifacts) {
            const existingCsv = generatedCsvByArtifactId.get(includedArtifact.id);
            if (existingCsv !== undefined) {
                bundleCsvFiles.push(existingCsv);
                continue;
            }

            const generatedCsv = await generateCsvForArtifact({
                db,
                generation,
                artifact: includedArtifact,
                participantMap,
            });
            const csvForBundle = {
                fileName: generatedCsv.fileName,
                csvBuffer: generatedCsv.csvBuffer,
            };
            generatedCsvByArtifactId.set(includedArtifact.id, csvForBundle);
            bundleCsvFiles.push(csvForBundle);
        }

        const zipBuffer = await generateExportBundleZip({ files: bundleCsvFiles });
        const s3Key = generateArtifactBundleS3Key({
            conversationSlugId: generation.conversationSlugId,
            generationSlugId: generation.slugId,
            audience: artifact.audience,
        });
        const downloadFileName = generateDownloadBundleFileName({
            conversationTitle: generation.conversationTitle,
            conversationSlugId: generation.conversationSlugId,
            createdAt: generation.createdAt,
            variant: artifact.audience === "owner" ? "owner" : "public",
        });

        await uploadToS3({
            s3Key,
            buffer: zipBuffer,
            bucketName,
            fileName: downloadFileName,
            contentType: "application/zip",
        });

        await db
            .update(conversationExportArtifactTable)
            .set({
                status: "completed",
                fileName: getArtifactFileName({ fileType: artifact.fileType }),
                fileSize: zipBuffer.length,
                recordCount: bundleCsvFiles.length,
                s3Key,
                failureReason: null,
                updatedAt: new Date(),
            })
            .where(eq(conversationExportArtifactTable.id, artifact.id));
    } catch (error) {
        await db
            .update(conversationExportArtifactTable)
            .set({
                status: "failed",
                failureReason: "processing_error",
                updatedAt: new Date(),
            })
            .where(eq(conversationExportArtifactTable.id, artifact.id));
        throw error;
    }
}

async function getProcessingRequestsForGeneration({
    db,
    generationId,
}: {
    db: PostgresDatabase;
    generationId: number;
}): Promise<ExportRequestNotificationRecord[]> {
    return await db
        .select({
            id: conversationExportRequestTable.id,
            slugId: conversationExportRequestTable.slugId,
            userId: conversationExportRequestTable.userId,
            conversationId: conversationExportRequestTable.conversationId,
            failureReason: conversationExportRequestTable.failureReason,
            cancellationReason: conversationExportRequestTable.cancellationReason,
        })
        .from(conversationExportRequestTable)
        .where(
            and(
                eq(conversationExportRequestTable.generationId, generationId),
                eq(conversationExportRequestTable.status, "processing"),
                isNull(conversationExportRequestTable.deletedAt),
            ),
        );
}

async function markGenerationCompletedAndRequests({
    db,
    generation,
}: {
    db: PostgresDatabase;
    generation: ClaimedGenerationRecord;
}): Promise<ExportRequestNotificationRecord[]> {
    return await db.transaction(async (tx) => {
        await lockConversationForExport({
            db: tx,
            conversationId: generation.conversationId,
        });

        const now = new Date();
        await tx
            .update(conversationExportGenerationTable)
            .set({
                status: "completed",
                completedAt: now,
                updatedAt: now,
            })
            .where(eq(conversationExportGenerationTable.id, generation.id));

        const requests = await getProcessingRequestsForGeneration({
            db: tx,
            generationId: generation.id,
        });

        if (requests.length > 0) {
            await tx
                .update(conversationExportRequestTable)
                .set({
                    status: "completed",
                    completedNotifiedAt: now,
                    updatedAt: now,
                })
                .where(
                    and(
                        eq(
                            conversationExportRequestTable.generationId,
                            generation.id,
                        ),
                        eq(conversationExportRequestTable.status, "processing"),
                        isNull(conversationExportRequestTable.deletedAt),
                    ),
                );
        }

        return requests.map((request) => ({
            ...request,
            failureReason: null,
            cancellationReason: null,
        }));
    });
}

async function markGenerationFailedAndRequests({
    db,
    generationId,
    conversationId,
    reason,
}: {
    db: PostgresDatabase;
    generationId: number;
    conversationId: number;
    reason: ExportFailureReason;
}): Promise<ExportRequestNotificationRecord[]> {
    return await db.transaction(async (tx) => {
        await lockConversationForExport({ db: tx, conversationId });

        const now = new Date();
        await tx
            .update(conversationExportGenerationTable)
            .set({
                status: "failed",
                failedAt: now,
                failureReason: reason,
                updatedAt: now,
            })
            .where(eq(conversationExportGenerationTable.id, generationId));

        const requests = await getProcessingRequestsForGeneration({
            db: tx,
            generationId,
        });

        if (requests.length > 0) {
            await tx
                .update(conversationExportRequestTable)
                .set({
                    status: "failed",
                    failureReason: reason,
                    failedNotifiedAt: now,
                    updatedAt: now,
                })
                .where(
                    and(
                        eq(conversationExportRequestTable.generationId, generationId),
                        eq(conversationExportRequestTable.status, "processing"),
                        isNull(conversationExportRequestTable.deletedAt),
                    ),
                );
        }

        return requests.map((request) => ({
            ...request,
            failureReason: reason,
            cancellationReason: null,
        }));
    });
}

async function notifyRequests({
    db,
    requests,
    type,
    realtimeSSEManager,
}: {
    db: PostgresDatabase;
    requests: ExportRequestNotificationRecord[];
    type: "export_completed" | "export_failed" | "export_cancelled";
    realtimeSSEManager?: RealtimeSSEManager;
}): Promise<void> {
    for (const request of requests) {
        await createExportNotification({
            db,
            userId: request.userId,
            exportRequestId: request.id,
            exportSlugId: request.slugId,
            conversationId: request.conversationId,
            type,
            failureReason: request.failureReason ?? undefined,
            cancellationReason: request.cancellationReason ?? undefined,
            realtimeSSEManager,
        });
    }
}

async function processGeneration({
    db,
    generation,
}: {
    db: PostgresDatabase;
    generation: ClaimedGenerationRecord;
}): Promise<void> {
    if (
        !config.EXPORT_CONVOS_AWS_S3_BUCKET_NAME ||
        !config.EXPORT_CONVOS_AWS_S3_REGION
    ) {
        throw new Error("S3 configuration is missing");
    }

    const bucketName = config.EXPORT_CONVOS_AWS_S3_BUCKET_NAME;
    const participantMap = createExportParticipantMap();
    const generatedCsvByArtifactId = new Map<
        number,
        { fileName: string; csvBuffer: Buffer }
    >();
    const artifacts = await getGenerationArtifacts({
        db,
        generationId: generation.id,
    });

    for (const artifact of artifacts.filter(
        (candidate) => candidate.fileType !== "bundle",
    )) {
        if (artifact.status === "completed") {
            continue;
        }

        const generated = await processCsvArtifact({
            db,
            generation,
            artifact,
            participantMap,
            bucketName,
        });
        generatedCsvByArtifactId.set(artifact.id, generated);
    }

    const refreshedArtifacts = await getGenerationArtifacts({
        db,
        generationId: generation.id,
    });
    for (const artifact of refreshedArtifacts.filter(
        (candidate) => candidate.fileType === "bundle",
    )) {
        if (artifact.status === "completed") {
            continue;
        }

        await processBundleArtifact({
            db,
            generation,
            artifact,
            allArtifacts: refreshedArtifacts,
            generatedCsvByArtifactId,
            participantMap,
            bucketName,
        });
    }

    const finalArtifacts = await getGenerationArtifacts({
        db,
        generationId: generation.id,
    });
    const hasIncompleteArtifact = finalArtifacts.some(
        (artifact) => artifact.status !== "completed",
    );
    if (hasIncompleteArtifact) {
        throw new Error(
            `Export generation ${generation.slugId} still has incomplete artifacts`,
        );
    }
}

async function handleGenerationFailure({
    db,
    generation,
    realtimeSSEManager,
}: {
    db: PostgresDatabase;
    generation: ClaimedGenerationRecord;
    realtimeSSEManager?: RealtimeSSEManager;
}): Promise<void> {
    if (generation.attempts < EXPORT_WORKER_MAX_ATTEMPTS) {
        const now = new Date();
        const nextAttemptAt = new Date(
            now.getTime() + getBackoffMs({ attempts: generation.attempts }),
        );
        await db
            .update(conversationExportGenerationTable)
            .set({
                status: "queued",
                nextAttemptAt,
                heartbeatAt: null,
                failureReason: "processing_error",
                updatedAt: now,
            })
            .where(eq(conversationExportGenerationTable.id, generation.id));
        log.warn(
            `Export generation ${generation.slugId} failed; retry scheduled at ${nextAttemptAt.toISOString()}`,
        );
        return;
    }

    const failedRequests = await markGenerationFailedAndRequests({
        db,
        generationId: generation.id,
        conversationId: generation.conversationId,
        reason: "processing_error",
    });
    await notifyRequests({
        db,
        requests: failedRequests,
        type: "export_failed",
        realtimeSSEManager,
    });
}

async function processClaimedGeneration({
    db,
    generation,
    realtimeSSEManager,
}: {
    db: PostgresDatabase;
    generation: ClaimedGenerationRecord;
    realtimeSSEManager?: RealtimeSSEManager;
}): Promise<void> {
    try {
        await processGeneration({ db, generation });
        const completedRequests = await markGenerationCompletedAndRequests({
            db,
            generation,
        });
        await notifyRequests({
            db,
            requests: completedRequests,
            type: "export_completed",
            realtimeSSEManager,
        });
        log.info(`Export generation ${generation.slugId} completed successfully`);
    } catch (error) {
        log.error(error, `Failed to process export generation ${generation.slugId}`);
        await handleGenerationFailure({ db, generation, realtimeSSEManager });
    }
}

export function createExportWorker({
    db,
    realtimeSSEManager,
}: {
    db: PostgresDatabase;
    realtimeSSEManager?: RealtimeSSEManager;
}): ExportWorker {
    let isShuttingDown = false;
    let tickInProgress: Promise<void> | undefined;

    const tick = async (): Promise<void> => {
        if (isShuttingDown || tickInProgress !== undefined) {
            return;
        }

        tickInProgress = (async () => {
            for (
                let processedCount = 0;
                processedCount < EXPORT_WORKER_MAX_GENERATIONS_PER_TICK;
                processedCount += 1
            ) {
                const generation = await claimNextGeneration({ db });
                if (generation === undefined) {
                    return;
                }

                await processClaimedGeneration({
                    db,
                    generation,
                    realtimeSSEManager,
                });
            }
        })();

        try {
            await tickInProgress;
        } finally {
            tickInProgress = undefined;
        }
    };

    const timer = setInterval(() => {
        void tick();
    }, EXPORT_WORKER_POLL_INTERVAL_MS);
    timer.unref();
    void tick();

    return {
        shutdown: async (): Promise<void> => {
            isShuttingDown = true;
            clearInterval(timer);
            if (tickInProgress !== undefined) {
                await tickInProgress;
            }
        },
    };
}

interface DeleteConversationExportParams {
    db: PostgresDatabase;
    exportSlugId: string;
}

async function deleteUnreferencedArtifactsForGenerations({
    db,
    generationIds,
}: {
    db: PostgresDatabase;
    generationIds: number[];
}): Promise<void> {
    if (generationIds.length === 0 || !config.EXPORT_CONVOS_AWS_S3_BUCKET_NAME) {
        return;
    }

    const uniqueGenerationIds = Array.from(new Set(generationIds));
    for (const generationId of uniqueGenerationIds) {
        const [{ count: activeRequestCount }] = await db
            .select({ count: count() })
            .from(conversationExportRequestTable)
            .where(
                and(
                    eq(conversationExportRequestTable.generationId, generationId),
                    isNull(conversationExportRequestTable.deletedAt),
                ),
            );

        if (activeRequestCount > 0) {
            continue;
        }

        const artifacts = await db
            .select({
                id: conversationExportArtifactTable.id,
                s3Key: conversationExportArtifactTable.s3Key,
            })
            .from(conversationExportArtifactTable)
            .where(eq(conversationExportArtifactTable.generationId, generationId));

        for (const artifact of artifacts) {
            if (artifact.s3Key === null) {
                continue;
            }

            try {
                await deleteFromS3({
                    s3Key: artifact.s3Key,
                    bucketName: config.EXPORT_CONVOS_AWS_S3_BUCKET_NAME,
                });
            } catch (error) {
                log.error(error, `Failed to delete export artifact ${artifact.s3Key}`);
            }
        }

        await db
            .update(conversationExportArtifactTable)
            .set({ s3Key: null, fileSize: null, updatedAt: new Date() })
            .where(eq(conversationExportArtifactTable.generationId, generationId));
    }
}

export async function deleteConversationExport({
    db,
    exportSlugId,
}: DeleteConversationExportParams): Promise<void> {
    const requests = await db
        .select({
            id: conversationExportRequestTable.id,
            generationId: conversationExportRequestTable.generationId,
            status: conversationExportRequestTable.status,
            deletedAt: conversationExportRequestTable.deletedAt,
        })
        .from(conversationExportRequestTable)
        .where(eq(conversationExportRequestTable.slugId, exportSlugId))
        .limit(1);

    if (requests.length === 0) {
        throw httpErrors.notFound("Export not found");
    }

    const request = requests[0];
    if (request.deletedAt !== null) {
        throw httpErrors.badRequest("Export already deleted");
    }

    if (request.status === "processing") {
        throw httpErrors.badRequest(
            "Cannot delete export while it is still processing",
        );
    }

    await db
        .update(conversationExportRequestTable)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(conversationExportRequestTable.id, request.id));

    await deleteUnreferencedArtifactsForGenerations({
        db,
        generationIds: [request.generationId],
    });
}

interface CleanupStaleExportsParams {
    db: PostgresDatabase;
    staleThresholdMs: number;
}

export async function cleanupStaleExports({
    db,
    staleThresholdMs,
}: CleanupStaleExportsParams): Promise<number> {
    const staleTimestamp = new Date(Date.now() - staleThresholdMs);
    const staleGenerations = await db
        .select({
            id: conversationExportGenerationTable.id,
            conversationId: conversationExportGenerationTable.conversationId,
        })
        .from(conversationExportGenerationTable)
        .where(
            and(
                eq(conversationExportGenerationTable.status, "processing"),
                or(
                    lt(conversationExportGenerationTable.heartbeatAt, staleTimestamp),
                    and(
                        isNull(conversationExportGenerationTable.heartbeatAt),
                        lt(conversationExportGenerationTable.updatedAt, staleTimestamp),
                    ),
                ),
            ),
        );

    let failedRequestCount = 0;
    for (const generation of staleGenerations) {
        const failedRequests = await markGenerationFailedAndRequests({
            db,
            generationId: generation.id,
            conversationId: generation.conversationId,
            reason: "timeout",
        });
        failedRequestCount += failedRequests.length;
    }

    return failedRequestCount;
}

interface StuckExportRecord {
    id: number;
    slugId: string;
    userId: string;
    conversationId: number;
    failureReason: ExportFailureReason | null;
    cancellationReason: ExportCancellationReason | null;
}

interface CleanupStuckExportsOnStartupParams {
    db: PostgresDatabase;
}

interface CleanupStuckExportsResult {
    cleanedCount: number;
    stuckExports: StuckExportRecord[];
}

export async function cleanupStuckExportsOnStartup({
    db,
}: CleanupStuckExportsOnStartupParams): Promise<CleanupStuckExportsResult> {
    const stuckGenerations = await db
        .select({
            id: conversationExportGenerationTable.id,
            conversationId: conversationExportGenerationTable.conversationId,
        })
        .from(conversationExportGenerationTable)
        .where(eq(conversationExportGenerationTable.status, "processing"));

    const stuckExports: StuckExportRecord[] = [];
    for (const generation of stuckGenerations) {
        const failedRequests = await markGenerationFailedAndRequests({
            db,
            generationId: generation.id,
            conversationId: generation.conversationId,
            reason: "server_restart",
        });
        stuckExports.push(...failedRequests);
    }

    if (stuckExports.length > 0) {
        log.info(
            `[ExportStartup] Marked ${String(stuckExports.length)} stuck exports as failed`,
        );
    }

    return {
        cleanedCount: stuckExports.length,
        stuckExports,
    };
}

interface CleanupExpiredExportsParams {
    db: PostgresDatabase;
}

export async function cleanupExpiredExports({
    db,
}: CleanupExpiredExportsParams): Promise<void> {
    const now = new Date();
    const expiredRequests = await db
        .select({
            id: conversationExportRequestTable.id,
            generationId: conversationExportRequestTable.generationId,
        })
        .from(conversationExportRequestTable)
        .where(
            and(
                lt(conversationExportRequestTable.expiresAt, now),
                isNull(conversationExportRequestTable.deletedAt),
            ),
        );

    if (expiredRequests.length === 0) {
        return;
    }

    await db
        .update(conversationExportRequestTable)
        .set({ deletedAt: now, updatedAt: now })
        .where(
            and(
                lt(conversationExportRequestTable.expiresAt, now),
                isNull(conversationExportRequestTable.deletedAt),
            ),
        );

    await deleteUnreferencedArtifactsForGenerations({
        db,
        generationIds: expiredRequests.map((request) => request.generationId),
    });
}

interface DeleteAllConversationExportsParams {
    db: PostgresDatabase;
    conversationId: number;
}

export async function deleteAllConversationExports({
    db,
    conversationId,
}: DeleteAllConversationExportsParams): Promise<number> {
    const now = new Date();
    const requests = await db
        .select({
            id: conversationExportRequestTable.id,
            generationId: conversationExportRequestTable.generationId,
        })
        .from(conversationExportRequestTable)
        .where(
            and(
                eq(conversationExportRequestTable.conversationId, conversationId),
                isNull(conversationExportRequestTable.deletedAt),
            ),
        );

    if (requests.length === 0) {
        return 0;
    }

    await db
        .update(conversationExportRequestTable)
        .set({ deletedAt: now, updatedAt: now })
        .where(
            and(
                eq(conversationExportRequestTable.conversationId, conversationId),
                isNull(conversationExportRequestTable.deletedAt),
            ),
        );

    await db
        .update(conversationExportGenerationTable)
        .set({
            status: "failed",
            failureReason: "processing_error",
            failedAt: now,
            updatedAt: now,
        })
        .where(
            and(
                eq(conversationExportGenerationTable.conversationId, conversationId),
                or(
                    eq(conversationExportGenerationTable.status, "collecting"),
                    eq(conversationExportGenerationTable.status, "queued"),
                    eq(conversationExportGenerationTable.status, "processing"),
                ),
            ),
        );

    await deleteUnreferencedArtifactsForGenerations({
        db,
        generationIds: requests.map((request) => request.generationId),
    });

    return requests.length;
}
