import {
    zodConversationTypeConfig,
    type ConversationTypeConfig,
    zodParticipantStatements,
} from "@/shared/types/zod.js";
import {
    conversationTable,
    creditVotingConfigTable,
    polisConversationConfigTable,
    rankingConversationConfigTable,
} from "@/shared-backend/schema.js";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { httpErrors } from "@fastify/sensible";

export async function fetchCurrentConversationTypeConfig({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<ConversationTypeConfig> {
    const settings = await fetchCurrentConversationTypeSettings({
        db,
        conversationId,
    });
    return settings.presentation;
}

export async function fetchCurrentConversationTypeSettings({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}) {
    const rows = await db
        .select({
            conversationType: conversationTable.conversationType,
            prioritizationType: conversationTable.prioritizationType,
            votingPresentation: polisConversationConfigTable.votingPresentation,
            rankingMode: rankingConversationConfigTable.rankingMode,
            allowOpposition: creditVotingConfigTable.allowOpposition,
            aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
            preferredOpinionGroupCount:
                polisConversationConfigTable.preferredOpinionGroupCount,
            polisAllowParticipantStatements:
                polisConversationConfigTable.allowParticipantStatements,
            comparisonAllowParticipantStatements:
                rankingConversationConfigTable.allowParticipantStatements,
        })
        .from(conversationTable)
        .leftJoin(
            polisConversationConfigTable,
            eq(
                polisConversationConfigTable.id,
                conversationTable.polisConfigId,
            ),
        )
        .leftJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .leftJoin(
            creditVotingConfigTable,
            eq(
                creditVotingConfigTable.id,
                conversationTable.creditVotingConfigId,
            ),
        )
        .where(eq(conversationTable.id, conversationId));
    const row = rows.at(0);
    if (row === undefined) throw httpErrors.notFound("Conversation not found");
    return {
        presentation: parseStoredConversationTypeConfig(row),
        participantStatements: parseStoredParticipantStatements(row),
        aiLabelingEnabled: row.aiLabelingEnabled ?? false,
        preferredOpinionGroupCount: row.preferredOpinionGroupCount,
    };
}

export function parseStoredParticipantStatements(row: {
    conversationType: "polis" | "prioritizing";
    prioritizationType: "comparisons" | "qv" | null;
    polisAllowParticipantStatements: boolean | null;
    comparisonAllowParticipantStatements: boolean | null;
}) {
    if (
        row.conversationType === "prioritizing" &&
        row.prioritizationType === "qv"
    )
        return zodParticipantStatements.parse({ supported: false });
    return zodParticipantStatements.parse({
        supported: true,
        enabled:
            row.conversationType === "polis"
                ? row.polisAllowParticipantStatements
                : row.comparisonAllowParticipantStatements,
    });
}

type StoredConversationTypeConfig = Pick<
    typeof conversationTable.$inferSelect,
    "conversationType" | "prioritizationType"
> & {
    votingPresentation:
        | (typeof polisConversationConfigTable.$inferSelect)["votingPresentation"]
        | null;
    rankingMode:
        | (typeof rankingConversationConfigTable.$inferSelect)["rankingMode"]
        | null;
    allowOpposition:
        | (typeof creditVotingConfigTable.$inferSelect)["allowOpposition"]
        | null;
};

export function parseStoredConversationTypeConfig({
    conversationType,
    prioritizationType,
    votingPresentation,
    rankingMode,
    allowOpposition,
}: StoredConversationTypeConfig): ConversationTypeConfig {
    if (conversationType === "polis") {
        return zodConversationTypeConfig.parse({
            conversationType,
            votingPresentation,
        });
    }
    return zodConversationTypeConfig.parse(
        prioritizationType === "qv"
            ? {
                  conversationType,
                  prioritizationType,
                  creditPricing: "quadratic",
                  allowOpposition,
              }
            : {
                  conversationType,
                  prioritizationType,
                  comparisonMethod: rankingMode,
              },
    );
}
