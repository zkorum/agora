import { sql } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { log } from "@/app.js";
import { conversationContentTable } from "@/shared-backend/schema.js";
import {
    LEGACY_MAX_LENGTH_CONVERSATION_BODY_HTML_OUTPUT,
    MAX_LENGTH_CONVERSATION_BODY,
    MAX_LENGTH_CONVERSATION_BODY_HTML,
} from "@/shared/shared.js";

export function logActiveConversationBodyLimits(): void {
    log.info(
        {
            maxConversationBodyPlainTextChars: MAX_LENGTH_CONVERSATION_BODY,
            maxConversationBodyHtmlChars: MAX_LENGTH_CONVERSATION_BODY_HTML,
            legacyMaxConversationBodyHtmlOutputChars:
                LEGACY_MAX_LENGTH_CONVERSATION_BODY_HTML_OUTPUT,
        },
        "[ConversationLimits] Active conversation body limits",
    );
}

export async function logConversationBodyLimitCompatibility({
    db,
}: {
    db: PostgresDatabase;
}): Promise<void> {
    try {
        const rows = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(conversationContentTable)
            .where(
                sql`${conversationContentTable.body} IS NOT NULL AND length(${conversationContentTable.body}) > ${MAX_LENGTH_CONVERSATION_BODY_HTML}`,
            );

        log.info(
            { legacyConversationBodiesOverNewHtmlLimit: rows.at(0)?.count ?? 0 },
            "[ConversationLimits] Legacy conversation body compatibility check",
        );
    } catch (error) {
        log.warn(
            error,
            "[ConversationLimits] Failed legacy conversation body compatibility check",
        );
    }
}
