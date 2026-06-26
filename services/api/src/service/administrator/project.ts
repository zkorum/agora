import { httpErrors } from "@fastify/sensible";
import { inArray, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    organizationTable,
    projectContactTable,
    projectContentTable,
    projectExternalOrganizationTable,
    projectOrganizationAttributionTable,
    projectOrganizationOwnershipTable,
    projectTable,
} from "@/shared-backend/schema.js";
import type {
    CreateProjectAttributionRequest,
    CreateProjectFailureReason,
    CreateProjectRequest,
    CreateProjectResponse,
} from "@/shared/types/dto.js";
import { normalizeEmail } from "@/shared/types/zod-email.js";

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
    displayName: string;
    description: string | null;
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
        .where(inArray(organizationTable.slug, uniqueSlugs));

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
    ownerOrganizationSlugs,
    requestedAttributions,
    organizationsBySlug,
}: {
    ownerOrganizationSlugs: string[];
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

    for (const ownerOrganizationSlug of ownerOrganizationSlugs) {
        addRealAttribution({
            role: "project_owner",
            organizationSlug: ownerOrganizationSlug,
        });
    }

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
            displayName: attribution.displayName,
            description: normalizeOptionalString(attribution.description),
            imagePath: normalizeOptionalString(attribution.imagePath),
            isFullImagePath: attribution.isFullImagePath,
            websiteUrl: normalizeOptionalString(attribution.websiteUrl),
        });
    }

    return attributions;
}

export async function createProject({
    db,
    data,
}: {
    db: PostgresJsDatabase;
    data: CreateProjectRequest;
}): Promise<CreateProjectResponse> {
    const existingProject = await db
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(eq(projectTable.slug, data.projectSlug))
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
        ownerOrganizationSlugs,
        requestedAttributions: data.attributions,
        organizationsBySlug: organizationLookup.organizationsBySlug,
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
                    subtitle: normalizeOptionalString(data.subtitle),
                    body: normalizeOptionalString(data.body),
                    bodyPlainText: normalizeOptionalString(data.bodyPlainText),
                    heroImagePath: normalizeOptionalString(data.heroImagePath),
                    heroImageIsFullPath: data.heroImageIsFullPath,
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
