import { and, eq, inArray, sql } from "drizzle-orm";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    qvCalculationStateTable,
    qvCalculationTable,
    conversationAnalysisCloseTable,
    conversationTable,
    realtimeEventOutboxTable,
    realtimeEventOutboxTopicTable,
} from "@/shared-backend/schema.js";
import {
    buildRealtimeConversationTopic,
    type SSEEventDataByType,
} from "@/shared/types/dto.js";
import { currentAnalysisCloseCondition } from "./closedAnalysisQueries.js";

/** Serialize the eligibility change with close, original publication and reopen. */
export async function refreshClosedQvLiveInputs({
    db,
    conversationIds,
}: {
    db: PostgresTransaction;
    conversationIds: readonly number[];
}): Promise<void> {
    if (conversationIds.length === 0) return;
    const conversation = conversationTable;
    const close = conversationAnalysisCloseTable;
    const locked = await db
        .select({ id: conversation.id, isClosed: conversation.isClosed })
        .from(conversation)
        .where(inArray(conversation.id, conversationIds))
        .orderBy(conversation.id)
        .for("no key update");
    const closedIds = locked.filter((row) => row.isClosed).map((row) => row.id);
    if (closedIds.length === 0) return;
    const rows = await db
        .select({
            conversationId: conversation.id,
            conversationSlugId: conversation.slugId,
            closeId: close.id,
            finalizedAt: conversation.closedFinalizedAt,
            generation: qvCalculationStateTable.generation,
        })
        .from(conversation)
        .innerJoin(
            qvCalculationStateTable,
            eq(qvCalculationStateTable.conversationId, conversation.id),
        )
        .leftJoin(close, currentAnalysisCloseCondition())
        .where(
            and(
                inArray(conversation.id, closedIds),
                eq(conversation.prioritizationType, "qv"),
            ),
        )
        .orderBy(conversation.id);
    for (const row of rows) {
        if (row.closeId !== null) {
            await transitionQvCalculation({
                db,
                ...row,
                closeId: row.closeId,
                action: "refresh",
            });
        } else if (row.finalizedAt === null) {
            // Keep the original generation claimable, including retries using its
            // committed capture. Original publication activates this one follow-up.
            await db
                .insert(qvCalculationTable)
                .values({
                    conversationId: row.conversationId,
                    generation: row.generation + 1,
                })
                .onConflictDoNothing({
                    target: [
                        qvCalculationTable.conversationId,
                        qvCalculationTable.generation,
                    ],
                });
        }
    }
}

/** Caller holds the conversation's write lifecycle lock. No ballot reads/copies here. */
export async function transitionQvCalculation(
    command: {
        db: PostgresTransaction;
        conversationId: number;
        conversationSlugId: string;
    } & ({ action: "close" | "open" } | { action: "refresh"; closeId: number }),
): Promise<void> {
    const { db, conversationId, conversationSlugId, action } = command;
    await db
        .insert(qvCalculationStateTable)
        .values({ conversationId })
        .onConflictDoNothing();
    const states = await db
        .update(qvCalculationStateTable)
        .set({
            generation: sql`${qvCalculationStateTable.generation} + 1`,
        })
        .where(eq(qvCalculationStateTable.conversationId, conversationId))
        .returning();
    const state = states.at(0);
    if (state === undefined) throw new Error("QV lifecycle state unavailable");
    if (action !== "open") {
        await db
            .insert(qvCalculationTable)
            .values({ conversationId, generation: state.generation });
    }
    if (action === "refresh") {
        const close = conversationAnalysisCloseTable;
        await db
            .update(close)
            .set({ requestedResultRevision: state.generation })
            .where(
                and(
                    eq(close.id, command.closeId),
                    eq(close.selectedInputMode, "live"),
                ),
            );
    }
    // Reopen changes only authorization/generation. It never waits for a worker's
    // captured-input/job lock or edits the old numerical evidence in place.
    const payload: SSEEventDataByType["conversation_qv_calculation_updated"] = {
        conversationSlugId,
        generation: state.generation,
        status: action === "open" ? "open" : "calculating",
        ...(action === "refresh" ? { closeId: command.closeId } : {}),
    };
    await queueQvCalculationUpdated({ db, payload });
}

export async function queueQvCalculationUpdated({
    db,
    payload,
}: {
    db: PostgresTransaction;
    payload: SSEEventDataByType["conversation_qv_calculation_updated"];
}): Promise<void> {
    const events = await db
        .insert(realtimeEventOutboxTable)
        .values({
            eventType: "conversation_qv_calculation_updated",
            payload,
        })
        .returning({ id: realtimeEventOutboxTable.id });
    const event = events.at(0);
    if (event === undefined) throw new Error("QV lifecycle event unavailable");
    await db.insert(realtimeEventOutboxTopicTable).values({
        eventId: event.id,
        topic: buildRealtimeConversationTopic({
            conversationSlugId: payload.conversationSlugId,
        }),
    });
}
