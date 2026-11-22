// @ts-check
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
    copyFile,
    lstat,
    mkdir,
    readFile,
    readdir,
    realpath,
    rmdir,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reviewedMigrations } from "./reviewed_drizzle_migrations.mjs";

/**
 * @typedef {{ name: string, sql: Buffer, path: string }} Migration
 * @typedef {{ lastDrizzleMigration: string, historyCount: number, historySha256: string, flywayAnchor: string, flywayAnchorSha256: string }} Baseline
 */

// Pin the converted history, not description-based guesses: historical Drizzle
// SQL deliberately differs from deployed Flyway SQL and must never be replayed.
const convertedHistory = {
    lastDrizzleMigration: "20261114165054_equal_golden_guardian",
    historyCount: 115,
    historySha256:
        "29bea2c6b74165cc2d547c1a41d7f79c240f206b5128f5305de4b7c8eea4b370",
    flywayAnchor: "V0115__equal_golden_guardian.sql",
    flywayAnchorSha256:
        "5e7126f2c3ace29cd89a99db4cb214e13b853d44818b3d46fd99e75df9b53aeb",
};

/** @param {Buffer | string} content */
function sha256(content) {
    return createHash("sha256").update(content).digest("hex");
}

/** @param {string} path */
async function readRegularFile(path) {
    if (!(await lstat(path)).isFile()) {
        throw new Error(
            `Migration must be a regular file, not a directory or symlink: ${path}`,
        );
    }
    return await readFile(path);
}

/**
 * @param {{ sourceDirectory: string, flywayDirectory: string, baseline?: Baseline, dryRun?: boolean, reviewed?: readonly { source: string, sourceSha256: string, files: readonly { name: string, sha256: string }[] }[] }} options
 */
export async function copyV1Migrations({
    sourceDirectory,
    flywayDirectory,
    baseline = convertedHistory,
    dryRun = false,
    reviewed = reviewedMigrations,
}) {
    const source = await realpath(sourceDirectory);
    const target = await realpath(flywayDirectory);
    if (source === target)
        throw new Error("Source and Flyway directories must differ.");

    const entries = await readdir(source, { withFileTypes: true });
    if (entries.some((entry) => /^\d{4}_.+\.sql$/.test(entry.name))) {
        throw new Error(
            "Mixed legacy and v1 migrations are not supported; finish the Drizzle history conversion first.",
        );
    }
    /** @type {Migration[]} */
    const migrations = [];
    for (const entry of entries
        .filter((entry) => /^\d{14}_.+/.test(entry.name))
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
        if (!entry.isDirectory()) {
            throw new Error(
                `Drizzle migration must be a real directory: ${entry.name}`,
            );
        }
        const path = join(source, entry.name, "migration.sql");
        migrations.push({
            name: entry.name,
            path,
            sql: await readRegularFile(path),
        });
    }
    const history = migrations.filter(
        (migration) => migration.name <= baseline.lastDrizzleMigration,
    );
    const fingerprint = sha256(
        JSON.stringify(history.map(({ name, sql }) => [name, sha256(sql)])),
    );
    if (
        history.length !== baseline.historyCount ||
        fingerprint !== baseline.historySha256
    ) {
        throw new Error(
            "Converted Drizzle history does not match its pinned Flyway baseline; refusing to replay historical SQL.",
        );
    }
    const anchor = await readRegularFile(join(target, baseline.flywayAnchor));
    if (sha256(anchor) !== baseline.flywayAnchorSha256) {
        throw new Error(
            "Flyway baseline migration changed; refusing to copy migrations.",
        );
    }

    // Serialize version allocation across copier processes. Never remove a lock
    // that this process did not acquire, including a stale lock after a crash.
    const lock = join(target, ".drizzle-copy.lock");
    await mkdir(lock);
    try {
        const files = await readdir(target, { withFileTypes: true });
        let version = 0;
        /** @type {Map<string, string[]>} */
        const copies = new Map();
        for (const file of files) {
            if (!/^V\d{4}(?:\.\d+)*__.+\.sql$/.test(file.name)) continue;
            if (!file.isFile())
                throw new Error(
                    `Flyway migration must be a regular file: ${file.name}`,
                );
            version = Math.max(version, Number(file.name.slice(1, 5)));
            const description = file.name.slice(
                file.name.indexOf("__") + 2,
                -4,
            );
            const matches = copies.get(description) ?? [];
            copies.set(description, [...matches, file.name]);
        }

        /** @type {{ source: string, destination: string }[]} */
        const planned = [];
        for (const migration of migrations.filter(
            (item) => item.name > baseline.lastDrizzleMigration,
        )) {
            const existing = copies.get(migration.name) ?? [];
            if (existing.length > 1)
                throw new Error(`Multiple Flyway copies for ${migration.name}`);
            const deployment = reviewed.find(
                (item) => item.source === migration.name,
            );
            if (deployment !== undefined) {
                if (sha256(migration.sql) !== deployment.sourceSha256) {
                    throw new Error(
                        `Reviewed Drizzle source changed: ${migration.name}`,
                    );
                }
                for (const file of deployment.files) {
                    if (
                        sha256(
                            await readRegularFile(join(target, file.name)),
                        ) !== file.sha256
                    ) {
                        throw new Error(
                            `Reviewed Flyway phase changed: ${file.name}`,
                        );
                    }
                }
                continue;
            }
            const existingName = existing.at(0);
            if (existingName !== undefined) {
                if (
                    !(await readRegularFile(join(target, existingName))).equals(
                        migration.sql,
                    )
                ) {
                    throw new Error(
                        `Existing Flyway copy differs from ${migration.name}; refusing to overwrite or duplicate it.`,
                    );
                }
                continue;
            }
            version++;
            if (version > 9999)
                throw new Error("No four-digit Flyway version available.");
            // Keeping the full Drizzle ID disambiguates reused random names and
            // makes reruns idempotent without modifying the source or snapshots.
            const filename = `V${String(version).padStart(4, "0")}__${migration.name}.sql`;
            planned.push({
                source: migration.path,
                destination: join(target, filename),
            });
        }
        if (!dryRun) {
            for (const migration of planned) {
                await copyFile(
                    migration.source,
                    migration.destination,
                    constants.COPYFILE_EXCL,
                );
            }
        }
        return planned;
    } finally {
        await rmdir(lock);
    }
}

if (
    process.argv[1] !== undefined &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    try {
        const sourceDirectory = process.argv[2];
        const flywayDirectory = process.argv[3];
        if (sourceDirectory === undefined || flywayDirectory === undefined) {
            throw new Error(
                "Usage: copy_drizzle_v1_migrations.mjs <drizzle-directory> <flyway-directory>",
            );
        }
        const dryRun = process.argv.includes("--dry-run");
        const migrations = await copyV1Migrations({
            sourceDirectory,
            flywayDirectory,
            dryRun,
        });
        for (const migration of migrations)
            console.info(
                `${dryRun ? "Would copy" : "Copied"}: ${migration.destination}`,
            );
    } catch (error) {
        console.error(
            error instanceof Error
                ? error.message
                : "Flyway migration copy failed.",
        );
        process.exitCode = 1;
    }
}
