import {
    deviceTable,
    retiredDeviceKeyTable,
    emailTable,
    followedTopicTable,
    notificationTable,
    opinionTable,
    organizationMembershipTable,
    phoneTable,
    surveyResponseTable,
    comparisonResponseTable,
    userDisplayLanguageTable,
    userSpokenLanguagesTable,
    userTable,
    voteTable,
    zkPassportTable,
} from "@/shared-backend/schema.js";
import {
    and,
    eq,
    exists,
    inArray,
    isNull,
    isNotNull,
    notExists,
    sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import { log } from "@/app.js";
import { reconcileOpinionVoteCounters } from "@/shared-backend/conversationCounters.js";
import { scheduleAnalysisUpdate } from "@/shared-backend/analysisScheduler.js";
import { lockAccountConversations } from "@/shared-backend/accountContributions.js";
import { mergeQvResponses } from "@/shared-backend/qvAccountLifecycle.js";
import type { LogContext } from "@/shared-backend/logPrivacy.js";
import { recordIdentityChangedUsers } from "./authSession.js";
import { setOrganizationMembershipRole } from "./projectAccess.js";

interface MergeGuestIntoVerifiedUserProps {
    db: PostgresTransaction;
    verifiedUserId: string;
    guestUserId: string;
    now: Date;
}

/**
 * Shares the authentication transaction so ownership and the new session commit
 * together. Persisted destination choices win; pending cache actions may be lost.
 * Phone/email/passport credentials and retired signing keys never transfer.
 * The deletion worker owns residual guest cleanup.
 */
export async function mergeGuestIntoVerifiedUser({
    db,
    verifiedUserId,
    guestUserId,
    now,
}: MergeGuestIntoVerifiedUserProps): Promise<void> {
    if (verifiedUserId === guestUserId) {
        throw new Error("Cannot merge a user into itself");
    }
    const lockedUsers = await db
        .select({
            id: userTable.id,
            isDeleted: userTable.isDeleted,
            authRestrictedAt: userTable.authRestrictedAt,
        })
        .from(userTable)
        .where(inArray(userTable.id, [verifiedUserId, guestUserId]))
        .orderBy(userTable.id)
        .for("no key update");
    if (
        lockedUsers.length !== 2 ||
        lockedUsers.some(
            (user) => user.isDeleted || user.authRestrictedAt !== null,
        )
    ) {
        throw new Error("Cannot merge inactive users");
    }

    // Read after locking users: a credential writer may have committed while
    // these locks were being acquired. Deleted credentials still identify a
    // formerly verified account, not a source eligible for automatic guest merge.
    const credentials = await db
        .select({
            phone: exists(
                db
                    .select({ id: phoneTable.id })
                    .from(phoneTable)
                    .where(eq(phoneTable.userId, guestUserId)),
            ).mapWith(Boolean),
            email: exists(
                db
                    .select({ id: emailTable.id })
                    .from(emailTable)
                    .where(eq(emailTable.userId, guestUserId)),
            ).mapWith(Boolean),
            passport: exists(
                db
                    .select({ id: zkPassportTable.id })
                    .from(zkPassportTable)
                    .where(eq(zkPassportTable.userId, guestUserId)),
            ).mapWith(Boolean),
        })
        .from(userTable)
        .where(eq(userTable.id, guestUserId));
    if (
        credentials.some(
            (source) => source.phone || source.email || source.passport,
        )
    ) {
        throw new Error("Cannot merge a source user with credentials");
    }

    const conversationIds = await lockAccountConversations({
        db,
        userId: guestUserId,
    });
    // A late buffered write may introduce another conversation. Leave it with
    // the retired guest instead of mutating a scope we did not lock. ANY binds
    // the complete scope as one array parameter, without an unbounded IN list.
    const lockedScope = sql`ANY(${sql.param(conversationIds)}::integer[])`;
    const lockedOpinionIds = db
        .select({ id: opinionTable.id })
        .from(opinionTable)
        .where(sql`${opinionTable.conversationId} = ${lockedScope}`);

    log.info(
        {
            event: "application_event",
            verifiedUserId,
            guestUserId,
            count: conversationIds.length,
        } satisfies LogContext,
        "[Merge] Starting guest-to-verified user merge",
    );

    const movedSessions = await db
        .update(deviceTable)
        .set({
            userId: verifiedUserId,
            sessionExpiry: now,
            updatedAt: now,
        })
        .where(
            and(
                eq(deviceTable.userId, guestUserId),
                notExists(
                    db
                        .select({ key: retiredDeviceKeyTable.didWrite })
                        .from(retiredDeviceKeyTable)
                        .where(
                            eq(
                                retiredDeviceKeyTable.didWrite,
                                deviceTable.didWrite,
                            ),
                        ),
                ),
            ),
        );
    await recordIdentityChangedUsers({
        db,
        userIds: movedSessions.count === 0 ? [] : [guestUserId, verifiedUserId],
    });

    await db
        .update(opinionTable)
        .set({ authorId: verifiedUserId })
        .where(
            and(
                eq(opinionTable.authorId, guestUserId),
                sql`${opinionTable.conversationId} = ${lockedScope}`,
            ),
        );

    await db
        .update(notificationTable)
        .set({ userId: verifiedUserId })
        .where(eq(notificationTable.userId, guestUserId));

    // Move nonconflicting preference roots; never reactivate deleted preferences.
    const destinationTopic = alias(
        followedTopicTable,
        "merge_destination_topic",
    );
    await db
        .update(followedTopicTable)
        .set({ userId: verifiedUserId })
        .where(
            and(
                eq(followedTopicTable.userId, guestUserId),
                isNull(followedTopicTable.deletedAt),
                notExists(
                    db
                        .select({ id: destinationTopic.id })
                        .from(destinationTopic)
                        .where(
                            and(
                                eq(destinationTopic.userId, verifiedUserId),
                                eq(
                                    destinationTopic.topicId,
                                    followedTopicTable.topicId,
                                ),
                                isNull(destinationTopic.deletedAt),
                            ),
                        ),
                ),
            ),
        );

    const destinationLanguage = alias(
        userSpokenLanguagesTable,
        "merge_destination_language",
    );
    await db
        .update(userSpokenLanguagesTable)
        .set({ userId: verifiedUserId })
        .where(
            and(
                eq(userSpokenLanguagesTable.userId, guestUserId),
                eq(userSpokenLanguagesTable.isDeleted, false),
                notExists(
                    db
                        .select({ id: destinationLanguage.id })
                        .from(destinationLanguage)
                        .where(
                            and(
                                eq(destinationLanguage.userId, verifiedUserId),
                                eq(
                                    destinationLanguage.languageCode,
                                    userSpokenLanguagesTable.languageCode,
                                ),
                            ),
                        ),
                ),
            ),
        );

    const destinationDisplayLanguage = alias(
        userDisplayLanguageTable,
        "merge_destination_display_language",
    );
    await db
        .update(userDisplayLanguageTable)
        .set({ userId: verifiedUserId, updatedAt: now })
        .where(
            and(
                eq(userDisplayLanguageTable.userId, guestUserId),
                notExists(
                    db
                        .select({ userId: destinationDisplayLanguage.userId })
                        .from(destinationDisplayLanguage)
                        .where(
                            eq(
                                destinationDisplayLanguage.userId,
                                verifiedUserId,
                            ),
                        ),
                ),
            ),
        );

    const guestOrgMappings = await db
        .select({ organizationId: organizationMembershipTable.organizationId, role: organizationMembershipTable.role })
        .from(organizationMembershipTable)
        .where(
            and(
                eq(organizationMembershipTable.userId, guestUserId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        );

    const destinationMemberships = await db.select({ organizationId: organizationMembershipTable.organizationId, role: organizationMembershipTable.role })
        .from(organizationMembershipTable)
        .where(and(eq(organizationMembershipTable.userId, verifiedUserId), isNull(organizationMembershipTable.deletedAt)));
    for (const mapping of guestOrgMappings) {
        const destination = destinationMemberships.find((membership) => membership.organizationId === mapping.organizationId);
        const role = mapping.role === "admin" || destination?.role === "admin" ? "admin"
            : mapping.role === "manager" || destination?.role === "manager" ? "manager" : "moderator";
        await setOrganizationMembershipRole({
            db,
            userId: verifiedUserId,
            organizationId: mapping.organizationId,
            role,
        });
    }

    // Move roots, not pointers. A destination root wins even when withdrawn.
    const destinationVote = alias(voteTable, "merge_destination_vote");
    const transferredVotes = await db
        .update(voteTable)
        .set({ authorId: verifiedUserId })
        .where(
            and(
                eq(voteTable.authorId, guestUserId),
                inArray(voteTable.opinionId, lockedOpinionIds),
                notExists(
                    db
                        .select({ id: destinationVote.id })
                        .from(destinationVote)
                        .where(
                            and(
                                eq(destinationVote.authorId, verifiedUserId),
                                eq(
                                    destinationVote.opinionId,
                                    voteTable.opinionId,
                                ),
                            ),
                        ),
                ),
            ),
        )
        .returning({ opinionId: voteTable.opinionId });
    const retiredVotes = await db
        .update(voteTable)
        .set({ currentContentId: null, retiredAt: now, updatedAt: now })
        .where(
            and(
                eq(voteTable.authorId, guestUserId),
                inArray(voteTable.opinionId, lockedOpinionIds),
                isNotNull(voteTable.currentContentId),
            ),
        )
        .returning({ opinionId: voteTable.opinionId });

    // Keep whole private response/session roots. Never synthesize survey answers
    // or concatenate adaptive ranking sessions across conflicting accounts.
    const destinationResponse = alias(
        surveyResponseTable,
        "merge_destination_response",
    );
    await db
        .update(surveyResponseTable)
        .set({ participantId: verifiedUserId })
        .where(
            and(
                eq(surveyResponseTable.participantId, guestUserId),
                sql`${surveyResponseTable.conversationId} = ${lockedScope}`,
                notExists(
                    db
                        .select({ id: destinationResponse.id })
                        .from(destinationResponse)
                        .where(
                            and(
                                eq(
                                    destinationResponse.participantId,
                                    verifiedUserId,
                                ),
                                eq(
                                    destinationResponse.conversationId,
                                    surveyResponseTable.conversationId,
                                ),
                            ),
                        ),
                ),
            ),
        );
    const destinationRanking = alias(
        comparisonResponseTable,
        "merge_destination_ranking",
    );
    await db
        .update(comparisonResponseTable)
        .set({ participantId: verifiedUserId })
        .where(
            and(
                eq(comparisonResponseTable.participantId, guestUserId),
                sql`${comparisonResponseTable.conversationId} = ${lockedScope}`,
                notExists(
                    db
                        .select({ id: destinationRanking.id })
                        .from(destinationRanking)
                        .where(
                            and(
                                eq(
                                    destinationRanking.participantId,
                                    verifiedUserId,
                                ),
                                eq(
                                    destinationRanking.conversationId,
                                    comparisonResponseTable.conversationId,
                                ),
                            ),
                        ),
                ),
            ),
        );

    await mergeQvResponses({ db, guestUserId, verifiedUserId, now });

    await db
        .update(userTable)
        .set({
            isDeleted: true,
            deletedAt: now,
            deletionReason: "guest_merge",
            updatedAt: now,
        })
        .where(eq(userTable.id, guestUserId));

    await reconcileOpinionVoteCounters({
        db,
        opinionIds: [...transferredVotes, ...retiredVotes].map(
            (vote) => vote.opinionId,
        ),
    });
    for (const conversationId of conversationIds) {
        await scheduleAnalysisUpdate({ db, conversationId, log });
    }
}
