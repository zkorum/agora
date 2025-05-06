import { topicTable } from "@/schema.js";
import type { GetAllTopicsResponse } from "@/shared/types/dto.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ZodTopicObject } from "@/shared/types/zod.js";

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
