import { log } from "@/app.js";
import type { AxiosInstance } from "axios";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { polisClusterUserTable } from "@/shared-backend/schema.js";
import { and, eq } from "drizzle-orm";
import {
    type ImportPolisResults,
    zodImportPolisResults,
} from "@/shared/types/polis.js";
import { extractPolisIdFromUrl } from "@/shared/utils/polis.js";
import { httpErrors } from "@fastify/sensible";

interface GetClusterIdByUserAndConvProps {
    db: PostgresJsDatabase;
    userId: string;
    polisContentId: number;
}

export async function getClusterIdByUserAndConv({
    db,
    userId,
    polisContentId,
}: GetClusterIdByUserAndConvProps): Promise<number | undefined> {
    const results = await db
        .select({ polisClusterId: polisClusterUserTable.polisClusterId })
        .from(polisClusterUserTable)
        .where(
            and(
                eq(polisClusterUserTable.polisContentId, polisContentId),
                eq(polisClusterUserTable.userId, userId),
            ),
        );
    let polisClusterId;
    switch (results.length) {
        case 0:
            polisClusterId = undefined;
            break;
        case 1:
            polisClusterId = results[0].polisClusterId;
            break;
        default:
            polisClusterId = results[0].polisClusterId;
            log.warn(
                `[Math] User ${userId} in conversation polisContentId ${String(
                    polisContentId,
                )} belongs to ${String(
                    results.length,
                )} clusters instead of 0 or 1!`,
            );
            break;
    }
    return polisClusterId;
}

interface ImportExternalPolisConversationReturn {
    importedPolisConversation: ImportPolisResults;
    polisUrlType: "report" | "conversation";
}

export async function importExternalPolisConversation({
    polisUrl,
    axiosPolis,
}: {
    polisUrl: string;
    axiosPolis: AxiosInstance;
}): Promise<ImportExternalPolisConversationReturn> {
    const { conversationId, reportId } = extractPolisIdFromUrl(polisUrl); // can throw
    if (conversationId === undefined && reportId === undefined) {
        throw httpErrors.badRequest("Incorrect url");
    }
    // python code will prioritize reportId if both are not undefined
    const queryParam = { report_id: reportId, conversation_id: conversationId };

    const importPath = `/import`;
    const response = await axiosPolis.get(importPath, {
        params: queryParam,
    });
    try {
        return {
            importedPolisConversation: zodImportPolisResults.parse(
                response.data,
            ),
            polisUrlType: reportId !== undefined ? "report" : "conversation",
        };
    } catch (e) {
        log.info(
            `[Import] Polis Data received:\n${JSON.stringify(response.data, null, 2)}`,
        );
        throw e;
    }
}
