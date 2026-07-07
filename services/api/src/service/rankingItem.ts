import {
    rankingItemTable,
    rankingItemContentTable,
    rankingItemExternalSourceTable,
    conversationTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { generateRandomSlugId } from "@/crypto.js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { computeItemSnapshot } from "./maxdiff.js";
import type {
    MaxDiffItem,
    MaxDiffItemsFetchResponse,
} from "@/shared/types/dto.js";
import type { MaxdiffLifecycleStatus } from "@/shared/types/zod.js";
import {
    htmlToCountedText,
    processUserGeneratedHtml,
} from "@/shared-app-api/html.js";
import { log } from "@/app.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { requireProjectCapability } from "@/service/projectAccess.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    contentLanguageMetadataUpdateValues,
    resolveContentLanguageMetadata,
    type ContentLanguageMetadata,
} from "./contentLanguageMetadata.js";
import { normalizeUserRichTextInput } from "./richText.js";
import {
    buildRankingItemDisplayContentByContentId,
    type RankingItemDisplayPreferences,
} from "./rankingItemDisplay.js";
import type { RankingItemContentSource } from "./contentTranslation.js";

export interface NormalizedRankingItemContent {
    title: string;
    bodyHtml: string | null;
    bodyPlainText: string | null;
    sourceLanguageMetadata: ContentLanguageMetadata;
}

function buildRankingItemLanguageDetectionCorpus({
    title,
    bodyPlainText,
}: {
    title: string;
    bodyPlainText: string | null;
}): string {
    return [title, bodyPlainText]
        .map((text) => text?.trim() ?? "")
        .filter((text) => text.length > 0)
        .join("\n\n");
}

async function resolveRankingItemLanguageMetadata({
    title,
    bodyPlainText,
    googleCloudCredentials,
    useGoogleLanguageDetection,
}: {
    title: string;
    bodyPlainText: string | null;
    googleCloudCredentials?: GoogleCloudCredentials;
    useGoogleLanguageDetection: boolean;
}): Promise<ContentLanguageMetadata> {
    const corpus = buildRankingItemLanguageDetectionCorpus({
        title,
        bodyPlainText,
    });
    return await resolveContentLanguageMetadata({
        text: corpus,
        googleText: corpus,
        googleCloudCredentials,
        useGoogleLanguageDetection,
    });
}

export async function normalizeFrontendRankingItemContent({
    title,
    bodyHtml,
    bodyPlainText: frontendBodyPlainText,
    googleCloudCredentials,
    useGoogleLanguageDetection = false,
}: {
    title: string;
    bodyHtml?: string | null;
    bodyPlainText?: string | null;
    googleCloudCredentials?: GoogleCloudCredentials;
    useGoogleLanguageDetection?: boolean;
}): Promise<NormalizedRankingItemContent> {
    const normalizedTitle = title.trim();
    let sanitizedBodyHtml: string | null = null;
    let bodyPlainText: string | null = null;
    if (bodyHtml != null) {
        if (frontendBodyPlainText == null) {
            throw httpErrors.badRequest(
                "Ranking item body plain text is required when body HTML is provided",
            );
        }

        const normalizationResult = normalizeUserRichTextInput({
            html: bodyHtml,
            plainText: frontendBodyPlainText,
            validationMode: "ranking_item",
            logLabel: "[RankingItemPlainText] Frontend/backend plain text mismatch",
        });
        if (!normalizationResult.success) {
            throw httpErrors.badRequest(normalizationResult.reason);
        }

        sanitizedBodyHtml = normalizationResult.content.html;
        bodyPlainText = normalizationResult.content.plainText;
    }

    const normalizedBodyHtml =
        sanitizedBodyHtml !== null && sanitizedBodyHtml.trim() !== ""
            ? sanitizedBodyHtml
            : null;
    const normalizedBodyPlainText =
        normalizedBodyHtml !== null ? bodyPlainText : null;

    const sourceLanguageMetadata = await resolveRankingItemLanguageMetadata({
        title: normalizedTitle,
        bodyPlainText: normalizedBodyPlainText,
        googleCloudCredentials,
        useGoogleLanguageDetection,
    });

    return {
        title: normalizedTitle,
        bodyHtml: normalizedBodyHtml,
        bodyPlainText: normalizedBodyPlainText,
        sourceLanguageMetadata,
    };
}

export async function normalizeProviderRankingItemContent({
    title,
    bodyHtml,
    googleCloudCredentials,
    useGoogleLanguageDetection = false,
}: {
    title: string;
    bodyHtml?: string | null;
    googleCloudCredentials?: GoogleCloudCredentials;
    useGoogleLanguageDetection?: boolean;
}): Promise<NormalizedRankingItemContent> {
    const normalizedTitle = title.trim();
    const sanitizedBodyHtml =
        bodyHtml != null ? processUserGeneratedHtml(bodyHtml, true, "output") : null;
    const bodyPlainText =
        sanitizedBodyHtml !== null ? htmlToCountedText(sanitizedBodyHtml) : null;
    const sourceLanguageMetadata = await resolveRankingItemLanguageMetadata({
        title: normalizedTitle,
        bodyPlainText,
        googleCloudCredentials,
        useGoogleLanguageDetection,
    });

    return {
        title: normalizedTitle,
        bodyHtml: sanitizedBodyHtml,
        bodyPlainText,
        sourceLanguageMetadata,
    };
}

export function markRankingScoringDirty({
    valkey,
    conversationId,
    conversationSlugId,
}: {
    valkey: Valkey | undefined;
    conversationId: number;
    conversationSlugId: string;
}): void {
    if (valkey === undefined) return;
    const member = `${String(conversationId)}:${conversationSlugId}`;
    valkey
        .zadd(VALKEY_QUEUE_KEYS.SCORING_DIRTY_SOLIDAGO, { [member]: 0 })
        .catch((error: unknown) => {
            log.error(
                error,
                `[RankingItem] Failed to ZADD scoring:dirty:solidago for ${member}`,
            );
        });
}

interface CreateRankingItemCommonProps {
    db: PostgresDatabase;
    tx?: PostgresDatabase;
    conversationId: number;
    conversationSlugId: string;
    conversationContentId: number;
    authorId: string;
    title: string;
    isSeed: boolean;
    googleCloudCredentials?: GoogleCloudCredentials;
    useGoogleLanguageDetection?: boolean;
}

type CreateRankingItemProps = CreateRankingItemCommonProps &
    (
        | {
              contentSource?: "frontend";
              bodyHtml?: string | null;
              bodyPlainText?: string | null;
          }
        | {
              contentSource: "provider";
              bodyHtml?: string | null;
              bodyPlainText?: undefined;
          }
    );

async function createRankingItemInTx({
    tx,
    slugId,
    conversationId,
    conversationContentId,
    authorId,
    normalizedContent,
    isSeed,
    now,
}: {
    tx: PostgresDatabase;
    slugId: string;
    conversationId: number;
    conversationContentId: number;
    authorId: string;
    normalizedContent: NormalizedRankingItemContent;
    isSeed: boolean;
    now: Date;
}): Promise<{ itemId: number; contentId: number; contentPublicId: string }> {
    const itemRows = await tx
        .insert(rankingItemTable)
        .values({
            slugId,
            authorId,
            conversationId,
            isSeed,
            lifecycleStatus: "active",
            createdAt: now,
            updatedAt: now,
        })
        .returning({ id: rankingItemTable.id });
    const itemRow = itemRows.at(0);
    if (itemRow === undefined) {
        throw new Error("Failed to create ranking item");
    }

    const contentRows = await tx
        .insert(rankingItemContentTable)
        .values({
            rankingItemId: itemRow.id,
            conversationContentId,
            title: normalizedContent.title,
            body: normalizedContent.bodyHtml,
            bodyPlainText: normalizedContent.bodyPlainText,
            ...contentLanguageMetadataUpdateValues(
                normalizedContent.sourceLanguageMetadata,
            ),
            createdAt: now,
        })
        .returning({
            id: rankingItemContentTable.id,
            publicId: rankingItemContentTable.publicId,
        });
    const contentRow = contentRows.at(0);
    if (contentRow === undefined) {
        throw new Error("Failed to create ranking item content");
    }

    await tx
        .update(rankingItemTable)
        .set({ currentContentId: contentRow.id })
        .where(eq(rankingItemTable.id, itemRow.id));

    return {
        itemId: itemRow.id,
        contentId: contentRow.id,
        contentPublicId: contentRow.publicId,
    };
}

export async function createRankingItem({
    db,
    tx,
    conversationId,
    conversationSlugId,
    conversationContentId,
    authorId,
    title,
    bodyHtml,
    bodyPlainText,
    contentSource = "frontend",
    isSeed,
    googleCloudCredentials,
    useGoogleLanguageDetection,
}: CreateRankingItemProps): Promise<{
    slugId: string;
    itemId: number;
    contentSource: RankingItemContentSource;
}> {
    const slugId = generateRandomSlugId();
    const now = new Date();

    const normalizedContent =
        contentSource === "provider"
            ? await normalizeProviderRankingItemContent({
                  title,
                  bodyHtml,
                  googleCloudCredentials,
                  useGoogleLanguageDetection,
              })
            : await normalizeFrontendRankingItemContent({
                  title,
                  bodyHtml,
                  bodyPlainText,
                  googleCloudCredentials,
                  useGoogleLanguageDetection,
              });

    const params = {
        slugId,
        conversationId,
        conversationContentId,
        authorId,
        normalizedContent,
        isSeed,
        now,
    };

    const { itemId, contentId, contentPublicId } = tx
        ? await createRankingItemInTx({ tx, ...params })
        : await db.transaction(async (innerTx) =>
              createRankingItemInTx({ tx: innerTx, ...params }),
          );

    log.info(
        `[RankingItem] Created item ${slugId} (id=${String(itemId)}, content=${String(contentId)}) for conversation ${String(conversationId)}`,
    );

    return {
        slugId,
        itemId,
        contentSource: {
            conversationId,
            conversationSlugId,
            itemSlugId: slugId,
            contentId,
            publicId: contentPublicId,
            title: normalizedContent.title,
            bodyHtml: normalizedContent.bodyHtml,
            bodyPlainText: normalizedContent.bodyPlainText,
            sourceLanguageCode:
                normalizedContent.sourceLanguageMetadata.sourceLanguageCode,
            sourceRawLanguageCode:
                normalizedContent.sourceLanguageMetadata.sourceRawLanguageCode,
            sourceLanguageProvider:
                normalizedContent.sourceLanguageMetadata.sourceLanguageProvider,
            sourceLanguageConfidence:
                normalizedContent.sourceLanguageMetadata.sourceLanguageConfidence,
        },
    };
}

type LifecycleFilter = MaxdiffLifecycleStatus | "all";

interface FetchRankingItemsProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    displayPreferences: RankingItemDisplayPreferences;
    lifecycleFilter?: LifecycleFilter;
}

export async function fetchRankingItems({
    db,
    conversationSlugId,
    displayPreferences,
    lifecycleFilter = "active",
}: FetchRankingItemsProps): Promise<MaxDiffItemsFetchResponse> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    const activeStatuses: MaxdiffLifecycleStatus[] =
        lifecycleFilter === "all"
            ? ["active", "completed", "in_progress", "canceled"]
            : lifecycleFilter === "active"
              ? ["active", "in_progress"]
              : [lifecycleFilter];

    const rows = await db
        .select({
            slugId: rankingItemTable.slugId,
            contentId: rankingItemContentTable.id,
            publicId: rankingItemContentTable.publicId,
            title: rankingItemContentTable.title,
            body: rankingItemContentTable.body,
            sourceLanguageCode: rankingItemContentTable.sourceLanguageCode,
            sourceRawLanguageCode: rankingItemContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: rankingItemContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                rankingItemContentTable.sourceLanguageConfidence,
            lifecycleStatus: rankingItemTable.lifecycleStatus,
            externalUrl: rankingItemExternalSourceTable.externalUrl,
            snapshotScore: rankingItemTable.snapshotScore,
            snapshotRank: rankingItemTable.snapshotRank,
            snapshotParticipantCount: rankingItemTable.snapshotParticipantCount,
            createdAt: rankingItemTable.createdAt,
        })
        .from(rankingItemTable)
        .innerJoin(
            rankingItemContentTable,
            eq(rankingItemContentTable.id, rankingItemTable.currentContentId),
        )
        .leftJoin(
            rankingItemExternalSourceTable,
            eq(
                rankingItemExternalSourceTable.rankingItemId,
                rankingItemTable.id,
            ),
        )
        .where(
            and(
                eq(rankingItemTable.conversationId, conversationId),
                isNotNull(rankingItemTable.currentContentId),
                inArray(rankingItemTable.lifecycleStatus, activeStatuses),
            ),
        );

    const sources = rows.map((r) => ({
        conversationSlugId,
        itemSlugId: r.slugId,
        contentId: r.contentId,
        publicId: r.publicId,
        title: r.title,
        bodyHtml: r.body,
        sourceLanguageCode: r.sourceLanguageCode,
        sourceRawLanguageCode: r.sourceRawLanguageCode,
        sourceLanguageProvider: r.sourceLanguageProvider,
        sourceLanguageConfidence: r.sourceLanguageConfidence,
    }));
    const displayContentByContentId = await buildRankingItemDisplayContentByContentId({
        db,
        sources,
        preferences: displayPreferences,
    });

    const items: MaxDiffItem[] = rows.map((r) => {
            const displayContent = displayContentByContentId.get(r.contentId);
            if (displayContent === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to build ranking item display content",
                );
            }
            return {
                slugId: r.slugId,
                displayContent,
                lifecycleStatus: r.lifecycleStatus,
                externalUrl: r.externalUrl,
                snapshotScore: r.snapshotScore,
                snapshotRank: r.snapshotRank,
                snapshotParticipantCount: r.snapshotParticipantCount,
                createdAt: r.createdAt.toISOString(),
            };
        });

    return { items };
}

interface UpdateRankingItemLifecycleProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    itemSlugId: string;
    newStatus: MaxdiffLifecycleStatus;
    requestingUserId: string;
    valkey?: Valkey;
}

export async function updateRankingItemLifecycle({
    db,
    conversationSlugId,
    itemSlugId,
    newStatus,
    requestingUserId,
    valkey,
}: UpdateRankingItemLifecycleProps): Promise<void> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    const [conversation] = await db
        .select({
            projectId: conversationTable.projectId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId));

    await requireProjectCapability({
        db,
        userId: requestingUserId,
        projectId: conversation.projectId,
        capability: "conversation_update",
        message: "Missing conversation_update capability",
    });

    const itemRows = await db
        .select({
            id: rankingItemTable.id,
            lifecycleStatus: rankingItemTable.lifecycleStatus,
        })
        .from(rankingItemTable)
        .where(
            and(
                eq(rankingItemTable.slugId, itemSlugId),
                eq(rankingItemTable.conversationId, conversationId),
                isNotNull(rankingItemTable.currentContentId),
            ),
        );

    if (itemRows.length === 0) {
        throw httpErrors.notFound("Ranking item not found");
    }
    const item = itemRows[0];

    if (item.lifecycleStatus === newStatus) {
        return;
    }

    const now = new Date();

    const wasActive =
        item.lifecycleStatus === "active" ||
        item.lifecycleStatus === "in_progress";
    const isDeactivating =
        newStatus === "completed" || newStatus === "canceled";

    if (wasActive && isDeactivating) {
        const snapshot = await computeItemSnapshot({
            db,
            conversationId,
            itemSlugId,
        });

        await db
            .update(rankingItemTable)
            .set({
                lifecycleStatus: newStatus,
                snapshotScore: snapshot.snapshotScore,
                snapshotRank: snapshot.snapshotRank,
                snapshotParticipantCount: snapshot.snapshotParticipantCount,
                updatedAt: now,
            })
            .where(eq(rankingItemTable.id, item.id));

        log.info(
            `[RankingItem] Item ${itemSlugId} transitioned to ${newStatus} with snapshot: score=${String(snapshot.snapshotScore)}, rank=${String(snapshot.snapshotRank)}`,
        );
    } else {
        const isReactivating =
            newStatus === "active" || newStatus === "in_progress";

        await db
            .update(rankingItemTable)
            .set({
                lifecycleStatus: newStatus,
                snapshotScore: isReactivating ? null : undefined,
                snapshotRank: isReactivating ? null : undefined,
                snapshotParticipantCount: isReactivating ? null : undefined,
                updatedAt: now,
            })
            .where(eq(rankingItemTable.id, item.id));

        log.info(`[RankingItem] Item ${itemSlugId} transitioned to ${newStatus}`);
    }

    markRankingScoringDirty({ valkey, conversationId, conversationSlugId });
}
