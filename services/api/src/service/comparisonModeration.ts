import { httpErrors } from "@fastify/sensible";
import {
    and,
    desc,
    eq,
    exists,
    isNotNull,
    isNull,
    lt,
    or,
    sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { z } from "zod";
import type { Dto } from "@/shared/types/dto.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import { readableRankingItemSourceCondition } from "@/shared-backend/opinionEligibility.js";
import {
    comparisonItemModerationTable as decisions,
    conversationAnalysisCloseTable as close,
    conversationTable as conversation,
    rankingConversationConfigTable as config,
    rankingItemContentTable as content,
    rankingItemExternalSourceTable as external,
    rankingItemTable as item,
    userTable,
} from "@/shared-backend/schema.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { canModerateConversation } from "./authUtil.js";
import {
    currentAnalysisCloseCondition,
    readableAnalysisConversationCondition,
} from "./closedAnalysisQueries.js";
import { scheduleRankingStatsRefresh } from "./comparisonQueue.js";
import {
    queueComparisonItemsUpdatedEvent,
    queueSourceInvalidationEvent,
} from "./realtimeEventOutbox.js";

export async function moderateComparisonItem({
    db,
    userId,
    request,
    valkey,
}: {
    db: PostgresJsDatabase;
    userId: string;
    request: z.infer<typeof Dto.moderateComparisonItemRequest>;
    valkey: Valkey | undefined;
}): Promise<void> {
    const { conversationSlugId, itemSlugId, action, reason } = request;
    const changed = await getPrimaryDatabase(db).transaction(async (tx) => {
        const scopes = await tx
            .select({
                id: conversation.id,
                configId: conversation.rankingConfigId,
            })
            .from(conversation)
            .where(
                and(
                    eq(conversation.slugId, conversationSlugId),
                    eq(conversation.prioritizationType, "comparisons"),
                    readableAnalysisConversationCondition(tx),
                ),
            )
            .for("no key update");
        const scope = scopes.at(0);
        if (scope?.configId == null)
            throw httpErrors.notFound("Comparison conversation not found");
        const access = await canModerateConversation({
            db: tx,
            userId,
            conversationSlugId,
        });
        if (
            !access.isAuthorized ||
            (action === "hide" && !access.isSiteModerator)
        )
            throw httpErrors.forbidden();
        const rows = await tx
            .select({ id: item.id, moderation: item.moderation })
            .from(item)
            .leftJoin(userTable, eq(userTable.id, item.authorId))
            .leftJoin(external, eq(external.rankingItemId, item.id))
            .where(
                and(
                    eq(item.conversationId, scope.id),
                    eq(item.slugId, itemSlugId),
                    eq(item.isSeed, false),
                    isNull(external.id),
                    readableRankingItemSourceCondition(),
                    access.isSiteModerator
                        ? undefined
                        : or(
                              isNull(item.moderation),
                              eq(item.moderation, "move"),
                          ),
                ),
            )
            .for("update", { of: item });
        const target = rows.at(0);
        if (target === undefined)
            throw httpErrors.notFound("Comparison statement not found");
        const next = action === "restore" ? null : action;
        if (target.moderation === next) return undefined;
        await tx.insert(decisions).values({
            rankingItemId: target.id,
            moderatorId: userId,
            action,
            reason,
        });
        await tx
            .update(item)
            .set({ moderation: next })
            .where(eq(item.id, target.id));
        // Move -> Hide changes text access, not the numerical projection.
        const inputsChanged = target.moderation === null || next === null;
        if (inputsChanged) {
            const revision = sql<number>`${config.scoringInputRevision} + 1`;
            const [updated] = await tx
                .update(config)
                .set({
                    scoringInputRevision: revision,
                    scoringInvalidationRevision: revision,
                })
                .where(eq(config.id, scope.configId))
                .returning({ revision: config.scoringInputRevision });
            await tx
                .update(close)
                .set({
                    minimumClosingResultRevision: updated.revision,
                    requestedResultRevision: updated.revision,
                })
                .from(conversation)
                .where(
                    and(
                        eq(conversation.id, scope.id),
                        currentAnalysisCloseCondition(),
                    ),
                );
        }
        await queueComparisonItemsUpdatedEvent({ db: tx, conversationSlugId });
        await queueSourceInvalidationEvent(tx);
        return inputsChanged ? scope.id : undefined;
    });
    if (changed !== undefined)
        await scheduleRankingStatsRefresh({
            valkey,
            conversationId: changed,
            conversationSlugId,
        });
}

export async function readComparisonModerationHistory({
    db,
    userId,
    request,
}: {
    db: PostgresJsDatabase;
    userId: string | undefined;
    request: z.infer<typeof Dto.comparisonModerationHistoryRequest>;
}): Promise<z.infer<typeof Dto.comparisonModerationHistoryResponse>> {
    const primary = getPrimaryDatabase(db);
    const viewer = alias(userTable, "moderation_history_viewer");
    const canReadHidden =
        userId === undefined
            ? undefined
            : exists(
                  primary
                      .select({ id: viewer.id })
                      .from(viewer)
                      .where(
                          and(
                              eq(viewer.id, userId),
                              eq(viewer.isSiteModerator, true),
                              eq(viewer.isDeleted, false),
                          ),
                      ),
              );
    const last = primary
        .select({ action: decisions.action, reason: decisions.reason })
        .from(decisions)
        .where(eq(decisions.rankingItemId, item.id))
        .orderBy(desc(decisions.id))
        .limit(1)
        .as("last_decision");
    const rows = await primary
        .select({
            id: item.id,
            itemSlugId: item.slugId,
            action: item.moderation,
            reason: last.reason,
            title: content.title,
            body: content.body,
        })
        .from(conversation)
        .innerJoin(item, eq(item.conversationId, conversation.id))
        .innerJoin(content, eq(content.id, item.currentContentId))
        .leftJoin(userTable, eq(userTable.id, item.authorId))
        .innerJoinLateral(last, eq(last.action, item.moderation))
        .where(
            and(
                eq(conversation.slugId, request.conversationSlugId),
                eq(conversation.prioritizationType, "comparisons"),
                readableAnalysisConversationCondition(primary),
                readableRankingItemSourceCondition(),
                isNotNull(item.moderation),
                or(eq(item.moderation, "move"), canReadHidden),
                request.beforeId === undefined
                    ? undefined
                    : lt(item.id, request.beforeId),
            ),
        )
        .orderBy(desc(item.id))
        .limit(51);
    const items = rows
        .slice(0, 50)
        .flatMap((row) =>
            row.action === null
                ? []
                : [{ ...row, action: row.action, body: row.body ?? undefined }],
        );
    return {
        items,
        nextBeforeId: rows.length > 50 ? items.at(-1)?.id : undefined,
    };
}
