import { httpErrors } from "@fastify/sensible";
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { checkFeatureAccess } from "@/shared-app-api/featureAccess.js";
import {
    conversationTable,
    organizationTable,
    projectOrganizationOwnershipTable,
} from "@/shared-backend/schema.js";

export function createComparisonGitHubAccess({
    db,
    isOrgOnly,
    allowedOrgs,
    allowedUsers,
}: {
    db: PostgresJsDatabase;
    isOrgOnly: boolean;
    allowedOrgs: string;
    allowedUsers: string;
}) {
    function getAccess({
        userId,
        postAsOrganization,
    }: {
        userId: string;
        postAsOrganization?: string;
    }) {
        return checkFeatureAccess({
            featureEnabled: true,
            isOrgOnly,
            allowedOrgs,
            allowedUsers,
            postAsOrganization:
                postAsOrganization !== undefined && postAsOrganization !== "",
            organizationName: postAsOrganization ?? "",
            userId,
        });
    }

    function assertAllowed(access: ReturnType<typeof getAccess>): void {
        if (access.allowed) return;

        switch (access.reason) {
            case "disabled":
                throw httpErrors.serviceUnavailable(
                    "Comparison GitHub connector is currently unavailable",
                );
            case "org_required":
                throw httpErrors.forbidden(
                    "Comparison GitHub connector is restricted to organization conversations",
                );
            case "org_not_in_whitelist":
                throw httpErrors.forbidden(
                    "This organization is not allowed to use the comparison GitHub connector",
                );
            case "user_not_in_whitelist":
                throw httpErrors.forbidden(
                    "This user is not allowed to use the comparison GitHub connector",
                );
        }
    }

    function assertComparisonGitHubAllowed(
        subject: Parameters<typeof getAccess>[0],
    ): void {
        assertAllowed(getAccess(subject));
    }

    async function assertComparisonGitHubAllowedForConversation({
        conversationSlugId,
        userId,
    }: {
        conversationSlugId: string;
        userId: string;
    }): Promise<void> {
        const organizations = await db
            .select({ slug: organizationTable.slug })
            .from(conversationTable)
            .innerJoin(
                projectOrganizationOwnershipTable,
                and(
                    eq(
                        projectOrganizationOwnershipTable.projectId,
                        conversationTable.projectId,
                    ),
                    isNull(projectOrganizationOwnershipTable.deletedAt),
                ),
            )
            .innerJoin(
                organizationTable,
                eq(
                    organizationTable.id,
                    projectOrganizationOwnershipTable.organizationId,
                ),
            )
            .where(
                and(
                    eq(conversationTable.slugId, conversationSlugId),
                    isNull(conversationTable.deletedAt),
                    isNull(organizationTable.autoProvisionedForUserId),
                    isNull(organizationTable.deletedAt),
                ),
            );
        // The caller must separately authorize conversation edits. On a
        // co-owned project, any active organization can qualify the project.
        let access = getAccess({ userId });
        for (const { slug } of organizations) {
            access = getAccess({ userId, postAsOrganization: slug });
            if (access.allowed) return;
        }
        assertAllowed(access);
    }

    return {
        assertComparisonGitHubAllowed,
        assertComparisonGitHubAllowedForConversation,
    };
}
