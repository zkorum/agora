import { and, asc, eq, inArray, lte, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { httpErrors } from "@fastify/sensible";
import {
    conversationTable,
    opinionTable,
    opinionModerationTable,
    userTable,
    voteSubmissionTable,
} from "@/shared-backend/schema.js";
import { currentOpinionSourceCondition } from "@/shared-backend/opinionEligibility.js";
import type { VotingAction } from "@/shared/types/zod.js";

export interface VoteSubmission {
    userId: string;
    conversationId: number;
    opinionId: number;
    opinionContentId: number;
    vote: VotingAction;
    timestamp: Date;
}

const submissionFields = {
    userId: voteSubmissionTable.userId,
    conversationId: voteSubmissionTable.conversationId,
    opinionId: voteSubmissionTable.opinionId,
    opinionContentId: voteSubmissionTable.opinionContentId,
    vote: voteSubmissionTable.action,
    timestamp: voteSubmissionTable.submittedAt,
};

export async function admitVote({
    db,
    vote,
}: {
    db: PostgresJsDatabase;
    vote: VoteSubmission;
}): Promise<void> {
    await db.transaction(async (tx) => {
        const voters = await tx
            .select({ id: userTable.id })
            .from(userTable)
            .where(
                and(
                    eq(userTable.id, vote.userId),
                    eq(userTable.isDeleted, false),
                ),
            )
            .for("share");
        if (voters.length === 0)
            throw httpErrors.conflict("Account no longer accepts votes");
        const conversations = await tx
            .select({
                isClosed: conversationTable.isClosed,
                contentId: conversationTable.currentContentId,
            })
            .from(conversationTable)
            .where(eq(conversationTable.id, vote.conversationId))
            .for("share");
        const conversation = conversations.at(0);
        const existingRows = await tx
            .select(submissionFields)
            .from(voteSubmissionTable)
            .where(
                and(
                    eq(voteSubmissionTable.userId, vote.userId),
                    eq(voteSubmissionTable.opinionId, vote.opinionId),
                    eq(voteSubmissionTable.pending, true),
                ),
            );
        const existing = existingRows.at(0);
        if (
            existing !== undefined &&
            sameVoteSubmission({ left: existing, right: vote })
        )
            return;
        if (conversation?.contentId == null || conversation.isClosed) {
            throw httpErrors.conflict("Conversation no longer accepts votes");
        }
        const sources = await tx
            .select({ id: opinionTable.id })
            .from(opinionTable)
            .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
            .leftJoin(
                opinionModerationTable,
                and(
                    eq(opinionModerationTable.opinionId, opinionTable.id),
                    isNull(opinionModerationTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(opinionTable.id, vote.opinionId),
                    eq(opinionTable.conversationId, vote.conversationId),
                    eq(opinionTable.currentContentId, vote.opinionContentId),
                    currentOpinionSourceCondition(),
                    isNull(opinionModerationTable.id),
                ),
            )
            .for("share", { of: opinionTable });
        if (sources.length === 0)
            throw httpErrors.conflict("Vote source is no longer available");
        await tx
            .insert(voteSubmissionTable)
            .values({
                userId: vote.userId,
                conversationId: vote.conversationId,
                opinionId: vote.opinionId,
                opinionContentId: vote.opinionContentId,
                action: vote.vote,
                submittedAt: vote.timestamp,
            })
            .onConflictDoUpdate({
                target: [
                    voteSubmissionTable.userId,
                    voteSubmissionTable.opinionId,
                ],
                set: {
                    opinionContentId: vote.opinionContentId,
                    action: vote.vote,
                    submittedAt: vote.timestamp,
                    pending: true,
                },
                setWhere: lte(voteSubmissionTable.submittedAt, vote.timestamp),
            });
    });
}

export async function fetchPendingVoteSubmissions({
    db,
    conversationId,
    opinionIds,
    voteKeys,
    limit,
}: {
    db: PostgresJsDatabase;
    conversationId?: number;
    opinionIds?: number[];
    voteKeys?: readonly Pick<VoteSubmission, "userId" | "opinionId">[];
    limit?: number;
}): Promise<VoteSubmission[]> {
    if (voteKeys?.length === 0 || opinionIds?.length === 0) return [];
    // Discovery may use a replica. Mutation guards pass their writer transaction
    // so a delayed discovery read never acknowledges or finalizes stale state.
    const query = db
        .select(submissionFields)
        .from(voteSubmissionTable)
        .where(
            and(
                eq(voteSubmissionTable.pending, true),
                conversationId === undefined
                    ? undefined
                    : eq(voteSubmissionTable.conversationId, conversationId),
                opinionIds === undefined
                    ? undefined
                    : inArray(voteSubmissionTable.opinionId, opinionIds),
                voteKeys === undefined
                    ? undefined
                    : or(
                          ...voteKeys.map((vote) =>
                              and(
                                  eq(voteSubmissionTable.userId, vote.userId),
                                  eq(
                                      voteSubmissionTable.opinionId,
                                      vote.opinionId,
                                  ),
                              ),
                          ),
                      ),
            ),
        )
        .orderBy(
            asc(voteSubmissionTable.submittedAt),
            asc(voteSubmissionTable.id),
        );
    return limit === undefined ? await query : await query.limit(limit);
}

export function sameVoteSubmission({
    left,
    right,
}: {
    left: VoteSubmission;
    right: VoteSubmission;
}): boolean {
    return (
        left.userId === right.userId &&
        left.conversationId === right.conversationId &&
        left.opinionId === right.opinionId &&
        left.opinionContentId === right.opinionContentId &&
        left.vote === right.vote &&
        left.timestamp.getTime() === right.timestamp.getTime()
    );
}

export async function acknowledgeVoteSubmissions({
    db,
    votes,
}: {
    db: PostgresJsDatabase;
    votes: VoteSubmission[];
}): Promise<void> {
    if (votes.length === 0) return;
    await db
        .update(voteSubmissionTable)
        .set({ pending: false })
        .where(
            and(
                eq(voteSubmissionTable.pending, true),
                or(
                    ...votes.map((vote) =>
                        and(
                            eq(voteSubmissionTable.userId, vote.userId),
                            eq(voteSubmissionTable.opinionId, vote.opinionId),
                            eq(
                                voteSubmissionTable.opinionContentId,
                                vote.opinionContentId,
                            ),
                            eq(voteSubmissionTable.action, vote.vote),
                            eq(voteSubmissionTable.submittedAt, vote.timestamp),
                        ),
                    ),
                ),
            ),
        );
}
