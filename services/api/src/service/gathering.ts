import { httpErrors } from "@fastify/sensible";
import {
    and,
    count,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    lt,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { z } from "zod";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import {
    conversationTable,
    userTable,
    gatheringConfigTable,
    gatheringResponseTable,
    gatheringResponseContentTable,
    gatheringModerationTable,
} from "@/shared-backend/schema.js";
import type { Dto } from "@/shared/types/dto.js";
import { parseGatheringAnswers } from "@/shared/gathering.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import {
    checkConversationParticipation,
    checkConversationParticipationWithDeviceStatus,
} from "./participationGate.js";
import { useCommonPost } from "./common.js";
import { fetchCurrentConversationTypeSettings } from "./conversationTypeConfig.js";
import { queueConversationSettingsUpdatedEvent } from "./realtimeEventOutbox.js";
import { gatheringOwnResponseCondition } from "./gatheringEligibility.js";
import {
    insertGatheringResponse,
    readGatheringAnswersByContentId,
    saveGatheringVersion,
} from "./gatheringPersistence.js";
import {
    lockGatheringIdentity,
    lockGatheringConversation,
    getGatheringPermissions,
    readGatheringFormat,
    loadGatheringContext,
    gatheringResponseVisibilityCondition,
} from "./gatheringAccess.js";
import { buildGatheringDisplayContent } from "./gatheringTranslationDisplay.js";
import { createEagerGatheringTranslationWork } from "./gatheringTranslationScheduling.js";
import {
    originalContentDisplayRequest,
    type ContentDisplayRequest,
} from "./displayContent.js";
import { resolveConversationTranslationDisplayPreferences } from "./conversationTranslationDisplay.js";

type Response = typeof gatheringResponseTable.$inferSelect;
type Answers = z.infer<typeof Dto.gatheringResponse>["answers"];
interface Context {
    db: PostgresJsDatabase;
    didWrite: string | undefined;
    displayPreferences?: ContentDisplayRequest;
}

async function displayResponse({
    tx,
    response,
    userId,
    contentId,
    conversationSlugId,
    displayPreferences = originalContentDisplayRequest,
    permitsTranslation = false,
}: {
    tx: PostgresTransaction;
    response: Response;
    userId: string | undefined;
    contentId: number;
    conversationSlugId: string;
    displayPreferences?: ContentDisplayRequest;
    permitsTranslation?: boolean;
}): Promise<z.infer<typeof Dto.gatheringResponse>> {
    const displayed = (
        await displayResponses({
            tx,
            userId,
            versions: [{ response, contentId }],
            conversationSlugId,
            displayPreferences,
            permitsTranslation,
        })
    ).at(0);
    if (displayed === undefined)
        throw httpErrors.notFound("Response not found");
    return displayed;
}

async function displayResponses({
    tx,
    versions,
    userId,
    conversationSlugId,
    displayPreferences = originalContentDisplayRequest,
    permitsTranslation = false,
}: {
    tx: PostgresTransaction;
    versions: { response: Response; contentId: number }[];
    userId: string | undefined;
    conversationSlugId: string;
    displayPreferences?: ContentDisplayRequest;
    permitsTranslation?: boolean;
}): Promise<z.infer<typeof Dto.gatheringResponse>[]> {
    if (versions.length === 0) return [];
    const contentIds = [
        ...new Set(
            versions.flatMap(({ response, contentId }) =>
                response.baselineContentId === null
                    ? [contentId]
                    : [contentId, response.baselineContentId],
            ),
        ),
    ];
    const contents = await tx
        .select()
        .from(gatheringResponseContentTable)
        .where(inArray(gatheringResponseContentTable.id, contentIds));
    const contentsById = new Map(
        contents.map((content) => [content.id, content]),
    );
    const answersByContent = await readGatheringAnswersByContentId({
        tx,
        contentIds,
    });
    const authorIds = [
        ...new Set(
            versions.flatMap(({ response }) =>
                response.authorId === null ? [] : [response.authorId],
            ),
        ),
    ];
    const authors =
        authorIds.length === 0
            ? []
            : await tx
                  .select({ id: userTable.id, username: userTable.username })
                  .from(userTable)
                  .where(
                      and(
                          inArray(userTable.id, authorIds),
                          eq(userTable.isDeleted, false),
                      ),
                  );
    const authorsById = new Map(
        authors.map((author) => [author.id, author.username]),
    );
    const responsesById = new Map(
        versions.map(({ response }) => [response.id, response]),
    );
    const preferences = await resolveConversationTranslationDisplayPreferences({
        tx,
        conversationSlugId,
        request: permitsTranslation
            ? displayPreferences
            : originalContentDisplayRequest,
    });
    const display = await buildGatheringDisplayContent({
        tx,
        preferences,
        responses: contents.map((content) => {
            const answers = answersByContent.get(content.id);
            if (answers === undefined || answers.length === 0)
                throw httpErrors.serviceUnavailable(
                    "Gathering content unavailable",
                );
            const response = responsesById.get(content.responseId);
            return {
                contentId: content.id,
                sourceVersion: content.publicId,
                answers,
                permitsTranslation:
                    permitsTranslation &&
                    response !== undefined &&
                    response.moderation !== "hide",
            };
        }),
    });
    return versions.map(({ response, contentId }) => {
        const content = contentsById.get(contentId);
        if (content?.responseId !== response.id)
            throw httpErrors.notFound("Response not found");
        const displayContent = display.responses.get(contentId)?.display;
        if (displayContent === undefined)
            throw httpErrors.notFound("Response not found");
        const baseline =
            response.baselineContentId === null
                ? undefined
                : contentsById.get(response.baselineContentId);
        const baselineDisplayContent =
            baseline === undefined
                ? undefined
                : display.responses.get(baseline.id)?.display;
        return {
            responseSlugId: response.slugId,
            sourceVersion: content.publicId,
            isSeed: response.isSeed,
            isOwn: !response.isSeed && response.authorId === userId,
            authorUsername:
                response.authorId === null
                    ? undefined
                    : authorsById.get(response.authorId),
            moderation: response.moderation ?? undefined,
            answers: answersByContent.get(contentId) ?? [],
            displayContent,
            savedAt: content.createdAt,
            baseline:
                baseline === undefined || baselineDisplayContent === undefined
                    ? undefined
                    : {
                          sourceVersion: baseline.publicId,
                          answers: answersByContent.get(baseline.id) ?? [],
                          displayContent: baselineDisplayContent,
                      },
        };
    });
}

export async function loadGathering({
    db,
    didWrite,
    conversationSlugId,
    displayPreferences = originalContentDisplayRequest,
}: Context & {
    conversationSlugId: string;
}): Promise<z.infer<typeof Dto.gatheringLoadResponse>> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const { conversation } = await loadGatheringContext({
            tx,
            didWrite,
            conversationSlugId,
            accessMode: "read",
        });
        const responseFormat = await readGatheringFormat({
            tx,
            configId: conversation.config.id,
        });
        const display = await buildGatheringDisplayContent({
            tx,
            fields: responseFormat,
            preferences: await resolveConversationTranslationDisplayPreferences(
                {
                    tx,
                    conversationSlugId,
                    request: displayPreferences,
                },
            ),
        });
        return {
            gatheringMode: conversation.config.gatheringMode,
            allowNewResponses: conversation.config.allowNewResponses,
            responseVisibility: conversation.config.responseVisibility,
            responseFormat,
            fieldDisplayContent: responseFormat.map(({ fieldId }) => {
                const displayContent = display.fields.get(fieldId)?.display;
                if (displayContent === undefined)
                    throw httpErrors.notFound("Field not found");
                return { fieldId, displayContent };
            }),
            isClosed: conversation.isClosed,
        };
    });
}

export async function listGatheringResponses({
    db,
    didWrite,
    request,
    displayPreferences,
}: Context & {
    request: z.infer<typeof Dto.gatheringListRequest>;
}): Promise<z.infer<typeof Dto.gatheringListResponse>> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const ctx = await loadGatheringContext({
            tx,
            didWrite,
            conversationSlugId: request.conversationSlugId,
            accessMode: "read",
        });
        const conditions = and(
            gatheringResponseVisibilityCondition({ ...ctx, tx }),
            request.view === "own"
                ? gatheringOwnResponseCondition(ctx.userId)
                : undefined,
            request.view === "moderation"
                ? isNotNull(gatheringResponseTable.moderation)
                : request.view === "own"
                  ? undefined
                  : isNull(gatheringResponseTable.moderation),
        );
        const counts = (
            await tx
                .select({
                    accessibleCount: count(),
                    // PostgreSQL filtered aggregates compute both counts in one scan.
                    participantResponseCount:
                        sql<number>`count(*) filter (where ${eq(gatheringResponseTable.isSeed, false)})`.mapWith(
                            Number,
                        ),
                })
                .from(gatheringResponseTable)
                .where(conditions)
        ).at(0);
        const rows = await tx
            .select()
            .from(gatheringResponseTable)
            .where(
                and(
                    conditions,
                    request.beforeResponseId === undefined
                        ? undefined
                        : lt(
                              gatheringResponseTable.id,
                              request.beforeResponseId,
                          ),
                ),
            )
            .orderBy(desc(gatheringResponseTable.id))
            .limit(request.limit + 1);
        const page = rows.slice(0, request.limit);
        const responses = await displayResponses({
            tx,
            conversationSlugId: request.conversationSlugId,
            userId: ctx.userId,
            displayPreferences,
            permitsTranslation:
                ctx.conversation.config.responseVisibility === "everyone",
            versions: page.flatMap((response) =>
                response.currentContentId === null
                    ? []
                    : [{ response, contentId: response.currentContentId }],
            ),
        });
        return {
            responses,
            accessibleCount: counts?.accessibleCount ?? 0,
            participantResponseCount: counts?.participantResponseCount ?? 0,
            nextCursor:
                rows.length > request.limit ? page.at(-1)?.id : undefined,
        };
    });
}

async function readAccessibleResponse({
    tx,
    ctx,
    responseSlugId,
}: {
    tx: PostgresTransaction;
    ctx: Awaited<ReturnType<typeof loadGatheringContext>>;
    responseSlugId: string;
}) {
    const response = (
        await tx
            .select()
            .from(gatheringResponseTable)
            .where(
                and(
                    gatheringResponseVisibilityCondition({ ...ctx, tx }),
                    eq(gatheringResponseTable.slugId, responseSlugId),
                ),
            )
    ).at(0);
    if (response?.currentContentId == null)
        throw httpErrors.notFound("Response not found");
    return { ...response, currentContentId: response.currentContentId };
}

export async function readGatheringResponse({
    db,
    didWrite,
    request,
    displayPreferences,
}: Context & {
    request: z.infer<typeof Dto.gatheringReadRequest>;
}): Promise<z.infer<typeof Dto.gatheringResponse>> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const ctx = await loadGatheringContext({
            tx,
            didWrite,
            conversationSlugId: request.conversationSlugId,
            accessMode: "read",
        });
        const response = await readAccessibleResponse({
            tx,
            ctx,
            responseSlugId: request.responseSlugId,
        });
        return await displayResponse({
            tx,
            conversationSlugId: request.conversationSlugId,
            response,
            userId: ctx.userId,
            contentId: response.currentContentId,
            displayPreferences,
            permitsTranslation:
                ctx.conversation.config.responseVisibility === "everyone",
        });
    });
}

export async function readGatheringResponseHistory({
    db,
    didWrite,
    request,
    displayPreferences,
}: Context & {
    request: z.infer<typeof Dto.gatheringHistoryRequest>;
}): Promise<z.infer<typeof Dto.gatheringHistoryResponse>> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const ctx = await loadGatheringContext({
            tx,
            didWrite,
            conversationSlugId: request.conversationSlugId,
            accessMode: "read",
        });
        const response = await readAccessibleResponse({
            tx,
            ctx,
            responseSlugId: request.responseSlugId,
        });
        const { beforeSourceVersion, limit } = request;
        const before =
            beforeSourceVersion === undefined
                ? undefined
                : (
                      await tx
                          .select({ id: gatheringResponseContentTable.id })
                          .from(gatheringResponseContentTable)
                          .where(
                              and(
                                  eq(
                                      gatheringResponseContentTable.responseId,
                                      response.id,
                                  ),
                                  eq(
                                      gatheringResponseContentTable.publicId,
                                      beforeSourceVersion,
                                  ),
                              ),
                          )
                  ).at(0);
        if (beforeSourceVersion !== undefined && before === undefined)
            throw httpErrors.notFound("Version not found");
        const versions = await tx
            .select({ id: gatheringResponseContentTable.id })
            .from(gatheringResponseContentTable)
            .where(
                and(
                    eq(gatheringResponseContentTable.responseId, response.id),
                    before === undefined
                        ? undefined
                        : lt(gatheringResponseContentTable.id, before.id),
                ),
            )
            .orderBy(desc(gatheringResponseContentTable.id))
            .limit(limit);
        return await displayResponses({
            tx,
            conversationSlugId: request.conversationSlugId,
            userId: ctx.userId,
            displayPreferences,
            permitsTranslation:
                ctx.conversation.config.responseVisibility === "everyone",
            versions: versions.map((version) => ({
                response,
                contentId: version.id,
            })),
        });
    });
}

export async function saveGatheringResponse({
    db,
    didWrite,
    request,
    userAgent,
    currentDisplayLanguage,
}: {
    db: PostgresJsDatabase;
    didWrite: string;
    request: z.infer<typeof Dto.gatheringSaveRequest>;
    userAgent: string;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}) {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const now = new Date();
        const admission = {
            db: tx,
            didWrite,
            conversationSlugId: request.conversationSlugId,
            userAgent,
            now,
            currentDisplayLanguage,
            requireCompletedSurvey: false,
        };
        let identity = await lockGatheringIdentity({ tx, didWrite });
        if (identity === undefined) {
            if (request.change.action !== "submit")
                throw httpErrors.unauthorized();
            const initial = await checkConversationParticipation(admission);
            if (!initial.success) throw httpErrors.forbidden(initial.reason);
            identity = await lockGatheringIdentity({ tx, didWrite });
        }
        if (identity === undefined) throw httpErrors.unauthorized();
        const conversation = await lockGatheringConversation({
            tx,
            conversationSlugId: request.conversationSlugId,
            accessMode: "write",
        });
        if (conversation.isClosed)
            throw httpErrors.forbidden("Conversation closed");
        if (
            await useCommonPost().isConversationIdLocked({
                db: tx,
                conversationId: conversation.id,
            })
        ) {
            throw httpErrors.forbidden("Conversation locked");
        }
        const userId = identity.userId;
        const access = await getGatheringPermissions({
            tx,
            userId,
            projectId: conversation.projectId,
        });
        const format = await readGatheringFormat({
            tx,
            configId: conversation.config.id,
        });
        let answers: Answers;
        try {
            answers = parseGatheringAnswers({
                format,
                answers: request.change.answers,
            });
        } catch {
            throw httpErrors.badRequest("Invalid Gathering answers");
        }
        let response: Response & { currentContentId: number };
        const change = request.change;
        if (change.action === "edit") {
            const existing = (
                await tx
                    .select()
                    .from(gatheringResponseTable)
                    .where(
                        and(
                            eq(
                                gatheringResponseTable.conversationId,
                                conversation.id,
                            ),
                            eq(
                                gatheringResponseTable.slugId,
                                change.responseSlugId,
                            ),
                            isNull(gatheringResponseTable.deletedAt),
                            isNull(gatheringResponseTable.accountHiddenAt),
                        ),
                    )
            ).at(0);
            if (existing?.currentContentId == null)
                throw httpErrors.notFound("Response not found");
            if (
                existing.isSeed ? !access.canEdit : existing.authorId !== userId
            )
                throw httpErrors.forbidden();
            if (!existing.isSeed) {
                const allowed =
                    await checkConversationParticipationWithDeviceStatus({
                        ...admission,
                        deviceStatus: identity,
                    });
                if (!allowed.success)
                    throw httpErrors.forbidden(allowed.reason);
            }
            if (existing.moderation === "hide" && !access.isSiteModerator)
                throw httpErrors.forbidden();
            const current = (
                await tx
                    .select()
                    .from(gatheringResponseContentTable)
                    .where(
                        eq(
                            gatheringResponseContentTable.id,
                            existing.currentContentId,
                        ),
                    )
            ).at(0);
            if (current?.publicId !== change.sourceVersion)
                throw httpErrors.conflict("Response changed");
            const previous = (
                await readGatheringAnswersByContentId({
                    tx,
                    contentIds: [current.id],
                })
            ).get(current.id);
            if (
                previous?.length === answers.length &&
                previous.every(
                    (answer, index) =>
                        answer.fieldId === answers[index]?.fieldId &&
                        answer.value === answers[index]?.value,
                )
            )
                return await displayResponse({
                    tx,
                    conversationSlugId: request.conversationSlugId,
                    response: existing,
                    userId,
                    contentId: current.id,
                });
            const content = await saveGatheringVersion({
                tx,
                response: existing,
                answers,
            });
            response = { ...existing, currentContentId: content.id };
        } else {
            const isSeed = change.action === "seed";
            if (isSeed && !access.canEdit) throw httpErrors.forbidden();
            if (!isSeed) {
                const allowed =
                    await checkConversationParticipationWithDeviceStatus({
                        ...admission,
                        deviceStatus: identity,
                    });
                if (!allowed.success)
                    throw httpErrors.forbidden(allowed.reason);
                if (!conversation.config.allowNewResponses)
                    throw httpErrors.forbidden("New responses disabled");
                const existing = await tx
                    .select({ id: gatheringResponseTable.id })
                    .from(gatheringResponseTable)
                    .where(
                        and(
                            eq(
                                gatheringResponseTable.conversationId,
                                conversation.id,
                            ),
                            eq(gatheringResponseTable.authorId, userId),
                            eq(gatheringResponseTable.isSeed, false),
                        ),
                    )
                    .limit(1);
                if (existing.length > 0)
                    throw httpErrors.conflict("Response already exists");
            }
            response = (
                await insertGatheringResponse({
                    tx,
                    conversationId: conversation.id,
                    configId: conversation.config.id,
                    owner: isSeed
                        ? { isSeed: true, authorId: null }
                        : { isSeed: false, authorId: userId },
                    answers,
                })
            ).response;
        }
        await tx
            .update(conversationTable)
            .set({ lastReactedAt: now })
            .where(eq(conversationTable.id, conversation.id));
        await createEagerGatheringTranslationWork({
            tx,
            conversationSlugId: request.conversationSlugId,
            now,
            scope: { kind: "response", contentId: response.currentContentId },
        });
        return await displayResponse({
            tx,
            conversationSlugId: request.conversationSlugId,
            response,
            userId,
            contentId: response.currentContentId,
        });
    });
}

export async function deleteGatheringResponse({
    db,
    didWrite,
    request,
}: Context & {
    request: z.infer<typeof Dto.gatheringDeleteRequest>;
}): Promise<z.infer<typeof Dto.gatheringSuccessResponse>> {
    await getPrimaryDatabase(db).transaction(async (tx) => {
        const ctx = await loadGatheringContext({
            tx,
            didWrite,
            conversationSlugId: request.conversationSlugId,
            accessMode: "write",
        });
        if (ctx.userId === undefined) throw httpErrors.unauthorized();
        const response = (
            await tx
                .select()
                .from(gatheringResponseTable)
                .where(
                    and(
                        eq(
                            gatheringResponseTable.conversationId,
                            ctx.conversation.id,
                        ),
                        eq(
                            gatheringResponseTable.slugId,
                            request.responseSlugId,
                        ),
                        isNull(gatheringResponseTable.deletedAt),
                        isNull(gatheringResponseTable.accountHiddenAt),
                    ),
                )
        ).at(0);
        if (response?.currentContentId == null)
            throw httpErrors.notFound("Response not found");
        if (
            response.isSeed
                ? !ctx.access.canEdit
                : response.authorId !== ctx.userId
        )
            throw httpErrors.forbidden();
        const content = (
            await tx
                .select({ publicId: gatheringResponseContentTable.publicId })
                .from(gatheringResponseContentTable)
                .where(
                    eq(
                        gatheringResponseContentTable.id,
                        response.currentContentId,
                    ),
                )
        ).at(0);
        if (content?.publicId !== request.sourceVersion)
            throw httpErrors.conflict("Response changed");
        // Keep the root/author uniqueness; every reader excludes this root and all its versions.
        await tx
            .update(gatheringResponseTable)
            .set({ deletedAt: new Date(), currentContentId: null })
            .where(eq(gatheringResponseTable.id, response.id));
    });
    return { success: true };
}

export async function moderateGatheringResponse({
    db,
    didWrite,
    request,
}: Context & {
    request: z.infer<typeof Dto.gatheringModerateRequest>;
}): Promise<z.infer<typeof Dto.gatheringSuccessResponse>> {
    await getPrimaryDatabase(db).transaction(async (tx) => {
        const ctx = await loadGatheringContext({
            tx,
            didWrite,
            conversationSlugId: request.conversationSlugId,
            accessMode: "write",
        });
        if (ctx.userId === undefined || !ctx.access.canModerate)
            throw httpErrors.forbidden();
        const response = (
            await tx
                .select()
                .from(gatheringResponseTable)
                .where(
                    and(
                        gatheringResponseVisibilityCondition({
                            ...ctx,
                            tx,
                            moderating: true,
                        }),
                        eq(
                            gatheringResponseTable.slugId,
                            request.responseSlugId,
                        ),
                    ),
                )
        ).at(0);
        if (response === undefined)
            throw httpErrors.notFound("Response not found");
        await tx.insert(gatheringModerationTable).values({
            responseId: response.id,
            moderatorId: ctx.userId,
            action: request.action,
            reason: request.reason,
        });
        await tx
            .update(gatheringResponseTable)
            .set({
                moderation:
                    request.action === "restore" ? null : request.action,
            })
            .where(eq(gatheringResponseTable.id, response.id));
    });
    return { success: true };
}

export async function updateGatheringSettings({
    db,
    didWrite,
    request,
}: Context & {
    request: z.infer<typeof Dto.gatheringSettingsRequest>;
}): Promise<z.infer<typeof Dto.gatheringSuccessResponse>> {
    await getPrimaryDatabase(db).transaction(async (tx) => {
        const ctx = await loadGatheringContext({
            tx,
            didWrite,
            conversationSlugId: request.conversationSlugId,
            accessMode: "write",
        });
        if (!ctx.access.canEdit) throw httpErrors.forbidden();
        if (
            ctx.conversation.config.allowNewResponses ===
            request.allowNewResponses
        )
            return;
        await tx
            .update(gatheringConfigTable)
            .set({ allowNewResponses: request.allowNewResponses })
            .where(eq(gatheringConfigTable.id, ctx.conversation.config.id));
        await queueConversationSettingsUpdatedEvent({
            db: tx,
            conversationSlugId: request.conversationSlugId,
            settings: {
                ...(await fetchCurrentConversationTypeSettings({
                    db: tx,
                    conversationId: ctx.conversation.id,
                })),
                isIndexed: ctx.conversation.isIndexed,
                participationMode: ctx.conversation.participationMode,
                isClosed: ctx.conversation.isClosed,
                isFinalizing: false,
                gathering: { allowNewResponses: request.allowNewResponses },
            },
        });
    });
    return { success: true };
}
