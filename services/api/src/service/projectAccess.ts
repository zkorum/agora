import { httpErrors } from "@fastify/sensible";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipCapabilityEnum,
    organizationMembershipCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    premiumFeatureEntitlementTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { PremiumFeature } from "@/shared/types/zod.js";
import {
    type AllProjectCapability,
    getProjectIdsWithCapabilityFromGrants,
    hasActivePremiumFeatureEntitlement,
    hasCapabilityForProject,
} from "@/service/projectAccessLogic.js";

export type OrganizationCapability =
    (typeof organizationMembershipCapabilityEnum.enumValues)[number];

const baselineOrganizationCapabilities = [
    "organization_manage_members",
    "organization_manage_profile",
    "project_create",
] satisfies readonly OrganizationCapability[];

const baselineAllProjectCapabilities = [
    "project_update",
    "project_delete",
    "project_manage_owner_organizations",
    "conversation_create",
    "conversation_update",
    "conversation_delete",
    "conversation_view_private_results",
    "conversation_export_owner_data",
    "conversation_moderate",
    "conversation_manage_integrations",
] satisfies readonly AllProjectCapability[];

function personalOrganizationSlug(userId: string): string {
    return `user-${userId.replaceAll("-", "")}`;
}

function defaultProjectSlug(organizationId: number): string {
    return `org-${String(organizationId)}-default`;
}

async function ensureBaselineCapabilities({
    db,
    organizationMembershipId,
}: {
    db: PostgresDatabase;
    organizationMembershipId: number;
}): Promise<void> {
    await db
        .insert(organizationMembershipCapabilityTable)
        .values(
            baselineOrganizationCapabilities.map((capability) => ({
                organizationMembershipId,
                capability,
            })),
        )
        .onConflictDoNothing();

    await db
        .insert(organizationMembershipAllProjectCapabilityTable)
        .values(
            baselineAllProjectCapabilities.map((capability) => ({
                organizationMembershipId,
                capability,
            })),
        )
        .onConflictDoNothing();
}

async function getOrCreateMembership({
    db,
    userId,
    organizationId,
}: {
    db: PostgresDatabase;
    userId: string;
    organizationId: number;
}): Promise<number> {
    const existingRows = await db
        .select({ id: organizationMembershipTable.id })
        .from(organizationMembershipTable)
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                eq(organizationMembershipTable.organizationId, organizationId),
            ),
        )
        .limit(1);
    const existing = existingRows.at(0);
    if (existing !== undefined) {
        return existing.id;
    }

    const insertedRows = await db
        .insert(organizationMembershipTable)
        .values({ userId, organizationId })
        .returning({ id: organizationMembershipTable.id });
    const inserted = insertedRows.at(0);
    if (inserted === undefined) {
        throw httpErrors.internalServerError(
            "Failed to create organization membership",
        );
    }
    return inserted.id;
}

export async function ensureOrganizationMembershipBaselineCapabilities({
    db,
    userId,
    organizationId,
}: {
    db: PostgresDatabase;
    userId: string;
    organizationId: number;
}): Promise<void> {
    const membershipId = await getOrCreateMembership({
        db,
        userId,
        organizationId,
    });
    await ensureBaselineCapabilities({
        db,
        organizationMembershipId: membershipId,
    });
}

export async function getOrCreatePersonalOrganization({
    db,
    userId,
}: {
    db: PostgresDatabase;
    userId: string;
}): Promise<{ organizationId: number }> {
    const existingRows = await db
        .select({ organizationId: organizationTable.id })
        .from(organizationTable)
        .where(eq(organizationTable.autoProvisionedForUserId, userId))
        .limit(1);
    const existing = existingRows.at(0);
    if (existing !== undefined) {
        const membershipId = await getOrCreateMembership({
            db,
            userId,
            organizationId: existing.organizationId,
        });
        await ensureBaselineCapabilities({
            db,
            organizationMembershipId: membershipId,
        });
        return existing;
    }

    const userRows = await db
        .select({ username: userTable.username })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);
    const user = userRows.at(0);
    if (user === undefined) {
        throw httpErrors.notFound("User not found");
    }

    const insertedRows = await db
        .insert(organizationTable)
        .values({
            slug: personalOrganizationSlug(userId),
            displayName: user.username,
            directoryVisibility: "unlisted",
            autoProvisionedForUserId: userId,
            imagePath: null,
            isFullImagePath: false,
        })
        .returning({ organizationId: organizationTable.id });
    const inserted = insertedRows.at(0);
    if (inserted === undefined) {
        throw httpErrors.internalServerError(
            "Failed to create personal organization",
        );
    }

    const membershipId = await getOrCreateMembership({
        db,
        userId,
        organizationId: inserted.organizationId,
    });
    await ensureBaselineCapabilities({
        db,
        organizationMembershipId: membershipId,
    });
    return inserted;
}

export async function getOrCreateDefaultProjectForOrganization({
    db,
    organizationId,
}: {
    db: PostgresDatabase;
    organizationId: number;
}): Promise<{ projectId: number }> {
    const existingRows = await db
        .select({ projectId: projectTable.id })
        .from(projectTable)
        .where(eq(projectTable.autoProvisionedForOrganizationId, organizationId))
        .limit(1);
    const existing = existingRows.at(0);
    if (existing !== undefined) {
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId: existing.projectId, organizationId })
            .onConflictDoNothing();

        return existing;
    }

    const organizationRows = await db
        .select({ displayName: organizationTable.displayName })
        .from(organizationTable)
        .where(eq(organizationTable.id, organizationId))
        .limit(1);
    const organization = organizationRows.at(0);
    if (organization === undefined) {
        throw httpErrors.notFound("Organization not found");
    }

    const insertedRows = await db
        .insert(projectTable)
        .values({
            slug: defaultProjectSlug(organizationId),
            title: organization.displayName,
            directoryVisibility: "unlisted",
            autoProvisionedForOrganizationId: organizationId,
        })
        .returning({ projectId: projectTable.id });
    const inserted = insertedRows.at(0);
    if (inserted === undefined) {
        throw httpErrors.internalServerError("Failed to create default project");
    }

    await db
        .insert(projectOrganizationOwnershipTable)
        .values({ projectId: inserted.projectId, organizationId })
        .onConflictDoNothing();

    return inserted;
}

export async function resolveConversationCreateTarget({
    db,
    userId,
    postAsOrganizationSlug,
}: {
    db: PostgresDatabase;
    userId: string;
    postAsOrganizationSlug: string | undefined;
}): Promise<{ projectId: number; organizationId: number }> {
    if (postAsOrganizationSlug === undefined || postAsOrganizationSlug === "") {
        const organization = await getOrCreatePersonalOrganization({ db, userId });
        const project = await getOrCreateDefaultProjectForOrganization({
            db,
            organizationId: organization.organizationId,
        });
        const canCreate = await hasProjectCapability({
            db,
            userId,
            projectId: project.projectId,
            capability: "conversation_create",
        });
        if (!canCreate) {
            throw httpErrors.forbidden("Missing conversation_create capability");
        }
        return { ...organization, ...project };
    }

    const organizationRows = await db
        .select({ organizationId: organizationTable.id })
        .from(organizationTable)
        .innerJoin(
            organizationMembershipTable,
            eq(organizationMembershipTable.organizationId, organizationTable.id),
        )
        .where(
            and(
                eq(organizationTable.slug, postAsOrganizationSlug),
                eq(organizationMembershipTable.userId, userId),
            ),
        )
        .limit(1);
    const organization = organizationRows.at(0);
    if (organization === undefined) {
        throw httpErrors.forbidden(
            `User '${userId}' is not part of the organization: '${postAsOrganizationSlug}'`,
        );
    }

    const project = await getOrCreateDefaultProjectForOrganization({
        db,
        organizationId: organization.organizationId,
    });

    const canCreate = await hasProjectCapability({
        db,
        userId,
        projectId: project.projectId,
        capability: "conversation_create",
    });
    if (!canCreate) {
        throw httpErrors.forbidden("Missing conversation_create capability");
    }

    return { ...organization, ...project };
}

export async function hasProjectCapability({
    db,
    userId,
    projectId,
    capability,
}: {
    db: PostgresDatabase;
    userId: string;
    projectId: number;
    capability: AllProjectCapability;
}): Promise<boolean> {
    const rows = await db
        .select({
            projectId: projectOrganizationOwnershipTable.projectId,
            organizationId: organizationMembershipTable.organizationId,
            capability: organizationMembershipAllProjectCapabilityTable.capability,
        })
        .from(organizationMembershipTable)
        .innerJoin(
            organizationMembershipAllProjectCapabilityTable,
            eq(
                organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                organizationMembershipTable.id,
            ),
        )
        .innerJoin(
            projectOrganizationOwnershipTable,
            eq(
                projectOrganizationOwnershipTable.organizationId,
                organizationMembershipTable.organizationId,
            ),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                eq(projectOrganizationOwnershipTable.projectId, projectId),
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    capability,
                ),
            ),
        )
        .limit(1);

    return hasCapabilityForProject({
        capabilityGrants: rows,
        projectOwnerships: rows,
        projectId,
        capability,
    });
}

export async function requireProjectCapability({
    db,
    userId,
    projectId,
    capability,
    message = "Missing project capability",
}: {
    db: PostgresDatabase;
    userId: string;
    projectId: number;
    capability: AllProjectCapability;
    message?: string;
}): Promise<void> {
    const hasCapability = await hasProjectCapability({
        db,
        userId,
        projectId,
        capability,
    });

    if (!hasCapability) {
        throw httpErrors.forbidden(message);
    }
}

export async function getProjectIdsWithCapability({
    db,
    userId,
    capability,
}: {
    db: PostgresDatabase;
    userId: string;
    capability: AllProjectCapability;
}): Promise<number[]> {
    const rows = await db
        .select({
            projectId: projectOrganizationOwnershipTable.projectId,
            organizationId: organizationMembershipTable.organizationId,
            capability: organizationMembershipAllProjectCapabilityTable.capability,
        })
        .from(organizationMembershipTable)
        .innerJoin(
            organizationMembershipAllProjectCapabilityTable,
            eq(
                organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                organizationMembershipTable.id,
            ),
        )
        .innerJoin(
            projectOrganizationOwnershipTable,
            eq(
                projectOrganizationOwnershipTable.organizationId,
                organizationMembershipTable.organizationId,
            ),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    capability,
                ),
            ),
        );

    return getProjectIdsWithCapabilityFromGrants({
        capabilityGrants: rows,
        projectOwnerships: rows,
        capability,
    });
}

export async function hasConversationCapability({
    db,
    userId,
    conversationId,
    capability,
}: {
    db: PostgresDatabase;
    userId: string;
    conversationId: number;
    capability: AllProjectCapability;
}): Promise<boolean> {
    const rows = await db
        .select({ projectId: conversationTable.projectId })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId))
        .limit(1);
    const conversation = rows.at(0);
    if (conversation === undefined) {
        throw httpErrors.notFound("Conversation not found");
    }

    return await hasProjectCapability({
        db,
        userId,
        projectId: conversation.projectId,
        capability,
    });
}

export async function isPremiumFeatureEnabledForProject({
    db,
    projectId,
    feature,
    now,
}: {
    db: PostgresDatabase;
    projectId: number;
    feature: PremiumFeature;
    now: Date;
}): Promise<boolean> {
    const rows = await db
        .select({
            organizationId: premiumFeatureEntitlementTable.organizationId,
            feature: premiumFeatureEntitlementTable.feature,
            expiresAt: premiumFeatureEntitlementTable.expiresAt,
        })
        .from(projectOrganizationOwnershipTable)
        .innerJoin(
            premiumFeatureEntitlementTable,
            eq(
                premiumFeatureEntitlementTable.organizationId,
                projectOrganizationOwnershipTable.organizationId,
            ),
        )
        .where(
            and(
                eq(projectOrganizationOwnershipTable.projectId, projectId),
                eq(premiumFeatureEntitlementTable.feature, feature),
                lte(premiumFeatureEntitlementTable.startsAt, now),
                isNull(premiumFeatureEntitlementTable.revokedAt),
                or(
                    isNull(premiumFeatureEntitlementTable.expiresAt),
                    gt(premiumFeatureEntitlementTable.expiresAt, now),
                ),
            ),
        )
        .limit(1);

    return hasActivePremiumFeatureEntitlement({ grants: rows, feature, now });
}
