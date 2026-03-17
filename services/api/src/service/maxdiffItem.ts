import {
    maxdiffItemTable,
    maxdiffItemContentTable,
    maxdiffItemExternalSourceTable,
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
import { processUserGeneratedHtml } from "@/shared-app-api/html.js";
import { log } from "@/app.js";

// --- Create ---

interface CreateMaxdiffItemProps {
    db: PostgresDatabase;
    conversationId: number;
    conversationContentId: number;
    authorId: string;
    title: string;
    body?: string | null;
    isSeed: boolean;
}

export async function createMaxdiffItem({
    db,
    conversationId,
    conversationContentId,
    authorId,
    title,
    body,
    isSeed,
}: CreateMaxdiffItemProps): Promise<{ slugId: string }> {
    const slugId = generateRandomSlugId();
    const now = new Date();

    const sanitizedTitle = processUserGeneratedHtml(title, false, "input");
    const sanitizedBody =
        body != null ? processUserGeneratedHtml(body, true, "input") : null;

    const { itemId, contentId } = await db.transaction(async (tx) => {
        const [itemRow] = await tx
            .insert(maxdiffItemTable)
            .values({
                slugId,
                authorId,
                conversationId,
                isSeed,
                lifecycleStatus: "active",
                createdAt: now,
                updatedAt: now,
            })
            .returning({ id: maxdiffItemTable.id });

        const [contentRow] = await tx
            .insert(maxdiffItemContentTable)
            .values({
                maxdiffItemId: itemRow.id,
                conversationContentId,
                title: sanitizedTitle,
                body: sanitizedBody,
                createdAt: now,
            })
            .returning({ id: maxdiffItemContentTable.id });

        await tx
            .update(maxdiffItemTable)
            .set({ currentContentId: contentRow.id })
            .where(eq(maxdiffItemTable.id, itemRow.id));

        return { itemId: itemRow.id, contentId: contentRow.id };
    });

    log.info(
        `[MaxDiff] Created item ${slugId} (id=${String(itemId)}, content=${String(contentId)}) for conversation ${String(conversationId)}`,
    );

    return { slugId };
}

// --- Fetch ---

type LifecycleFilter = MaxdiffLifecycleStatus | "all";

interface FetchMaxdiffItemsProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    lifecycleFilter?: LifecycleFilter;
}

export async function fetchMaxdiffItems({
    db,
    conversationSlugId,
    lifecycleFilter = "active",
}: FetchMaxdiffItemsProps): Promise<MaxDiffItemsFetchResponse> {
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
            slugId: maxdiffItemTable.slugId,
            title: maxdiffItemContentTable.title,
            body: maxdiffItemContentTable.body,
            lifecycleStatus: maxdiffItemTable.lifecycleStatus,
            externalUrl: maxdiffItemExternalSourceTable.externalUrl,
            snapshotScore: maxdiffItemTable.snapshotScore,
            snapshotRank: maxdiffItemTable.snapshotRank,
            snapshotParticipantCount:
                maxdiffItemTable.snapshotParticipantCount,
            createdAt: maxdiffItemTable.createdAt,
        })
        .from(maxdiffItemTable)
        .innerJoin(
            maxdiffItemContentTable,
            eq(
                maxdiffItemContentTable.id,
                maxdiffItemTable.currentContentId,
            ),
        )
        .leftJoin(
            maxdiffItemExternalSourceTable,
            eq(
                maxdiffItemExternalSourceTable.maxdiffItemId,
                maxdiffItemTable.id,
            ),
        )
        .where(
            and(
                eq(maxdiffItemTable.conversationId, conversationId),
                isNotNull(maxdiffItemTable.currentContentId),
                inArray(maxdiffItemTable.lifecycleStatus, activeStatuses),
            ),
        );

    const items: MaxDiffItem[] = rows.map((r) => ({
        slugId: r.slugId,
        title: r.title,
        body: r.body,
        lifecycleStatus: r.lifecycleStatus,
        externalUrl: r.externalUrl,
        snapshotScore: r.snapshotScore,
        snapshotRank: r.snapshotRank,
        snapshotParticipantCount: r.snapshotParticipantCount,
        createdAt: r.createdAt.toISOString(),
    }));

    return { items };
}

// --- Lifecycle Update ---

interface UpdateMaxdiffItemLifecycleProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    itemSlugId: string;
    newStatus: MaxdiffLifecycleStatus;
    requestingUserId: string;
}

export async function updateMaxdiffItemLifecycle({
    db,
    conversationSlugId,
    itemSlugId,
    newStatus,
    requestingUserId,
}: UpdateMaxdiffItemLifecycleProps): Promise<void> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    // Verify the requesting user is the conversation author
    const [conversation] = await db
        .select({ authorId: conversationTable.authorId })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId));

    if (conversation.authorId !== requestingUserId) {
        throw httpErrors.forbidden(
            "Only the conversation author can update item lifecycle",
        );
    }

    // Find the item
    const itemRows = await db
        .select({
            id: maxdiffItemTable.id,
            lifecycleStatus: maxdiffItemTable.lifecycleStatus,
        })
        .from(maxdiffItemTable)
        .where(
            and(
                eq(maxdiffItemTable.slugId, itemSlugId),
                eq(maxdiffItemTable.conversationId, conversationId),
            ),
        );

    if (itemRows.length === 0) {
        throw httpErrors.notFound("MaxDiff item not found");
    }
    const item = itemRows[0];

    if (item.lifecycleStatus === newStatus) {
        return; // No-op
    }

    const now = new Date();

    // If transitioning FROM active/in_progress TO completed/canceled: snapshot
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
            .update(maxdiffItemTable)
            .set({
                lifecycleStatus: newStatus,
                snapshotScore: snapshot.snapshotScore,
                snapshotRank: snapshot.snapshotRank,
                snapshotParticipantCount: snapshot.snapshotParticipantCount,
                updatedAt: now,
            })
            .where(eq(maxdiffItemTable.id, item.id));

        log.info(
            `[MaxDiff] Item ${itemSlugId} transitioned to ${newStatus} with snapshot: score=${String(snapshot.snapshotScore)}, rank=${String(snapshot.snapshotRank)}`,
        );
    } else {
        // Reopening (completed/canceled → active): clear snapshot
        const isReactivating =
            newStatus === "active" || newStatus === "in_progress";

        await db
            .update(maxdiffItemTable)
            .set({
                lifecycleStatus: newStatus,
                snapshotScore: isReactivating ? null : undefined,
                snapshotRank: isReactivating ? null : undefined,
                snapshotParticipantCount: isReactivating ? null : undefined,
                updatedAt: now,
            })
            .where(eq(maxdiffItemTable.id, item.id));

        log.info(
            `[MaxDiff] Item ${itemSlugId} transitioned to ${newStatus}`,
        );
    }
}
