/**
 * Vote Buffer Lua Script Tests
 *
 * These tests verify the correctness of Lua scripts used in voteBuffer.ts.
 * Uses testcontainers to spin up a real Valkey instance for accurate testing.
 *
 * The tests cover:
 * - ADD_VOTE_SCRIPT: Atomic ZADD GT CH + HSET for vote insertion
 * - CLEANUP_VOTES_SCRIPT: Conditional delete with score verification
 * - Integration scenarios: Full add → flush → cleanup workflows
 * - Edge cases: Empty data, special characters, large batches
 *
 * Run with: pnpm test tests/voteBuffer.test.ts
 *
 * Note: Requires Docker/Podman to be running. Tests will be skipped if
 * container runtime is not available.
 *
 * PODMAN USERS: You must set environment variables for testcontainers:
 *   DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')" \
 *   TESTCONTAINERS_RYUK_DISABLED=true \
 *   pnpm test tests/voteBuffer.test.ts
 *
 * The DOCKER_HOST points to the Podman socket, and TESTCONTAINERS_RYUK_DISABLED
 * is required because Ryuk (cleanup container) has issues with Podman's socket mounting.
 */

import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
} from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { GlideClient, Script, Decoder } from "@valkey/valkey-glide";
import {
    ADD_VOTE_SCRIPT,
    CLEANUP_VOTES_SCRIPT,
} from "../src/service/voteBuffer.js";

// ============================================================================
// Test Helpers
// ============================================================================

interface VoteData {
    userId: string;
    opinionId: number;
    vote: "agree" | "disagree" | "pass" | "cancel";
    timestamp: number;
}

function createVoteData(
    userId: string,
    opinionId: number,
    vote: VoteData["vote"],
    timestamp: number,
): VoteData {
    return { userId, opinionId, vote, timestamp };
}

function getMemberKey(userId: string, opinionId: number): string {
    return `${userId}:${String(opinionId)}`;
}

// ============================================================================
// Tests
// ============================================================================

describe("Vote Buffer Lua Scripts", () => {
    let container: StartedTestContainer;
    let client: GlideClient;
    let addVoteScript: Script;
    let cleanupVotesScript: Script;

    const INDEX_KEY = "test:votes:index";
    const DATA_KEY = "test:votes:data";

    beforeAll(async () => {
        // Start Valkey container
        container = await new GenericContainer("valkey/valkey:8")
            .withExposedPorts(6379)
            .start();

        const host = container.getHost();
        const port = container.getMappedPort(6379);

        // Connect with valkey-glide
        client = await GlideClient.createClient({
            addresses: [{ host, port }],
            defaultDecoder: Decoder.String,
        });

        // Create script objects
        addVoteScript = new Script(ADD_VOTE_SCRIPT);
        cleanupVotesScript = new Script(CLEANUP_VOTES_SCRIPT);
    }, 60000); // 60s timeout for container startup

    afterAll(async () => {
        // Clean up in reverse order
        addVoteScript?.release();
        cleanupVotesScript?.release();
        client?.close();
        await container?.stop();
    });

    // Clear test keys before each test for isolation
    beforeEach(async () => {
        await client.del([INDEX_KEY, DATA_KEY]);
    });

    // ========================================================================
    // ADD_VOTE_SCRIPT Tests
    // ========================================================================

    describe("ADD_VOTE_SCRIPT", () => {
        describe("basic functionality", () => {
            it("should add a new vote to both sorted set and hash", async () => {
                const member = getMemberKey("user1", 1);
                const score = "1000";
                const data = JSON.stringify(
                    createVoteData("user1", 1, "agree", 1000),
                );

                const result = await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, score, data],
                });

                expect(result).toBe(1);

                // Verify both structures are populated
                const zScore = await client.zscore(INDEX_KEY, member);
                expect(zScore).toBe(1000);

                const hData = await client.hget(DATA_KEY, member);
                expect(hData).toBe(data);
            });

            it("should handle multiple different votes", async () => {
                const votes = [
                    { userId: "user1", opinionId: 1, score: 1000 },
                    { userId: "user2", opinionId: 1, score: 1001 },
                    { userId: "user1", opinionId: 2, score: 1002 },
                ];

                for (const v of votes) {
                    const member = getMemberKey(v.userId, v.opinionId);
                    const data = JSON.stringify(
                        createVoteData(v.userId, v.opinionId, "agree", v.score),
                    );

                    await client.invokeScript(addVoteScript, {
                        keys: [INDEX_KEY, DATA_KEY],
                        args: [member, String(v.score), data],
                    });
                }

                // Verify all votes exist
                const zcard = await client.zcard(INDEX_KEY);
                expect(zcard).toBe(3);

                const hlen = await client.hlen(DATA_KEY);
                expect(hlen).toBe(3);
            });
        });

        describe("GT (greater than) behavior", () => {
            it("should update vote when new score is greater", async () => {
                const member = getMemberKey("user1", 1);
                const data1 = JSON.stringify(
                    createVoteData("user1", 1, "agree", 1000),
                );
                const data2 = JSON.stringify(
                    createVoteData("user1", 1, "disagree", 2000),
                );

                // Add initial vote
                await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, "1000", data1],
                });

                // Update with higher score
                const result = await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, "2000", data2],
                });

                expect(result).toBe(1);

                // Verify updated data
                const hData = await client.hget(DATA_KEY, member);
                expect(hData).toBe(data2);

                const zScore = await client.zscore(INDEX_KEY, member);
                expect(zScore).toBe(2000);
            });

            it("should NOT update vote when new score is lower", async () => {
                const member = getMemberKey("user1", 1);
                const data1 = JSON.stringify(
                    createVoteData("user1", 1, "agree", 2000),
                );
                const data2 = JSON.stringify(
                    createVoteData("user1", 1, "disagree", 1000),
                );

                // Add initial vote with higher score
                await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, "2000", data1],
                });

                // Try to update with lower score
                const result = await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, "1000", data2],
                });

                expect(result).toBe(0);

                // Verify original data preserved
                const hData = await client.hget(DATA_KEY, member);
                expect(hData).toBe(data1);

                const zScore = await client.zscore(INDEX_KEY, member);
                expect(zScore).toBe(2000);
            });

            it("should NOT update vote when score is equal", async () => {
                const member = getMemberKey("user1", 1);
                const data1 = JSON.stringify(
                    createVoteData("user1", 1, "agree", 1000),
                );
                const data2 = JSON.stringify(
                    createVoteData("user1", 1, "disagree", 1000),
                );

                // Add initial vote
                await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, "1000", data1],
                });

                // Try to update with same score
                const result = await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, "1000", data2],
                });

                expect(result).toBe(0);

                // Verify original data preserved
                const hData = await client.hget(DATA_KEY, member);
                expect(hData).toBe(data1);
            });
        });

        describe("edge cases", () => {
            it("should handle very large scores (millisecond timestamps)", async () => {
                const member = getMemberKey("user1", 1);
                // Realistic timestamp: 2024-01-01 in milliseconds
                const score = "1704067200000";
                const data = JSON.stringify(
                    createVoteData("user1", 1, "agree", 1704067200000),
                );

                const result = await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, score, data],
                });

                expect(result).toBe(1);

                const zScore = await client.zscore(INDEX_KEY, member);
                expect(zScore).toBe(1704067200000);
            });

            it("should handle special characters in user IDs", async () => {
                // UUIDs, DIDs, etc. may contain special characters
                const userId = "did:web:example.com%3A8080";
                const member = getMemberKey(userId, 1);
                const data = JSON.stringify(
                    createVoteData(userId, 1, "agree", 1000),
                );

                const result = await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, "1000", data],
                });

                expect(result).toBe(1);

                const hData = await client.hget(DATA_KEY, member);
                expect(hData).toBe(data);
            });

            it("should handle large JSON data payloads", async () => {
                const member = getMemberKey("user1", 1);
                const largeData = JSON.stringify({
                    userId: "user1",
                    opinionId: 1,
                    vote: "agree",
                    timestamp: 1000,
                    proof: "a".repeat(10000), // Large proof string
                    didWrite: "did:web:example.com",
                    metadata: { extra: "data", nested: { deep: true } },
                });

                const result = await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, "1000", largeData],
                });

                expect(result).toBe(1);

                const hData = await client.hget(DATA_KEY, member);
                expect(hData).toBe(largeData);
            });

            it("should handle opinion ID of 0", async () => {
                const member = getMemberKey("user1", 0);
                const data = JSON.stringify(
                    createVoteData("user1", 0, "agree", 1000),
                );

                const result = await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [member, "1000", data],
                });

                expect(result).toBe(1);
                expect(member).toBe("user1:0");
            });
        });
    });

    // ========================================================================
    // CLEANUP_VOTES_SCRIPT Tests
    // ========================================================================

    describe("CLEANUP_VOTES_SCRIPT", () => {
        describe("basic functionality", () => {
            it("should delete entry when score matches exactly", async () => {
                // Setup: Add vote directly
                await client.zadd(INDEX_KEY, [
                    { element: "user1:1", score: 1000 },
                ]);
                await client.hset(DATA_KEY, { "user1:1": "data1" });

                // Cleanup with matching score
                const result = await client.invokeScript(cleanupVotesScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: ["user1:1", "1000"],
                });

                expect(result).toBe(1);

                // Verify deleted from both structures
                expect(await client.zscore(INDEX_KEY, "user1:1")).toBeNull();
                expect(await client.hget(DATA_KEY, "user1:1")).toBeNull();
            });

            it("should return 0 and preserve data when score does NOT match", async () => {
                await client.zadd(INDEX_KEY, [
                    { element: "user1:1", score: 2000 },
                ]);
                await client.hset(DATA_KEY, { "user1:1": "data1" });

                // Try cleanup with wrong score
                const result = await client.invokeScript(cleanupVotesScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: ["user1:1", "1000"], // Wrong score
                });

                expect(result).toBe(0);

                // Verify data preserved
                expect(await client.zscore(INDEX_KEY, "user1:1")).toBe(2000);
                expect(await client.hget(DATA_KEY, "user1:1")).toBe("data1");
            });
        });

        describe("race condition protection", () => {
            it("should NOT delete when newer vote arrives during flush", async () => {
                // Scenario: Vote A is read for flush, Vote B arrives, flush tries to delete

                // Add vote A
                await client.zadd(INDEX_KEY, [
                    { element: "user1:1", score: 1000 },
                ]);
                await client.hset(DATA_KEY, { "user1:1": "voteA" });

                // Simulate vote B arriving (overwrites A)
                await client.zadd(INDEX_KEY, [
                    { element: "user1:1", score: 2000 },
                ]);
                await client.hset(DATA_KEY, { "user1:1": "voteB" });

                // Try to cleanup with vote A's score
                const result = await client.invokeScript(cleanupVotesScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: ["user1:1", "1000"],
                });

                expect(result).toBe(0);

                // Vote B must be preserved!
                expect(await client.zscore(INDEX_KEY, "user1:1")).toBe(2000);
                expect(await client.hget(DATA_KEY, "user1:1")).toBe("voteB");
            });
        });

        describe("batch operations", () => {
            it("should handle batch cleanup of multiple entries", async () => {
                // Add multiple votes
                await client.zadd(INDEX_KEY, [
                    { element: "user1:1", score: 1000 },
                    { element: "user2:2", score: 2000 },
                    { element: "user3:3", score: 3000 },
                ]);
                await client.hset(DATA_KEY, {
                    "user1:1": "data1",
                    "user2:2": "data2",
                    "user3:3": "data3",
                });

                // Cleanup batch: first two match, third doesn't
                const result = await client.invokeScript(cleanupVotesScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [
                        "user1:1",
                        "1000", // matches
                        "user2:2",
                        "2000", // matches
                        "user3:3",
                        "9999", // doesn't match
                    ],
                });

                expect(result).toBe(2);

                // Verify first two deleted
                expect(await client.zscore(INDEX_KEY, "user1:1")).toBeNull();
                expect(await client.zscore(INDEX_KEY, "user2:2")).toBeNull();

                // Verify third preserved
                expect(await client.zscore(INDEX_KEY, "user3:3")).toBe(3000);
                expect(await client.hget(DATA_KEY, "user3:3")).toBe("data3");
            });

            it("should handle large batch cleanup efficiently", async () => {
                const batchSize = 100;
                const elements: Array<{ element: string; score: number }> = [];
                const hashData: Record<string, string> = {};
                const cleanupArgs: string[] = [];

                // Create large batch
                for (let i = 0; i < batchSize; i++) {
                    const element = `user${String(i)}:${String(i)}`;
                    const score = 1000 + i;
                    elements.push({ element, score });
                    hashData[element] = `data${String(i)}`;
                    cleanupArgs.push(element, String(score));
                }

                await client.zadd(INDEX_KEY, elements);
                await client.hset(DATA_KEY, hashData);

                // Cleanup all
                const result = await client.invokeScript(cleanupVotesScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: cleanupArgs,
                });

                expect(result).toBe(batchSize);

                // Verify all deleted
                expect(await client.zcard(INDEX_KEY)).toBe(0);
                expect(await client.hlen(DATA_KEY)).toBe(0);
            });

            it("should handle empty batch gracefully", async () => {
                const result = await client.invokeScript(cleanupVotesScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [],
                });

                expect(result).toBe(0);
            });
        });

        describe("edge cases", () => {
            it("should handle non-existent entries gracefully", async () => {
                const result = await client.invokeScript(cleanupVotesScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: ["nonexistent:key", "1000"],
                });

                expect(result).toBe(0);
            });

            it("should handle entry in sorted set but not in hash", async () => {
                // Orphaned sorted set entry (shouldn't happen, but test robustness)
                await client.zadd(INDEX_KEY, [
                    { element: "orphan:1", score: 1000 },
                ]);

                const result = await client.invokeScript(cleanupVotesScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: ["orphan:1", "1000"],
                });

                // Should still delete from sorted set
                expect(result).toBe(1);
                expect(await client.zscore(INDEX_KEY, "orphan:1")).toBeNull();
            });

            it("should handle floating point score precision", async () => {
                // Lua's tonumber should handle this correctly
                const score = 1704067200123; // Millisecond timestamp

                await client.zadd(INDEX_KEY, [
                    { element: "user1:1", score: score },
                ]);
                await client.hset(DATA_KEY, { "user1:1": "data1" });

                const result = await client.invokeScript(cleanupVotesScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: ["user1:1", String(score)],
                });

                expect(result).toBe(1);
            });
        });
    });

    // ========================================================================
    // Integration Tests: Full Workflow
    // ========================================================================

    describe("Integration: Full ADD → CLEANUP workflow", () => {
        it("should correctly add and cleanup in normal flow", async () => {
            const member = getMemberKey("user1", 1);
            const score = "1000";
            const data = JSON.stringify(
                createVoteData("user1", 1, "agree", 1000),
            );

            // Add vote using script
            await client.invokeScript(addVoteScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: [member, score, data],
            });

            // Cleanup using script
            const result = await client.invokeScript(cleanupVotesScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: [member, score],
            });

            expect(result).toBe(1);
            expect(await client.zscore(INDEX_KEY, member)).toBeNull();
            expect(await client.hget(DATA_KEY, member)).toBeNull();
        });

        it("should protect newer vote when cleanup races with new vote", async () => {
            const member = getMemberKey("user1", 1);
            const voteA = JSON.stringify(
                createVoteData("user1", 1, "agree", 1000),
            );
            const voteB = JSON.stringify(
                createVoteData("user1", 1, "disagree", 2000),
            );

            // 1. Add vote A
            await client.invokeScript(addVoteScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: [member, "1000", voteA],
            });

            // 2. Read vote A's score (simulating flush read)
            const readScore = await client.zscore(INDEX_KEY, member);

            // 3. Vote B arrives during DB processing (newer timestamp)
            await client.invokeScript(addVoteScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: [member, "2000", voteB],
            });

            // 4. Try to cleanup using vote A's score (should fail)
            const result = await client.invokeScript(cleanupVotesScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: [member, String(readScore)],
            });

            // Cleanup must fail - score mismatch
            expect(result).toBe(0);

            // Vote B must be preserved for next flush!
            expect(await client.zscore(INDEX_KEY, member)).toBe(2000);
            expect(await client.hget(DATA_KEY, member)).toBe(voteB);
        });

        it("should handle rapid vote changes (vote → cancel → vote)", async () => {
            const member = getMemberKey("user1", 1);

            // Vote at T=1000
            await client.invokeScript(addVoteScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: [
                    member,
                    "1000",
                    JSON.stringify(createVoteData("user1", 1, "agree", 1000)),
                ],
            });

            // Cancel at T=2000
            await client.invokeScript(addVoteScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: [
                    member,
                    "2000",
                    JSON.stringify(createVoteData("user1", 1, "cancel", 2000)),
                ],
            });

            // Vote again at T=3000
            await client.invokeScript(addVoteScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: [
                    member,
                    "3000",
                    JSON.stringify(
                        createVoteData("user1", 1, "disagree", 3000),
                    ),
                ],
            });

            // Final state should be the last vote
            const finalData = await client.hget(DATA_KEY, member);
            const parsed = JSON.parse(finalData as string) as VoteData;
            expect(parsed.vote).toBe("disagree");
            expect(parsed.timestamp).toBe(3000);
        });

        it("should maintain consistency under concurrent-like operations", async () => {
            // Simulate what happens when flush is processing while new votes arrive

            const members = ["user1:1", "user2:2", "user3:3"];
            const initialScores = [1000, 1001, 1002];

            // Add initial votes
            for (let i = 0; i < members.length; i++) {
                await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [members[i], String(initialScores[i]), `data_v1_${String(i)}`],
                });
            }

            // "Read" all scores for flush
            const readScores: number[] = [];
            for (const m of members) {
                const score = await client.zscore(INDEX_KEY, m);
                readScores.push(score as number);
            }

            // user2 updates their vote during flush processing
            await client.invokeScript(addVoteScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: ["user2:2", "5000", "data_v2_user2"],
            });

            // Cleanup all with original scores
            const cleanupArgs: string[] = [];
            for (let i = 0; i < members.length; i++) {
                cleanupArgs.push(members[i], String(readScores[i]));
            }

            const result = await client.invokeScript(cleanupVotesScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: cleanupArgs,
            });

            // Only user1 and user3 should be deleted (user2's score changed)
            expect(result).toBe(2);

            // Verify user2's new vote is preserved
            expect(await client.zscore(INDEX_KEY, "user2:2")).toBe(5000);
            expect(await client.hget(DATA_KEY, "user2:2")).toBe("data_v2_user2");

            // Verify others are deleted
            expect(await client.zscore(INDEX_KEY, "user1:1")).toBeNull();
            expect(await client.zscore(INDEX_KEY, "user3:3")).toBeNull();
        });
    });

    // ========================================================================
    // ZRANGE Tests (used in flush to get votes in order)
    // ========================================================================

    describe("ZRANGE for batch retrieval", () => {
        it("should retrieve votes in timestamp order", async () => {
            // Add votes out of order
            const votes = [
                { member: "user3:3", score: 3000 },
                { member: "user1:1", score: 1000 },
                { member: "user2:2", score: 2000 },
            ];

            for (const v of votes) {
                await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [v.member, String(v.score), `data_${v.member}`],
                });
            }

            // Get in order (oldest first)
            const ordered = await client.zrange(INDEX_KEY, {
                start: 0,
                end: -1,
            });

            expect(ordered).toEqual(["user1:1", "user2:2", "user3:3"]);
        });

        it("should support batch limiting with ZRANGE", async () => {
            // Add 10 votes
            for (let i = 0; i < 10; i++) {
                await client.invokeScript(addVoteScript, {
                    keys: [INDEX_KEY, DATA_KEY],
                    args: [`user${String(i)}:${String(i)}`, String(1000 + i), `data${String(i)}`],
                });
            }

            // Get only first 3 (oldest)
            const batch = await client.zrange(INDEX_KEY, { start: 0, end: 2 });

            expect(batch).toHaveLength(3);
            expect(batch[0]).toBe("user0:0");
            expect(batch[1]).toBe("user1:1");
            expect(batch[2]).toBe("user2:2");
        });

        it("should retrieve scores with ZRANGE WITHSCORES", async () => {
            await client.invokeScript(addVoteScript, {
                keys: [INDEX_KEY, DATA_KEY],
                args: ["user1:1", "1000", "data1"],
            });

            const withScores = await client.zrangeWithScores(INDEX_KEY, {
                start: 0,
                end: -1,
            });

            expect(withScores).toHaveLength(1);
            expect(withScores[0].element).toBe("user1:1");
            expect(withScores[0].score).toBe(1000);
        });
    });
});
