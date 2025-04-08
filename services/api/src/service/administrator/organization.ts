import { organizationTable, userOrganizationMappingTable } from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import { useCommonUser } from "../common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import type {
    GetAllOrganizationsResponse,
    GetOrganizationNamesByUserIdResponse,
} from "@/shared/types/dto.js";
import type { OrganizationProperties } from "@/shared/types/zod.js";

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
            name: organizationTable.name,
            description: organizationTable.description,
            imagePath: organizationTable.imagePath,
            isFullImagePath: organizationTable.isFullImagePath,
            websiteUrl: organizationTable.websiteUrl,
        })
        .from(userOrganizationMappingTable)
        .leftJoin(
            organizationTable,
            eq(
                organizationTable.id,
                userOrganizationMappingTable.organizationId,
            ),
        );
    organizationTableResponse.forEach((response) => {
        if (response.name) {
            organizationList.push({
                name: response.name,
                description: response.description ?? "",
                imageUrl:
                    response.isFullImagePath && response.imagePath
                        ? response.imagePath
                        : `${baseImageServiceUrl}${response.imagePath ?? ""}`,
                websiteUrl: response.websiteUrl ?? "",
            });
        }
    });

    return {
        organizationList: organizationList,
    };
}

interface GetOrganizationNamesByUserIdProps {
    db: PostgresJsDatabase;
    username: string;
}

export async function getOrganizationNamesByUserId({
    db,
    username,
}: GetOrganizationNamesByUserIdProps): Promise<GetOrganizationNamesByUserIdResponse> {
    const { getUserIdFromUsername } = useCommonUser();
    const targetUserId = await getUserIdFromUsername({
        db: db,
        username: username,
    });

    const organizationNameList: string[] = [];
    const organizationTableResponse = await db
        .select({
            name: organizationTable.name,
        })
        .from(userOrganizationMappingTable)
        .leftJoin(
            organizationTable,
            eq(
                organizationTable.id,
                userOrganizationMappingTable.organizationId,
            ),
        )
        .where(eq(userOrganizationMappingTable.userId, targetUserId));
    organizationTableResponse.forEach((response) => {
        if (response.name) {
            organizationNameList.push(response.name);
        }
    });

    return {
        organizationNameList: organizationNameList,
    };
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
                .delete(userOrganizationMappingTable)
                .where(
                    and(
                        eq(userOrganizationMappingTable.userId, targetUserId),
                        eq(
                            userOrganizationMappingTable.organizationId,
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
            await db.insert(userOrganizationMappingTable).values({
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

interface CreateOrganizationMetadataProps {
    db: PostgresJsDatabase;
    organizationName: string;
    imagePath: string;
    isFullImagePath: boolean;
    websiteUrl: string;
    description: string;
}

export async function createOrganizationMetadata({
    db,
    organizationName,
    imagePath,
    isFullImagePath,
    websiteUrl,
    description,
}: CreateOrganizationMetadataProps) {
    try {
        // Create a new organization entry
        await db.insert(organizationTable).values({
            name: organizationName,
            imagePath: imagePath,
            isFullImagePath: isFullImagePath,
            websiteUrl: websiteUrl,
            description: description,
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while setting user organization profile",
        );
    }
}

interface DeleteOrganizationMetadataProps {
    db: PostgresJsDatabase;
    organizationName: string;
}

export async function deleteOrganizationMetadata({
    db,
    organizationName,
}: DeleteOrganizationMetadataProps) {
    try {
        // Create a new organization entry
        await db
            .delete(organizationTable)
            .where(eq(organizationTable.name, organizationName));
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
            .where(eq(organizationTable.name, organizationName));

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
