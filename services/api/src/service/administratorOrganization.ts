import {
    organizationMetadataTable,
    userOrganizationMappingTable,
} from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import { useCommonUser } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";

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
                            userOrganizationMappingTable.organizationMetadataId,
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
                organizationMetadataId: organizationId,
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
        await db.insert(organizationMetadataTable).values({
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
            .delete(organizationMetadataTable)
            .where(eq(organizationMetadataTable.name, organizationName));
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
        const organizationMetadataTableResponse = await db
            .select({
                organizationId: organizationMetadataTable.id,
            })
            .from(organizationMetadataTable)
            .where(eq(organizationMetadataTable.name, organizationName));

        if (organizationMetadataTableResponse.length != 1) {
            return undefined;
        } else {
            return organizationMetadataTableResponse[0].organizationId;
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while retrieving organization ID from organization name",
        );
    }
}
