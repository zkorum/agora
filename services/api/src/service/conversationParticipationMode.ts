import { eq, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ReplicaDatabase } from "@/shared-backend/db.js";
import { conversationTable, projectTable } from "@/shared-backend/schema.js";
import type { ParticipationMode } from "@/shared/participationMode.js";

export function getEffectiveConversationParticipationMode(
    projectMode: typeof projectTable.participationMode | SQL<ParticipationMode>,
): SQL<ParticipationMode> {
    // CASE has no Drizzle expression helper.
    return sql<ParticipationMode>`case when ${eq(
        conversationTable.participationModeSettingsSource,
        "project_inherited",
    )} then ${projectMode} else ${conversationTable.participationMode} end`;
}

export function getEffectiveConversationParticipationModeWithProjectLookup(
    db: Pick<ReplicaDatabase, "select">,
): SQL<ParticipationMode> {
    const project = alias(projectTable, "participation_mode_project");
    const projectMode = db
        .select({ mode: project.participationMode })
        .from(project)
        .where(eq(project.id, conversationTable.projectId));
    // Standalone reads and UPDATE RETURNING cannot use a joined project column.
    return getEffectiveConversationParticipationMode(
        sql<ParticipationMode>`(${projectMode})`,
    );
}
