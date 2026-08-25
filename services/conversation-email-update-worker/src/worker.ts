import type { BaseLogger } from "pino";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
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

export interface ConversationEmailUpdateWorker {
    run: () => Promise<void>;
    shutdown: () => Promise<void>;
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

function sleep({
    ms,
    signal,
}: {
    ms: number;
    signal: AbortSignal;
}): Promise<void> {
    return new Promise((resolve) => {
        if (signal.aborted) {
            resolve();
            return;
        }
        const timeout = setTimeout(resolve, ms);
        signal.addEventListener(
            "abort",
            () => {
                clearTimeout(timeout);
                resolve();
            },
            { once: true },
        );
    });
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

function createRateBudget(sendsPerSecond: number): {
    takeAvailable: (maximum: number) => number;
} {
    let available = sendsPerSecond;
    let lastRefill = Date.now();
    return {
        takeAvailable: (maximum) => {
            const now = Date.now();
            available = Math.min(
                sendsPerSecond,
                available + ((now - lastRefill) / 1_000) * sendsPerSecond,
            );
            lastRefill = now;
            const granted = Math.min(maximum, Math.floor(available));
            available -= granted;
            return granted;
        },
    };
}

export function createConversationEmailUpdateWorker({
    db,
    provider,
    config,
    environment,
    log,
    conversationId,
}: CreateConversationEmailUpdateWorkerParams): ConversationEmailUpdateWorker {
    const shutdownController = new AbortController();
    const rateBudget = createRateBudget(config.sendsPerSecond);
    let running = false;
    let runPromise: Promise<void> | undefined;
    let stoppedLogged = false;
    let lastHeartbeatAt = Date.now();

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
                    await sleep({
                        ms: attempt * 250,
                        signal: shutdownController.signal,
                    });
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

    const tick = async (): Promise<TickCounts> => {
        const counts = emptyTickCounts();
        if (conversationId === undefined) {
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
        }

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
        if (
            recipientRecovery.sendLeaseCount +
                recipientRecovery.claimLeaseCount +
                testRecovery.sendLeaseCount +
                testRecovery.claimLeaseCount >
            0
        ) {
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
        }
        if (tickMode === "kill_switch") {
            counts.deliveriesStopped = await stopActiveDeliveriesForKillSwitch({
                db,
                conversationId,
            });
            await aggregateDeliveryStates({ db, conversationId });
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
            return counts;
        }
        if (provider === undefined || config.siteBaseUrl === undefined) {
            throw new Error(
                "Enabled Conversation Email worker is not configured",
            );
        }

        const materialization = await materializeOneDeliveryPage({
            db,
            pageSize: config.batchSize,
            conversationId,
        });
        if (materialization !== undefined) {
            switch (materialization.kind) {
                case "page":
                    counts.pageCandidates = materialization.pageCandidateCount;
                    counts.inserted = materialization.insertedCount;
                    counts.materializedParticipants =
                        materialization.materializedParticipantCount;
                    counts.frequencyCapped =
                        materialization.frequencyCappedCount;
                    counts.ineligible = materialization.ineligibleCount;
                    emit({
                        level: "info",
                        event: {
                            event: "materialization_page",
                            outcome: "success",
                            deliveryId: materialization.deliveryId,
                            exhausted: materialization.exhausted,
                            counts: {
                                pageCandidates:
                                    materialization.pageCandidateCount,
                                inserted: materialization.insertedCount,
                                materializedParticipants:
                                    materialization.materializedParticipantCount,
                                frequencyCapped:
                                    materialization.frequencyCappedCount,
                                ineligible: materialization.ineligibleCount,
                            },
                        },
                    });
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
                        counts.pageCandidates =
                            materialization.pageCandidateCount;
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
                                          inserted:
                                              materialization.insertedCount,
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
        }

        let capacity = rateBudget.takeAvailable(config.batchSize);
        if (capacity > 0) {
            const testAttempts = await claimTestAttempts({
                db,
                workerId: config.workerId,
                batchSize: capacity,
                leaseSeconds: config.leaseSeconds,
                conversationId,
            });
            counts.testAttemptsClaimed = testAttempts.length;
            capacity -= testAttempts.length;
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
        }
        if (capacity > 0) {
            const recipients = await claimRecipients({
                db,
                workerId: config.workerId,
                batchSize: capacity,
                leaseSeconds: config.leaseSeconds,
                conversationId,
            });
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
        }
        await aggregateDeliveryStates({ db, conversationId });
        return counts;
    };

    const run = async (): Promise<void> => {
        if (running)
            throw new Error("Conversation Email Updates worker is running");
        running = true;
        runPromise = (async () => {
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
            while (!shutdownController.signal.aborted) {
                const iterationStartedAt = Date.now();
                try {
                    const counts = await tick();
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
                    } else if (
                        now - lastHeartbeatAt >=
                        config.heartbeatIntervalMs
                    ) {
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
                await sleep({
                    ms: config.pollIntervalMs,
                    signal: shutdownController.signal,
                });
            }
        })();
        await runPromise;
        running = false;
    };

    return {
        run,
        shutdown: async () => {
            shutdownController.abort();
            if (runPromise !== undefined) await runPromise;
            if (!stoppedLogged) {
                emit({
                    level: "info",
                    event: { event: "worker_stopped", outcome: "stopped" },
                });
                stoppedLogged = true;
            }
        },
    };
}
