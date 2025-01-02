import type {
    SlugId,
    UserReportExplanation,
    UserReportItem,
    UserReportReason,
} from "@/shared/types/zod.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonComment, useCommonPost } from "./common.js";
import {
    commentTable,
    postTable,
    reportCommentsTable,
    reportPostsTable,
    userTable,
} from "@/schema.js";
import { eq } from "drizzle-orm";
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
    const { getPostAndContentIdFromSlugId } = useCommonPost();
    const postDetails = await getPostAndContentIdFromSlugId({
        db: db,
        postSlugId: postSlugId,
    });

    await db.insert(reportPostsTable).values({
        postId: postDetails.id,
        reporterId: userId,
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

    await db.insert(reportCommentsTable).values({
        commentId: commentId,
        reporterId: userId,
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
            reportReason: reportPostsTable.reportReason,
            reportExplanation: reportPostsTable.reportExplanation,
            createdAt: reportPostsTable.createdAt,
        })
        .from(reportPostsTable)
        .innerJoin(postTable, eq(postTable.id, reportPostsTable.postId))
        .innerJoin(userTable, eq(userTable.id, reportPostsTable.reporterId))
        .where(eq(postTable.slugId, postSlugId));

    const userReportItemList: UserReportItem[] = [];
    reportPostsTableResponse.forEach((tableItem) => {
        const userReportItem: UserReportItem = {
            username: tableItem.username,
            reason: tableItem.reportReason,
            explanation: tableItem.reportExplanation ?? undefined,
            createdAt: tableItem.createdAt,
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
            reportReason: reportCommentsTable.reportReason,
            reportExplanation: reportCommentsTable.reportExplanation,
            createdAt: reportCommentsTable.createdAt,
        })
        .from(reportCommentsTable)
        .innerJoin(
            commentTable,
            eq(commentTable.id, reportCommentsTable.commentId),
        )
        .innerJoin(userTable, eq(userTable.id, reportCommentsTable.reporterId))
        .where(eq(commentTable.slugId, commentSlugId));

    const userReportItemList: UserReportItem[] = [];
    reportCommentsTableResponse.forEach((tableItem) => {
        const userReportItem: UserReportItem = {
            username: tableItem.username,
            reason: tableItem.reportReason,
            explanation: tableItem.reportExplanation ?? undefined,
            createdAt: tableItem.createdAt,
        };
        userReportItemList.push(userReportItem);
    });

    return userReportItemList;
}
