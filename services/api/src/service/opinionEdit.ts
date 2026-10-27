import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { z } from "zod";
import type { Script } from "@valkey/valkey-glide";
import { log } from "@/app.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { scheduleConversationAnalysisRefresh } from "@/shared-backend/conversationCounters.js";
import {
    conversationTable,
    conversationModerationTable,
    opinionTable,
    opinionContentTable,
    opinionModerationTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import type {
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import { Dto } from "@/shared/types/dto.js";
import { fetchOpinionsByOpinionSlugIdList } from "./comment.js";
import {
    type ContentLanguageMetadata,
    contentLanguageMetadataUpdateValues,
    resolveContentLanguageMetadata,
} from "./contentLanguageMetadata.js";
import {
    createEagerContentTranslationWorkForOpinion,
    enqueueEagerContentTranslationWork,
} from "./contentTranslation.js";
import { getConversationMultilingualSetting } from "./conversationMultilingual.js";
import { createConversationViewSnapshotsFromCurrentState } from "./conversationViewSnapshot.js";
import {
    canManageOpinion,
    getOpinionEditingAvailability,
    hasBlockingOpinionVotes,
} from "./opinionPermissions.js";
import { queueOpinionUpdatedEvent } from "./realtimeEventOutbox.js";
import { normalizeUserRichTextInput } from "./richText.js";
import type { VoteBuffer } from "./voteBuffer.js";

type EditOpinionResponse = z.infer<typeof Dto.editOpinionResponse>;
type EditOpinionFailure = Extract<EditOpinionResponse, { success: false }>;

async function loadOpinion({
    db,
    opinionSlugId,
}: {
    db: PostgresJsDatabase;
    opinionSlugId: string;
}) {
    const rows = await db
        .select({
            id: opinionTable.id,
            slugId: opinionTable.slugId,
            authorId: opinionTable.authorId,
            isSeed: opinionTable.isSeed,
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
            projectId: conversationTable.projectId,
            conversationContentId: conversationTable.currentContentId,
            isImporting: conversationTable.isImporting,
            sourceVersion: opinionContentTable.publicId,
            content: opinionContentTable.content,
            conversationLocked: conversationModerationTable.id,
            moderationAction: opinionModerationTable.moderationAction,
        })
        .from(opinionTable)
        .innerJoin(
            opinionContentTable,
            and(
                eq(opinionContentTable.id, opinionTable.currentContentId),
                eq(opinionContentTable.opinionId, opinionTable.id),
            ),
        )
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .leftJoin(
            conversationModerationTable,
            and(
                eq(
                    conversationModerationTable.conversationId,
                    conversationTable.id,
                ),
                isNull(conversationModerationTable.deletedAt),
            ),
        )
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(opinionTable.slugId, opinionSlugId),
                eq(userTable.isDeleted, false),
            ),
        )
        .limit(1);
    return rows.at(0);
}

type EditableOpinion = NonNullable<Awaited<ReturnType<typeof loadOpinion>>>;

async function validateEdit({
    db,
    opinion,
    userId,
    sourceVersion,
    voteBuffer,
    lockAuthorization = false,
}: {
    db: PostgresJsDatabase;
    opinion: EditableOpinion;
    userId: string;
    sourceVersion: string;
    voteBuffer: VoteBuffer;
    lockAuthorization?: boolean;
}): Promise<EditOpinionFailure | undefined> {
    if (opinion.conversationContentId === null || opinion.isImporting)
        return { success: false, reason: "not_found" };
    if (!(await canManageOpinion({ db, opinion, userId, lockAuthorization })))
        return { success: false, reason: "not_allowed" };
    if (opinion.sourceVersion !== sourceVersion)
        return { success: false, reason: "version_conflict" };
    const hasVotes =
        (await hasBlockingOpinionVotes({
            db,
            opinionId: opinion.id,
            conversationId: opinion.conversationId,
        })) ||
        (!lockAuthorization &&
            (await voteBuffer.hasBlockingVotes({
                db,
                opinionId: opinion.id,
                authorId: opinion.authorId,
                isSeed: opinion.isSeed,
            })));
    const editing = getOpinionEditingAvailability({
        canManage: true,
        isImporting: opinion.isImporting,
        isLocked: opinion.conversationLocked !== null,
        isHidden: opinion.moderationAction === "hide",
        hasVotes,
    });
    if (editing.allowed) return undefined;
    return {
        success: false,
        reason:
            editing.reason === "import_in_progress"
                ? "not_found"
                : editing.reason,
    };
}

type PreparedChange =
    | { readonly kind: "unchanged" }
    | { readonly kind: "changed"; readonly language: ContentLanguageMetadata };

export async function editOpinion({
    db,
    request,
    userId,
    voteBuffer,
    googleCloudCredentials,
    valkey,
    translationQueueScript,
    displayLanguage,
    spokenLanguages,
}: {
    db: PostgresJsDatabase;
    request: z.infer<typeof Dto.editOpinionRequest>;
    userId: string;
    voteBuffer: VoteBuffer;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    valkey: Valkey | undefined;
    translationQueueScript: Script;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): Promise<EditOpinionResponse> {
    const normalized = normalizeUserRichTextInput({
        html: request.opinionBody,
        validationMode: "opinion",
    });
    if (!normalized.success)
        return { success: false, reason: normalized.reason };
    const writer = getPrimaryDatabase(db);
    const initial = await loadOpinion({
        db: writer,
        opinionSlugId: request.opinionSlugId,
    });
    if (initial === undefined) return { success: false, reason: "not_found" };
    const rejection = await validateEdit({
        db: writer,
        opinion: initial,
        userId,
        sourceVersion: request.sourceVersion,
        voteBuffer,
    });
    if (rejection !== undefined) return rejection;

    // Detection can call a provider. Prepare it without holding statement or
    // conversation locks; the immutable source version is checked again below.
    const multilingual =
        normalized.content.html === initial.content
            ? undefined
            : await getConversationMultilingualSetting({
                  db: writer,
                  conversationId: initial.conversationId,
              });
    const prepared: PreparedChange =
        multilingual === undefined
            ? { kind: "unchanged" }
            : {
                  kind: "changed",
                  language: await resolveContentLanguageMetadata({
                      text: normalized.content.plainText,
                      googleCloudCredentials,
                      useGoogleLanguageDetection:
                          multilingual.dynamicTranslationEnabled,
                  }),
              };
    const blockedDuringSave = new Error(
        "Statement received votes while saving",
    );
    let result: { response: EditOpinionResponse; translationWorkIds: number[] };
    try {
        result = await writer.transaction(async (tx) => {
            // Match the vote-buffer lock order: conversation, then statement.
            await tx
                .select({ id: conversationTable.id })
                .from(conversationTable)
                .where(eq(conversationTable.id, initial.conversationId))
                .for("no key update");
            await tx
                .select({ id: opinionTable.id })
                .from(opinionTable)
                .where(
                    and(
                        eq(opinionTable.id, initial.id),
                        eq(opinionTable.conversationId, initial.conversationId),
                    ),
                )
                .for("update");
            const opinion = await loadOpinion({
                db: tx,
                opinionSlugId: request.opinionSlugId,
            });
            if (opinion === undefined)
                return {
                    response: {
                        success: false,
                        reason: "not_found",
                    } satisfies EditOpinionFailure,
                    translationWorkIds: [],
                };
            const failure = await validateEdit({
                db: tx,
                opinion,
                userId,
                sourceVersion: request.sourceVersion,
                voteBuffer,
                lockAuthorization: true,
            });
            if (failure !== undefined)
                return { response: failure, translationWorkIds: [] };
            if (opinion.conversationContentId === null)
                return {
                    response: {
                        success: false,
                        reason: "not_found",
                    } satisfies EditOpinionFailure,
                    translationWorkIds: [],
                };
            const translationWorkIds: number[] = [];
            if (prepared.kind === "changed") {
                const inserted = await tx
                    .insert(opinionContentTable)
                    .values({
                        opinionId: opinion.id,
                        conversationContentId: opinion.conversationContentId,
                        content: normalized.content.html,
                        contentPlainText: normalized.content.plainText,
                        isEdited: true,
                        editedByUserId: userId,
                        ...contentLanguageMetadataUpdateValues(
                            prepared.language,
                        ),
                    })
                    .returning({
                        id: opinionContentTable.id,
                        publicId: opinionContentTable.publicId,
                        createdAt: opinionContentTable.createdAt,
                    });
                const content = inserted.at(0);
                if (content === undefined)
                    throw new Error(
                        "Statement content insertion returned no row",
                    );
                await tx
                    .update(opinionTable)
                    .set({
                        currentContentId: content.id,
                        updatedAt: content.createdAt,
                    })
                    .where(eq(opinionTable.id, opinion.id));
                if (opinion.isSeed)
                    translationWorkIds.push(
                        ...(await createEagerContentTranslationWorkForOpinion({
                            db: tx,
                            source: {
                                conversationId: opinion.conversationId,
                                conversationSlugId: opinion.conversationSlugId,
                                opinionSlugId: opinion.slugId,
                                contentId: content.id,
                                publicId: content.publicId,
                                content: normalized.content.html,
                                ...prepared.language,
                            },
                            now: content.createdAt,
                            log,
                        })),
                    );
                await scheduleConversationAnalysisRefresh({
                    db: tx,
                    conversationId: opinion.conversationId,
                    log,
                });
                await createConversationViewSnapshotsFromCurrentState({
                    db: tx,
                    conversationId: opinion.conversationId,
                    viewReason: "conversation_content_updated",
                    emitCommentStatsRealtimeEvent: true,
                });
                await queueOpinionUpdatedEvent({
                    db: tx,
                    data: {
                        conversationSlugId: opinion.conversationSlugId,
                        opinionSlugId: opinion.slugId,
                        previousSourceVersion: opinion.sourceVersion,
                        sourceVersion: content.publicId,
                        opinion: normalized.content.html,
                        sourceLanguageCode:
                            prepared.language.sourceLanguageCode,
                        timestamp: Date.now(),
                    },
                });
            }
            // Reuse the localized mapper in the write transaction, including its
            // policy-derived translation controls, without a replica follow-up.
            const displayed = await fetchOpinionsByOpinionSlugIdList({
                db: tx,
                opinionSlugIdList: [opinion.slugId],
                displayContentViewerPreferences: {
                    viewerUserId: userId,
                    displayLanguage,
                    spokenLanguages,
                },
            });
            const saved = displayed.at(0);
            if (saved === undefined)
                throw new Error("Saved statement is not readable");
            if (
                prepared.kind === "changed" &&
                (await hasBlockingOpinionVotes({
                    db: tx,
                    opinionId: opinion.id,
                    conversationId: opinion.conversationId,
                }))
            ) {
                // A policy refusal after staging writes must abort the transaction.
                throw blockedDuringSave;
            }
            return {
                response: {
                    success: true,
                    displayedOpinionItem: saved,
                } satisfies EditOpinionResponse,
                translationWorkIds,
            };
        });
    } catch (error: unknown) {
        if (error === blockedDuringSave)
            return { success: false, reason: "has_votes" };
        throw error;
    }
    if (result.translationWorkIds.length > 0)
        await enqueueEagerContentTranslationWork({
            valkey,
            queueScript: translationQueueScript,
            workIds: result.translationWorkIds,
            now: new Date(),
            log,
        });
    return result.response;
}
