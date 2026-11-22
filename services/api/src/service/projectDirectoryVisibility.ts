import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import { projectTable } from "@/shared-backend/schema.js";
import type {
    SetProjectDirectoryVisibilityRequest,
    SetProjectDirectoryVisibilityResponse,
} from "@/shared/types/dto.js";
import { isSiteOrgAdminAccount } from "./authUtil.js";
import { requireProjectCapabilityBySlug } from "./organizationAuthorization.js";
import {
    withProjectOwnershipTransaction,
    type ProjectOwnershipDatabase,
} from "./projectOwnership.js";

export async function setProjectDirectoryVisibility({
    db,
    userId,
    request,
}: {
    db: ProjectOwnershipDatabase;
    userId: string;
    request: SetProjectDirectoryVisibilityRequest;
}): Promise<SetProjectDirectoryVisibilityResponse> {
    return await withProjectOwnershipTransaction({
        db,
        operation: async (tx) => {
            // Use the same snapshot for authorization and the write. A denied
            // request never locks the project, and a reused slug cannot retarget it.
            if (!(await isSiteOrgAdminAccount({ db: tx, userId }))) {
                await requireProjectCapabilityBySlug({
                    db: tx,
                    userId,
                    projectSlug: request.projectSlug,
                    capability: "project_update",
                });
            }
            const rows = await tx
                .select({
                    id: projectTable.id,
                    directoryVisibility: projectTable.directoryVisibility,
                })
                .from(projectTable)
                .where(
                    and(
                        eq(projectTable.slug, request.projectSlug),
                        isNull(projectTable.deletedAt),
                        isNotNull(projectTable.currentContentId),
                    ),
                )
                .limit(1);
            const project = rows.at(0);
            if (project === undefined)
                throw httpErrors.notFound("Project not found");
            if (project.directoryVisibility !== request.directoryVisibility) {
                await tx
                    .update(projectTable)
                    .set({
                        directoryVisibility: request.directoryVisibility,
                        updatedAt: new Date(),
                    })
                    .where(eq(projectTable.id, project.id));
            }
            return { directoryVisibility: request.directoryVisibility };
        },
    });
}
