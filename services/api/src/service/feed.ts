import { postTable } from "@/schema.js";
import type { ExtendedPost } from "@/shared/types/zod.js";
import { and, eq, lt, SQL } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import type { FetchFeedResponse } from "@/shared/types/dto.js";

interface GetPostSlugIdLastCreatedAtProps {
    lastSlugId: string | undefined;
    db: PostgresDatabase;
}

export async function getPostSlugIdLastCreatedAt({
    lastSlugId,
    db,
}: GetPostSlugIdLastCreatedAtProps) {
    let lastCreatedAt = new Date();

    if (lastSlugId) {
        const selectResponse = await db
            .select({ createdAt: postTable.createdAt })
            .from(postTable)
            .where(eq(postTable.slugId, lastSlugId));
        if (selectResponse.length == 1) {
            lastCreatedAt = selectResponse[0].createdAt;
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCreatedAt;
}

interface FetchFeedProps {
    db: PostgresDatabase;
    lastSlugId: string | undefined;
    limit?: number;
    personalizationUserId?: string;
}

export async function fetchFeed({
    db,
    lastSlugId,
    limit,
    personalizationUserId,
}: FetchFeedProps): Promise<FetchFeedResponse> {
    const defaultLimit = 10;
    const targetLimit = limit ?? defaultLimit;

    const lastCreatedAt = await getPostSlugIdLastCreatedAt({
        lastSlugId: lastSlugId,
        db: db,
    });

    let whereClause: SQL | undefined = undefined;
    if (lastSlugId) {
        whereClause = and(whereClause, lt(postTable.createdAt, lastCreatedAt));
    }

    const { fetchPostItems } = useCommonPost();

    const posts: ExtendedPost[] = await fetchPostItems({
        db: db,
        limit: targetLimit + 1,
        where: whereClause,
        enableCompactBody: true,
        personalizationUserId: personalizationUserId,
        excludeLockedPosts: true,
        removeMutedAuthors: true,
    });

    let reachedEndOfFeed = true;
    if (posts.length == targetLimit + 1) {
        posts.pop();
        reachedEndOfFeed = false;
    }

    return {
        postDataList: posts,
        reachedEndOfFeed: reachedEndOfFeed,
    };
}
