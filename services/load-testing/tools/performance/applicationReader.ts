import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { z } from "zod";
import {
    rankingDiagnosticsReply,
    rankingDiagnosticsRequest,
    type RankingDiagnosticsRequest,
} from "../../src/shared-backend/rankingDiagnosticsProtocol.ts";
import { command, root } from "./io.ts";

type Query = RankingDiagnosticsRequest extends infer Request
    ? Request extends RankingDiagnosticsRequest
        ? Omit<Request, "id">
        : never
    : never;
const identitySchema = z.object({
    primary: z.string(),
    replica: z.string(),
    pid: z.number().int().positive(),
    primaryPort: z.number().int().positive(),
    replicaPort: z.number().int().positive(),
    primaryStatsAccess: z.boolean(),
    replicaStatsAccess: z.boolean(),
});

export async function startApplicationReader({
    primaryContainer,
    replicaContainer,
    database,
}: {
    primaryContainer: string;
    replicaContainer: string;
    database: string;
}) {
    const child = spawn(
        "pnpm",
        [
            "--dir",
            "services/api",
            "exec",
            "tsx",
            "scripts/ranking-diagnostics-probe.ts",
        ],
        { cwd: root, stdio: ["pipe", "pipe", "pipe"] },
    );
    const pending = new Map<
        number,
        {
            resolve: (value: unknown) => void;
            reject: (error: Error) => void;
            timer: ReturnType<typeof setTimeout>;
        }
    >();
    let closed = false;
    let nextId = 1;
    function fail(error: Error): void {
        closed = true;
        for (const request of pending.values()) {
            clearTimeout(request.timer);
            request.reject(error);
        }
        pending.clear();
    }
    function response(id: number): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                pending.delete(id);
                reject(new Error("Backend diagnostics timed out"));
            }, 15000);
            pending.set(id, { resolve, reject, timer });
        });
    }
    const ready = response(0);
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on("line", (line: string) => {
        try {
            const reply = rankingDiagnosticsReply.parse(JSON.parse(line));
            const request = pending.get(reply.id);
            if (!request) {
                if (!reply.ok)
                    fail(
                        new Error(`Backend diagnostics failed: ${reply.error}`),
                    );
                return;
            }
            clearTimeout(request.timer);
            pending.delete(reply.id);
            if (reply.ok) request.resolve(reply.data);
            else
                request.reject(
                    new Error(`Backend diagnostics failed: ${reply.error}`),
                );
        } catch {
            fail(new Error("Invalid backend diagnostics response"));
        }
    });
    // Driver/configuration failures are represented by the bounded protocol;
    // never copy a subprocess's raw stderr (which can contain connection data).
    child.stderr.resume();
    child.once("error", () => {
        fail(new Error("Unable to start backend diagnostics"));
    });
    const exited = new Promise<void>((resolve) =>
        child.once("close", () => {
            fail(new Error("Backend diagnostics process exited"));
            resolve();
        }),
    );
    child.stdin.on("error", () => {
        fail(new Error("Backend diagnostics input closed"));
    });
    async function close(): Promise<void> {
        child.stdin.end();
        const timeout = setTimeout(() => child.kill("SIGTERM"), 5000);
        try {
            await exited;
        } finally {
            clearTimeout(timeout);
            lines.close();
        }
    }
    try {
        const identity = identitySchema.parse(await ready);
        if (!identity.primaryStatsAccess || !identity.replicaStatsAccess)
            throw new Error(
                "Configure PERF_CONNECTION_STRING and PERF_CONNECTION_STRING_READ with pg_read_all_stats access for complete diagnostics",
            );
        if (identity.primary !== database || identity.replica !== database)
            throw new Error(
                "API diagnostics and observer database names differ",
            );
        for (const [container, port] of [
            [primaryContainer, identity.primaryPort],
            [replicaContainer, identity.replicaPort],
        ] satisfies [string, number][]) {
            const published = await command({
                program: "docker",
                args: ["port", container, "5432/tcp"],
            });
            if (
                !published
                    .split("\n")
                    .some(
                        (address) => Number(address.split(":").at(-1)) === port,
                    )
            )
                throw new Error(
                    "API diagnostics connections do not match the observed Docker database ports",
                );
        }
        return {
            pid: identity.pid,
            async query<T>({
                request,
                schema,
            }: {
                request: Query;
                schema: z.ZodType<T>;
            }): Promise<T> {
                if (closed)
                    throw new Error("Backend diagnostics process is closed");
                const id = nextId++;
                const message = rankingDiagnosticsRequest.parse({
                    ...request,
                    id,
                });
                const received = response(id);
                child.stdin.write(JSON.stringify(message) + "\n");
                return schema.parse(await received);
            },
            close,
        };
    } catch (error) {
        await close();
        throw error;
    }
}
export type ApplicationReader = Awaited<
    ReturnType<typeof startApplicationReader>
>;
