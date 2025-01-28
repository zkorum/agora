import type {
    SlugId,
    UserReportExplanation,
    UserReportItem,
    UserReportReason,
} from "@/shared/types/zod.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonComment, useCommonPost } from "./common.js";
import {
    opinionTable,
    conversationTable,
    opinionReportTable,
    conversationReportTable,
    userTable,
} from "@/schema.js";
import { desc, eq } from "drizzle-orm";
import type { FetchUserReportsByPostSlugIdResponse } from "@/shared/types/dto.js";

interface CreateUserReportByPostSlugIdProps {
    postSlugId: SlugId;
    db: PostgresJsDatabase;
    userId: string;
    userReportReason: UserReportReason;
    userReportExplanation: UserReportExplanation;
}

export async function createUserReportByPostSlugId({
    postSlugId,
    db,
    userId,
    userReportReason,
    userReportExplanation,
}: CreateUserReportByPostSlugIdProps) {
    const { getPostMetadataFromSlugId } = useCommonPost();
    const postDetails = await getPostMetadataFromSlugId({
        db: db,
        postSlugId: postSlugId,
    });

    await db.insert(conversationReportTable).values({
        conversationId: postDetails.id,
        authorId: userId,
        reportReason: userReportReason,
        reportExplanation: userReportExplanation,
    });
}

interface CreateUserReportByComemntSlugIdProps {
    commentSlugId: SlugId;
    db: PostgresJsDatabase;
    userId: string;
    userReportReason: UserReportReason;
    userReportExplanation: UserReportExplanation;
}

export async function createUserReportByCommentSlugId({
    commentSlugId,
    db,
    userId,
    userReportReason,
    userReportExplanation,
}: CreateUserReportByComemntSlugIdProps) {
    const { getCommentIdFromCommentSlugId } = useCommonComment();
    const commentId = await getCommentIdFromCommentSlugId({
        db: db,
        commentSlugId: commentSlugId,
    });

    await db.insert(opinionReportTable).values({
        opinionId: commentId,
        authorId: userId,
        reportReason: userReportReason,
        reportExplanation: userReportExplanation,
    });
}

interface FetchUserReportsByPostSlugIdProps {
    postSlugId: SlugId;
    db: PostgresJsDatabase;
}

export async function fetchUserReportsByPostSlugId({
    postSlugId,
    db,
}: FetchUserReportsByPostSlugIdProps): Promise<FetchUserReportsByPostSlugIdResponse> {
    const reportPostsTableResponse = await db
        .select({
            username: userTable.username,
            reportReason: conversationReportTable.reportReason,
            reportExplanation: conversationReportTable.reportExplanation,
            createdAt: conversationReportTable.createdAt,
            id: conversationReportTable.id,
        })
        .from(conversationReportTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, conversationReportTable.conversationId),
        )
        .innerJoin(
            userTable,
            eq(userTable.id, conversationReportTable.authorId),
        )
        .where(eq(conversationTable.slugId, postSlugId))
        .orderBy(desc(conversationReportTable.createdAt));

    const userReportItemList: UserReportItem[] = [];
    reportPostsTableResponse.forEach((tableItem) => {
        const userReportItem: UserReportItem = {
            username: tableItem.username,
            reason: tableItem.reportReason,
            explanation: tableItem.reportExplanation ?? undefined,
            createdAt: tableItem.createdAt,
            id: tableItem.id,
        };
        userReportItemList.push(userReportItem);
    });

    return userReportItemList;
}

interface FetchUserReportsByCommentSlugIdProps {
    commentSlugId: SlugId;
    db: PostgresJsDatabase;
}

export async function fetchUserReportsByCommentSlugId({
    commentSlugId,
    db,
}: FetchUserReportsByCommentSlugIdProps): Promise<FetchUserReportsByPostSlugIdResponse> {
    const reportCommentsTableResponse = await db
        .select({
            username: userTable.username,
            reportReason: opinionReportTable.reportReason,
            reportExplanation: opinionReportTable.reportExplanation,
            createdAt: opinionReportTable.createdAt,
            id: opinionReportTable.id,
        })
        .from(opinionReportTable)
        .innerJoin(
            opinionTable,
            eq(opinionTable.id, opinionReportTable.opinionId),
        )
        .innerJoin(userTable, eq(userTable.id, opinionReportTable.authorId))
        .where(eq(opinionTable.slugId, commentSlugId))
        .orderBy(desc(opinionReportTable.createdAt));

    const userReportItemList: UserReportItem[] = [];
    reportCommentsTableResponse.forEach((tableItem) => {
        const userReportItem: UserReportItem = {
            username: tableItem.username,
            reason: tableItem.reportReason,
            explanation: tableItem.reportExplanation ?? undefined,
            createdAt: tableItem.createdAt,
            id: tableItem.id,
        };
        userReportItemList.push(userReportItem);
    });

    return userReportItemList;
}
