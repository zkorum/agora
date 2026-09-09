import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const serviceDirectory = import.meta.dirname;
const outputDirectory = resolve(serviceDirectory, "dist");

async function listFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const path = resolve(directory, entry.name);
            return entry.isDirectory() ? await listFiles(path) : [path];
        }),
    );
    return files.flat();
}

const files = await listFiles(outputDirectory);
const emailEntry = resolve(outputDirectory, "generated/email/render.js");
if (!files.includes(emailEntry)) {
    throw new Error("Production build is missing the compiled email renderer");
}
const emailSource = await readFile(emailEntry, "utf8");
if (/from\s+["'][^"']+\.vue["']/u.test(emailSource)) {
    throw new Error(
        "Production email renderer contains an unresolved Vue component import",
    );
}
const forbiddenOutput = files.find((file) =>
    relative(outputDirectory, file).split(/[\\/]/u).includes("devExercise"),
);
if (forbiddenOutput !== undefined) {
    throw new Error(
        `Production build contains development exercise output: ${relative(outputDirectory, forbiddenOutput)}`,
    );
}

for (const sourceMap of files.filter((file) => file.endsWith(".map"))) {
    const contents = await readFile(sourceMap, "utf8");
    if (contents.includes("devExercise")) {
        throw new Error(
            `Production source map references development exercise source: ${relative(outputDirectory, sourceMap)}`,
        );
    }
}
