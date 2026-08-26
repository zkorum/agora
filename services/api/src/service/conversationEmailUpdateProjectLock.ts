import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { projectTable } from "@/shared-backend/schema.js";

export async function lockConversationEmailUpdateProject({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<boolean> {
    const rows = await db
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(
            and(eq(projectTable.id, projectId), isNull(projectTable.deletedAt)),
        )
        .for("update");
    return rows.length === 1;
}
