/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { PostgresTransaction } from "./db.js";
import {
    userTable,
    conversationTable,
    projectTable,
    organizationTable,
    organizationMembershipAllProjectCapabilityTable,
    premiumFeatureEntitlementTable,
    conversationReportTable,
    opinionReportTable,
    conversationModerationTable,
    opinionModerationTable,
    conversationEmailUpdateTable,
    conversationEmailUpdateDeliveryTable,
    conversationEmailUpdateTestAttemptTable,
    conversationEmailUpdateScopeSafetyBlockTable,
    conversationEmailUpdateEmailSuppressionTable,
    conversationEmailUpdateUserComplaintSuppressionTable,
    conversationImportTable,
} from "./schema.js";

/** Preserve independently shared records and state timestamps, removing only actors. */
export async function unlinkAccountSharedProvenance({
    db,
    userId,
    limit = 1000,
}: {
    db: PostgresTransaction;
    userId: string;
    limit?: number;
}): Promise<
    | {
          status: "blocked";
          reason:
              | "account_not_purging"
              | "active_test_attempts"
              | "facilitator_blocks_remaining"
              | "unpublished_imports_remaining";
      }
    | { status: "progress"; updated: number }
> {
    const accounts = await db
        .select({ startedAt: userTable.purgeStartedAt })
        .from(userTable)
        .where(
            and(
                eq(userTable.id, userId),
                eq(userTable.isDeleted, true),
                isNotNull(userTable.purgeStartedAt),
            ),
        )
        .for("no key update");
    const account = accounts.at(0);
    if (account?.startedAt == null)
        return { status: "blocked", reason: "account_not_purging" };
    const activeTests = await db
        .select({ id: conversationEmailUpdateTestAttemptTable.id })
        .from(conversationEmailUpdateTestAttemptTable)
        .where(
            and(
                eq(
                    conversationEmailUpdateTestAttemptTable.requestedByUserId,
                    userId,
                ),
                inArray(conversationEmailUpdateTestAttemptTable.status, [
                    "pending",
                    "claimed",
                    "attempting",
                ]),
            ),
        )
        .limit(1);
    if (activeTests.length > 0)
        return { status: "blocked", reason: "active_test_attempts" };
    const blocks = await db
        .select({ id: conversationEmailUpdateScopeSafetyBlockTable.id })
        .from(conversationEmailUpdateScopeSafetyBlockTable)
        .where(
            eq(
                conversationEmailUpdateScopeSafetyBlockTable.facilitatorUserId,
                userId,
            ),
        )
        .limit(1);
    if (blocks.length > 0)
        return { status: "blocked", reason: "facilitator_blocks_remaining" };
    const imports = await db
        .select({ id: conversationImportTable.id })
        .from(conversationImportTable)
        .where(
            and(
                eq(conversationImportTable.userId, userId),
                isNull(conversationImportTable.conversationId),
            ),
        )
        .limit(1);
    if (imports.length > 0)
        return { status: "blocked", reason: "unpublished_imports_remaining" };

    const updates = [
        db
            .update(conversationImportTable)
            .set({ userId: null, requesterPurgedAt: account.startedAt })
            .where(
                inArray(
                    conversationImportTable.id,
                    db
                        .select({ id: conversationImportTable.id })
                        .from(conversationImportTable)
                        .where(eq(conversationImportTable.userId, userId))
                        .orderBy(conversationImportTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(conversationEmailUpdateTestAttemptTable)
            .set({
                requestedByUserId: null,
                destinationEmailCredentialId: null,
                destinationEmailSnapshot: null,
                senderPurgedAt: account.startedAt,
            })
            .where(
                inArray(
                    conversationEmailUpdateTestAttemptTable.id,
                    db
                        .select({
                            id: conversationEmailUpdateTestAttemptTable.id,
                        })
                        .from(conversationEmailUpdateTestAttemptTable)
                        .where(
                            eq(
                                conversationEmailUpdateTestAttemptTable.requestedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(conversationEmailUpdateTestAttemptTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(conversationEmailUpdateTable)
            .set({
                createdByUserId: null,
                reviewTestEmailCredentialId: null,
                reviewTestEmailSnapshot: null,
            })
            .where(
                inArray(
                    conversationEmailUpdateTable.id,
                    db
                        .select({ id: conversationEmailUpdateTable.id })
                        .from(conversationEmailUpdateTable)
                        .where(
                            eq(
                                conversationEmailUpdateTable.createdByUserId,
                                userId,
                            ),
                        )
                        .orderBy(conversationEmailUpdateTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(conversationEmailUpdateDeliveryTable)
            .set({ acceptedByUserId: null })
            .where(
                inArray(
                    conversationEmailUpdateDeliveryTable.id,
                    db
                        .select({ id: conversationEmailUpdateDeliveryTable.id })
                        .from(conversationEmailUpdateDeliveryTable)
                        .where(
                            eq(
                                conversationEmailUpdateDeliveryTable.acceptedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(conversationEmailUpdateDeliveryTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(conversationReportTable)
            .set({ authorId: null })
            .where(
                inArray(
                    conversationReportTable.id,
                    db
                        .select({ id: conversationReportTable.id })
                        .from(conversationReportTable)
                        .where(eq(conversationReportTable.authorId, userId))
                        .orderBy(conversationReportTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(opinionReportTable)
            .set({ authorId: null })
            .where(
                inArray(
                    opinionReportTable.id,
                    db
                        .select({ id: opinionReportTable.id })
                        .from(opinionReportTable)
                        .where(eq(opinionReportTable.authorId, userId))
                        .orderBy(opinionReportTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(conversationModerationTable)
            .set({ authorId: null })
            .where(
                inArray(
                    conversationModerationTable.id,
                    db
                        .select({ id: conversationModerationTable.id })
                        .from(conversationModerationTable)
                        .where(eq(conversationModerationTable.authorId, userId))
                        .orderBy(conversationModerationTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(opinionModerationTable)
            .set({ authorId: null })
            .where(
                inArray(
                    opinionModerationTable.id,
                    db
                        .select({ id: opinionModerationTable.id })
                        .from(opinionModerationTable)
                        .where(eq(opinionModerationTable.authorId, userId))
                        .orderBy(opinionModerationTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(projectTable)
            .set({ conversationEmailUpdateDefaultUpdatedByUserId: null })
            .where(
                inArray(
                    projectTable.id,
                    db
                        .select({ id: projectTable.id })
                        .from(projectTable)
                        .where(
                            eq(
                                projectTable.conversationEmailUpdateDefaultUpdatedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(projectTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(conversationTable)
            .set({ conversationEmailUpdateOverrideUpdatedByUserId: null })
            .where(
                inArray(
                    conversationTable.id,
                    db
                        .select({ id: conversationTable.id })
                        .from(conversationTable)
                        .where(
                            eq(
                                conversationTable.conversationEmailUpdateOverrideUpdatedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(conversationTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(organizationTable)
            .set({
                autoProvisionedForUserId: null,
                retiredForAccountDeletionAt: null,
            })
            .where(
                inArray(
                    organizationTable.id,
                    db
                        .select({ id: organizationTable.id })
                        .from(organizationTable)
                        .where(
                            eq(
                                organizationTable.autoProvisionedForUserId,
                                userId,
                            ),
                        )
                        .orderBy(organizationTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(premiumFeatureEntitlementTable)
            .set({ createdByUserId: null })
            .where(
                inArray(
                    premiumFeatureEntitlementTable.id,
                    db
                        .select({ id: premiumFeatureEntitlementTable.id })
                        .from(premiumFeatureEntitlementTable)
                        .where(
                            eq(
                                premiumFeatureEntitlementTable.createdByUserId,
                                userId,
                            ),
                        )
                        .orderBy(premiumFeatureEntitlementTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(premiumFeatureEntitlementTable)
            .set({ updatedByUserId: null })
            .where(
                inArray(
                    premiumFeatureEntitlementTable.id,
                    db
                        .select({ id: premiumFeatureEntitlementTable.id })
                        .from(premiumFeatureEntitlementTable)
                        .where(
                            eq(
                                premiumFeatureEntitlementTable.updatedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(premiumFeatureEntitlementTable.id)
                        .limit(limit),
                ),
            ),
        db
            .update(organizationMembershipAllProjectCapabilityTable)
            .set({ grantedByUserId: null })
            .where(
                inArray(
                    organizationMembershipAllProjectCapabilityTable.id,
                    db
                        .select({
                            id: organizationMembershipAllProjectCapabilityTable.id,
                        })
                        .from(organizationMembershipAllProjectCapabilityTable)
                        .where(
                            eq(
                                organizationMembershipAllProjectCapabilityTable.grantedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(
                            organizationMembershipAllProjectCapabilityTable.id,
                        )
                        .limit(limit),
                ),
            ),
        db
            .update(organizationMembershipAllProjectCapabilityTable)
            .set({ revokedByUserId: null })
            .where(
                inArray(
                    organizationMembershipAllProjectCapabilityTable.id,
                    db
                        .select({
                            id: organizationMembershipAllProjectCapabilityTable.id,
                        })
                        .from(organizationMembershipAllProjectCapabilityTable)
                        .where(
                            eq(
                                organizationMembershipAllProjectCapabilityTable.revokedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(
                            organizationMembershipAllProjectCapabilityTable.id,
                        )
                        .limit(limit),
                ),
            ),
        db
            .update(conversationEmailUpdateScopeSafetyBlockTable)
            .set({ createdByUserId: null })
            .where(
                inArray(
                    conversationEmailUpdateScopeSafetyBlockTable.id,
                    db
                        .select({
                            id: conversationEmailUpdateScopeSafetyBlockTable.id,
                        })
                        .from(conversationEmailUpdateScopeSafetyBlockTable)
                        .where(
                            eq(
                                conversationEmailUpdateScopeSafetyBlockTable.createdByUserId,
                                userId,
                            ),
                        )
                        .orderBy(
                            conversationEmailUpdateScopeSafetyBlockTable.id,
                        )
                        .limit(limit),
                ),
            ),
        db
            .update(conversationEmailUpdateScopeSafetyBlockTable)
            .set({ liftedByUserId: null })
            .where(
                inArray(
                    conversationEmailUpdateScopeSafetyBlockTable.id,
                    db
                        .select({
                            id: conversationEmailUpdateScopeSafetyBlockTable.id,
                        })
                        .from(conversationEmailUpdateScopeSafetyBlockTable)
                        .where(
                            eq(
                                conversationEmailUpdateScopeSafetyBlockTable.liftedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(
                            conversationEmailUpdateScopeSafetyBlockTable.id,
                        )
                        .limit(limit),
                ),
            ),
        db
            .update(conversationEmailUpdateEmailSuppressionTable)
            .set({ liftedByUserId: null })
            .where(
                inArray(
                    conversationEmailUpdateEmailSuppressionTable.id,
                    db
                        .select({
                            id: conversationEmailUpdateEmailSuppressionTable.id,
                        })
                        .from(conversationEmailUpdateEmailSuppressionTable)
                        .where(
                            eq(
                                conversationEmailUpdateEmailSuppressionTable.liftedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(
                            conversationEmailUpdateEmailSuppressionTable.id,
                        )
                        .limit(limit),
                ),
            ),
        db
            .update(conversationEmailUpdateUserComplaintSuppressionTable)
            .set({ liftedByUserId: null })
            .where(
                inArray(
                    conversationEmailUpdateUserComplaintSuppressionTable.id,
                    db
                        .select({
                            id: conversationEmailUpdateUserComplaintSuppressionTable.id,
                        })
                        .from(
                            conversationEmailUpdateUserComplaintSuppressionTable,
                        )
                        .where(
                            eq(
                                conversationEmailUpdateUserComplaintSuppressionTable.liftedByUserId,
                                userId,
                            ),
                        )
                        .orderBy(
                            conversationEmailUpdateUserComplaintSuppressionTable.id,
                        )
                        .limit(limit),
                ),
            ),
    ];
    let updated = 0;
    for (const update of updates) updated += (await update).count;
    return { status: "progress", updated };
}
