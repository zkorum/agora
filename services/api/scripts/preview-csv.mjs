#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parseString } from "fast-csv";

const DEFAULT_MAX_WIDTH = 40;

function parseArgs(argv) {
    const args = argv.slice(2);
    let filePath;
    let maxWidth = DEFAULT_MAX_WIDTH;

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === "--max-width") {
            const nextArg = args[index + 1];
            if (nextArg === undefined) {
                throw new Error("Missing value for --max-width");
            }

            const parsedWidth = Number.parseInt(nextArg, 10);
            if (!Number.isInteger(parsedWidth) || parsedWidth <= 0) {
                throw new Error("--max-width must be a positive integer");
            }

            maxWidth = parsedWidth;
            index += 1;
            continue;
        }

        if (filePath !== undefined) {
            throw new Error("Pass exactly one CSV file path");
        }

        filePath = arg;
    }

    if (filePath === undefined) {
        throw new Error(
            "Usage: pnpm preview:csv <path-to-file.csv> [--max-width 40]",
        );
    }

    return {
        filePath: resolve(filePath),
        maxWidth,
    };
}

function truncateValue({ value, maxWidth }) {
    if (value.length <= maxWidth) {
        return value;
    }

    if (maxWidth <= 3) {
        return value.slice(0, maxWidth);
    }

    return `${value.slice(0, maxWidth - 3)}...`;
}

async function parseCsv(csvText) {
    return await new Promise((resolvePromise, rejectPromise) => {
        const rows = [];

        parseString(csvText, { headers: true, ignoreEmpty: false, trim: false })
            .on("error", rejectPromise)
            .on("data", (row) => {
                rows.push(row);
            })
            .on("end", (rowCount) => {
                resolvePromise({ rows, rowCount });
            });
    });
}

function renderTable({ fileName, headers, rows, maxWidth }) {
    const renderedRows = rows.map((row) =>
        headers.map((header) =>
            truncateValue({ value: String(row[header] ?? ""), maxWidth }),
        ),
    );
    const renderedHeaders = headers.map((header) =>
        truncateValue({ value: header, maxWidth }),
    );

    const widths = headers.map((_, index) => {
        return Math.max(
            renderedHeaders[index]?.length ?? 0,
            ...renderedRows.map((row) => row[index]?.length ?? 0),
        );
    });

    const formatLine = (columns) => {
        return columns
            .map((column, index) => column.padEnd(widths[index]))
            .join("  ")
            .trimEnd();
    };

    console.log(fileName);
    console.log(formatLine(renderedHeaders));
    for (const row of renderedRows) {
        console.log(formatLine(row));
    }
}

async function main() {
    const { filePath, maxWidth } = parseArgs(process.argv);
    const csvText = await readFile(filePath, "utf8");
    const { rows } = await parseCsv(csvText);

    const headerLine = csvText.split(/\r?\n/, 1)[0] ?? "";
    const headers = headerLine.length === 0 ? [] : headerLine.split(",");

    if (headers.length === 0) {
        console.log(`${basename(filePath)} is empty`);
        return;
    }

    renderTable({
        fileName: basename(filePath),
        headers,
        rows,
        maxWidth,
    });
}

await main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
