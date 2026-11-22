import { and, eq, inArray, isNull, ne, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    organizationMembershipTable,
    organizationTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
} from "@/shared-backend/schema.js";
import { getAccountDatabaseTime } from "./accountDatabaseTime.js";

// Eligibility for deleting an account is a persisted-governance invariant,
// not a second authorization check for the requesting actor.
export async function retireAccountDefaultResources({
    db,
    userId,
}: {
    db: PostgresTransaction;
    userId: string;
}): Promise<
    | { success: true; now: Date }
    | { success: false; reason: "last_active_organization_admin" }
> {
    const blocked = {
        success: false,
        reason: "last_active_organization_admin",
    } as const;
    const organizations = await db
        .select({
            id: organizationTable.id,
            personalUserId: organizationTable.autoProvisionedForUserId,
            visibility: organizationTable.directoryVisibility,
        })
        .from(organizationTable)
        .innerJoin(
            organizationMembershipTable,
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    organizationTable.id,
                ),
                eq(organizationMembershipTable.userId, userId),
                eq(organizationMembershipTable.role, "admin"),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .where(isNull(organizationTable.deletedAt))
        .orderBy(organizationTable.id)
        .for("update", { of: organizationTable });
    if (organizations.length === 0)
        return {
            success: true,
            now: await getAccountDatabaseTime({ db, userId }),
        };

    const otherMembership = alias(organizationMembershipTable, "other_admin");
    // A separate statement gets a fresh snapshot after any organization-lock wait.
    const lastAdminOrganizations = await db
        .select({ id: organizationTable.id })
        .from(organizationTable)
        .where(
            and(
                inArray(
                    organizationTable.id,
                    organizations.map((organization) => organization.id),
                ),
                notExists(
                    db
                        .select({ id: otherMembership.id })
                        .from(otherMembership)
                        .innerJoin(
                            userTable,
                            and(
                                eq(userTable.id, otherMembership.userId),
                                eq(userTable.isDeleted, false),
                            ),
                        )
                        .where(
                            and(
                                eq(
                                    otherMembership.organizationId,
                                    organizationTable.id,
                                ),
                                ne(otherMembership.userId, userId),
                                eq(otherMembership.role, "admin"),
                                isNull(otherMembership.deletedAt),
                            ),
                        ),
                ),
            ),
        );
    const lastAdminIds = new Set(
        lastAdminOrganizations.map((organization) => organization.id),
    );
    const personalOrganizations = organizations.filter((organization) =>
        lastAdminIds.has(organization.id),
    );
    // Auto-provisioning is provenance, not proof that a promoted organization is
    // still a default. Listed organizations must go through administrator support.
    if (
        personalOrganizations.some(
            (organization) =>
                organization.personalUserId !== userId ||
                organization.visibility !== "unlisted",
        )
    )
        return blocked;

    const defaults: { organizationId: number; projectIds: number[] }[] = [];
    for (const organization of personalOrganizations) {
        const projects = await db
            .select({
                id: projectTable.id,
                defaultOrganizationId:
                    projectTable.autoProvisionedForOrganizationId,
                visibility: projectTable.directoryVisibility,
            })
            .from(projectTable)
            .innerJoin(
                projectOrganizationOwnershipTable,
                and(
                    eq(
                        projectOrganizationOwnershipTable.projectId,
                        projectTable.id,
                    ),
                    eq(
                        projectOrganizationOwnershipTable.organizationId,
                        organization.id,
                    ),
                    isNull(projectOrganizationOwnershipTable.deletedAt),
                ),
            )
            .where(isNull(projectTable.deletedAt))
            .orderBy(projectTable.id)
            .for("update", { of: projectTable });
        if (
            projects.some(
                (project) =>
                    project.defaultOrganizationId !== organization.id ||
                    project.visibility !== "unlisted",
            )
        )
            return blocked;
        defaults.push({
            organizationId: organization.id,
            projectIds: projects.map((project) => project.id),
        });
    }

    const now = await getAccountDatabaseTime({ db, userId });
    for (const resource of defaults) {
        const otherOwnership = alias(
            projectOrganizationOwnershipTable,
            "other_owner",
        );
        // Preserve shared defaults when another active owning organization remains.
        await db
            .update(projectTable)
            .set({
                deletedAt: now,
                retiredForAccountDeletionAt: now,
                updatedAt: now,
            })
            .where(
                and(
                    inArray(projectTable.id, resource.projectIds),
                    notExists(
                        db
                            .select({ id: otherOwnership.id })
                            .from(otherOwnership)
                            .innerJoin(
                                organizationTable,
                                and(
                                    eq(
                                        organizationTable.id,
                                        otherOwnership.organizationId,
                                    ),
                                    isNull(organizationTable.deletedAt),
                                ),
                            )
                            .where(
                                and(
                                    eq(
                                        otherOwnership.projectId,
                                        projectTable.id,
                                    ),
                                    ne(
                                        otherOwnership.organizationId,
                                        resource.organizationId,
                                    ),
                                    isNull(otherOwnership.deletedAt),
                                ),
                            ),
                    ),
                ),
            );
        await db
            .update(organizationTable)
            .set({
                deletedAt: now,
                retiredForAccountDeletionAt: now,
                updatedAt: now,
            })
            .where(eq(organizationTable.id, resource.organizationId));
    }
    return { success: true, now };
}

export async function restoreAccountDefaultResources({
    db,
    userId,
    requestedAt,
    now,
}: {
    db: PostgresTransaction;
    userId: string;
    requestedAt: Date;
    now: Date;
}): Promise<void> {
    const organizations = await db
        .update(organizationTable)
        .set({
            deletedAt: null,
            retiredForAccountDeletionAt: null,
            updatedAt: now,
        })
        .where(
            and(
                eq(organizationTable.autoProvisionedForUserId, userId),
                eq(organizationTable.retiredForAccountDeletionAt, requestedAt),
            ),
        )
        .returning({ id: organizationTable.id });
    if (organizations.length === 0) return;
    await db
        .update(projectTable)
        .set({
            deletedAt: null,
            retiredForAccountDeletionAt: null,
            updatedAt: now,
        })
        .where(
            and(
                inArray(
                    projectTable.autoProvisionedForOrganizationId,
                    organizations.map((organization) => organization.id),
                ),
                eq(projectTable.retiredForAccountDeletionAt, requestedAt),
            ),
        );
}
