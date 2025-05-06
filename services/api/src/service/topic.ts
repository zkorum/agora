import { topicTable } from "@/schema.js";
import type { GetAllTopicsResponse } from "@/shared/types/dto.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ZodTopicObject } from "@/shared/types/zod.js";
import { eq } from "drizzle-orm";

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
    try {
        const topicTableResponse = await db
            .select({
                name: topicTable.name,
                code: topicTable.code,
                description: topicTable.description,
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
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while fetching all topics",
        );
    }
}
