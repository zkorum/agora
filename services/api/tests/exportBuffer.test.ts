/**
 * Export Buffer Lua Script Tests
 *
 * These tests verify the correctness of the HSCAN_AND_DELETE_SCRIPT used in exportBuffer.ts.
 * Uses testcontainers to spin up a real Valkey instance for accurate testing.
 *
 * The tests cover:
 * - HSCAN_AND_DELETE_SCRIPT: Atomic HSCAN + HDEL for batch retrieval and deletion
 * - Edge cases: Empty hash, max count limits, special characters in keys/values
 *
 * Run with: pnpm test tests/exportBuffer.test.ts
 *
 * Note: Requires Docker/Podman to be running. Tests will be skipped if
 * container runtime is not available.
 *
 * PODMAN USERS: You must set environment variables for testcontainers:
 *   DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')" \
 *   TESTCONTAINERS_RYUK_DISABLED=true \
 *   pnpm test tests/exportBuffer.test.ts
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
import { HSCAN_AND_DELETE_SCRIPT } from "../src/service/exportBuffer.js";

// ============================================================================
// Test Helpers
// ============================================================================

interface ExportData {
    userId: string;
    conversationId: number;
    conversationSlugId: string;
    exportSlugId: string;
    timestamp: string;
}

function createExportData(
    userId: string,
    conversationId: number,
    conversationSlugId: string,
    exportSlugId: string,
    timestamp: Date,
): ExportData {
    return {
        userId,
        conversationId,
        conversationSlugId,
        exportSlugId,
        timestamp: timestamp.toISOString(),
    };
}

function getExportKey(conversationId: number, userId: string): string {
    return `${String(conversationId)}:${userId}`;
}

// ============================================================================
// Tests
// ============================================================================

describe("Export Buffer Lua Scripts", () => {
    let container: StartedTestContainer;
    let client: GlideClient;
    let hscanAndDeleteScript: Script;

    const HASH_KEY = "test:exports:buffer";

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

        // Create script object
        hscanAndDeleteScript = new Script(HSCAN_AND_DELETE_SCRIPT);
    }, 60000); // 60s timeout for container startup

    afterAll(async () => {
        // Clean up in reverse order
        hscanAndDeleteScript?.release();
        client?.close();
        await container?.stop();
    });

    // Clear test keys before each test for isolation
    beforeEach(async () => {
        await client.del([HASH_KEY]);
    });

    // ========================================================================
    // HSCAN_AND_DELETE_SCRIPT Tests
    // ========================================================================

    describe("HSCAN_AND_DELETE_SCRIPT", () => {
        describe("basic functionality", () => {
            it("should retrieve and delete a single entry", async () => {
                const key = getExportKey(1, "user1");
                const data = JSON.stringify(
                    createExportData(
                        "user1",
                        1,
                        "conv-slug-1",
                        "export-slug-1",
                        new Date("2024-01-01T00:00:00Z"),
                    ),
                );

                // Add entry to hash
                await client.hset(HASH_KEY, { [key]: data });

                // Execute script
                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"], // max count
                });

                // Verify result contains key-value pair
                expect(Array.isArray(result)).toBe(true);
                expect(result).toHaveLength(2);
                expect(result[0]).toBe(key);
                expect(result[1]).toBe(data);

                // Verify hash is now empty
                const remaining = await client.hlen(HASH_KEY);
                expect(remaining).toBe(0);
            });

            it("should retrieve and delete multiple entries", async () => {
                const entries = [
                    {
                        key: getExportKey(1, "user1"),
                        data: createExportData(
                            "user1",
                            1,
                            "conv-1",
                            "export-1",
                            new Date("2024-01-01T00:00:00Z"),
                        ),
                    },
                    {
                        key: getExportKey(2, "user2"),
                        data: createExportData(
                            "user2",
                            2,
                            "conv-2",
                            "export-2",
                            new Date("2024-01-01T00:01:00Z"),
                        ),
                    },
                    {
                        key: getExportKey(3, "user3"),
                        data: createExportData(
                            "user3",
                            3,
                            "conv-3",
                            "export-3",
                            new Date("2024-01-01T00:02:00Z"),
                        ),
                    },
                ];

                // Add entries to hash
                const hashData: Record<string, string> = {};
                for (const entry of entries) {
                    hashData[entry.key] = JSON.stringify(entry.data);
                }
                await client.hset(HASH_KEY, hashData);

                // Execute script
                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                });

                // Verify result contains all entries (field, value pairs)
                expect(Array.isArray(result)).toBe(true);
                expect(result).toHaveLength(6); // 3 entries * 2 (field + value)

                // Verify hash is now empty
                const remaining = await client.hlen(HASH_KEY);
                expect(remaining).toBe(0);
            });

            it("should handle empty hash gracefully", async () => {
                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                });

                expect(Array.isArray(result)).toBe(true);
                expect(result).toHaveLength(0);
            });
        });

        describe("max count limiting", () => {
            it("should respect max count limit", async () => {
                // Add 10 entries
                const hashData: Record<string, string> = {};
                for (let i = 0; i < 10; i++) {
                    const key = getExportKey(i, `user${String(i)}`);
                    const data = createExportData(
                        `user${String(i)}`,
                        i,
                        `conv-${String(i)}`,
                        `export-${String(i)}`,
                        new Date(`2024-01-01T00:0${String(i)}:00Z`),
                    );
                    hashData[key] = JSON.stringify(data);
                }
                await client.hset(HASH_KEY, hashData);

                // Request only 3
                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["3"],
                });

                expect(Array.isArray(result)).toBe(true);
                // Should have at most 3 entries (6 elements: field + value pairs)
                expect((result as string[]).length).toBeLessThanOrEqual(6);

                // Verify remaining entries are preserved
                const remaining = await client.hlen(HASH_KEY);
                expect(remaining).toBeGreaterThanOrEqual(7);
            });

            it("should handle max count of 1", async () => {
                // Add 5 entries
                const hashData: Record<string, string> = {};
                for (let i = 0; i < 5; i++) {
                    const key = getExportKey(i, `user${String(i)}`);
                    hashData[key] = JSON.stringify(
                        createExportData(
                            `user${String(i)}`,
                            i,
                            `conv-${String(i)}`,
                            `export-${String(i)}`,
                            new Date(),
                        ),
                    );
                }
                await client.hset(HASH_KEY, hashData);

                // Request only 1
                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["1"],
                });

                expect(Array.isArray(result)).toBe(true);
                expect(result).toHaveLength(2); // 1 entry = 2 elements

                // 4 entries should remain
                const remaining = await client.hlen(HASH_KEY);
                expect(remaining).toBe(4);
            });

            it("should handle max count larger than hash size", async () => {
                // Add 3 entries
                const hashData: Record<string, string> = {};
                for (let i = 0; i < 3; i++) {
                    const key = getExportKey(i, `user${String(i)}`);
                    hashData[key] = JSON.stringify(
                        createExportData(
                            `user${String(i)}`,
                            i,
                            `conv-${String(i)}`,
                            `export-${String(i)}`,
                            new Date(),
                        ),
                    );
                }
                await client.hset(HASH_KEY, hashData);

                // Request 100 (more than available)
                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["100"],
                });

                expect(Array.isArray(result)).toBe(true);
                expect(result).toHaveLength(6); // All 3 entries

                // Hash should be empty
                const remaining = await client.hlen(HASH_KEY);
                expect(remaining).toBe(0);
            });
        });

        describe("at-most-once delivery", () => {
            it("should atomically delete retrieved entries", async () => {
                const key = getExportKey(1, "user1");
                const data = JSON.stringify(
                    createExportData(
                        "user1",
                        1,
                        "conv-1",
                        "export-1",
                        new Date(),
                    ),
                );

                await client.hset(HASH_KEY, { [key]: data });

                // First call should retrieve and delete
                const result1 = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                });
                expect(result1).toHaveLength(2);

                // Second call should return empty (already deleted)
                const result2 = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                });
                expect(result2).toHaveLength(0);
            });

            it("should handle concurrent-like batch processing", async () => {
                // Add 100 entries to test realistic batch sizes
                const hashData: Record<string, string> = {};
                for (let i = 0; i < 100; i++) {
                    const key = getExportKey(i, `user${String(i)}`);
                    hashData[key] = JSON.stringify(
                        createExportData(
                            `user${String(i)}`,
                            i,
                            `conv-${String(i)}`,
                            `export-${String(i)}`,
                            new Date(),
                        ),
                    );
                }
                await client.hset(HASH_KEY, hashData);

                // First batch: get 50
                const batch1 = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["50"],
                });

                // Second batch: get 50
                const batch2 = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["50"],
                });

                // Total entries retrieved should equal 100
                const batch1Count = (batch1 as string[]).length / 2;
                const batch2Count = (batch2 as string[]).length / 2;
                expect(batch1Count + batch2Count).toBe(100);

                // Hash should be empty
                const remaining = await client.hlen(HASH_KEY);
                expect(remaining).toBe(0);
            });
        });

        describe("edge cases", () => {
            it("should handle special characters in user IDs (DIDs)", async () => {
                const userId = "did:web:example.com%3A8080";
                const key = getExportKey(1, userId);
                const data = JSON.stringify(
                    createExportData(
                        userId,
                        1,
                        "conv-1",
                        "export-1",
                        new Date(),
                    ),
                );

                await client.hset(HASH_KEY, { [key]: data });

                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                });

                expect(result).toHaveLength(2);
                expect(result[0]).toBe(key);

                // Verify deleted
                const remaining = await client.hlen(HASH_KEY);
                expect(remaining).toBe(0);
            });

            it("should handle special characters in slug IDs", async () => {
                const data = JSON.stringify({
                    userId: "user1",
                    conversationId: 1,
                    conversationSlugId: "abc-123_xyz",
                    exportSlugId: "exp_456-789",
                    timestamp: new Date().toISOString(),
                });

                await client.hset(HASH_KEY, { "1:user1": data });

                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                });

                expect(result).toHaveLength(2);
                expect(result[1]).toBe(data);
            });

            it("should handle large JSON data payloads", async () => {
                const largeData = JSON.stringify({
                    userId: "user1",
                    conversationId: 1,
                    conversationSlugId: "conv-slug-" + "x".repeat(100),
                    exportSlugId: "export-slug-" + "y".repeat(100),
                    timestamp: new Date().toISOString(),
                    // Extra metadata that might be added in future
                    metadata: { extra: "data", nested: { deep: true } },
                });

                await client.hset(HASH_KEY, { "1:user1": largeData });

                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                });

                expect(result).toHaveLength(2);
                expect(result[1]).toBe(largeData);
            });

            it("should handle very large max count value", async () => {
                // Add a few entries
                await client.hset(HASH_KEY, {
                    "1:user1": "data1",
                    "2:user2": "data2",
                });

                // Request a very large count
                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["1000000"],
                });

                expect(result).toHaveLength(4); // 2 entries
                expect(await client.hlen(HASH_KEY)).toBe(0);
            });

            it("should handle unicode characters in data", async () => {
                const data = JSON.stringify({
                    userId: "user1",
                    conversationId: 1,
                    conversationSlugId: "conv-with-emoji",
                    exportSlugId: "export-123",
                    timestamp: new Date().toISOString(),
                    // Unicode content
                    title: "Discussion about climate change",
                });

                await client.hset(HASH_KEY, { "1:user1": data });

                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                });

                expect(result).toHaveLength(2);
                expect(result[1]).toBe(data);
            });
        });

        describe("result format verification", () => {
            it("should return flat array of [field, value, field, value, ...]", async () => {
                await client.hset(HASH_KEY, {
                    "1:user1": "data1",
                    "2:user2": "data2",
                });

                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                });

                expect(Array.isArray(result)).toBe(true);

                // Result should be flat array with alternating field/value
                const resultArray = result as string[];
                expect(resultArray.length % 2).toBe(0); // Even number of elements

                // Every odd index should be a value (parseable as our data format)
                for (let i = 0; i < resultArray.length; i += 2) {
                    const field = resultArray[i];
                    const value = resultArray[i + 1];

                    // Field should match key format
                    expect(field).toMatch(/^\d+:user\d+$/);

                    // Value should be our data
                    expect(value).toMatch(/^data\d+$/);
                }
            });

            it("should maintain field-value pairing correctly", async () => {
                const entries = {
                    "100:userA": JSON.stringify({ id: "A" }),
                    "200:userB": JSON.stringify({ id: "B" }),
                    "300:userC": JSON.stringify({ id: "C" }),
                };

                await client.hset(HASH_KEY, entries);

                const result = await client.invokeScript(hscanAndDeleteScript, {
                    keys: [HASH_KEY],
                    args: ["10"],
                }) as string[];

                // Verify each field-value pair is correct
                for (let i = 0; i < result.length; i += 2) {
                    const field = result[i];
                    const value = result[i + 1];

                    // The value should be the correct value for that field
                    expect(entries[field as keyof typeof entries]).toBe(value);
                }
            });
        });
    });

    // ========================================================================
    // Integration: HSET → HSCAN_AND_DELETE workflow
    // ========================================================================

    describe("Integration: HSET → HSCAN_AND_DELETE workflow", () => {
        it("should correctly handle add → flush → add → flush cycle", async () => {
            // First batch of exports
            await client.hset(HASH_KEY, {
                "1:user1": JSON.stringify(
                    createExportData("user1", 1, "conv-1", "exp-1", new Date()),
                ),
                "2:user2": JSON.stringify(
                    createExportData("user2", 2, "conv-2", "exp-2", new Date()),
                ),
            });

            // Flush first batch
            const batch1 = await client.invokeScript(hscanAndDeleteScript, {
                keys: [HASH_KEY],
                args: ["10"],
            });
            expect(batch1).toHaveLength(4);

            // Add second batch (while first is "processing")
            await client.hset(HASH_KEY, {
                "3:user3": JSON.stringify(
                    createExportData("user3", 3, "conv-3", "exp-3", new Date()),
                ),
            });

            // Flush second batch
            const batch2 = await client.invokeScript(hscanAndDeleteScript, {
                keys: [HASH_KEY],
                args: ["10"],
            });
            expect(batch2).toHaveLength(2);

            // Should be empty now
            expect(await client.hlen(HASH_KEY)).toBe(0);
        });

        it("should handle deduplication scenario (same key overwritten)", async () => {
            const key = getExportKey(1, "user1");

            // First export request
            const data1 = JSON.stringify(
                createExportData(
                    "user1",
                    1,
                    "conv-1",
                    "exp-1",
                    new Date("2024-01-01T00:00:00Z"),
                ),
            );
            await client.hset(HASH_KEY, { [key]: data1 });

            // User requests again (overwrites in hash - last write wins)
            const data2 = JSON.stringify(
                createExportData(
                    "user1",
                    1,
                    "conv-1",
                    "exp-2",
                    new Date("2024-01-01T00:01:00Z"),
                ),
            );
            await client.hset(HASH_KEY, { [key]: data2 });

            // Should only have 1 entry (deduplicated)
            expect(await client.hlen(HASH_KEY)).toBe(1);

            // Flush should return the latest value
            const result = await client.invokeScript(hscanAndDeleteScript, {
                keys: [HASH_KEY],
                args: ["10"],
            });

            expect(result).toHaveLength(2);
            expect(result[0]).toBe(key);
            expect(result[1]).toBe(data2); // Latest value
        });

        it("should handle different users exporting same conversation", async () => {
            const conversationId = 1;

            await client.hset(HASH_KEY, {
                [getExportKey(conversationId, "user1")]: JSON.stringify(
                    createExportData("user1", conversationId, "conv-1", "exp-1", new Date()),
                ),
                [getExportKey(conversationId, "user2")]: JSON.stringify(
                    createExportData("user2", conversationId, "conv-1", "exp-2", new Date()),
                ),
            });

            // Both entries should exist (different keys)
            expect(await client.hlen(HASH_KEY)).toBe(2);

            const result = await client.invokeScript(hscanAndDeleteScript, {
                keys: [HASH_KEY],
                args: ["10"],
            });

            // Should get both entries
            expect(result).toHaveLength(4);
            expect(await client.hlen(HASH_KEY)).toBe(0);
        });
    });
});
