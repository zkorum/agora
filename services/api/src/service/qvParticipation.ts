import { and, eq, isNotNull } from "drizzle-orm";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    conversationTable,
    creditVotingConfigTable,
} from "@/shared-backend/schema.js";

/** Explicit response saves run admission and this boundary in one writer transaction. Unsaved edits stay in the frontend. */
export async function withQvStatementSetForResponseSave<T>({
    tx,
    conversationId,
    expectedRevision,
    persist,
}: {
    tx: PostgresTransaction;
    conversationId: number;
    expectedRevision: number;
    // Rejected writes throw so the surrounding transaction rolls back any changes.
    persist: (
        config: Pick<
            typeof creditVotingConfigTable.$inferSelect,
            "allowOpposition"
        >,
    ) => Promise<T>;
}): Promise<
    | { success: true; value: T }
    | { success: false; reason: "not_found" | "closed" | "version_conflict" }
> {
    const conversations = await tx
        .select({
            isClosed: conversationTable.isClosed,
            configId: conversationTable.creditVotingConfigId,
        })
        .from(conversationTable)
        .where(
            and(
                eq(conversationTable.id, conversationId),
                eq(conversationTable.prioritizationType, "qv"),
                isNotNull(conversationTable.currentContentId),
            ),
        )
        .for("share");
    const conversation = conversations.at(0);
    if (conversation?.configId == null)
        return { success: false, reason: "not_found" };
    if (conversation.isClosed) return { success: false, reason: "closed" };
    const configId = conversation.configId;
    const query = () =>
        tx
            .select()
            .from(creditVotingConfigTable)
            .where(eq(creditVotingConfigTable.id, configId));
    const observed = (await query()).at(0);
    if (observed === undefined) return { success: false, reason: "not_found" };
    // Statement mutations take conversation UPDATE before configuration UPDATE.
    // Already-started activities never need this exclusive configuration path.
    const config =
        observed.statementsLockedAt === null
            ? (await query().for("update")).at(0)
            : observed;
    if (config === undefined) return { success: false, reason: "not_found" };
    if (config.statementSetRevision !== expectedRevision)
        return { success: false, reason: "version_conflict" };
    const value = await persist(config);
    if (config.statementsLockedAt === null) {
        await tx
            .update(creditVotingConfigTable)
            .set({ statementsLockedAt: new Date() })
            .where(eq(creditVotingConfigTable.id, config.id));
    }
    return { success: true, value };
}
