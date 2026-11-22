import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { parseNumericExport } from "./sync-python-shared-lib.js";

const { values } = parseArgs({
    options: { source: { type: "string" }, output: { type: "string" } },
});
if (values.source === undefined || values.output === undefined)
    throw new Error("Expected --source and --output");
const source = await readFile(values.source, "utf8");
const constants = [
    "QV_CREDIT_BUDGET",
    "QV_RULE_VERSION",
    "QV_ALGORITHM_VERSION",
];
await writeFile(
    values.output,
    `# WARNING: GENERATED FROM services/shared/src/utils/qv.ts. DO NOT EDIT.\n${constants.map((exportName) => `${exportName}: int = ${String(parseNumericExport({ source, exportName }))}`).join("\n")}\n`,
);
