import {
    and,
    eq,
    exists,
    inArray,
    isNotNull,
    isNull,
    or,
    sql,
} from "drizzle-orm";
import type { ReplicaDatabase } from "@/shared-backend/db.js";
import {
    gatheringResponseTable,
    userTable,
    organizationMembershipTable,
    organizationTable,
    projectOrganizationOwnershipTable,
} from "@/shared-backend/schema.js";
import {
    organizationRolesWithCapability,
    type ProjectCapability,
} from "@/shared/organizationAccess.js";
import type { SqlExpression } from "@/utils/sqlExpression.js";

/** Keep capability checks in the statement reading private data, not in an earlier snapshot. */
export function gatheringProjectCapabilityCondition({
    db,
    userId,
    projectId,
    capabilities,
}: {
    db: ReplicaDatabase;
    userId: string | undefined;
    projectId: number | SqlExpression<number>;
    capabilities: readonly [ProjectCapability, ...ProjectCapability[]];
}) {
    if (userId === undefined) return sql`false`;
    return exists(
        db
            .select({ id: organizationMembershipTable.id })
            .from(organizationMembershipTable)
            .innerJoin(
                organizationTable,
                and(
                    eq(
                        organizationTable.id,
                        organizationMembershipTable.organizationId,
                    ),
                    isNull(organizationTable.deletedAt),
                ),
            )
            .innerJoin(
                userTable,
                and(
                    eq(userTable.id, organizationMembershipTable.userId),
                    eq(userTable.isDeleted, false),
                    isNull(userTable.authRestrictedAt),
                ),
            )
            .innerJoin(
                projectOrganizationOwnershipTable,
                and(
                    eq(
                        projectOrganizationOwnershipTable.organizationId,
                        organizationMembershipTable.organizationId,
                    ),
                    eq(projectOrganizationOwnershipTable.projectId, projectId),
                    isNull(projectOrganizationOwnershipTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(organizationMembershipTable.userId, userId),
                    isNull(organizationMembershipTable.deletedAt),
                    inArray(organizationMembershipTable.role, [
                        ...new Set(
                            capabilities.flatMap(
                                organizationRolesWithCapability,
                            ),
                        ),
                    ]),
                ),
            ),
    );
}

/** Shared by response readers and display counts; never treat detached authors as public content. */
export function gatheringResponseEligibility(db: ReplicaDatabase) {
    return and(
        isNull(gatheringResponseTable.deletedAt),
        isNull(gatheringResponseTable.accountHiddenAt),
        isNotNull(gatheringResponseTable.currentContentId),
        or(
            eq(gatheringResponseTable.isSeed, true),
            inArray(
                gatheringResponseTable.authorId,
                db
                    .select({ id: userTable.id })
                    .from(userTable)
                    .where(
                        and(
                            eq(userTable.isDeleted, false),
                            isNull(userTable.authRestrictedAt),
                        ),
                    ),
            ),
        ),
    );
}

export function gatheringOwnResponseCondition(userId: string | undefined) {
    return userId === undefined
        ? sql`false`
        : and(
              eq(gatheringResponseTable.authorId, userId),
              eq(gatheringResponseTable.isSeed, false),
          );
}
