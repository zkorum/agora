import { and, asc, eq, exists, isNotNull, isNull, sql } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    opinionContentTable,
    opinionTable,
    opinionModerationTable,
    rankingItemContentTable,
    rankingItemTable,
    userTable,
    conversationTable,
    rankingConversationConfigTable,
} from "@/shared-backend/schema.js";
import type { GetConversationForEditResponse } from "@/shared/types/dto.js";
import type {
    ConversationType,
    DisplayedOpinionItem,
    EventSlug,
    ParticipationMode,
} from "@/shared/types/zod.js";
import {
    normalizeUserRichTextInput,
    type NormalizedUserRichText,
} from "./richText.js";
import type { UpdateConversationResponse } from "@/shared/types/dto.js";
import {
    type ContentLanguageMetadata,
    type ContentLanguageMetadataResolver,
} from "./contentLanguageMetadata.js";
import { postNewOpinion } from "./comment.js";
import { getOpinionEditingAvailability } from "./opinionPermissions.js";
import { getOpinionIdsWithBlockingVotes } from "./opinionVoteEligibility.js";
import { createRankingItem } from "./rankingItem.js";
import { lockRankingScoringConfig } from "./maxdiff.js";
import type { RankingItemContentSource } from "./contentTranslation.js";
import { rankingSeedHasVotes } from "./seedOpinionEditability.js";
const LANGUAGE_DETECTION_BATCH_SIZE = 5;

export function normalizeSeedOpinionList(
    opinions: readonly string[],
):
    | { success: true; opinions: NormalizedUserRichText[] }
    | Extract<UpdateConversationResponse, { reason: "invalid_seed_opinion" }> {
    const normalized: NormalizedUserRichText[] = [];
    for (const [index, html] of opinions.entries()) {
        const result = normalizeUserRichTextInput({
            html,
            validationMode: "opinion",
        });
        if (!result.success)
            return {
                success: false,
                reason: "invalid_seed_opinion",
                seedOpinionFailure: {
                    index,
                    reason: result.reason,
                    count: result.count,
                    limit: result.limit,
                },
            };
        normalized.push(result.content);
    }
    return { success: true, opinions: normalized };
}

export async function appendConversationSeedOpinions({
    db,
    opinions,
    conversation,
    userId,
    resolveLanguageMetadata,
    useGoogleLanguageDetection,
    now,
}: {
    db: PostgresJsDatabase;
    opinions: readonly NormalizedUserRichText[];
    conversation: {
        id: number;
        slugId: string;
        contentId: number;
        conversationType: ConversationType;
        isIndexed: boolean;
        participationMode: ParticipationMode;
        isClosed: boolean;
        requiresEventTicket: EventSlug | undefined;
    };
    userId: string;
    resolveLanguageMetadata: ContentLanguageMetadataResolver;
    useGoogleLanguageDetection: boolean;
    now: Date;
}): Promise<{
    addedSeedOpinions: ConversationSeedOpinion[];
    addedOpinions: DisplayedOpinionItem[];
    rankingItemSources: RankingItemContentSource[];
}> {
    const addedSeedOpinions: ConversationSeedOpinion[] = [];
    const addedOpinions: DisplayedOpinionItem[] = [];
    const rankingItemSources: RankingItemContentSource[] = [];
    if (opinions.length === 0)
        return { addedSeedOpinions, addedOpinions, rankingItemSources };

    // Bound provider concurrency and resolve languages before the sequential persistence loop.
    // Prepared content is reused by both persisters instead of sanitizing/detecting it again.
    const prepared: (NormalizedUserRichText & {
        sourceLanguageMetadata: ContentLanguageMetadata;
    })[] = [];
    for (
        let offset = 0;
        offset < opinions.length;
        offset += LANGUAGE_DETECTION_BATCH_SIZE
    ) {
        const batch = await Promise.all(
            opinions
                .slice(offset, offset + LANGUAGE_DETECTION_BATCH_SIZE)
                .map(async (content) => ({
                    ...content,
                    sourceLanguageMetadata: await resolveLanguageMetadata({
                        text: content.plainText,
                        useGoogleLanguageDetection,
                    }),
                })),
        );
        prepared.push(...batch);
    }
    if (conversation.conversationType === "ranking") {
        await lockRankingScoringConfig({ db, conversationId: conversation.id });
        for (const content of prepared) {
            const item = await createRankingItem({
                db,
                tx: db,
                conversationId: conversation.id,
                conversationSlugId: conversation.slugId,
                conversationContentId: conversation.contentId,
                authorId: userId,
                isSeed: true,
                normalizedContent: {
                    title: content.html,
                    bodyHtml: null,
                    bodyPlainText: null,
                    sourceLanguageMetadata: content.sourceLanguageMetadata,
                },
            });
            addedSeedOpinions.push({
                slugId: item.slugId,
                content: item.contentSource.title,
            });
            rankingItemSources.push(item.contentSource);
        }
        await db
            .update(rankingConversationConfigTable)
            .set({
                itemCount: sql`${rankingConversationConfigTable.itemCount} + ${addedSeedOpinions.length}`,
                totalItemCount: sql`${rankingConversationConfigTable.totalItemCount} + ${addedSeedOpinions.length}`,
                updatedAt: now,
            })
            .from(conversationTable)
            .where(
                and(
                    eq(conversationTable.id, conversation.id),
                    eq(
                        rankingConversationConfigTable.id,
                        conversationTable.rankingConfigId,
                    ),
                ),
            );
    } else {
        const author = (
            await db
                .select({ username: userTable.username })
                .from(userTable)
                .where(eq(userTable.id, userId))
                .limit(1)
        ).at(0);
        if (author === undefined)
            throw httpErrors.notFound("Seed statement author not found");
        for (const content of prepared) {
            const opinion = await postNewOpinion({
                db,
                tx: db,
                normalizedContent: content,
                conversationSlugId: conversation.slugId,
                now,
                isSeed: true,
                useGoogleLanguageDetection,
                conversationMetadata: {
                    conversationId: conversation.id,
                    conversationContentId: conversation.contentId,
                    conversationAuthorId: userId,
                    conversationAuthorUsername: author.username,
                    conversationIsIndexed: conversation.isIndexed,
                    conversationParticipationMode:
                        conversation.participationMode,
                    conversationIsClosed: conversation.isClosed,
                    requiresEventTicket:
                        conversation.requiresEventTicket ?? null,
                },
            });
            addedSeedOpinions.push({
                slugId: opinion.opinionSlugId,
                content: opinion.opinionItem.opinion,
            });
            addedOpinions.push(opinion.displayedOpinionItem);
        }
    }
    return { addedSeedOpinions, addedOpinions, rankingItemSources };
}

type ConversationSeedOpinion = NonNullable<
    Extract<UpdateConversationResponse, { success: true }>["addedSeedOpinions"]
>[number];
type EditableSeedOpinion = Extract<
    GetConversationForEditResponse,
    { success: true }
>["seedOpinions"][number];

export async function fetchConversationSeedOpinions({
    db,
    conversationId,
    conversationType,
    externalSourceManaged = false,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    conversationType: ConversationType;
    externalSourceManaged?: boolean;
}): Promise<EditableSeedOpinion[]> {
    if (conversationType === "ranking") {
        const hasVotes = await rankingSeedHasVotes({
            db,
            conversationId,
            slugId: rankingItemTable.slugId,
        });
        const opinions = await db
            .select({
                slugId: rankingItemTable.slugId,
                content: rankingItemContentTable.title,
                sourceVersion: rankingItemContentTable.publicId,
                hasVotes,
            })
            .from(rankingItemTable)
            .innerJoin(
                rankingItemContentTable,
                eq(
                    rankingItemContentTable.id,
                    rankingItemTable.currentContentId,
                ),
            )
            .where(
                and(
                    eq(rankingItemTable.conversationId, conversationId),
                    externalSourceManaged
                        ? undefined
                        : eq(rankingItemTable.isSeed, true),
                    isNotNull(rankingItemTable.currentContentId),
                ),
            )
            .orderBy(asc(rankingItemTable.id));
        return opinions.map(({ hasVotes, ...opinion }) => ({
            ...opinion,
            editing: getOpinionEditingAvailability({
                canManage: !externalSourceManaged,
                isImporting: false,
                isLocked: false,
                isHidden: false,
                hasVotes,
            }),
        }));
    }
    const opinions = await db
        .select({
            id: opinionTable.id,
            slugId: opinionTable.slugId,
            content: opinionContentTable.content,
            sourceVersion: opinionContentTable.publicId,
            isHidden: exists(
                db
                    .select({ id: opinionModerationTable.id })
                    .from(opinionModerationTable)
                    .where(
                        and(
                            eq(
                                opinionModerationTable.opinionId,
                                opinionTable.id,
                            ),
                            eq(opinionModerationTable.moderationAction, "hide"),
                            isNull(opinionModerationTable.deletedAt),
                        ),
                    ),
            ).mapWith(Boolean),
        })
        .from(opinionTable)
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                eq(opinionTable.isSeed, true),
                isNotNull(opinionTable.currentContentId),
                eq(userTable.isDeleted, false),
            ),
        )
        .orderBy(asc(opinionTable.id));
    const blockedIds = await getOpinionIdsWithBlockingVotes({
        db,
        conversationId,
        opinionIds: opinions.map((opinion) => opinion.id),
    });
    return opinions.map(({ id, isHidden, ...opinion }) => ({
        ...opinion,
        editing: getOpinionEditingAvailability({
            canManage: true,
            isImporting: false,
            isLocked: false,
            isHidden,
            hasVotes: blockedIds.has(id),
        }),
    }));
}
