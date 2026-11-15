import {
    organizationLocalizationTable,
    organizationMembershipTable,
    organizationTable,
    projectOrganizationOwnershipTable,
    projectOrganizationAttributionTable,
    projectContactTable,
    userTable,
} from "@/shared-backend/schema.js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { useCommonUser } from "../common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import type {
    AdminOrganizationOption,
    AdminOrganizationProperties,
    GetAllOrganizationsResponse,
    GetOrganizationDetailsResponse,
    GetOrganizationOptionsResponse,
    GetOrganizationMembersResponse,
    GetOrganizationsByUsernameResponse,
    UpdateOrganizationSlugResponse,
    UpdateOrganizationLocalizationRequest,
    UpdateOrganizationLocalizationResponse,
} from "@/shared/types/dto.js";
import type { OrganizationProperties } from "@/shared/types/zod.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";
import { optionalHttpsUrl } from "@/utils/url.js";
import { setOrganizationMembershipRole } from "../projectAccess.js";
import type { OrganizationRole } from "@/shared/organizationAccess.js";
import { getOrganizationIdsWithActiveDynamicTranslationEntitlement } from "../premiumEntitlement.js";
import {
    withProjectOwnershipTransaction,
    type ProjectOwnershipDatabase,
} from "../projectOwnership.js";

// Keep unlisted personal organizations after listed organizations in admin pickers.
const adminOrganizationOrder = [
    asc(eq(organizationTable.directoryVisibility, "unlisted")),
    asc(organizationTable.displayName),
    asc(organizationTable.slug),
];

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
    const validWebsiteUrl = optionalHttpsUrl(websiteUrl);

    return {
        name,
        slug,
        description: description ?? "",
        ...(imageUrl === undefined ? {} : { imageUrl }),
        ...(validWebsiteUrl === undefined
            ? {}
            : { websiteUrl: validWebsiteUrl }),
    };
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

interface GetAllOrganizationsProps {
    db: PostgresJsDatabase;
    baseImageServiceUrl: string;
    organizationSlug?: string;
    organizationIds?: readonly number[];
}

export async function getAllOrganizations({
    db,
    baseImageServiceUrl,
    organizationSlug,
    organizationIds: allowedOrganizationIds,
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
                isNull(organizationTable.deletedAt),
                allowedOrganizationIds === undefined
                    ? undefined
                    : inArray(organizationTable.id, [
                          ...allowedOrganizationIds,
                      ]),
                organizationSlug === undefined
                    ? undefined
                    : eq(organizationTable.slug, organizationSlug),
            ),
        )
        .orderBy(...adminOrganizationOrder);

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

    const dynamicTranslationOrganizationIds =
        await getOrganizationIdsWithActiveDynamicTranslationEntitlement({
            db,
            organizationIds,
            now: new Date(),
        });

    const localizationsByOrganizationId = new Map<
        number,
        AdminOrganizationProperties["localizations"]
    >();
    for (const localization of localizationRows) {
        const localizations =
            localizationsByOrganizationId.get(localization.organizationId) ??
            [];
        const websiteUrl = optionalHttpsUrl(localization.websiteUrl);
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
            defaultLanguageCode: response.defaultLanguageCode,
            localizations: localizationsByOrganizationId.get(response.id) ?? [],
            canUseDynamicTranslation: dynamicTranslationOrganizationIds.has(
                response.id,
            ),
        });
    }

    return {
        organizationList: organizationList,
    };
}

export async function getOrganizationDetails({
    db,
    baseImageServiceUrl,
    organizationSlug,
}: {
    db: PostgresJsDatabase;
    baseImageServiceUrl: string;
    organizationSlug: string;
}): Promise<Omit<GetOrganizationDetailsResponse, "permissions">> {
    const response = await getAllOrganizations({
        db,
        baseImageServiceUrl,
        organizationSlug,
    });
    return { organization: response.organizationList.at(0) };
}

export async function getOrganizationOptions({
    db,
    organizationIds: allowedOrganizationIds,
}: {
    db: PostgresJsDatabase;
    organizationIds?: readonly number[];
}): Promise<GetOrganizationOptionsResponse> {
    const organizationRows = await db
        .select({
            id: organizationTable.id,
            name: organizationTable.displayName,
            slug: organizationTable.slug,
        })
        .from(organizationTable)
        .where(
            and(
                isNull(organizationTable.deletedAt),
                allowedOrganizationIds === undefined
                    ? undefined
                    : inArray(organizationTable.id, [
                          ...allowedOrganizationIds,
                      ]),
            ),
        )
        .orderBy(...adminOrganizationOrder);

    const organizationIds = organizationRows.map(
        (organization) => organization.id,
    );
    const dynamicTranslationOrganizationIds =
        await getOrganizationIdsWithActiveDynamicTranslationEntitlement({
            db,
            organizationIds,
            now: new Date(),
        });

    const organizationList: AdminOrganizationOption[] = organizationRows.map(
        (organization) => ({
            name: organization.name,
            slug: organization.slug,
            canUseDynamicTranslation: dynamicTranslationOrganizationIds.has(
                organization.id,
            ),
        }),
    );

    return { organizationList };
}

export async function getOrganizationMembers({
    db,
    organizationName,
}: {
    db: PostgresJsDatabase;
    organizationName: string;
}): Promise<GetOrganizationMembersResponse> {
    const memberRows = await getPrimaryDatabase(db)
        .select({
            username: userTable.username,
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
            eq(userTable.id, organizationMembershipTable.userId),
        )
        .where(
            and(
                eq(organizationTable.slug, organizationName),
                isNull(organizationMembershipTable.deletedAt),
                isNull(organizationTable.deletedAt),
                eq(userTable.isDeleted, false),
            ),
        )
        .orderBy(asc(userTable.username));

    return {
        memberList: memberRows.map((member) => ({
            username: member.username,
            role: member.role,
        })),
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
                isNull(organizationMembershipTable.deletedAt),
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
                isNull(organizationMembershipTable.deletedAt),
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
}: RemoveUserOrganizationMappingProps): Promise<void> {
    const primaryDb = getPrimaryDatabase(db);
    await primaryDb.transaction(async (transaction) => {
        const targetUserId = await lockMembershipAccount({
            db: transaction,
            username,
        });
        const organizationId = await lockActiveOrganizationId({
            db: transaction,
            organizationSlug: organizationName,
        });
        const membership = (
            await transaction
                .select({ id: organizationMembershipTable.id })
                .from(organizationMembershipTable)
                .where(
                    and(
                        eq(organizationMembershipTable.userId, targetUserId),
                        eq(
                            organizationMembershipTable.organizationId,
                            organizationId,
                        ),
                        isNull(organizationMembershipTable.deletedAt),
                    ),
                )
                .limit(1)
                .for("update")
        ).at(0);
        if (membership === undefined) {
            throw httpErrors.notFound("Organization mapping does not exist");
        }

        const now = new Date();
        await transaction
            .update(organizationMembershipTable)
            .set({ deletedAt: now, updatedAt: now })
            .where(eq(organizationMembershipTable.id, membership.id));
    });
}

interface AddUserOrganizationMappingProps {
    db: PostgresJsDatabase;
    username: string;
    organizationName: string;
    role: OrganizationRole;
}

export async function addUserOrganizationMapping({
    db,
    username,
    organizationName,
    role,
}: AddUserOrganizationMappingProps): Promise<void> {
    const primaryDb = getPrimaryDatabase(db);
    await primaryDb.transaction(async (transaction) => {
        const targetUserId = await lockMembershipAccount({
            db: transaction,
            username,
        });
        const organizationId = await lockActiveOrganizationId({
            db: transaction,
            organizationSlug: organizationName,
        });
        await setOrganizationMembershipRole({
            db: transaction,
            userId: targetUserId,
            organizationId,
            role,
        });
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
    adminUserId: string;
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
    adminUserId,
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
            await tx.insert(organizationMembershipTable).values({
                organizationId: insertedOrganization.organizationId,
                userId: adminUserId,
                role: "admin",
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

interface DeleteOrganizationProps {
    db: ProjectOwnershipDatabase;
    organizationName: string;
}

export async function deleteOrganization({
    db,
    organizationName,
}: DeleteOrganizationProps): Promise<void> {
    await withProjectOwnershipTransaction({
        db,
        operation: async (tx) => {
            // Membership fences write accounts before organizations. Lock those
            // parents before deletion takes the organization/project locks too.
            await tx
                .select({ id: userTable.id })
                .from(userTable)
                .innerJoin(
                    organizationMembershipTable,
                    eq(organizationMembershipTable.userId, userTable.id),
                )
                .innerJoin(
                    organizationTable,
                    eq(
                        organizationTable.id,
                        organizationMembershipTable.organizationId,
                    ),
                )
                .where(
                    and(
                        eq(organizationTable.slug, organizationName),
                        isNull(organizationTable.deletedAt),
                        isNull(organizationMembershipTable.deletedAt),
                    ),
                )
                .orderBy(userTable.id)
                .for("update", { of: userTable });
            const organization = (
                await tx
                    .select({ id: organizationTable.id })
                    .from(organizationTable)
                    .where(
                        and(
                            eq(organizationTable.slug, organizationName),
                            isNull(organizationTable.deletedAt),
                        ),
                    )
                    .for("update")
            ).at(0);
            if (organization === undefined)
                throw httpErrors.notFound("Organization not found");

            const now = new Date();
            await tx
                .update(organizationTable)
                .set({
                    directoryVisibility: "unlisted",
                    deletedAt: now,
                    updatedAt: now,
                })
                .where(
                    and(
                        eq(organizationTable.id, organization.id),
                        isNull(organizationTable.deletedAt),
                    ),
                );
            await tx
                .update(projectOrganizationOwnershipTable)
                .set({ deletedAt: now })
                .where(
                    and(
                        eq(
                            projectOrganizationOwnershipTable.organizationId,
                            organization.id,
                        ),
                        isNull(projectOrganizationOwnershipTable.deletedAt),
                    ),
                );
            await tx
                .update(projectOrganizationAttributionTable)
                .set({ deletedAt: now })
                .where(
                    and(
                        eq(
                            projectOrganizationAttributionTable.organizationId,
                            organization.id,
                        ),
                        isNull(projectOrganizationAttributionTable.deletedAt),
                    ),
                );
            await tx
                .update(projectContactTable)
                .set({ organizationId: null, updatedAt: now })
                .where(eq(projectContactTable.organizationId, organization.id));
            await tx
                .update(organizationMembershipTable)
                .set({ deletedAt: now, updatedAt: now })
                .where(
                    and(
                        eq(
                            organizationMembershipTable.organizationId,
                            organization.id,
                        ),
                        isNull(organizationMembershipTable.deletedAt),
                    ),
                );
        },
    });
}

async function lockActiveOrganizationId({
    db,
    organizationSlug,
}: {
    db: PostgresTransaction;
    organizationSlug: string;
}): Promise<number> {
    const organizationTableResponse = await db
        .select({
            organizationId: organizationTable.id,
        })
        .from(organizationTable)
        .where(
            and(
                eq(organizationTable.slug, organizationSlug),
                isNull(organizationTable.deletedAt),
            ),
        )
        .limit(1)
        // The membership fence writes this parent. Take its final lock mode now
        // rather than upgrading concurrent SHARE locks inside the trigger.
        .for("update");

    const organization = organizationTableResponse.at(0);
    if (organization === undefined) {
        throw httpErrors.notFound("Organization not found");
    }

    return organization.organizationId;
}

async function lockMembershipAccount({
    db,
    username,
}: {
    db: PostgresTransaction;
    username: string;
}): Promise<string> {
    const user = (
        await db
            .select({ id: userTable.id })
            .from(userTable)
            .where(eq(userTable.username, username))
            .for("update")
    ).at(0);
    if (user === undefined) throw httpErrors.notFound("User not found");
    return user.id;
}
