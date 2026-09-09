import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { projectTable } from "@/shared-backend/schema.js";

export async function lockConversationEmailUpdateProject({
    db,
    projectId,
    lockMode = "update",
}: {
    db: PostgresJsDatabase;
    projectId: number;
    lockMode?: "update" | "no key update";
}): Promise<boolean> {
    const rows = await db
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(
            and(eq(projectTable.id, projectId), isNull(projectTable.deletedAt)),
        )
        // NO KEY UPDATE still serializes writers without blocking preference FK checks.
        .for(lockMode);
    return rows.length === 1;
}
