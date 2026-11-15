import { eq, sql } from "drizzle-orm";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    qvCalculationStateTable,
    qvCalculationTable,
    realtimeEventOutboxTable,
    realtimeEventOutboxTopicTable,
} from "@/shared-backend/schema.js";
import {
    buildRealtimeConversationTopic,
    type SSEEventDataByType,
} from "@/shared/types/dto.js";

/** Caller holds the conversation's write lifecycle lock. No ballot reads/copies here. */
export async function transitionQvCalculation({
    db,
    conversationId,
    conversationSlugId,
    action,
}: {
    db: PostgresTransaction;
    conversationId: number;
    conversationSlugId: string;
    action: "close" | "open";
}): Promise<void> {
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
    if (action === "close") {
        await db
            .insert(qvCalculationTable)
            .values({ conversationId, generation: state.generation });
    }
    // Reopen changes only authorization/generation. It never waits for a worker's
    // captured-input/job lock or edits the old numerical evidence in place.
    const payload: SSEEventDataByType["conversation_qv_calculation_updated"] = {
        conversationSlugId,
        generation: state.generation,
        status: action === "close" ? "calculating" : "open",
    };
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
        topic: buildRealtimeConversationTopic({ conversationSlugId }),
    });
}
