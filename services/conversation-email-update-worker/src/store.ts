import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
    and,
    asc,
    count,
    eq,
    exists,
    gt,
    gte,
    inArray,
    isNotNull,
    isNull,
    lte,
    ne,
    notExists,
    or,
    sql,
    type SQLWrapper,
} from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { alias } from "drizzle-orm/pg-core";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import {
    conversationEmailUpdateActionTokenTable,
    conversationEmailUpdateConversationTable,
    conversationEmailUpdateDeliveryAttemptTable,
    conversationEmailUpdateDeliveryTable,
    conversationEmailUpdateEmailSuppressionTable,
    conversationEmailUpdateRecipientConversationTable,
    conversationEmailUpdateRecipientTable,
    conversationEmailUpdateScopeSafetyBlockTable,
    conversationEmailUpdateTable,
    conversationEmailUpdateTestAttemptTable,
    conversationEmailUpdateUserComplaintSuppressionTable,
    conversationEmailUpdateUserConversationPreferenceTable,
    conversationEmailUpdateUserGlobalSettingTable,
    conversationEmailUpdateUserProjectPreferenceTable,
    conversationTable,
    emailTable,
    maxdiffComparisonTable,
    maxdiffResultTable,
    opinionTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    premiumFeatureEntitlementTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userDisplayLanguageTable,
    userTable,
    voteContentTable,
    voteTable,
} from "@/shared-backend/schema.js";
import type { ConversationEmailActionLinks } from "./renderer.js";
import type { ProviderResult } from "./provider.js";
import { buildConversationEmailActionUrls } from "./actionLinks.js";
import { decideMaterializationFailure } from "./materializationTransition.js";
import {
    decideOwnerGate,
    decideSendFinalization,
    decideTerminalDeliveryStatus,
} from "./sendTransition.js";
import { decideTestProviderFinalization } from "./testAttemptTransition.js";

const ENGLISH_DISPLAY_LANGUAGE: SupportedDisplayLanguageCodes = "en";
const DAY_IN_MS = 24 * 60 * 60 * 1_000;
const MATERIALIZATION_MAX_FAILURE_COUNT = 5;
const scopedUpdateConversationTable = alias(
    conversationEmailUpdateConversationTable,
    "scoped_update_conversation",
);
const scopedDeliveryTable = alias(
    conversationEmailUpdateDeliveryTable,
    "scoped_delivery",
);

export interface ClaimedTestWork {
    id: number;
    publicId: string;
    leaseToken: string;
    updateId: number;
    destinationEmail: string;
    destinationEmailCredentialId: number;
    requestedByUserId: string;
    subject: string;
    bodyHtml: string;
    bodyPlainText: string;
    projectTitle: string;
    replyToName: string;
    replyToEmail: string;
    language: SupportedDisplayLanguageCodes;
}

export interface ConversationLink {
    title: string;
    url: string;
}

function leaseExpiryExpression(seconds: number) {
    return sql<Date>`now() + ${seconds} * interval '1 second'`;
}

function currentTimestamp() {
    return sql<Date>`now()`;
}

export function updateIsExclusiveToConversation({
    db,
    updateId,
    conversationId,
}: {
    db: PostgresDatabase;
    updateId: SQLWrapper;
    conversationId: number | undefined;
}) {
    if (conversationId === undefined) return undefined;
    const updateLink = (differentConversation: boolean) =>
        db
            .select({
                conversationId: scopedUpdateConversationTable.conversationId,
            })
            .from(scopedUpdateConversationTable)
            .where(
                and(
                    sql`${scopedUpdateConversationTable.updateId} = ${updateId}`,
                    differentConversation
                        ? ne(
                              scopedUpdateConversationTable.conversationId,
                              conversationId,
                          )
                        : eq(
                              scopedUpdateConversationTable.conversationId,
                              conversationId,
                          ),
                ),
            );
    return and(exists(updateLink(false)), notExists(updateLink(true)));
}

export function deliveryUpdateIsExclusiveToConversation({
    db,
    deliveryId,
    conversationId,
}: {
    db: PostgresDatabase;
    deliveryId: SQLWrapper;
    conversationId: number | undefined;
}) {
    if (conversationId === undefined) return undefined;
    const deliveryUpdateLink = (differentConversation: boolean) =>
        db
            .select({ id: scopedDeliveryTable.id })
            .from(scopedDeliveryTable)
            .innerJoin(
                scopedUpdateConversationTable,
                eq(
                    scopedUpdateConversationTable.updateId,
                    scopedDeliveryTable.updateId,
                ),
            )
            .where(
                and(
                    sql`${scopedDeliveryTable.id} = ${deliveryId}`,
                    differentConversation
                        ? ne(
                              scopedUpdateConversationTable.conversationId,
                              conversationId,
                          )
                        : eq(
                              scopedUpdateConversationTable.conversationId,
                              conversationId,
                          ),
                ),
            );
    return and(
        exists(deliveryUpdateLink(false)),
        notExists(deliveryUpdateLink(true)),
    );
}

export async function claimTestAttempts({
    db,
    workerId,
    batchSize,
    leaseSeconds,
    conversationId,
}: {
    db: PostgresDatabase;
    workerId: string;
    batchSize: number;
    leaseSeconds: number;
    conversationId?: number;
}): Promise<ClaimedTestWork[]> {
    return await db.transaction(async (tx) => {
        const claimable = await tx
            .select({ id: conversationEmailUpdateTestAttemptTable.id })
            .from(conversationEmailUpdateTestAttemptTable)
            .where(
                and(
                    or(
                        eq(
                            conversationEmailUpdateTestAttemptTable.status,
                            "pending",
                        ),
                        and(
                            eq(
                                conversationEmailUpdateTestAttemptTable.status,
                                "claimed",
                            ),
                            lte(
                                conversationEmailUpdateTestAttemptTable.leaseExpiresAt,
                                currentTimestamp(),
                            ),
                        ),
                    ),
                    updateIsExclusiveToConversation({
                        db: tx,
                        updateId:
                            conversationEmailUpdateTestAttemptTable.updateId,
                        conversationId,
                    }),
                ),
            )
            .orderBy(
                asc(conversationEmailUpdateTestAttemptTable.createdAt),
                asc(conversationEmailUpdateTestAttemptTable.id),
            )
            .limit(batchSize)
            .for("update", { skipLocked: true });
        const claimableIds = claimable.map((row) => row.id);
        if (claimableIds.length === 0) return [];

        const leaseToken = randomUUID();
        const claimed = await tx
            .update(conversationEmailUpdateTestAttemptTable)
            .set({
                status: "claimed",
                leaseOwner: workerId,
                leaseToken,
                leaseExpiresAt: leaseExpiryExpression(leaseSeconds),
            })
            .where(
                inArray(
                    conversationEmailUpdateTestAttemptTable.id,
                    claimableIds,
                ),
            )
            .returning({ id: conversationEmailUpdateTestAttemptTable.id });
        const claimedIds = claimed.map((row) => row.id);
        if (claimedIds.length === 0) return [];

        const workRows = await tx
            .select({
                id: conversationEmailUpdateTestAttemptTable.id,
                publicId: conversationEmailUpdateTestAttemptTable.publicId,
                updateId: conversationEmailUpdateTestAttemptTable.updateId,
                destinationEmail:
                    conversationEmailUpdateTestAttemptTable.destinationEmailSnapshot,
                destinationEmailCredentialId:
                    conversationEmailUpdateTestAttemptTable.destinationEmailCredentialId,
                requestedByUserId:
                    conversationEmailUpdateTestAttemptTable.requestedByUserId,
                subject: conversationEmailUpdateTable.subject,
                bodyHtml: conversationEmailUpdateTable.bodyHtml,
                bodyPlainText: conversationEmailUpdateTable.bodyPlainText,
                projectTitle: conversationEmailUpdateTable.projectTitleSnapshot,
                replyToName: conversationEmailUpdateTable.replyToNameSnapshot,
                replyToEmail: conversationEmailUpdateTable.replyToEmailSnapshot,
                language: sql<SupportedDisplayLanguageCodes>`coalesce(${userDisplayLanguageTable.languageCode}, ${ENGLISH_DISPLAY_LANGUAGE})`,
            })
            .from(conversationEmailUpdateTestAttemptTable)
            .innerJoin(
                conversationEmailUpdateTable,
                eq(
                    conversationEmailUpdateTable.id,
                    conversationEmailUpdateTestAttemptTable.updateId,
                ),
            )
            .leftJoin(
                userDisplayLanguageTable,
                eq(
                    userDisplayLanguageTable.userId,
                    conversationEmailUpdateTestAttemptTable.requestedByUserId,
                ),
            )
            .where(
                and(
                    inArray(
                        conversationEmailUpdateTestAttemptTable.id,
                        claimedIds,
                    ),
                    eq(
                        conversationEmailUpdateTestAttemptTable.leaseToken,
                        leaseToken,
                    ),
                ),
            )
            .orderBy(
                asc(conversationEmailUpdateTestAttemptTable.createdAt),
                asc(conversationEmailUpdateTestAttemptTable.id),
            );
        return workRows.map((row) => ({ ...row, leaseToken }));
    });
}

export async function recoverExpiredTestAttemptLeases({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId?: number;
}): Promise<{ sendLeaseCount: number; claimLeaseCount: number }> {
    return await db.transaction(async (tx) => {
        const expiredSends = await tx
            .update(conversationEmailUpdateTestAttemptTable)
            .set({
                status: "unknown",
                errorCategory: "ambiguous",
                errorCode: "LeaseExpired",
                errorDetails: "Worker lease expired after send authorization",
                finishedAt: currentTimestamp(),
                leaseOwner: null,
                leaseToken: null,
                leaseExpiresAt: null,
            })
            .where(
                and(
                    eq(
                        conversationEmailUpdateTestAttemptTable.status,
                        "attempting",
                    ),
                    lte(
                        conversationEmailUpdateTestAttemptTable.leaseExpiresAt,
                        currentTimestamp(),
                    ),
                    updateIsExclusiveToConversation({
                        db: tx,
                        updateId:
                            conversationEmailUpdateTestAttemptTable.updateId,
                        conversationId,
                    }),
                ),
            );
        const expiredClaims = await tx
            .update(conversationEmailUpdateTestAttemptTable)
            .set({
                status: "pending",
                leaseOwner: null,
                leaseToken: null,
                leaseExpiresAt: null,
            })
            .where(
                and(
                    eq(
                        conversationEmailUpdateTestAttemptTable.status,
                        "claimed",
                    ),
                    lte(
                        conversationEmailUpdateTestAttemptTable.leaseExpiresAt,
                        currentTimestamp(),
                    ),
                    updateIsExclusiveToConversation({
                        db: tx,
                        updateId:
                            conversationEmailUpdateTestAttemptTable.updateId,
                        conversationId,
                    }),
                ),
            );
        return {
            sendLeaseCount: expiredSends.count,
            claimLeaseCount: expiredClaims.count,
        };
    });
}

export async function authorizeTestAttempt({
    db,
    work,
}: {
    db: PostgresDatabase;
    work: ClaimedTestWork;
}): Promise<boolean> {
    const membershipCapability = db
        .select({ id: organizationMembershipTable.id })
        .from(organizationMembershipTable)
        .innerJoin(
            organizationMembershipAllProjectCapabilityTable,
            and(
                eq(
                    organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                    organizationMembershipTable.id,
                ),
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    "conversation_email_update",
                ),
            ),
        )
        .where(
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    conversationEmailUpdateTable.authorizingOrganizationId,
                ),
                eq(
                    organizationMembershipTable.userId,
                    conversationEmailUpdateTestAttemptTable.requestedByUserId,
                ),
                isNull(organizationMembershipTable.deletedAt),
            ),
        );
    const scopedConversation = db
        .select({
            conversationId:
                conversationEmailUpdateConversationTable.conversationId,
        })
        .from(conversationEmailUpdateConversationTable)
        .where(
            and(
                eq(
                    conversationEmailUpdateConversationTable.updateId,
                    conversationEmailUpdateTable.id,
                ),
                eq(
                    conversationEmailUpdateConversationTable.conversationId,
                    conversationEmailUpdateScopeSafetyBlockTable.conversationId,
                ),
            ),
        );
    const activeSafetyBlock = db
        .select({ id: conversationEmailUpdateScopeSafetyBlockTable.id })
        .from(conversationEmailUpdateScopeSafetyBlockTable)
        .where(
            and(
                isNull(conversationEmailUpdateScopeSafetyBlockTable.liftedAt),
                or(
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "project",
                        ),
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.projectId,
                            conversationEmailUpdateTable.projectId,
                        ),
                    ),
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "organization",
                        ),
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.organizationId,
                            conversationEmailUpdateTable.authorizingOrganizationId,
                        ),
                    ),
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "facilitator",
                        ),
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.facilitatorUserId,
                            conversationEmailUpdateTestAttemptTable.requestedByUserId,
                        ),
                    ),
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "conversation",
                        ),
                        exists(scopedConversation),
                    ),
                ),
            ),
        );
    const authorization = db
        .select({ id: conversationEmailUpdateTable.id })
        .from(conversationEmailUpdateTable)
        .innerJoin(
            emailTable,
            and(
                eq(
                    emailTable.id,
                    conversationEmailUpdateTestAttemptTable.destinationEmailCredentialId,
                ),
                eq(
                    emailTable.userId,
                    conversationEmailUpdateTestAttemptTable.requestedByUserId,
                ),
                eq(
                    emailTable.email,
                    conversationEmailUpdateTestAttemptTable.destinationEmailSnapshot,
                ),
                eq(emailTable.type, "primary"),
                eq(emailTable.isDeleted, false),
            ),
        )
        .innerJoin(
            userTable,
            and(
                eq(
                    userTable.id,
                    conversationEmailUpdateTestAttemptTable.requestedByUserId,
                ),
                eq(userTable.isDeleted, false),
            ),
        )
        .innerJoin(
            premiumFeatureEntitlementTable,
            and(
                eq(
                    premiumFeatureEntitlementTable.id,
                    conversationEmailUpdateTable.authorizingPremiumFeatureId,
                ),
                eq(
                    premiumFeatureEntitlementTable.organizationId,
                    conversationEmailUpdateTable.authorizingOrganizationId,
                ),
                eq(
                    premiumFeatureEntitlementTable.feature,
                    "conversation_email_update",
                ),
                lte(
                    premiumFeatureEntitlementTable.startsAt,
                    currentTimestamp(),
                ),
                isNull(premiumFeatureEntitlementTable.revokedAt),
                or(
                    isNull(premiumFeatureEntitlementTable.expiresAt),
                    gt(
                        premiumFeatureEntitlementTable.expiresAt,
                        currentTimestamp(),
                    ),
                ),
            ),
        )
        .where(
            and(
                eq(
                    conversationEmailUpdateTable.id,
                    conversationEmailUpdateTestAttemptTable.updateId,
                ),
                eq(
                    conversationEmailUpdateTable.createdByUserId,
                    conversationEmailUpdateTestAttemptTable.requestedByUserId,
                ),
                exists(membershipCapability),
                notExists(activeSafetyBlock),
            ),
        );
    const authorized = await db
        .update(conversationEmailUpdateTestAttemptTable)
        .set({ status: "claimed" })
        .where(
            and(
                eq(conversationEmailUpdateTestAttemptTable.id, work.id),
                eq(
                    conversationEmailUpdateTestAttemptTable.leaseToken,
                    work.leaseToken,
                ),
                eq(conversationEmailUpdateTestAttemptTable.status, "claimed"),
                exists(authorization),
            ),
        )
        .returning({ id: conversationEmailUpdateTestAttemptTable.id });
    if (authorized.length > 0) return true;

    await db
        .update(conversationEmailUpdateTestAttemptTable)
        .set({
            status: "permanent_rejected",
            authorizedAt: currentTimestamp(),
            errorCategory: "permanent",
            errorCode: "authorization_failed",
            errorDetails:
                "The requester, entitlement, scope, or frozen credential is no longer authorized",
            finishedAt: currentTimestamp(),
            leaseOwner: null,
            leaseToken: null,
            leaseExpiresAt: null,
        })
        .where(
            and(
                eq(conversationEmailUpdateTestAttemptTable.id, work.id),
                eq(
                    conversationEmailUpdateTestAttemptTable.leaseToken,
                    work.leaseToken,
                ),
            ),
        );
    return false;
}

export async function markTestAttempting({
    db,
    work,
    leaseSeconds,
}: {
    db: PostgresDatabase;
    work: ClaimedTestWork;
    leaseSeconds: number;
}): Promise<boolean> {
    const started = await db
        .update(conversationEmailUpdateTestAttemptTable)
        .set({
            status: "attempting",
            authorizedAt: currentTimestamp(),
            leaseExpiresAt: leaseExpiryExpression(leaseSeconds),
        })
        .where(
            and(
                eq(conversationEmailUpdateTestAttemptTable.id, work.id),
                eq(
                    conversationEmailUpdateTestAttemptTable.leaseToken,
                    work.leaseToken,
                ),
                eq(conversationEmailUpdateTestAttemptTable.status, "claimed"),
                gt(
                    conversationEmailUpdateTestAttemptTable.leaseExpiresAt,
                    currentTimestamp(),
                ),
            ),
        )
        .returning({ id: conversationEmailUpdateTestAttemptTable.id });
    return started.length > 0;
}

export async function finalizeTestAttempt({
    db,
    work,
    result,
}: {
    db: PostgresDatabase;
    work: ClaimedTestWork;
    result: ProviderResult;
}): Promise<void> {
    await db.transaction(async (tx) => {
        const attempt = (
            await tx
                .select({
                    status: conversationEmailUpdateTestAttemptTable.status,
                    leaseToken:
                        conversationEmailUpdateTestAttemptTable.leaseToken,
                    providerMessageId:
                        conversationEmailUpdateTestAttemptTable.providerMessageId,
                })
                .from(conversationEmailUpdateTestAttemptTable)
                .where(eq(conversationEmailUpdateTestAttemptTable.id, work.id))
                .limit(1)
                .for("update")
        ).at(0);
        if (attempt === undefined) return;

        const decision = decideTestProviderFinalization({
            status: attempt.status,
            providerMessageId: attempt.providerMessageId,
            leaseMatches: attempt.leaseToken === work.leaseToken,
            result,
        });
        if (decision.kind === "no_change") return;

        await tx
            .update(conversationEmailUpdateTestAttemptTable)
            .set({
                status:
                    decision.kind === "provider_accepted"
                        ? "provider_accepted"
                        : decision.status,
                providerMessageId:
                    decision.kind === "provider_accepted"
                        ? decision.messageId
                        : attempt.providerMessageId,
                errorCategory:
                    decision.kind === "provider_accepted"
                        ? null
                        : decision.errorCategory,
                errorCode:
                    decision.kind === "provider_accepted"
                        ? null
                        : decision.code,
                errorDetails:
                    decision.kind === "provider_accepted"
                        ? null
                        : decision.details,
                finishedAt: currentTimestamp(),
                leaseOwner: null,
                leaseToken: null,
                leaseExpiresAt: null,
            })
            .where(eq(conversationEmailUpdateTestAttemptTable.id, work.id));
    });
}

export async function getUpdateConversationLinks({
    db,
    updateId,
    recipientId,
    siteBaseUrl,
}: {
    db: PostgresDatabase;
    updateId: number;
    recipientId: bigint | undefined;
    siteBaseUrl: string;
}): Promise<ConversationLink[]> {
    const recipientScope = db
        .select({
            conversationId:
                conversationEmailUpdateRecipientConversationTable.conversationId,
        })
        .from(conversationEmailUpdateRecipientConversationTable)
        .where(
            and(
                recipientId === undefined
                    ? undefined
                    : eq(
                          conversationEmailUpdateRecipientConversationTable.recipientId,
                          recipientId,
                      ),
                eq(
                    conversationEmailUpdateRecipientConversationTable.conversationId,
                    conversationEmailUpdateConversationTable.conversationId,
                ),
            ),
        );
    const rows = await db
        .select({
            title: conversationEmailUpdateConversationTable.conversationTitleSnapshot,
            slugId: conversationTable.slugId,
            projectSlug: projectTable.slug,
            scopeKind: conversationEmailUpdateTable.scopeKind,
        })
        .from(conversationEmailUpdateConversationTable)
        .innerJoin(
            conversationEmailUpdateTable,
            eq(
                conversationEmailUpdateTable.id,
                conversationEmailUpdateConversationTable.updateId,
            ),
        )
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationEmailUpdateConversationTable.conversationId,
            ),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationEmailUpdateTable.projectId),
        )
        .where(
            and(
                eq(conversationEmailUpdateConversationTable.updateId, updateId),
                recipientId === undefined ? undefined : exists(recipientScope),
            ),
        )
        .orderBy(
            asc(
                conversationEmailUpdateConversationTable.conversationTitleSnapshot,
            ),
            asc(conversationEmailUpdateConversationTable.conversationId),
        );
    const baseUrl = new URL(siteBaseUrl);
    return rows.map((row) => {
        const path =
            row.scopeKind === "listed_project"
                ? `/project/${encodeURIComponent(row.projectSlug)}/conversation/${encodeURIComponent(row.slugId)}/`
                : `/conversation/${encodeURIComponent(row.slugId)}/`;
        return { title: row.title, url: new URL(path, baseUrl).toString() };
    });
}

export type MaterializationResult =
    | {
          kind: "page";
          deliveryId: number;
          pageCandidateCount: number;
          insertedCount: number;
          materializedParticipantCount: number;
          frequencyCappedCount: number;
          ineligibleCount: number;
          exhausted: boolean;
      }
    | {
          kind: "stopped";
          deliveryId: number;
          reason: "legal_or_abuse_block";
      }
    | {
          kind: "failed";
          deliveryId: number;
          reason: "incomplete_owner_copy_scope";
      }
    | {
          kind: "failed";
          deliveryId: number;
          reason: "materialization_retry_exhausted";
      }
    | {
          kind: "failed";
          deliveryId: number;
          reason: "no_eligible_participants";
          pageCandidateCount: number;
          insertedCount: number;
          materializedParticipantCount: number;
          frequencyCappedCount: number;
          ineligibleCount: number;
      };

async function isScopeBlocked({
    db,
    updateId,
    projectId,
    organizationId,
    facilitatorUserId,
}: {
    db: PostgresDatabase;
    updateId: number;
    projectId: number;
    organizationId: number;
    facilitatorUserId: string;
}): Promise<boolean> {
    const scopedConversation = db
        .select({
            conversationId:
                conversationEmailUpdateConversationTable.conversationId,
        })
        .from(conversationEmailUpdateConversationTable)
        .where(
            and(
                eq(conversationEmailUpdateConversationTable.updateId, updateId),
                eq(
                    conversationEmailUpdateConversationTable.conversationId,
                    conversationEmailUpdateScopeSafetyBlockTable.conversationId,
                ),
            ),
        );
    const owningOrganization = db
        .select({ id: projectOrganizationOwnershipTable.id })
        .from(projectOrganizationOwnershipTable)
        .where(
            and(
                eq(projectOrganizationOwnershipTable.projectId, projectId),
                eq(
                    projectOrganizationOwnershipTable.organizationId,
                    conversationEmailUpdateScopeSafetyBlockTable.organizationId,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        );
    const rows = await db
        .select({ id: conversationEmailUpdateScopeSafetyBlockTable.id })
        .from(conversationEmailUpdateScopeSafetyBlockTable)
        .where(
            and(
                isNull(conversationEmailUpdateScopeSafetyBlockTable.liftedAt),
                or(
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "project",
                        ),
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.projectId,
                            projectId,
                        ),
                    ),
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "facilitator",
                        ),
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.facilitatorUserId,
                            facilitatorUserId,
                        ),
                    ),
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "organization",
                        ),
                        or(
                            eq(
                                conversationEmailUpdateScopeSafetyBlockTable.organizationId,
                                organizationId,
                            ),
                            exists(owningOrganization),
                        ),
                    ),
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "conversation",
                        ),
                        exists(scopedConversation),
                    ),
                ),
            ),
        )
        .limit(1);
    return rows.length > 0;
}

async function hasCompletePersistedOwnerCopies({
    tx,
    deliveryId,
    updateId,
    requiredOwnerCopyCount,
}: {
    tx: PostgresDatabase;
    deliveryId: number;
    updateId: number;
    requiredOwnerCopyCount: number;
}): Promise<boolean> {
    const ownerRecipients = await tx
        .select({ id: conversationEmailUpdateRecipientTable.id })
        .from(conversationEmailUpdateRecipientTable)
        .where(
            and(
                eq(
                    conversationEmailUpdateRecipientTable.deliveryId,
                    deliveryId,
                ),
                eq(
                    conversationEmailUpdateRecipientTable.kind,
                    "conversation_owner_copy",
                ),
            ),
        );
    if (ownerRecipients.length !== requiredOwnerCopyCount) return false;
    const scopes = await tx
        .select({
            conversationId:
                conversationEmailUpdateConversationTable.conversationId,
        })
        .from(conversationEmailUpdateConversationTable)
        .where(eq(conversationEmailUpdateConversationTable.updateId, updateId));
    if (scopes.length === 0) return false;
    const ownerScopes = await tx
        .select({
            recipientId:
                conversationEmailUpdateRecipientConversationTable.recipientId,
            conversationId:
                conversationEmailUpdateRecipientConversationTable.conversationId,
        })
        .from(conversationEmailUpdateRecipientConversationTable)
        .innerJoin(
            conversationEmailUpdateRecipientTable,
            and(
                eq(
                    conversationEmailUpdateRecipientTable.id,
                    conversationEmailUpdateRecipientConversationTable.recipientId,
                ),
                eq(
                    conversationEmailUpdateRecipientTable.deliveryId,
                    deliveryId,
                ),
                eq(
                    conversationEmailUpdateRecipientTable.kind,
                    "conversation_owner_copy",
                ),
            ),
        )
        .where(
            eq(
                conversationEmailUpdateRecipientConversationTable.deliveryId,
                deliveryId,
            ),
        );
    const expectedConversationIds = new Set(
        scopes.map((scope) => scope.conversationId),
    );
    const scopeByRecipientId = new Map<bigint, Set<number>>();
    for (const ownerScope of ownerScopes) {
        const recipientScopes =
            scopeByRecipientId.get(ownerScope.recipientId) ?? new Set<number>();
        recipientScopes.add(ownerScope.conversationId);
        scopeByRecipientId.set(ownerScope.recipientId, recipientScopes);
    }
    return ownerRecipients.every((recipient) => {
        const recipientScopes = scopeByRecipientId.get(recipient.id);
        return (
            recipientScopes?.size === expectedConversationIds.size &&
            [...expectedConversationIds].every((conversationId) =>
                recipientScopes.has(conversationId),
            )
        );
    });
}

async function recordMaterializationFailure({
    db,
    deliveryId,
    error,
}: {
    db: PostgresDatabase;
    deliveryId: number;
    error: unknown;
}): Promise<
    | Extract<
          MaterializationResult,
          { kind: "failed"; reason: "materialization_retry_exhausted" }
      >
    | undefined
> {
    const details =
        error instanceof Error
            ? error.message
            : "Unknown materialization error";
    return await db.transaction(async (tx) => {
        const delivery = (
            await tx
                .select({
                    failureCount:
                        conversationEmailUpdateDeliveryTable.materializationAttemptCount,
                })
                .from(conversationEmailUpdateDeliveryTable)
                .where(
                    and(
                        eq(conversationEmailUpdateDeliveryTable.id, deliveryId),
                        eq(
                            conversationEmailUpdateDeliveryTable.status,
                            "preparing",
                        ),
                    ),
                )
                .for("update")
        ).at(0);
        if (delivery === undefined) return;
        const decision = decideMaterializationFailure({
            previousFailureCount: delivery.failureCount,
            maximumFailureCount: MATERIALIZATION_MAX_FAILURE_COUNT,
        });
        await tx
            .update(conversationEmailUpdateDeliveryTable)
            .set(
                decision.kind === "failed"
                    ? {
                          status: "failed",
                          failureReason: "materialization_failed",
                          materializationAttemptCount: decision.failureCount,
                          materializationLastError: details,
                          failedAt: currentTimestamp(),
                          updatedAt: currentTimestamp(),
                      }
                    : {
                          materializationAttemptCount: decision.failureCount,
                          materializationLastError: details,
                          updatedAt: currentTimestamp(),
                      },
            )
            .where(
                and(
                    eq(conversationEmailUpdateDeliveryTable.id, deliveryId),
                    eq(
                        conversationEmailUpdateDeliveryTable.status,
                        "preparing",
                    ),
                ),
            );
        return decision.kind === "failed"
            ? {
                  kind: "failed",
                  deliveryId,
                  reason: "materialization_retry_exhausted",
              }
            : undefined;
    });
}

export async function materializeOneDeliveryPage({
    db,
    pageSize,
    conversationId,
}: {
    db: PostgresDatabase;
    pageSize: number;
    conversationId?: number;
}): Promise<MaterializationResult | undefined> {
    let selectedDeliveryId: number | undefined;
    try {
        return await db.transaction(async (tx) => {
            const delivery = (
                await tx
                    .select({
                        deliveryId: conversationEmailUpdateDeliveryTable.id,
                        updateId: conversationEmailUpdateDeliveryTable.updateId,
                        projectId:
                            conversationEmailUpdateDeliveryTable.projectId,
                        requiredOwnerCopyCount:
                            conversationEmailUpdateDeliveryTable.requiredOwnerCopyCount,
                        cursorUserId:
                            conversationEmailUpdateDeliveryTable.materializationCursorUserId,
                        audienceCutoffAt:
                            conversationEmailUpdateDeliveryTable.audienceCutoffAt,
                        materializedParticipantCount:
                            conversationEmailUpdateDeliveryTable.materializedParticipantCount,
                        scopeKind: conversationEmailUpdateTable.scopeKind,
                        createdByUserId:
                            conversationEmailUpdateTable.createdByUserId,
                        authorizingOrganizationId:
                            conversationEmailUpdateTable.authorizingOrganizationId,
                    })
                    .from(conversationEmailUpdateDeliveryTable)
                    .innerJoin(
                        conversationEmailUpdateTable,
                        eq(
                            conversationEmailUpdateTable.id,
                            conversationEmailUpdateDeliveryTable.updateId,
                        ),
                    )
                    .where(
                        and(
                            eq(
                                conversationEmailUpdateDeliveryTable.status,
                                "preparing",
                            ),
                            or(
                                isNull(
                                    conversationEmailUpdateDeliveryTable.materializationLastError,
                                ),
                                lte(
                                    conversationEmailUpdateDeliveryTable.updatedAt,
                                    sql<Date>`now() - interval '30 seconds'`,
                                ),
                            ),
                            updateIsExclusiveToConversation({
                                db: tx,
                                updateId:
                                    conversationEmailUpdateDeliveryTable.updateId,
                                conversationId,
                            }),
                        ),
                    )
                    .orderBy(asc(conversationEmailUpdateDeliveryTable.id))
                    .limit(1)
                    .for("update", { skipLocked: true })
            ).at(0);
            if (delivery === undefined) return undefined;
            selectedDeliveryId = delivery.deliveryId;

            const blocked = await isScopeBlocked({
                db: tx,
                updateId: delivery.updateId,
                projectId: delivery.projectId,
                organizationId: delivery.authorizingOrganizationId,
                facilitatorUserId: delivery.createdByUserId,
            });
            if (blocked) {
                await markDeliveryStopping({
                    tx,
                    deliveryId: delivery.deliveryId,
                    reason: "legal_or_abuse_block",
                });
                return {
                    kind: "stopped",
                    deliveryId: delivery.deliveryId,
                    reason: "legal_or_abuse_block",
                };
            }

            if (delivery.cursorUserId === null) {
                const hasCompleteOwners = await hasCompletePersistedOwnerCopies(
                    {
                        tx,
                        deliveryId: delivery.deliveryId,
                        updateId: delivery.updateId,
                        requiredOwnerCopyCount: delivery.requiredOwnerCopyCount,
                    },
                );
                if (!hasCompleteOwners) {
                    await tx
                        .update(conversationEmailUpdateDeliveryTable)
                        .set({
                            status: "failed",
                            failureReason: "materialization_failed",
                            materializationAttemptCount: sql<number>`${conversationEmailUpdateDeliveryTable.materializationAttemptCount} + 1`,
                            materializationLastError:
                                "Persisted mandatory owner-copy scope is incomplete",
                            failedAt: currentTimestamp(),
                            updatedAt: currentTimestamp(),
                        })
                        .where(
                            eq(
                                conversationEmailUpdateDeliveryTable.id,
                                delivery.deliveryId,
                            ),
                        );
                    return {
                        kind: "failed",
                        deliveryId: delivery.deliveryId,
                        reason: "incomplete_owner_copy_scope",
                    };
                }
            }

            const participation = tx
                .select({
                    userId: voteTable.authorId,
                    conversationId: opinionTable.conversationId,
                    createdAt: voteContentTable.createdAt,
                })
                .from(voteContentTable)
                .innerJoin(voteTable, eq(voteTable.id, voteContentTable.voteId))
                .innerJoin(
                    opinionTable,
                    eq(opinionTable.id, voteTable.opinionId),
                )
                .unionAll(
                    tx
                        .select({
                            userId: maxdiffResultTable.participantId,
                            conversationId: maxdiffResultTable.conversationId,
                            createdAt: maxdiffComparisonTable.createdAt,
                        })
                        .from(maxdiffComparisonTable)
                        .innerJoin(
                            maxdiffResultTable,
                            eq(
                                maxdiffResultTable.id,
                                maxdiffComparisonTable.maxdiffResultId,
                            ),
                        ),
                )
                .as("participation");
            const qualified = tx
                .selectDistinct({
                    userId: participation.userId,
                    conversationId: participation.conversationId,
                })
                .from(participation)
                .innerJoin(
                    conversationEmailUpdateConversationTable,
                    and(
                        eq(
                            conversationEmailUpdateConversationTable.updateId,
                            delivery.updateId,
                        ),
                        eq(
                            conversationEmailUpdateConversationTable.conversationId,
                            participation.conversationId,
                        ),
                    ),
                )
                .leftJoin(
                    conversationEmailUpdateUserProjectPreferenceTable,
                    and(
                        eq(
                            conversationEmailUpdateUserProjectPreferenceTable.userId,
                            participation.userId,
                        ),
                        eq(
                            conversationEmailUpdateUserProjectPreferenceTable.projectId,
                            delivery.projectId,
                        ),
                    ),
                )
                .leftJoin(
                    conversationEmailUpdateUserConversationPreferenceTable,
                    and(
                        eq(
                            conversationEmailUpdateUserConversationPreferenceTable.userId,
                            participation.userId,
                        ),
                        eq(
                            conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                            participation.conversationId,
                        ),
                    ),
                )
                .where(
                    and(
                        lte(participation.createdAt, delivery.audienceCutoffAt),
                        delivery.scopeKind === "listed_project"
                            ? and(
                                  eq(
                                      conversationEmailUpdateUserProjectPreferenceTable.enabled,
                                      true,
                                  ),
                                  lte(
                                      conversationEmailUpdateUserProjectPreferenceTable.choiceAt,
                                      delivery.audienceCutoffAt,
                                  ),
                                  or(
                                      isNull(
                                          conversationEmailUpdateUserConversationPreferenceTable.userId,
                                      ),
                                      and(
                                          eq(
                                              conversationEmailUpdateUserConversationPreferenceTable.enabled,
                                              true,
                                          ),
                                          lte(
                                              conversationEmailUpdateUserConversationPreferenceTable.choiceAt,
                                              delivery.audienceCutoffAt,
                                          ),
                                      ),
                                  ),
                              )
                            : and(
                                  eq(
                                      conversationEmailUpdateUserConversationPreferenceTable.enabled,
                                      true,
                                  ),
                                  lte(
                                      conversationEmailUpdateUserConversationPreferenceTable.choiceAt,
                                      delivery.audienceCutoffAt,
                                  ),
                              ),
                    ),
                )
                .as("qualified");
            const candidates = await tx
                .select({ userId: qualified.userId })
                .from(qualified)
                .where(
                    delivery.cursorUserId === null
                        ? undefined
                        : gt(qualified.userId, delivery.cursorUserId),
                )
                .groupBy(qualified.userId)
                .orderBy(asc(qualified.userId))
                .limit(pageSize);
            const candidateUserIds = candidates.map(
                (candidate) => candidate.userId,
            );
            const lastUserId = candidates.at(-1)?.userId;

            let insertedCount = 0;
            let materializedParticipantCount = 0;
            let frequencyCappedCount = 0;
            let ineligibleCount = 0;
            if (candidateUserIds.length > 0) {
                const existingRecipientRows = await tx
                    .select({
                        userId: conversationEmailUpdateRecipientTable.userId,
                    })
                    .from(conversationEmailUpdateRecipientTable)
                    .where(
                        and(
                            eq(
                                conversationEmailUpdateRecipientTable.deliveryId,
                                delivery.deliveryId,
                            ),
                            inArray(
                                conversationEmailUpdateRecipientTable.userId,
                                candidateUserIds,
                            ),
                        ),
                    );
                const existingRecipientUserIds = new Set(
                    existingRecipientRows.map((row) => row.userId),
                );
                const accountRows = await tx
                    .select({
                        userId: userTable.id,
                        emailId: emailTable.id,
                        email: emailTable.email,
                        displayLanguage: sql<SupportedDisplayLanguageCodes>`coalesce(${userDisplayLanguageTable.languageCode}, ${ENGLISH_DISPLAY_LANGUAGE})`,
                        pausedAt:
                            conversationEmailUpdateUserGlobalSettingTable.pausedAt,
                    })
                    .from(userTable)
                    .innerJoin(
                        emailTable,
                        and(
                            eq(emailTable.userId, userTable.id),
                            eq(emailTable.type, "primary"),
                            eq(emailTable.isDeleted, false),
                            lte(
                                emailTable.createdAt,
                                delivery.audienceCutoffAt,
                            ),
                        ),
                    )
                    .leftJoin(
                        userDisplayLanguageTable,
                        eq(userDisplayLanguageTable.userId, userTable.id),
                    )
                    .leftJoin(
                        conversationEmailUpdateUserGlobalSettingTable,
                        eq(
                            conversationEmailUpdateUserGlobalSettingTable.userId,
                            userTable.id,
                        ),
                    )
                    .where(
                        and(
                            inArray(userTable.id, candidateUserIds),
                            eq(userTable.isDeleted, false),
                        ),
                    );
                const complaintRows = await tx
                    .select({
                        userId: conversationEmailUpdateUserComplaintSuppressionTable.userId,
                    })
                    .from(conversationEmailUpdateUserComplaintSuppressionTable)
                    .where(
                        and(
                            inArray(
                                conversationEmailUpdateUserComplaintSuppressionTable.userId,
                                candidateUserIds,
                            ),
                            isNull(
                                conversationEmailUpdateUserComplaintSuppressionTable.liftedAt,
                            ),
                        ),
                    );
                const candidateEmails = accountRows.map((row) => row.email);
                const emailSuppressionRows =
                    candidateEmails.length === 0
                        ? []
                        : await tx
                              .select({
                                  email: conversationEmailUpdateEmailSuppressionTable.canonicalEmail,
                              })
                              .from(
                                  conversationEmailUpdateEmailSuppressionTable,
                              )
                              .where(
                                  and(
                                      inArray(
                                          conversationEmailUpdateEmailSuppressionTable.canonicalEmail,
                                          candidateEmails,
                                      ),
                                      isNull(
                                          conversationEmailUpdateEmailSuppressionTable.liftedAt,
                                      ),
                                  ),
                              );
                const frequencyRows = await tx
                    .selectDistinct({
                        userId: conversationEmailUpdateRecipientTable.userId,
                    })
                    .from(conversationEmailUpdateRecipientTable)
                    .innerJoin(
                        conversationEmailUpdateDeliveryTable,
                        eq(
                            conversationEmailUpdateDeliveryTable.id,
                            conversationEmailUpdateRecipientTable.deliveryId,
                        ),
                    )
                    .where(
                        and(
                            inArray(
                                conversationEmailUpdateRecipientTable.userId,
                                candidateUserIds,
                            ),
                            eq(
                                conversationEmailUpdateDeliveryTable.projectId,
                                delivery.projectId,
                            ),
                            ne(
                                conversationEmailUpdateRecipientTable.deliveryId,
                                delivery.deliveryId,
                            ),
                            inArray(
                                conversationEmailUpdateRecipientTable.status,
                                ["provider_accepted", "unknown"],
                            ),
                            gte(
                                sql<Date>`coalesce(${conversationEmailUpdateRecipientTable.providerAcceptedAt}, ${conversationEmailUpdateRecipientTable.unknownAt})`,
                                new Date(
                                    delivery.audienceCutoffAt.getTime() -
                                        DAY_IN_MS,
                                ),
                            ),
                        ),
                    );
                const accountsByUserId = new Map(
                    accountRows.map((row) => [row.userId, row]),
                );
                const complaintUserIds = new Set(
                    complaintRows.map((row) => row.userId),
                );
                const suppressedEmails = new Set(
                    emailSuppressionRows.map((row) => row.email),
                );
                const frequencyCappedUserIds = new Set(
                    frequencyRows.map((row) => row.userId),
                );
                const materialized: (typeof conversationEmailUpdateRecipientTable.$inferInsert)[] =
                    [];
                for (const userId of candidateUserIds) {
                    if (existingRecipientUserIds.has(userId)) continue;
                    const account = accountsByUserId.get(userId);
                    const eligible =
                        account?.pausedAt === null &&
                        !complaintUserIds.has(userId) &&
                        !suppressedEmails.has(account.email);
                    const frequencyCapped = frequencyCappedUserIds.has(userId);
                    if (frequencyCapped) frequencyCappedCount += 1;
                    if (!eligible) ineligibleCount += 1;
                    if (!eligible || frequencyCapped) continue;
                    materializedParticipantCount += 1;
                    materialized.push({
                        deliveryId: delivery.deliveryId,
                        userId,
                        kind: "participant",
                        status: "pending",
                        materializedEmailCredentialId: account.emailId,
                        materializedEmailSnapshot: account.email,
                        displayLanguage: account.displayLanguage,
                    });
                }
                if (materialized.length > 0) {
                    const inserted = await tx
                        .insert(conversationEmailUpdateRecipientTable)
                        .values(materialized)
                        .onConflictDoNothing()
                        .returning({
                            id: conversationEmailUpdateRecipientTable.id,
                        });
                    insertedCount = inserted.length;
                }

                const qualifiedScopes = await tx
                    .select({
                        userId: qualified.userId,
                        conversationId: qualified.conversationId,
                    })
                    .from(qualified)
                    .where(inArray(qualified.userId, candidateUserIds));
                const pageRecipients = await tx
                    .select({
                        id: conversationEmailUpdateRecipientTable.id,
                        userId: conversationEmailUpdateRecipientTable.userId,
                    })
                    .from(conversationEmailUpdateRecipientTable)
                    .where(
                        and(
                            eq(
                                conversationEmailUpdateRecipientTable.deliveryId,
                                delivery.deliveryId,
                            ),
                            inArray(
                                conversationEmailUpdateRecipientTable.userId,
                                candidateUserIds,
                            ),
                        ),
                    );
                const recipientByUserId = new Map(
                    pageRecipients.map((recipient) => [
                        recipient.userId,
                        recipient,
                    ]),
                );
                const scopeValues = qualifiedScopes.flatMap((scope) => {
                    const recipient = recipientByUserId.get(scope.userId);
                    return recipient === undefined
                        ? []
                        : [
                              {
                                  recipientId: recipient.id,
                                  deliveryId: delivery.deliveryId,
                                  updateId: delivery.updateId,
                                  conversationId: scope.conversationId,
                              },
                          ];
                });
                if (scopeValues.length > 0) {
                    await tx
                        .insert(
                            conversationEmailUpdateRecipientConversationTable,
                        )
                        .values(scopeValues)
                        .onConflictDoNothing();
                }
            }

            const exhausted = candidateUserIds.length < pageSize;
            await tx
                .update(conversationEmailUpdateDeliveryTable)
                .set({
                    materializationCursorUserId:
                        lastUserId ??
                        conversationEmailUpdateDeliveryTable.materializationCursorUserId,
                    materializedParticipantCount: sql<number>`${conversationEmailUpdateDeliveryTable.materializedParticipantCount} + ${materializedParticipantCount}`,
                    frequencyCappedCount: sql<number>`${conversationEmailUpdateDeliveryTable.frequencyCappedCount} + ${frequencyCappedCount}`,
                    ineligibleCount: sql<number>`${conversationEmailUpdateDeliveryTable.ineligibleCount} + ${ineligibleCount}`,
                    materializationLastError: null,
                    updatedAt: currentTimestamp(),
                })
                .where(
                    eq(
                        conversationEmailUpdateDeliveryTable.id,
                        delivery.deliveryId,
                    ),
                );
            if (exhausted) {
                const totalMaterialized =
                    delivery.materializedParticipantCount +
                    materializedParticipantCount;
                await tx
                    .update(conversationEmailUpdateDeliveryTable)
                    .set(
                        totalMaterialized === 0
                            ? {
                                  status: "failed",
                                  failureReason: "no_eligible_participants",
                                  failedAt: currentTimestamp(),
                                  updatedAt: currentTimestamp(),
                              }
                            : {
                                  status: "queued",
                                  failureReason: null,
                                  materializedAt: currentTimestamp(),
                                  dispatchTurnAt: currentTimestamp(),
                                  updatedAt: currentTimestamp(),
                              },
                    )
                    .where(
                        eq(
                            conversationEmailUpdateDeliveryTable.id,
                            delivery.deliveryId,
                        ),
                    );
                if (totalMaterialized === 0) {
                    return {
                        kind: "failed",
                        deliveryId: delivery.deliveryId,
                        reason: "no_eligible_participants",
                        pageCandidateCount: candidateUserIds.length,
                        insertedCount,
                        materializedParticipantCount,
                        frequencyCappedCount,
                        ineligibleCount,
                    };
                }
            }
            return {
                kind: "page",
                deliveryId: delivery.deliveryId,
                pageCandidateCount: candidateUserIds.length,
                insertedCount,
                materializedParticipantCount,
                frequencyCappedCount,
                ineligibleCount,
                exhausted,
            };
        });
    } catch (error: unknown) {
        if (selectedDeliveryId !== undefined) {
            const terminalFailure = await recordMaterializationFailure({
                db,
                deliveryId: selectedDeliveryId,
                error,
            });
            if (terminalFailure !== undefined) return terminalFailure;
        }
        throw error;
    }
}

async function markDeliveryStopping({
    tx,
    deliveryId,
    reason,
}: {
    tx: PostgresDatabase;
    deliveryId: number;
    reason: "global_kill_switch" | "legal_or_abuse_block";
}): Promise<void> {
    await tx
        .update(conversationEmailUpdateDeliveryTable)
        .set({
            status: "stopping",
            stopReason: reason,
            stoppingAt: currentTimestamp(),
            updatedAt: currentTimestamp(),
        })
        .where(
            and(
                eq(conversationEmailUpdateDeliveryTable.id, deliveryId),
                inArray(conversationEmailUpdateDeliveryTable.status, [
                    "preparing",
                    "queued",
                    "sending",
                ]),
            ),
        );
    await tx
        .update(conversationEmailUpdateRecipientTable)
        .set({
            status: "skipped",
            skipReason: "delivery_stopped",
            nextAttemptAt: null,
            failureCode: null,
            failureDetails: null,
            skippedAt: currentTimestamp(),
            leaseOwner: null,
            leaseToken: null,
            leaseExpiresAt: null,
            updatedAt: currentTimestamp(),
        })
        .where(
            and(
                eq(
                    conversationEmailUpdateRecipientTable.deliveryId,
                    deliveryId,
                ),
                inArray(conversationEmailUpdateRecipientTable.status, [
                    "pending",
                    "retry_wait",
                    "claimed",
                ]),
            ),
        );
}

export async function stopActiveDeliveriesForKillSwitch({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId?: number;
}): Promise<number> {
    return await db.transaction(async (tx) => {
        const deliveries = await tx
            .select({ id: conversationEmailUpdateDeliveryTable.id })
            .from(conversationEmailUpdateDeliveryTable)
            .where(
                and(
                    inArray(conversationEmailUpdateDeliveryTable.status, [
                        "preparing",
                        "queued",
                        "sending",
                    ]),
                    updateIsExclusiveToConversation({
                        db: tx,
                        updateId: conversationEmailUpdateDeliveryTable.updateId,
                        conversationId,
                    }),
                ),
            )
            .for("update");
        for (const delivery of deliveries) {
            await markDeliveryStopping({
                tx,
                deliveryId: delivery.id,
                reason: "global_kill_switch",
            });
        }
        return deliveries.length;
    });
}

export interface ClaimedRecipient {
    id: bigint;
    deliveryId: number;
    leaseToken: string;
}

export async function recoverExpiredRecipientLeases({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId?: number;
}): Promise<{ sendLeaseCount: number; claimLeaseCount: number }> {
    return await db.transaction(async (tx) => {
        const expiredAttemptingRecipients = tx
            .select({ id: conversationEmailUpdateRecipientTable.id })
            .from(conversationEmailUpdateRecipientTable)
            .where(
                and(
                    eq(
                        conversationEmailUpdateRecipientTable.status,
                        "attempting",
                    ),
                    lte(
                        conversationEmailUpdateRecipientTable.leaseExpiresAt,
                        currentTimestamp(),
                    ),
                    eq(
                        conversationEmailUpdateRecipientTable.id,
                        conversationEmailUpdateDeliveryAttemptTable.recipientId,
                    ),
                    deliveryUpdateIsExclusiveToConversation({
                        db: tx,
                        deliveryId:
                            conversationEmailUpdateRecipientTable.deliveryId,
                        conversationId,
                    }),
                ),
            );
        await tx
            .update(conversationEmailUpdateDeliveryAttemptTable)
            .set({
                outcome: "unknown",
                errorCategory: "ambiguous",
                errorCode: "LeaseExpired",
                errorDetails: "Worker lease expired after send authorization",
                finishedAt: currentTimestamp(),
            })
            .where(
                and(
                    eq(
                        conversationEmailUpdateDeliveryAttemptTable.outcome,
                        "send_authorized",
                    ),
                    exists(expiredAttemptingRecipients),
                ),
            );
        const expiredSends = await tx
            .update(conversationEmailUpdateRecipientTable)
            .set({
                status: "unknown",
                unknownAt: currentTimestamp(),
                failureCode: "LeaseExpired",
                failureDetails: "Worker lease expired after send authorization",
                leaseOwner: null,
                leaseToken: null,
                leaseExpiresAt: null,
                updatedAt: currentTimestamp(),
            })
            .where(
                and(
                    eq(
                        conversationEmailUpdateRecipientTable.status,
                        "attempting",
                    ),
                    lte(
                        conversationEmailUpdateRecipientTable.leaseExpiresAt,
                        currentTimestamp(),
                    ),
                    deliveryUpdateIsExclusiveToConversation({
                        db: tx,
                        deliveryId:
                            conversationEmailUpdateRecipientTable.deliveryId,
                        conversationId,
                    }),
                ),
            );
        const expiredClaimed = await tx
            .select({
                id: conversationEmailUpdateRecipientTable.id,
                attemptCount:
                    conversationEmailUpdateRecipientTable.attemptCount,
            })
            .from(conversationEmailUpdateRecipientTable)
            .where(
                and(
                    eq(conversationEmailUpdateRecipientTable.status, "claimed"),
                    lte(
                        conversationEmailUpdateRecipientTable.leaseExpiresAt,
                        currentTimestamp(),
                    ),
                    deliveryUpdateIsExclusiveToConversation({
                        db: tx,
                        deliveryId:
                            conversationEmailUpdateRecipientTable.deliveryId,
                        conversationId,
                    }),
                ),
            )
            .for("update");
        for (const recipient of expiredClaimed) {
            await tx
                .update(conversationEmailUpdateRecipientTable)
                .set({
                    status:
                        recipient.attemptCount === 0 ? "pending" : "retry_wait",
                    nextAttemptAt:
                        recipient.attemptCount === 0
                            ? null
                            : currentTimestamp(),
                    failureCode:
                        recipient.attemptCount === 0
                            ? null
                            : "ClaimLeaseExpired",
                    failureDetails:
                        recipient.attemptCount === 0
                            ? null
                            : "Worker lease expired before send authorization",
                    leaseOwner: null,
                    leaseToken: null,
                    leaseExpiresAt: null,
                    updatedAt: currentTimestamp(),
                })
                .where(
                    eq(conversationEmailUpdateRecipientTable.id, recipient.id),
                );
        }
        return {
            sendLeaseCount: expiredSends.count,
            claimLeaseCount: expiredClaimed.length,
        };
    });
}

async function claimRecipientKind({
    tx,
    kind,
    limit,
    conversationId,
}: {
    tx: PostgresDatabase;
    kind: "conversation_owner_copy" | "participant";
    limit: number;
    conversationId: number | undefined;
}): Promise<{ id: bigint; deliveryId: number }[]> {
    if (limit <= 0) return [];
    const outstandingOwnerCopy = tx
        .select({ id: conversationEmailUpdateRecipientTable.id })
        .from(conversationEmailUpdateRecipientTable)
        .where(
            and(
                eq(
                    conversationEmailUpdateRecipientTable.deliveryId,
                    conversationEmailUpdateDeliveryTable.id,
                ),
                eq(
                    conversationEmailUpdateRecipientTable.kind,
                    "conversation_owner_copy",
                ),
                ne(
                    conversationEmailUpdateRecipientTable.status,
                    "provider_accepted",
                ),
            ),
        );
    return await tx
        .select({
            id: conversationEmailUpdateRecipientTable.id,
            deliveryId: conversationEmailUpdateRecipientTable.deliveryId,
        })
        .from(conversationEmailUpdateRecipientTable)
        .innerJoin(
            conversationEmailUpdateDeliveryTable,
            eq(
                conversationEmailUpdateDeliveryTable.id,
                conversationEmailUpdateRecipientTable.deliveryId,
            ),
        )
        .where(
            and(
                inArray(conversationEmailUpdateDeliveryTable.status, [
                    "queued",
                    "sending",
                ]),
                eq(conversationEmailUpdateRecipientTable.kind, kind),
                or(
                    eq(conversationEmailUpdateRecipientTable.status, "pending"),
                    and(
                        eq(
                            conversationEmailUpdateRecipientTable.status,
                            "retry_wait",
                        ),
                        lte(
                            conversationEmailUpdateRecipientTable.nextAttemptAt,
                            currentTimestamp(),
                        ),
                    ),
                ),
                kind === "participant"
                    ? notExists(outstandingOwnerCopy)
                    : undefined,
                updateIsExclusiveToConversation({
                    db: tx,
                    updateId: conversationEmailUpdateDeliveryTable.updateId,
                    conversationId,
                }),
            ),
        )
        .orderBy(
            asc(conversationEmailUpdateDeliveryTable.dispatchTurnAt),
            asc(conversationEmailUpdateDeliveryTable.id),
            asc(conversationEmailUpdateRecipientTable.id),
        )
        .limit(limit)
        .for("update", {
            of: conversationEmailUpdateRecipientTable,
            skipLocked: true,
        });
}

export async function claimRecipients({
    db,
    workerId,
    batchSize,
    leaseSeconds,
    conversationId,
}: {
    db: PostgresDatabase;
    workerId: string;
    batchSize: number;
    leaseSeconds: number;
    conversationId?: number;
}): Promise<ClaimedRecipient[]> {
    return await db.transaction(async (tx) => {
        const owners = await claimRecipientKind({
            tx,
            kind: "conversation_owner_copy",
            limit: batchSize,
            conversationId,
        });
        const participants = await claimRecipientKind({
            tx,
            kind: "participant",
            limit: batchSize - owners.length,
            conversationId,
        });
        const claimable = [...owners, ...participants];
        const claimed: ClaimedRecipient[] = [];
        for (const recipient of claimable) {
            const leaseToken = randomUUID();
            const rows = await tx
                .update(conversationEmailUpdateRecipientTable)
                .set({
                    status: "claimed",
                    claimedAt: currentTimestamp(),
                    nextAttemptAt: null,
                    failureCode: null,
                    failureDetails: null,
                    leaseOwner: workerId,
                    leaseToken,
                    leaseExpiresAt: leaseExpiryExpression(leaseSeconds),
                    updatedAt: currentTimestamp(),
                })
                .where(
                    eq(conversationEmailUpdateRecipientTable.id, recipient.id),
                )
                .returning({
                    id: conversationEmailUpdateRecipientTable.id,
                    deliveryId:
                        conversationEmailUpdateRecipientTable.deliveryId,
                    leaseToken:
                        conversationEmailUpdateRecipientTable.leaseToken,
                });
            const row = rows.at(0);
            if (!row?.leaseToken) continue;
            claimed.push({
                id: row.id,
                deliveryId: row.deliveryId,
                leaseToken: row.leaseToken,
            });
        }
        const deliveryIds = [
            ...new Set(claimed.map((recipient) => recipient.deliveryId)),
        ];
        if (deliveryIds.length > 0) {
            await tx
                .update(conversationEmailUpdateDeliveryTable)
                .set({
                    status: "sending",
                    sendingStartedAt: sql<Date>`coalesce(${conversationEmailUpdateDeliveryTable.sendingStartedAt}, now())`,
                    dispatchTurnAt: currentTimestamp(),
                    updatedAt: currentTimestamp(),
                })
                .where(
                    and(
                        inArray(
                            conversationEmailUpdateDeliveryTable.id,
                            deliveryIds,
                        ),
                        eq(
                            conversationEmailUpdateDeliveryTable.status,
                            "queued",
                        ),
                    ),
                );
        }
        return claimed;
    });
}

export interface AuthorizedRecipient {
    recipientId: bigint;
    deliveryId: number;
    updateId: number;
    attemptPublicId: string;
    attemptNumber: number;
    emailCredentialId: number;
    to: string;
    subject: string;
    bodyHtml: string;
    bodyPlainText: string;
    projectTitle: string;
    replyToName: string;
    replyToEmail: string;
    language: SupportedDisplayLanguageCodes;
    kind: "participant" | "conversation_owner_copy";
    projectId: number;
    authorizingOrganizationId: number;
    scopeKind: "listed_project" | "no_project";
    conversations: ConversationLink[];
    actions: ConversationEmailActionLinks | undefined;
    unsubscribeUrl: string | undefined;
    actionTokens:
        | {
              unsubscribeHash: string;
              manageHash: string;
              reportHash: string;
          }
        | undefined;
}

function createActionToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString("base64url");
    return {
        raw,
        hash: createHash("sha256").update(raw).digest("hex"),
    };
}

export async function authorizeRecipientSend({
    db,
    claimed,
    siteBaseUrl,
    leaseSeconds,
}: {
    db: PostgresDatabase;
    claimed: ClaimedRecipient;
    siteBaseUrl: string;
    leaseSeconds: number;
}): Promise<AuthorizedRecipient | undefined> {
    return await db.transaction(async (tx) => {
        const deliveryLock = await tx
            .select({ id: conversationEmailUpdateDeliveryTable.id })
            .from(conversationEmailUpdateDeliveryTable)
            .innerJoin(
                conversationEmailUpdateTable,
                eq(
                    conversationEmailUpdateTable.id,
                    conversationEmailUpdateDeliveryTable.updateId,
                ),
            )
            .where(
                eq(conversationEmailUpdateDeliveryTable.id, claimed.deliveryId),
            )
            .for("update", { of: conversationEmailUpdateDeliveryTable });
        if (deliveryLock.length === 0) return undefined;

        const recipient = (
            await tx
                .select({
                    recipientId: conversationEmailUpdateRecipientTable.id,
                    deliveryId:
                        conversationEmailUpdateRecipientTable.deliveryId,
                    updateId: conversationEmailUpdateDeliveryTable.updateId,
                    to: conversationEmailUpdateRecipientTable.materializedEmailSnapshot,
                    emailCredentialId:
                        conversationEmailUpdateRecipientTable.materializedEmailCredentialId,
                    userId: conversationEmailUpdateRecipientTable.userId,
                    language:
                        conversationEmailUpdateRecipientTable.displayLanguage,
                    kind: conversationEmailUpdateRecipientTable.kind,
                    attemptCount:
                        conversationEmailUpdateRecipientTable.attemptCount,
                    subject: conversationEmailUpdateTable.subject,
                    bodyHtml: conversationEmailUpdateTable.bodyHtml,
                    bodyPlainText: conversationEmailUpdateTable.bodyPlainText,
                    projectTitle:
                        conversationEmailUpdateTable.projectTitleSnapshot,
                    replyToName:
                        conversationEmailUpdateTable.replyToNameSnapshot,
                    replyToEmail:
                        conversationEmailUpdateTable.replyToEmailSnapshot,
                    projectId: conversationEmailUpdateTable.projectId,
                    authorizingOrganizationId:
                        conversationEmailUpdateTable.authorizingOrganizationId,
                    scopeKind: conversationEmailUpdateTable.scopeKind,
                    createdByUserId:
                        conversationEmailUpdateTable.createdByUserId,
                })
                .from(conversationEmailUpdateRecipientTable)
                .innerJoin(
                    conversationEmailUpdateDeliveryTable,
                    eq(
                        conversationEmailUpdateDeliveryTable.id,
                        conversationEmailUpdateRecipientTable.deliveryId,
                    ),
                )
                .innerJoin(
                    conversationEmailUpdateTable,
                    eq(
                        conversationEmailUpdateTable.id,
                        conversationEmailUpdateDeliveryTable.updateId,
                    ),
                )
                .where(
                    and(
                        eq(
                            conversationEmailUpdateRecipientTable.id,
                            claimed.id,
                        ),
                        eq(
                            conversationEmailUpdateRecipientTable.leaseToken,
                            claimed.leaseToken,
                        ),
                        eq(
                            conversationEmailUpdateRecipientTable.status,
                            "claimed",
                        ),
                        inArray(conversationEmailUpdateDeliveryTable.status, [
                            "queued",
                            "sending",
                        ]),
                    ),
                )
                .for("update", { of: conversationEmailUpdateRecipientTable })
        ).at(0);
        if (recipient === undefined) return undefined;

        if (
            await isScopeBlocked({
                db: tx,
                updateId: recipient.updateId,
                projectId: recipient.projectId,
                organizationId: recipient.authorizingOrganizationId,
                facilitatorUserId: recipient.createdByUserId,
            })
        ) {
            await markDeliveryStopping({
                tx,
                deliveryId: recipient.deliveryId,
                reason: "legal_or_abuse_block",
            });
            return undefined;
        }

        const activeAccount = await tx
            .select({ id: userTable.id })
            .from(userTable)
            .where(
                and(
                    eq(userTable.id, recipient.userId),
                    eq(userTable.isDeleted, false),
                ),
            )
            .limit(1)
            .for("update");
        if (activeAccount.length === 0) {
            await skipClaimedRecipient({
                tx,
                claimed,
                reason: "account_ineligible",
            });
            return undefined;
        }
        const validCredential = await tx
            .select({ id: emailTable.id })
            .from(emailTable)
            .where(
                and(
                    eq(emailTable.id, recipient.emailCredentialId),
                    eq(emailTable.userId, recipient.userId),
                    eq(emailTable.email, recipient.to),
                    eq(emailTable.type, "primary"),
                    eq(emailTable.isDeleted, false),
                ),
            )
            .limit(1);
        if (validCredential.length === 0) {
            await skipClaimedRecipient({
                tx,
                claimed,
                reason: "email_credential_changed",
            });
            return undefined;
        }
        const complaint = await tx
            .select({
                id: conversationEmailUpdateUserComplaintSuppressionTable.id,
            })
            .from(conversationEmailUpdateUserComplaintSuppressionTable)
            .where(
                and(
                    eq(
                        conversationEmailUpdateUserComplaintSuppressionTable.userId,
                        recipient.userId,
                    ),
                    isNull(
                        conversationEmailUpdateUserComplaintSuppressionTable.liftedAt,
                    ),
                ),
            )
            .limit(1);
        if (complaint.length > 0) {
            await skipClaimedRecipient({
                tx,
                claimed,
                reason: "user_complaint_suppressed",
            });
            return undefined;
        }
        const emailSuppression = await tx
            .select({ id: conversationEmailUpdateEmailSuppressionTable.id })
            .from(conversationEmailUpdateEmailSuppressionTable)
            .where(
                and(
                    eq(
                        conversationEmailUpdateEmailSuppressionTable.canonicalEmail,
                        recipient.to,
                    ),
                    isNull(
                        conversationEmailUpdateEmailSuppressionTable.liftedAt,
                    ),
                ),
            )
            .limit(1);
        if (emailSuppression.length > 0) {
            await skipClaimedRecipient({
                tx,
                claimed,
                reason: "email_suppressed",
            });
            return undefined;
        }

        if (recipient.kind === "participant") {
            const globalPause = await tx
                .select({
                    userId: conversationEmailUpdateUserGlobalSettingTable.userId,
                })
                .from(conversationEmailUpdateUserGlobalSettingTable)
                .where(
                    and(
                        eq(
                            conversationEmailUpdateUserGlobalSettingTable.userId,
                            recipient.userId,
                        ),
                        isNotNull(
                            conversationEmailUpdateUserGlobalSettingTable.pausedAt,
                        ),
                    ),
                )
                .limit(1);
            if (globalPause.length > 0) {
                await skipClaimedRecipient({
                    tx,
                    claimed,
                    reason: "global_pause",
                });
                return undefined;
            }
            if (recipient.scopeKind === "listed_project") {
                const projectPreference = await tx
                    .select({
                        userId: conversationEmailUpdateUserProjectPreferenceTable.userId,
                    })
                    .from(conversationEmailUpdateUserProjectPreferenceTable)
                    .where(
                        and(
                            eq(
                                conversationEmailUpdateUserProjectPreferenceTable.userId,
                                recipient.userId,
                            ),
                            eq(
                                conversationEmailUpdateUserProjectPreferenceTable.projectId,
                                recipient.projectId,
                            ),
                            eq(
                                conversationEmailUpdateUserProjectPreferenceTable.enabled,
                                true,
                            ),
                        ),
                    )
                    .limit(1);
                if (projectPreference.length === 0) {
                    await skipClaimedRecipient({
                        tx,
                        claimed,
                        reason: "project_preference_disabled",
                    });
                    return undefined;
                }
            }
            const conversationPreference = await tx
                .select({
                    conversationId:
                        conversationEmailUpdateRecipientConversationTable.conversationId,
                })
                .from(conversationEmailUpdateRecipientConversationTable)
                .leftJoin(
                    conversationEmailUpdateUserConversationPreferenceTable,
                    and(
                        eq(
                            conversationEmailUpdateUserConversationPreferenceTable.userId,
                            recipient.userId,
                        ),
                        eq(
                            conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                            conversationEmailUpdateRecipientConversationTable.conversationId,
                        ),
                    ),
                )
                .where(
                    and(
                        eq(
                            conversationEmailUpdateRecipientConversationTable.recipientId,
                            recipient.recipientId,
                        ),
                        recipient.scopeKind === "listed_project"
                            ? or(
                                  isNull(
                                      conversationEmailUpdateUserConversationPreferenceTable.userId,
                                  ),
                                  eq(
                                      conversationEmailUpdateUserConversationPreferenceTable.enabled,
                                      true,
                                  ),
                              )
                            : eq(
                                  conversationEmailUpdateUserConversationPreferenceTable.enabled,
                                  true,
                              ),
                    ),
                )
                .limit(1);
            if (conversationPreference.length === 0) {
                await skipClaimedRecipient({
                    tx,
                    claimed,
                    reason: "conversation_preference_disabled",
                });
                return undefined;
            }
            const frequencyCapped = await tx
                .select({ id: conversationEmailUpdateRecipientTable.id })
                .from(conversationEmailUpdateRecipientTable)
                .innerJoin(
                    conversationEmailUpdateDeliveryTable,
                    eq(
                        conversationEmailUpdateDeliveryTable.id,
                        conversationEmailUpdateRecipientTable.deliveryId,
                    ),
                )
                .where(
                    and(
                        eq(
                            conversationEmailUpdateRecipientTable.userId,
                            recipient.userId,
                        ),
                        ne(
                            conversationEmailUpdateRecipientTable.deliveryId,
                            recipient.deliveryId,
                        ),
                        eq(
                            conversationEmailUpdateDeliveryTable.projectId,
                            recipient.projectId,
                        ),
                        inArray(conversationEmailUpdateRecipientTable.status, [
                            "attempting",
                            "provider_accepted",
                            "unknown",
                        ]),
                        gte(
                            sql<Date>`coalesce(${conversationEmailUpdateRecipientTable.providerAcceptedAt}, ${conversationEmailUpdateRecipientTable.unknownAt}, ${conversationEmailUpdateRecipientTable.attemptingAt})`,
                            sql<Date>`now() - interval '24 hours'`,
                        ),
                    ),
                )
                .limit(1);
            if (frequencyCapped.length > 0) {
                await skipClaimedRecipient({
                    tx,
                    claimed,
                    reason: "frequency_capped",
                });
                return undefined;
            }
        }

        const attemptNumber = recipient.attemptCount + 1;
        const attemptPublicId = randomUUID();
        let actions: ConversationEmailActionLinks | undefined;
        let unsubscribeUrl: string | undefined;
        let actionTokens: AuthorizedRecipient["actionTokens"];
        if (recipient.kind === "participant") {
            const unsubscribe = createActionToken();
            const manage = createActionToken();
            const report = createActionToken();
            actionTokens = {
                unsubscribeHash: unsubscribe.hash,
                manageHash: manage.hash,
                reportHash: report.hash,
            };
            const actionUrls = buildConversationEmailActionUrls({
                siteBaseUrl,
                unsubscribeToken: unsubscribe.raw,
                manageToken: manage.raw,
                reportToken: report.raw,
            });
            unsubscribeUrl = actionUrls.oneClickUnsubscribeUrl;
            actions = {
                unsubscribeUrl: actionUrls.visibleUnsubscribeUrl,
                manageUrl: actionUrls.manageUrl,
                reportUrl: actionUrls.reportUrl,
            };
        }
        const authorized: AuthorizedRecipient = {
            recipientId: recipient.recipientId,
            deliveryId: recipient.deliveryId,
            updateId: recipient.updateId,
            attemptPublicId,
            attemptNumber,
            emailCredentialId: recipient.emailCredentialId,
            to: recipient.to,
            subject: recipient.subject,
            bodyHtml: recipient.bodyHtml,
            bodyPlainText: recipient.bodyPlainText,
            projectTitle: recipient.projectTitle,
            replyToName: recipient.replyToName,
            replyToEmail: recipient.replyToEmail,
            language: recipient.language,
            kind: recipient.kind,
            projectId: recipient.projectId,
            authorizingOrganizationId: recipient.authorizingOrganizationId,
            scopeKind: recipient.scopeKind,
            conversations: await getUpdateConversationLinks({
                db: tx,
                updateId: recipient.updateId,
                recipientId: recipient.recipientId,
                siteBaseUrl,
            }),
            actions,
            unsubscribeUrl,
            actionTokens,
        };
        if (
            !(await markRecipientAttempting({
                tx,
                claimed,
                authorized,
                leaseSeconds,
            }))
        ) {
            return undefined;
        }
        return authorized;
    });
}

async function markRecipientAttempting({
    tx,
    claimed,
    authorized,
    leaseSeconds,
}: {
    tx: PostgresDatabase;
    claimed: ClaimedRecipient;
    authorized: AuthorizedRecipient;
    leaseSeconds: number;
}): Promise<boolean> {
    const started = await tx
        .update(conversationEmailUpdateRecipientTable)
        .set({
            status: "attempting",
            attemptingAt: currentTimestamp(),
            attemptCount: authorized.attemptNumber,
            nextAttemptAt: null,
            leaseExpiresAt: leaseExpiryExpression(leaseSeconds),
            updatedAt: currentTimestamp(),
        })
        .where(
            and(
                eq(conversationEmailUpdateRecipientTable.id, claimed.id),
                eq(
                    conversationEmailUpdateRecipientTable.leaseToken,
                    claimed.leaseToken,
                ),
                eq(conversationEmailUpdateRecipientTable.status, "claimed"),
                eq(
                    conversationEmailUpdateRecipientTable.attemptCount,
                    authorized.attemptNumber - 1,
                ),
                gt(
                    conversationEmailUpdateRecipientTable.leaseExpiresAt,
                    currentTimestamp(),
                ),
            ),
        )
        .returning({ id: conversationEmailUpdateRecipientTable.id });
    if (started.length === 0) return false;

    await tx.insert(conversationEmailUpdateDeliveryAttemptTable).values({
        publicId: authorized.attemptPublicId,
        recipientId: authorized.recipientId,
        attemptNumber: authorized.attemptNumber,
        leaseToken: claimed.leaseToken,
        emailCredentialId: authorized.emailCredentialId,
        emailSnapshot: authorized.to,
        outcome: "send_authorized",
        authorizedAt: currentTimestamp(),
    });
    if (authorized.actionTokens !== undefined) {
        await tx.insert(conversationEmailUpdateActionTokenTable).values([
            {
                tokenHash: authorized.actionTokens.unsubscribeHash,
                recipientId: authorized.recipientId,
                action:
                    authorized.scopeKind === "listed_project"
                        ? "unsubscribe_project"
                        : "unsubscribe_conversation",
                expiresAt: sql<Date>`now() + interval '365 days'`,
            },
            {
                tokenHash: authorized.actionTokens.manageHash,
                recipientId: authorized.recipientId,
                action: "manage_preferences",
                expiresAt: sql<Date>`now() + interval '90 days'`,
            },
            {
                tokenHash: authorized.actionTokens.reportHash,
                recipientId: authorized.recipientId,
                action: "report",
                expiresAt: sql<Date>`now() + interval '90 days'`,
            },
        ]);
    }
    return true;
}

async function skipClaimedRecipient({
    tx,
    claimed,
    reason,
}: {
    tx: PostgresDatabase;
    claimed: ClaimedRecipient;
    reason:
        | "account_ineligible"
        | "email_suppressed"
        | "email_credential_changed"
        | "frequency_capped"
        | "global_pause"
        | "project_preference_disabled"
        | "conversation_preference_disabled"
        | "scope_safety_blocked"
        | "user_complaint_suppressed";
}): Promise<void> {
    await tx
        .update(conversationEmailUpdateRecipientTable)
        .set({
            status: "skipped",
            skipReason: reason,
            nextAttemptAt: null,
            failureCode: null,
            failureDetails: null,
            skippedAt: currentTimestamp(),
            leaseOwner: null,
            leaseToken: null,
            leaseExpiresAt: null,
            updatedAt: currentTimestamp(),
        })
        .where(
            and(
                eq(conversationEmailUpdateRecipientTable.id, claimed.id),
                eq(
                    conversationEmailUpdateRecipientTable.leaseToken,
                    claimed.leaseToken,
                ),
                eq(conversationEmailUpdateRecipientTable.status, "claimed"),
            ),
        );
}

export async function finalizeRecipientSend({
    db,
    claimed,
    authorized,
    result,
}: {
    db: PostgresDatabase;
    claimed: ClaimedRecipient;
    authorized: AuthorizedRecipient;
    result: ProviderResult;
}): Promise<void> {
    await db.transaction(async (tx) => {
        const attempt = (
            await tx
                .select({
                    id: conversationEmailUpdateDeliveryAttemptTable.id,
                    outcome:
                        conversationEmailUpdateDeliveryAttemptTable.outcome,
                    providerMessageId:
                        conversationEmailUpdateDeliveryAttemptTable.providerMessageId,
                })
                .from(conversationEmailUpdateDeliveryAttemptTable)
                .where(
                    and(
                        eq(
                            conversationEmailUpdateDeliveryAttemptTable.publicId,
                            authorized.attemptPublicId,
                        ),
                        eq(
                            conversationEmailUpdateDeliveryAttemptTable.recipientId,
                            claimed.id,
                        ),
                        eq(
                            conversationEmailUpdateDeliveryAttemptTable.attemptNumber,
                            authorized.attemptNumber,
                        ),
                        eq(
                            conversationEmailUpdateDeliveryAttemptTable.leaseToken,
                            claimed.leaseToken,
                        ),
                    ),
                )
                .limit(1)
                .for("update")
        ).at(0);
        if (attempt === undefined) return;

        const recipient = (
            await tx
                .select({
                    status: conversationEmailUpdateRecipientTable.status,
                    leaseToken:
                        conversationEmailUpdateRecipientTable.leaseToken,
                })
                .from(conversationEmailUpdateRecipientTable)
                .where(eq(conversationEmailUpdateRecipientTable.id, claimed.id))
                .limit(1)
                .for("update")
        ).at(0);
        if (recipient === undefined) return;

        const decision = decideSendFinalization({
            attemptOutcome: attempt.outcome,
            attemptProviderMessageId: attempt.providerMessageId,
            recipientStatus: recipient.status,
            failureFenced:
                recipient.status === "attempting" &&
                recipient.leaseToken === claimed.leaseToken,
            result,
            attemptNumber: authorized.attemptNumber,
        });
        if (decision.kind === "provider_accepted") {
            if (decision.updateAttempt) {
                await tx
                    .update(conversationEmailUpdateDeliveryAttemptTable)
                    .set({
                        outcome: "provider_accepted",
                        providerMessageId: decision.messageId,
                        errorCategory: null,
                        errorCode: null,
                        errorDetails: null,
                        finishedAt: currentTimestamp(),
                    })
                    .where(
                        eq(
                            conversationEmailUpdateDeliveryAttemptTable.id,
                            attempt.id,
                        ),
                    );
            }
            await tx
                .update(conversationEmailUpdateRecipientTable)
                .set({
                    status: "provider_accepted",
                    providerAcceptedAt: currentTimestamp(),
                    nextAttemptAt: null,
                    skipReason: null,
                    failureCode: null,
                    failureDetails: null,
                    skippedAt: null,
                    permanentFailedAt: null,
                    unknownAt: null,
                    leaseOwner: null,
                    leaseToken: null,
                    leaseExpiresAt: null,
                    updatedAt: currentTimestamp(),
                })
                .where(
                    and(
                        eq(
                            conversationEmailUpdateRecipientTable.id,
                            claimed.id,
                        ),
                        ne(
                            conversationEmailUpdateRecipientTable.status,
                            "provider_accepted",
                        ),
                    ),
                );
        } else if (decision.kind === "retry_wait") {
            await finalizeFailedAttempt({
                tx,
                attemptId: attempt.id,
                decision,
            });
            if (decision.updateRecipient) {
                await tx
                    .update(conversationEmailUpdateRecipientTable)
                    .set({
                        status: "retry_wait",
                        nextAttemptAt: sql<Date>`now() + ${decision.delayMs} * interval '1 millisecond'`,
                        failureCode: decision.code,
                        failureDetails: decision.details,
                        leaseOwner: null,
                        leaseToken: null,
                        leaseExpiresAt: null,
                        updatedAt: currentTimestamp(),
                    })
                    .where(recipientAttemptFence({ claimed }));
            }
        } else if (decision.kind === "unknown") {
            await finalizeFailedAttempt({
                tx,
                attemptId: attempt.id,
                decision,
            });
            if (decision.updateRecipient) {
                await tx
                    .update(conversationEmailUpdateRecipientTable)
                    .set({
                        status: "unknown",
                        unknownAt: currentTimestamp(),
                        failureCode: decision.code,
                        failureDetails: decision.details,
                        leaseOwner: null,
                        leaseToken: null,
                        leaseExpiresAt: null,
                        updatedAt: currentTimestamp(),
                    })
                    .where(recipientAttemptFence({ claimed }));
            }
        } else if (decision.kind === "permanent_failed") {
            await finalizeFailedAttempt({
                tx,
                attemptId: attempt.id,
                decision,
            });
            if (decision.updateRecipient) {
                await tx
                    .update(conversationEmailUpdateRecipientTable)
                    .set({
                        status: "permanent_failed",
                        permanentFailedAt: currentTimestamp(),
                        failureCode: decision.code,
                        failureDetails: decision.details,
                        leaseOwner: null,
                        leaseToken: null,
                        leaseExpiresAt: null,
                        updatedAt: currentTimestamp(),
                    })
                    .where(recipientAttemptFence({ claimed }));
            }
        }
        await aggregateDeliveryStateInTransaction({
            tx,
            deliveryId: claimed.deliveryId,
        });
    });
}

async function finalizeFailedAttempt({
    tx,
    attemptId,
    decision,
}: {
    tx: PostgresDatabase;
    attemptId: bigint;
    decision: Extract<
        ReturnType<typeof decideSendFinalization>,
        { kind: "retry_wait" | "permanent_failed" | "unknown" }
    >;
}): Promise<void> {
    const errorCategory =
        decision.attemptOutcome === "retryable_rejected"
            ? "retryable"
            : decision.attemptOutcome === "permanent_rejected"
              ? "permanent"
              : "ambiguous";
    await tx
        .update(conversationEmailUpdateDeliveryAttemptTable)
        .set({
            outcome: decision.attemptOutcome,
            providerMessageId: null,
            errorCategory,
            errorCode: decision.code,
            errorDetails: decision.details,
            finishedAt: currentTimestamp(),
        })
        .where(eq(conversationEmailUpdateDeliveryAttemptTable.id, attemptId));
}

function recipientAttemptFence({ claimed }: { claimed: ClaimedRecipient }) {
    return and(
        eq(conversationEmailUpdateRecipientTable.id, claimed.id),
        eq(
            conversationEmailUpdateRecipientTable.leaseToken,
            claimed.leaseToken,
        ),
        eq(conversationEmailUpdateRecipientTable.status, "attempting"),
    );
}

export async function aggregateDeliveryStates({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId?: number;
}): Promise<void> {
    const deliveries = await db
        .select({ id: conversationEmailUpdateDeliveryTable.id })
        .from(conversationEmailUpdateDeliveryTable)
        .where(
            and(
                inArray(conversationEmailUpdateDeliveryTable.status, [
                    "sending",
                    "stopping",
                ]),
                updateIsExclusiveToConversation({
                    db,
                    updateId: conversationEmailUpdateDeliveryTable.updateId,
                    conversationId,
                }),
            ),
        )
        .orderBy(asc(conversationEmailUpdateDeliveryTable.id));
    for (const delivery of deliveries) {
        await db.transaction(async (tx) => {
            await tx
                .select({ id: conversationEmailUpdateDeliveryTable.id })
                .from(conversationEmailUpdateDeliveryTable)
                .where(eq(conversationEmailUpdateDeliveryTable.id, delivery.id))
                .for("update");
            await aggregateDeliveryStateInTransaction({
                tx,
                deliveryId: delivery.id,
            });
        });
    }
}

export async function aggregateDeliveryStateInTransaction({
    tx,
    deliveryId,
}: {
    tx: PostgresDatabase;
    deliveryId: number;
}): Promise<void> {
    const delivery = (
        await tx
            .select({
                status: conversationEmailUpdateDeliveryTable.status,
            })
            .from(conversationEmailUpdateDeliveryTable)
            .where(eq(conversationEmailUpdateDeliveryTable.id, deliveryId))
            .for("update")
    ).at(0);
    if (delivery === undefined) return;
    if (delivery.status !== "sending" && delivery.status !== "stopping") return;
    const groups = await tx
        .select({
            kind: conversationEmailUpdateRecipientTable.kind,
            status: conversationEmailUpdateRecipientTable.status,
            count: count(),
        })
        .from(conversationEmailUpdateRecipientTable)
        .where(eq(conversationEmailUpdateRecipientTable.deliveryId, deliveryId))
        .groupBy(
            conversationEmailUpdateRecipientTable.kind,
            conversationEmailUpdateRecipientTable.status,
        );
    const groupedCount = ({
        kind,
        statuses,
    }: {
        kind: "participant" | "conversation_owner_copy" | undefined;
        statuses: ReadonlySet<
            (typeof conversationEmailUpdateRecipientTable.$inferSelect)["status"]
        >;
    }): number =>
        groups.reduce(
            (total, group) =>
                total +
                (statuses.has(group.status) &&
                (kind === undefined || group.kind === kind)
                    ? group.count
                    : 0),
            0,
        );
    const ownerOutstanding = groups.reduce(
        (total, group) =>
            total +
            (group.kind === "conversation_owner_copy" &&
            group.status !== "provider_accepted"
                ? group.count
                : 0),
        0,
    );
    const ownerFailed = groupedCount({
        kind: "conversation_owner_copy",
        statuses: new Set(["skipped", "permanent_failed", "unknown"]),
    });
    const participantOutstanding = groupedCount({
        kind: "participant",
        statuses: new Set(["pending", "claimed", "attempting", "retry_wait"]),
    });
    const participantAccepted = groupedCount({
        kind: "participant",
        statuses: new Set(["provider_accepted"]),
    });
    const participantFailed = groupedCount({
        kind: "participant",
        statuses: new Set(["permanent_failed", "unknown"]),
    });
    const inFlight = groupedCount({
        kind: undefined,
        statuses: new Set(["claimed", "attempting"]),
    });

    if (delivery.status === "stopping" && inFlight === 0) {
        await tx
            .update(conversationEmailUpdateDeliveryTable)
            .set({
                status: "stopped",
                completedAt: currentTimestamp(),
                updatedAt: currentTimestamp(),
            })
            .where(
                and(
                    eq(conversationEmailUpdateDeliveryTable.id, deliveryId),
                    eq(conversationEmailUpdateDeliveryTable.status, "stopping"),
                ),
            );
        return;
    }
    if (delivery.status === "stopping") return;
    const ownerGate = decideOwnerGate({
        ownerOutstanding,
        ownerFailed,
    });
    if (ownerGate.kind === "fail") {
        await tx
            .update(conversationEmailUpdateDeliveryTable)
            .set({
                status: "failed",
                failureReason: "required_owner_copy_not_accepted",
                failedAt: currentTimestamp(),
                completedAt: null,
                updatedAt: currentTimestamp(),
            })
            .where(
                and(
                    eq(conversationEmailUpdateDeliveryTable.id, deliveryId),
                    eq(conversationEmailUpdateDeliveryTable.status, "sending"),
                ),
            );
        return;
    }
    if (ownerGate.kind === "wait") return;
    if (participantOutstanding > 0) return;
    const terminalStatus = decideTerminalDeliveryStatus({
        participantAccepted,
        participantFailed,
    });
    await tx
        .update(conversationEmailUpdateDeliveryTable)
        .set({
            status: terminalStatus,
            failureReason:
                terminalStatus === "failed"
                    ? "no_participant_provider_accepted"
                    : null,
            completedAt:
                terminalStatus === "failed" ? null : currentTimestamp(),
            failedAt: terminalStatus === "failed" ? currentTimestamp() : null,
            updatedAt: currentTimestamp(),
        })
        .where(
            and(
                eq(conversationEmailUpdateDeliveryTable.id, deliveryId),
                eq(conversationEmailUpdateDeliveryTable.status, "sending"),
            ),
        );
}
