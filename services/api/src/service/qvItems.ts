import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import type { z } from "zod";
import {
    Dto,
    type UpdateConversationRequest,
    type UpdateConversationResponse,
} from "@/shared/types/dto.js";
import {
    qvConfigTable,
    rankingItemContentTable,
    rankingItemTable,
    userTable,
} from "@/shared-backend/schema.js";
import { currentRankingItemSourceCondition } from "@/shared-backend/opinionEligibility.js";
import {
    createRankingItem,
    normalizeFrontendRankingItemContent,
    type NormalizedRankingItemContent,
} from "./rankingItem.js";
import {
    contentLanguageMetadataUpdateValues,
    type ContentLanguageMetadataResolver,
} from "./contentLanguageMetadata.js";
import type { RankingItemContentSource } from "./contentTranslation.js";
import { MAX_SEED_OPINIONS_PER_SUBMISSION } from "@/shared/seedOpinions.js";
import { htmlToCountedText } from "@/shared/richText.js";
import { queueSourceInvalidationEvent } from "./realtimeEventOutbox.js";

type QvItemList = z.infer<typeof Dto.qvItemList>;
type ItemUpdate = NonNullable<UpdateConversationRequest["qvStatementUpdate"]>;
type ItemChange = ItemUpdate["changes"][number];
type NormalizedItemChange =
    | Extract<ItemChange, { action: "delete" }>
    | { action: "add"; content: NormalizedRankingItemContent }
    | (Omit<Extract<ItemChange, { action: "edit" }>, "content"> & {
          content: NormalizedRankingItemContent;
      });
export type NormalizedQvItemUpdate = Omit<ItemUpdate, "changes"> & {
    changes: NormalizedItemChange[];
};
type Failure = Extract<
    UpdateConversationResponse,
    { reason: "qv_statement_change_rejected" }
>;
type PreparedChange =
    | { action: "add"; content: NormalizedRankingItemContent }
    | {
          action: "edit";
          id: number;
          slugId: string;
          content: NormalizedRankingItemContent;
      }
    | { action: "delete"; id: number };

/** Rich-text parsing and local language detection do not belong under write locks. */
export async function normalizeQvItemUpdate(
    update: ItemUpdate,
): Promise<NormalizedQvItemUpdate> {
    const changes: NormalizedItemChange[] = [];
    for (const change of update.changes) {
        if (change.action === "delete") changes.push(change);
        else {
            const content = await normalizeFrontendRankingItemContent({
                title: change.content.title,
                bodyHtml: change.content.description,
            });
            changes.push({ ...change, content });
        }
    }
    return { ...update, changes };
}

export function getQvItemLanguageInput(content: NormalizedRankingItemContent) {
    return {
        text: [htmlToCountedText(content.title), content.bodyPlainText]
            .filter((text) => text !== null && text.trim() !== "")
            .join("\n\n"),
    };
}

function reject(changeFailure: Failure["changeFailure"]): Failure {
    return {
        success: false,
        reason: "qv_statement_change_rejected",
        changeFailure,
    };
}

async function loadItems({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}) {
    return await db
        .select({
            id: rankingItemTable.id,
            slugId: rankingItemTable.slugId,
            sourceVersion: rankingItemContentTable.publicId,
            title: rankingItemContentTable.title,
            description: rankingItemContentTable.body,
            position: rankingItemTable.position,
        })
        .from(rankingItemTable)
        .leftJoin(userTable, eq(userTable.id, rankingItemTable.authorId))
        .innerJoin(
            rankingItemContentTable,
            eq(rankingItemContentTable.id, rankingItemTable.currentContentId),
        )
        .where(
            and(
                eq(rankingItemTable.conversationId, conversationId),
                currentRankingItemSourceCondition(),
            ),
        )
        .orderBy(asc(rankingItemTable.position), asc(rankingItemTable.id));
}

export async function fetchQvItems({
    db,
    conversationId,
    configId,
    isClosed,
    canEdit,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    configId: number;
    isClosed: boolean;
    canEdit: boolean;
}): Promise<QvItemList> {
    // One statement gives the revision and its contents the same MVCC snapshot.
    const rows = await db
        .select({
            revision: qvConfigTable.statementSetRevision,
            itemsLockedAt: qvConfigTable.statementsLockedAt,
            item: {
                slugId: rankingItemTable.slugId,
                sourceVersion: rankingItemContentTable.publicId,
                title: rankingItemContentTable.title,
                description: rankingItemContentTable.body,
            },
        })
        .from(qvConfigTable)
        .leftJoin(
            rankingItemTable,
            and(
                eq(rankingItemTable.conversationId, conversationId),
                isNotNull(rankingItemTable.currentContentId),
            ),
        )
        .leftJoin(userTable, eq(userTable.id, rankingItemTable.authorId))
        .leftJoin(
            rankingItemContentTable,
            and(
                eq(
                    rankingItemContentTable.id,
                    rankingItemTable.currentContentId,
                ),
                currentRankingItemSourceCondition(),
            ),
        )
        .where(eq(qvConfigTable.id, configId))
        .orderBy(asc(rankingItemTable.position), asc(rankingItemTable.id));
    const row = rows.at(0);
    return Dto.qvItemList.parse({
        revision: row?.revision,
        editing: !canEdit
            ? { allowed: false, reason: "not_allowed" }
            : isClosed
              ? { allowed: false, reason: "closed" }
              : row?.itemsLockedAt != null
                ? { allowed: false, reason: "participation_started" }
                : { allowed: true },
        items: rows.flatMap(({ item }) =>
            item.sourceVersion === null
                ? []
                : [
                      {
                          ...item,
                          description: item.description ?? undefined,
                      },
                  ],
        ),
    });
}

/** Writes hold conversation UPDATE before config UPDATE; unlocked preflights must be repeated under those locks. */
export async function prepareQvItemUpdate({
    db,
    conversationId,
    configId,
    isClosed,
    update,
    lockConfig,
}: {
    conversationId: number;
    configId: number;
    isClosed: boolean;
    update: NormalizedQvItemUpdate;
} & (
    | { db: PostgresTransaction; lockConfig: true }
    | { db: PostgresJsDatabase; lockConfig: false }
)): Promise<
    | Failure
    | {
          success: true;
          changes: PreparedChange[];
          positions: { id: number; position: number }[];
          itemCount: number;
          revision: number;
      }
> {
    if (isClosed) return reject("closed");
    const configQuery = db
        .select()
        .from(qvConfigTable)
        .where(eq(qvConfigTable.id, configId));
    const configs = await (lockConfig
        ? configQuery.for("update")
        : configQuery);
    const config = configs.at(0);
    if (config === undefined) return reject("not_found");
    if (config.statementsLockedAt !== null)
        return reject("participation_started");
    if (config.statementSetRevision !== update.expectedRevision)
        return reject("version_conflict");
    const items = await loadItems({ db, conversationId });
    const bySlug = new Map(items.map((item) => [item.slugId, item]));
    const seen = new Set<string>();
    const changes: PreparedChange[] = [];
    for (const change of update.changes) {
        if (change.action === "add") {
            changes.push({
                action: "add",
                content: change.content,
            });
            continue;
        }
        if (seen.has(change.slugId)) return reject("invalid_changes");
        seen.add(change.slugId);
        const item = bySlug.get(change.slugId);
        if (item === undefined) return reject("not_found");
        if (item.sourceVersion !== change.sourceVersion)
            return reject("version_conflict");
        if (change.action === "delete") {
            changes.push({ action: "delete", id: item.id });
            bySlug.delete(change.slugId);
        } else if (
            item.title !== change.content.title ||
            item.description !== change.content.bodyHtml
        ) {
            changes.push({
                action: "edit",
                id: item.id,
                slugId: item.slugId,
                content: change.content,
            });
        }
    }
    const resultingCount =
        bySlug.size +
        changes.filter((change) => change.action === "add").length;
    if (
        resultingCount === 0 ||
        resultingCount > MAX_SEED_OPINIONS_PER_SUBMISSION
    )
        return reject("invalid_changes");
    const remaining = new Map(bySlug);
    const positions: { id: number; position: number }[] = [];
    const order = update.order ?? [...bySlug.keys()];
    for (const [position, slug] of order.entries()) {
        const item = remaining.get(slug);
        if (item === undefined) return reject("invalid_changes");
        remaining.delete(slug);
        if (item.position !== position)
            positions.push({ id: item.id, position });
    }
    if (remaining.size > 0) return reject("invalid_changes");
    return {
        success: true,
        changes,
        positions,
        itemCount: resultingCount,
        revision: config.statementSetRevision,
    };
}

export async function applyQvItemUpdate({
    db,
    prepared,
    conversation,
    configId,
    userId,
    now,
    resolveLanguageMetadata,
    useGoogleLanguageDetection,
}: {
    db: PostgresTransaction;
    prepared: Extract<
        Awaited<ReturnType<typeof prepareQvItemUpdate>>,
        { success: true }
    >;
    conversation: { id: number; slugId: string; contentId: number };
    configId: number;
    userId: string;
    now: Date;
    resolveLanguageMetadata: ContentLanguageMetadataResolver;
    useGoogleLanguageDetection: boolean;
}): Promise<RankingItemContentSource[]> {
    const sources: RankingItemContentSource[] = [];
    if (prepared.changes.length === 0 && prepared.positions.length === 0)
        return sources;
    if (prepared.changes.some((change) => change.action === "delete"))
        await queueSourceInvalidationEvent(db);
    let nextPosition =
        prepared.itemCount -
        prepared.changes.filter((change) => change.action === "add").length;
    for (const change of prepared.changes) {
        if (change.action === "delete") {
            await db
                .update(rankingItemTable)
                .set({ currentContentId: null, deletedAt: now, updatedAt: now })
                .where(eq(rankingItemTable.id, change.id));
            continue;
        }
        const normalizedContent = {
            ...change.content,
            sourceLanguageMetadata: useGoogleLanguageDetection
                ? await resolveLanguageMetadata({
                      ...getQvItemLanguageInput(change.content),
                      useGoogleLanguageDetection,
                  })
                : change.content.sourceLanguageMetadata,
        };
        if (change.action === "add") {
            const item = await createRankingItem({
                db,
                tx: db,
                conversationId: conversation.id,
                conversationSlugId: conversation.slugId,
                conversationContentId: conversation.contentId,
                authorId: userId,
                isSeed: true,
                normalizedContent,
                position: nextPosition++,
            });
            sources.push(item.contentSource);
        } else {
            const contents = await db
                .insert(rankingItemContentTable)
                .values({
                    rankingItemId: change.id,
                    conversationContentId: conversation.contentId,
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
            const content = contents.at(0);
            if (content === undefined)
                throw new Error("Item content insertion returned no row");
            await db
                .update(rankingItemTable)
                .set({ currentContentId: content.id, updatedAt: now })
                .where(eq(rankingItemTable.id, change.id));
            sources.push({
                conversationId: conversation.id,
                conversationSlugId: conversation.slugId,
                itemSlugId: change.slugId,
                contentId: content.id,
                publicId: content.publicId,
                title: change.content.title,
                bodyHtml: change.content.bodyHtml,
                bodyPlainText: change.content.bodyPlainText,
                ...normalizedContent.sourceLanguageMetadata,
            });
        }
    }
    if (prepared.positions.length > 0) {
        // The new order exists only in the editor input. Apply its assignments
        // together to avoid a round trip per item under the item-set lock.
        const cases = prepared.positions.map(
            ({ id, position }) => sql`when ${id} then ${position}::integer`,
        );
        await db
            .update(rankingItemTable)
            .set({
                position: sql`case ${rankingItemTable.id} ${sql.join(cases, sql` `)} end`,
            })
            .where(
                and(
                    eq(rankingItemTable.conversationId, conversation.id),
                    inArray(
                        rankingItemTable.id,
                        prepared.positions.map(({ id }) => id),
                    ),
                ),
            );
    }
    await db
        .update(qvConfigTable)
        .set({
            statementSetRevision: prepared.revision + 1,
            itemCount: prepared.itemCount,
        })
        .where(eq(qvConfigTable.id, configId));
    return sources;
}
