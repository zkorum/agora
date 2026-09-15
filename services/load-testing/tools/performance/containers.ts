import { z } from "zod";
import { command } from "./io.ts";
import { parseJson } from "./protocol.ts";

export const containerInfoSchema = z.union([
    z
        .object({
            NCPU: z.number().positive(),
            MemTotal: z.number().positive(),
        })
        .transform((value) => ({
            engine: "docker" as const,
            cpus: value.NCPU,
            memoryBytes: value.MemTotal,
        })),
    z
        .object({
            host: z.object({
                cpus: z.number().positive(),
                memTotal: z.number().positive(),
            }),
        })
        .transform((value) => ({
            engine: "podman" as const,
            cpus: value.host.cpus,
            memoryBytes: value.host.memTotal,
        })),
]);

const dockerStats = z
    .object({
        Name: z.string(),
        CPUPerc: z.string(),
        MemUsage: z.string().optional(),
        MemPerc: z.string().optional(),
        BlockIO: z.string().optional(),
    })
    .transform((value) => ({ engine: "docker" as const, ...value }));
const podmanStats = z
    .object({
        Name: z.string(),
        ContainerID: z.string(),
        CPU: z.number().nonnegative(),
        CPUNano: z.number().nonnegative(),
        MemUsage: z.number().nonnegative(),
        MemLimit: z.number().positive(),
        MemPerc: z.number().nonnegative(),
        BlockInput: z.number().nonnegative(),
        BlockOutput: z.number().nonnegative(),
    })
    .transform((value) => ({
        engine: "podman" as const,
        Name: value.Name,
        ContainerID: value.ContainerID,
        CPUPerc: `${String(value.CPU)}%`,
        cpuTimeNs: value.CPUNano,
        MemUsage: `${String(value.MemUsage)}B / ${String(value.MemLimit)}B`,
        MemPerc: `${String(value.MemPerc)}%`,
        BlockIO: `${String(value.BlockInput)}B / ${String(value.BlockOutput)}B`,
    }));
export const containerStatsSchema = z.union([dockerStats, podmanStats]);

export function createContainerNormalizer() {
    const previous = new Map<
        string,
        { id: string; cpuTimeNs: number; atMs: number }
    >();
    return ({
        rows,
        atMs,
    }: {
        rows: z.infer<typeof containerStatsSchema>[];
        atMs: number;
    }) =>
        rows.map((row) => {
            if (row.engine === "docker")
                return { ...row, cpuMeasurement: "engine_interval" as const };
            const before = previous.get(row.Name);
            previous.set(row.Name, {
                id: row.ContainerID,
                cpuTimeNs: row.cpuTimeNs,
                atMs,
            });
            // Podman's one-shot CPU field can be a lifetime average. Use its
            // cumulative counter to measure the actual interval between samples.
            const intervalValid =
                before?.id === row.ContainerID &&
                row.cpuTimeNs >= before.cpuTimeNs &&
                atMs > before.atMs;
            const cpuPercent = intervalValid
                ? ((row.cpuTimeNs - before.cpuTimeNs) /
                      ((atMs - before.atMs) * 1e6)) *
                  100
                : null;
            return {
                ...row,
                CPUPerc:
                    cpuPercent === null ? "n/a" : `${cpuPercent.toFixed(2)}%`,
                cpuMeasurement: "sampled_counter" as const,
                cpuPercent,
                intervalMs: intervalValid ? atMs - before.atMs : null,
            };
        });
}

export function createContainerSampler(containers: readonly string[]) {
    const normalize = createContainerNormalizer();
    return async () => {
        const text = await command({
            program: "docker",
            args: [
                "stats",
                "--no-stream",
                "--format",
                "{{json .}}",
                ...containers,
            ],
        });
        const rows = text.split("\n").map((line) =>
            parseJson({
                text: line,
                schema: containerStatsSchema,
                label: "container sample",
            }),
        );
        return normalize({ rows, atMs: performance.now() });
    };
}
