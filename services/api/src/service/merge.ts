import {
    conversationTable,
    deviceTable,
    emailTable,
    eventTicketTable,
    followedTopicTable,
    notificationTable,
    opinionTable,
    organizationMembershipTable,
    phoneTable,
    projectOrganizationOwnershipTable,
    userDisplayLanguageTable,
    userSpokenLanguagesTable,
    userTable,
    voteTable,
    zkPassportTable,
} from "@/shared-backend/schema.js";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { log } from "@/app.js";
import { scheduleConversationAnalysisRefresh } from "@/shared-backend/conversationCounters.js";
import { recordIdentityChangedUsers } from "./authSession.js";
import { ensureOrganizationMembershipBaselineCapabilities } from "./projectAccess.js";

interface MergeGuestIntoVerifiedUserProps {
    db: PostgresDatabase;
    verifiedUserId: string;
    guestUserId: string;
    now: Date;
}

/**
 * Merge a guest user account into a verified user account
 *
 * Strategy:
 * 1. Transfer mergeable data from guest to verified user by updating userId/authorId
 * 2. For records with unique constraints that conflict: do nothing (keep verified user's data)
 * 3. Soft-delete the guest user (cleanup scripts will eventually delete guest's remaining data)
 *
 * Authentication credentials are identity records and are never transferred.
 *
 * This function should be called within a transaction for atomicity.
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
        .select({ id: userTable.id, isDeleted: userTable.isDeleted })
        .from(userTable)
        .where(inArray(userTable.id, [verifiedUserId, guestUserId]))
        .orderBy(userTable.id)
        .for("update");
    if (
        lockedUsers.length !== 2 ||
        lockedUsers.some((user) => user.isDeleted)
    ) {
        throw new Error("Cannot merge inactive users");
    }

    const sourcePhones = await db
        .select({ id: phoneTable.id })
        .from(phoneTable)
        .where(
            and(
                eq(phoneTable.userId, guestUserId),
                eq(phoneTable.isDeleted, false),
            ),
        )
        .limit(1);
    const sourceEmails = await db
        .select({ id: emailTable.id })
        .from(emailTable)
        .where(eq(emailTable.userId, guestUserId))
        .limit(1);
    const sourcePassports = await db
        .select({ id: zkPassportTable.id })
        .from(zkPassportTable)
        .where(eq(zkPassportTable.userId, guestUserId))
        .limit(1);
    if (
        sourcePhones.length > 0 ||
        sourceEmails.length > 0 ||
        sourcePassports.length > 0
    ) {
        throw new Error("Cannot merge a source user with credentials");
    }

    log.info(
        { verifiedUserId, guestUserId },
        "[Merge] Starting guest-to-verified user merge",
    );

    // 1. Transfer devices (no unique constraint on userId)
    const movedSessions = await db
        .update(deviceTable)
        .set({
            userId: verifiedUserId,
            sessionExpiry: now,
            updatedAt: now,
        })
        .where(eq(deviceTable.userId, guestUserId))
        .returning({ didWrite: deviceTable.didWrite });
    await recordIdentityChangedUsers({
        db,
        userIds:
            movedSessions.length === 0
                ? []
                : [guestUserId, verifiedUserId],
    });

    // 2. Transfer event tickets (no unique constraint, multiple tickets per user allowed)
    await db
        .update(eventTicketTable)
        .set({ userId: verifiedUserId })
        .where(eq(eventTicketTable.userId, guestUserId));

    // 3. Transfer phone verification (no unique constraint on userId)
    await db
        .update(phoneTable)
        .set({ userId: verifiedUserId })
        .where(eq(phoneTable.userId, guestUserId));

    // 4. Transfer zkPassport/Rarimo (no unique constraint on userId)
    await db
        .update(zkPassportTable)
        .set({ userId: verifiedUserId })
        .where(eq(zkPassportTable.userId, guestUserId));

    // 5. Transfer opinions (uses authorId, not userId)
    await db
        .update(opinionTable)
        .set({ authorId: verifiedUserId })
        .where(eq(opinionTable.authorId, guestUserId));

    // 6. Transfer notifications (uses userId)
    await db
        .update(notificationTable)
        .set({ userId: verifiedUserId })
        .where(eq(notificationTable.userId, guestUserId));

    // 7. Transfer followed topics (unique constraint: userId + topicId)
    // Get guest topics, insert as verified user, skip conflicts
    const guestFollowedTopics = await db
        .select()
        .from(followedTopicTable)
        .where(
            and(
                eq(followedTopicTable.userId, guestUserId),
                isNull(followedTopicTable.deletedAt),
            ),
        );

    for (const topic of guestFollowedTopics) {
        await db
            .insert(followedTopicTable)
            .values({
                userId: verifiedUserId,
                topicId: topic.topicId,
                createdAt: topic.createdAt,
            })
            .onConflictDoNothing();
    }

    // 8. Transfer user spoken languages (unique constraint: userId + languageCode)
    const guestSpokenLanguages = await db
        .select()
        .from(userSpokenLanguagesTable)
        .where(eq(userSpokenLanguagesTable.userId, guestUserId));

    for (const lang of guestSpokenLanguages) {
        await db
            .insert(userSpokenLanguagesTable)
            .values({
                userId: verifiedUserId,
                languageCode: lang.languageCode,
            })
            .onConflictDoNothing();
    }

    // 9. Transfer user display language if the verified user has none.
    const guestDisplayLanguage = await db
        .select()
        .from(userDisplayLanguageTable)
        .where(eq(userDisplayLanguageTable.userId, guestUserId))
        .limit(1);

    const displayLanguage = guestDisplayLanguage.at(0);
    if (displayLanguage !== undefined) {
        await db
            .insert(userDisplayLanguageTable)
            .values({
                userId: verifiedUserId,
                languageCode: displayLanguage.languageCode,
                createdAt: displayLanguage.createdAt,
                updatedAt: now,
            })
            .onConflictDoNothing();
    }

    // 10. Transfer organization memberships (unique constraint: userId + organizationId)
    const guestOrgMappings = await db
        .select()
        .from(organizationMembershipTable)
        .where(
            and(
                eq(organizationMembershipTable.userId, guestUserId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        );

    for (const mapping of guestOrgMappings) {
        await ensureOrganizationMembershipBaselineCapabilities({
            db,
            userId: verifiedUserId,
            organizationId: mapping.organizationId,
        });
    }

    // 11. Transfer votes (uses authorId, unique constraint: authorId + opinionId)
    const guestVotes = await db
        .select()
        .from(voteTable)
        .where(eq(voteTable.authorId, guestUserId));

    for (const vote of guestVotes) {
        await db
            .insert(voteTable)
            .values({
                authorId: verifiedUserId,
                opinionId: vote.opinionId,
                currentContentId: vote.currentContentId,
                createdAt: vote.createdAt,
                updatedAt: vote.updatedAt,
            })
            .onConflictDoNothing();
    }

    // 12. Reconcile conversation counters for all affected conversations
    // This ensures vote counts, opinion counts, and participant counts are updated
    const conversationIdsSet = new Set<number>();

    log.info(
        `[Merge] Finding affected conversations for guest user: ${guestUserId}`,
    );

    // From transferred votes
    const transferredVotes = await db
        .select()
        .from(voteTable)
        .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
        .where(eq(voteTable.authorId, verifiedUserId));
    transferredVotes.forEach((row) =>
        conversationIdsSet.add(row.opinion.conversationId),
    );

    // From transferred opinions
    const transferredOpinions = await db
        .select()
        .from(opinionTable)
        .where(eq(opinionTable.authorId, verifiedUserId));
    transferredOpinions.forEach((opinion) =>
        conversationIdsSet.add(opinion.conversationId),
    );

    // From conversations owned through transferred memberships
    const transferredConversations = await db
        .select({ conversationId: conversationTable.id })
        .from(conversationTable)
        .innerJoin(
            projectOrganizationOwnershipTable,
            and(
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    conversationTable.projectId,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationMembershipTable,
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .where(eq(organizationMembershipTable.userId, verifiedUserId));
    transferredConversations.forEach((conversation) =>
        conversationIdsSet.add(conversation.conversationId),
    );

    log.info(
        `[Merge] Found ${String(conversationIdsSet.size)} affected conversations`,
    );

    for (const conversationId of conversationIdsSet) {
        await scheduleConversationAnalysisRefresh({
            db,
            conversationId,
            log,
        });
    }

    // 13. Soft-delete the guest user
    await db
        .update(userTable)
        .set({
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
        })
        .where(eq(userTable.id, guestUserId));

    log.info(
        {
            verifiedUserId,
            guestUserId,
            affectedConversations: conversationIdsSet.size,
        },
        "[Merge] Successfully merged guest into verified user",
    );
}
