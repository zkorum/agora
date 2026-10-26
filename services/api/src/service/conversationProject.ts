import { and, eq, gt, inArray, isNull, isNotNull, lte, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    organizationMembershipAllProjectCapabilityTable,
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
import type { GetConversationForEditResponse } from "@/shared/types/dto.js";
import type {
    ConversationProjectTarget,
    PremiumFeature,
} from "@/shared/types/zod.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import {
    getOrCreateDefaultProjectForOrganization,
    getOrCreatePersonalOrganization,
} from "./projectAccess.js";
import {
    type AllProjectCapability,
    isAllProjectCapability,
} from "./projectAccessLogic.js";
import { getImplicitDefaultDisplayLanguage } from "./projectLanguage.js";
import { sourceLanguageToDisplayLanguage } from "./translationLanguageSetting.js";

type ProjectOption = Extract<
    GetConversationForEditResponse,
    { success: true }
>["projectOptions"][number];

function createUnprovisionedPersonalOption(): ProjectOption {
    return {
        target: { kind: "no_project", organizationSlug: undefined },
        premiumFeatures: [],
        emailUpdates: {
            canConfigure: false,
            hasParticipantContactEmail: false,
            scopeDefaultEnabled: false,
        },
    };
}

async function getDestinationOrganizations({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}) {
    const rows = await db
        .select({
            id: organizationTable.id,
            slug: organizationTable.slug,
            autoProvisionedForUserId:
                organizationTable.autoProvisionedForUserId,
            capability:
                organizationMembershipAllProjectCapabilityTable.capability,
        })
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
            and(
                eq(userTable.id, organizationMembershipTable.userId),
                eq(userTable.isDeleted, false),
            ),
        )
        .leftJoin(
            organizationMembershipAllProjectCapabilityTable,
            and(
                eq(
                    organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                    organizationMembershipTable.id,
                ),
                isNull(
                    organizationMembershipAllProjectCapabilityTable.deletedAt,
                ),
                inArray(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    [
                        "conversation_create",
                        "conversation_edit",
                        "conversation_email_update",
                    ],
                ),
            ),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                or(
                    isNull(organizationTable.autoProvisionedForUserId),
                    eq(organizationTable.autoProvisionedForUserId, userId),
                ),
                isNull(organizationTable.deletedAt),
                isNull(organizationMembershipTable.deletedAt),
            ),
        );
    const organizations = new Map<
        number,
        Omit<(typeof rows)[number], "capability"> & {
            capabilities: Set<AllProjectCapability>;
        }
    >();
    for (const { capability, ...row } of rows) {
        const organization = organizations.get(row.id) ?? {
            ...row,
            capabilities: new Set<AllProjectCapability>(),
        };
        if (capability !== null && isAllProjectCapability(capability))
            organization.capabilities.add(capability);
        organizations.set(row.id, organization);
    }
    return organizations;
}

export async function getConversationProjectOptions({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}): Promise<ProjectOption[]> {
    const organizations = await getDestinationOrganizations({ db, userId });
    const organizationIds = [...organizations.keys()];
    if (organizationIds.length === 0)
        return [createUnprovisionedPersonalOption()];
    const now = new Date();
    const [entitlements, defaults, projects] = await Promise.all([
        db
            .select({
                organizationId: premiumFeatureEntitlementTable.organizationId,
                feature: premiumFeatureEntitlementTable.feature,
            })
            .from(premiumFeatureEntitlementTable)
            .where(
                and(
                    inArray(
                        premiumFeatureEntitlementTable.organizationId,
                        organizationIds,
                    ),
                    isNull(premiumFeatureEntitlementTable.revokedAt),
                    lte(premiumFeatureEntitlementTable.startsAt, now),
                    or(
                        isNull(premiumFeatureEntitlementTable.expiresAt),
                        gt(premiumFeatureEntitlementTable.expiresAt, now),
                    ),
                ),
            ),
        db
            .select({
                organizationId: projectTable.autoProvisionedForOrganizationId,
                projectId: projectTable.id,
                enabled: projectTable.conversationEmailUpdateDefaultEnabled,
                email: projectContactTable.email,
            })
            .from(projectTable)
            .leftJoin(
                projectContactTable,
                and(
                    eq(projectContactTable.projectId, projectTable.id),
                    isNull(projectContactTable.deletedAt),
                ),
            )
            .where(
                and(
                    inArray(
                        projectTable.autoProvisionedForOrganizationId,
                        organizationIds,
                    ),
                    isNull(projectTable.deletedAt),
                ),
            ),
        db
            .select({
                id: projectTable.id,
                slug: projectTable.slug,
                title: projectTable.title,
                defaultOrganizationId:
                    projectTable.autoProvisionedForOrganizationId,
                organizationId:
                    projectOrganizationOwnershipTable.organizationId,
                sourceLanguageCode: projectContentTable.sourceLanguageCode,
                dynamicTranslationEnabled:
                    projectTable.dynamicTranslationEnabled,
                enabled: projectTable.conversationEmailUpdateDefaultEnabled,
                email: projectContactTable.email,
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
                    inArray(
                        projectOrganizationOwnershipTable.organizationId,
                        organizationIds,
                    ),
                    or(
                        eq(projectTable.directoryVisibility, "listed"),
                        isNotNull(
                            projectTable.autoProvisionedForOrganizationId,
                        ),
                    ),
                    isNull(projectTable.deletedAt),
                ),
            ),
    ]);
    const featuresByOrganization = new Map<number, Set<PremiumFeature>>();
    for (const row of entitlements) {
        const features =
            featuresByOrganization.get(row.organizationId) ??
            new Set<PremiumFeature>();
        features.add(row.feature);
        featuresByOrganization.set(row.organizationId, features);
    }
    const defaultsByOrganization = new Map(
        defaults.map((row) => [row.organizationId, row]),
    );
    const projectsById = new Map<
        number,
        {
            project: (typeof projects)[number];
            capabilities: Set<AllProjectCapability>;
            premiumFeatures: Set<PremiumFeature>;
            canConfigureEmailUpdates: boolean;
            organizationSlugs: Set<string>;
        }
    >();
    for (const project of projects) {
        const owner = organizations.get(project.organizationId);
        if (owner === undefined) continue;
        const entry = projectsById.get(project.id) ?? {
            project,
            capabilities: new Set<AllProjectCapability>(),
            premiumFeatures: new Set<PremiumFeature>(),
            canConfigureEmailUpdates: false,
            organizationSlugs: new Set<string>(),
        };
        entry.organizationSlugs.add(owner.slug);
        for (const capability of owner.capabilities)
            entry.capabilities.add(capability);
        for (const feature of featuresByOrganization.get(owner.id) ?? [])
            entry.premiumFeatures.add(feature);
        entry.canConfigureEmailUpdates ||=
            owner.capabilities.has("conversation_email_update") &&
            featuresByOrganization
                .get(owner.id)
                ?.has("conversation_email_update") === true;
        projectsById.set(project.id, entry);
    }
    const destinations = [...projectsById.values()].filter(
        (entry) =>
            entry.project.defaultOrganizationId === null &&
            entry.capabilities.has("conversation_create") &&
            entry.capabilities.has("conversation_edit"),
    );
    const languageRows =
        destinations.length === 0
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
                              destinations.map((entry) => entry.project.id),
                          ),
                          isNull(
                              projectTranslationTargetLanguageTable.deletedAt,
                          ),
                      ),
                  );
    const languagesByProject = new Map<
        number,
        SupportedDisplayLanguageCodes[]
    >();
    for (const row of languageRows) {
        const languages = languagesByProject.get(row.projectId) ?? [];
        languages.push(row.languageCode);
        languagesByProject.set(row.projectId, languages);
    }
    const options: ProjectOption[] = [];
    for (const organization of organizations.values()) {
        if (
            !organization.capabilities.has("conversation_create") ||
            !organization.capabilities.has("conversation_edit")
        )
            continue;
        const scope = defaultsByOrganization.get(organization.id);
        const scopeProject =
            scope === undefined ? undefined : projectsById.get(scope.projectId);
        options.push({
            target: {
                kind: "no_project",
                organizationSlug:
                    organization.autoProvisionedForUserId === null
                        ? organization.slug
                        : undefined,
            },
            premiumFeatures: [
                ...(scopeProject?.premiumFeatures ??
                    featuresByOrganization.get(organization.id) ??
                    []),
            ],
            emailUpdates: {
                canConfigure:
                    scopeProject?.canConfigureEmailUpdates ??
                    (organization.capabilities.has(
                        "conversation_email_update",
                    ) &&
                        featuresByOrganization
                            .get(organization.id)
                            ?.has("conversation_email_update") === true),
                hasParticipantContactEmail: scope?.email != null,
                scopeDefaultEnabled: scope?.enabled ?? false,
            },
        });
    }
    if (
        ![...organizations.values()].some(
            (organization) => organization.autoProvisionedForUserId === userId,
        )
    ) {
        options.unshift(createUnprovisionedPersonalOption());
    }
    for (const {
        project,
        canConfigureEmailUpdates,
        premiumFeatures,
        organizationSlugs,
    } of destinations) {
        options.push({
            target: { kind: "project", projectSlug: project.slug },
            title: project.title,
            organizationSlugs: [...organizationSlugs],
            premiumFeatures: [...premiumFeatures],
            defaultLanguageCode:
                sourceLanguageToDisplayLanguage({
                    sourceLanguageCode: project.sourceLanguageCode,
                }) ?? getImplicitDefaultDisplayLanguage(),
            languageSettings: {
                dynamicTranslationEnabled: project.dynamicTranslationEnabled,
                targetLanguageCodes: languagesByProject.get(project.id) ?? [],
            },
            emailUpdates: {
                canConfigure: canConfigureEmailUpdates,
                hasParticipantContactEmail: project.email !== null,
                scopeDefaultEnabled: project.enabled,
            },
        });
    }
    return options;
}

export async function resolveConversationProjectTarget({
    db,
    userId,
    target,
}: {
    db: PostgresJsDatabase;
    userId: string;
    target: ConversationProjectTarget;
}): Promise<
    { projectId: number; projectSlug: string; projectTitle: string } | undefined
> {
    if (target.kind === "project") {
        return (
            await db
                .select({
                    projectId: projectTable.id,
                    projectSlug: projectTable.slug,
                    projectTitle: projectTable.title,
                })
                .from(projectTable)
                .where(
                    and(
                        eq(projectTable.slug, target.projectSlug),
                        eq(projectTable.directoryVisibility, "listed"),
                        isNull(projectTable.autoProvisionedForOrganizationId),
                        isNull(projectTable.deletedAt),
                    ),
                )
        ).at(0);
    }
    if (target.organizationSlug === undefined) {
        return await db.transaction(async (tx) => {
            // Serialize first-time personal-scope provisioning by concurrent edits.
            const user = (
                await tx
                    .select({ id: userTable.id })
                    .from(userTable)
                    .where(
                        and(
                            eq(userTable.id, userId),
                            eq(userTable.isDeleted, false),
                        ),
                    )
                    .for("no key update")
            ).at(0);
            if (user === undefined) return undefined;
            const existing = (
                await tx
                    .select({
                        projectId: projectTable.id,
                        projectSlug: projectTable.slug,
                        projectTitle: projectTable.title,
                    })
                    .from(projectTable)
                    .innerJoin(
                        organizationTable,
                        eq(
                            organizationTable.id,
                            projectTable.autoProvisionedForOrganizationId,
                        ),
                    )
                    .where(
                        and(
                            eq(
                                organizationTable.autoProvisionedForUserId,
                                userId,
                            ),
                            isNull(organizationTable.deletedAt),
                            isNull(projectTable.deletedAt),
                        ),
                    )
            ).at(0);
            if (existing !== undefined) return existing;
            const organization = await getOrCreatePersonalOrganization({
                db: tx,
                userId,
                autoProvisionedDefaultLanguage:
                    getImplicitDefaultDisplayLanguage(),
            });
            return await getOrCreateDefaultProjectForOrganization({
                db: tx,
                organizationId: organization.organizationId,
            });
        });
    }
    const organizations = await getDestinationOrganizations({ db, userId });
    const organization = [...organizations.values()].find(
        (row) =>
            row.slug === target.organizationSlug &&
            row.capabilities.has("conversation_create") &&
            row.capabilities.has("conversation_edit"),
    );
    if (organization === undefined) return undefined;
    // Existing scopes need no provisioning locks; moves lock projects before owners.
    const existing = (
        await db
            .select({
                projectId: projectTable.id,
                projectSlug: projectTable.slug,
                projectTitle: projectTable.title,
            })
            .from(projectTable)
            .where(
                and(
                    eq(
                        projectTable.autoProvisionedForOrganizationId,
                        organization.id,
                    ),
                    isNull(projectTable.deletedAt),
                ),
            )
    ).at(0);
    return (
        existing ??
        (await getOrCreateDefaultProjectForOrganization({
            db,
            organizationId: organization.id,
        }))
    );
}
