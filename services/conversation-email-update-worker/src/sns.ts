import { randomUUID } from "node:crypto";
import {
    and,
    asc,
    desc,
    eq,
    inArray,
    isNull,
    lt,
    lte,
    or,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import {
    sesEventSchema,
    snsNotificationSchema,
    type SesEvent,
} from "@/shared-backend/conversationEmailUpdateSnsIngress.js";
import {
    conversationEmailUpdateDeliveryAttemptTable,
    conversationEmailUpdateEmailSuppressionTable,
    conversationEmailUpdateRecipientTable,
    conversationEmailUpdateSnsEventInboxTable,
    conversationEmailUpdateTestAttemptTable,
    conversationEmailUpdateUserComplaintSuppressionTable,
    userTable,
} from "@/shared-backend/schema.js";
import { aggregateDeliveryStateInTransaction } from "./store.js";
import { decideSendFinalization } from "./sendTransition.js";
import {
    decideTestSnsSuppressions,
    decideTestSnsTransition,
} from "./testAttemptTransition.js";

export interface ClaimedSnsInboxItem {
    id: bigint;
    snsTopicArn: string;
    snsMessageId: string;
    rawPayload: unknown;
    leaseToken: string;
    processingAttemptCount: number;
}

export type SnsInboxItemOutcome =
    "applied" | "dead_letter" | "lease_lost" | "retry_wait";

type IntendedSnsInboxItemOutcome = Exclude<SnsInboxItemOutcome, "lease_lost">;

class SnsInboxLeaseLostError extends Error {}

export function decideSnsInboxPersistenceOutcome<
    IntendedOutcome extends IntendedSnsInboxItemOutcome,
>({
    affectedRowCount,
    intendedOutcome,
}: {
    affectedRowCount: number;
    intendedOutcome: IntendedOutcome;
}): IntendedOutcome | "lease_lost" {
    if (affectedRowCount === 0) return "lease_lost";
    if (affectedRowCount !== 1) {
        throw new Error(
            "Lease-fenced SNS update did not affect exactly one inbox row",
        );
    }
    return intendedOutcome;
}

function requireSnsInboxPersistence<
    IntendedOutcome extends IntendedSnsInboxItemOutcome,
>({
    affectedRowCount,
    intendedOutcome,
}: {
    affectedRowCount: number;
    intendedOutcome: IntendedOutcome;
}): IntendedOutcome {
    const outcome = decideSnsInboxPersistenceOutcome({
        affectedRowCount,
        intendedOutcome,
    });
    if (outcome === "lease_lost") throw new SnsInboxLeaseLostError();
    return outcome;
}

const MAX_SNS_PROCESSING_ATTEMPTS = 10;

export async function claimSnsInboxItems({
    db,
    workerId,
    batchSize,
    leaseSeconds,
}: {
    db: PostgresDatabase;
    workerId: string;
    batchSize: number;
    leaseSeconds: number;
}): Promise<ClaimedSnsInboxItem[]> {
    const leaseToken = randomUUID();
    const databaseNow = sql<Date>`now()`;
    const leaseExpiresAt = sql<Date>`now() + (${leaseSeconds} * interval '1 second')`;

    return db.transaction(async (tx) => {
        await tx
            .update(conversationEmailUpdateSnsEventInboxTable)
            .set({
                status: "dead_letter",
                deadLetteredAt: databaseNow,
                leaseOwner: null,
                leaseToken: null,
                leaseExpiresAt: null,
                lastError: "SNS processing attempts exhausted",
            })
            .where(
                and(
                    isNull(conversationEmailUpdateSnsEventInboxTable.deletedAt),
                    eq(
                        conversationEmailUpdateSnsEventInboxTable.status,
                        "processing",
                    ),
                    eq(
                        conversationEmailUpdateSnsEventInboxTable.processingAttemptCount,
                        MAX_SNS_PROCESSING_ATTEMPTS,
                    ),
                    lte(
                        conversationEmailUpdateSnsEventInboxTable.leaseExpiresAt,
                        databaseNow,
                    ),
                ),
            );

        const claimable = await tx
            .select({ id: conversationEmailUpdateSnsEventInboxTable.id })
            .from(conversationEmailUpdateSnsEventInboxTable)
            .where(
                and(
                    isNull(conversationEmailUpdateSnsEventInboxTable.deletedAt),
                    lt(
                        conversationEmailUpdateSnsEventInboxTable.processingAttemptCount,
                        MAX_SNS_PROCESSING_ATTEMPTS,
                    ),
                    or(
                        and(
                            inArray(
                                conversationEmailUpdateSnsEventInboxTable.status,
                                ["pending", "retry_wait"],
                            ),
                            lte(
                                conversationEmailUpdateSnsEventInboxTable.nextAttemptAt,
                                databaseNow,
                            ),
                        ),
                        and(
                            eq(
                                conversationEmailUpdateSnsEventInboxTable.status,
                                "processing",
                            ),
                            lte(
                                conversationEmailUpdateSnsEventInboxTable.leaseExpiresAt,
                                databaseNow,
                            ),
                        ),
                    ),
                ),
            )
            .orderBy(
                asc(conversationEmailUpdateSnsEventInboxTable.nextAttemptAt),
                asc(conversationEmailUpdateSnsEventInboxTable.id),
            )
            .limit(batchSize)
            .for("update", { skipLocked: true });
        if (claimable.length === 0) return [];

        const claimed = await tx
            .update(conversationEmailUpdateSnsEventInboxTable)
            .set({
                status: "processing",
                leaseOwner: workerId,
                leaseToken,
                leaseExpiresAt,
                processingAttemptCount: sql`${conversationEmailUpdateSnsEventInboxTable.processingAttemptCount} + 1`,
            })
            .where(
                inArray(
                    conversationEmailUpdateSnsEventInboxTable.id,
                    claimable.map(({ id }) => id),
                ),
            )
            .returning({
                id: conversationEmailUpdateSnsEventInboxTable.id,
                snsTopicArn:
                    conversationEmailUpdateSnsEventInboxTable.snsTopicArn,
                snsMessageId:
                    conversationEmailUpdateSnsEventInboxTable.snsMessageId,
                rawPayload:
                    conversationEmailUpdateSnsEventInboxTable.rawPayload,
                processingAttemptCount:
                    conversationEmailUpdateSnsEventInboxTable.processingAttemptCount,
            });
        return claimed.map((item) => ({ ...item, leaseToken }));
    });
}

function getEventOccurredAt(event: SesEvent): Date {
    switch (event.eventType) {
        case "Bounce":
            return new Date(event.bounce.timestamp);
        case "Complaint":
            return new Date(event.complaint.timestamp);
        case "Delivery":
            return new Date(event.delivery.timestamp);
        case "DeliveryDelay":
            return new Date(event.deliveryDelay.timestamp);
        case "Reject":
        case "Rendering Failure":
        case "Send":
            return new Date(event.mail.timestamp);
    }
}

function earlierDate({
    current,
    candidate,
}: {
    current: Date | null;
    candidate: Date;
}): Date {
    return current === null || candidate < current ? candidate : current;
}

export async function applySnsInboxItem({
    db,
    item,
}: {
    db: PostgresDatabase;
    item: ClaimedSnsInboxItem;
}): Promise<SnsInboxItemOutcome> {
    try {
        return await db.transaction(async (tx) => {
            const ownedInboxItem = (
                await tx
                    .select({
                        id: conversationEmailUpdateSnsEventInboxTable.id,
                    })
                    .from(conversationEmailUpdateSnsEventInboxTable)
                    .where(
                        and(
                            eq(
                                conversationEmailUpdateSnsEventInboxTable.id,
                                item.id,
                            ),
                            eq(
                                conversationEmailUpdateSnsEventInboxTable.leaseToken,
                                item.leaseToken,
                            ),
                        ),
                    )
                    .limit(1)
                    .for("update")
            ).at(0);
            if (ownedInboxItem === undefined) return "lease_lost";

            const envelope = snsNotificationSchema.parse(item.rawPayload);
            const event = sesEventSchema.parse(JSON.parse(envelope.Message));
            const testAttemptPublicId = Object.entries(event.mail.tags ?? {})
                .find(([name]) => name === "conversation_update_test_id")
                ?.at(1)
                ?.at(0);
            const parsedTestAttemptPublicId = z
                .uuid()
                .safeParse(testAttemptPublicId);
            const validTestAttemptPublicId = parsedTestAttemptPublicId.success
                ? parsedTestAttemptPublicId.data
                : undefined;
            const attemptPublicId = Object.entries(event.mail.tags ?? {})
                .find(([name]) => name === "conversation_update_attempt_id")
                ?.at(1)
                ?.at(0);
            const parsedAttemptPublicId = z.uuid().safeParse(attemptPublicId);
            const validAttemptPublicId = parsedAttemptPublicId.success
                ? parsedAttemptPublicId.data
                : undefined;
            const occurredAt = getEventOccurredAt(event);

            const correlatedTest = (
                await tx
                    .select({
                        id: conversationEmailUpdateTestAttemptTable.id,
                        status: conversationEmailUpdateTestAttemptTable.status,
                        providerMessageId:
                            conversationEmailUpdateTestAttemptTable.providerMessageId,
                        destinationEmailCredentialId:
                            conversationEmailUpdateTestAttemptTable.destinationEmailCredentialId,
                        destinationEmailSnapshot:
                            conversationEmailUpdateTestAttemptTable.destinationEmailSnapshot,
                        requestedByUserId:
                            conversationEmailUpdateTestAttemptTable.requestedByUserId,
                    })
                    .from(conversationEmailUpdateTestAttemptTable)
                    .where(
                        validTestAttemptPublicId === undefined
                            ? eq(
                                  conversationEmailUpdateTestAttemptTable.providerMessageId,
                                  event.mail.messageId,
                              )
                            : or(
                                  eq(
                                      conversationEmailUpdateTestAttemptTable.publicId,
                                      validTestAttemptPublicId,
                                  ),
                                  eq(
                                      conversationEmailUpdateTestAttemptTable.providerMessageId,
                                      event.mail.messageId,
                                  ),
                              ),
                    )
                    .orderBy(
                        validTestAttemptPublicId === undefined
                            ? asc(conversationEmailUpdateTestAttemptTable.id)
                            : desc(
                                  eq(
                                      conversationEmailUpdateTestAttemptTable.publicId,
                                      validTestAttemptPublicId,
                                  ),
                              ),
                    )
                    .limit(1)
                    .for("update", {
                        of: conversationEmailUpdateTestAttemptTable,
                    })
            ).at(0);
            if (correlatedTest !== undefined) {
                const transition = decideTestSnsTransition({
                    status: correlatedTest.status,
                    providerMessageId: correlatedTest.providerMessageId,
                    eventType: event.eventType,
                    eventMessageId: event.mail.messageId,
                });
                if (transition.kind !== "no_change") {
                    await tx
                        .update(conversationEmailUpdateTestAttemptTable)
                        .set({
                            ...(transition.kind === "provider_accepted"
                                ? {
                                      status: "provider_accepted",
                                      errorCategory: null,
                                      errorCode: null,
                                      errorDetails: null,
                                      finishedAt: sql<Date>`coalesce(${conversationEmailUpdateTestAttemptTable.finishedAt}, ${occurredAt})`,
                                      leaseOwner: null,
                                      leaseToken: null,
                                      leaseExpiresAt: null,
                                  }
                                : {}),
                            providerMessageId: transition.messageId,
                        })
                        .where(
                            eq(
                                conversationEmailUpdateTestAttemptTable.id,
                                correlatedTest.id,
                            ),
                        );
                }

                const suppressions = decideTestSnsSuppressions({
                    eventType: event.eventType,
                    bounceType:
                        event.eventType === "Bounce"
                            ? event.bounce.bounceType
                            : undefined,
                });
                if (
                    suppressions.emailReason !== undefined ||
                    suppressions.suppressUserForComplaint
                ) {
                    await tx
                        .select({ id: userTable.id })
                        .from(userTable)
                        .where(
                            eq(userTable.id, correlatedTest.requestedByUserId),
                        )
                        .for("update");
                }
                if (suppressions.emailReason !== undefined) {
                    await tx
                        .insert(conversationEmailUpdateEmailSuppressionTable)
                        .values({
                            canonicalEmail:
                                correlatedTest.destinationEmailSnapshot,
                            emailCredentialId:
                                correlatedTest.destinationEmailCredentialId,
                            reason: suppressions.emailReason,
                            sourceSnsTopicArn: envelope.TopicArn,
                            sourceSnsMessageId: envelope.MessageId,
                            sourceSesMessageId: event.mail.messageId,
                            sourceEventOccurredAt: occurredAt,
                        })
                        .onConflictDoNothing();
                }
                if (suppressions.suppressUserForComplaint) {
                    await tx
                        .insert(
                            conversationEmailUpdateUserComplaintSuppressionTable,
                        )
                        .values({
                            userId: correlatedTest.requestedByUserId,
                            sourceSnsTopicArn: envelope.TopicArn,
                            sourceSnsMessageId: envelope.MessageId,
                            sourceSesMessageId: event.mail.messageId,
                            sourceEventOccurredAt: occurredAt,
                        })
                        .onConflictDoNothing();
                }

                const completedAt = sql<Date>`now()`;
                const completed = await tx
                    .update(conversationEmailUpdateSnsEventInboxTable)
                    .set({
                        status: "completed",
                        rawPayload: null,
                        leaseOwner: null,
                        leaseToken: null,
                        leaseExpiresAt: null,
                        lastError: null,
                        completedAt,
                        deletedAt: completedAt,
                    })
                    .where(
                        and(
                            eq(
                                conversationEmailUpdateSnsEventInboxTable.id,
                                item.id,
                            ),
                            eq(
                                conversationEmailUpdateSnsEventInboxTable.leaseToken,
                                item.leaseToken,
                            ),
                        ),
                    )
                    .returning({
                        id: conversationEmailUpdateSnsEventInboxTable.id,
                    });
                return requireSnsInboxPersistence({
                    affectedRowCount: completed.length,
                    intendedOutcome: "applied",
                });
            }

            const correlated = (
                await tx
                    .select({
                        attemptId:
                            conversationEmailUpdateDeliveryAttemptTable.id,
                        recipientId:
                            conversationEmailUpdateDeliveryAttemptTable.recipientId,
                        attemptNumber:
                            conversationEmailUpdateDeliveryAttemptTable.attemptNumber,
                        emailCredentialId:
                            conversationEmailUpdateDeliveryAttemptTable.emailCredentialId,
                        emailSnapshot:
                            conversationEmailUpdateDeliveryAttemptTable.emailSnapshot,
                        outcome:
                            conversationEmailUpdateDeliveryAttemptTable.outcome,
                        providerMessageId:
                            conversationEmailUpdateDeliveryAttemptTable.providerMessageId,
                        finishedAt:
                            conversationEmailUpdateDeliveryAttemptTable.finishedAt,
                        deliveredAt:
                            conversationEmailUpdateDeliveryAttemptTable.deliveredAt,
                        deliveryDelayedAt:
                            conversationEmailUpdateDeliveryAttemptTable.deliveryDelayedAt,
                        providerFailedAt:
                            conversationEmailUpdateDeliveryAttemptTable.providerFailedAt,
                        permanentBouncedAt:
                            conversationEmailUpdateDeliveryAttemptTable.permanentBouncedAt,
                        complainedAt:
                            conversationEmailUpdateDeliveryAttemptTable.complainedAt,
                    })
                    .from(conversationEmailUpdateDeliveryAttemptTable)
                    .where(
                        validAttemptPublicId === undefined
                            ? eq(
                                  conversationEmailUpdateDeliveryAttemptTable.providerMessageId,
                                  event.mail.messageId,
                              )
                            : or(
                                  eq(
                                      conversationEmailUpdateDeliveryAttemptTable.publicId,
                                      validAttemptPublicId,
                                  ),
                                  eq(
                                      conversationEmailUpdateDeliveryAttemptTable.providerMessageId,
                                      event.mail.messageId,
                                  ),
                              ),
                    )
                    .orderBy(
                        validAttemptPublicId === undefined
                            ? asc(
                                  conversationEmailUpdateDeliveryAttemptTable.id,
                              )
                            : desc(
                                  eq(
                                      conversationEmailUpdateDeliveryAttemptTable.publicId,
                                      validAttemptPublicId,
                                  ),
                              ),
                    )
                    .limit(1)
                    .for("update", {
                        of: conversationEmailUpdateDeliveryAttemptTable,
                    })
            ).at(0);
            if (correlated === undefined) {
                if (
                    item.processingAttemptCount >= MAX_SNS_PROCESSING_ATTEMPTS
                ) {
                    const deadLettered = await tx
                        .update(conversationEmailUpdateSnsEventInboxTable)
                        .set({
                            status: "dead_letter",
                            deadLetteredAt: sql<Date>`now()`,
                            leaseOwner: null,
                            leaseToken: null,
                            leaseExpiresAt: null,
                            lastError: "No correlated delivery attempt",
                        })
                        .where(
                            and(
                                eq(
                                    conversationEmailUpdateSnsEventInboxTable.id,
                                    item.id,
                                ),
                                eq(
                                    conversationEmailUpdateSnsEventInboxTable.leaseToken,
                                    item.leaseToken,
                                ),
                            ),
                        )
                        .returning({
                            id: conversationEmailUpdateSnsEventInboxTable.id,
                        });
                    return requireSnsInboxPersistence({
                        affectedRowCount: deadLettered.length,
                        intendedOutcome: "dead_letter",
                    });
                } else {
                    const rescheduled = await tx
                        .update(conversationEmailUpdateSnsEventInboxTable)
                        .set({
                            status: "retry_wait",
                            nextAttemptAt: sql<Date>`now() + interval '5 minutes'`,
                            leaseOwner: null,
                            leaseToken: null,
                            leaseExpiresAt: null,
                            lastError: "No correlated delivery attempt",
                        })
                        .where(
                            and(
                                eq(
                                    conversationEmailUpdateSnsEventInboxTable.id,
                                    item.id,
                                ),
                                eq(
                                    conversationEmailUpdateSnsEventInboxTable.leaseToken,
                                    item.leaseToken,
                                ),
                            ),
                        )
                        .returning({
                            id: conversationEmailUpdateSnsEventInboxTable.id,
                        });
                    return requireSnsInboxPersistence({
                        affectedRowCount: rescheduled.length,
                        intendedOutcome: "retry_wait",
                    });
                }
            }

            const recipient = (
                await tx
                    .select({
                        deliveryId:
                            conversationEmailUpdateRecipientTable.deliveryId,
                        userId: conversationEmailUpdateRecipientTable.userId,
                        status: conversationEmailUpdateRecipientTable.status,
                        providerAcceptedAt:
                            conversationEmailUpdateRecipientTable.providerAcceptedAt,
                    })
                    .from(conversationEmailUpdateRecipientTable)
                    .where(
                        eq(
                            conversationEmailUpdateRecipientTable.id,
                            correlated.recipientId,
                        ),
                    )
                    .limit(1)
                    .for("update")
            ).at(0);
            if (recipient === undefined) {
                throw new Error("Correlated recipient no longer exists");
            }
            if (
                event.eventType === "Complaint" ||
                (event.eventType === "Bounce" &&
                    event.bounce.bounceType === "Permanent")
            ) {
                await tx
                    .select({ id: userTable.id })
                    .from(userTable)
                    .where(eq(userTable.id, recipient.userId))
                    .for("update");
            }

            const acceptance = decideSendFinalization({
                attemptOutcome: correlated.outcome,
                attemptProviderMessageId: correlated.providerMessageId,
                recipientStatus: recipient.status,
                failureFenced: false,
                result: {
                    kind: "provider_accepted",
                    messageId: event.mail.messageId,
                },
                attemptNumber: correlated.attemptNumber,
            });
            if (acceptance.kind !== "provider_accepted") {
                throw new Error(
                    "SES acceptance did not produce an acceptance transition",
                );
            }

            await tx
                .update(conversationEmailUpdateDeliveryAttemptTable)
                .set({
                    providerMessageId: acceptance.messageId,
                    outcome: "provider_accepted",
                    errorCategory: null,
                    errorCode: null,
                    errorDetails: null,
                    finishedAt: correlated.finishedAt ?? occurredAt,
                    deliveredAt:
                        event.eventType === "Delivery"
                            ? earlierDate({
                                  current: correlated.deliveredAt,
                                  candidate: occurredAt,
                              })
                            : correlated.deliveredAt,
                    deliveryDelayedAt:
                        event.eventType === "DeliveryDelay"
                            ? earlierDate({
                                  current: correlated.deliveryDelayedAt,
                                  candidate: occurredAt,
                              })
                            : correlated.deliveryDelayedAt,
                    providerFailedAt:
                        event.eventType === "Reject" ||
                        event.eventType === "Rendering Failure"
                            ? earlierDate({
                                  current: correlated.providerFailedAt,
                                  candidate: occurredAt,
                              })
                            : correlated.providerFailedAt,
                    permanentBouncedAt:
                        event.eventType === "Bounce" &&
                        event.bounce.bounceType === "Permanent"
                            ? earlierDate({
                                  current: correlated.permanentBouncedAt,
                                  candidate: occurredAt,
                              })
                            : correlated.permanentBouncedAt,
                    complainedAt:
                        event.eventType === "Complaint"
                            ? earlierDate({
                                  current: correlated.complainedAt,
                                  candidate: occurredAt,
                              })
                            : correlated.complainedAt,
                })
                .where(
                    eq(
                        conversationEmailUpdateDeliveryAttemptTable.id,
                        correlated.attemptId,
                    ),
                );

            if (recipient.status !== "provider_accepted") {
                await tx
                    .update(conversationEmailUpdateRecipientTable)
                    .set({
                        status: "provider_accepted",
                        providerAcceptedAt:
                            recipient.providerAcceptedAt ?? occurredAt,
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
                        updatedAt: sql<Date>`now()`,
                    })
                    .where(
                        eq(
                            conversationEmailUpdateRecipientTable.id,
                            correlated.recipientId,
                        ),
                    );
            } else {
                await tx
                    .update(conversationEmailUpdateRecipientTable)
                    .set({ updatedAt: sql<Date>`now()` })
                    .where(
                        eq(
                            conversationEmailUpdateRecipientTable.id,
                            correlated.recipientId,
                        ),
                    );
            }

            const suppressionReason =
                event.eventType === "Complaint"
                    ? "complaint"
                    : event.eventType === "Bounce" &&
                        event.bounce.bounceType === "Permanent"
                      ? "permanent_bounce"
                      : undefined;
            if (suppressionReason !== undefined) {
                await tx
                    .insert(conversationEmailUpdateEmailSuppressionTable)
                    .values({
                        canonicalEmail: correlated.emailSnapshot,
                        emailCredentialId: correlated.emailCredentialId,
                        reason: suppressionReason,
                        sourceSnsTopicArn: envelope.TopicArn,
                        sourceSnsMessageId: envelope.MessageId,
                        sourceSesMessageId: event.mail.messageId,
                        sourceEventOccurredAt: occurredAt,
                    })
                    .onConflictDoNothing();
            }
            if (event.eventType === "Complaint") {
                await tx
                    .insert(
                        conversationEmailUpdateUserComplaintSuppressionTable,
                    )
                    .values({
                        userId: recipient.userId,
                        sourceSnsTopicArn: envelope.TopicArn,
                        sourceSnsMessageId: envelope.MessageId,
                        sourceSesMessageId: event.mail.messageId,
                        sourceEventOccurredAt: occurredAt,
                    })
                    .onConflictDoNothing();
            }
            await aggregateDeliveryStateInTransaction({
                tx,
                deliveryId: recipient.deliveryId,
            });
            const completedAt = sql<Date>`now()`;
            const completed = await tx
                .update(conversationEmailUpdateSnsEventInboxTable)
                .set({
                    status: "completed",
                    rawPayload: null,
                    leaseOwner: null,
                    leaseToken: null,
                    leaseExpiresAt: null,
                    lastError: null,
                    completedAt,
                    deletedAt: completedAt,
                })
                .where(
                    and(
                        eq(
                            conversationEmailUpdateSnsEventInboxTable.id,
                            item.id,
                        ),
                        eq(
                            conversationEmailUpdateSnsEventInboxTable.leaseToken,
                            item.leaseToken,
                        ),
                    ),
                )
                .returning({
                    id: conversationEmailUpdateSnsEventInboxTable.id,
                });
            return requireSnsInboxPersistence({
                affectedRowCount: completed.length,
                intendedOutcome: "applied",
            });
        });
    } catch (error: unknown) {
        if (error instanceof SnsInboxLeaseLostError) return "lease_lost";
        throw error;
    }
}

export async function rescheduleSnsInboxItem({
    db,
    item,
    error,
}: {
    db: PostgresDatabase;
    item: ClaimedSnsInboxItem;
    error: unknown;
}): Promise<Exclude<SnsInboxItemOutcome, "applied">> {
    const details =
        error instanceof Error ? error.message : "Unknown SNS processing error";
    const deadLetter =
        item.processingAttemptCount >= MAX_SNS_PROCESSING_ATTEMPTS;
    const updated = await db
        .update(conversationEmailUpdateSnsEventInboxTable)
        .set({
            status: deadLetter ? "dead_letter" : "retry_wait",
            ...(deadLetter
                ? { deadLetteredAt: sql<Date>`now()` }
                : {
                      nextAttemptAt: sql<Date>`now() + interval '5 minutes'`,
                  }),
            lastError: details,
            leaseOwner: null,
            leaseToken: null,
            leaseExpiresAt: null,
        })
        .where(
            and(
                eq(conversationEmailUpdateSnsEventInboxTable.id, item.id),
                eq(
                    conversationEmailUpdateSnsEventInboxTable.leaseToken,
                    item.leaseToken,
                ),
            ),
        )
        .returning({ id: conversationEmailUpdateSnsEventInboxTable.id });
    return decideSnsInboxPersistenceOutcome({
        affectedRowCount: updated.length,
        intendedOutcome: deadLetter ? "dead_letter" : "retry_wait",
    });
}
