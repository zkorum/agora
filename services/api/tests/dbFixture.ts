import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = dirname(fileURLToPath(import.meta.url));

export function readDbFixtureSql(fileName: string): string {
    return readFileSync(resolve(testsDir, "fixtures/db", fileName), "utf-8");
}
