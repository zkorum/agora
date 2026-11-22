import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { log } from "@/app.js";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import { reconcileOpinionVoteCounters } from "@/shared-backend/conversationCounters.js";
import { scheduleAnalysisUpdate } from "@/shared-backend/analysisScheduler.js";
import { setQvAccountHidden } from "@/shared-backend/qvAccountLifecycle.js";
import { setRetainedParticipantAccountHidden } from "@/shared-backend/retainedParticipantEligibility.js";
import {
    conversationTable,
    gatheringResponseTable,
    opinionTable,
    rankingItemTable,
    surveyResponseTable,
    voteTable,
} from "@/shared-backend/schema.js";
import {
    queueOpinionRedactedEvent,
    queueSourceInvalidationEvent,
} from "./realtimeEventOutbox.js";
import { refreshClosedQvLiveInputs } from "./qvLifecycle.js";

type AccountLiveInputChange =
    | { type: "hide"; hiddenAt: Date }
    | { type: "restore" };

interface ConversationSourceChanges {
    slugId: string;
    inputsChanged: boolean;
    opinions: Parameters<typeof queueOpinionRedactedEvent>[0]["opinions"];
}

/** Caller holds account -> conversation locks and has changed account eligibility.
 * This boundary changes live visibility only, never numerical inputs or account links.
 * Comparison eligibility follows the locked account; QV additionally hides its root.
 */
export async function applyAccountLiveInputChange({
    db,
    userId,
    change,
}: {
    db: PostgresTransaction;
    userId: string;
    change: AccountLiveInputChange;
}): Promise<void> {
    await db
        .update(gatheringResponseTable)
        .set({
            accountHiddenAt: change.type === "hide" ? change.hiddenAt : null,
        })
        .where(
            and(
                eq(gatheringResponseTable.authorId, userId),
                eq(gatheringResponseTable.isSeed, false),
                change.type === "restore"
                    ? isNull(gatheringResponseTable.deletedAt)
                    : undefined,
            ),
        );
    await setRetainedParticipantAccountHidden({
        db,
        userId,
        isAccountHidden: change.type === "hide",
    });
    if (change.type === "hide") {
        await db
            .update(opinionTable)
            .set({
                accountHiddenAt: change.hiddenAt,
                accountHiddenContentRetained: true,
            })
            .where(
                and(
                    eq(opinionTable.authorId, userId),
                    eq(opinionTable.isSeed, false),
                    isNull(opinionTable.accountHiddenAt),
                ),
            );
        await db
            .update(rankingItemTable)
            .set({
                accountHiddenAt: change.hiddenAt,
                accountHiddenContentRetained: true,
            })
            .where(
                and(
                    eq(rankingItemTable.authorId, userId),
                    eq(rankingItemTable.isSeed, false),
                    isNull(rankingItemTable.accountHiddenAt),
                ),
            );
    } else {
        await db
            .update(opinionTable)
            .set({ accountHiddenAt: null, accountHiddenContentRetained: false })
            .where(
                and(
                    eq(opinionTable.authorId, userId),
                    isNotNull(opinionTable.accountHiddenAt),
                    isNull(opinionTable.deletedAt),
                    isNotNull(opinionTable.currentContentId),
                ),
            );
        await db
            .update(rankingItemTable)
            .set({ accountHiddenAt: null, accountHiddenContentRetained: false })
            .where(
                and(
                    eq(rankingItemTable.authorId, userId),
                    isNotNull(rankingItemTable.accountHiddenAt),
                    isNull(rankingItemTable.deletedAt),
                    isNotNull(rankingItemTable.currentContentId),
                ),
            );
    }
    const qvBallotConversationIds = await setQvAccountHidden({
        db,
        userId,
        hiddenAt: change.type === "hide" ? change.hiddenAt : null,
    });
    await refreshClosedQvLiveInputs({
        db,
        conversationIds: qvBallotConversationIds,
    });

    const votedOpinions = await db
        .select({
            opinionId: opinionTable.id,
            conversationId: opinionTable.conversationId,
            slugId: conversationTable.slugId,
        })
        .from(voteTable)
        .innerJoin(opinionTable, eq(opinionTable.id, voteTable.opinionId))
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .where(
            and(
                eq(voteTable.authorId, userId),
                isNotNull(voteTable.currentContentId),
            ),
        );
    const userOpinions = await db
        .select({
            conversationId: opinionTable.conversationId,
            conversationSlugId: conversationTable.slugId,
            slugId: opinionTable.slugId,
            isSeed: opinionTable.isSeed,
            currentContentId: opinionTable.currentContentId,
        })
        .from(opinionTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .where(eq(opinionTable.authorId, userId))
        .orderBy(opinionTable.conversationId, opinionTable.id);
    const changesByConversation = new Map<number, ConversationSourceChanges>();
    const surveyScopes = await db
        .select({
            conversationId: surveyResponseTable.conversationId,
            slugId: conversationTable.slugId,
        })
        .from(surveyResponseTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, surveyResponseTable.conversationId),
        )
        .where(eq(surveyResponseTable.participantId, userId));
    for (const opinion of [...votedOpinions, ...surveyScopes]) {
        changesByConversation.set(opinion.conversationId, {
            slugId: opinion.slugId,
            inputsChanged: true,
            opinions: [],
        });
    }
    for (const opinion of userOpinions) {
        const changes: ConversationSourceChanges = changesByConversation.get(
            opinion.conversationId,
        ) ?? {
            slugId: opinion.conversationSlugId,
            inputsChanged: false,
            opinions: [],
        };
        changes.opinions.push({
            opinionSlugId: opinion.slugId,
            action:
                change.type === "restore"
                    ? "restore_account"
                    : opinion.isSeed
                      ? "unlink_author"
                      : "hide_account",
        });
        changes.inputsChanged ||=
            !opinion.isSeed && opinion.currentContentId !== null;
        changesByConversation.set(opinion.conversationId, changes);
    }
    await reconcileOpinionVoteCounters({
        db,
        opinionIds: votedOpinions.map((opinion) => opinion.opinionId),
    });
    for (const [conversationId, changes] of [...changesByConversation].sort(
        ([a], [b]) => a - b,
    )) {
        if (changes.opinions.length > 0)
            await queueOpinionRedactedEvent({
                db,
                conversationSlugId: changes.slugId,
                opinions: changes.opinions,
            });
        if (changes.inputsChanged) {
            await scheduleAnalysisUpdate({
                db,
                conversationId,
                log,
            });
        }
    }
    await queueSourceInvalidationEvent(db);
}
