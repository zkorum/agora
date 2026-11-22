import { httpErrors } from "@fastify/sensible";
import { and, eq, exists, inArray, isNotNull, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { z } from "zod";
import { log } from "@/app.js";
import {
    reconcileOpinionVoteCounters,
    scheduleConversationAnalysisRefresh,
} from "@/shared-backend/conversationCounters.js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import {
    comparisonAnswerTable,
    comparisonResponseTable,
    comparisonUserEntityScoreTable,
    conversationAnalysisCloseTable,
    conversationTable,
    deviceTable,
    opinionTable,
    qvCalculationTable,
    userTable,
    voteTable,
} from "@/shared-backend/schema.js";
import type { Dto } from "@/shared/types/dto.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { getDeviceStatus } from "./authUtil.js";
import {
    currentAnalysisCloseCondition,
    readableAnalysisConversationCondition,
} from "./closedAnalysisQueries.js";
import { lockRankingScoringConfig } from "./comparison.js";
import { scheduleRankingStatsRefresh } from "./comparisonQueue.js";
import { transitionQvCalculation } from "./qvLifecycle.js";
import { buildQvOwnerResponseQuery } from "./qvQueries.js";
import { clearClosedQvBallot } from "./qvResponses.js";

function finalizedVoteWithdrawalCondition({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}) {
    const conversation = conversationTable;
    return and(
        eq(conversation.slugId, conversationSlugId),
        readableAnalysisConversationCondition(db),
        eq(conversation.isClosed, true),
        eq(conversation.voteBufferDrained, true),
        isNotNull(conversation.closedFinalizedAt),
    );
}

function readyQvClose(db: PostgresJsDatabase) {
    const calculation = qvCalculationTable;
    const close = conversationAnalysisCloseTable;
    return db
        .select({ id: close.id })
        .from(close)
        .innerJoin(
            calculation,
            and(
                eq(calculation.conversationId, close.conversationId),
                eq(calculation.generation, close.sourceRevision),
                eq(calculation.status, "ready"),
                isNotNull(calculation.inputSnapshotId),
            ),
        );
}

function comparisonResponseOwner({
    conversationId,
    userId,
}: {
    conversationId: number | typeof conversationTable.id;
    userId: string;
}) {
    return and(
        eq(comparisonResponseTable.conversationId, conversationId),
        eq(comparisonResponseTable.participantId, userId),
    );
}

function activePolisVotes({
    db,
    conversationId,
    userId,
}: {
    db: PostgresJsDatabase;
    conversationId: number | typeof conversationTable.id;
    userId: string;
}) {
    return and(
        eq(voteTable.authorId, userId),
        isNotNull(voteTable.currentContentId),
        inArray(
            voteTable.opinionId,
            db
                .select({ id: opinionTable.id })
                .from(opinionTable)
                .where(eq(opinionTable.conversationId, conversationId)),
        ),
    );
}

export async function getClosedVoteWithdrawalStatus({
    db,
    conversationSlugId,
    userId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    userId: string;
}): Promise<z.infer<typeof Dto.closedVoteWithdrawalStatusResponse>> {
    const primary = getPrimaryDatabase(db);
    const owner = { conversationId: conversationTable.id, userId };
    const votes = primary
        .select({ id: voteTable.id })
        .from(voteTable)
        .where(activePolisVotes({ db: primary, ...owner }));
    const answers = primary
        .select({ id: comparisonAnswerTable.id })
        .from(comparisonResponseTable)
        .innerJoin(
            comparisonAnswerTable,
            eq(
                comparisonAnswerTable.comparisonResponseId,
                comparisonResponseTable.id,
            ),
        )
        .where(
            and(
                comparisonResponseOwner(owner),
                isNull(comparisonAnswerTable.deletedAt),
            ),
        );
    const ballot = buildQvOwnerResponseQuery({
        db: primary,
        ...owner,
        savedOnly: true,
    });
    const scopes = await primary
        .select({ closeEpoch: conversationTable.voteBufferEpoch })
        .from(conversationTable)
        .where(
            and(
                finalizedVoteWithdrawalCondition({
                    db: primary,
                    conversationSlugId,
                }),
                or(
                    and(
                        eq(conversationTable.conversationType, "polis"),
                        exists(votes),
                    ),
                    and(
                        eq(conversationTable.prioritizationType, "comparisons"),
                        exists(answers),
                    ),
                    and(
                        eq(conversationTable.prioritizationType, "qv"),
                        exists(ballot),
                        exists(
                            readyQvClose(primary).where(
                                currentAnalysisCloseCondition(),
                            ),
                        ),
                    ),
                ),
            ),
        );
    const scope = scopes.at(0);
    return scope !== undefined
        ? { available: true, closeEpoch: scope.closeEpoch }
        : { available: false };
}

async function withdrawComparisonAnswers({
    tx,
    conversationId,
    userId,
    now,
}: {
    tx: PostgresTransaction;
    conversationId: number;
    userId: string;
    now: Date;
}): Promise<boolean> {
    await lockRankingScoringConfig({ db: tx, conversationId });
    const responses = await tx
        .select({ id: comparisonResponseTable.id })
        .from(comparisonResponseTable)
        .where(comparisonResponseOwner({ conversationId, userId }))
        .for("update");
    const response = responses.at(0);
    if (response === undefined) return false;

    // The native answer invalidation trigger marks only ordinary scoring dirty.
    const answers = await tx
        .update(comparisonAnswerTable)
        .set({ deletedAt: now })
        .where(
            and(
                eq(comparisonAnswerTable.comparisonResponseId, response.id),
                isNull(comparisonAnswerTable.deletedAt),
            ),
        );
    if (answers.count === 0) return false;
    await tx
        .update(comparisonUserEntityScoreTable)
        .set({ deletedAt: now })
        .where(
            and(
                eq(
                    comparisonUserEntityScoreTable.comparisonResponseId,
                    response.id,
                ),
                isNull(comparisonUserEntityScoreTable.deletedAt),
            ),
        );
    await tx
        .update(comparisonResponseTable)
        .set({
            comparisons: [],
            ranking: null,
            isComplete: false,
            updatedAt: now,
        })
        .where(eq(comparisonResponseTable.id, response.id));
    return true;
}

export async function withdrawClosedVotes({
    db,
    didWrite,
    userId,
    request,
    now,
    valkey,
}: {
    db: PostgresJsDatabase;
    didWrite: string;
    userId: string;
    request: z.infer<typeof Dto.closedVoteWithdrawalRequest>;
    now: Date;
    valkey?: Valkey;
}): Promise<z.infer<typeof Dto.closedVoteWithdrawalResponse>> {
    if (userId !== request.expectedViewerId)
        throw httpErrors.conflict("Viewer changed; confirm withdrawal again");
    const comparisonRefreshId = await getPrimaryDatabase(db).transaction(
        async (tx) => {
            // Recheck the signed owner under account → device → conversation locks.
            await tx
                .select({ id: userTable.id })
                .from(userTable)
                .where(eq(userTable.id, userId))
                .for("share");
            await tx
                .select({ didWrite: deviceTable.didWrite })
                .from(deviceTable)
                .where(eq(deviceTable.didWrite, didWrite))
                .for("share");
            const device = await getDeviceStatus({ db: tx, didWrite, now });
            if (
                !device.isKnown ||
                device.userId !== userId ||
                (device.isRegistered && !device.isLoggedIn)
            )
                throw httpErrors.unauthorized("Voting identity unavailable");

            const scope = (
                await tx
                    .select({
                        id: conversationTable.id,
                        closeEpoch: conversationTable.voteBufferEpoch,
                        conversationType: conversationTable.conversationType,
                        prioritizationType:
                            conversationTable.prioritizationType,
                    })
                    .from(conversationTable)
                    .where(
                        finalizedVoteWithdrawalCondition({
                            db: tx,
                            conversationSlugId: request.conversationSlugId,
                        }),
                    )
                    .for("no key update")
            ).at(0);
            if (scope?.closeEpoch !== request.closeEpoch)
                throw httpErrors.conflict(
                    "Conversation close changed; confirm withdrawal again",
                );
            const owner = { conversationId: scope.id, userId };
            if (scope.conversationType === "polis") {
                // The vote buffer is sealed and drained. There is no older write
                // that can revive these pointers, and no sealed input is touched.
                const withdrawn = await tx
                    .update(voteTable)
                    .set({
                        currentContentId: null,
                        withdrawnAt: now,
                        updatedAt: now,
                    })
                    .where(activePolisVotes({ db: tx, ...owner }))
                    .returning({ opinionId: voteTable.opinionId });
                if (withdrawn.length > 0) {
                    await reconcileOpinionVoteCounters({
                        db: tx,
                        opinionIds: withdrawn.map(({ opinionId }) => opinionId),
                    });
                    await scheduleConversationAnalysisRefresh({
                        db: tx,
                        conversationId: scope.id,
                        log,
                    });
                }
            } else if (scope.prioritizationType === "comparisons") {
                if (await withdrawComparisonAnswers({ tx, ...owner, now }))
                    return scope.id;
            } else if (scope.prioritizationType === "qv") {
                const bindings = await readyQvClose(tx)
                    .innerJoin(
                        conversationTable,
                        currentAnalysisCloseCondition(),
                    )
                    .where(eq(conversationTable.id, scope.id));
                const bound = bindings.at(0);
                if (bound === undefined)
                    throw httpErrors.conflict("No complete closing result");
                if (await clearClosedQvBallot({ tx, ...owner })) {
                    await transitionQvCalculation({
                        db: tx,
                        conversationId: scope.id,
                        conversationSlugId: request.conversationSlugId,
                        action: "refresh",
                        closeId: bound.id,
                    });
                }
            } else {
                throw httpErrors.conflict(
                    "Voting method does not support this withdrawal",
                );
            }
            return undefined;
        },
    );
    if (comparisonRefreshId !== undefined)
        await scheduleRankingStatsRefresh({
            valkey,
            conversationId: comparisonRefreshId,
            conversationSlugId: request.conversationSlugId,
        });
    return { success: true };
}
