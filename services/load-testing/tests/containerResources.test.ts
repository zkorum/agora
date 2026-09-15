import assert from "node:assert/strict";
import { test } from "node:test";
import {
    containerInfoSchema,
    containerStatsSchema,
    createContainerNormalizer,
} from "../tools/performance/containers.ts";

await test("supports Docker and Podman info without persisting unrelated host data", () => {
    assert.deepEqual(
        containerInfoSchema.parse({
            NCPU: 8,
            MemTotal: 1024,
            ignored: "private",
        }),
        { engine: "docker", cpus: 8, memoryBytes: 1024 },
    );
    assert.deepEqual(
        containerInfoSchema.parse({
            host: { cpus: 8, memTotal: 1024, hostname: "private" },
        }),
        { engine: "podman", cpus: 8, memoryBytes: 1024 },
    );
    assert.throws(() => containerInfoSchema.parse({}));
});
await test("Podman CPU is calculated from interval counters and handles restarts", () => {
    const sample = {
        Name: "postgres",
        ContainerID: "first",
        CPU: 99,
        CPUNano: 1000000000,
        MemUsage: 1024,
        MemLimit: 4096,
        MemPerc: 25,
        BlockInput: 0,
        BlockOutput: 0,
    };
    const normalize = createContainerNormalizer();
    const first = normalize({
        rows: [containerStatsSchema.parse(sample)],
        atMs: 1000,
    }).at(0);
    assert.equal(first?.CPUPerc, "n/a");
    const next = normalize({
        rows: [containerStatsSchema.parse({ ...sample, CPUNano: 1500000000 })],
        atMs: 2000,
    }).at(0);
    assert.equal(next?.CPUPerc, "50.00%");
    const restarted = normalize({
        rows: [
            containerStatsSchema.parse({
                ...sample,
                ContainerID: "second",
                CPUNano: 0,
            }),
        ],
        atMs: 3000,
    }).at(0);
    assert.equal(restarted?.CPUPerc, "n/a");
    const docker = normalize({
        rows: [
            containerStatsSchema.parse({ Name: "docker", CPUPerc: "12.50%" }),
        ],
        atMs: 4000,
    }).at(0);
    assert.equal(docker?.CPUPerc, "12.50%");
});
