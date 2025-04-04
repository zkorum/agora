import { organisationTable, userTable } from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { useCommonUser } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";

interface DeleteUserOrganizationProps {
    db: PostgresJsDatabase;
    username: string;
}

export async function deleteUserOrganization({
    db,
    username,
}: DeleteUserOrganizationProps) {
    const { getUserIdFromUsername } = useCommonUser();
    const targetUserId = await getUserIdFromUsername({
        db: db,
        username: username,
    });

    try {
        const userTableResponse = await db
            .select({
                organisationId: userTable.organisationId,
            })
            .from(userTable)
            .where(eq(userTable.id, targetUserId));

        if (userTableResponse.length == 0) {
            throw httpErrors.notFound("Failed to locate user profile");
        } else {
            await db.transaction(async (tx) => {
                if (userTableResponse[0].organisationId != null) {
                    // Update the user table
                    await tx
                        .update(userTable)
                        .set({
                            organisationId: null,
                        })
                        .where(eq(userTable.id, targetUserId));

                    // Delete the organization entry
                    await tx
                        .delete(organisationTable)
                        .where(
                            eq(
                                organisationTable.id,
                                userTableResponse[0].organisationId,
                            ),
                        );
                } else {
                    tx.rollback();
                }
            });
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while removing user organization profile",
        );
    }
}

interface SetUserOrganizationProps {
    db: PostgresJsDatabase;
    username: string;
    organizationName: string;
    imageName: string;
    websiteUrl: string;
    description: string;
}

export async function setUserOrganization({
    db,
    username,
    organizationName,
    imageName,
    websiteUrl,
    description,
}: SetUserOrganizationProps) {
    const { getUserIdFromUsername } = useCommonUser();
    const targetUserId = await getUserIdFromUsername({
        db: db,
        username: username,
    });

    try {
        const userTableResponse = await db
            .select({
                organisationId: userTable.organisationId,
            })
            .from(userTable)
            .where(eq(userTable.id, targetUserId));

        if (userTableResponse.length == 0) {
            throw httpErrors.notFound("Failed to locate user profile");
        } else {
            await db.transaction(async (tx) => {
                if (userTableResponse[0].organisationId == null) {
                    // Create a new organization entryt
                    const organisationTableResponse = await tx
                        .insert(organisationTable)
                        .values({
                            name: organizationName,
                            imageName: imageName,
                            websiteUrl: websiteUrl,
                            description: description,
                        })
                        .returning({ organizationId: organisationTable.id });
                    if (organisationTableResponse.length == 1) {
                        // Update the user table
                        await tx
                            .update(userTable)
                            .set({
                                organisationId:
                                    organisationTableResponse[0].organizationId,
                            })
                            .where(eq(userTable.id, targetUserId));
                    } else {
                        tx.rollback();
                    }
                } else {
                    // Update the existing organization entry
                    await tx.update(organisationTable).set({
                        name: organizationName,
                        imageName: imageName,
                        websiteUrl: websiteUrl,
                        description: description,
                    });
                }
            });
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while setting user organization profile",
        );
    }
}
