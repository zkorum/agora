/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { PostgresTransaction } from "./db.js";
import { scheduleQvStatsRefresh } from "./qvStatsRefresh.js";
import {
    conversationParticipantTable,
    conversationTable,
    qvAllocationTable,
    qvResponseCommandTable,
    qvResponseTable,
    qvResponseVersionTable,
    userTable,
} from "./schema.js";

const MERGE_RESPONSE_BATCH_SIZE = 100;
const ALLOCATION_INSERT_BATCH_SIZE = 1000;

/** Account/conversation locks are held by the account lifecycle caller. Recovery does not resurrect retired responses. */
export async function setQvAccountHidden({
    db,
    userId,
    hiddenAt,
}: {
    db: PostgresTransaction;
    userId: string;
    hiddenAt: Date | null;
}): Promise<void> {
    const participants = db
        .select({ id: conversationParticipantTable.id })
        .from(conversationParticipantTable)
        .where(eq(conversationParticipantTable.userId, userId));
    const changed = await db
        .update(qvResponseTable)
        .set({ accountHiddenAt: hiddenAt })
        .where(
            and(
                inArray(qvResponseTable.participantId, participants),
                isNull(qvResponseTable.deletedAt),
            ),
        )
        .returning({ conversationId: qvResponseTable.conversationId });
    await scheduleQvStatsRefresh({
        db,
        conversationIds: changed.map((row) => row.conversationId),
    });
}

async function retireResponses({
    db,
    responseIds,
    now,
}: {
    db: PostgresTransaction;
    responseIds: readonly string[];
    now: Date;
}): Promise<void> {
    if (responseIds.length === 0) return;
    const versions = db
        .select({ id: qvResponseVersionTable.id })
        .from(qvResponseVersionTable)
        .where(inArray(qvResponseVersionTable.responseId, [...responseIds]));
    await db
        .update(qvResponseTable)
        .set({
            currentVersionId: null,
            deletedAt: now,
            revision: sql`${qvResponseTable.revision} + 1`,
        })
        .where(
            and(
                inArray(qvResponseTable.id, [...responseIds]),
                isNull(qvResponseTable.deletedAt),
            ),
        );
    await db
        .update(qvAllocationTable)
        .set({ deletedAt: now })
        .where(
            and(
                inArray(qvAllocationTable.versionId, versions),
                isNull(qvAllocationTable.deletedAt),
            ),
        );
    await db
        .update(qvResponseVersionTable)
        .set({ deletedAt: now })
        .where(
            and(
                inArray(qvResponseVersionTable.responseId, [...responseIds]),
                isNull(qvResponseVersionTable.deletedAt),
            ),
        );
    await db
        .update(qvResponseCommandTable)
        .set({ deletedAt: now })
        .where(
            and(
                inArray(qvResponseCommandTable.responseId, [...responseIds]),
                isNull(qvResponseCommandTable.deletedAt),
            ),
        );
}

/** Private-source retirement only; no physical removal. Completed captures own
 * independent qv_input_* rows, with no response/version/account FK. Retiring
 * these working sources cannot erase a current or pending calculation's evidence.
 */
export async function retireQvAccountInputs({
    db,
    userId,
    limit = 1000,
}: {
    db: PostgresTransaction;
    userId: string;
    limit?: number;
}): Promise<number> {
    const accounts = await db
        .select({ purgeStartedAt: userTable.purgeStartedAt })
        .from(userTable)
        .where(and(eq(userTable.id, userId), eq(userTable.isDeleted, true)))
        .for("no key update");
    const now = accounts.at(0)?.purgeStartedAt;
    if (now == null) return 0;
    const responses = await db
        .select({
            id: qvResponseTable.id,
            conversationId: qvResponseTable.conversationId,
        })
        .from(qvResponseTable)
        .innerJoin(
            conversationParticipantTable,
            eq(conversationParticipantTable.id, qvResponseTable.participantId),
        )
        .where(
            and(
                eq(conversationParticipantTable.userId, userId),
                isNull(qvResponseTable.deletedAt),
            ),
        )
        .orderBy(qvResponseTable.id)
        .limit(limit);
    if (responses.length === 0) return 0;
    // The account lock fences new responses. Lock only this bounded batch's
    // conversations, then tombstone its graph in four set-based updates.
    await db
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .where(
            inArray(conversationTable.id, [
                ...new Set(
                    responses.map((response) => response.conversationId),
                ),
            ]),
        )
        .orderBy(conversationTable.id)
        .for("no key update");
    await retireResponses({
        db,
        responseIds: responses.map((response) => response.id),
        now,
    });
    await scheduleQvStatsRefresh({
        db,
        conversationIds: responses.map((response) => response.conversationId),
    });
    return responses.length;
}

/** Keep the destination's saved response, otherwise transfer the complete guest response. Never combine credits. */
export async function mergeQvResponses({
    db,
    guestUserId,
    verifiedUserId,
    now,
}: {
    db: PostgresTransaction;
    guestUserId: string;
    verifiedUserId: string;
    now: Date;
}): Promise<void> {
    const sources = await db
        .select({
            response: qvResponseTable,
            isClosed: conversationTable.isClosed,
        })
        .from(qvResponseTable)
        .innerJoin(
            conversationParticipantTable,
            eq(conversationParticipantTable.id, qvResponseTable.participantId),
        )
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, qvResponseTable.conversationId),
        )
        .where(
            and(
                eq(conversationParticipantTable.userId, guestUserId),
                isNull(qvResponseTable.deletedAt),
            ),
        )
        .orderBy(qvResponseTable.conversationId);
    // Closed input is sealed; merge never changes its numerical set or pointers.
    const openSources = sources
        .filter((source) => !source.isClosed)
        .map(({ response }) => response);
    for (
        let offset = 0;
        offset < openSources.length;
        offset += MERGE_RESPONSE_BATCH_SIZE
    ) {
        const batch = openSources.slice(
            offset,
            offset + MERGE_RESPONSE_BATCH_SIZE,
        );
        await copyQvResponseBatch({ db, sources: batch, verifiedUserId });
        await retireResponses({
            db,
            responseIds: batch.map((source) => source.id),
            now,
        });
    }
    // Closed source pointers are untouched, but the guest's eligibility can still
    // change in the surrounding merge. Live counts never represent frozen evidence.
    await scheduleQvStatsRefresh({
        db,
        conversationIds: sources.map(({ response }) => response.conversationId),
    });
}

/** Caller holds both accounts and the source conversation scope. Bound every
 * query by the batch, not by a per-participant or per-allocation loop. */
async function copyQvResponseBatch({
    db,
    sources,
    verifiedUserId,
}: {
    db: PostgresTransaction;
    sources: (typeof qvResponseTable.$inferSelect)[];
    verifiedUserId: string;
}): Promise<void> {
    const candidates = sources.flatMap((source) =>
        source.currentVersionId === null || source.accountHiddenAt !== null
            ? []
            : [{ ...source, currentVersionId: source.currentVersionId }],
    );
    if (candidates.length === 0) return;
    const conversationIds = candidates.map((source) => source.conversationId);
    await db
        .insert(conversationParticipantTable)
        .values(
            conversationIds.map((conversationId) => ({
                userId: verifiedUserId,
                conversationId,
            })),
        )
        .onConflictDoNothing();
    const participants = await db
        .select({
            id: conversationParticipantTable.id,
            conversationId: conversationParticipantTable.conversationId,
        })
        .from(conversationParticipantTable)
        .where(
            and(
                eq(conversationParticipantTable.userId, verifiedUserId),
                inArray(
                    conversationParticipantTable.conversationId,
                    conversationIds,
                ),
            ),
        );
    await db
        .insert(qvResponseTable)
        .values(
            participants.map(({ id, conversationId }) => ({
                participantId: id,
                conversationId,
            })),
        )
        .onConflictDoNothing();
    const destinations = await db
        .select({ response: qvResponseTable })
        .from(qvResponseTable)
        .innerJoin(
            conversationParticipantTable,
            eq(conversationParticipantTable.id, qvResponseTable.participantId),
        )
        .where(
            and(
                eq(conversationParticipantTable.userId, verifiedUserId),
                inArray(qvResponseTable.conversationId, conversationIds),
            ),
        )
        .orderBy(qvResponseTable.conversationId)
        .for("update", { of: qvResponseTable });
    const destinationsByConversation = new Map(
        destinations.map(({ response }) => [response.conversationId, response]),
    );
    const transfers = candidates.flatMap((source) => {
        const destination = destinationsByConversation.get(
            source.conversationId,
        );
        if (destination === undefined)
            throw new Error("Missing QV merge response");
        return destination.currentVersionId === null &&
            destination.deletedAt === null &&
            destination.accountHiddenAt === null
            ? [{ source, destination, versionId: randomUUID() }]
            : [];
    });
    if (transfers.length === 0) return;
    const versionIds = transfers.map(({ source }) => source.currentVersionId);
    const versions = await db
        .select()
        .from(qvResponseVersionTable)
        .where(
            and(
                inArray(qvResponseVersionTable.id, versionIds),
                isNull(qvResponseVersionTable.deletedAt),
            ),
        );
    const versionsById = new Map(
        versions.map((version) => [version.id, version]),
    );
    const copies = transfers.map(({ source, destination, versionId }) => {
        const version = versionsById.get(source.currentVersionId);
        if (version === undefined)
            throw new Error("Missing QV merge source version");
        return {
            id: versionId,
            responseId: destination.id,
            conversationId: version.conversationId,
            statementSetRevision: version.statementSetRevision,
            creditBudget: version.creditBudget,
            creditPricing: version.creditPricing,
            allowOpposition: version.allowOpposition,
            ruleVersion: version.ruleVersion,
            creditsSpent: version.creditsSpent,
            createdAt: version.createdAt,
        };
    });
    await db.insert(qvResponseVersionTable).values(copies);
    const allocations = await db
        .select()
        .from(qvAllocationTable)
        .where(
            and(
                inArray(qvAllocationTable.versionId, versionIds),
                isNull(qvAllocationTable.deletedAt),
            ),
        );
    const copiedVersionIds = new Map(
        transfers.map(({ source, versionId }) => [
            source.currentVersionId,
            versionId,
        ]),
    );
    const copiedAllocations = allocations.map(
        ({ versionId, conversationId, itemId, contentId, votes }) => {
            const copiedVersionId = copiedVersionIds.get(versionId);
            if (copiedVersionId === undefined)
                throw new Error("Missing QV allocation merge version");
            return {
                versionId: copiedVersionId,
                conversationId,
                itemId,
                contentId,
                votes,
            };
        },
    );
    // A response has at most 100 sparse allocations. Chunk inserts separately
    // so a large account cannot exceed PostgreSQL's bind-parameter limit.
    for (
        let offset = 0;
        offset < copiedAllocations.length;
        offset += ALLOCATION_INSERT_BATCH_SIZE
    )
        await db
            .insert(qvAllocationTable)
            .values(
                copiedAllocations.slice(
                    offset,
                    offset + ALLOCATION_INSERT_BATCH_SIZE,
                ),
            );
    await db
        .update(qvResponseTable)
        .set({
            currentVersionId: qvResponseVersionTable.id,
            revision: sql`${qvResponseTable.revision} + 1`,
        })
        .from(qvResponseVersionTable)
        .where(
            and(
                eq(qvResponseTable.id, qvResponseVersionTable.responseId),
                // Historical versions share responseId; only this batch's one
                // new copy per destination may participate in the update join.
                inArray(
                    qvResponseVersionTable.id,
                    copies.map((copy) => copy.id),
                ),
            ),
        );
}
