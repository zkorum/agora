import { and, eq, isNotNull, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationTable,
    projectContentTable,
    projectTable,
} from "@/shared-backend/schema.js";
import {
    effectiveConversationIndexing,
    projectListedForDiscovery,
} from "./conversationDiscovery.js";

export async function isConversationIndexable({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}): Promise<boolean> {
    // This independent crawler request cannot reuse a write result. Read the
    // writer so making a conversation unlisted takes effect despite replica lag.
    const conversations = await getPrimaryDatabase(db)
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                effectiveConversationIndexing(),
                eq(conversationTable.isImporting, false),
                isNull(conversationTable.deletedAt),
                isNotNull(conversationTable.currentContentId),
            ),
        )
        .limit(1);

    return conversations.length > 0;
}

export async function isProjectIndexable({
    db,
    projectSlug,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
}): Promise<boolean> {
    const projects = await getPrimaryDatabase(db)
        .select({ id: projectTable.id })
        .from(projectTable)
        .innerJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                projectListedForDiscovery(),
                isNull(projectContentTable.deletedAt),
            ),
        )
        .limit(1);
    return projects.length > 0;
}
