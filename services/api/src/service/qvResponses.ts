import { createHash } from "node:crypto";
import { httpErrors } from "@fastify/sensible";
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { z } from "zod";
import { Dto } from "@/shared/types/dto.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { parseQvBallot } from "@/shared/utils/qv.js";
import { scheduleQvStatsRefresh } from "@/shared-backend/qvStatsRefresh.js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import {
    conversationParticipantTable,
    conversationTable,
    creditVotingConfigTable,
    deviceTable,
    qvAllocationTable,
    qvResponseCommandTable,
    qvResponseTable,
    qvResponseVersionTable,
    userTable,
} from "@/shared-backend/schema.js";
import {
    getDeviceStatus,
    projectKnownDeviceLoginStatus,
    type DeviceLoginStatusInternal,
} from "./authUtil.js";
import {
    checkConversationParticipation,
    checkConversationParticipationWithDeviceStatus,
} from "./participationGate.js";
import { withQvStatementSetForResponseSave } from "./qvParticipation.js";
import {
    buildQvAllocationItemsQuery,
    buildQvCommandReceiptQuery,
    buildQvOwnerResponseQuery,
    buildQvSavedAllocationsQuery,
    buildQvStatementSourcesQuery,
} from "./qvQueries.js";
import {
    buildRankingItemDisplayContentByContentId,
    type RankingItemDisplayPreferences,
} from "./rankingItemDisplay.js";

type SavedResponse = z.infer<typeof Dto.qvSavedResponse>;
type MutationResponse = z.infer<typeof Dto.qvMutationResponse>;
type Failure = Extract<MutationResponse, { success: false }>;
type SaveRequest = z.infer<typeof Dto.qvSaveRequest>;
type WithdrawRequest = z.infer<typeof Dto.qvWithdrawRequest>;
type Command =
    | { action: "save"; request: SaveRequest }
    | { action: "withdraw"; request: WithdrawRequest };
type PreparedCommand =
    | (Extract<Command, { action: "save" }> & { allowOpposition: boolean })
    | Extract<Command, { action: "withdraw" }>;

// A rejected command must roll back guest/root creation and the first-save boundary.
class RejectedCommand extends Error {
    constructor(readonly result: Failure) {
        super("QV command rejected");
    }
}
function reject(
    reason:
        | "statement_conflict"
        | "response_conflict"
        | "idempotency_conflict"
        | "identity_conflict"
        | "invalid_allocations",
): never {
    throw new RejectedCommand({ success: false, reason });
}

type ObservedIdentity = { isKnown: true; userId: string } | { isKnown: false };

async function observeDeviceIdentity({
    tx,
    didWrite,
}: {
    tx: PostgresTransaction;
    didWrite: string;
}): Promise<ObservedIdentity> {
    const device = (
        await tx
            .select({ userId: deviceTable.userId })
            .from(deviceTable)
            .where(eq(deviceTable.didWrite, didWrite))
    ).at(0);
    return device === undefined
        ? { isKnown: false }
        : { isKnown: true, userId: device.userId };
}

/** Match account deletion/merge order: account SHARE, device SHARE, conversation SHARE, config, response. */
async function lockIdentity({
    tx,
    didWrite,
    now,
    observedIdentity,
}: {
    tx: PostgresTransaction;
    didWrite: string;
    now: Date;
    observedIdentity: ObservedIdentity | undefined;
}): Promise<Extract<DeviceLoginStatusInternal, { isKnown: true }> | undefined> {
    const observed =
        observedIdentity ?? (await observeDeviceIdentity({ tx, didWrite }));
    if (!observed.isKnown) return undefined;
    const accounts = await tx
        .select({ id: userTable.id })
        .from(userTable)
        .where(
            and(
                eq(userTable.id, observed.userId),
                eq(userTable.isDeleted, false),
                isNull(userTable.authRestrictedAt),
            ),
        )
        .for("share");
    if (accounts.length === 0)
        throw httpErrors.unauthorized("Account unavailable");
    const devices = await tx
        .select({ userId: deviceTable.userId })
        .from(deviceTable)
        .where(eq(deviceTable.didWrite, didWrite))
        .for("share");
    if (devices.at(0)?.userId !== observed.userId)
        throw httpErrors.conflict("Identity changed; reload before saving");
    const current = await getDeviceStatus({ db: tx, didWrite, now });
    if (!current.isKnown) return undefined;
    return current;
}

async function lockConversation({
    tx,
    conversationSlugId,
}: {
    tx: PostgresTransaction;
    conversationSlugId: string;
}) {
    const rows = await tx
        .select({
            id: conversationTable.id,
            configId: conversationTable.creditVotingConfigId,
            contentId: conversationTable.currentContentId,
            isClosed: conversationTable.isClosed,
            prioritizationType: conversationTable.prioritizationType,
        })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, conversationSlugId))
        .for("share");
    const row = rows.at(0);
    if (row?.contentId == null)
        throw httpErrors.notFound("Conversation not found");
    if (row.prioritizationType !== "qv" || row.configId === null)
        throw httpErrors.conflict("Conversation voting method changed");
    return { ...row, configId: row.configId };
}

async function readSavedResponse({
    tx,
    revision,
    versionId,
}: {
    tx: PostgresTransaction;
    revision: number;
    versionId: string | null;
}): Promise<SavedResponse> {
    if (versionId === null) return { revision };
    const rows = await buildQvSavedAllocationsQuery({ db: tx, versionId });
    const saved = rows.at(0);
    if (saved === undefined)
        throw httpErrors.conflict("Saved response unavailable");
    return Dto.qvSavedResponse.parse({
        revision,
        saved: {
            savedAt: saved.savedAt,
            creditsSpent: saved.creditsSpent,
            allocations: rows.map(({ itemId, sourceVersion, votes }) => ({
                itemId,
                sourceVersion,
                votes,
            })),
        },
    });
}

export async function loadQvSession({
    db,
    conversationSlugId,
    didWrite,
    now,
    displayPreferences,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    didWrite: string | undefined;
    now: Date;
    displayPreferences: RankingItemDisplayPreferences;
}): Promise<z.infer<typeof Dto.qvLoadResponse>> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const identity =
            didWrite === undefined
                ? undefined
                : await lockIdentity({
                      tx,
                      didWrite,
                      now,
                      observedIdentity: undefined,
                  });
        const userId =
            identity?.isRegistered && !identity.isLoggedIn
                ? undefined
                : identity?.userId;
        const conversation = await lockConversation({ tx, conversationSlugId });
        const configs = await tx
            .select()
            .from(creditVotingConfigTable)
            .where(eq(creditVotingConfigTable.id, conversation.configId));
        const config = configs.at(0);
        if (config === undefined)
            throw httpErrors.notFound("Conversation not found");
        const response =
            userId === undefined
                ? undefined
                : (
                      await buildQvOwnerResponseQuery({
                          db: tx,
                          userId,
                          conversationId: conversation.id,
                      })
                  ).at(0);
        // The lifecycle lock makes revision, exact statement versions and private baseline one coherent snapshot.
        const sources = await buildQvStatementSourcesQuery({
            db: tx,
            conversationId: conversation.id,
        });
        const displayContentByContentId =
            await buildRankingItemDisplayContentByContentId({
                db: tx,
                sources: sources.map((source) => ({
                    ...source,
                    conversationSlugId,
                })),
                preferences: displayPreferences,
            });
        return {
            viewerId: userId,
            statementSetRevision: config.statementSetRevision,
            allowOpposition: config.allowOpposition,
            isClosed: conversation.isClosed,
            items: sources.map(({ itemSlugId, contentId }) => {
                const displayContent = displayContentByContentId.get(contentId);
                if (displayContent === undefined)
                    throw httpErrors.internalServerError(
                        "Statement display unavailable",
                    );
                return { slugId: itemSlugId, displayContent };
            }),
            response: await readSavedResponse({
                tx,
                revision: response?.revision ?? 0,
                versionId: response?.versionId ?? null,
            }),
        };
    });
}

async function lockResponse({
    tx,
    userId,
    conversationId,
}: {
    tx: PostgresTransaction;
    userId: string;
    conversationId: number;
}) {
    const existing = (
        await tx
            .select({ response: qvResponseTable })
            .from(conversationParticipantTable)
            .innerJoin(
                qvResponseTable,
                eq(
                    qvResponseTable.participantId,
                    conversationParticipantTable.id,
                ),
            )
            .where(
                and(
                    eq(conversationParticipantTable.userId, userId),
                    eq(
                        conversationParticipantTable.conversationId,
                        conversationId,
                    ),
                ),
            )
            .for("update", { of: qvResponseTable })
    ).at(0)?.response;
    if (existing !== undefined) {
        if (existing.deletedAt !== null || existing.accountHiddenAt !== null)
            throw httpErrors.conflict("Response unavailable");
        return existing;
    }
    await tx
        .insert(conversationParticipantTable)
        .values({ userId, conversationId })
        .onConflictDoNothing();
    const participants = await tx
        .select({ id: conversationParticipantTable.id })
        .from(conversationParticipantTable)
        .where(
            and(
                eq(conversationParticipantTable.userId, userId),
                eq(conversationParticipantTable.conversationId, conversationId),
            ),
        );
    const participant = participants.at(0);
    if (participant === undefined)
        throw httpErrors.conflict("Participant unavailable");
    await tx
        .insert(qvResponseTable)
        .values({ participantId: participant.id, conversationId })
        .onConflictDoNothing();
    const responses = await tx
        .select()
        .from(qvResponseTable)
        .where(eq(qvResponseTable.participantId, participant.id))
        .for("update");
    const response = responses.at(0);
    if (response?.deletedAt !== null || response.accountHiddenAt !== null)
        throw httpErrors.conflict("Response unavailable");
    return response;
}

function requestHash(command: Command): string {
    const { request } = command;
    // Canonical ordering makes a retry with the same sparse response equivalent.
    return createHash("sha256")
        .update(
            JSON.stringify({
                action: command.action,
                expectedViewerId: request.expectedViewerId,
                expectedResponseRevision: request.expectedResponseRevision,
                ...(command.action === "save"
                    ? {
                          expectedStatementSetRevision:
                              command.request.expectedStatementSetRevision,
                          allocations: command.request.allocations
                              .map(({ itemId, sourceVersion, votes }) => ({
                                  itemId,
                                  sourceVersion,
                                  votes,
                              }))
                              .sort((a, b) =>
                                  a.itemId < b.itemId
                                      ? -1
                                      : a.itemId > b.itemId
                                        ? 1
                                        : 0,
                              ),
                      }
                    : {}),
            }),
        )
        .digest("hex");
}

async function persistCommand({
    tx,
    userId,
    conversationId,
    command,
    now,
    requireReceipt,
}: {
    tx: PostgresTransaction;
    userId: string;
    conversationId: number;
    command: PreparedCommand;
    now: Date;
    requireReceipt: boolean;
}): Promise<SavedResponse> {
    const response = await lockResponse({ tx, userId, conversationId });
    const hash = requestHash(command);
    const previousCommands = await buildQvCommandReceiptQuery({
        db: tx,
        responseId: response.id,
        commandId: command.request.commandId,
    });
    const receipt = previousCommands.at(0);
    if (receipt !== undefined) {
        if (receipt.requestHash !== hash) reject("idempotency_conflict");
        return await readSavedResponse({
            tx,
            revision: receipt.resultRevision,
            versionId: receipt.resultVersionId,
        });
    }
    if (requireReceipt) reject("identity_conflict");
    if (response.revision !== command.request.expectedResponseRevision)
        reject("response_conflict");
    let versionId: string | null = null;
    let saved: SavedResponse["saved"];
    if (command.action === "save") {
        const { request } = command;
        const ballot = parseQvBallot({
            allocations: request.allocations,
            config: { allowNegativeVotes: command.allowOpposition },
        });
        if (!ballot.valid || ballot.allocations.length === 0)
            reject("invalid_allocations");
        const items = await buildQvAllocationItemsQuery({
            db: tx,
            conversationId,
            itemSlugs: request.allocations.map(({ itemId }) => itemId),
        });
        const bySlug = new Map(items.map((item) => [item.slugId, item]));
        const allocations = request.allocations
            .map((allocation) => {
                const item = bySlug.get(allocation.itemId);
                if (item?.sourceVersion !== allocation.sourceVersion)
                    reject("statement_conflict");
                return {
                    conversationId,
                    itemId: item.id,
                    contentId: item.contentId,
                    votes: allocation.votes,
                    slugId: item.slugId,
                    sourceVersion: item.sourceVersion,
                    position: item.position,
                };
            })
            .sort((a, b) => a.position - b.position || a.itemId - b.itemId);
        const versions = await tx
            .insert(qvResponseVersionTable)
            .values({
                responseId: response.id,
                conversationId,
                statementSetRevision: request.expectedStatementSetRevision,
                allowOpposition: command.allowOpposition,
                creditsSpent: ballot.creditsUsed,
                createdAt: now,
            })
            .returning({
                id: qvResponseVersionTable.id,
                createdAt: qvResponseVersionTable.createdAt,
            });
        const version = versions.at(0);
        if (version === undefined)
            throw httpErrors.internalServerError("Failed to save response");
        versionId = version.id;
        await tx.insert(qvAllocationTable).values(
            allocations.map(({ conversationId, itemId, contentId, votes }) => ({
                conversationId,
                itemId,
                contentId,
                votes,
                versionId: version.id,
            })),
        );
        saved = {
            savedAt: version.createdAt,
            creditsSpent: ballot.creditsUsed,
            allocations: allocations.map(
                ({ slugId, sourceVersion, votes }) => ({
                    itemId: slugId,
                    sourceVersion,
                    votes,
                }),
            ),
        };
    }
    const revision = response.revision + 1;
    await tx
        .update(qvResponseTable)
        .set({ revision, currentVersionId: versionId })
        .where(eq(qvResponseTable.id, response.id));
    await tx.insert(qvResponseCommandTable).values({
        responseId: response.id,
        commandId: command.request.commandId,
        requestHash: hash,
        resultRevision: revision,
        resultVersionId: versionId,
        createdAt: now,
    });
    await scheduleQvStatsRefresh({ db: tx, conversationIds: [conversationId] });
    // All values come from server validation and INSERT RETURNING, not a
    // replica-sensitive reread or an optimistic reconstruction in the browser.
    return { revision, saved };
}

interface MutationContext {
    db: PostgresJsDatabase;
    didWrite: string;
    userAgent: string;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}
async function mutateQvResponse({
    db,
    command,
    didWrite,
    userAgent,
    now,
    currentDisplayLanguage,
}: MutationContext & { command: Command }): Promise<MutationResponse> {
    try {
        return await getPrimaryDatabase(db).transaction(
            async (tx): Promise<MutationResponse> => {
                const admissionContext = {
                    db: tx,
                    conversationSlugId: command.request.conversationSlugId,
                    didWrite,
                    userAgent,
                    now,
                    currentDisplayLanguage,
                };
                const observedIdentity = await observeDeviceIdentity({
                    tx,
                    didWrite,
                });
                // Only unknown devices need an initial admission to register a
                // guest. Known viewers run admission once, under lifecycle locks.
                const initial = observedIdentity.isKnown
                    ? undefined
                    : await checkConversationParticipation(admissionContext);
                if (initial !== undefined && !initial.success)
                    throw new RejectedCommand(initial);
                const identity = await lockIdentity({
                    tx,
                    didWrite,
                    now,
                    observedIdentity: observedIdentity.isKnown
                        ? observedIdentity
                        : undefined,
                });
                if (
                    identity === undefined ||
                    (initial !== undefined &&
                        identity.userId !== initial.participantId)
                )
                    reject("identity_conflict");
                const userId = identity.userId;
                const expectedViewerId = command.request.expectedViewerId;
                if (
                    expectedViewerId !== undefined &&
                    expectedViewerId !== userId
                )
                    reject("identity_conflict");
                // An anonymous command may create a guest once, or replay its receipt.
                // It must never become a new write after that signing key changes identity.
                const requireReceipt =
                    expectedViewerId === undefined &&
                    (observedIdentity.isKnown || identity.isRegistered);
                const conversation = await lockConversation({
                    tx,
                    conversationSlugId: command.request.conversationSlugId,
                });
                const allowed =
                    await checkConversationParticipationWithDeviceStatus({
                        ...admissionContext,
                        deviceStatus: identity,
                    });
                if (!allowed.success) throw new RejectedCommand(allowed);
                if (allowed.participantId !== userId)
                    reject("identity_conflict");
                const persist = (preparedCommand: PreparedCommand) =>
                    persistCommand({
                        tx,
                        userId,
                        conversationId: conversation.id,
                        command: preparedCommand,
                        now,
                        requireReceipt,
                    });
                if (command.action === "withdraw")
                    return {
                        success: true,
                        response: await persist(command),
                        loginStatus: projectKnownDeviceLoginStatus(identity),
                    };
                const result = await withQvStatementSetForResponseSave({
                    tx,
                    conversationId: conversation.id,
                    expectedRevision:
                        command.request.expectedStatementSetRevision,
                    persist: (config) =>
                        persist({
                            ...command,
                            allowOpposition: config.allowOpposition,
                        }),
                });
                if (!result.success) reject("statement_conflict");
                return {
                    success: true,
                    response: result.value,
                    loginStatus: projectKnownDeviceLoginStatus(identity),
                };
            },
        );
    } catch (error) {
        if (error instanceof RejectedCommand) return error.result;
        throw error;
    }
}

export async function saveQvResponse({
    request,
    ...context
}: MutationContext & { request: SaveRequest }): Promise<MutationResponse> {
    return await mutateQvResponse({
        ...context,
        command: { action: "save", request: Dto.qvSaveRequest.parse(request) },
    });
}
export async function withdrawQvResponse({
    request,
    ...context
}: MutationContext & { request: WithdrawRequest }): Promise<MutationResponse> {
    return await mutateQvResponse({
        ...context,
        command: {
            action: "withdraw",
            request: Dto.qvWithdrawRequest.parse(request),
        },
    });
}
