import {
    organizationLocalizationTable,
    organizationMembershipTable,
    organizationTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { useCommonUser } from "../common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import type {
    AdminOrganizationProperties,
    GetAllOrganizationsResponse,
    GetOrganizationMembersResponse,
    GetOrganizationsByUsernameResponse,
    UpdateOrganizationSlugResponse,
    UpdateOrganizationLocalizationRequest,
    UpdateOrganizationLocalizationResponse,
} from "@/shared/types/dto.js";
import type { OrganizationProperties } from "@/shared/types/zod.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";
import { ensureOrganizationMembershipBaselineCapabilities } from "../projectAccess.js";

function buildOrganizationProperties({
    name,
    slug,
    description,
    imagePath,
    isFullImagePath,
    websiteUrl,
    baseImageServiceUrl,
}: {
    name: string;
    slug: string;
    description: string | null;
    imagePath: string | null;
    isFullImagePath: boolean;
    websiteUrl: string | null;
    baseImageServiceUrl: string;
}): OrganizationProperties {
    const imageUrl = imagePathToUrl({
        imagePath,
        isFullImagePath,
        baseImageServiceUrl,
    });

    return {
        name,
        slug,
        description: description ?? "",
        ...(imageUrl === undefined ? {} : { imageUrl }),
        ...(websiteUrl === null ? {} : { websiteUrl }),
    };
}

function optionalUrl(url: string | null): string | undefined {
    return url ?? undefined;
}

function optionalText(text: string | null): string | undefined {
    return text === null || text.trim() === "" ? undefined : text;
}

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
    );
}

function hasHttpStatusCode(error: unknown): error is { statusCode: number } {
    return (
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
    );
}

interface GetAllOrganizationsProps {
    db: PostgresJsDatabase;
    baseImageServiceUrl: string;
}

export async function getAllOrganizations({
    db,
    baseImageServiceUrl,
}: GetAllOrganizationsProps): Promise<GetAllOrganizationsResponse> {
    const organizationTableResponse = await db
        .select({
            id: organizationTable.id,
            name: organizationTable.displayName,
            slug: organizationTable.slug,
            defaultLanguageCode: organizationTable.defaultLanguageCode,
            description: organizationTable.description,
            imagePath: organizationTable.imagePath,
            isFullImagePath: organizationTable.isFullImagePath,
            websiteUrl: organizationTable.websiteUrl,
        })
        .from(organizationTable)
        .where(
            and(
                eq(organizationTable.directoryVisibility, "listed"),
                isNull(organizationTable.deletedAt),
            ),
        );

    const organizationIds = organizationTableResponse.map(
        (organization) => organization.id,
    );
    const localizationRows =
        organizationIds.length === 0
            ? []
            : await db
                  .select({
                      organizationId:
                          organizationLocalizationTable.organizationId,
                      languageCode: organizationLocalizationTable.languageCode,
                      displayName: organizationLocalizationTable.displayName,
                      description: organizationLocalizationTable.description,
                      websiteUrl: organizationLocalizationTable.websiteUrl,
                      imagePath: organizationLocalizationTable.imagePath,
                      isFullImagePath:
                          organizationLocalizationTable.isFullImagePath,
                  })
                  .from(organizationLocalizationTable)
                  .where(
                      inArray(
                          organizationLocalizationTable.organizationId,
                          organizationIds,
                      ),
                  );

    const localizationsByOrganizationId = new Map<
        number,
        AdminOrganizationProperties["localizations"]
    >();
    for (const localization of localizationRows) {
        const localizations =
            localizationsByOrganizationId.get(localization.organizationId) ?? [];
        const websiteUrl = optionalUrl(localization.websiteUrl);
        const imagePath = optionalText(localization.imagePath);
        localizations.push({
            languageCode: localization.languageCode,
            displayName: localization.displayName,
            description: localization.description,
            ...(websiteUrl === undefined ? {} : { websiteUrl }),
            ...(imagePath === undefined ? {} : { imagePath }),
            isFullImagePath: localization.isFullImagePath,
        });
        localizationsByOrganizationId.set(
            localization.organizationId,
            localizations,
        );
    }

    const organizationList: AdminOrganizationProperties[] = [];
    for (const response of organizationTableResponse) {
        const defaultLanguageCode = response.defaultLanguageCode;
        if (defaultLanguageCode === null) {
            log.warn(
                { organizationSlug: response.slug },
                "[AdminOrganization] Skipping organization without default language",
            );
            continue;
        }

        organizationList.push({
            ...buildOrganizationProperties({
                name: response.name,
                slug: response.slug,
                description: response.description,
                imagePath: response.imagePath,
                isFullImagePath: response.isFullImagePath,
                websiteUrl: response.websiteUrl,
                baseImageServiceUrl,
            }),
            defaultLanguageCode,
            localizations: localizationsByOrganizationId.get(response.id) ?? [],
        });
    }

    return {
        organizationList: organizationList,
    };
}

export async function getOrganizationMembers({
    db,
    organizationName,
}: {
    db: PostgresJsDatabase;
    organizationName: string;
}): Promise<GetOrganizationMembersResponse> {
    const memberRows = await db
        .select({ username: userTable.username })
        .from(organizationMembershipTable)
        .innerJoin(
            organizationTable,
            eq(organizationTable.id, organizationMembershipTable.organizationId),
        )
        .innerJoin(userTable, eq(userTable.id, organizationMembershipTable.userId))
        .where(
            and(
                eq(organizationTable.slug, organizationName),
                eq(organizationTable.directoryVisibility, "listed"),
                isNull(organizationTable.deletedAt),
                eq(userTable.isDeleted, false),
            ),
        );

    return {
        memberList: memberRows,
    };
}

export async function updateOrganizationSlug({
    db,
    currentOrganizationSlug,
    newOrganizationSlug,
}: {
    db: PostgresJsDatabase;
    currentOrganizationSlug: string;
    newOrganizationSlug: string;
}): Promise<UpdateOrganizationSlugResponse> {
    if (currentOrganizationSlug === newOrganizationSlug) {
        return { success: true };
    }

    try {
        const updatedRows = await db
            .update(organizationTable)
            .set({ slug: newOrganizationSlug, updatedAt: new Date() })
            .where(
                and(
                    eq(organizationTable.slug, currentOrganizationSlug),
                    isNull(organizationTable.deletedAt),
                ),
            )
            .returning({ id: organizationTable.id });
        if (updatedRows.length === 0) {
            return { success: false, reason: "organization_not_found" };
        }

        return { success: true };
    } catch (error) {
        if (isUniqueViolation(error)) {
            return {
                success: false,
                reason: "organization_slug_already_exists",
            };
        }

        throw error;
    }
}

interface GetOrganizationsByUsernameProps {
    db: PostgresJsDatabase;
    username: string;
    baseImageServiceUrl: string;
}

interface GetOrganizationsByUserIdProps {
    db: PostgresJsDatabase;
    userId: string;
    baseImageServiceUrl: string;
}

interface GetOrganizationIdsByUserIdProps {
    db: PostgresJsDatabase;
    userId: string;
}

interface GetOrganizationMembershipsByUserIdProps {
    db: PostgresJsDatabase;
    userId: string;
    baseImageServiceUrl: string;
}

export interface OrganizationMembership {
    organizationId: number;
    organization: OrganizationProperties;
}

export async function getOrganizationsByUsername({
    db,
    username,
    baseImageServiceUrl,
}: GetOrganizationsByUsernameProps): Promise<GetOrganizationsByUsernameResponse> {
    const { getUserIdFromUsername } = useCommonUser();
    const targetUserId = await getUserIdFromUsername({
        db: db,
        username: username,
    });

    return await getOrganizationsByUserId({
        db,
        userId: targetUserId,
        baseImageServiceUrl,
    });
}

export async function getOrganizationsByUserId({
    db,
    userId,
    baseImageServiceUrl,
}: GetOrganizationsByUserIdProps): Promise<GetOrganizationsByUsernameResponse> {
    const memberships = await getOrganizationMembershipsByUserId({
        db,
        userId,
        baseImageServiceUrl,
    });

    return {
        organizationList: memberships.map(
            (membership) => membership.organization,
        ),
    };
}

export async function getOrganizationIdsByUserId({
    db,
    userId,
}: GetOrganizationIdsByUserIdProps): Promise<number[]> {
    const organizationTableResponse = await db
        .select({ organizationId: organizationMembershipTable.organizationId })
        .from(organizationMembershipTable)
        .innerJoin(
            organizationTable,
            eq(
                organizationTable.id,
                organizationMembershipTable.organizationId,
            ),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationTable.deletedAt),
            ),
        );

    return organizationTableResponse.map((response) => response.organizationId);
}

export async function getOrganizationMembershipsByUserId({
    db,
    userId,
    baseImageServiceUrl,
}: GetOrganizationMembershipsByUserIdProps): Promise<OrganizationMembership[]> {
    const organizationTableResponse = await db
        .select({
            organizationId: organizationTable.id,
            name: organizationTable.displayName,
            slug: organizationTable.slug,
            description: organizationTable.description,
            imagePath: organizationTable.imagePath,
            isFullImagePath: organizationTable.isFullImagePath,
            websiteUrl: organizationTable.websiteUrl,
        })
        .from(organizationMembershipTable)
        .innerJoin(
            organizationTable,
            eq(
                organizationTable.id,
                organizationMembershipTable.organizationId,
            ),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, userId),
                eq(organizationTable.directoryVisibility, "listed"),
                isNull(organizationTable.deletedAt),
            ),
        );

    return organizationTableResponse.map((response) => ({
        organizationId: response.organizationId,
        organization: buildOrganizationProperties({
            name: response.name,
            slug: response.slug,
            description: response.description,
            imagePath: response.imagePath,
            isFullImagePath: response.isFullImagePath,
            websiteUrl: response.websiteUrl,
            baseImageServiceUrl,
        }),
    }));
}

interface RemoveUserOrganizationMappingProps {
    db: PostgresJsDatabase;
    username: string;
    organizationName: string;
}

export async function removeUserOrganizationMapping({
    db,
    username,
    organizationName,
}: RemoveUserOrganizationMappingProps) {
    const { getUserIdFromUsername } = useCommonUser();
    const targetUserId = await getUserIdFromUsername({
        db: db,
        username: username,
    });

    const organizationId = await getListedOrganizationIdFromOrganizationSlug({
        db,
        organizationSlug: organizationName,
    });
    if (organizationId === undefined) {
        throw httpErrors.notFound("Organization not found");
    }

    const deletedMapping = await db
        .delete(organizationMembershipTable)
        .where(
            and(
                eq(organizationMembershipTable.userId, targetUserId),
                eq(organizationMembershipTable.organizationId, organizationId),
            ),
        )
        .returning();
    if (deletedMapping.length === 0) {
        throw httpErrors.notFound("Organization mapping does not exist");
    }
}

interface AddUserOrganizationMappingProps {
    db: PostgresJsDatabase;
    username: string;
    organizationName: string;
}

export async function addUserOrganizationMapping({
    db,
    username,
    organizationName,
}: AddUserOrganizationMappingProps) {
    const { getUserIdFromUsername } = useCommonUser();
    const targetUserId = await getUserIdFromUsername({
        db: db,
        username: username,
    });

    const organizationId = await getListedOrganizationIdFromOrganizationSlug({
        db,
        organizationSlug: organizationName,
    });

    if (organizationId === undefined) {
        throw httpErrors.notFound("Organization not found");
    }

    await ensureOrganizationMembershipBaselineCapabilities({
        db,
        userId: targetUserId,
        organizationId,
    });
}

interface CreateOrganizationProps {
    db: PostgresJsDatabase;
    organizationName: string;
    organizationSlug: string;
    defaultLanguageCode: SupportedDisplayLanguageCodes;
    imagePath: string | undefined;
    isFullImagePath: boolean;
    websiteUrl: string | undefined;
    description: string;
}

export async function createOrganization({
    db,
    organizationName,
    organizationSlug,
    defaultLanguageCode,
    imagePath,
    isFullImagePath,
    websiteUrl,
    description,
}: CreateOrganizationProps) {
    try {
        await db.transaction(async (tx) => {
            const normalizedImagePath =
                imagePath === undefined || imagePath.trim() === ""
                    ? null
                    : imagePath;
            const normalizedWebsiteUrl = websiteUrl ?? null;
            const insertedOrganizations = await tx
                .insert(organizationTable)
                .values({
                    slug: organizationSlug,
                    displayName: organizationName,
                    defaultLanguageCode,
                    directoryVisibility: "listed",
                    imagePath: normalizedImagePath,
                    isFullImagePath: isFullImagePath,
                    websiteUrl: normalizedWebsiteUrl,
                    description: description,
                })
                .returning({ organizationId: organizationTable.id });
            const insertedOrganization = insertedOrganizations.at(0);
            if (insertedOrganization === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to create organization",
                );
            }

            await tx.insert(organizationLocalizationTable).values({
                organizationId: insertedOrganization.organizationId,
                languageCode: defaultLanguageCode,
                displayName: organizationName,
                description,
                websiteUrl: normalizedWebsiteUrl,
                imagePath: normalizedImagePath,
                isFullImagePath,
            });
        });
    } catch (err: unknown) {
        if (isUniqueViolation(err)) {
            throw httpErrors.conflict("Organization slug already exists");
        }

        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while setting user organization profile",
        );
    }
}

export async function updateOrganizationLocalization({
    db,
    data,
}: {
    db: PostgresJsDatabase;
    data: UpdateOrganizationLocalizationRequest;
}): Promise<UpdateOrganizationLocalizationResponse> {
    const imagePath =
        data.imagePath === undefined || data.imagePath.trim() === ""
            ? null
            : data.imagePath;
    const websiteUrl = data.websiteUrl ?? null;

    await db.transaction(async (tx) => {
        const organizationRows = await tx
            .select({ organizationId: organizationTable.id })
            .from(organizationTable)
            .where(
                and(
                    eq(organizationTable.slug, data.organizationSlug),
                    isNull(organizationTable.deletedAt),
                ),
            )
            .limit(1);
        const organization = organizationRows.at(0);
        if (organization === undefined) {
            throw httpErrors.notFound("Organization not found");
        }

        await tx
            .insert(organizationLocalizationTable)
            .values({
                organizationId: organization.organizationId,
                languageCode: data.languageCode,
                displayName: data.displayName,
                description: data.description,
                websiteUrl,
                imagePath,
                isFullImagePath: data.isFullImagePath,
            })
            .onConflictDoUpdate({
                target: [
                    organizationLocalizationTable.organizationId,
                    organizationLocalizationTable.languageCode,
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
                .update(organizationTable)
                .set({
                    defaultLanguageCode: data.languageCode,
                    displayName: data.displayName,
                    description: data.description,
                    websiteUrl,
                    imagePath,
                    isFullImagePath: data.isFullImagePath,
                    updatedAt: new Date(),
                })
                .where(eq(organizationTable.id, organization.organizationId));
        }
    });

    return { success: true };
}

interface ArchiveOrganizationProps {
    db: PostgresJsDatabase;
    organizationName: string;
}

export async function archiveOrganization({
    db,
    organizationName,
}: ArchiveOrganizationProps) {
    try {
        const now = new Date();
        const updatedOrganizations = await db
            .update(organizationTable)
            .set({
                directoryVisibility: "unlisted",
                deletedAt: now,
                updatedAt: now,
            })
            .where(
                and(
                    eq(organizationTable.slug, organizationName),
                    isNull(organizationTable.deletedAt),
                ),
            )
            .returning({ organizationId: organizationTable.id });
        if (updatedOrganizations.length === 0) {
            throw httpErrors.notFound("Organization not found");
        }
    } catch (err: unknown) {
        if (hasHttpStatusCode(err)) {
            throw err;
        }

        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while archiving organization metadata",
        );
    }
}

async function getListedOrganizationIdFromOrganizationSlug({
    db,
    organizationSlug,
}: {
    db: PostgresJsDatabase;
    organizationSlug: string;
}): Promise<number | undefined> {
    const organizationTableResponse = await db
        .select({
            organizationId: organizationTable.id,
        })
        .from(organizationTable)
        .where(
            and(
                eq(organizationTable.slug, organizationSlug),
                eq(organizationTable.directoryVisibility, "listed"),
                isNull(organizationTable.deletedAt),
            ),
        )
        .limit(1);

    const organization = organizationTableResponse.at(0);
    if (organization === undefined) {
        return undefined;
    }

    return organization.organizationId;
}
