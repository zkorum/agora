import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { eq, sql } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    beforeAll,
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import * as schema from "../src/shared-backend/schema.js";
import { beginScheduledAccountPurge } from "../src/shared-backend/accountLifecycle.js";
import { findAccountParticipationSource } from "../src/shared-backend/accountParticipationSources.js";
import { deleteUserAccount } from "../src/service/account.js";
import { getAccountDatabaseTime } from "../src/service/accountDatabaseTime.js";
import {
    recoverGuestAccount,
    restoreAccountAfterVerification,
    type VerifiedRecoveryProof,
} from "../src/service/accountRecovery.js";
import { getDeviceStatus } from "../src/service/authUtil.js";
import { startHardAuthSession } from "../src/service/authSession.js";
import {
    authenticateEmailAttempt,
    verifyEmailOtp,
    authenticateAttempt,
    verifyPhoneOtp,
} from "../src/service/auth.js";
import { hashWithSalt } from "../src/crypto.js";
import { base64Decode, base64Encode } from "../src/shared-app-api/base64.js";
import { verifyUserStatusAndAuthenticate } from "../src/service/rarimo.js";
import axios from "axios";
import { postNewOpinion } from "../src/service/comment.js";
import type { VoteBuffer } from "../src/service/voteBuffer.js";
import { mergeGuestIntoVerifiedUser } from "../src/service/merge.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing recovery fixture");
    return row;
}

describe("explicit verified account recovery", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "recovery_test",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "recovery_test",
        };
        client = postgres({ ...connection, onnotice: () => undefined });
        db = drizzle({ client });
        const pool = new Pool(connection);
        try {
            await (
                await pushSchema(schema, drizzlePg({ client: pool }))
            ).apply();
        } finally {
            await pool.end();
        }
        await client.unsafe(
            readFileSync(
                new URL(
                    "../scripts/prepare-ranking-account-source-contract.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
        await client.unsafe(
            readFileSync(
                new URL(
                    "../scripts/prepare-device-retirement-contract.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
    }, 120_000);
    beforeEach(async () => {
        await client.unsafe(
            'TRUNCATE "user", project RESTART IDENTITY CASCADE',
        );
    });
    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    async function seed(
        method: "guest_device" | "email" | "phone" | "passport" = "email",
    ) {
        const userId = randomUUID();
        const oldKey = `did:key:zOld${userId}`;
        const freshKey = `did:key:zFresh${userId}`;
        const email = `${userId}@example.org`;
        await db
            .insert(schema.userTable)
            .values({ id: userId, username: userId.slice(0, 20) });
        await db.insert(schema.deviceTable).values({
            didWrite: oldKey,
            userId,
            userAgent: "original",
            sessionExpiry: new Date(Date.now() + 86_400_000),
        });
        let proof: VerifiedRecoveryProof;
        if (method === "email") {
            await db
                .insert(schema.emailTable)
                .values({ email, type: "primary", userId });
            proof = { method, email };
        } else if (method === "phone") {
            const phoneHash = base64Encode(
                await hashWithSalt({
                    value: "+33612345678",
                    salt: base64Decode("test"),
                }),
            );
            await db.insert(schema.phoneTable).values({
                userId,
                phoneHash,
                lastTwoDigits: 78,
                countryCallingCode: "33",
                pepperVersion: 0,
            });
            proof = { method, phoneHash };
        } else if (method === "passport") {
            await db.insert(schema.zkPassportTable).values({
                userId,
                nullifier: "1",
                citizenship: "FR",
                sex: "F",
            });
            proof = { method, nullifier: "1" };
        } else proof = { method, didWrite: oldKey };
        const project = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: userId,
                    title: "Recovery",
                    directoryVisibility: "unlisted",
                })
                .returning(),
        );
        const config = first(
            await db
                .insert(schema.polisConversationConfigTable)
                .values({})
                .returning(),
        );
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: "recover1",
                    projectId: project.id,
                    polisConfigId: config.id,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({ conversationId: conversation.id, title: "Recovery" })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.conversationTable.id, conversation.id));
        const opinion = first(
            await db
                .insert(schema.opinionTable)
                .values({
                    slugId: "recover2",
                    authorId: userId,
                    conversationId: conversation.id,
                })
                .returning(),
        );
        const source = first(
            await db
                .insert(schema.opinionContentTable)
                .values({
                    opinionId: opinion.id,
                    conversationContentId: content.id,
                    content: "Retained private text",
                })
                .returning(),
        );
        await db
            .update(schema.opinionTable)
            .set({ currentContentId: source.id })
            .where(eq(schema.opinionTable.id, opinion.id));
        return {
            userId,
            oldKey,
            freshKey,
            email,
            proof,
            opinionId: opinion.id,
            conversationId: conversation.id,
            configId: config.id,
        };
    }
    it("allows credential upgrades after recovery without updating retired devices", async () => {
        const fixture = await seed();
        await deleteUserAccount({ db, userId: fixture.userId });
        expect((await restore(fixture)).success).toBe(true);
        const oldDevice = first(
            await db
                .select()
                .from(schema.deviceTable)
                .where(eq(schema.deviceTable.didWrite, fixture.oldKey)),
        );
        const now = await db.transaction(
            async (tx) =>
                await getAccountDatabaseTime({
                    db: tx,
                    userId: fixture.userId,
                }),
        );
        await startHardAuthSession({
            db,
            userId: fixture.userId,
            didWrite: fixture.freshKey,
            now,
            sessionExpiry: new Date(now.getTime() + 86_400_000),
            transition: { type: "credential_upgrade" },
        });
        expect(
            first(
                await db
                    .select()
                    .from(schema.deviceTable)
                    .where(eq(schema.deviceTable.didWrite, fixture.oldKey)),
            ),
        ).toEqual(oldDevice);
        expect(
            (await getDeviceStatus({ db, didWrite: fixture.freshKey, now }))
                .isKnown,
        ).toBe(true);
    });

    it("tags automatic statement agreement votes with the recovered account revision", async () => {
        const fixture = await seed();
        await deleteUserAccount({ db, userId: fixture.userId });
        expect((await restore(fixture)).success).toBe(true);
        const conversation = first(
            await db.select().from(schema.conversationTable),
        );
        if (conversation.currentContentId === null)
            throw new Error("Missing conversation source");
        const voteBuffer = {
            add: vi.fn<VoteBuffer["add"]>().mockResolvedValue(undefined),
            hasBlockingVotes: vi
                .fn<VoteBuffer["hasBlockingVotes"]>()
                .mockResolvedValue(false),
            flush: vi.fn<VoteBuffer["flush"]>().mockResolvedValue(undefined),
            shutdown: vi
                .fn<VoteBuffer["shutdown"]>()
                .mockResolvedValue(undefined),
        } satisfies VoteBuffer;
        const result = await postNewOpinion({
            db,
            voteBuffer,
            isSeed: false,
            now: new Date(),
            commentBody: "<p>My new statement after recovery</p>",
            useGoogleLanguageDetection: false,
            conversationSlugId: conversation.slugId,
            conversationMetadata: {
                conversationId: conversation.id,
                conversationContentId: conversation.currentContentId,
                conversationAuthorId: fixture.userId,
            },
        });
        expect(result.success).toBe(true);
        expect(voteBuffer.add).toHaveBeenCalledWith({
            vote: expect.objectContaining({
                userId: fixture.userId,
                contributionRevision: 1,
                vote: "agree",
            }),
        });
    });

    it("can merge a recovered guest without transferring retired original keys", async () => {
        const fixture = await seed("guest_device");
        const input = first(
            await db
                .insert(schema.analysisInputSnapshotTable)
                .values({
                    conversationId: fixture.conversationId,
                    dataGeneration: 0,
                    inputHash: "a".repeat(64),
                    opinionCount: 1,
                    participantCount: 1,
                    voteCount: 1,
                    compression: "zstd",
                    payload: "AQ==",
                })
                .returning(),
        );
        await db
            .insert(schema.analysisInputParticipantEligibilityTable)
            .values({
                inputSnapshotId: input.id,
                participantIndex: 0,
                userId: fixture.userId,
            });
        await deleteUserAccount({ db, userId: fixture.userId });
        expect(
            first(
                await db
                    .select()
                    .from(schema.analysisInputParticipantEligibilityTable),
            ).isAccountHidden,
        ).toBe(true);
        expect((await restore(fixture)).success).toBe(true);
        expect(
            first(
                await db
                    .select()
                    .from(schema.analysisInputParticipantEligibilityTable),
            ).isAccountHidden,
        ).toBe(false);
        const destinationId = randomUUID();
        await db
            .insert(schema.userTable)
            .values({ id: destinationId, username: "destination" });
        await db.insert(schema.emailTable).values({
            userId: destinationId,
            email: "destination@example.org",
            type: "primary",
        });
        const now = await db.transaction(
            async (tx) =>
                await getAccountDatabaseTime({
                    db: tx,
                    userId: fixture.userId,
                }),
        );
        await db.transaction(
            async (tx) =>
                await mergeGuestIntoVerifiedUser({
                    db: tx,
                    guestUserId: fixture.userId,
                    verifiedUserId: destinationId,
                    now,
                }),
        );
        expect(
            first(
                await db
                    .select()
                    .from(schema.analysisInputParticipantEligibilityTable),
            ),
        ).toMatchObject({
            userId: fixture.userId,
            isAccountHidden: true,
        });
        expect(
            first(
                await db
                    .select()
                    .from(schema.deviceTable)
                    .where(eq(schema.deviceTable.didWrite, fixture.freshKey)),
            ).userId,
        ).toBe(destinationId);
        expect(
            first(
                await db
                    .select()
                    .from(schema.deviceTable)
                    .where(eq(schema.deviceTable.didWrite, fixture.oldKey)),
            ).userId,
        ).toBe(fixture.userId);
        await expect(
            getDeviceStatus({ db, didWrite: fixture.oldKey, now }),
        ).rejects.toThrow("retired");
    });

    it.each(["assigned", "retired"])(
        "rejects a %s replacement key without partially restoring the account",
        async (state) => {
            const fixture = await seed();
            await deleteUserAccount({ db, userId: fixture.userId });
            if (state === "assigned") fixture.freshKey = fixture.oldKey;
            else
                await db
                    .insert(schema.retiredDeviceKeyTable)
                    .values({ didWrite: fixture.freshKey });
            expect(await restore(fixture)).toEqual({
                success: false,
                reason: "recovery_unavailable",
            });
            expect(
                first(await db.select().from(schema.userTable)).isDeleted,
            ).toBe(true);
            expect(
                first(await db.select().from(schema.emailTable))
                    .reservedForRecovery,
            ).toBe(true);
            expect(
                first(await db.select().from(schema.opinionTable))
                    .accountHiddenAt,
            ).not.toBeNull();
        },
    );

    it("rejects a verified credential that does not belong to the pending account", async () => {
        const fixture = await seed();
        await deleteUserAccount({ db, userId: fixture.userId });
        fixture.proof = { method: "email", email: "unrelated@example.org" };
        expect(await restore(fixture)).toEqual({
            success: false,
            reason: "recovery_unavailable",
        });
        expect(first(await db.select().from(schema.userTable)).isDeleted).toBe(
            true,
        );
    });

    async function restore(fixture: Awaited<ReturnType<typeof seed>>) {
        if (fixture.proof.method === "guest_device") {
            return await recoverGuestAccount({
                db,
                originalDidWrite: fixture.proof.didWrite,
                freshDidWrite: fixture.freshKey,
                userAgent: "recovery",
                sessionLifetimeDays: 30,
            });
        }
        return await db.transaction(
            async (tx) =>
                await restoreAccountAfterVerification({
                    db: tx,
                    userId: fixture.userId,
                    didWrite: fixture.freshKey,
                    userAgent: "recovery",
                    sessionLifetimeDays: 30,
                    proof: fixture.proof,
                }),
        );
    }

    async function seedPrioritizationParticipation({
        method,
        isClosed,
    }: {
        method: "bws" | "pairwise" | "qv";
        isClosed: boolean;
    }) {
        const actor = await seed();
        const project = first(await db.select().from(schema.projectTable));
        const config =
            method === "qv"
                ? first(
                      await db
                          .insert(schema.qvConfigTable)
                          .values({
                              statementsLockedAt: new Date(),
                          })
                          .returning(),
                  )
                : first(
                      await db
                          .insert(schema.rankingConversationConfigTable)
                          .values({
                              rankingMode: method,
                          })
                          .returning(),
                  );
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: randomUUID().slice(0, 8),
                    projectId: project.id,
                    conversationType: "prioritizing",
                    prioritizationType: method === "qv" ? "qv" : "comparisons",
                    creditVotingConfigId:
                        method === "qv" ? config.id : undefined,
                    rankingConfigId: method === "qv" ? undefined : config.id,
                    isClosed,
                    closingTargetRevision:
                        isClosed && method !== "qv" ? 0 : undefined,
                    closedFinalizedAt:
                        isClosed && method !== "qv" ? new Date() : undefined,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({
                    conversationId: conversation.id,
                    title: "Retained numerical participation",
                })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.conversationTable.id, conversation.id));
        const participant = first(
            await db
                .insert(schema.conversationParticipantTable)
                .values({
                    conversationId: conversation.id,
                    userId: actor.userId,
                })
                .returning(),
        );
        const items = await db
            .insert(schema.rankingItemTable)
            .values(
                [0, 1].map((position) => ({
                    conversationId: conversation.id,
                    slugId: randomUUID().slice(0, 8),
                    isSeed: true,
                    authorId: actor.userId,
                    position,
                })),
            )
            .returning();
        const itemContents = await db
            .insert(schema.rankingItemContentTable)
            .values(
                items.map((item) => ({
                    rankingItemId: item.id,
                    conversationContentId: content.id,
                    title: `Statement ${item.position}`,
                })),
            )
            .returning();
        for (const itemContent of itemContents)
            await db
                .update(schema.rankingItemTable)
                .set({ currentContentId: itemContent.id })
                .where(
                    eq(schema.rankingItemTable.id, itemContent.rankingItemId),
                );
        if (method === "qv") {
            const response = first(
                await db
                    .insert(schema.qvResponseTable)
                    .values({
                        conversationId: conversation.id,
                        participantId: participant.id,
                        revision: 1,
                    })
                    .returning(),
            );
            const version = first(
                await db
                    .insert(schema.qvResponseVersionTable)
                    .values({
                        responseId: response.id,
                        conversationId: conversation.id,
                        statementSetRevision: 0,
                        allowOpposition: true,
                        creditsSpent: 9,
                    })
                    .returning(),
            );
            await db.insert(schema.qvAllocationTable).values({
                versionId: version.id,
                conversationId: conversation.id,
                itemId: first(itemContents).rankingItemId,
                contentId: first(itemContents).id,
                votes: 3,
            });
            await db
                .update(schema.qvResponseTable)
                .set({ currentVersionId: version.id })
                .where(eq(schema.qvResponseTable.id, response.id));
            await db.insert(schema.qvResponseCommandTable).values({
                responseId: response.id,
                commandId: randomUUID(),
                requestHash: "a".repeat(64),
                resultRevision: 1,
                resultVersionId: version.id,
            });
        } else {
            const choice = {
                best: first(items).slugId,
                worst: first(items.slice(1)).slugId,
                set: items.map((item) => item.slugId),
            };
            const response = first(
                await db
                    .insert(schema.comparisonResponseTable)
                    .values({
                        conversationId: conversation.id,
                        participantId: actor.userId,
                        comparisons: [choice],
                    })
                    .returning(),
            );
            await db.insert(schema.comparisonAnswerTable).values({
                comparisonResponseId: response.id,
                position: 0,
                bestSlugId: choice.best,
                worstSlugId: choice.worst,
                candidateSet: choice.set,
            });
            await db.insert(schema.comparisonUserEntityScoreTable).values({
                comparisonResponseId: response.id,
                entitySlugId: choice.best,
                score: 0.5,
                displayScore: 0.5,
                uncertaintyLeft: 0.1,
                uncertaintyRight: 0.1,
            });
        }
        const readNumericalState = async () => ({
            comparisonResponses: await db
                .select()
                .from(schema.comparisonResponseTable)
                .where(
                    eq(
                        schema.comparisonResponseTable.conversationId,
                        conversation.id,
                    ),
                ),
            comparisonAnswers: await db
                .select({ answer: schema.comparisonAnswerTable })
                .from(schema.comparisonAnswerTable)
                .innerJoin(
                    schema.comparisonResponseTable,
                    eq(
                        schema.comparisonResponseTable.id,
                        schema.comparisonAnswerTable.comparisonResponseId,
                    ),
                )
                .where(
                    eq(
                        schema.comparisonResponseTable.conversationId,
                        conversation.id,
                    ),
                ),
            personalScores: await db
                .select({ score: schema.comparisonUserEntityScoreTable })
                .from(schema.comparisonUserEntityScoreTable)
                .innerJoin(
                    schema.comparisonResponseTable,
                    eq(
                        schema.comparisonResponseTable.id,
                        schema.comparisonUserEntityScoreTable
                            .comparisonResponseId,
                    ),
                )
                .where(
                    eq(
                        schema.comparisonResponseTable.conversationId,
                        conversation.id,
                    ),
                ),
            qvResponses: await db
                .select({
                    id: schema.qvResponseTable.id,
                    revision: schema.qvResponseTable.revision,
                    currentVersionId: schema.qvResponseTable.currentVersionId,
                    deletedAt: schema.qvResponseTable.deletedAt,
                })
                .from(schema.qvResponseTable)
                .where(
                    eq(schema.qvResponseTable.conversationId, conversation.id),
                ),
            qvVersions: await db
                .select()
                .from(schema.qvResponseVersionTable)
                .where(
                    eq(
                        schema.qvResponseVersionTable.conversationId,
                        conversation.id,
                    ),
                ),
            qvAllocations: await db
                .select()
                .from(schema.qvAllocationTable)
                .where(
                    eq(
                        schema.qvAllocationTable.conversationId,
                        conversation.id,
                    ),
                ),
            qvCommands: await db
                .select({ command: schema.qvResponseCommandTable })
                .from(schema.qvResponseCommandTable)
                .innerJoin(
                    schema.qvResponseTable,
                    eq(
                        schema.qvResponseTable.id,
                        schema.qvResponseCommandTable.responseId,
                    ),
                )
                .where(
                    eq(schema.qvResponseTable.conversationId, conversation.id),
                ),
        });
        return { actor, conversation, participant, readNumericalState };
    }

    it.each([
        { method: "bws", isClosed: false },
        { method: "bws", isClosed: true },
        { method: "pairwise", isClosed: false },
        { method: "pairwise", isClosed: true },
        { method: "qv", isClosed: false },
        { method: "qv", isClosed: true },
    ] satisfies { method: "bws" | "pairwise" | "qv"; isClosed: boolean }[])(
        "preserves $method numerical sources through logical deletion/recovery (closed=$isClosed)",
        async ({ method, isClosed }) => {
            const f = await seedPrioritizationParticipation({
                method,
                isClosed,
            });
            const before = await f.readNumericalState();
            await deleteUserAccount({ db, userId: f.actor.userId });
            expect(await f.readNumericalState()).toEqual(before);
            const account = first(
                await db
                    .select()
                    .from(schema.userTable)
                    .where(eq(schema.userTable.id, f.actor.userId)),
            );
            expect(account.isDeleted).toBe(true);
            expect(
                await db.transaction(async (tx) => {
                    await tx
                        .select({ id: schema.userTable.id })
                        .from(schema.userTable)
                        .where(eq(schema.userTable.id, f.actor.userId))
                        .for("no key update");
                    return await findAccountParticipationSource({
                        db: tx,
                        userId: f.actor.userId,
                    });
                }),
            ).toBe(method === "qv" ? "qv_response" : "comparison_response");
            expect(
                first(
                    await db
                        .select()
                        .from(schema.conversationParticipantTable)
                        .where(
                            eq(
                                schema.conversationParticipantTable.id,
                                f.participant.id,
                            ),
                        ),
                ).userId,
            ).toBe(f.actor.userId);
            if (method === "qv")
                expect(
                    first(
                        await db
                            .select()
                            .from(schema.qvResponseTable)
                            .where(
                                eq(
                                    schema.qvResponseTable.conversationId,
                                    f.conversation.id,
                                ),
                            ),
                    ).accountHiddenAt,
                ).toEqual(account.deletionRequestedAt);
            const seeds = await db
                .select()
                .from(schema.rankingItemTable)
                .where(
                    eq(
                        schema.rankingItemTable.conversationId,
                        f.conversation.id,
                    ),
                );
            expect(
                seeds.every(
                    (item) =>
                        item.accountHiddenAt === null &&
                        item.currentContentId !== null,
                ),
            ).toBe(true);
            expect((await restore(f.actor)).success).toBe(true);
            expect(await f.readNumericalState()).toEqual(before);
            if (method === "qv")
                expect(
                    first(
                        await db
                            .select()
                            .from(schema.qvResponseTable)
                            .where(
                                eq(
                                    schema.qvResponseTable.conversationId,
                                    f.conversation.id,
                                ),
                            ),
                    ).accountHiddenAt,
                ).toBeNull();
        },
    );

    async function expire(userId: string) {
        await db
            .update(schema.userTable)
            .set({
                deletionRequestedAt: sql`date_trunc('second', clock_timestamp()) - interval '15 days'`,
                recoverableUntil: sql`date_trunc('second', clock_timestamp())`,
            })
            .where(eq(schema.userTable.id, userId));
    }

    it.each(["email", "phone", "passport", "guest_device"] as const)(
        "restores %s only into a fresh session and retires old keys",
        async (method) => {
            const fixture = await seed(method);
            await deleteUserAccount({ db, userId: fixture.userId });
            const pending = first(await db.select().from(schema.userTable));
            expect(pending.isDeleted).toBe(true);
            expect(pending.recoverableUntil?.getTime()).toBe(
                (pending.deletionRequestedAt?.getTime() ?? 0) + 15 * 86_400_000,
            );
            expect(
                (
                    await getDeviceStatus({
                        db,
                        didWrite: fixture.oldKey,
                        now: new Date(),
                    })
                ).isKnown,
            ).toBe(false);
            expect(await restore(fixture)).toEqual({
                success: true,
                accountMerged: false,
                userId: fixture.userId,
            });
            expect(
                first(await db.select().from(schema.opinionTable))
                    .accountHiddenAt,
            ).toBeNull();
            expect(
                first(await db.select().from(schema.userTable))
                    .recoverableUntil,
            ).toBeNull();
            await expect(
                getDeviceStatus({
                    db,
                    didWrite: fixture.oldKey,
                    now: new Date(),
                }),
            ).rejects.toThrow("retired");
            expect(
                (
                    await getDeviceStatus({
                        db,
                        didWrite: fixture.freshKey,
                        now: new Date(),
                    })
                ).isKnown,
            ).toBe(true);
            expect(await restore(fixture)).toEqual({
                success: false,
                reason: "recovery_unavailable",
            });
        },
    );

    it("does not move the original deadline on retries; a later deletion gets a new window", async () => {
        const fixture = await seed();
        await deleteUserAccount({ db, userId: fixture.userId });
        const earlierRequest = new Date(Date.now() - 86_400_000);
        await db
            .update(schema.userTable)
            .set({
                deletionRequestedAt: earlierRequest,
                recoverableUntil: new Date(
                    earlierRequest.getTime() + 15 * 86_400_000,
                ),
            })
            .where(eq(schema.userTable.id, fixture.userId));
        const before = first(await db.select().from(schema.userTable));
        await deleteUserAccount({ db, userId: fixture.userId });
        expect(first(await db.select().from(schema.userTable))).toEqual(before);
        await restore(fixture);
        await db
            .update(schema.userTable)
            .set({ updatedAt: new Date(0) })
            .where(eq(schema.userTable.id, fixture.userId));
        await deleteUserAccount({ db, userId: fixture.userId });
        expect(
            first(
                await db.select().from(schema.userTable),
            ).deletionRequestedAt?.getTime(),
        ).toBeGreaterThan(earlierRequest.getTime());
    });

    it("reserves each credential and does not reactivate independently deleted credentials", async () => {
        const fixture = await seed();
        await db.insert(schema.emailTable).values({
            userId: fixture.userId,
            email: "removed@example.org",
            type: "primary",
            isDeleted: true,
        });
        await deleteUserAccount({ db, userId: fixture.userId });
        const other = randomUUID();
        await db
            .insert(schema.userTable)
            .values({ id: other, username: other.slice(0, 20) });
        await expect(
            db.insert(schema.emailTable).values({
                userId: other,
                email: fixture.email,
                type: "primary",
            }),
        ).rejects.toThrow();
        await restore(fixture);
        expect(
            first(
                await db
                    .select()
                    .from(schema.emailTable)
                    .where(eq(schema.emailTable.email, "removed@example.org")),
            ).isDeleted,
        ).toBe(true);
    });

    it("does not restore independently deleted statements or withdrawn votes", async () => {
        const fixture = await seed();
        const participant = first(
            await db
                .insert(schema.conversationParticipantTable)
                .values({
                    conversationId: first(
                        await db.select().from(schema.conversationTable),
                    ).id,
                    userId: fixture.userId,
                })
                .returning(),
        );
        await db.insert(schema.voteTable).values({
            authorId: fixture.userId,
            opinionId: fixture.opinionId,
            participantId: participant.id,
            withdrawnAt: new Date(),
            currentContentId: null,
        });
        await deleteUserAccount({ db, userId: fixture.userId });
        await db
            .update(schema.opinionTable)
            .set({ deletedAt: new Date(), currentContentId: null })
            .where(eq(schema.opinionTable.id, fixture.opinionId));
        expect((await restore(fixture)).success).toBe(true);
        expect(
            first(await db.select().from(schema.opinionTable)).accountHiddenAt,
        ).not.toBeNull();
        expect(
            first(await db.select().from(schema.voteTable)).withdrawnAt,
        ).not.toBeNull();
    });

    it("preserves frozen numerical inputs and finalized math across deletion and recovery", async () => {
        const fixture = await seed();
        const conversation = first(
            await db.select().from(schema.conversationTable),
        );
        const matrix = first(
            await db
                .insert(schema.analysisInputSnapshotTable)
                .values({
                    conversationId: conversation.id,
                    dataGeneration: 0,
                    inputHash: "a".repeat(64),
                    opinionCount: 1,
                    participantCount: 2,
                    voteCount: 2,
                    compression: "zstd",
                    payload: "AQIDBA==",
                })
                .returning(),
        );
        const snapshot = first(
            await db
                .insert(schema.analysisSnapshotTable)
                .values({
                    conversationId: conversation.id,
                    conversationContentId: conversation.currentContentId,
                    inputSnapshotId: matrix.id,
                    dataGeneration: 0,
                    computedAt: new Date(),
                })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({
                isClosed: true,
                closedFinalizedAt: new Date(),
                closingTargetRevision: 0,
            })
            .where(eq(schema.conversationTable.id, conversation.id));
        const before = first(
            await db.select().from(schema.polisConversationConfigTable),
        );
        await deleteUserAccount({ db, userId: fixture.userId });
        expect((await restore(fixture)).success).toBe(true);
        expect(
            first(await db.select().from(schema.analysisInputSnapshotTable)),
        ).toEqual(matrix);
        expect(
            first(await db.select().from(schema.analysisSnapshotTable)),
        ).toEqual(snapshot);
        expect(
            first(await db.select().from(schema.polisConversationConfigTable)),
        ).toEqual(before);
    });

    it.each(["phone", "passport"] as const)(
        "keeps a pending %s credential unavailable to unrelated registration",
        async (method) => {
            const fixture = await seed(method);
            await deleteUserAccount({ db, userId: fixture.userId });
            const other = randomUUID();
            await db
                .insert(schema.userTable)
                .values({ id: other, username: other.slice(0, 20) });
            if (fixture.proof.method === "phone") {
                await expect(
                    db.insert(schema.phoneTable).values({
                        userId: other,
                        phoneHash: fixture.proof.phoneHash,
                        lastTwoDigits: 78,
                        countryCallingCode: "33",
                    }),
                ).rejects.toThrow();
            } else if (fixture.proof.method === "passport") {
                await expect(
                    db.insert(schema.zkPassportTable).values({
                        userId: other,
                        nullifier: fixture.proof.nullifier,
                        citizenship: "FR",
                        sex: "F",
                    }),
                ).rejects.toThrow();
            }
        },
    );

    it.each(["deadline", "purging", "guest_merge", "legacy"] as const)(
        "rejects %s and preserves all private state",
        async (state) => {
            const fixture = await seed();
            await deleteUserAccount({ db, userId: fixture.userId });
            if (state === "deadline") await expire(fixture.userId);
            else if (state === "purging")
                await db
                    .update(schema.userTable)
                    .set({ purgeStartedAt: new Date() })
                    .where(eq(schema.userTable.id, fixture.userId));
            else
                await db
                    .update(schema.userTable)
                    .set({
                        deletionRequestedAt: null,
                        recoverableUntil: null,
                        deletionReason:
                            state === "guest_merge" ? "guest_merge" : null,
                    })
                    .where(eq(schema.userTable.id, fixture.userId));
            const before = first(await db.select().from(schema.userTable));
            expect(await restore(fixture)).toEqual({
                success: false,
                reason: "recovery_unavailable",
            });
            expect(first(await db.select().from(schema.userTable))).toEqual(
                before,
            );
            expect(
                first(await db.select().from(schema.opinionTable))
                    .accountHiddenAt,
            ).not.toBeNull();
        },
    );

    it.each([false, true])(
        "rejects recovery after a deadline-crossing lock wait (purge starts: %s)",
        async (startPurge) => {
            const fixture = await seed();
            await deleteUserAccount({ db, userId: fixture.userId });
            const databaseNow = await db.transaction(
                async (tx) =>
                    await getAccountDatabaseTime({
                        db: tx,
                        userId: fixture.userId,
                    }),
            );
            const deadline = new Date(databaseNow.getTime() + 1000);
            await db
                .update(schema.userTable)
                .set({
                    deletionRequestedAt: new Date(
                        deadline.getTime() - 15 * 86_400_000,
                    ),
                    recoverableUntil: deadline,
                })
                .where(eq(schema.userTable.id, fixture.userId));
            let pending:
                | Promise<Awaited<ReturnType<typeof restore>>>
                | undefined;
            await db.transaction(async (tx) => {
                await tx
                    .select()
                    .from(schema.userTable)
                    .where(eq(schema.userTable.id, fixture.userId))
                    .for("no key update");
                pending = restore(fixture);
                // Testcontainers' VM clock can differ from the host wall clock.
                await delay(1250);
                if (startPurge)
                    expect(
                        await beginScheduledAccountPurge({
                            db: tx,
                            userId: fixture.userId,
                        }),
                    ).toBe(true);
            });
            expect(await pending).toEqual({
                success: false,
                reason: "recovery_unavailable",
            });
        },
    );

    it("enforces UTC lifecycle deadlines independently of the database session timezone", async () => {
        const fixture = await seed();
        await deleteUserAccount({ db, userId: fixture.userId });
        const databaseNow = await db.transaction(
            async (tx) =>
                await getAccountDatabaseTime({
                    db: tx,
                    userId: fixture.userId,
                }),
        );
        const deadline = new Date(databaseNow.getTime() + 60_000);
        await db
            .update(schema.userTable)
            .set({
                deletionRequestedAt: new Date(
                    deadline.getTime() - 15 * 86_400_000,
                ),
                recoverableUntil: deadline,
            })
            .where(eq(schema.userTable.id, fixture.userId));
        const result = await db.transaction(async (tx) => {
            await tx.execute(sql`SET LOCAL TIME ZONE 'Pacific/Auckland'`);
            expect(
                await beginScheduledAccountPurge({
                    db: tx,
                    userId: fixture.userId,
                }),
            ).toBe(false);
            return await restoreAccountAfterVerification({
                db: tx,
                userId: fixture.userId,
                didWrite: fixture.freshKey,
                userAgent: "test",
                sessionLifetimeDays: 30,
                proof: fixture.proof,
            });
        });
        expect(result.success).toBe(true);
    });

    it("a completed restore prevents a waiting scheduled purge", async () => {
        const fixture = await seed();
        await deleteUserAccount({ db, userId: fixture.userId });
        let pending: Promise<boolean> | undefined;
        await db.transaction(async (tx) => {
            expect(
                (
                    await restoreAccountAfterVerification({
                        db: tx,
                        userId: fixture.userId,
                        didWrite: fixture.freshKey,
                        userAgent: "test",
                        sessionLifetimeDays: 30,
                        proof: fixture.proof,
                    })
                ).success,
            ).toBe(true);
            pending = db.transaction(
                async (purge) =>
                    await beginScheduledAccountPurge({
                        db: purge,
                        userId: fixture.userId,
                    }),
            );
            await delay(20);
        });
        expect(await pending).toBe(false);
    });

    it("guest proof cannot recover an identity that has ever held a registered credential", async () => {
        const fixture = await seed();
        await deleteUserAccount({ db, userId: fixture.userId });
        fixture.proof = { method: "guest_device", didWrite: fixture.oldKey };
        expect((await restore(fixture)).success).toBe(false);
    });

    it("consumes email proof without implicitly restoring; explicit OTP recovery succeeds", async () => {
        const fixture = await seed();
        await deleteUserAccount({ db, userId: fixture.userId });
        const send = async (didWrite: string) =>
            await authenticateEmailAttempt({
                db,
                didWrite,
                email: fixture.email,
                axiosReacher: undefined,
                isRequestingNewCode: true,
                minutesBeforeEmailCodeExpiry: 5,
                userAgent: "test",
                throttleEmailSecondsInterval: 0,
                testCode: 123456,
                doUseTestCode: true,
                now: new Date(),
            });
        expect((await send("did:key:zNoRestore")).success).toBe(true);
        expect(
            await verifyEmailOtp({
                db,
                didWrite: "did:key:zNoRestore",
                email: fixture.email,
                code: 123456,
                maxAttempt: 5,
                sessionLifetimeDays: 30,
                currentDisplayLanguage: "en",
                now: new Date(),
            }),
        ).toEqual({ success: false, reason: "recovery_required" });
        expect(first(await db.select().from(schema.userTable)).isDeleted).toBe(
            true,
        );
        await send(fixture.freshKey);
        expect(
            (
                await verifyEmailOtp({
                    db,
                    didWrite: fixture.freshKey,
                    email: fixture.email,
                    code: 123456,
                    maxAttempt: 5,
                    sessionLifetimeDays: 30,
                    currentDisplayLanguage: "en",
                    recoverAccount: true,
                    now: new Date(),
                })
            ).success,
        ).toBe(true);
    });

    it("restores phone accounts in login-only mode after a verified recovery OTP", async () => {
        const fixture = await seed("phone");
        await deleteUserAccount({ db, userId: fixture.userId });
        const phoneAuth = {
            mode: "login_only",
            minimumResponseTimeMs: 0,
            responseJitterMs: 0,
            delivery: {
                type: "local",
                testCode: 0,
                speciallyAuthorizedPhones: [],
            },
        } satisfies import("../src/service/auth.js").PhoneAuth;
        expect(
            (
                await authenticateAttempt({
                    db,
                    didWrite: fixture.freshKey,
                    authenticateRequestBody: {
                        phoneNumber: "+33612345678",
                        defaultCallingCode: "33",
                        isRequestingNewCode: true,
                    },
                    minutesBeforeSmsCodeExpiry: 5,
                    userAgent: "test",
                    throttleSmsSecondsInterval: 0,
                    phoneAuth,
                    peppers: ["test"],
                    now: new Date(),
                })
            ).success,
        ).toBe(true);
        expect(
            (
                await verifyPhoneOtp({
                    db,
                    didWrite: fixture.freshKey,
                    phoneNumber: "+33612345678",
                    defaultCallingCode: "33",
                    code: first(
                        await db.select().from(schema.authAttemptPhoneTable),
                    ).code,
                    maxAttempt: 5,
                    phoneAuth,
                    peppers: ["test"],
                    sessionLifetimeDays: 30,
                    currentDisplayLanguage: "en",
                    recoverAccount: true,
                    now: new Date(),
                })
            ).success,
        ).toBe(true);
    });

    it("requires explicit cancellation even after the passport provider verifies control", async () => {
        const fixture = await seed("passport");
        await deleteUserAccount({ db, userId: fixture.userId });
        const provider = axios.create({
            adapter: async (config) => ({
                config,
                status: 200,
                statusText: "OK",
                headers: {},
                data: config.url?.includes("verification-status")
                    ? { data: { attributes: { status: "verified" } } }
                    : {
                          data: {
                              attributes: {
                                  proof: {
                                      proof: {
                                          pi_a: ["0", "0"],
                                          pi_b: [
                                              ["0", "0"],
                                              ["0", "0"],
                                              ["0", "0"],
                                          ],
                                          pi_c: ["0", "0"],
                                          protocol: "groth16",
                                      },
                                      pub_signals: [
                                          "1",
                                          "0",
                                          "0",
                                          "0",
                                          "0",
                                          "0",
                                          "70",
                                          "70",
                                      ],
                                  },
                              },
                          },
                      },
            }),
        });
        const params = {
            db,
            didWrite: fixture.freshKey,
            axiosVerificatorSvc: provider,
            userAgent: "test",
            sessionLifetimeDays: 30,
            currentDisplayLanguage: "en",
        } as const;
        expect(await verifyUserStatusAndAuthenticate(params)).toEqual({
            success: false,
            reason: "recovery_required",
        });
        expect(
            (
                await verifyUserStatusAndAuthenticate({
                    ...params,
                    recoverAccount: true,
                })
            ).success,
        ).toBe(true);
    });
});
