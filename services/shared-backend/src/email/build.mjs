import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { copyFile, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { build } from "vite";
import vue from "@vitejs/plugin-vue";

const root = resolve(import.meta.dirname, "../../..");
const generated = resolve(root, "src/generated/email");
const require = createRequire(import.meta.url);
const activeChildren = new Set();
const watchers = [];
let stopping = false;
let scheduled;
let building = false;
let dirty = false;
let pendingBuild;

function terminateChildGroup(child) {
    if (child.pid === undefined) return;
    try {
        process.kill(-child.pid, "SIGTERM");
    } catch (error) {
        if (!(
            error instanceof Error &&
            "code" in error &&
            error.code === "ESRCH"
        ))
            throw error;
    }
}

async function runChild(args) {
    if (stopping) return 1;
    // Own a process group so shutdown also reaches tsx's service subprocess.
    const child = spawn(process.execPath, args, {
        cwd: root,
        stdio: "inherit",
        detached: true,
    });
    activeChildren.add(child);
    try {
        return await new Promise((resolve, reject) => {
            child.once("error", reject);
            child.once("close", (code) => resolve(code ?? 1));
        });
    } finally {
        // A crashed supervisor may leave its service alive after the supervisor exits.
        terminateChildGroup(child);
        activeChildren.delete(child);
    }
}

function stop() {
    if (stopping) return;
    stopping = true;
    clearTimeout(scheduled);
    for (const watcher of watchers) watcher.close();
    for (const child of activeChildren) {
        terminateChildGroup(child);
    }
}

process.once("SIGINT", () => {
    process.exitCode = 130;
    stop();
});
process.once("SIGTERM", () => {
    process.exitCode = 143;
    stop();
});

async function compileEmail() {
    await mkdir(resolve(root, ".email-build"), { recursive: true });
    // Each invocation owns its scratch output; dev rebuilds and tests may run concurrently.
    const scratch = await mkdtemp(resolve(root, ".email-build/build-"));
    try {
        const code = await runChild([
            require.resolve("vue-tsc/bin/vue-tsc.js"),
            "-p",
            "src/shared-backend/email/tsconfig.json",
            "--outDir",
            resolve(scratch, "declarations"),
        ]);
        if (stopping) return;
        if (code !== 0) throw new Error("Email template typecheck failed");
        await build({
            configFile: false,
            envDir: false,
            root,
            plugins: [
                vue({ template: { compilerOptions: { comments: false } } }),
            ],
            resolve: { alias: { "@": resolve(root, "src") } },
            build: {
                ssr: "src/shared-backend/email/render.ts",
                target: "node22",
                outDir: resolve(scratch, "runtime"),
                emptyOutDir: true,
                sourcemap: true,
                minify: false,
                rollupOptions: {
                    external:
                        /^(?:vue(?:\/.*)?|linkedom|sanitize-html|html-to-text|zod)$/u,
                    output: {
                        entryFileNames: "render.js",
                        codeSplitting: false,
                        sourcemapPathTransform: (source, sourceMapPath) =>
                            resolve(dirname(sourceMapPath), source),
                        banner: "// Generated from shared email Vue sources. Do not edit.",
                    },
                },
            },
        });
        if (stopping) return;
        await mkdir(generated, { recursive: true });
        await copyFile(
            resolve(scratch, "declarations/shared-backend/email/render.d.ts"),
            resolve(generated, "render.d.ts"),
        );
        await copyFile(
            resolve(scratch, "runtime/render.js.map"),
            resolve(generated, "render.js.map"),
        );
        // Publish only a complete, successfully checked build to the running service.
        if (stopping) return;
        await rename(
            resolve(scratch, "runtime/render.js"),
            resolve(generated, "render.js"),
        );
    } finally {
        await rm(scratch, { recursive: true, force: true });
    }
}

async function rebuild() {
    building = true;
    dirty = false;
    try {
        await compileEmail();
    } catch (error) {
        if (!stopping) console.error(error);
    } finally {
        building = false;
        if (dirty && !stopping) schedule();
    }
}

function schedule() {
    if (stopping) return;
    dirty = true;
    clearTimeout(scheduled);
    scheduled = setTimeout(() => {
        if (!building && !stopping) pendingBuild = rebuild();
    }, 250);
}

try {
    if (process.argv.includes("--copy-dist")) {
        const destination = resolve(root, "dist/generated/email");
        await mkdir(destination, { recursive: true });
        await copyFile(
            resolve(generated, "render.js"),
            resolve(destination, "render.js"),
        );
        await copyFile(
            resolve(generated, "render.js.map"),
            resolve(destination, "render.js.map"),
        );
    } else {
        const dev = process.argv.includes("--dev");
        if (dev) {
            // Include transitive shared helpers/constants, not just branding components.
            // Restart the command after changing build tooling or configuration.
            for (const path of ["src/shared-backend/email", "src/shared"]) {
                const watcher = watch(
                    resolve(root, path),
                    { recursive: true },
                    schedule,
                );
                watcher.on("error", (error) => {
                    console.error(error);
                    process.exitCode = 1;
                    stop();
                });
                watchers.push(watcher);
            }
        }
        building = true;
        await compileEmail();
        building = false;
        if (dev && !stopping) {
            if (dirty) schedule();
            const code = await runChild([
                require.resolve("tsx/cli"),
                "watch",
                "--ignore",
                "src/shared-backend/email/**",
                "--ignore",
                "src/shared/**",
                "--trace-uncaught",
                "src/index.ts",
            ]);
            if (!stopping) process.exitCode = code;
        }
    }
} catch (error) {
    if (!stopping) {
        console.error(error);
        process.exitCode = 1;
    }
} finally {
    stop();
    await pendingBuild;
}
