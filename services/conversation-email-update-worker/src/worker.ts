import type { BaseLogger } from "pino";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { ConversationEmailWorkerConfig } from "./config.js";
import type { ConversationEmailProvider } from "./provider.js";
import { renderConversationEmail } from "./renderer.js";
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

    const finalizeProviderOutcome = async ({
        finalize,
    }: {
        finalize: () => Promise<void>;
    }): Promise<void> => {
        let lastError: unknown;
        for (let attempt = 1; attempt <= 5; attempt += 1) {
            try {
                await finalize();
                return;
            } catch (error: unknown) {
                lastError = error;
                log.error(
                    error,
                    `[Conversation Email Updates] Provider outcome finalization attempt ${attempt.toString()} failed`,
                );
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

    const processTest = async (work: ClaimedTestWork): Promise<void> => {
        if (provider === undefined || config.siteBaseUrl === undefined) return;
        if (!(await authorizeTestAttempt({ db, work }))) return;
        const conversations = await getUpdateConversationLinks({
            db,
            updateId: work.updateId,
            recipientId: undefined,
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
            actions: undefined,
        });
        if (
            !(await markTestAttempting({
                db,
                work,
                leaseSeconds: config.leaseSeconds,
            }))
        )
            return;
        const result = await provider.send({
            to: work.destinationEmail,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            replyToEmail: work.replyToEmail,
            unsubscribeUrl: undefined,
            tags: {
                conversation_update_id: String(work.updateId),
                conversation_update_test_id: work.publicId,
                message_type: "conversation_update_test",
                environment,
            },
        });
        await finalizeProviderOutcome({
            finalize: async () => {
                await finalizeTestAttempt({ db, work, result });
            },
        });
    };

    const processRecipient = async (
        claimed: ClaimedRecipient,
    ): Promise<void> => {
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
        const result = await provider.send({
            to: authorized.to,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
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
        await finalizeProviderOutcome({
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

    const processSns = async (item: ClaimedSnsInboxItem): Promise<void> => {
        try {
            await applySnsInboxItem({ db, item });
        } catch (error: unknown) {
            log.error(error, "[Conversation Email Updates] SNS event failed");
            await rescheduleSnsInboxItem({ db, item, error });
        }
    };

    const tick = async (): Promise<void> => {
        if (conversationId === undefined) {
            const snsItems = await claimSnsInboxItems({
                db,
                workerId: config.workerId,
                batchSize: config.batchSize,
                leaseSeconds: config.leaseSeconds,
            });
            await runWithConcurrency({
                items: snsItems,
                concurrency: config.concurrency,
                process: processSns,
            });
        }

        const tickMode = decideWorkerTickMode({
            enabled: config.enabled,
            killSwitch: config.killSwitch,
        });
        if (tickMode === "disabled") return;
        await recoverExpiredRecipientLeases({ db, conversationId });
        await recoverExpiredTestAttemptLeases({ db, conversationId });
        if (tickMode === "kill_switch") {
            await stopActiveDeliveriesForKillSwitch({ db, conversationId });
            await aggregateDeliveryStates({ db, conversationId });
            return;
        }
        if (provider === undefined || config.siteBaseUrl === undefined) {
            throw new Error(
                "Enabled Conversation Email worker is not configured",
            );
        }

        await materializeOneDeliveryPage({
            db,
            pageSize: config.batchSize,
            conversationId,
        });

        let capacity = rateBudget.takeAvailable(config.batchSize);
        if (capacity > 0) {
            const testAttempts = await claimTestAttempts({
                db,
                workerId: config.workerId,
                batchSize: capacity,
                leaseSeconds: config.leaseSeconds,
                conversationId,
            });
            capacity -= testAttempts.length;
            await runWithConcurrency({
                items: testAttempts,
                concurrency: config.concurrency,
                process: processTest,
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
            await runWithConcurrency({
                items: recipients,
                concurrency: config.concurrency,
                process: processRecipient,
            });
        }
        await aggregateDeliveryStates({ db, conversationId });
    };

    const run = async (): Promise<void> => {
        if (running)
            throw new Error("Conversation Email Updates worker is running");
        running = true;
        runPromise = (async () => {
            log.info(
                `[Conversation Email Updates] Worker ${config.workerId} started; sending ${config.enabled && !config.killSwitch ? "enabled" : "disabled"}`,
            );
            while (!shutdownController.signal.aborted) {
                try {
                    await tick();
                } catch (error: unknown) {
                    log.error(
                        error,
                        "[Conversation Email Updates] Worker iteration failed",
                    );
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
            log.info("[Conversation Email Updates] Worker stopped");
        },
    };
}
