import { followedTopicTable, topicTable } from "@/shared-backend/schema.js";
import type {
    GetAllTopicsResponse,
    GetUserFollowedTopicCodesResponse,
} from "@/shared/types/dto.js";
import { httpErrors } from "@fastify/sensible";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ZodTopicObject } from "@/shared/types/zod.js";
import { and, eq } from "drizzle-orm";

interface MapTopicCodeToIdProps {
    db: PostgresJsDatabase;
    topicCode: string;
}

export async function mapTopicCodeToId({
    db,
    topicCode,
}: MapTopicCodeToIdProps) {
    const topicTableResponse = await db
        .select({
            id: topicTable.id,
        })
        .from(topicTable)
        .where(eq(topicTable.code, topicCode));
    if (topicTableResponse.length == 1) {
        return topicTableResponse[0].id;
    } else {
        throw httpErrors.notFound("Failed to locate topic code: " + topicCode);
    }
}

interface GetAllTopicsProps {
    db: PostgresJsDatabase;
}

export async function getAllTopics({
    db,
}: GetAllTopicsProps): Promise<GetAllTopicsResponse> {
    const topicTableResponse = await db
        .select({
            name: topicTable.name,
            code: topicTable.code,
        })
        .from(topicTable);

    const topicList: ZodTopicObject[] = [];
    topicTableResponse.forEach((topicObject) => {
        topicList.push({
            code: topicObject.code,
            name: topicObject.name,
        });
    });

    return {
        topicList: topicList,
    };
}

interface GetTopicIdFromTopicCodeProps {
    db: PostgresJsDatabase;
    topicCode: string;
}

async function getTopicIdFromTopicCode({
    db,
    topicCode,
}: GetTopicIdFromTopicCodeProps): Promise<number> {
    const topicTableResponse = await db
        .select({
            id: topicTable.id,
        })
        .from(topicTable)
        .where(eq(topicTable.code, topicCode));
    if (topicTableResponse.length == 1) {
        return topicTableResponse[0].id;
    } else {
        throw httpErrors.internalServerError(
            "Failed to locate topic code: " + topicCode,
        );
    }
}

interface UserFollowTopicByCodeProps {
    db: PostgresJsDatabase;
    topicCode: string;
    userId: string;
}

export async function userFollowTopicByCode({
    db,
    topicCode,
    userId,
}: UserFollowTopicByCodeProps) {
    const topicId = await getTopicIdFromTopicCode({
        db: db,
        topicCode: topicCode,
    });

    await db.insert(followedTopicTable).values({
        topicId: topicId,
        userId: userId,
    });
}

interface UserUnfollowTopicByCodeProps {
    db: PostgresJsDatabase;
    topicCode: string;
    userId: string;
}

export async function userUnfollowTopicByCode({
    db,
    topicCode,
    userId,
}: UserUnfollowTopicByCodeProps) {
    const topicId = await getTopicIdFromTopicCode({
        db: db,
        topicCode: topicCode,
    });

    const deletedTopicFollow = await db
        .delete(followedTopicTable)
        .where(
            and(
                eq(followedTopicTable.topicId, topicId),
                eq(followedTopicTable.userId, userId),
            ),
        )
        .returning();

    if (deletedTopicFollow.length != 1) {
        throw httpErrors.internalServerError(
            "Failed to unfollow topic: " + topicCode,
        );
    }
}

interface GetUserFollowedTopicsProps {
    db: PostgresJsDatabase;
    userId: string;
}

export async function getUserFollowedTopics({
    db,
    userId,
}: GetUserFollowedTopicsProps): Promise<GetUserFollowedTopicCodesResponse> {
    const followedTopicTableResponse = await db
        .select({
            code: topicTable.code,
        })
        .from(followedTopicTable)
        .innerJoin(topicTable, eq(topicTable.id, followedTopicTable.topicId))
        .where(eq(followedTopicTable.userId, userId));

    const topicCodeList: string[] = [];

    followedTopicTableResponse.forEach((followedTopic) => {
        topicCodeList.push(followedTopic.code);
    });

    return {
        followedTopicCodeList: topicCodeList,
    };
}
