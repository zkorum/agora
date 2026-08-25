import { eq } from "drizzle-orm";
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
        .where(eq(projectTable.id, projectId))
        .for("update");
    return rows.length === 1;
}
