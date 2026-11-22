import { httpErrors } from "@fastify/sensible";
import { and, eq, gt, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import {
    conversationTable,
    organizationLocalizationTable,
    organizationMembershipTable,
    organizationTable,
    premiumFeatureEntitlementTable,
    projectContactTable,
    projectContentTable,
    projectOrganizationOwnershipTable,
    projectTable,
    projectTranslationTargetLanguageTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type { GetConversationCreateProjectOptionsResponse } from "@/shared/types/dto.js";
import type { PremiumFeature } from "@/shared/types/zod.js";
import {
    organizationRoleHasCapability,
    organizationRolesWithCapability,
    type OrganizationRole,
} from "@/shared/organizationAccess.js";
import type { InheritableProjectLanguageSettingsInput } from "@/service/translationLanguageSetting.js";
import {
    type AllProjectCapability,
    getConversationCreateEmailUpdateConfiguration,
    hasActivePremiumFeatureEntitlement,
} from "@/service/projectAccessLogic.js";
import { getImplicitDefaultDisplayLanguage } from "./projectLanguage.js";
import { sourceLanguageToDisplayLanguage } from "./translationLanguageSetting.js";

type ConversationCreateProjectTargetFailureReason = Extract<
    GetConversationCreateProjectOptionsResponse,
    { success: false }
>["reason"];

interface ConversationCreateTarget {
    projectId: number;
    organizationId: number;
}

type ResolveConversationCreateTargetResult =
    | { success: true; target: ConversationCreateTarget }
    | { success: false; reason: ConversationCreateProjectTargetFailureReason };

function personalOrganizationSlug(userId: string): string {
    return `user-${userId.replaceAll("-", "")}`;
}

function defaultProjectSlug(organizationId: number): string {
    return `org-${String(organizationId)}-default`;
}

async function getOrCreateMembership({
    db,
    userId,
    organizationId,
    role,
}: {
    db: PostgresDatabase;
    userId: string;
    organizationId: number;
    role: OrganizationRole;
}): Promise<number> {
    const insertedRows = await db
        .insert(organizationMembershipTable)
        .values({ userId, organizationId, role })
        .onConflictDoNothing()
        .returning({ id: organizationMembershipTable.id });
    const inserted = insertedRows.at(0);
    if (inserted !== undefined) {
        return inserted.id;
    }

    const existingRows = await db
        .select({ id: organizationMembershipTable.id })
        .from(organizationMembershipTable)
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                eq(organizationMembershipTable.organizationId, organizationId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .limit(1);
    const existing = existingRows.at(0);
    if (existing !== undefined) {
        return existing.id;
    }

    throw httpErrors.internalServerError(
        "Failed to create organization membership",
    );
}

export async function setOrganizationMembershipRole({
    db,
    userId,
    organizationId,
    role,
}: {
    db: PostgresDatabase;
    userId: string;
    organizationId: number;
    role: OrganizationRole;
}): Promise<void> {
    const membershipId = await getOrCreateMembership({
        db,
        userId,
        organizationId,
        role,
    });
    await db
        .update(organizationMembershipTable)
        .set({ role, updatedAt: new Date() })
        .where(eq(organizationMembershipTable.id, membershipId));
}

export async function getOrCreatePersonalOrganization({
    db,
    userId,
    autoProvisionedDefaultLanguage,
}: {
    db: PostgresDatabase;
    userId: string;
    autoProvisionedDefaultLanguage: SupportedDisplayLanguageCodes;
}): Promise<{ organizationId: number }> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        // All personal-scope creation paths share this lock, including edits.
        const user = (
            await tx
                .select({ id: userTable.id, username: userTable.username })
                .from(userTable)
                .where(
                    and(
                        eq(userTable.id, userId),
                        eq(userTable.isDeleted, false),
                    ),
                )
                .for("no key update")
        ).at(0);
        if (user === undefined) throw httpErrors.notFound("User not found");

        const existingRows = await tx
            .select({
                organizationId: organizationTable.id,
                deletedAt: organizationTable.deletedAt,
            })
            .from(organizationTable)
            .where(eq(organizationTable.autoProvisionedForUserId, userId))
            .limit(1)
            .for("share");
        const existing = existingRows.at(0);
        if (existing !== undefined) {
            if (existing.deletedAt !== null)
                throw httpErrors.notFound("Organization not found");
            return { organizationId: existing.organizationId };
        }

        const insertedRows = await tx
            .insert(organizationTable)
            .values({
                slug: personalOrganizationSlug(userId),
                displayName: user.username,
                defaultLanguageCode: autoProvisionedDefaultLanguage,
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

        await tx.insert(organizationLocalizationTable).values({
            organizationId: inserted.organizationId,
            languageCode: autoProvisionedDefaultLanguage,
            displayName: user.username,
            description: "",
            websiteUrl: null,
            imagePath: null,
            isFullImagePath: false,
        });

        await getOrCreateMembership({
            db: tx,
            userId,
            organizationId: inserted.organizationId,
            role: "admin",
        });
        return inserted;
    });
}

export async function getOrCreateDefaultProjectForOrganization({
    db,
    organizationId,
}: {
    db: PostgresDatabase;
    organizationId: number;
}): Promise<{ projectId: number; projectSlug: string; projectTitle: string }> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const organizationRows = await tx
            .select({ displayName: organizationTable.displayName })
            .from(organizationTable)
            .where(
                and(
                    eq(organizationTable.id, organizationId),
                    isNull(organizationTable.deletedAt),
                ),
            )
            .limit(1)
            .for("update");
        const organization = organizationRows.at(0);
        if (organization === undefined) {
            throw httpErrors.notFound("Organization not found");
        }

        const existingRows = await tx
            .select({
                projectId: projectTable.id,
                currentContentId: projectTable.currentContentId,
                projectSlug: projectTable.slug,
                projectTitle: projectTable.title,
            })
            .from(projectTable)
            .where(
                and(
                    eq(
                        projectTable.autoProvisionedForOrganizationId,
                        organizationId,
                    ),
                    isNull(projectTable.deletedAt),
                ),
            )
            .limit(1)
            .for("update");
        const existing = existingRows.at(0);
        if (existing !== undefined) {
            // A separate statement gets a fresh READ COMMITTED snapshot after
            // any project-lock wait; a subquery in the locking read can be stale.
            const ownership = await tx
                .select({ id: projectOrganizationOwnershipTable.id })
                .from(projectOrganizationOwnershipTable)
                .where(
                    and(
                        eq(
                            projectOrganizationOwnershipTable.projectId,
                            existing.projectId,
                        ),
                        eq(
                            projectOrganizationOwnershipTable.organizationId,
                            organizationId,
                        ),
                        isNull(projectOrganizationOwnershipTable.deletedAt),
                    ),
                )
                .limit(1);
            if (ownership.length === 0)
                throw httpErrors.conflict(
                    "Default project ownership is unavailable",
                );
        }
        if (existing === undefined) {
            // Provisioning can run inside a READ COMMITTED caller. Change the
            // parent row so a concurrent serializable deletion cannot use a
            // snapshot from before this new ownership relationship existed.
            await tx
                .update(organizationTable)
                .set({ updatedAt: new Date() })
                .where(eq(organizationTable.id, organizationId));
        }
        const project =
            existing ??
            (
                await tx
                    .insert(projectTable)
                    .values({
                        slug: defaultProjectSlug(organizationId),
                        title: organization.displayName,
                        directoryVisibility: "unlisted",
                        autoProvisionedForOrganizationId: organizationId,
                    })
                    .returning({
                        projectId: projectTable.id,
                        currentContentId: projectTable.currentContentId,
                        projectSlug: projectTable.slug,
                        projectTitle: projectTable.title,
                    })
            ).at(0);
        if (project === undefined) {
            throw httpErrors.internalServerError(
                "Failed to create default project",
            );
        }

        if (project.currentContentId === null) {
            const insertedContentRows = await tx
                .insert(projectContentTable)
                .values({
                    projectId: project.projectId,
                    title: organization.displayName,
                    subtitle: null,
                    body: null,
                    bodyPlainText: "",
                    bannerPath: null,
                    bannerIsFullPath: false,
                })
                .returning({ contentId: projectContentTable.id });
            const insertedContent = insertedContentRows.at(0);
            if (insertedContent === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to create default project content",
                );
            }
            await tx
                .update(projectTable)
                .set({ currentContentId: insertedContent.contentId })
                .where(eq(projectTable.id, project.projectId));
        }

        if (existing === undefined) {
            await tx
                .insert(projectOrganizationOwnershipTable)
                .values({ projectId: project.projectId, organizationId });
        }

        return {
            projectId: project.projectId,
            projectSlug: project.projectSlug,
            projectTitle: project.projectTitle,
        };
    });
}

export async function lockConversationCreateTarget({
    db,
    userId,
    target,
}: {
    db: PostgresTransaction;
    userId: string;
    target: Readonly<ConversationCreateTarget>;
}): Promise<boolean> {
    // Seed statements update the author's profile counters. Take their eventual
    // write lock up front, before organization/project locks, to avoid upgrades
    // and match personal-scope provisioning's lifecycle order.
    const users = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.id, userId), eq(userTable.isDeleted, false)))
        .for("no key update");
    if (users.length === 0) return false;
    const organizations = await db
        .select({ id: organizationTable.id })
        .from(organizationTable)
        .where(
            and(
                eq(organizationTable.id, target.organizationId),
                isNull(organizationTable.deletedAt),
            ),
        )
        .for("share");
    if (organizations.length === 0) return false;
    const projects = await db
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.id, target.projectId),
                isNull(projectTable.deletedAt),
            ),
        )
        .for("no key update");
    if (projects.length === 0) return false;
    return true;
}

export async function resolveConversationCreateTarget({
    db,
    userId,
    postAsOrganizationSlug,
    projectSlug,
    autoProvisionedDefaultLanguage,
}: {
    db: PostgresDatabase;
    userId: string;
    postAsOrganizationSlug: string | undefined;
    projectSlug?: string;
    autoProvisionedDefaultLanguage: SupportedDisplayLanguageCodes;
}): Promise<ConversationCreateTarget> {
    if (projectSlug !== undefined) {
        const result = await resolveExplicitConversationCreateTarget({
            db,
            userId,
            postAsOrganizationSlug,
            projectSlug,
        });
        if (!result.success) {
            throw httpErrors.forbidden(result.reason);
        }

        return result.target;
    }

    // Provisioning and the necessary capability read share the write boundary.
    // A newly inserted membership/ownership must never be reread via a replica.
    return await db.transaction(async (tx) => {
        if (
            postAsOrganizationSlug === undefined ||
            postAsOrganizationSlug === ""
        ) {
            const organization = await getOrCreatePersonalOrganization({
                db: tx,
                userId,
                autoProvisionedDefaultLanguage,
            });
            const project = await getOrCreateDefaultProjectForOrganization({
                db: tx,
                organizationId: organization.organizationId,
            });
            const canCreate = await hasProjectCapability({
                db: tx,
                userId,
                projectId: project.projectId,
                capability: "conversation_create",
            });
            if (!canCreate) {
                throw httpErrors.forbidden(
                    "Missing conversation_create capability",
                );
            }
            return {
                organizationId: organization.organizationId,
                projectId: project.projectId,
            };
        }

        const organizationRows = await tx
            .select({ organizationId: organizationTable.id })
            .from(organizationTable)
            .innerJoin(
                organizationMembershipTable,
                eq(
                    organizationMembershipTable.organizationId,
                    organizationTable.id,
                ),
            )
            .where(
                and(
                    eq(organizationTable.slug, postAsOrganizationSlug),
                    isNull(organizationTable.deletedAt),
                    eq(organizationMembershipTable.userId, userId),
                    isNull(organizationMembershipTable.deletedAt),
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
            db: tx,
            organizationId: organization.organizationId,
        });

        const canCreate = await hasProjectCapability({
            db: tx,
            userId,
            projectId: project.projectId,
            capability: "conversation_create",
        });
        if (!canCreate) {
            throw httpErrors.forbidden(
                "Missing conversation_create capability",
            );
        }

        return {
            organizationId: organization.organizationId,
            projectId: project.projectId,
        };
    });
}

export async function resolveConversationCreateTargetResult({
    db,
    userId,
    postAsOrganizationSlug,
    projectSlug,
    autoProvisionedDefaultLanguage,
}: {
    db: PostgresDatabase;
    userId: string;
    postAsOrganizationSlug: string | undefined;
    projectSlug?: string;
    autoProvisionedDefaultLanguage: SupportedDisplayLanguageCodes;
}): Promise<ResolveConversationCreateTargetResult> {
    if (projectSlug !== undefined) {
        return await resolveExplicitConversationCreateTarget({
            db,
            userId,
            postAsOrganizationSlug,
            projectSlug,
        });
    }

    return {
        success: true,
        target: await resolveConversationCreateTarget({
            db,
            userId,
            postAsOrganizationSlug,
            autoProvisionedDefaultLanguage,
        }),
    };
}

async function resolveExplicitConversationCreateTarget({
    db,
    userId,
    postAsOrganizationSlug,
    projectSlug,
}: {
    db: PostgresDatabase;
    userId: string;
    postAsOrganizationSlug: string | undefined;
    projectSlug: string;
}): Promise<ResolveConversationCreateTargetResult> {
    if (postAsOrganizationSlug === undefined || postAsOrganizationSlug === "") {
        return { success: false, reason: "organization_not_available" };
    }

    const targetRows = await db
        .select({
            projectId: projectTable.id,
            organizationId: organizationTable.id,
        })
        .from(projectTable)
        .innerJoin(
            projectOrganizationOwnershipTable,
            and(
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    projectTable.id,
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
        .innerJoin(
            organizationMembershipTable,
            eq(
                organizationMembershipTable.organizationId,
                organizationTable.id,
            ),
        )
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                isNull(projectTable.autoProvisionedForOrganizationId),
                isNull(projectTable.deletedAt),
                eq(organizationTable.slug, postAsOrganizationSlug),
                isNull(organizationTable.deletedAt),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .limit(1);
    const target = targetRows.at(0);
    if (target === undefined) {
        return { success: false, reason: "organization_not_available" };
    }

    const canCreate = await hasProjectCapability({
        db,
        userId,
        projectId: target.projectId,
        capability: "conversation_create",
    });
    if (!canCreate) {
        return {
            success: false,
            reason: "missing_conversation_create_capability",
        };
    }

    return { success: true, target };
}

export async function getConversationCreateProjectOptions({
    db,
    userId,
    postAsOrganizationSlug,
}: {
    db: PostgresDatabase;
    userId: string;
    postAsOrganizationSlug: string | undefined;
}): Promise<GetConversationCreateProjectOptionsResponse> {
    if (postAsOrganizationSlug === undefined || postAsOrganizationSlug === "") {
        return {
            success: true,
            projectList: [],
            noProjectEmailUpdates:
                getConversationCreateEmailUpdateConfiguration({
                    canConfigure: false,
                    participantContactEmail: undefined,
                    scopeDefaultEnabled: false,
                }),
        };
    }

    const organizationRows = await db
        .select({ organizationId: organizationTable.id })
        .from(organizationTable)
        .innerJoin(
            organizationMembershipTable,
            eq(
                organizationMembershipTable.organizationId,
                organizationTable.id,
            ),
        )
        .where(
            and(
                eq(organizationTable.slug, postAsOrganizationSlug),
                isNull(organizationTable.deletedAt),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .limit(1);
    const organization = organizationRows.at(0);
    if (organization === undefined) {
        return { success: false, reason: "organization_not_available" };
    }

    const [
        projectIdsWithCreateRows,
        canConfigureEmailUpdates,
        projectRows,
        noProjectRows,
    ] = await Promise.all([
        getProjectIdsWithCapability({
            db,
            userId,
            capability: "conversation_create",
        }),
        canConfigureConversationEmailUpdatesForOrganization({
            db,
            userId,
            organizationId: organization.organizationId,
            now: new Date(),
        }),
        db
            .select({
                projectId: projectTable.id,
                projectSlug: projectTable.slug,
                projectTitle: projectTable.title,
                sourceLanguageCode: projectContentTable.sourceLanguageCode,
                participationMode: projectTable.participationMode,
                dynamicTranslationEnabled:
                    projectTable.dynamicTranslationEnabled,
                conversationEmailUpdateDefaultEnabled:
                    projectTable.conversationEmailUpdateDefaultEnabled,
                participantContactEmail: projectContactTable.email,
            })
            .from(projectTable)
            .innerJoin(
                projectOrganizationOwnershipTable,
                and(
                    eq(
                        projectOrganizationOwnershipTable.projectId,
                        projectTable.id,
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
            .leftJoin(
                projectContentTable,
                eq(projectContentTable.id, projectTable.currentContentId),
            )
            .leftJoin(
                projectContactTable,
                and(
                    eq(projectContactTable.projectId, projectTable.id),
                    isNull(projectContactTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(organizationTable.id, organization.organizationId),
                    isNull(organizationTable.deletedAt),
                    isNull(projectTable.autoProvisionedForOrganizationId),
                    isNull(projectTable.deletedAt),
                ),
            ),
        db
            .select({
                conversationEmailUpdateDefaultEnabled:
                    projectTable.conversationEmailUpdateDefaultEnabled,
                participantContactEmail: projectContactTable.email,
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
                        organization.organizationId,
                    ),
                    isNull(projectOrganizationOwnershipTable.deletedAt),
                ),
            )
            .leftJoin(
                projectContactTable,
                and(
                    eq(projectContactTable.projectId, projectTable.id),
                    isNull(projectContactTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(
                        projectTable.autoProvisionedForOrganizationId,
                        organization.organizationId,
                    ),
                    isNull(projectTable.deletedAt),
                ),
            )
            .limit(1),
    ]);
    const projectIdsWithCreate = new Set(projectIdsWithCreateRows);

    const availableProjectRows = projectRows.filter((project) =>
        projectIdsWithCreate.has(project.projectId),
    );
    if (projectRows.length > 0 && availableProjectRows.length === 0) {
        return {
            success: false,
            reason: "missing_conversation_create_capability",
        };
    }
    const projectIds = availableProjectRows.map((project) => project.projectId);
    const dynamicTranslationProjectIds =
        projectIds.length === 0
            ? []
            : await db
                  .selectDistinct({
                      projectId: projectOrganizationOwnershipTable.projectId,
                  })
                  .from(projectOrganizationOwnershipTable)
                  .innerJoin(
                      organizationTable,
                      and(
                          eq(
                              organizationTable.id,
                              projectOrganizationOwnershipTable.organizationId,
                          ),
                          isNull(organizationTable.deletedAt),
                      ),
                  )
                  .innerJoin(
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
                  .innerJoin(
                      premiumFeatureEntitlementTable,
                      and(
                          eq(
                              premiumFeatureEntitlementTable.organizationId,
                              organizationTable.id,
                          ),
                          eq(
                              premiumFeatureEntitlementTable.feature,
                              "dynamic_translation",
                          ),
                          lte(
                              premiumFeatureEntitlementTable.startsAt,
                              new Date(),
                          ),
                          isNull(premiumFeatureEntitlementTable.revokedAt),
                          or(
                              isNull(premiumFeatureEntitlementTable.expiresAt),
                              gt(
                                  premiumFeatureEntitlementTable.expiresAt,
                                  new Date(),
                              ),
                          ),
                      ),
                  )
                  .where(
                      and(
                          inArray(
                              projectOrganizationOwnershipTable.projectId,
                              projectIds,
                          ),
                          isNull(projectOrganizationOwnershipTable.deletedAt),
                      ),
                  );
    const canUseDynamicTranslation = new Set(
        dynamicTranslationProjectIds.map((row) => row.projectId),
    );
    const targetLanguageRows =
        projectIds.length === 0
            ? []
            : await db
                  .select({
                      projectId:
                          projectTranslationTargetLanguageTable.projectId,
                      languageCode:
                          projectTranslationTargetLanguageTable.languageCode,
                  })
                  .from(projectTranslationTargetLanguageTable)
                  .where(
                      and(
                          inArray(
                              projectTranslationTargetLanguageTable.projectId,
                              projectIds,
                          ),
                          isNull(
                              projectTranslationTargetLanguageTable.deletedAt,
                          ),
                      ),
                  );
    const targetLanguageCodesByProjectId = new Map<
        number,
        SupportedDisplayLanguageCodes[]
    >();
    for (const targetLanguage of targetLanguageRows) {
        const languageCodes =
            targetLanguageCodesByProjectId.get(targetLanguage.projectId) ?? [];
        languageCodes.push(targetLanguage.languageCode);
        targetLanguageCodesByProjectId.set(
            targetLanguage.projectId,
            languageCodes,
        );
    }

    const noProject = noProjectRows.at(0);
    return {
        success: true,
        noProjectEmailUpdates: getConversationCreateEmailUpdateConfiguration({
            canConfigure: canConfigureEmailUpdates,
            participantContactEmail: noProject?.participantContactEmail,
            scopeDefaultEnabled:
                noProject?.conversationEmailUpdateDefaultEnabled,
        }),
        projectList: availableProjectRows.map((project) => ({
            canUseDynamicTranslation: canUseDynamicTranslation.has(
                project.projectId,
            ),
            projectSlug: project.projectSlug,
            projectTitle: project.projectTitle,
            defaultLanguageCode:
                sourceLanguageToDisplayLanguage({
                    sourceLanguageCode: project.sourceLanguageCode,
                }) ?? getImplicitDefaultDisplayLanguage(),
            participationMode: project.participationMode,
            languageSettings: {
                dynamicTranslationEnabled: project.dynamicTranslationEnabled,
                targetLanguageCodes:
                    targetLanguageCodesByProjectId.get(project.projectId) ?? [],
            },
            emailUpdates: getConversationCreateEmailUpdateConfiguration({
                canConfigure: canConfigureEmailUpdates,
                participantContactEmail: project.participantContactEmail,
                scopeDefaultEnabled:
                    project.conversationEmailUpdateDefaultEnabled,
            }),
        })),
    };
}

export async function canConfigureConversationEmailUpdatesForOrganization({
    db,
    userId,
    organizationId,
    now,
}: {
    db: PostgresDatabase;
    userId: string;
    organizationId: number;
    now: Date;
}): Promise<boolean> {
    const rows = await db
        .select({ entitlementId: premiumFeatureEntitlementTable.id })
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
            ),
        )
        .innerJoin(
            premiumFeatureEntitlementTable,
            and(
                eq(
                    premiumFeatureEntitlementTable.organizationId,
                    organizationMembershipTable.organizationId,
                ),
                eq(
                    premiumFeatureEntitlementTable.feature,
                    "conversation_email_update",
                ),
                lte(premiumFeatureEntitlementTable.startsAt, now),
                isNull(premiumFeatureEntitlementTable.revokedAt),
                or(
                    isNull(premiumFeatureEntitlementTable.expiresAt),
                    gt(premiumFeatureEntitlementTable.expiresAt, now),
                ),
            ),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                eq(organizationMembershipTable.organizationId, organizationId),
                isNull(organizationMembershipTable.deletedAt),
                inArray(
                    organizationMembershipTable.role,
                    organizationRolesWithCapability(
                        "conversation_email_update",
                    ),
                ),
            ),
        )
        .limit(1);

    return rows.length === 1;
}

export async function hasProjectParticipantContactEmail({
    db,
    projectId,
}: {
    db: PostgresDatabase;
    projectId: number;
}): Promise<boolean> {
    const rows = await db
        .select({ id: projectContactTable.id })
        .from(projectContactTable)
        .where(
            and(
                eq(projectContactTable.projectId, projectId),
                isNotNull(projectContactTable.email),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .limit(1);
    return rows.length === 1;
}

export async function lockProjectParticipantContactEmail({
    db,
    projectId,
}: {
    db: PostgresTransaction;
    projectId: number;
}): Promise<boolean> {
    const rows = await db
        .select({ id: projectContactTable.id })
        .from(projectContactTable)
        .where(
            and(
                eq(projectContactTable.projectId, projectId),
                isNotNull(projectContactTable.email),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .limit(1)
        .for("share");
    return rows.length === 1;
}

export async function getProjectLanguageSettings({
    db,
    projectId,
}: {
    db: PostgresDatabase;
    projectId: number;
}): Promise<InheritableProjectLanguageSettingsInput> {
    const projectRows = await db
        .select({
            dynamicTranslationEnabled: projectTable.dynamicTranslationEnabled,
            sourceLanguageCode: projectContentTable.sourceLanguageCode,
        })
        .from(projectTable)
        .leftJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .where(
            and(eq(projectTable.id, projectId), isNull(projectTable.deletedAt)),
        )
        .limit(1);
    const project = projectRows.at(0);
    if (project === undefined) {
        throw httpErrors.notFound("Project not found");
    }

    const targetLanguageRows = await db
        .select({
            languageCode: projectTranslationTargetLanguageTable.languageCode,
        })
        .from(projectTranslationTargetLanguageTable)
        .where(
            and(
                eq(projectTranslationTargetLanguageTable.projectId, projectId),
                isNull(projectTranslationTargetLanguageTable.deletedAt),
            ),
        );

    return {
        dynamicTranslationEnabled: project.dynamicTranslationEnabled,
        defaultLanguageCode:
            sourceLanguageToDisplayLanguage({
                sourceLanguageCode: project.sourceLanguageCode,
            }) ?? getImplicitDefaultDisplayLanguage(),
        targetLanguageCodes: targetLanguageRows.map((row) => row.languageCode),
    };
}

export async function getProjectCapabilitiesById({
    db,
    userId,
    projectIds,
    requestedCapabilities,
}: {
    db: PostgresDatabase;
    userId: string | undefined;
    projectIds: readonly number[];
    requestedCapabilities: readonly [
        AllProjectCapability,
        ...AllProjectCapability[],
    ];
}): Promise<ReadonlyMap<number, ReadonlySet<AllProjectCapability>>> {
    const capabilitiesByProjectId = new Map<
        number,
        Set<AllProjectCapability>
    >();
    if (userId === undefined || projectIds.length === 0) {
        return capabilitiesByProjectId;
    }

    const query = db
        .select({
            projectId: projectOrganizationOwnershipTable.projectId,
            role: organizationMembershipTable.role,
        })
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
            and(
                eq(userTable.id, organizationMembershipTable.userId),
                eq(userTable.isDeleted, false),
            ),
        )
        .innerJoin(
            projectOrganizationOwnershipTable,
            and(
                eq(
                    projectOrganizationOwnershipTable.organizationId,
                    organizationMembershipTable.organizationId,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .innerJoin(
            projectTable,
            and(
                eq(
                    projectTable.id,
                    projectOrganizationOwnershipTable.projectId,
                ),
                isNull(projectTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
                isNull(organizationTable.deletedAt),
                inArray(
                    projectOrganizationOwnershipTable.projectId,
                    projectIds,
                ),
                inArray(organizationMembershipTable.role, [
                    ...new Set(
                        requestedCapabilities.flatMap(
                            organizationRolesWithCapability,
                        ),
                    ),
                ]),
            ),
        )
        .$dynamic();

    const rows =
        projectIds.length === 1 && requestedCapabilities.length === 1
            ? await query.limit(1)
            : await query;

    for (const row of rows) {
        let capabilities = capabilitiesByProjectId.get(row.projectId);
        if (capabilities === undefined) {
            capabilities = new Set<AllProjectCapability>();
            capabilitiesByProjectId.set(row.projectId, capabilities);
        }
        for (const capability of requestedCapabilities) {
            if (organizationRoleHasCapability({ role: row.role, capability }))
                capabilities.add(capability);
        }
    }
    return capabilitiesByProjectId;
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
    const capabilitiesByProjectId = await getProjectCapabilitiesById({
        db,
        userId,
        projectIds: [projectId],
        requestedCapabilities: [capability],
    });
    return capabilitiesByProjectId.get(projectId)?.has(capability) ?? false;
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
        .selectDistinct({
            projectId: projectOrganizationOwnershipTable.projectId,
        })
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
            and(
                eq(userTable.id, organizationMembershipTable.userId),
                eq(userTable.isDeleted, false),
            ),
        )
        .innerJoin(
            projectOrganizationOwnershipTable,
            and(
                eq(
                    projectOrganizationOwnershipTable.organizationId,
                    organizationMembershipTable.organizationId,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .innerJoin(
            projectTable,
            and(
                eq(
                    projectTable.id,
                    projectOrganizationOwnershipTable.projectId,
                ),
                isNull(projectTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
                isNull(organizationTable.deletedAt),
                inArray(
                    organizationMembershipTable.role,
                    organizationRolesWithCapability(capability),
                ),
            ),
        );

    return rows.map((row) => row.projectId);
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
                isNull(projectOrganizationOwnershipTable.deletedAt),
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

    return hasActivePremiumFeatureEntitlement({
        grants: rows.map((row) => ({ ...row, feature })),
        feature,
        now,
    });
}
