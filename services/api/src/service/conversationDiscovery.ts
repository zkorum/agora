import { and, eq, exists, isNull, sql, type SQL } from "drizzle-orm";
import type { ReplicaDatabase } from "@/shared-backend/db.js";
import { conversationTable, projectTable } from "@/shared-backend/schema.js";

export function projectListedForDiscovery(): SQL<boolean> {
    return sql<boolean>`${and(
        eq(projectTable.directoryVisibility, "listed"),
        isNull(projectTable.deletedAt),
    )}`;
}

function conversationIndexingIntent() {
    return eq(conversationTable.isIndexed, true);
}

/** The stored isIndexed flag is legacy conversation intent, not the result. */
export function effectiveConversationIndexing(): SQL<boolean> {
    return sql<boolean>`${and(
        conversationIndexingIntent(),
        projectListedForDiscovery(),
    )}`;
}

/** Use when a project join is not available, including UPDATE RETURNING. */
export function effectiveConversationIndexingWithProjectLookup(
    db: Pick<ReplicaDatabase, "select">,
): SQL<boolean> {
    const listedProject = db
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.id, conversationTable.projectId),
                projectListedForDiscovery(),
            ),
        );
    return sql<boolean>`${and(
        conversationIndexingIntent(),
        exists(listedProject),
    )}`;
}
