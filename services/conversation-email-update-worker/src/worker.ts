import type { BaseLogger } from "pino";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { setTimeout } from "node:timers/promises";
import type { ConversationEmailWorkerConfig } from "./config.js";
import type { ConversationEmailProvider, ProviderFailure } from "./provider.js";
import { renderConversationEmail } from "./renderer.js";
import {
    normalizeError,
    normalizeProviderError,
    writeStructuredLog,
    type StructuredEvent,
} from "./observability.js";
import {
    aggregateDeliveryStates,
    authorizeRecipientSend,
    authorizeTestAttempt,
    claimRecipients,
    claimTestAttempts,
    finalizeRecipientSend,
    finalizeTestAttempt,
    getUpdateConversationLinks,
    markTestAttempting,
    materializeOneDeliveryPage,
    recoverExpiredRecipientLeases,
    recoverExpiredTestAttemptLeases,
    releaseClaimedRecipient,
    releaseClaimedTestAttempt,
    stopActiveDeliveriesForKillSwitch,
    type ClaimedRecipient,
    type ClaimedTestWork,
} from "./store.js";
import {
    applySnsInboxItem,
    claimSnsInboxItems,
    rescheduleSnsInboxItem,
    type ClaimedSnsInboxItem,
    type SnsInboxItemOutcome,
} from "./sns.js";
import { decideWorkerTickMode } from "./workerTransition.js";
import { createWakeableLane, type WakeableLane } from "./workerLane.js";
import {
    createSendRateBudget,
    type SendKind,
    type SendRateReservation,
} from "./sendRateBudget.js";

export interface ConversationEmailUpdateWorker {
    run: () => Promise<void>;
    shutdown: () => Promise<void>;
    wake: (work?: ConversationEmailUpdateWorkWake) => void;
}

export const CONVERSATION_EMAIL_UPDATE_WORK_CHANNEL =
    "conversation_email_update_work";

export type ConversationEmailUpdateWorkWake =
    "delivery" | "recipient" | "sns" | "test";

export function parseConversationEmailUpdateWorkWake(
    payload: string,
): ConversationEmailUpdateWorkWake | undefined {
    switch (payload) {
        case "delivery":
        case "recipient":
        case "sns":
        case "test":
            return payload;
        default:
            return undefined;
    }
}

interface CreateConversationEmailUpdateWorkerParams {
    db: PostgresDatabase;
    provider: ConversationEmailProvider | undefined;
    config: ConversationEmailWorkerConfig;
    environment: string;
    log: Pick<BaseLogger, "info" | "warn" | "error">;
    conversationId?: number;
}

interface TickCounts {
    snsClaimed: number;
    snsApplied: number;
    snsRetryWait: number;
    snsDeadLetter: number;
    snsLeaseLost: number;
    snsProcessingErrors: number;
    testSendLeasesRecovered: number;
    testClaimLeasesRecovered: number;
    recipientSendLeasesRecovered: number;
    recipientClaimLeasesRecovered: number;
    deliveriesStopped: number;
    pageCandidates: number;
    inserted: number;
    materializationFailed: number;
    materializationStopped: number;
    materializedParticipants: number;
    frequencyCapped: number;
    ineligible: number;
    testAttemptsClaimed: number;
    testProviderAccepted: number;
    recipientsClaimed: number;
    recipientProviderAccepted: number;
}

type WorkerLifecycleState = "starting" | "running" | "quiescing" | "stopped";

type LaneName =
    | "sns"
    | "recovery"
    | "materialization"
    | "testSends"
    | "recipientSends"
    | "aggregation";

function emptyTickCounts(): TickCounts {
    return {
        snsClaimed: 0,
        snsApplied: 0,
        snsRetryWait: 0,
        snsDeadLetter: 0,
        snsLeaseLost: 0,
        snsProcessingErrors: 0,
        testSendLeasesRecovered: 0,
        testClaimLeasesRecovered: 0,
        recipientSendLeasesRecovered: 0,
        recipientClaimLeasesRecovered: 0,
        deliveriesStopped: 0,
        pageCandidates: 0,
        inserted: 0,
        materializationFailed: 0,
        materializationStopped: 0,
        materializedParticipants: 0,
        frequencyCapped: 0,
        ineligible: 0,
        testAttemptsClaimed: 0,
        testProviderAccepted: 0,
        recipientsClaimed: 0,
        recipientProviderAccepted: 0,
    };
}

function tickHadWork(counts: TickCounts): boolean {
    return Object.values(counts).some((count) => count > 0);
}

function tickHadFailure(counts: TickCounts): boolean {
    return (
        counts.snsDeadLetter > 0 ||
        counts.snsLeaseLost > 0 ||
        counts.snsProcessingErrors > 0 ||
        counts.materializationFailed > 0
    );
}

function providerError(result: ProviderFailure) {
    return normalizeProviderError({ code: result.code, outcome: result.kind });
}

export async function runWithConcurrency<T>({
    items,
    concurrency,
    process,
}: {
    items: readonly T[];
    concurrency: number;
    process: (item: T) => Promise<void>;
}): Promise<void> {
    let nextIndex = 0;
    const errors: unknown[] = [];
    const runners = Array.from(
        { length: Math.min(concurrency, items.length) },
        async () => {
            while (nextIndex < items.length) {
                const item = items[nextIndex];
                nextIndex += 1;
                if (item === undefined) continue;
                try {
                    await process(item);
                } catch (error: unknown) {
                    errors.push(error);
                }
            }
        },
    );
    await Promise.all(runners);
    const firstError = errors.at(0);
    if (firstError !== undefined) {
        throw firstError instanceof Error
            ? firstError
            : new Error("Concurrent worker item failed");
    }
}

export function createConversationEmailUpdateWorker({
    db,
    provider,
    config,
    environment,
    log,
    conversationId,
}: CreateConversationEmailUpdateWorkerParams): ConversationEmailUpdateWorker {
    const rateBudget = createSendRateBudget({
        sendsPerSecond: config.sendsPerSecond,
    });
    const lanes = {
        sns: createWakeableLane(),
        recovery: createWakeableLane(),
        materialization: createWakeableLane(),
        testSends: createWakeableLane(),
        recipientSends: createWakeableLane(),
        aggregation: createWakeableLane(),
    } satisfies Record<LaneName, WakeableLane>;
    let lifecycle: WorkerLifecycleState = "starting";
    let runPromise: Promise<void> | undefined;
    let shutdownPromise: Promise<void> | undefined;
    let lastHeartbeatAt = Date.now();

    const canAdmit = (): boolean => lifecycle === "running";

    const emit = ({
        level,
        event,
    }: {
        level: "error" | "info" | "warn";
        event: StructuredEvent;
    }): void => {
        writeStructuredLog({ log, level, event });
    };

    type FinalizationParams =
        | {
              finalize: () => Promise<void>;
              failureEvent: "recipient_finalization_failed";
              attemptId: string;
              recipientKind: "owner" | "participant";
          }
        | {
              finalize: () => Promise<void>;
              failureEvent: "test_finalization_failed";
              testAttemptId: string;
          };

    const finalizeProviderOutcome = async (
        params: FinalizationParams,
    ): Promise<void> => {
        let lastError: unknown;
        for (let attempt = 1; attempt <= 5; attempt += 1) {
            try {
                await params.finalize();
                return;
            } catch (error: unknown) {
                lastError = error;
                const outcome = attempt < 5 ? "retry" : "failure";
                if (params.failureEvent === "test_finalization_failed") {
                    emit({
                        level: "error",
                        event: {
                            event: params.failureEvent,
                            outcome,
                            finalizationAttempt: attempt,
                            testAttemptId: params.testAttemptId,
                            error: normalizeError(error),
                        },
                    });
                } else {
                    emit({
                        level: "error",
                        event: {
                            event: params.failureEvent,
                            outcome,
                            finalizationAttempt: attempt,
                            attemptId: params.attemptId,
                            recipientKind: params.recipientKind,
                            error: normalizeError(error),
                        },
                    });
                }
                if (attempt < 5) {
                    await setTimeout(attempt * 250);
                }
            }
        }
        throw lastError instanceof Error
            ? lastError
            : new Error("Provider outcome finalization failed");
    };

    const processTest = async ({
        work,
        onProviderAccepted,
    }: {
        work: ClaimedTestWork;
        onProviderAccepted: () => void;
    }): Promise<void> => {
        if (provider === undefined || config.siteBaseUrl === undefined) return;
        if (!canAdmit()) {
            await releaseClaimedTestAttempt({ db, work });
            return;
        }
        if (!(await authorizeTestAttempt({ db, work }))) return;
        const conversations = await getUpdateConversationLinks({
            db,
            updateId: work.updateId,
            kind: "test",
            siteBaseUrl: config.siteBaseUrl,
        });
        const rendered = renderConversationEmail({
            subject: work.subject,
            bodyHtml: work.bodyHtml,
            bodyPlainText: work.bodyPlainText,
            projectTitle: work.projectTitle,
            conversations,
            language: work.language,
            variant: "test",
        });
        if (!canAdmit()) {
            await releaseClaimedTestAttempt({ db, work });
            return;
        }
        if (
            !(await markTestAttempting({
                db,
                work,
                leaseSeconds: config.leaseSeconds,
            }))
        )
            return;
        const sendStartedAt = Date.now();
        const result = await provider.send({
            to: work.destinationEmail,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            replyToName: work.replyToName,
            replyToEmail: work.replyToEmail,
            unsubscribeUrl: undefined,
            tags: {
                conversation_update_id: String(work.updateId),
                conversation_update_test_id: work.publicId,
                message_type: "conversation_update_test",
                environment,
            },
        });
        if (result.kind === "provider_accepted") {
            onProviderAccepted();
        } else {
            emit({
                level: "warn",
                event: {
                    event: "test_provider_outcome",
                    outcome: result.kind,
                    testAttemptId: work.publicId,
                    provider: config.provider,
                    durationMs: Date.now() - sendStartedAt,
                    error: providerError(result),
                },
            });
        }
        await finalizeProviderOutcome({
            failureEvent: "test_finalization_failed",
            testAttemptId: work.publicId,
            finalize: async () => {
                await finalizeTestAttempt({ db, work, result });
            },
        });
    };

    const processRecipient = async ({
        claimed,
        onProviderAccepted,
    }: {
        claimed: ClaimedRecipient;
        onProviderAccepted: () => void;
    }): Promise<void> => {
        if (provider === undefined || config.siteBaseUrl === undefined) return;
        if (!canAdmit()) {
            await releaseClaimedRecipient({ db, claimed });
            return;
        }
        const authorized = await authorizeRecipientSend({
            db,
            claimed,
            siteBaseUrl: config.siteBaseUrl,
            leaseSeconds: config.leaseSeconds,
        });
        if (authorized === undefined) return;
        const rendered = renderConversationEmail({
            subject: authorized.subject,
            bodyHtml: authorized.bodyHtml,
            bodyPlainText: authorized.bodyPlainText,
            projectTitle: authorized.projectTitle,
            conversations: authorized.conversations,
            language: authorized.language,
            variant:
                authorized.kind === "participant"
                    ? "participant"
                    : "owner_copy",
            actions: authorized.actions,
        });
        const sendStartedAt = Date.now();
        const result = await provider.send({
            to: authorized.to,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            replyToName: authorized.replyToName,
            replyToEmail: authorized.replyToEmail,
            unsubscribeUrl: authorized.unsubscribeUrl,
            tags: {
                conversation_update_attempt_id: authorized.attemptPublicId,
                conversation_update_id: String(authorized.updateId),
                conversation_update_recipient_id: String(
                    authorized.recipientId,
                ),
                project_id: String(authorized.projectId),
                authorizing_organization_id: String(
                    authorized.authorizingOrganizationId,
                ),
                message_type: "conversation_update",
                environment,
            },
        });
        const recipientKind =
            authorized.kind === "participant" ? "participant" : "owner";
        if (result.kind === "provider_accepted") {
            onProviderAccepted();
        } else {
            emit({
                level: "warn",
                event: {
                    event: "recipient_provider_outcome",
                    outcome: result.kind,
                    attemptId: authorized.attemptPublicId,
                    recipientKind,
                    provider: config.provider,
                    durationMs: Date.now() - sendStartedAt,
                    error: providerError(result),
                },
            });
        }
        await finalizeProviderOutcome({
            failureEvent: "recipient_finalization_failed",
            attemptId: authorized.attemptPublicId,
            recipientKind,
            finalize: async () => {
                await finalizeRecipientSend({
                    db,
                    claimed,
                    authorized,
                    result,
                });
            },
        });
    };

    const processSns = async (
        item: ClaimedSnsInboxItem,
    ): Promise<{
        outcome: SnsInboxItemOutcome;
        processingError: boolean;
    }> => {
        try {
            return {
                outcome: await applySnsInboxItem({ db, item }),
                processingError: false,
            };
        } catch (error: unknown) {
            emit({
                level: "error",
                event: {
                    event: "sns_item_failed",
                    outcome: "failure",
                    snsInboxId: item.id.toString(),
                    error: normalizeError(error),
                },
            });
            return {
                outcome: await rescheduleSnsInboxItem({ db, item, error }),
                processingError: true,
            };
        }
    };

    const wakeAll = (): void => {
        for (const lane of Object.values(lanes)) lane.wake();
    };

    const wakeWorkLanes = (
        work: ConversationEmailUpdateWorkWake | undefined,
    ): void => {
        if (work === undefined) {
            wakeAll();
            return;
        }
        switch (work) {
            case "delivery":
                lanes.materialization.wake();
                lanes.recipientSends.wake();
                lanes.aggregation.wake();
                break;
            case "recipient":
                lanes.recipientSends.wake();
                break;
            case "sns":
                lanes.sns.wake();
                break;
            case "test":
                lanes.testSends.wake();
                break;
        }
    };

    const scheduleSendReservation = ({
        kind,
        reservation,
    }: {
        kind: SendKind;
        reservation: SendRateReservation;
    }): void => {
        const lane = kind === "test" ? lanes.testSends : lanes.recipientSends;
        const preferredLane =
            reservation.preferredKind === "test"
                ? lanes.testSends
                : lanes.recipientSends;
        if (reservation.count === 0 && reservation.preferredKind !== kind) {
            preferredLane.wake();
        }
        if (reservation.retryAfterMs !== undefined) {
            lane.wakeAfter(reservation.retryAfterMs);
        }
    };

    const releaseSendCapacity = (count: number): void => {
        if (count <= 0) return;
        const waitingKind = rateBudget.release(count);
        if (waitingKind === "test") lanes.testSends.wake();
        if (waitingKind === "recipient") lanes.recipientSends.wake();
    };

    const ensureSendingConfigured = (): void => {
        if (provider === undefined || config.siteBaseUrl === undefined) {
            throw new Error(
                "Enabled Conversation Email worker is not configured",
            );
        }
    };

    const reportIteration = ({
        counts,
        iterationStartedAt,
    }: {
        counts: TickCounts;
        iterationStartedAt: number;
    }): void => {
        const now = Date.now();
        if (tickHadWork(counts)) {
            const failed = tickHadFailure(counts);
            emit({
                level: failed ? "warn" : "info",
                event: {
                    event: "tick_summary",
                    outcome: failed ? "failure" : "success",
                    durationMs: now - iterationStartedAt,
                    counts,
                },
            });
            lastHeartbeatAt = now;
        } else if (now - lastHeartbeatAt >= config.heartbeatIntervalMs) {
            emit({
                level: "info",
                event: {
                    event: "worker_heartbeat",
                    outcome: "idle",
                    durationMs: now - iterationStartedAt,
                    heartbeatIntervalMs: config.heartbeatIntervalMs,
                },
            });
            lastHeartbeatAt = now;
        }
    };

    const superviseIteration = async (
        iterate: () => Promise<TickCounts>,
    ): Promise<void> => {
        const iterationStartedAt = Date.now();
        try {
            const counts = await iterate();
            reportIteration({ counts, iterationStartedAt });
        } catch (error: unknown) {
            emit({
                level: "error",
                event: {
                    event: "iteration_failed",
                    outcome: "failure",
                    durationMs: Date.now() - iterationStartedAt,
                    error: normalizeError(error),
                },
            });
        }
    };

    const runSnsIteration = async (): Promise<TickCounts> => {
        const counts = emptyTickCounts();
        if (conversationId !== undefined || !canAdmit()) return counts;
        const snsItems = await claimSnsInboxItems({
            db,
            workerId: config.workerId,
            batchSize: config.batchSize,
            leaseSeconds: config.leaseSeconds,
        });
        counts.snsClaimed = snsItems.length;
        await runWithConcurrency({
            items: snsItems,
            concurrency: config.concurrency,
            process: async (item) => {
                const result = await processSns(item);
                if (result.processingError) counts.snsProcessingErrors += 1;
                switch (result.outcome) {
                    case "applied":
                        counts.snsApplied += 1;
                        break;
                    case "retry_wait":
                        counts.snsRetryWait += 1;
                        break;
                    case "dead_letter":
                        counts.snsDeadLetter += 1;
                        break;
                    case "lease_lost":
                        counts.snsLeaseLost += 1;
                        break;
                }
            },
        });
        if (snsItems.length > 0) {
            const outcome =
                counts.snsDeadLetter > 0
                    ? "failure"
                    : counts.snsLeaseLost > 0
                      ? "lease_lost"
                      : counts.snsRetryWait > 0
                        ? "retry"
                        : "success";
            emit({
                level: outcome === "success" ? "info" : "warn",
                event: {
                    event: "sns_batch",
                    outcome,
                    counts: {
                        snsClaimed: counts.snsClaimed,
                        snsApplied: counts.snsApplied,
                        snsRetryWait: counts.snsRetryWait,
                        snsDeadLetter: counts.snsDeadLetter,
                        snsLeaseLost: counts.snsLeaseLost,
                        snsProcessingErrors: counts.snsProcessingErrors,
                    },
                },
            });
        }
        if (snsItems.length === config.batchSize) lanes.sns.wake();
        return counts;
    };

    const runRecoveryIteration = async (): Promise<TickCounts> => {
        const counts = emptyTickCounts();
        const tickMode = decideWorkerTickMode({
            enabled: config.enabled,
            killSwitch: config.killSwitch,
        });
        if (tickMode === "disabled") return counts;
        const recipientRecovery = await recoverExpiredRecipientLeases({
            db,
            conversationId,
        });
        const testRecovery = await recoverExpiredTestAttemptLeases({
            db,
            conversationId,
        });
        counts.recipientSendLeasesRecovered = recipientRecovery.sendLeaseCount;
        counts.recipientClaimLeasesRecovered =
            recipientRecovery.claimLeaseCount;
        counts.testSendLeasesRecovered = testRecovery.sendLeaseCount;
        counts.testClaimLeasesRecovered = testRecovery.claimLeaseCount;
        const recoveredCount =
            recipientRecovery.sendLeaseCount +
            recipientRecovery.claimLeaseCount +
            testRecovery.sendLeaseCount +
            testRecovery.claimLeaseCount;
        if (recoveredCount > 0) {
            emit({
                level: "warn",
                event: {
                    event: "lease_recovery",
                    outcome: "success",
                    counts: {
                        recipientSendLeasesRecovered:
                            recipientRecovery.sendLeaseCount,
                        recipientClaimLeasesRecovered:
                            recipientRecovery.claimLeaseCount,
                        testSendLeasesRecovered: testRecovery.sendLeaseCount,
                        testClaimLeasesRecovered: testRecovery.claimLeaseCount,
                    },
                },
            });
            lanes.testSends.wake();
            lanes.recipientSends.wake();
            lanes.aggregation.wake();
        }
        if (tickMode === "kill_switch") {
            counts.deliveriesStopped = await stopActiveDeliveriesForKillSwitch({
                db,
                conversationId,
            });
            if (counts.deliveriesStopped > 0) {
                emit({
                    level: "warn",
                    event: {
                        event: "kill_switch_applied",
                        outcome: "applied",
                        counts: {
                            deliveriesStopped: counts.deliveriesStopped,
                        },
                    },
                });
            }
            lanes.aggregation.wake();
        }
        return counts;
    };

    const runMaterializationIteration = async (): Promise<TickCounts> => {
        const counts = emptyTickCounts();
        const tickMode = decideWorkerTickMode({
            enabled: config.enabled,
            killSwitch: config.killSwitch,
        });
        if (tickMode !== "sending" || !canAdmit()) return counts;
        ensureSendingConfigured();
        const materialization = await materializeOneDeliveryPage({
            db,
            pageSize: config.batchSize,
            conversationId,
        });
        if (materialization === undefined) return counts;
        switch (materialization.kind) {
            case "page":
                counts.pageCandidates = materialization.pageCandidateCount;
                counts.inserted = materialization.insertedCount;
                counts.materializedParticipants =
                    materialization.materializedParticipantCount;
                counts.frequencyCapped = materialization.frequencyCappedCount;
                counts.ineligible = materialization.ineligibleCount;
                emit({
                    level: "info",
                    event: {
                        event: "materialization_page",
                        outcome: "success",
                        deliveryId: materialization.deliveryId,
                        exhausted: materialization.exhausted,
                        counts: {
                            pageCandidates: materialization.pageCandidateCount,
                            inserted: materialization.insertedCount,
                            materializedParticipants:
                                materialization.materializedParticipantCount,
                            frequencyCapped:
                                materialization.frequencyCappedCount,
                            ineligible: materialization.ineligibleCount,
                        },
                    },
                });
                if (!materialization.exhausted) lanes.materialization.wake();
                if (materialization.insertedCount > 0) {
                    lanes.recipientSends.wake();
                }
                break;
            case "stopped":
                counts.materializationStopped = 1;
                emit({
                    level: "warn",
                    event: {
                        event: "materialization_stopped",
                        outcome: "stopped",
                        deliveryId: materialization.deliveryId,
                        materializationReason: materialization.reason,
                    },
                });
                break;
            case "failed":
                counts.materializationFailed = 1;
                if (materialization.reason === "no_eligible_participants") {
                    counts.pageCandidates = materialization.pageCandidateCount;
                    counts.inserted = materialization.insertedCount;
                    counts.materializedParticipants =
                        materialization.materializedParticipantCount;
                    counts.frequencyCapped =
                        materialization.frequencyCappedCount;
                    counts.ineligible = materialization.ineligibleCount;
                }
                emit({
                    level: "error",
                    event: {
                        event: "materialization_failed",
                        outcome: "failure",
                        deliveryId: materialization.deliveryId,
                        materializationReason: materialization.reason,
                        ...(materialization.reason ===
                        "no_eligible_participants"
                            ? {
                                  counts: {
                                      materializationFailed: 1,
                                      pageCandidates:
                                          materialization.pageCandidateCount,
                                      inserted: materialization.insertedCount,
                                      materializedParticipants:
                                          materialization.materializedParticipantCount,
                                      frequencyCapped:
                                          materialization.frequencyCappedCount,
                                      ineligible:
                                          materialization.ineligibleCount,
                                  },
                              }
                            : {}),
                    },
                });
                break;
        }
        return counts;
    };

    const runTestSendIteration = async (): Promise<TickCounts> => {
        const counts = emptyTickCounts();
        const tickMode = decideWorkerTickMode({
            enabled: config.enabled,
            killSwitch: config.killSwitch,
        });
        if (tickMode !== "sending" || !canAdmit()) return counts;
        ensureSendingConfigured();
        const reservation = rateBudget.take({
            kind: "test",
            maximum: config.batchSize,
        });
        const capacity = reservation.count;
        scheduleSendReservation({ kind: "test", reservation });
        if (capacity === 0 || !canAdmit()) {
            releaseSendCapacity(capacity);
            return counts;
        }
        let testAttempts: ClaimedTestWork[];
        try {
            testAttempts = await claimTestAttempts({
                db,
                workerId: config.workerId,
                batchSize: capacity,
                leaseSeconds: config.leaseSeconds,
                conversationId,
            });
        } catch (error: unknown) {
            releaseSendCapacity(capacity);
            throw error;
        }
        releaseSendCapacity(capacity - testAttempts.length);
        counts.testAttemptsClaimed = testAttempts.length;
        await runWithConcurrency({
            items: testAttempts,
            concurrency: config.concurrency,
            process: async (work) => {
                await processTest({
                    work,
                    onProviderAccepted: () => {
                        counts.testProviderAccepted += 1;
                    },
                });
            },
        });
        if (testAttempts.length === capacity) lanes.testSends.wake();
        return counts;
    };

    const runRecipientSendIteration = async (): Promise<TickCounts> => {
        const counts = emptyTickCounts();
        const tickMode = decideWorkerTickMode({
            enabled: config.enabled,
            killSwitch: config.killSwitch,
        });
        if (tickMode !== "sending" || !canAdmit()) return counts;
        ensureSendingConfigured();
        const reservation = rateBudget.take({
            kind: "recipient",
            maximum: config.batchSize,
        });
        const capacity = reservation.count;
        scheduleSendReservation({ kind: "recipient", reservation });
        if (capacity === 0 || !canAdmit()) {
            releaseSendCapacity(capacity);
            return counts;
        }
        let recipients: ClaimedRecipient[];
        try {
            recipients = await claimRecipients({
                db,
                workerId: config.workerId,
                batchSize: capacity,
                leaseSeconds: config.leaseSeconds,
                conversationId,
            });
        } catch (error: unknown) {
            releaseSendCapacity(capacity);
            throw error;
        }
        releaseSendCapacity(capacity - recipients.length);
        counts.recipientsClaimed = recipients.length;
        await runWithConcurrency({
            items: recipients,
            concurrency: config.concurrency,
            process: async (claimed) => {
                await processRecipient({
                    claimed,
                    onProviderAccepted: () => {
                        counts.recipientProviderAccepted += 1;
                    },
                });
            },
        });
        if (recipients.length === capacity) lanes.recipientSends.wake();
        if (recipients.length > 0) {
            await aggregateDeliveryStates({
                db,
                conversationId,
                deliveryIds: [
                    ...new Set(
                        recipients.map((recipient) => recipient.deliveryId),
                    ),
                ],
            });
        }
        return counts;
    };

    const runAggregationIteration = async (): Promise<TickCounts> => {
        const counts = emptyTickCounts();
        const tickMode = decideWorkerTickMode({
            enabled: config.enabled,
            killSwitch: config.killSwitch,
        });
        if (tickMode === "disabled") return counts;
        await aggregateDeliveryStates({ db, conversationId });
        return counts;
    };

    const runRuntime = async (): Promise<void> => {
        emit({
            level: "info",
            event: {
                event: "worker_started",
                outcome:
                    config.enabled && !config.killSwitch
                        ? "started"
                        : "disabled",
                sendingEnabled: config.enabled && !config.killSwitch,
                killSwitch: config.killSwitch,
                provider: config.provider,
                heartbeatIntervalMs: config.heartbeatIntervalMs,
            },
        });
        await Promise.all([
            lanes.sns.run({
                canIterate: canAdmit,
                intervalMs: config.pollIntervalMs,
                iterate: async () => {
                    await superviseIteration(runSnsIteration);
                },
            }),
            lanes.recovery.run({
                canIterate: canAdmit,
                intervalMs: config.pollIntervalMs,
                iterate: async () => {
                    await superviseIteration(runRecoveryIteration);
                },
            }),
            lanes.materialization.run({
                canIterate: canAdmit,
                intervalMs: config.pollIntervalMs,
                iterate: async () => {
                    await superviseIteration(runMaterializationIteration);
                },
            }),
            lanes.testSends.run({
                canIterate: canAdmit,
                intervalMs: config.pollIntervalMs,
                iterate: async () => {
                    await superviseIteration(runTestSendIteration);
                },
            }),
            lanes.recipientSends.run({
                canIterate: canAdmit,
                intervalMs: config.pollIntervalMs,
                iterate: async () => {
                    await superviseIteration(runRecipientSendIteration);
                },
            }),
            lanes.aggregation.run({
                canIterate: canAdmit,
                intervalMs: config.pollIntervalMs,
                iterate: async () => {
                    await superviseIteration(runAggregationIteration);
                },
            }),
        ]);
    };

    const run = (): Promise<void> => {
        if (lifecycle !== "starting" || runPromise !== undefined) {
            return Promise.reject(
                new Error("Conversation Email Updates worker is running"),
            );
        }
        lifecycle = "running";
        runPromise = runRuntime();
        return runPromise;
    };

    const shutdown = (): Promise<void> => {
        if (shutdownPromise !== undefined) return shutdownPromise;
        shutdownPromise = (async () => {
            if (lifecycle !== "stopped") {
                lifecycle = "quiescing";
                wakeAll();
                try {
                    if (runPromise !== undefined) await runPromise;
                } finally {
                    lifecycle = "stopped";
                }
            }
            emit({
                level: "info",
                event: { event: "worker_stopped", outcome: "stopped" },
            });
        })();
        return shutdownPromise;
    };

    return {
        run,
        shutdown,
        wake: (work) => {
            if (lifecycle === "starting" || lifecycle === "running") {
                wakeWorkLanes(work);
            }
        },
    };
}
