import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { readEventWindow } from "../tools/performance/io.ts";
import { waitForFreshness } from "../tools/performance/collector.ts";
import type { Revision } from "../tools/performance/protocol.ts";

await test("rotated event windows are bounded and malformed records are reported", async (context) => {
    const parent = resolve(tmpdir(), "opencode");
    await mkdir(parent, { recursive: true });
    const directory = await mkdtemp(resolve(parent, "performance-events-"));
    context.after(async () => {
        await rm(directory, { recursive: true, force: true });
    });
    const event = {
        schemaVersion: 1,
        scenario: "solidago-ranking",
        phase: "api",
        action: "request_completed",
        timestamp: "2026-09-14T12:00:00Z",
        metadata: {},
    };
    const path = resolve(directory, "api.events.jsonl");
    await writeFile(
        resolve(directory, "api.events.1.jsonl"),
        `${JSON.stringify(event)}\n`,
    );
    await writeFile(
        path,
        `${JSON.stringify({ ...event, timestamp: "2026-09-14T12:00:01Z" })}\n${"bad\n".repeat(10000)}`,
    );
    const window = await readEventWindow({
        paths: [path],
        since: 0,
        until: Infinity,
        maximum: 10,
    });
    assert.equal(window.events.length, 2);
    assert.equal(window.events.at(0)?.timestamp, event.timestamp);
    assert.equal(window.issues.length, 1);
    assert.equal(window.issues.at(0)?.kind, "invalid_event");
    const limited = await readEventWindow({
        paths: [path],
        since: 0,
        until: Infinity,
        maximum: 1,
    });
    assert.equal(limited.events.length, 1);
    assert.equal(limited.issues.at(0)?.kind, "event_limit");
    await writeFile(path, `${"x".repeat(1100000)}\n${JSON.stringify(event)}\n`);
    const oversized = await readEventWindow({
        paths: [path],
        since: 0,
        until: Infinity,
        maximum: 10,
    });
    assert.equal(oversized.events.length, 2);
    assert.ok(
        oversized.issues.some((issue) => issue.kind === "oversized_event"),
    );
});
await test("freshness timeout and interruption preserve the observer state explicitly", async () => {
    const row: Revision = {
        id: 1,
        slug_id: "a",
        scoring_input_revision: "2",
        processed_scoring_input_revision: "1",
        snapshot_id: 1,
        published_at: "2026-09-14T12:00:00Z",
        vote_count: 1,
        participant_count: 1,
    };
    const controller = new AbortController();
    const input = {
        readPrimary: () => Promise.resolve([row]),
        readReplica: () => Promise.resolve([row]),
        signal: controller.signal,
        expectedCount: 1,
        timeoutSeconds: 0,
    };
    assert.equal((await waitForFreshness(input)).status, "timeout");
    controller.abort();
    assert.equal((await waitForFreshness(input)).status, "interrupted");
});
