import { userMutePreferenceTable, userTable } from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonUser } from "./common.js";
import { and, eq } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import type { FetchUserMutePreferencesResponse } from "@/shared/types/dto.js";
import type { UserMuteAction } from "@/shared/types/zod.js";

interface GetUserMutePreferencesProps {
    db: PostgresJsDatabase;
    userId: string;
}

export async function getUserMutePreferences({
    db,
    userId,
}: GetUserMutePreferencesProps): Promise<FetchUserMutePreferencesResponse> {
    const userMutePreferenceTableResponse = await db
        .select({
            username: userTable.username,
            createdAt: userTable.createdAt,
        })
        .from(userMutePreferenceTable)
        .innerJoin(
            userTable,
            eq(userTable.id, userMutePreferenceTable.sourceUserId),
        )
        .where(eq(userMutePreferenceTable.sourceUserId, userId));

    const userMuteItemList: FetchUserMutePreferencesResponse = [];
    userMutePreferenceTableResponse.forEach((userMuteItem) => {
        userMuteItemList.push({
            username: userMuteItem.username,
            createdAt: userMuteItem.createdAt,
        });
    });

    return userMuteItemList;
}

interface MuteUserProps {
    sourceUserId: string;
    targetUsername: string;
    muteAction: UserMuteAction;
    db: PostgresJsDatabase;
}

export async function muteUserByUsername({
    sourceUserId,
    targetUsername,
    db,
    muteAction,
}: MuteUserProps) {
    const { getUserIdFromUsername } = useCommonUser();
    const targetUserId = await getUserIdFromUsername({
        db: db,
        username: targetUsername,
    });

    const initialCheckResponse = await db
        .select({})
        .from(userMutePreferenceTable)
        .where(
            and(
                eq(userMutePreferenceTable.sourceUserId, sourceUserId),
                eq(userMutePreferenceTable.targetUserId, targetUserId),
            ),
        );

    try {
        if (muteAction == "mute") {
            if (initialCheckResponse.length == 1) {
                // entry already exists
            } else {
                await db.insert(userMutePreferenceTable).values({
                    sourceUserId: sourceUserId,
                    targetUserId: targetUserId,
                });
            }
        } else {
            if (initialCheckResponse.length == 1) {
                await db
                    .delete(userMutePreferenceTable)
                    .where(
                        and(
                            eq(
                                userMutePreferenceTable.sourceUserId,
                                sourceUserId,
                            ),
                            eq(
                                userMutePreferenceTable.targetUserId,
                                targetUserId,
                            ),
                        ),
                    )
                    .returning();
            } else {
                // already deleted
            }
        }
    } catch (error) {
        log.error(error);
        throw httpErrors.internalServerError(
            "Failed to perform mute user action",
        );
    }
}
