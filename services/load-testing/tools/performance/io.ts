import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream } from "node:fs";
import { readdir, writeFile, rename, open } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { eventSchema, parseJson, type PerformanceEvent } from "./protocol.ts";

const exec = promisify(execFile);
export const root = resolve(import.meta.dirname, "../../../..");
export async function command({
    program,
    args,
    timeoutMs = 15000,
    cwd = root,
}: {
    program: "docker" | "git" | "ps" | "node" | "k6";
    args: readonly string[];
    timeoutMs?: number;
    cwd?: string;
}): Promise<string> {
    try {
        return (
            await exec(program === "node" ? process.execPath : program, args, {
                cwd,
                timeout: timeoutMs,
                maxBuffer: 8_000_000,
                encoding: "utf8",
            })
        ).stdout.trim();
    } catch (error) {
        const details = z
            .object({
                code: z
                    .union([z.number(), z.string().regex(/^[A-Z0-9_]{1,40}$/)])
                    .optional(),
                killed: z.boolean().optional(),
            })
            .safeParse(error);
        const operation = args.at(0);
        const name =
            operation !== undefined && /^[A-Za-z-]{1,40}$/.test(operation)
                ? `${program} ${operation}`
                : program;
        const reason =
            details.success && details.data.killed
                ? `timed out after ${String(timeoutMs)}ms`
                : `failed (${details.success ? String(details.data.code ?? "unknown exit") : "unknown exit"})`;
        throw new Error(
            `${name} ${reason}; verify local monitoring dependencies and permissions`,
            { cause: error },
        );
    }
}
export function createDatabaseReader({
    user,
    database,
}: {
    user: string;
    database: string;
}) {
    return async function sql<T>({
        container,
        query,
        schema,
    }: {
        container: string;
        query: string;
        schema: z.ZodType<T>;
    }): Promise<T> {
        const text = await command({
            program: "docker",
            args: [
                "exec",
                "-e",
                "PGOPTIONS=-c statement_timeout=10000 -c application_name=ranking_performance_monitor",
                container,
                "psql",
                "-X",
                "-U",
                user,
                "-d",
                database,
                "-At",
                "-v",
                "ON_ERROR_STOP=1",
                "-c",
                `/* ranking-performance-monitor */ ${query}`,
            ],
        });
        return parseJson({ text, schema, label: "database response" });
    };
}
export async function writeJson({
    path,
    data,
}: {
    path: string;
    data: unknown;
}): Promise<void> {
    const temporary = `${path}.tmp`;
    await writeFile(temporary, JSON.stringify(data, null, 2) + "\n");
    await rename(temporary, path);
}
export function emit({
    action,
    metadata,
    outcome = "info",
}: {
    action: string;
    metadata: unknown;
    outcome?: string;
}): void {
    console.log(
        `AGORA_LOAD_EVENT ${JSON.stringify({ schemaVersion: 1, timestamp: new Date().toISOString(), scenario: "solidago-ranking", phase: "monitor", action, outcome, metadata })}`,
    );
}

export interface EventReadIssue {
    source: string;
    kind:
        | "invalid_event"
        | "oversized_event"
        | "source_changed"
        | "event_limit";
}
function recordIssue({
    issues,
    issue,
}: {
    issues: EventReadIssue[];
    issue: EventReadIssue;
}): void {
    if (
        !issues.some(
            (existing) =>
                existing.source === issue.source &&
                existing.kind === issue.kind,
        )
    )
        issues.push(issue);
}

async function* boundedLines({
    path,
    issues,
}: {
    path: string;
    issues: EventReadIssue[];
}): AsyncGenerator<string> {
    const stream = createReadStream(path, { encoding: "utf8" });
    let pending = "";
    let skipping = false;
    try {
        for await (const chunk of stream) {
            const text = z.string().parse(chunk);
            const parts = text.split("\n");
            for (const [index, part] of parts.entries()) {
                const complete = index < parts.length - 1;
                if (!skipping) {
                    pending += part;
                    if (pending.length > 1_000_000) {
                        recordIssue({
                            issues,
                            issue: {
                                source: basename(path),
                                kind: "oversized_event",
                            },
                        });
                        pending = "";
                        skipping = true;
                    }
                }
                if (complete) {
                    if (!skipping && pending.trim()) yield pending;
                    pending = "";
                    skipping = false;
                }
            }
        }
        if (!skipping && pending.trim()) yield pending;
    } finally {
        stream.destroy();
    }
}

export async function* iterateEvents({
    path,
    since,
    until,
    issues,
}: {
    path: string;
    since: number;
    until: number;
    issues: EventReadIssue[];
}): AsyncGenerator<PerformanceEvent> {
    const stem = basename(path, ".jsonl");
    const files = (await readdir(dirname(path)))
        .flatMap((name) => {
            if (name === `${stem}.jsonl`) return [{ name, rotation: 0 }];
            if (!name.startsWith(`${stem}.`)) return [];
            const match = /^(\d+)\.jsonl$/.exec(name.slice(stem.length + 1));
            return match ? [{ name, rotation: Number(match[1]) }] : [];
        })
        .sort((a, b) => b.rotation - a.rotation);
    for (const file of files) {
        const source = resolve(dirname(path), file.name);
        try {
            for await (const line of boundedLines({ path: source, issues })) {
                let raw: unknown;
                try {
                    raw = JSON.parse(line);
                } catch {
                    recordIssue({
                        issues,
                        issue: { source: file.name, kind: "invalid_event" },
                    });
                    continue;
                }
                const identity = z
                    .object({
                        scenario: z.string().optional(),
                        timestamp: z.string().optional(),
                    })
                    .safeParse(raw);
                if (
                    identity.success &&
                    identity.data.scenario !== "solidago-ranking"
                )
                    continue;
                if (identity.success && identity.data.timestamp) {
                    const time = Date.parse(identity.data.timestamp);
                    if (time < since || time > until) continue;
                }
                const parsed = eventSchema.safeParse(raw);
                if (!parsed.success) {
                    recordIssue({
                        issues,
                        issue: { source: file.name, kind: "invalid_event" },
                    });
                    continue;
                }
                yield parsed.data;
            }
        } catch {
            recordIssue({
                issues,
                issue: { source: file.name, kind: "source_changed" },
            });
        }
    }
}

export async function latestConfiguration(
    path: string,
): Promise<PerformanceEvent | undefined> {
    let latest: PerformanceEvent | undefined;
    const issues: EventReadIssue[] = [];
    for await (const event of iterateEvents({
        path,
        since: 0,
        until: Date.now(),
        issues,
    })) {
        if (
            event.action === "logging_configured" &&
            (latest === undefined ||
                Date.parse(event.timestamp) >= Date.parse(latest.timestamp))
        )
            latest = event;
    }
    return latest;
}
export async function readEventWindow({
    paths,
    since,
    until,
    maximum,
}: {
    paths: readonly string[];
    since: number;
    until: number;
    maximum: number;
}) {
    const events: PerformanceEvent[] = [];
    const issues: EventReadIssue[] = [];
    for (const path of paths) {
        try {
            for await (const event of iterateEvents({
                path,
                since,
                until,
                issues,
            })) {
                if (events.length >= maximum) {
                    recordIssue({
                        issues,
                        issue: { source: basename(path), kind: "event_limit" },
                    });
                    break;
                }
                events.push(event);
            }
        } catch {
            recordIssue({
                issues,
                issue: { source: basename(path), kind: "source_changed" },
            });
        }
    }
    events.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    return { events, issues };
}

// A marker in the runner-owned event stream is a flush barrier for preceding
// workload/observer events. Avoid assuming an arbitrary sleep flushed stdout.
export async function waitForCapture({
    path,
    markerId,
}: {
    path: string;
    markerId: string;
}): Promise<void> {
    emit({ action: "capture_barrier", metadata: { markerId } });
    const deadline = performance.now() + 5000;
    while (performance.now() < deadline) {
        try {
            const file = await open(path, "r");
            let text: string;
            try {
                const size = (await file.stat()).size;
                const buffer = Buffer.alloc(Math.min(65536, size));
                const read = await file.read(
                    buffer,
                    0,
                    buffer.length,
                    Math.max(0, size - buffer.length),
                );
                text = buffer.toString("utf8", 0, read.bytesRead);
            } finally {
                await file.close();
            }
            for (const line of text.split("\n")) {
                try {
                    const event = eventSchema.safeParse(JSON.parse(line));
                    if (
                        event.success &&
                        event.data.action === "capture_barrier" &&
                        event.data.metadata.markerId === markerId
                    )
                        return;
                } catch {
                    /* The first/last tail fragments can be partial lines. */
                }
            }
        } catch {
            /* A rotating file can temporarily be absent. */
        }
        await delay(25);
    }
    throw new Error("Timed out waiting for durable event capture");
}
