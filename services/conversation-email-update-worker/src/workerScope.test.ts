import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationEmailWorkerConfig } from "./config.js";

const storeMocks = vi.hoisted(() => ({
    aggregateDeliveryStates: vi.fn(async () => undefined),
    authorizeRecipientSend: vi.fn(async () => undefined),
    authorizeTestAttempt: vi.fn(async () => false),
    claimRecipients: vi.fn(async () => []),
    claimTestAttempts: vi.fn(async () => []),
    finalizeRecipientSend: vi.fn(async () => undefined),
    finalizeTestAttempt: vi.fn(async () => undefined),
    getUpdateConversationLinks: vi.fn(async () => []),
    markTestAttempting: vi.fn(async () => false),
    materializeOneDeliveryPage: vi.fn(async () => undefined),
    recoverExpiredRecipientLeases: vi.fn(async () => undefined),
    recoverExpiredTestAttemptLeases: vi.fn(async () => undefined),
    stopActiveDeliveriesForKillSwitch: vi.fn(async () => undefined),
}));
const snsMocks = vi.hoisted(() => ({
    applySnsInboxItem: vi.fn(async () => undefined),
    claimSnsInboxItems: vi.fn(async () => []),
    rescheduleSnsInboxItem: vi.fn(async () => undefined),
}));

vi.mock("./store.js", () => storeMocks);
vi.mock("./sns.js", () => snsMocks);

import { createConversationEmailUpdateWorker } from "./worker.js";

const clients: ReturnType<typeof postgres>[] = [];

function config(enabled: boolean): ConversationEmailWorkerConfig {
    return {
        enabled,
        killSwitch: false,
        sesRegion: "unused",
        fromAddress: undefined,
        configurationSetName: undefined,
        provider: "simulated",
        simulatorMode: "success",
        simulatorRetryableFailures: 1,
        workerId: "scope-test",
        pollIntervalMs: 10_000,
        batchSize: 25,
        concurrency: 1,
        sendsPerSecond: 25,
        leaseSeconds: 120,
        requestTimeoutMs: 20_000,
        siteBaseUrl: "http://127.0.0.1:8080",
    };
}

function database() {
    const client = postgres(
        "postgresql://postgres@127.0.0.1:1/not-used-by-mocked-store",
    );
    clients.push(client);
    return drizzle(client);
}

const log = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(async () => {
    await Promise.all(
        clients.splice(0).map(async (client) => {
            await client.end({ timeout: 0 });
        }),
    );
});

describe("conversation-scoped worker", () => {
    it("skips SNS and propagates the exact scope to every work operation", async () => {
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: { send: vi.fn() },
            config: config(true),
            environment: "development",
            log,
            conversationId: 42,
        });
        const running = worker.run();
        await vi.waitFor(() => {
            expect(storeMocks.aggregateDeliveryStates).toHaveBeenCalled();
        });
        await worker.shutdown();
        await running;

        expect(snsMocks.claimSnsInboxItems).not.toHaveBeenCalled();
        for (const operation of [
            storeMocks.recoverExpiredRecipientLeases,
            storeMocks.recoverExpiredTestAttemptLeases,
            storeMocks.materializeOneDeliveryPage,
            storeMocks.claimTestAttempts,
            storeMocks.claimRecipients,
            storeMocks.aggregateDeliveryStates,
        ]) {
            expect(operation).toHaveBeenCalledWith(
                expect.objectContaining({ conversationId: 42 }),
            );
        }
    });

    it("keeps production SNS behavior when no scope is supplied", async () => {
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: undefined,
            config: config(false),
            environment: "development",
            log,
        });
        const running = worker.run();
        await vi.waitFor(() => {
            expect(snsMocks.claimSnsInboxItems).toHaveBeenCalledOnce();
        });
        await worker.shutdown();
        await running;
    });

    it("stops and aggregates only the scoped kill-switch deliveries", async () => {
        const workerConfig = config(true);
        workerConfig.killSwitch = true;
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: { send: vi.fn() },
            config: workerConfig,
            environment: "development",
            log,
            conversationId: 91,
        });
        const running = worker.run();
        await vi.waitFor(() => {
            expect(
                storeMocks.stopActiveDeliveriesForKillSwitch,
            ).toHaveBeenCalledWith(
                expect.objectContaining({ conversationId: 91 }),
            );
        });
        await worker.shutdown();
        await running;

        expect(storeMocks.aggregateDeliveryStates).toHaveBeenCalledWith(
            expect.objectContaining({ conversationId: 91 }),
        );
        expect(storeMocks.materializeOneDeliveryPage).not.toHaveBeenCalled();
        expect(snsMocks.claimSnsInboxItems).not.toHaveBeenCalled();
    });
});
