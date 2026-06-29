import { httpErrors } from "@fastify/sensible";
import { and, inArray, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    organizationTable,
    projectContactTable,
    projectContentTable,
    projectExternalOrganizationTable,
    projectExternalOrganizationLocalizationTable,
    projectOrganizationAttributionTable,
    projectOrganizationOwnershipTable,
    projectTable,
    projectTranslationTargetLanguageTable,
} from "@/shared-backend/schema.js";
import type {
    CreateProjectAttributionRequest,
    CreateProjectFailureReason,
    CreateProjectRequest,
    CreateProjectResponse,
    GetAllProjectsResponse,
    UpdateProjectRequest,
    UpdateProjectResponse,
    UpdateProjectExternalOrganizationLocalizationRequest,
    UpdateProjectExternalOrganizationLocalizationResponse,
    UpdateProjectLanguageSettingRequest,
    UpdateProjectLanguageSettingResponse,
    UpdateProjectSlugResponse,
} from "@/shared/types/dto.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { normalizeEmail } from "@/shared/types/zod-email.js";
import { htmlToCountedText } from "@/shared/shared.js";
import {
    contentLanguageMetadataUpdateValues,
    resolveContentLanguageMetadata,
} from "../contentLanguageMetadata.js";
import {
    buildConversationLanguageDetectionCorpus,
    buildGoogleConversationLanguageDetectionCorpus,
} from "../conversationLanguage.js";
import { normalizeTranslationLanguageSetting } from "../translationLanguageSetting.js";

type ProjectOrganizationAttributionRole =
    CreateProjectAttributionRequest["role"];

interface OrganizationRecord {
    id: number;
    slug: string;
    directoryVisibility: "listed" | "unlisted";
}

interface RealAttribution {
    source: "organization";
    role: ProjectOrganizationAttributionRole;
    organizationId: number;
}

interface ExternalAttribution {
    source: "external";
    role: ProjectOrganizationAttributionRole;
    defaultLanguageCode: SupportedDisplayLanguageCodes;
    displayName: string;
    description: string | null;
    imagePath: string | null;
    isFullImagePath: boolean;
    websiteUrl: string | null;
    additionalLocalizations: ExternalAttributionLocalization[];
}

interface ExternalAttributionLocalization {
    languageCode: SupportedDisplayLanguageCodes;
    displayName: string;
    description: string;
    imagePath: string | null;
    isFullImagePath: boolean;
    websiteUrl: string | null;
}

type AttributionToInsert = RealAttribution | ExternalAttribution;

function getStringErrorProperty({
    error,
    property,
}: {
    error: unknown;
    property: string;
}): string | undefined {
    if (typeof error !== "object" || error === null) {
        return undefined;
    }

    const descriptor = Object.getOwnPropertyDescriptor(error, property);
    if (
        descriptor !== undefined &&
        "value" in descriptor &&
        typeof descriptor.value === "string"
    ) {
        return descriptor.value;
    }

    return undefined;
}

function isUniqueViolation(error: unknown): boolean {
    return (
        getStringErrorProperty({
            error,
            property: "code",
        }) === "23505"
    );
}

function getUniqueViolationReason(error: unknown): CreateProjectFailureReason {
    const constraint = getStringErrorProperty({
        error,
        property: "constraint",
    });
    if (constraint?.includes("slug") === true) {
        return "project_slug_already_exists";
    }

    return "project_conflict";
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}

function normalizeOptionalString(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed === undefined || trimmed === "" ? null : trimmed;
}

function getNextSortOrder({
    role,
    sortOrdersByRole,
}: {
    role: ProjectOrganizationAttributionRole;
    sortOrdersByRole: Map<ProjectOrganizationAttributionRole, number>;
}): number {
    const sortOrder = sortOrdersByRole.get(role) ?? 0;
    sortOrdersByRole.set(role, sortOrder + 1);
    return sortOrder;
}

async function getListedOrganizationsBySlug({
    db,
    slugs,
}: {
    db: PostgresJsDatabase;
    slugs: string[];
}): Promise<
    | { success: true; organizationsBySlug: Map<string, OrganizationRecord> }
    | {
          success: false;
          reason: "unknown_organization_slug" | "organization_not_listed";
          organizationSlugs: string[];
      }
> {
    const uniqueSlugs = uniqueStrings(slugs);
    if (uniqueSlugs.length === 0) {
        return { success: true, organizationsBySlug: new Map() };
    }

    const rows = await db
        .select({
            id: organizationTable.id,
            slug: organizationTable.slug,
            directoryVisibility: organizationTable.directoryVisibility,
        })
        .from(organizationTable)
        .where(
            and(
                inArray(organizationTable.slug, uniqueSlugs),
                isNull(organizationTable.deletedAt),
            ),
        );

    const organizationsBySlug = new Map(
        rows.map((organization) => [organization.slug, organization]),
    );
    const missingSlugs = uniqueSlugs.filter(
        (slug) => !organizationsBySlug.has(slug),
    );
    if (missingSlugs.length > 0) {
        return {
            success: false,
            reason: "unknown_organization_slug",
            organizationSlugs: missingSlugs,
        };
    }

    const unlistedSlugs = rows
        .filter((organization) => organization.directoryVisibility !== "listed")
        .map((organization) => organization.slug);
    if (unlistedSlugs.length > 0) {
        return {
            success: false,
            reason: "organization_not_listed",
            organizationSlugs: unlistedSlugs,
        };
    }

    return { success: true, organizationsBySlug };
}

function getOrganizationId({
    organizationsBySlug,
    slug,
}: {
    organizationsBySlug: Map<string, OrganizationRecord>;
    slug: string;
}): number {
    const organization = organizationsBySlug.get(slug);
    if (organization === undefined) {
        throw httpErrors.internalServerError(
            `Organization slug was not loaded before project creation: ${slug}`,
        );
    }

    return organization.id;
}

function buildAttributions({
    requestedAttributions,
    organizationsBySlug,
}: {
    requestedAttributions: CreateProjectAttributionRequest[];
    organizationsBySlug: Map<string, OrganizationRecord>;
}): AttributionToInsert[] {
    const attributions: AttributionToInsert[] = [];
    const realAttributionKeys = new Set<string>();

    const addRealAttribution = ({
        role,
        organizationSlug,
    }: {
        role: ProjectOrganizationAttributionRole;
        organizationSlug: string;
    }): void => {
        const organizationId = getOrganizationId({
            organizationsBySlug,
            slug: organizationSlug,
        });
        const key = `${role}:${String(organizationId)}`;
        if (realAttributionKeys.has(key)) {
            return;
        }

        realAttributionKeys.add(key);
        attributions.push({
            source: "organization",
            role,
            organizationId,
        });
    };

    for (const attribution of requestedAttributions) {
        if (attribution.source === "organization") {
            addRealAttribution({
                role: attribution.role,
                organizationSlug: attribution.organizationSlug,
            });
            continue;
        }

        attributions.push({
            source: "external",
            role: attribution.role,
            defaultLanguageCode: attribution.defaultLanguageCode,
            displayName: attribution.displayName,
            description: normalizeOptionalString(attribution.description),
            imagePath: normalizeOptionalString(attribution.imagePath),
            isFullImagePath: attribution.isFullImagePath,
            websiteUrl: normalizeOptionalString(attribution.websiteUrl),
            additionalLocalizations: attribution.additionalLocalizations.map(
                (localization) => ({
                    languageCode: localization.languageCode,
                    displayName: localization.displayName,
                    description: localization.description,
                    imagePath: normalizeOptionalString(localization.imagePath),
                    isFullImagePath: localization.isFullImagePath,
                    websiteUrl: normalizeOptionalString(localization.websiteUrl),
                }),
            ),
        });
    }

    return attributions;
}

export async function createProject({
    db,
    data,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    data: CreateProjectRequest;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<CreateProjectResponse> {
    const existingProject = await db
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.slug, data.projectSlug),
                isNull(projectTable.deletedAt),
            ),
        )
        .limit(1);
    if (existingProject.at(0) !== undefined) {
        return {
            success: false,
            reason: "project_slug_already_exists",
        };
    }

    const ownerOrganizationSlugs = uniqueStrings(data.ownerOrganizationSlugs);
    const attributionOrganizationSlugs = data.attributions.flatMap(
        (attribution) =>
            attribution.source === "organization"
                ? [attribution.organizationSlug]
                : [],
    );
    const contactOrganizationSlugs =
        data.contact?.organizationSlug === undefined
            ? []
            : [data.contact.organizationSlug];
    const organizationLookup = await getListedOrganizationsBySlug({
        db,
        slugs: [
            ...ownerOrganizationSlugs,
            ...attributionOrganizationSlugs,
            ...contactOrganizationSlugs,
        ],
    });
    if (!organizationLookup.success) {
        return organizationLookup;
    }

    const attributions = buildAttributions({
        requestedAttributions: data.attributions,
        organizationsBySlug: organizationLookup.organizationsBySlug,
    });

    const bodyPlainText = data.bodyPlainText ?? htmlToCountedText(data.body ?? "");
    const projectLanguageMetadata = await resolveContentLanguageMetadata({
        text: buildConversationLanguageDetectionCorpus({
            conversationTitle: data.projectTitle,
            bodyPlainText,
        }),
        googleText: buildGoogleConversationLanguageDetectionCorpus({
            conversationTitle: data.projectTitle,
            bodyPlainText,
        }),
        googleCloudCredentials,
        useGoogleLanguageDetection: data.translationSetting.dynamicTranslationEnabled,
    });
    const normalizedSetting = normalizeTranslationLanguageSetting({
        setting: data.translationSetting,
        canUseDynamicTranslation: true,
        sourceLanguageCode: projectLanguageMetadata.sourceLanguageCode,
    });

    try {
        return await db.transaction(async (tx) => {
            const insertedProjects = await tx
                .insert(projectTable)
                .values({
                    slug: data.projectSlug,
                    title: data.projectTitle,
                    directoryVisibility: "listed",
                    autoProvisionedForOrganizationId: null,
                    currentContentId: null,
                    dynamicTranslationEnabled:
                        normalizedSetting.dynamicTranslationEnabled,
                })
                .returning({ projectId: projectTable.id });
            const insertedProject = insertedProjects.at(0);
            if (insertedProject === undefined) {
                throw httpErrors.internalServerError("Failed to create project");
            }

            const insertedContents = await tx
                .insert(projectContentTable)
                .values({
                    projectId: insertedProject.projectId,
                    title: data.projectTitle,
                    subtitle: normalizeOptionalString(data.subtitle),
                    body: normalizeOptionalString(data.body),
                    bodyPlainText,
                    heroImagePath: normalizeOptionalString(data.heroImagePath),
                    heroImageIsFullPath: data.heroImageIsFullPath,
                    ...contentLanguageMetadataUpdateValues(projectLanguageMetadata),
                })
                .returning({ contentId: projectContentTable.id });
            const insertedContent = insertedContents.at(0);
            if (insertedContent === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to create project content",
                );
            }

            await tx
                .update(projectTable)
                .set({ currentContentId: insertedContent.contentId })
                .where(eq(projectTable.id, insertedProject.projectId));

            await tx.insert(projectOrganizationOwnershipTable).values(
                ownerOrganizationSlugs.map((organizationSlug) => ({
                    projectId: insertedProject.projectId,
                    organizationId: getOrganizationId({
                        organizationsBySlug: organizationLookup.organizationsBySlug,
                        slug: organizationSlug,
                    }),
                })),
            );

            if (normalizedSetting.additionalLanguageCodes.length > 0) {
                await tx.insert(projectTranslationTargetLanguageTable).values(
                    normalizedSetting.additionalLanguageCodes.map((languageCode) => ({
                        projectId: insertedProject.projectId,
                        languageCode,
                    })),
                );
            }

            const sortOrdersByRole = new Map<
                ProjectOrganizationAttributionRole,
                number
            >();
            for (const attribution of attributions) {
                const sortOrder = getNextSortOrder({
                    role: attribution.role,
                    sortOrdersByRole,
                });

                if (attribution.source === "organization") {
                    await tx.insert(projectOrganizationAttributionTable).values({
                        projectId: insertedProject.projectId,
                        role: attribution.role,
                        sortOrder,
                        organizationId: attribution.organizationId,
                        externalOrganizationId: null,
                    });
                    continue;
                }

                const insertedExternalOrganizations = await tx
                    .insert(projectExternalOrganizationTable)
                    .values({
                        projectId: insertedProject.projectId,
                        displayName: attribution.displayName,
                        defaultLanguageCode: attribution.defaultLanguageCode,
                        description: attribution.description,
                        imagePath: attribution.imagePath,
                        isFullImagePath: attribution.isFullImagePath,
                        websiteUrl: attribution.websiteUrl,
                    })
                    .returning({
                        externalOrganizationId:
                            projectExternalOrganizationTable.id,
                    });
                const insertedExternalOrganization =
                    insertedExternalOrganizations.at(0);
                if (insertedExternalOrganization === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to create external organization",
                    );
                }

                await tx.insert(projectExternalOrganizationLocalizationTable).values({
                    externalOrganizationId:
                        insertedExternalOrganization.externalOrganizationId,
                    languageCode: attribution.defaultLanguageCode,
                    displayName: attribution.displayName,
                    description: attribution.description ?? "",
                    websiteUrl: attribution.websiteUrl,
                    imagePath: attribution.imagePath,
                    isFullImagePath: attribution.isFullImagePath,
                });

                const additionalLocalizations = attribution.additionalLocalizations
                    .filter(
                        (localization) =>
                            localization.languageCode !== attribution.defaultLanguageCode,
                    )
                    .map((localization) => ({
                        externalOrganizationId:
                            insertedExternalOrganization.externalOrganizationId,
                        languageCode: localization.languageCode,
                        displayName: localization.displayName,
                        description: localization.description,
                        websiteUrl: localization.websiteUrl,
                        imagePath: localization.imagePath,
                        isFullImagePath: localization.isFullImagePath,
                    }));
                if (additionalLocalizations.length > 0) {
                    await tx
                        .insert(projectExternalOrganizationLocalizationTable)
                        .values(additionalLocalizations)
                        .onConflictDoNothing();
                }

                await tx.insert(projectOrganizationAttributionTable).values({
                    projectId: insertedProject.projectId,
                    role: attribution.role,
                    sortOrder,
                    organizationId: null,
                    externalOrganizationId:
                        insertedExternalOrganization.externalOrganizationId,
                });
            }

            if (data.contact !== undefined) {
                await tx.insert(projectContactTable).values({
                    projectId: insertedProject.projectId,
                    name: data.contact.name.trim(),
                    roleLabel: normalizeOptionalString(data.contact.roleLabel),
                    email: normalizeEmail(data.contact.email),
                    organizationId:
                        data.contact.organizationSlug === undefined
                            ? null
                            : getOrganizationId({
                                  organizationsBySlug:
                                      organizationLookup.organizationsBySlug,
                                  slug: data.contact.organizationSlug,
                              }),
                    externalOrganizationId: null,
                });
            }

            return {
                success: true,
                projectId: insertedProject.projectId,
                projectSlug: data.projectSlug,
            };
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return {
                success: false,
                reason: getUniqueViolationReason(error),
            };
        }

        throw error;
    }
}

export async function getAllProjects({
    db,
}: {
    db: PostgresJsDatabase;
}): Promise<GetAllProjectsResponse> {
    const projectRows = await db
        .select({
            projectId: projectTable.id,
            projectSlug: projectTable.slug,
            projectTitle: projectTable.title,
            subtitle: projectContentTable.subtitle,
            body: projectContentTable.body,
            bodyPlainText: projectContentTable.bodyPlainText,
            heroImagePath: projectContentTable.heroImagePath,
            heroImageIsFullPath: projectContentTable.heroImageIsFullPath,
            dynamicTranslationEnabled: projectTable.dynamicTranslationEnabled,
        })
        .from(projectTable)
        .leftJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .where(
            and(
                eq(projectTable.directoryVisibility, "listed"),
                isNull(projectTable.deletedAt),
            ),
        );

    const projectIds = projectRows.map((project) => project.projectId);
    const targetLanguageRows =
        projectIds.length === 0
            ? []
            : await db
                  .select({
                      projectId: projectTranslationTargetLanguageTable.projectId,
                      languageCode:
                          projectTranslationTargetLanguageTable.languageCode,
                  })
                  .from(projectTranslationTargetLanguageTable)
                  .where(
                      inArray(
                          projectTranslationTargetLanguageTable.projectId,
                          projectIds,
                      ),
                   );

    const ownerRows =
        projectIds.length === 0
            ? []
            : await db
                  .select({
                      projectId: projectOrganizationOwnershipTable.projectId,
                      organizationSlug: organizationTable.slug,
                  })
                  .from(projectOrganizationOwnershipTable)
                  .innerJoin(
                      organizationTable,
                      eq(
                          organizationTable.id,
                          projectOrganizationOwnershipTable.organizationId,
                      ),
                  )
                  .where(
                      inArray(projectOrganizationOwnershipTable.projectId, projectIds),
                  );

    const attributionRows =
        projectIds.length === 0
            ? []
            : await db
                  .select({
                      projectId: projectOrganizationAttributionTable.projectId,
                      role: projectOrganizationAttributionTable.role,
                      sortOrder: projectOrganizationAttributionTable.sortOrder,
                      organizationSlug: organizationTable.slug,
                      externalOrganizationId: projectExternalOrganizationTable.id,
                      defaultLanguageCode:
                          projectExternalOrganizationTable.defaultLanguageCode,
                      displayName: projectExternalOrganizationTable.displayName,
                      description: projectExternalOrganizationTable.description,
                      imagePath: projectExternalOrganizationTable.imagePath,
                      isFullImagePath:
                          projectExternalOrganizationTable.isFullImagePath,
                      websiteUrl: projectExternalOrganizationTable.websiteUrl,
                  })
                  .from(projectOrganizationAttributionTable)
                  .leftJoin(
                      organizationTable,
                      eq(
                          organizationTable.id,
                          projectOrganizationAttributionTable.organizationId,
                      ),
                  )
                  .leftJoin(
                      projectExternalOrganizationTable,
                      eq(
                          projectExternalOrganizationTable.id,
                          projectOrganizationAttributionTable.externalOrganizationId,
                      ),
                  )
                  .where(
                      inArray(projectOrganizationAttributionTable.projectId, projectIds),
                  );

    const externalOrganizationIds = attributionRows.flatMap((attribution) =>
        attribution.externalOrganizationId === null
            ? []
            : [attribution.externalOrganizationId],
    );
    const externalLocalizationRows =
        externalOrganizationIds.length === 0
            ? []
            : await db
                  .select({
                      externalOrganizationId:
                          projectExternalOrganizationLocalizationTable.externalOrganizationId,
                      languageCode:
                          projectExternalOrganizationLocalizationTable.languageCode,
                      displayName:
                          projectExternalOrganizationLocalizationTable.displayName,
                      description:
                          projectExternalOrganizationLocalizationTable.description,
                      websiteUrl:
                          projectExternalOrganizationLocalizationTable.websiteUrl,
                      imagePath: projectExternalOrganizationLocalizationTable.imagePath,
                      isFullImagePath:
                          projectExternalOrganizationLocalizationTable.isFullImagePath,
                  })
                  .from(projectExternalOrganizationLocalizationTable)
                  .where(
                      inArray(
                          projectExternalOrganizationLocalizationTable.externalOrganizationId,
                          externalOrganizationIds,
                      ),
                  );

    const contactRows =
        projectIds.length === 0
            ? []
            : await db
                  .select({
                      projectId: projectContactTable.projectId,
                      name: projectContactTable.name,
                      roleLabel: projectContactTable.roleLabel,
                      email: projectContactTable.email,
                      organizationSlug: organizationTable.slug,
                  })
                  .from(projectContactTable)
                  .leftJoin(
                      organizationTable,
                      eq(organizationTable.id, projectContactTable.organizationId),
                  )
                  .where(inArray(projectContactTable.projectId, projectIds));

    const additionalLanguagesByProjectId = new Map<
        number,
        GetAllProjectsResponse["projectList"][number]["additionalLanguageCodes"]
    >();
    for (const targetLanguage of targetLanguageRows) {
        const additionalLanguageCodes =
            additionalLanguagesByProjectId.get(targetLanguage.projectId) ?? [];
        additionalLanguageCodes.push(targetLanguage.languageCode);
        additionalLanguagesByProjectId.set(
            targetLanguage.projectId,
            additionalLanguageCodes,
        );
    }

    const ownerSlugsByProjectId = new Map<number, string[]>();
    for (const owner of ownerRows) {
        const ownerSlugs = ownerSlugsByProjectId.get(owner.projectId) ?? [];
        ownerSlugs.push(owner.organizationSlug);
        ownerSlugsByProjectId.set(owner.projectId, ownerSlugs);
    }

    const localizationsByExternalOrganizationId = new Map<
        number,
        Extract<
            GetAllProjectsResponse["projectList"][number]["attributions"][number],
            { source: "external" }
        >["additionalLocalizations"]
    >();
    for (const localization of externalLocalizationRows) {
        const localizations =
            localizationsByExternalOrganizationId.get(
                localization.externalOrganizationId,
            ) ?? [];
        localizations.push({
            languageCode: localization.languageCode,
            displayName: localization.displayName,
            description: localization.description,
            websiteUrl: localization.websiteUrl ?? undefined,
            imagePath: localization.imagePath ?? undefined,
            isFullImagePath: localization.isFullImagePath,
        });
        localizationsByExternalOrganizationId.set(
            localization.externalOrganizationId,
            localizations,
        );
    }

    const attributionsByProjectId = new Map<
        number,
        GetAllProjectsResponse["projectList"][number]["attributions"]
    >();
    for (const attribution of attributionRows.toSorted(
        (first, second) => first.sortOrder - second.sortOrder,
    )) {
        const attributions = attributionsByProjectId.get(attribution.projectId) ?? [];
        if (attribution.organizationSlug !== null) {
            attributions.push({
                source: "organization",
                role: attribution.role,
                organizationSlug: attribution.organizationSlug,
            });
        } else if (
            attribution.externalOrganizationId !== null &&
            attribution.defaultLanguageCode !== null &&
            attribution.displayName !== null
        ) {
            const additionalLocalizations = (
                localizationsByExternalOrganizationId.get(
                    attribution.externalOrganizationId,
                ) ?? []
            ).filter(
                (localization) =>
                    localization.languageCode !== attribution.defaultLanguageCode,
            );
            attributions.push({
                source: "external",
                role: attribution.role,
                defaultLanguageCode: attribution.defaultLanguageCode,
                displayName: attribution.displayName,
                description: attribution.description ?? undefined,
                imagePath: attribution.imagePath ?? undefined,
                isFullImagePath: attribution.isFullImagePath ?? false,
                websiteUrl: attribution.websiteUrl ?? undefined,
                additionalLocalizations,
            });
        }
        attributionsByProjectId.set(attribution.projectId, attributions);
    }

    const contactsByProjectId = new Map(
        contactRows.map((contact) => [
            contact.projectId,
            {
                name: contact.name,
                roleLabel: contact.roleLabel ?? undefined,
                email: contact.email,
                organizationSlug: contact.organizationSlug ?? undefined,
            },
        ]),
    );

    return {
        projectList: projectRows.map((project) => ({
            projectSlug: project.projectSlug,
            projectTitle: project.projectTitle,
            ownerOrganizationSlugs:
                ownerSlugsByProjectId.get(project.projectId) ?? [],
            subtitle: project.subtitle ?? undefined,
            body: project.body ?? undefined,
            bodyPlainText: project.bodyPlainText ?? undefined,
            heroImagePath: project.heroImagePath ?? undefined,
            heroImageIsFullPath: project.heroImageIsFullPath ?? false,
            dynamicTranslationEnabled: project.dynamicTranslationEnabled,
            additionalLanguageCodes:
                additionalLanguagesByProjectId.get(project.projectId) ?? [],
            attributions: attributionsByProjectId.get(project.projectId) ?? [],
            contact: contactsByProjectId.get(project.projectId),
        })),
    };
}

export async function updateProjectSlug({
    db,
    currentProjectSlug,
    newProjectSlug,
}: {
    db: PostgresJsDatabase;
    currentProjectSlug: string;
    newProjectSlug: string;
}): Promise<UpdateProjectSlugResponse> {
    if (currentProjectSlug === newProjectSlug) {
        return { success: true };
    }

    try {
        const updatedRows = await db
            .update(projectTable)
            .set({ slug: newProjectSlug, updatedAt: new Date() })
            .where(
                and(
                    eq(projectTable.slug, currentProjectSlug),
                    isNull(projectTable.deletedAt),
                ),
            )
            .returning({ id: projectTable.id });
        if (updatedRows.length === 0) {
            return { success: false, reason: "project_not_found" };
        }

        return { success: true };
    } catch (error) {
        if (isUniqueViolation(error)) {
            return { success: false, reason: "project_slug_already_exists" };
        }

        throw error;
    }
}

export async function archiveProject({
    db,
    projectSlug,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
}): Promise<void> {
    const now = new Date();
    const updatedProjects = await db
        .update(projectTable)
        .set({
            directoryVisibility: "unlisted",
            deletedAt: now,
            updatedAt: now,
        })
        .where(
            and(eq(projectTable.slug, projectSlug), isNull(projectTable.deletedAt)),
        )
        .returning({ projectId: projectTable.id });
    if (updatedProjects.length === 0) {
        throw httpErrors.notFound("Project not found");
    }
}

export async function updateProject({
    db,
    data,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    data: UpdateProjectRequest;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<UpdateProjectResponse> {
    const projectRows = await db
        .select({
            projectId: projectTable.id,
            currentContentId: projectTable.currentContentId,
        })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.slug, data.currentProjectSlug),
                isNull(projectTable.deletedAt),
            ),
        )
        .limit(1);
    const project = projectRows.at(0);
    if (project === undefined) {
        return { success: false, reason: "project_not_found" };
    }

    const ownerOrganizationSlugs = uniqueStrings(data.ownerOrganizationSlugs);
    const attributionOrganizationSlugs = data.attributions.flatMap(
        (attribution) =>
            attribution.source === "organization"
                ? [attribution.organizationSlug]
                : [],
    );
    const contactOrganizationSlugs =
        data.contact?.organizationSlug === undefined
            ? []
            : [data.contact.organizationSlug];
    const organizationLookup = await getListedOrganizationsBySlug({
        db,
        slugs: [
            ...ownerOrganizationSlugs,
            ...attributionOrganizationSlugs,
            ...contactOrganizationSlugs,
        ],
    });
    if (!organizationLookup.success) {
        return organizationLookup;
    }

    const attributions = buildAttributions({
        requestedAttributions: data.attributions,
        organizationsBySlug: organizationLookup.organizationsBySlug,
    });
    const bodyPlainText = data.bodyPlainText ?? htmlToCountedText(data.body ?? "");
    const projectLanguageMetadata = await resolveContentLanguageMetadata({
        text: buildConversationLanguageDetectionCorpus({
            conversationTitle: data.projectTitle,
            bodyPlainText,
        }),
        googleText: buildGoogleConversationLanguageDetectionCorpus({
            conversationTitle: data.projectTitle,
            bodyPlainText,
        }),
        googleCloudCredentials,
        useGoogleLanguageDetection: data.translationSetting.dynamicTranslationEnabled,
    });
    const normalizedSetting = normalizeTranslationLanguageSetting({
        setting: data.translationSetting,
        canUseDynamicTranslation: true,
        sourceLanguageCode: projectLanguageMetadata.sourceLanguageCode,
    });

    try {
        await db.transaction(async (tx) => {
            const now = new Date();
            const updatedProjects = await tx
                .update(projectTable)
                .set({
                    slug: data.projectSlug,
                    title: data.projectTitle,
                    dynamicTranslationEnabled:
                        data.translationSetting.dynamicTranslationEnabled,
                    updatedAt: now,
                })
                .where(eq(projectTable.id, project.projectId))
                .returning({ projectId: projectTable.id });
            if (updatedProjects.length === 0) {
                throw httpErrors.notFound("Project not found");
            }

            if (project.currentContentId === null) {
                const insertedContents = await tx
                    .insert(projectContentTable)
                    .values({
                        projectId: project.projectId,
                        title: data.projectTitle,
                        subtitle: normalizeOptionalString(data.subtitle),
                        body: normalizeOptionalString(data.body),
                        bodyPlainText,
                        heroImagePath: normalizeOptionalString(data.heroImagePath),
                        heroImageIsFullPath: data.heroImageIsFullPath,
                        ...contentLanguageMetadataUpdateValues(
                            projectLanguageMetadata,
                        ),
                    })
                    .returning({ contentId: projectContentTable.id });
                const insertedContent = insertedContents.at(0);
                if (insertedContent === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to create project content",
                    );
                }
                await tx
                    .update(projectTable)
                    .set({ currentContentId: insertedContent.contentId })
                    .where(eq(projectTable.id, project.projectId));
            } else {
                await tx
                    .update(projectContentTable)
                    .set({
                        title: data.projectTitle,
                        subtitle: normalizeOptionalString(data.subtitle),
                        body: normalizeOptionalString(data.body),
                        bodyPlainText,
                        heroImagePath: normalizeOptionalString(data.heroImagePath),
                        heroImageIsFullPath: data.heroImageIsFullPath,
                        ...contentLanguageMetadataUpdateValues(
                            projectLanguageMetadata,
                        ),
                    })
                    .where(eq(projectContentTable.id, project.currentContentId));
            }

            await tx
                .delete(projectOrganizationOwnershipTable)
                .where(
                    eq(projectOrganizationOwnershipTable.projectId, project.projectId),
                );
            await tx.insert(projectOrganizationOwnershipTable).values(
                ownerOrganizationSlugs.map((organizationSlug) => ({
                    projectId: project.projectId,
                    organizationId: getOrganizationId({
                        organizationsBySlug: organizationLookup.organizationsBySlug,
                        slug: organizationSlug,
                    }),
                })),
            );

            await tx
                .delete(projectTranslationTargetLanguageTable)
                .where(
                    eq(projectTranslationTargetLanguageTable.projectId, project.projectId),
                );
            if (normalizedSetting.additionalLanguageCodes.length > 0) {
                await tx.insert(projectTranslationTargetLanguageTable).values(
                    normalizedSetting.additionalLanguageCodes.map((languageCode) => ({
                        projectId: project.projectId,
                        languageCode,
                    })),
                );
            }

            const existingExternalOrganizationRows = await tx
                .select({ id: projectExternalOrganizationTable.id })
                .from(projectExternalOrganizationTable)
                .where(
                    eq(projectExternalOrganizationTable.projectId, project.projectId),
                );
            const existingExternalOrganizationIds = existingExternalOrganizationRows.map(
                (externalOrganization) => externalOrganization.id,
            );
            await tx
                .delete(projectOrganizationAttributionTable)
                .where(
                    eq(projectOrganizationAttributionTable.projectId, project.projectId),
                );
            if (existingExternalOrganizationIds.length > 0) {
                await tx
                    .delete(projectExternalOrganizationLocalizationTable)
                    .where(
                        inArray(
                            projectExternalOrganizationLocalizationTable.externalOrganizationId,
                            existingExternalOrganizationIds,
                        ),
                    );
                await tx
                    .delete(projectExternalOrganizationTable)
                    .where(
                        inArray(
                            projectExternalOrganizationTable.id,
                            existingExternalOrganizationIds,
                        ),
                    );
            }

            const sortOrdersByRole = new Map<
                ProjectOrganizationAttributionRole,
                number
            >();
            for (const attribution of attributions) {
                const sortOrder = getNextSortOrder({
                    role: attribution.role,
                    sortOrdersByRole,
                });

                if (attribution.source === "organization") {
                    await tx.insert(projectOrganizationAttributionTable).values({
                        projectId: project.projectId,
                        role: attribution.role,
                        sortOrder,
                        organizationId: attribution.organizationId,
                        externalOrganizationId: null,
                    });
                    continue;
                }

                const insertedExternalOrganizations = await tx
                    .insert(projectExternalOrganizationTable)
                    .values({
                        projectId: project.projectId,
                        displayName: attribution.displayName,
                        defaultLanguageCode: attribution.defaultLanguageCode,
                        description: attribution.description,
                        imagePath: attribution.imagePath,
                        isFullImagePath: attribution.isFullImagePath,
                        websiteUrl: attribution.websiteUrl,
                    })
                    .returning({
                        externalOrganizationId:
                            projectExternalOrganizationTable.id,
                    });
                const insertedExternalOrganization =
                    insertedExternalOrganizations.at(0);
                if (insertedExternalOrganization === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to create external organization",
                    );
                }

                await tx.insert(projectExternalOrganizationLocalizationTable).values({
                    externalOrganizationId:
                        insertedExternalOrganization.externalOrganizationId,
                    languageCode: attribution.defaultLanguageCode,
                    displayName: attribution.displayName,
                    description: attribution.description ?? "",
                    websiteUrl: attribution.websiteUrl,
                    imagePath: attribution.imagePath,
                    isFullImagePath: attribution.isFullImagePath,
                });

                const additionalLocalizations = attribution.additionalLocalizations
                    .filter(
                        (localization) =>
                            localization.languageCode !== attribution.defaultLanguageCode,
                    )
                    .map((localization) => ({
                        externalOrganizationId:
                            insertedExternalOrganization.externalOrganizationId,
                        languageCode: localization.languageCode,
                        displayName: localization.displayName,
                        description: localization.description,
                        websiteUrl: localization.websiteUrl,
                        imagePath: localization.imagePath,
                        isFullImagePath: localization.isFullImagePath,
                    }));
                if (additionalLocalizations.length > 0) {
                    await tx
                        .insert(projectExternalOrganizationLocalizationTable)
                        .values(additionalLocalizations)
                        .onConflictDoNothing();
                }

                await tx.insert(projectOrganizationAttributionTable).values({
                    projectId: project.projectId,
                    role: attribution.role,
                    sortOrder,
                    organizationId: null,
                    externalOrganizationId:
                        insertedExternalOrganization.externalOrganizationId,
                });
            }

            await tx
                .delete(projectContactTable)
                .where(eq(projectContactTable.projectId, project.projectId));
            if (data.contact !== undefined) {
                await tx.insert(projectContactTable).values({
                    projectId: project.projectId,
                    name: data.contact.name.trim(),
                    roleLabel: normalizeOptionalString(data.contact.roleLabel),
                    email: normalizeEmail(data.contact.email),
                    organizationId:
                        data.contact.organizationSlug === undefined
                            ? null
                            : getOrganizationId({
                                  organizationsBySlug:
                                      organizationLookup.organizationsBySlug,
                                  slug: data.contact.organizationSlug,
                              }),
                    externalOrganizationId: null,
                });
            }
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return {
                success: false,
                reason: getUniqueViolationReason(error),
            };
        }

        throw error;
    }

    return {
        success: true,
        projectId: project.projectId,
        projectSlug: data.projectSlug,
    };
}

export async function updateProjectLanguageSetting({
    db,
    data,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    data: UpdateProjectLanguageSettingRequest;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<UpdateProjectLanguageSettingResponse & { projectId: number }> {
    const projectRows = await db
        .select({ projectId: projectTable.id })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.slug, data.projectSlug),
                isNull(projectTable.deletedAt),
            ),
        )
        .limit(1);
    const project = projectRows.at(0);
    if (project === undefined) {
        throw httpErrors.notFound("Project not found");
    }

    await db.transaction(async (tx) => {
        const now = new Date();
        await tx
            .update(projectTable)
            .set({
                dynamicTranslationEnabled: data.setting.dynamicTranslationEnabled,
                updatedAt: now,
            })
            .where(eq(projectTable.id, project.projectId));

        await tx
            .delete(projectTranslationTargetLanguageTable)
            .where(
                eq(projectTranslationTargetLanguageTable.projectId, project.projectId),
            );
        const currentContentRows = await tx
            .select({
                contentId: projectContentTable.id,
                title: projectContentTable.title,
                body: projectContentTable.body,
                bodyPlainText: projectContentTable.bodyPlainText,
                sourceLanguageCode: projectContentTable.sourceLanguageCode,
            })
            .from(projectTable)
            .innerJoin(
                projectContentTable,
                eq(projectContentTable.id, projectTable.currentContentId),
            )
            .where(eq(projectTable.id, project.projectId))
            .limit(1);
        const currentContent = currentContentRows.at(0);
        let finalSourceLanguageCode = currentContent?.sourceLanguageCode ?? null;

        if (
            currentContent !== undefined &&
            data.setting.dynamicTranslationEnabled
        ) {
            const bodyPlainText =
                currentContent.bodyPlainText ??
                htmlToCountedText(currentContent.body ?? "");
            const sourceLanguageMetadata = await resolveContentLanguageMetadata({
                text: buildConversationLanguageDetectionCorpus({
                    conversationTitle: currentContent.title,
                    bodyPlainText,
                }),
                googleText: buildGoogleConversationLanguageDetectionCorpus({
                    conversationTitle: currentContent.title,
                    bodyPlainText,
                }),
                googleCloudCredentials,
                useGoogleLanguageDetection: true,
            });
            finalSourceLanguageCode = sourceLanguageMetadata.sourceLanguageCode;
            await tx
                .update(projectContentTable)
                .set(contentLanguageMetadataUpdateValues(sourceLanguageMetadata))
                .where(eq(projectContentTable.id, currentContent.contentId));
        }

        const normalizedSetting = normalizeTranslationLanguageSetting({
            setting: data.setting,
            canUseDynamicTranslation: true,
            sourceLanguageCode: finalSourceLanguageCode,
        });

        if (normalizedSetting.additionalLanguageCodes.length > 0) {
            await tx.insert(projectTranslationTargetLanguageTable).values(
                normalizedSetting.additionalLanguageCodes.map((languageCode) => ({
                    projectId: project.projectId,
                    languageCode,
                })),
            );
        }
    });

    return { success: true, projectId: project.projectId };
}

export async function updateProjectExternalOrganizationLocalization({
    db,
    data,
}: {
    db: PostgresJsDatabase;
    data: UpdateProjectExternalOrganizationLocalizationRequest;
}): Promise<UpdateProjectExternalOrganizationLocalizationResponse> {
    const imagePath =
        data.imagePath === undefined || data.imagePath.trim() === ""
            ? null
            : data.imagePath;
    const websiteUrl = data.websiteUrl ?? null;

    await db.transaction(async (tx) => {
        await tx
            .insert(projectExternalOrganizationLocalizationTable)
            .values({
                externalOrganizationId: data.externalOrganizationId,
                languageCode: data.languageCode,
                displayName: data.displayName,
                description: data.description,
                websiteUrl,
                imagePath,
                isFullImagePath: data.isFullImagePath,
            })
            .onConflictDoUpdate({
                target: [
                    projectExternalOrganizationLocalizationTable.externalOrganizationId,
                    projectExternalOrganizationLocalizationTable.languageCode,
                ],
                set: {
                    displayName: data.displayName,
                    description: data.description,
                    websiteUrl,
                    imagePath,
                    isFullImagePath: data.isFullImagePath,
                    updatedAt: new Date(),
                },
            });

        if (data.setAsDefault) {
            await tx
                .update(projectExternalOrganizationTable)
                .set({
                    defaultLanguageCode: data.languageCode,
                    displayName: data.displayName,
                    description: data.description,
                    websiteUrl,
                    imagePath,
                    isFullImagePath: data.isFullImagePath,
                    updatedAt: new Date(),
                })
                .where(
                    eq(
                        projectExternalOrganizationTable.id,
                        data.externalOrganizationId,
                    ),
                );
        }
    });

    return { success: true };
}
