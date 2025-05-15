import { topicTable } from "@/schema.js";
import type { GetAllTopicsResponse } from "@/shared/types/dto.js";
import { httpErrors } from "@fastify/sensible";
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
