import {
    and,
    eq,
    exists,
    isNotNull,
    isNull,
    type SQLWrapper,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ReplicaDatabase } from "@/shared-backend/db.js";
import {
    analysisWorkStateTable,
    conversationAnalysisCloseTable,
    conversationTable,
    projectTable,
} from "@/shared-backend/schema.js";

function activeAnalysisConversationCondition() {
    return and(
        eq(conversationTable.isImporting, false),
        isNotNull(conversationTable.currentContentId),
        isNull(conversationTable.deletedAt),
    );
}

export function readableAnalysisConversationCondition(db: ReplicaDatabase) {
    return and(
        activeAnalysisConversationCondition(),
        exists(
            db
                .select({ id: projectTable.id })
                .from(projectTable)
                .where(
                    and(
                        eq(projectTable.id, conversationTable.projectId),
                        isNull(projectTable.deletedAt),
                    ),
                ),
        ),
    );
}

export function currentAnalysisCloseCondition() {
    const close = conversationAnalysisCloseTable;
    const conversation = conversationTable;
    return and(
        eq(close.conversationId, conversation.id),
        eq(close.closeEpoch, conversation.voteBufferEpoch),
        eq(close.sourceRevision, conversation.closingTargetRevision),
        eq(close.finalizedAt, conversation.closedFinalizedAt),
        eq(conversation.isClosed, true),
        eq(conversation.voteBufferDrained, true),
        activeAnalysisConversationCondition(),
    );
}

export function hasFailedPolisWork({
    db,
    conversationId,
    revision,
    usesClosingInputs,
}: {
    db: PostgresJsDatabase;
    conversationId: number | SQLWrapper;
    revision: number | SQLWrapper;
    usesClosingInputs: SQLWrapper;
}) {
    const work = analysisWorkStateTable;
    return exists(
        db
            .select({ id: work.id })
            .from(work)
            .where(
                and(
                    eq(work.conversationId, conversationId),
                    eq(work.usesClosingInputs, usesClosingInputs),
                    eq(work.nonRetryableGeneration, revision),
                    isNull(work.runningDataGeneration),
                ),
            ),
    );
}
