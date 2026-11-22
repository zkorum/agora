import { httpErrors } from "@fastify/sensible";
import { and, eq, isNull } from "drizzle-orm";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    deviceTable,
    polisConversationConfigTable,
    rankingConversationConfigTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type { KnownDeviceLoginStatus } from "@/shared/types/zod.js";
import type {
    CreateCommentResponse,
    ConversationParticipationRejection,
} from "@/shared/types/dto.js";
import { getDeviceStatus, projectKnownDeviceLoginStatus } from "./authUtil.js";
import {
    checkConversationParticipationWithDeviceStatus,
    resolveConversationParticipation,
} from "./participationGate.js";
import { parseStoredParticipantStatements } from "./conversationTypeConfig.js";

type PolicyFailure = Extract<
    CreateCommentResponse,
    {
        reason:
            | "participant_statements_disabled"
            | "participant_statements_unsupported";
    }
>;
type Failure = PolicyFailure | ConversationParticipationRejection;
type StatementFamily = "polis" | "comparisons";

async function getStatementIdentity(
    params: Parameters<typeof getDeviceStatus>[0],
) {
    const identity = await getDeviceStatus(params);
    if (!identity.isKnown) {
        const existing = (
            await params.db
                .select({ userId: deviceTable.userId })
                .from(deviceTable)
                .where(eq(deviceTable.didWrite, params.didWrite))
        ).at(0);
        if (existing !== undefined)
            throw httpErrors.unauthorized("Account unavailable");
    }
    return identity;
}

async function fetchParticipantStatementPolicy({
    db,
    conversationSlugId,
    family,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    family: StatementFamily;
}) {
    const row = (
        await db
            .select({
                conversationId: conversationTable.id,
                conversationContentId: conversationTable.currentContentId,
                conversationType: conversationTable.conversationType,
                prioritizationType: conversationTable.prioritizationType,
                isImporting: conversationTable.isImporting,
                dynamicTranslationEnabled:
                    conversationTable.dynamicTranslationEnabled,
                polisAllowParticipantStatements:
                    polisConversationConfigTable.allowParticipantStatements,
                comparisonAllowParticipantStatements:
                    rankingConversationConfigTable.allowParticipantStatements,
            })
            .from(conversationTable)
            .leftJoin(
                polisConversationConfigTable,
                eq(
                    polisConversationConfigTable.id,
                    conversationTable.polisConfigId,
                ),
            )
            .leftJoin(
                rankingConversationConfigTable,
                eq(
                    rankingConversationConfigTable.id,
                    conversationTable.rankingConfigId,
                ),
            )
            .where(eq(conversationTable.slugId, conversationSlugId))
    ).at(0);
    if (row?.conversationContentId == null || row.isImporting)
        throw httpErrors.notFound("Conversation unavailable");
    const policy = parseStoredParticipantStatements(row);
    const currentFamily =
        row.conversationType === "polis" ? "polis" : row.prioritizationType;
    if (currentFamily !== family || !policy.supported)
        return {
            success: false,
            reason: "participant_statements_unsupported",
        } satisfies PolicyFailure;
    if (!policy.enabled)
        return {
            success: false,
            reason: "participant_statements_disabled",
        } satisfies PolicyFailure;
    return {
        success: true as const,
        conversationId: row.conversationId,
        conversationContentId: row.conversationContentId,
        dynamicTranslationEnabled: row.dynamicTranslationEnabled,
    };
}

/** Reject unavailable submissions before provider work, without registering guests or holding locks. */
export async function prepareParticipantStatement({
    db,
    conversationSlugId,
    family,
    didWrite,
    now,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    family: StatementFamily;
    didWrite: string;
    now: Date;
}) {
    const primaryDb = getPrimaryDatabase(db);
    const policy = await fetchParticipantStatementPolicy({
        db: primaryDb,
        conversationSlugId,
        family,
    });
    if (!policy.success) return policy;
    const deviceStatus = await getStatementIdentity({
        db: primaryDb,
        didWrite,
        now,
    });
    const eligibility = await resolveConversationParticipation({
        db: primaryDb,
        conversationSlugId,
        deviceStatus,
    });
    return eligibility.success ? policy : eligibility;
}

class RejectedStatement extends Error {
    constructor(readonly result: Failure) {
        super("Participant statement rejected");
    }
}

/** Settings editors take conversation UPDATE; submissions read policy only after SHARE. */
export async function withParticipantStatementAdmission<T>({
    db,
    conversationSlugId,
    family,
    didWrite,
    userAgent,
    now,
    currentDisplayLanguage,
    persist,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    family: StatementFamily;
    didWrite: string;
    userAgent: string;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    persist: (context: {
        tx: PostgresTransaction;
        conversationId: number;
        conversationContentId: number;
        participantId: string;
    }) => Promise<T>;
}): Promise<
    { success: true; value: T; loginStatus: KnownDeviceLoginStatus } | Failure
> {
    try {
        return await getPrimaryDatabase(db).transaction(async (tx) => {
            const admissionContext = {
                db: tx,
                conversationSlugId,
                didWrite,
                userAgent,
                now,
                currentDisplayLanguage,
            };
            let identity = await getStatementIdentity({
                db: tx,
                didWrite,
                now,
            });
            // First-time guests are registered inside this transaction and rolled back on rejection.
            if (!identity.isKnown) {
                const initial =
                    await checkConversationParticipationWithDeviceStatus({
                        ...admissionContext,
                        deviceStatus: identity,
                    });
                if (!initial.success) throw new RejectedStatement(initial);
                identity = await getDeviceStatus({ db: tx, didWrite, now });
            }
            if (!identity.isKnown)
                throw httpErrors.unauthorized("Account unavailable");
            const accounts = await tx
                .select({ id: userTable.id })
                .from(userTable)
                .where(
                    and(
                        eq(userTable.id, identity.userId),
                        eq(userTable.isDeleted, false),
                        isNull(userTable.authRestrictedAt),
                    ),
                )
                .for("no key update");
            if (accounts.length === 0)
                throw httpErrors.unauthorized("Account unavailable");
            const device = (
                await tx
                    .select({ userId: deviceTable.userId })
                    .from(deviceTable)
                    .where(eq(deviceTable.didWrite, didWrite))
                    .for("share")
            ).at(0);
            if (device?.userId !== identity.userId)
                throw httpErrors.conflict(
                    "Identity changed; reload before saving",
                );
            const currentIdentity = await getDeviceStatus({
                db: tx,
                didWrite,
                now,
            });
            if (!currentIdentity.isKnown)
                throw httpErrors.unauthorized("Account unavailable");
            const conversation = (
                await tx
                    .select({
                        id: conversationTable.id,
                        contentId: conversationTable.currentContentId,
                        isImporting: conversationTable.isImporting,
                    })
                    .from(conversationTable)
                    .where(eq(conversationTable.slugId, conversationSlugId))
                    .for("share")
            ).at(0);
            if (conversation?.contentId == null || conversation.isImporting)
                throw httpErrors.notFound("Conversation unavailable");
            const policy = await fetchParticipantStatementPolicy({
                db: tx,
                conversationSlugId,
                family,
            });
            if (!policy.success) throw new RejectedStatement(policy);
            const participation =
                await checkConversationParticipationWithDeviceStatus({
                    ...admissionContext,
                    deviceStatus: currentIdentity,
                });
            if (!participation.success)
                throw new RejectedStatement(participation);
            if (participation.participantId !== identity.userId)
                throw httpErrors.conflict(
                    "Identity changed; reload before saving",
                );
            const value = await persist({
                tx,
                conversationId: conversation.id,
                conversationContentId: conversation.contentId,
                participantId: participation.participantId,
            });
            return {
                success: true,
                value,
                loginStatus: projectKnownDeviceLoginStatus(currentIdentity),
            };
        });
    } catch (error) {
        if (error instanceof RejectedStatement) return error.result;
        throw error;
    }
}
