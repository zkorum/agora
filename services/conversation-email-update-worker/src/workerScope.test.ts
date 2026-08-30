import { drizzle } from "drizzle-orm/postgres-js";
import { setTimeout } from "node:timers/promises";
import postgres from "postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationEmailWorkerConfig } from "./config.js";
import { structuredEventSchema } from "./observability.js";
import type {
    ConversationEmailProviderMessage,
    ProviderResult,
} from "./provider.js";
import type {
    AuthorizedRecipient,
    ClaimedRecipient,
    ClaimedTestWork,
    MaterializationResult,
} from "./store.js";
import type { ClaimedSnsInboxItem, SnsInboxItemOutcome } from "./sns.js";

const storeMocks = vi.hoisted(() => ({
    aggregateDeliveryStates: vi.fn(() => Promise.resolve(undefined)),
    authorizeRecipientSend: vi.fn<
        () => Promise<AuthorizedRecipient | undefined>
    >(() => Promise.resolve(undefined)),
    authorizeTestAttempt: vi.fn(() => Promise.resolve(false)),
    claimRecipients: vi.fn<() => Promise<ClaimedRecipient[]>>(() =>
        Promise.resolve([]),
    ),
    claimTestAttempts: vi.fn<() => Promise<ClaimedTestWork[]>>(() =>
        Promise.resolve([]),
    ),
    finalizeRecipientSend: vi.fn(() => Promise.resolve(undefined)),
    finalizeTestAttempt: vi.fn(() => Promise.resolve(undefined)),
    getUpdateConversationLinks: vi.fn(() => Promise.resolve([])),
    markTestAttempting: vi.fn(() => Promise.resolve(false)),
    materializeOneDeliveryPage: vi.fn<
        () => Promise<MaterializationResult | undefined>
    >(() => Promise.resolve(undefined)),
    recoverExpiredRecipientLeases: vi.fn(() =>
        Promise.resolve({ sendLeaseCount: 0, claimLeaseCount: 0 }),
    ),
    recoverExpiredTestAttemptLeases: vi.fn(() =>
        Promise.resolve({ sendLeaseCount: 0, claimLeaseCount: 0 }),
    ),
    releaseClaimedRecipient: vi.fn(() => Promise.resolve(undefined)),
    releaseClaimedTestAttempt: vi.fn(() => Promise.resolve(undefined)),
    stopActiveDeliveriesForKillSwitch: vi.fn(() => Promise.resolve(0)),
}));
const snsMocks = vi.hoisted(() => ({
    applySnsInboxItem: vi.fn<() => Promise<SnsInboxItemOutcome>>(() =>
        Promise.resolve("applied"),
    ),
    claimSnsInboxItems: vi.fn<() => Promise<ClaimedSnsInboxItem[]>>(() =>
        Promise.resolve([]),
    ),
    rescheduleSnsInboxItem: vi.fn<
        () => Promise<Exclude<SnsInboxItemOutcome, "applied">>
    >(() => Promise.resolve("retry_wait")),
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
        heartbeatIntervalMs: 60_000,
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

function infoEvents() {
    return log.info.mock.calls.map((call) =>
        structuredEventSchema.parse(call.at(0)),
    );
}

function deferredValue<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
} {
    let resolvePromise: ((value: T) => void) | undefined;
    const promise = new Promise<T>((resolve) => {
        resolvePromise = resolve;
    });
    return {
        promise,
        resolve: (value) => {
            resolvePromise?.(value);
        },
    };
}

function claimedTestWork(): ClaimedTestWork {
    return {
        id: 31,
        publicId: "d940a6f0-bf87-4f52-a22a-d07c3cb4a650",
        updateId: 10,
        destinationEmail: "test-private@example.com",
        destinationEmailCredentialId: 2,
        requestedByUserId: "private-user-id",
        subject: "Private test subject",
        bodyHtml: "<p>Private test body</p>",
        bodyPlainText: "Private test body",
        projectTitle: "Private project",
        replyToName: "Private project contact",
        replyToEmail: "reply-private@example.com",
        language: "en",
        leaseToken: "private-test-lease-token",
    };
}

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
        expect(log.info).toHaveBeenCalledWith(
            expect.objectContaining({
                event: "worker_started",
                outcome: "started",
            }),
        );
        expect(log.info).toHaveBeenCalledWith({
            event: "worker_stopped",
            outcome: "stopped",
        });
        expect(log.info).not.toHaveBeenCalledWith(
            expect.objectContaining({ event: "tick_summary" }),
        );
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

    it("emits materialization and tick summaries only when work occurs", async () => {
        storeMocks.materializeOneDeliveryPage.mockResolvedValueOnce({
            kind: "page",
            deliveryId: 17,
            pageCandidateCount: 8,
            insertedCount: 5,
            materializedParticipantCount: 5,
            frequencyCappedCount: 2,
            ineligibleCount: 1,
            exhausted: true,
        });
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
            expect(log.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: "tick_summary",
                    outcome: "success",
                }),
            );
        });
        await worker.shutdown();
        await running;

        expect(log.info).toHaveBeenCalledWith({
            event: "materialization_page",
            outcome: "success",
            deliveryId: 17,
            exhausted: true,
            counts: {
                pageCandidates: 8,
                inserted: 5,
                materializedParticipants: 5,
                frequencyCapped: 2,
                ineligible: 1,
            },
        });
    });

    it("reports legal or abuse materialization stops without a success event", async () => {
        storeMocks.materializeOneDeliveryPage.mockResolvedValueOnce({
            kind: "stopped",
            deliveryId: 18,
            reason: "legal_or_abuse_block",
        });
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
            expect(log.warn).toHaveBeenCalledWith({
                event: "materialization_stopped",
                outcome: "stopped",
                deliveryId: 18,
                materializationReason: "legal_or_abuse_block",
            });
        });
        await worker.shutdown();
        await running;

        expect(log.info).not.toHaveBeenCalledWith(
            expect.objectContaining({
                event: "materialization_page",
                deliveryId: 18,
            }),
        );
    });

    it("reports incomplete owner-copy materialization as a failure", async () => {
        storeMocks.materializeOneDeliveryPage.mockResolvedValueOnce({
            kind: "failed",
            deliveryId: 19,
            reason: "incomplete_owner_copy_scope",
        });
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
            expect(log.error).toHaveBeenCalledWith({
                event: "materialization_failed",
                outcome: "failure",
                deliveryId: 19,
                materializationReason: "incomplete_owner_copy_scope",
            });
        });
        await worker.shutdown();
        await running;

        expect(log.warn).toHaveBeenCalledWith(
            expect.objectContaining({
                event: "tick_summary",
                outcome: "failure",
                counts: {
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
                    materializationFailed: 1,
                    materializationStopped: 0,
                    materializedParticipants: 0,
                    frequencyCapped: 0,
                    ineligible: 0,
                    testAttemptsClaimed: 0,
                    testProviderAccepted: 0,
                    recipientsClaimed: 0,
                    recipientProviderAccepted: 0,
                },
            }),
        );
    });

    it("reports exhausted materialization retries as a terminal failure", async () => {
        storeMocks.materializeOneDeliveryPage.mockResolvedValueOnce({
            kind: "failed",
            deliveryId: 20,
            reason: "materialization_retry_exhausted",
        });
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
            expect(log.error).toHaveBeenCalledWith({
                event: "materialization_failed",
                outcome: "failure",
                deliveryId: 20,
                materializationReason: "materialization_retry_exhausted",
            });
        });
        await worker.shutdown();
        await running;
    });

    it("does not call the provider when test-send suppression authorization fails", async () => {
        storeMocks.claimTestAttempts.mockResolvedValueOnce([
            {
                id: 1,
                publicId: "d940a6f0-bf87-4f52-a22a-d07c3cb4a650",
                updateId: 10,
                destinationEmail: "suppressed@example.com",
                destinationEmailCredentialId: 2,
                requestedByUserId: "suppressed-user-id",
                subject: "Suppressed test",
                bodyHtml: "<p>Suppressed test</p>",
                bodyPlainText: "Suppressed test",
                projectTitle: "Private project",
                replyToName: "Private project contact",
                replyToEmail: "reply-private@example.com",
                language: "en",
                leaseToken: "suppressed-test-lease-token",
            },
        ]);
        const send = vi.fn();
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: { send },
            config: config(true),
            environment: "development",
            log,
            conversationId: 42,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(storeMocks.authorizeTestAttempt).toHaveBeenCalledOnce();
        });
        await worker.shutdown();
        await running;

        expect(send).not.toHaveBeenCalled();
        expect(storeMocks.markTestAttempting).not.toHaveBeenCalled();
    });

    it("does not call the provider when an owner-copy authorization is revoked", async () => {
        const claimedOwner = {
            id: 2n,
            deliveryId: 12,
            leaseToken: "revoked-owner-lease-token",
        } satisfies ClaimedRecipient;
        storeMocks.claimRecipients.mockResolvedValueOnce([claimedOwner]);
        const send = vi.fn();
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: { send },
            config: config(true),
            environment: "development",
            log,
            conversationId: 42,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(storeMocks.authorizeRecipientSend).toHaveBeenCalledWith(
                expect.objectContaining({ claimed: claimedOwner }),
            );
        });
        await worker.shutdown();
        await running;

        expect(send).not.toHaveBeenCalled();
        expect(storeMocks.finalizeRecipientSend).not.toHaveBeenCalled();
        expect(storeMocks.aggregateDeliveryStates).toHaveBeenCalled();
    });

    it("reports an exhausted page with no eligible participants as failure", async () => {
        storeMocks.materializeOneDeliveryPage.mockResolvedValueOnce({
            kind: "failed",
            deliveryId: 21,
            reason: "no_eligible_participants",
            pageCandidateCount: 6,
            insertedCount: 0,
            materializedParticipantCount: 0,
            frequencyCappedCount: 4,
            ineligibleCount: 2,
        });
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
            expect(log.error).toHaveBeenCalledWith({
                event: "materialization_failed",
                outcome: "failure",
                deliveryId: 21,
                materializationReason: "no_eligible_participants",
                counts: {
                    materializationFailed: 1,
                    pageCandidates: 6,
                    inserted: 0,
                    materializedParticipants: 0,
                    frequencyCapped: 4,
                    ineligible: 2,
                },
            });
        });
        await worker.shutdown();
        await running;

        expect(log.info).not.toHaveBeenCalledWith(
            expect.objectContaining({
                event: "materialization_page",
                deliveryId: 21,
            }),
        );
    });

    it("emits safe provider outcomes and finalization retry events", async () => {
        storeMocks.authorizeTestAttempt.mockResolvedValueOnce(true);
        storeMocks.markTestAttempting.mockResolvedValueOnce(true);
        storeMocks.claimTestAttempts.mockResolvedValueOnce([
            {
                id: 1,
                publicId: "d940a6f0-bf87-4f52-a22a-d07c3cb4a650",
                updateId: 10,
                destinationEmail: "test-private@example.com",
                destinationEmailCredentialId: 2,
                requestedByUserId: "private-user-id",
                subject: "Private test subject",
                bodyHtml: "<p>Private test body</p>",
                bodyPlainText: "Private test body",
                projectTitle: "Private project",
                replyToName: "Private project contact",
                replyToEmail: "reply-private@example.com",
                language: "en",
                leaseToken: "private-test-lease-token",
            },
        ]);
        storeMocks.finalizeTestAttempt.mockRejectedValueOnce(
            new Error("test-private@example.com finalization secret"),
        );
        storeMocks.claimRecipients.mockResolvedValueOnce([
            { id: 3n, deliveryId: 20, leaseToken: "private-recipient-lease" },
        ]);
        storeMocks.authorizeRecipientSend.mockResolvedValueOnce({
            recipientId: 3n,
            deliveryId: 20,
            updateId: 10,
            attemptPublicId: "179a13b1-b369-49d1-881f-34d74d96f17f",
            attemptNumber: 1,
            emailCredentialId: 4,
            to: "participant-private@example.com",
            subject: "Private participant subject",
            bodyHtml: "<p>Private participant body</p>",
            bodyPlainText: "Private participant body",
            projectTitle: "Private project",
            replyToName: "Private project contact",
            replyToEmail: "reply-private@example.com",
            language: "en",
            kind: "participant",
            projectId: 5,
            authorizingOrganizationId: 6,
            participantPreferenceScope: "project",
            conversations: [
                {
                    conversationId: 10,
                    title: "Private conversation",
                    url: "https://example.com/conversation/private",
                },
            ],
            actions: {
                unsubscribeScope: "project",
                unsubscribeUrl:
                    "https://example.com/email-updates/unsubscribe/private-token",
                manageUrl:
                    "https://example.com/email-updates/preferences/private-token",
                reportUrl:
                    "https://example.com/email-updates/report/private-token",
            },
            unsubscribeUrl:
                "https://example.com/unsubscribe?token=private-token",
            actionTokens: {
                unsubscribeHash: "a".repeat(64),
                manageHash: "b".repeat(64),
                reportHash: "c".repeat(64),
            },
        });
        const send = vi.fn((message: ConversationEmailProviderMessage) => {
            if (message.tags.message_type === "conversation_update_test") {
                return Promise.resolve({
                    kind: "provider_accepted",
                    messageId: "provider-private-message-id",
                } satisfies ProviderResult);
            }
            return Promise.resolve({
                kind: "permanent_rejected",
                code: "MessageRejected",
                details: "participant-private@example.com was rejected",
            } satisfies ProviderResult);
        });
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: { send },
            config: config(true),
            environment: "development",
            log,
            conversationId: 42,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(log.warn).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: "recipient_provider_outcome",
                    outcome: "permanent_rejected",
                    attemptId: "179a13b1-b369-49d1-881f-34d74d96f17f",
                    recipientKind: "participant",
                    error: {
                        name: "ProviderError",
                        code: "MessageRejected",
                        category: "permanent",
                    },
                }),
            );
            expect(log.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: "test_finalization_failed",
                    outcome: "retry",
                    finalizationAttempt: 1,
                }),
            );
        });
        await worker.shutdown();
        await running;

        expect(log.info).not.toHaveBeenCalledWith(
            expect.objectContaining({
                event: "test_provider_outcome",
                outcome: "provider_accepted",
            }),
        );
        expect(
            infoEvents().find(
                (event) =>
                    event.event === "tick_summary" &&
                    event.counts.testProviderAccepted === 1,
            ),
        ).toMatchObject({
            event: "tick_summary",
            counts: {
                testProviderAccepted: 1,
                recipientProviderAccepted: 0,
            },
        });

        const serializedEvents = JSON.stringify({
            info: log.info.mock.calls,
            warn: log.warn.mock.calls,
            error: log.error.mock.calls,
        });
        expect(serializedEvents).not.toContain("test-private@example.com");
        expect(serializedEvents).not.toContain(
            "participant-private@example.com",
        );
        expect(serializedEvents).not.toContain("provider-private-message-id");
        expect(serializedEvents).not.toContain("private-token");
    });

    it("reports SNS durable outcomes separately from processing errors", async () => {
        const inboxItems: ClaimedSnsInboxItem[] = [1n, 2n, 3n, 4n].map(
            (id) => ({
                id,
                snsTopicArn: "private-topic",
                snsMessageId: `private-message-${id.toString()}`,
                rawPayload: { private: "payload" },
                leaseToken: `private-lease-${id.toString()}`,
                processingAttemptCount: 1,
            }),
        );
        snsMocks.claimSnsInboxItems.mockResolvedValueOnce(inboxItems);
        snsMocks.applySnsInboxItem
            .mockResolvedValueOnce("applied")
            .mockResolvedValueOnce("retry_wait")
            .mockResolvedValueOnce("lease_lost")
            .mockRejectedValueOnce(new Error("private SNS payload failed"));
        snsMocks.rescheduleSnsInboxItem.mockResolvedValueOnce("dead_letter");
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: undefined,
            config: config(false),
            environment: "development",
            log,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(log.warn).toHaveBeenCalledWith({
                event: "sns_batch",
                outcome: "failure",
                counts: {
                    snsClaimed: 4,
                    snsApplied: 1,
                    snsRetryWait: 1,
                    snsDeadLetter: 1,
                    snsLeaseLost: 1,
                    snsProcessingErrors: 1,
                },
            });
        });
        await worker.shutdown();
        await running;

        const serializedEvents = JSON.stringify({
            info: log.info.mock.calls,
            warn: log.warn.mock.calls,
            error: log.error.mock.calls,
        });
        expect(serializedEvents).not.toContain("private SNS payload failed");
        expect(serializedEvents).not.toContain("private-message");
        expect(serializedEvents).not.toContain("private-topic");
    });

    it("reports lease loss without claiming another durable SNS outcome", async () => {
        snsMocks.claimSnsInboxItems.mockResolvedValueOnce([
            {
                id: 5n,
                snsTopicArn: "private-topic",
                snsMessageId: "private-message",
                rawPayload: { private: "payload" },
                leaseToken: "private-lease",
                processingAttemptCount: 1,
            },
        ]);
        snsMocks.applySnsInboxItem.mockResolvedValueOnce("lease_lost");
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: undefined,
            config: config(false),
            environment: "development",
            log,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(log.warn).toHaveBeenCalledWith({
                event: "sns_batch",
                outcome: "lease_lost",
                counts: {
                    snsClaimed: 1,
                    snsApplied: 0,
                    snsRetryWait: 0,
                    snsDeadLetter: 0,
                    snsLeaseLost: 1,
                    snsProcessingErrors: 0,
                },
            });
        });
        await worker.shutdown();
        await running;

        expect(snsMocks.rescheduleSnsInboxItem).not.toHaveBeenCalled();
    });

    it("aggregates accepted recipient sends without per-recipient success logs", async () => {
        storeMocks.claimRecipients.mockResolvedValueOnce([
            { id: 5n, deliveryId: 22, leaseToken: "private-recipient-lease" },
        ]);
        storeMocks.authorizeRecipientSend.mockResolvedValueOnce({
            recipientId: 5n,
            deliveryId: 22,
            updateId: 11,
            attemptPublicId: "f5a792d8-62ad-42c4-b5d3-e4a5cc9da718",
            attemptNumber: 1,
            emailCredentialId: 6,
            to: "accepted-private@example.com",
            subject: "Private subject",
            bodyHtml: "<p>Private body</p>",
            bodyPlainText: "Private body",
            projectTitle: "Private project",
            replyToName: "Private project contact",
            replyToEmail: "reply-private@example.com",
            language: "en",
            kind: "participant",
            projectId: 7,
            authorizingOrganizationId: 8,
            participantPreferenceScope: "project",
            conversations: [
                {
                    conversationId: 11,
                    title: "Accepted conversation",
                    url: "https://example.com/conversation/accepted",
                },
            ],
            actions: {
                unsubscribeScope: "project",
                unsubscribeUrl:
                    "https://example.com/email-updates/unsubscribe/private",
                manageUrl:
                    "https://example.com/email-updates/preferences/private",
                reportUrl: "https://example.com/email-updates/report/private",
            },
            unsubscribeUrl: "https://example.com/unsubscribe?token=private",
            actionTokens: {
                unsubscribeHash: "d".repeat(64),
                manageHash: "e".repeat(64),
                reportHash: "f".repeat(64),
            },
        });
        const acceptedResult = {
            kind: "provider_accepted",
            messageId: "private-provider-message",
        } satisfies ProviderResult;
        const sentMessages: ConversationEmailProviderMessage[] = [];
        const send = vi.fn((message: ConversationEmailProviderMessage) => {
            sentMessages.push(message);
            return Promise.resolve(acceptedResult);
        });
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: { send },
            config: config(true),
            environment: "development",
            log,
            conversationId: 42,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(
                infoEvents().find((event) => event.event === "tick_summary"),
            ).toMatchObject({
                event: "tick_summary",
                counts: {
                    recipientsClaimed: 1,
                    recipientProviderAccepted: 1,
                },
            });
        });
        await worker.shutdown();
        await running;

        expect(log.info).not.toHaveBeenCalledWith(
            expect.objectContaining({ event: "recipient_provider_outcome" }),
        );
        expect(log.warn).not.toHaveBeenCalledWith(
            expect.objectContaining({ event: "recipient_provider_outcome" }),
        );
        expect(sentMessages.at(0)?.unsubscribeUrl).toBe(
            "https://example.com/unsubscribe?token=private",
        );
        expect(sentMessages.at(0)?.html).toContain(
            "/email-updates/unsubscribe/private",
        );
        expect(storeMocks.aggregateDeliveryStates).toHaveBeenCalledWith(
            expect.objectContaining({
                conversationId: 42,
                deliveryIds: [22],
            }),
        );
    });

    it("renders owner actions without exposing a provider unsubscribe header", async () => {
        storeMocks.claimRecipients.mockResolvedValueOnce([
            { id: 8n, deliveryId: 23, leaseToken: "owner-recipient-lease" },
        ]);
        storeMocks.authorizeRecipientSend.mockResolvedValueOnce({
            recipientId: 8n,
            deliveryId: 23,
            updateId: 12,
            attemptPublicId: "dcf82ba9-34dc-4a9f-850c-3b09f559ebcf",
            attemptNumber: 1,
            emailCredentialId: 9,
            to: "owner-private@example.com",
            subject: "Private owner subject",
            bodyHtml: "<p>Private owner body</p>",
            bodyPlainText: "Private owner body",
            projectTitle: "Private project",
            replyToName: "Private project contact",
            replyToEmail: "reply-private@example.com",
            language: "en",
            kind: "conversation_owner_copy",
            projectId: 10,
            authorizingOrganizationId: 11,
            participantPreferenceScope: "project",
            conversations: [
                {
                    conversationId: 12,
                    title: "Owner conversation",
                    url: "https://example.com/conversation/owner",
                },
            ],
            actions: {
                unsubscribeScope: "project",
                unsubscribeUrl:
                    "https://example.com/email-updates/unsubscribe/private-owner-token",
                manageUrl:
                    "https://example.com/email-updates/preferences/private-owner-token",
                reportUrl:
                    "https://example.com/email-updates/report/private-owner-token",
            },
            unsubscribeUrl: undefined,
            actionTokens: {
                unsubscribeHash: "a".repeat(64),
                manageHash: "b".repeat(64),
                reportHash: "c".repeat(64),
            },
        });
        const acceptedResult = {
            kind: "provider_accepted",
            messageId: "private-owner-provider-message",
        } satisfies ProviderResult;
        const sentMessages: ConversationEmailProviderMessage[] = [];
        const send = vi.fn((message: ConversationEmailProviderMessage) => {
            sentMessages.push(message);
            return Promise.resolve(acceptedResult);
        });
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: { send },
            config: config(true),
            environment: "development",
            log,
            conversationId: 42,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(send).toHaveBeenCalledOnce();
        });
        await worker.shutdown();
        await running;

        expect(sentMessages.at(0)?.unsubscribeUrl).toBeUndefined();
        expect(sentMessages.at(0)?.html).toContain("private-owner-token");
        expect(sentMessages.at(0)?.text).toContain("operational owner copy");
    });

    it("reconciles periodically when a notification wake is missed", async () => {
        const workerConfig = config(true);
        workerConfig.pollIntervalMs = 20;
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: { send: vi.fn() },
            config: workerConfig,
            environment: "development",
            log,
            conversationId: 42,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(
                storeMocks.materializeOneDeliveryPage.mock.calls.length,
            ).toBeGreaterThan(0);
        });
        storeMocks.materializeOneDeliveryPage.mockResolvedValueOnce({
            kind: "page",
            deliveryId: 32,
            pageCandidateCount: 1,
            insertedCount: 0,
            materializedParticipantCount: 0,
            frequencyCappedCount: 1,
            ineligibleCount: 0,
            exhausted: true,
        });

        await vi.waitFor(() => {
            expect(log.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: "materialization_page",
                    deliveryId: 32,
                }),
            );
        });
        await worker.shutdown();
        await running;
    });

    it("continues other lanes while materialization is blocked", async () => {
        const blockedMaterialization = deferredValue<
            MaterializationResult | undefined
        >();
        storeMocks.materializeOneDeliveryPage.mockReturnValueOnce(
            blockedMaterialization.promise,
        );
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
            expect(storeMocks.materializeOneDeliveryPage).toHaveBeenCalled();
        });
        worker.wake();
        await vi.waitFor(() => {
            expect(
                storeMocks.recoverExpiredRecipientLeases.mock.calls.length,
            ).toBeGreaterThanOrEqual(2);
            expect(
                storeMocks.claimTestAttempts.mock.calls.length,
            ).toBeGreaterThanOrEqual(2);
        });
        expect(storeMocks.materializeOneDeliveryPage).toHaveBeenCalledOnce();

        blockedMaterialization.resolve(undefined);
        await worker.shutdown();
        await running;
    });

    it("quiesces claims while draining an authorized send and finalization", async () => {
        const providerResult = {
            kind: "provider_accepted",
            messageId: "private-provider-message",
        } satisfies ProviderResult;
        const providerSend = deferredValue<ProviderResult>();
        const finalization = deferredValue<undefined>();
        storeMocks.claimTestAttempts.mockResolvedValueOnce([claimedTestWork()]);
        storeMocks.authorizeTestAttempt.mockResolvedValueOnce(true);
        storeMocks.markTestAttempting.mockResolvedValueOnce(true);
        storeMocks.finalizeTestAttempt.mockReturnValueOnce(
            finalization.promise,
        );
        const send = vi.fn(() => providerSend.promise);
        const workerConfig = config(true);
        workerConfig.pollIntervalMs = 20;
        const worker = createConversationEmailUpdateWorker({
            db: database(),
            provider: { send },
            config: workerConfig,
            environment: "development",
            log,
            conversationId: 42,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(send).toHaveBeenCalledOnce();
        });
        let shutdownFinished = false;
        const shutdown = worker.shutdown();
        expect(worker.shutdown()).toBe(shutdown);
        const shutdownObservation = (async () => {
            await shutdown;
            shutdownFinished = true;
        })();
        worker.wake();
        await setTimeout(workerConfig.pollIntervalMs * 2);
        expect(storeMocks.claimTestAttempts).toHaveBeenCalledOnce();
        expect(shutdownFinished).toBe(false);

        providerSend.resolve(providerResult);
        await vi.waitFor(() => {
            expect(storeMocks.finalizeTestAttempt).toHaveBeenCalledOnce();
        });
        expect(shutdownFinished).toBe(false);
        finalization.resolve(undefined);
        await shutdownObservation;
        await running;
        expect(shutdownFinished).toBe(true);
        expect(storeMocks.claimTestAttempts).toHaveBeenCalledOnce();
        expect(log.info).toHaveBeenCalledWith({
            event: "worker_stopped",
            outcome: "stopped",
        });
    });

    it("releases claimed test work that was not authorized before quiescing", async () => {
        const firstWork = claimedTestWork();
        const secondWork = {
            ...claimedTestWork(),
            id: 2,
            publicId: "fd1787e7-b7f0-42c4-b69e-3cd299c9e17f",
        } satisfies ClaimedTestWork;
        const providerSend = deferredValue<ProviderResult>();
        storeMocks.claimTestAttempts.mockResolvedValueOnce([
            firstWork,
            secondWork,
        ]);
        storeMocks.authorizeTestAttempt.mockResolvedValueOnce(true);
        storeMocks.markTestAttempting.mockResolvedValueOnce(true);
        const workerConfig = config(true);
        workerConfig.concurrency = 1;
        const db = database();
        const worker = createConversationEmailUpdateWorker({
            db,
            provider: { send: vi.fn(() => providerSend.promise) },
            config: workerConfig,
            environment: "development",
            log,
            conversationId: 42,
        });

        const running = worker.run();
        await vi.waitFor(() => {
            expect(storeMocks.markTestAttempting).toHaveBeenCalledOnce();
        });
        const shutdown = worker.shutdown();
        providerSend.resolve({
            kind: "provider_accepted",
            messageId: "private-provider-message",
        });
        await shutdown;
        await running;

        expect(storeMocks.finalizeTestAttempt).toHaveBeenCalledOnce();
        expect(storeMocks.releaseClaimedTestAttempt).toHaveBeenCalledOnce();
        expect(storeMocks.releaseClaimedTestAttempt).toHaveBeenCalledWith({
            db,
            work: secondWork,
        });
        expect(storeMocks.authorizeTestAttempt).toHaveBeenCalledOnce();
    });
});
