import { httpErrors } from "@fastify/sensible";
import { and, eq, exists, inArray, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationTable,
    organizationMembershipTable,
    organizationTable,
    opinionTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
} from "@/shared-backend/schema.js";
import {
    organizationRolesWithCapability,
    organizationRoleHasCapability,
    organizationRoleCapabilities,
    projectCapabilityValues,
    type OrganizationManagementPermissions,
    type ProjectManagementPermissions,
    type OrganizationAccessCapability,
    type ProjectCapability,
} from "@/shared/organizationAccess.js";
import type { ConversationProjectTarget } from "@/shared/types/zod.js";
import { canManageOpinion } from "./opinionPermissions.js";
import { Dto } from "@/shared/types/dto.js";
import type { z } from "zod";

export function getOrganizationManagementPermissions(
    capabilities: ReadonlySet<OrganizationAccessCapability>,
): OrganizationManagementPermissions {
    return {
        canUpdate: capabilities.has("organization_manage_profile"),
        canManageMembers: capabilities.has("organization_manage_members"),
        canCreateProjects: capabilities.has("project_create"),
        canDelete: capabilities.has("organization_delete"),
        canConfigureEmailUpdates: capabilities.has("conversation_email_update"),
    };
}

export function getProjectManagementPermissions(
    capabilities: ReadonlySet<ProjectCapability>,
): ProjectManagementPermissions {
    return {
        canUpdate: capabilities.has("project_update"),
        canDelete: capabilities.has("project_delete"),
        canManageOwners: capabilities.has("project_manage_owner_organizations"),
        canConfigureEmailUpdates: capabilities.has("conversation_email_update"),
        canViewRestrictedDocuments: capabilities.has(
            "project_view_restricted_documents",
        ),
    };
}

// Called by index.ts before mutations, never by the mutation services themselves.
export async function requireOrganizationCapability({
    db,
    userId,
    organizationSlug,
    capability,
}: {
    db: PostgresJsDatabase;
    userId: string;
    organizationSlug: string;
    capability: OrganizationAccessCapability;
}): Promise<ReadonlySet<OrganizationAccessCapability>> {
    const rows = await getPrimaryDatabase(db)
        .select({ role: organizationMembershipTable.role })
        .from(organizationMembershipTable)
        .innerJoin(
            organizationTable,
            eq(
                organizationTable.id,
                organizationMembershipTable.organizationId,
            ),
        )
        .innerJoin(
            userTable,
            eq(userTable.id, organizationMembershipTable.userId),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                eq(organizationTable.slug, organizationSlug),
                isNull(organizationTable.deletedAt),
                isNull(organizationMembershipTable.deletedAt),
                eq(userTable.isDeleted, false),
                inArray(
                    organizationMembershipTable.role,
                    organizationRolesWithCapability(capability),
                ),
            ),
        )
        .limit(1);
    if (rows.length === 0)
        throw httpErrors.forbidden("Missing organization capability");
    return new Set(
        rows.flatMap((row) => organizationRoleCapabilities[row.role]),
    );
}

export async function requireProjectCapabilityBySlug({
    db,
    userId,
    projectSlug,
    capability,
    ownerOrganizationSlugs,
}: {
    db: PostgresJsDatabase;
    userId: string;
    projectSlug: string;
    capability: ProjectCapability;
    ownerOrganizationSlugs?: readonly string[];
}): Promise<ReadonlySet<ProjectCapability>> {
    const rows = await getPrimaryDatabase(db)
        .select({
            role: organizationMembershipTable.role,
            ownerSlug: organizationTable.slug,
        })
        .from(projectTable)
        .innerJoin(
            projectOrganizationOwnershipTable,
            eq(projectOrganizationOwnershipTable.projectId, projectTable.id),
        )
        .innerJoin(
            organizationTable,
            eq(
                organizationTable.id,
                projectOrganizationOwnershipTable.organizationId,
            ),
        )
        .leftJoin(
            organizationMembershipTable,
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    organizationTable.id,
                ),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .innerJoin(userTable, eq(userTable.id, userId))
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                isNull(projectTable.deletedAt),
                isNull(projectOrganizationOwnershipTable.deletedAt),
                isNull(organizationTable.deletedAt),
                eq(userTable.isDeleted, false),
            ),
        );
    const hasCapability = (required: ProjectCapability): boolean =>
        rows.some(
            (row) =>
                row.role !== null &&
                organizationRoleHasCapability({
                    role: row.role,
                    capability: required,
                }),
        );
    if (!hasCapability(capability))
        throw httpErrors.forbidden("Missing project capability");
    if (ownerOrganizationSlugs !== undefined) {
        const owners = new Set(rows.map((row) => row.ownerSlug));
        const requested = new Set(ownerOrganizationSlugs);
        const changed =
            owners.size !== requested.size ||
            [...requested].some((slug) => !owners.has(slug));
        if (changed && !hasCapability("project_manage_owner_organizations"))
            throw httpErrors.forbidden("Missing project ownership capability");
    }
    return new Set(projectCapabilityValues.filter(hasCapability));
}

export async function hasConversationCapabilityBySlug({
    db,
    userId,
    conversationSlugId,
    capability,
}: {
    db: PostgresJsDatabase;
    userId: string | undefined;
    conversationSlugId: string;
    capability: ProjectCapability;
}): Promise<boolean> {
    return await hasScopedProjectCapability({
        db,
        userId,
        capability,
        target: { kind: "conversation", conversationSlugId },
    });
}

export async function hasScopedProjectCapability({
    db,
    userId,
    target,
    capability,
}: {
    db: PostgresJsDatabase;
    userId: string | undefined;
    target:
        | { kind: "project"; projectSlug: string }
        | { kind: "conversation"; conversationSlugId: string };
    capability: ProjectCapability;
}): Promise<boolean> {
    if (userId === undefined) return false;
    const writer = getPrimaryDatabase(db);
    const rows = await writer
        .select({ id: organizationMembershipTable.id })
        .from(projectTable)
        .innerJoin(
            projectOrganizationOwnershipTable,
            eq(projectOrganizationOwnershipTable.projectId, projectTable.id),
        )
        .innerJoin(
            organizationTable,
            eq(
                organizationTable.id,
                projectOrganizationOwnershipTable.organizationId,
            ),
        )
        .innerJoin(
            organizationMembershipTable,
            eq(
                organizationMembershipTable.organizationId,
                organizationTable.id,
            ),
        )
        .innerJoin(
            userTable,
            eq(userTable.id, organizationMembershipTable.userId),
        )
        .where(
            and(
                target.kind === "project"
                    ? eq(projectTable.slug, target.projectSlug)
                    : exists(
                          writer
                              .select({ id: conversationTable.id })
                              .from(conversationTable)
                              .where(
                                  and(
                                      eq(
                                          conversationTable.projectId,
                                          projectTable.id,
                                      ),
                                      eq(
                                          conversationTable.slugId,
                                          target.conversationSlugId,
                                      ),
                                      isNull(conversationTable.deletedAt),
                                  ),
                              ),
                      ),
                isNull(projectTable.deletedAt),
                isNull(projectOrganizationOwnershipTable.deletedAt),
                isNull(organizationTable.deletedAt),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
                eq(userTable.isDeleted, false),
                inArray(
                    organizationMembershipTable.role,
                    organizationRolesWithCapability(capability),
                ),
            ),
        )
        .limit(1);
    return rows.length !== 0;
}

export async function requireConversationCapabilityBySlug(params: {
    db: PostgresJsDatabase;
    userId: string;
    conversationSlugId: string;
    capability: ProjectCapability;
}): Promise<void> {
    if (!(await hasConversationCapabilityBySlug(params)))
        throw httpErrors.forbidden("Missing conversation capability");
}

export async function requireConversationDestination({
    db,
    userId,
    target,
}: {
    db: PostgresJsDatabase;
    userId: string;
    target: ConversationProjectTarget;
}): Promise<void> {
    if (target.kind === "project") {
        await requireProjectCapabilityBySlug({
            db,
            userId,
            projectSlug: target.projectSlug,
            capability: "conversation_create",
        });
        return;
    }
    const rows = await getPrimaryDatabase(db)
        .select({ role: organizationMembershipTable.role })
        .from(organizationTable)
        .leftJoin(
            organizationMembershipTable,
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    organizationTable.id,
                ),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .where(
            and(
                target.organizationSlug === undefined
                    ? eq(organizationTable.autoProvisionedForUserId, userId)
                    : and(
                          eq(organizationTable.slug, target.organizationSlug),
                          or(
                              isNull(
                                  organizationTable.autoProvisionedForUserId,
                              ),
                              eq(
                                  organizationTable.autoProvisionedForUserId,
                                  userId,
                              ),
                              eq(
                                  organizationTable.directoryVisibility,
                                  "listed",
                              ),
                          ),
                      ),
                isNull(organizationTable.deletedAt),
            ),
        )
        .limit(1);
    // A missing personal backing organization will be provisioned for this account.
    if (rows.length === 0 && target.organizationSlug === undefined) return;
    const role = rows.at(0)?.role;
    if (
        role === undefined ||
        role === null ||
        !organizationRoleHasCapability({
            role,
            capability: "conversation_create",
        })
    ) {
        throw httpErrors.forbidden("Missing personal conversation capability");
    }
}

export async function getOrganizationIdsWithCapability({
    db,
    userId,
    capability,
}: {
    db: PostgresJsDatabase;
    userId: string;
    capability: OrganizationAccessCapability;
}): Promise<number[]> {
    const rows = await getPrimaryDatabase(db)
        .select({ id: organizationTable.id })
        .from(organizationTable)
        .innerJoin(
            organizationMembershipTable,
            eq(
                organizationMembershipTable.organizationId,
                organizationTable.id,
            ),
        )
        .innerJoin(
            userTable,
            eq(userTable.id, organizationMembershipTable.userId),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
                isNull(organizationTable.deletedAt),
                eq(userTable.isDeleted, false),
                inArray(
                    organizationMembershipTable.role,
                    organizationRolesWithCapability(capability),
                ),
            ),
        );
    return rows.map((row) => row.id);
}

export async function requireProjectCreation({
    db,
    userId,
    ownerOrganizationSlugs,
}: {
    db: PostgresJsDatabase;
    userId: string;
    ownerOrganizationSlugs: readonly string[];
}): Promise<void> {
    const rows = await getPrimaryDatabase(db)
        .select({ slug: organizationTable.slug })
        .from(organizationTable)
        .innerJoin(
            organizationMembershipTable,
            eq(
                organizationMembershipTable.organizationId,
                organizationTable.id,
            ),
        )
        .innerJoin(
            userTable,
            eq(userTable.id, organizationMembershipTable.userId),
        )
        .where(
            and(
                inArray(organizationTable.slug, [...ownerOrganizationSlugs]),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
                isNull(organizationTable.deletedAt),
                eq(userTable.isDeleted, false),
                inArray(
                    organizationMembershipTable.role,
                    organizationRolesWithCapability("project_create"),
                ),
            ),
        );
    const available = new Set(rows.map((row) => row.slug));
    if (
        ownerOrganizationSlugs.length === 0 ||
        ownerOrganizationSlugs.some((slug) => !available.has(slug))
    )
        throw httpErrors.forbidden("Missing project creation capability");
}

export async function requireOpinionManagement({
    db,
    userId,
    opinionSlugId,
}: {
    db: PostgresJsDatabase;
    userId: string;
    opinionSlugId: string;
}): Promise<void> {
    const writer = getPrimaryDatabase(db);
    const opinion = (
        await writer
            .select({
                authorId: opinionTable.authorId,
                isSeed: opinionTable.isSeed,
                projectId: conversationTable.projectId,
            })
            .from(opinionTable)
            .innerJoin(
                conversationTable,
                eq(conversationTable.id, opinionTable.conversationId),
            )
            .where(eq(opinionTable.slugId, opinionSlugId))
            .limit(1)
    ).at(0);
    if (opinion === undefined) throw httpErrors.notFound("Statement not found");
    if (!(await canManageOpinion({ db: writer, userId, opinion })))
        throw httpErrors.forbidden("Missing statement management permission");
}

export async function getManagementAccess({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}): Promise<z.infer<typeof Dto.getManagementAccessResponse>> {
    const rows = await getPrimaryDatabase(db)
        .select({
            isSiteOrgAdmin: userTable.isSiteOrgAdmin,
            slug: organizationTable.slug,
            name: organizationTable.displayName,
            role: organizationMembershipTable.role,
        })
        .from(userTable)
        .leftJoin(
            organizationMembershipTable,
            and(
                eq(organizationMembershipTable.userId, userTable.id),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .leftJoin(
            organizationTable,
            and(
                eq(
                    organizationTable.id,
                    organizationMembershipTable.organizationId,
                ),
                isNull(organizationTable.deletedAt),
                or(
                    eq(organizationTable.directoryVisibility, "listed"),
                    isNull(organizationTable.autoProvisionedForUserId),
                ),
            ),
        )
        .where(and(eq(userTable.id, userId), eq(userTable.isDeleted, false)));
    const teamAccess = rows.some((row) => row.isSiteOrgAdmin);
    const organizations = rows.flatMap((row) =>
        row.slug === null || row.name === null || row.role === null
            ? []
            : [{ slug: row.slug, name: row.name, role: row.role }],
    );
    const has = (capability: OrganizationAccessCapability): boolean =>
        teamAccess ||
        organizations.some(({ role }) =>
            organizationRoleHasCapability({ role, capability }),
        );
    return {
        organizations,
        permissions: {
            canManageOrganizations: has("organization_manage_profile"),
            canManageProjects: has("project_update"),
            canCreateProjects: has("project_create"),
            canCreateOrganizations: teamAccess,
            canManagePremiumEntitlements: teamAccess,
        },
    };
}
