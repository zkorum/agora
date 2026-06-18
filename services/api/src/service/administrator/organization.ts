import {
    organizationMembershipTable,
    organizationTable,
} from "@/shared-backend/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import { useCommonUser } from "../common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import type {
    GetAllOrganizationsResponse,
    GetOrganizationsByUsernameResponse,
} from "@/shared/types/dto.js";
import type { OrganizationProperties } from "@/shared/types/zod.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";

function buildOrganizationProperties({
    name,
    description,
    imagePath,
    isFullImagePath,
    websiteUrl,
    baseImageServiceUrl,
}: {
    name: string;
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
        description: description ?? "",
        ...(imageUrl === undefined ? {} : { imageUrl }),
        ...(websiteUrl === null ? {} : { websiteUrl }),
    };
}

function slugifyOrganizationName(name: string): string {
    const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 65);
    return slug === "" ? "organization" : slug;
}

interface GetAllOrganizationsProps {
    db: PostgresJsDatabase;
    baseImageServiceUrl: string;
}

export async function getAllOrganizations({
    db,
    baseImageServiceUrl,
}: GetAllOrganizationsProps): Promise<GetAllOrganizationsResponse> {
    const organizationList: OrganizationProperties[] = [];

    const organizationTableResponse = await db
        .select({
            name: organizationTable.displayName,
            description: organizationTable.description,
            imagePath: organizationTable.imagePath,
            isFullImagePath: organizationTable.isFullImagePath,
            websiteUrl: organizationTable.websiteUrl,
        })
        .from(organizationTable);
    organizationTableResponse.forEach((response) => {
        if (response.name) {
            organizationList.push(buildOrganizationProperties({
                name: response.name,
                description: response.description,
                imagePath: response.imagePath,
                isFullImagePath: response.isFullImagePath,
                websiteUrl: response.websiteUrl,
                baseImageServiceUrl,
            }));
        }
    });

    return {
        organizationList: organizationList,
    };
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
        .where(eq(organizationMembershipTable.userId, userId));

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
        .where(eq(organizationMembershipTable.userId, userId));

    return organizationTableResponse.map((response) => ({
        organizationId: response.organizationId,
        organization: buildOrganizationProperties({
            name: response.name,
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

    try {
        const organizationId = await getOrganizationIdFromOrganizationName(
            db,
            organizationName,
        );
        if (organizationId == undefined) {
            throw httpErrors.notFound("Failed to locate organization ID");
        } else {
            const deletedMapping = await db
                .delete(organizationMembershipTable)
                .where(
                    and(
                        eq(organizationMembershipTable.userId, targetUserId),
                        eq(
                            organizationMembershipTable.organizationId,
                            organizationId,
                        ),
                    ),
                )
                .returning();
            if (deletedMapping.length == 0) {
                throw httpErrors.internalServerError(
                    "Organization mapping does not exist",
                );
            }
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while removing user organization mapping",
        );
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

    try {
        const organizationId = await getOrganizationIdFromOrganizationName(
            db,
            organizationName,
        );

        if (organizationId == undefined) {
            throw httpErrors.notFound("Failed to locate organization ID");
        } else {
            await db.insert(organizationMembershipTable).values({
                userId: targetUserId,
                organizationId: organizationId,
            });
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while adding user organization mapping",
        );
    }
}

interface CreateOrganizationProps {
    db: PostgresJsDatabase;
    organizationName: string;
    imagePath: string | undefined;
    isFullImagePath: boolean;
    websiteUrl: string | undefined;
    description: string;
}

export async function createOrganization({
    db,
    organizationName,
    imagePath,
    isFullImagePath,
    websiteUrl,
    description,
}: CreateOrganizationProps) {
    try {
        // Create a new organization entry
        await db.insert(organizationTable).values({
            slug: slugifyOrganizationName(organizationName),
            displayName: organizationName,
            directoryVisibility: "listed",
            imagePath:
                imagePath === undefined || imagePath.trim() === ""
                    ? null
                    : imagePath,
            isFullImagePath: isFullImagePath,
            websiteUrl: websiteUrl ?? null,
            description: description,
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while setting user organization profile",
        );
    }
}

interface deleteOrganizationProps {
    db: PostgresJsDatabase;
    organizationName: string;
}

export async function deleteOrganization({
    db,
    organizationName,
}: deleteOrganizationProps) {
    try {
        await db
            .delete(organizationTable)
            .where(eq(organizationTable.slug, organizationName));
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while deleting organization metadata",
        );
    }
}

async function getOrganizationIdFromOrganizationName(
    db: PostgresJsDatabase,
    organizationName: string,
): Promise<number | undefined> {
    try {
        // Find out the organization ID
        const organizationTableResponse = await db
            .select({
                organizationId: organizationTable.id,
            })
            .from(organizationTable)
            .where(eq(organizationTable.slug, organizationName));

        if (organizationTableResponse.length != 1) {
            return undefined;
        } else {
            return organizationTableResponse[0].organizationId;
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while retrieving organization ID from organization name",
        );
    }
}
