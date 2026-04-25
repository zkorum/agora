import { format as formatCsv } from "fast-csv";

export async function buildCsvBuffer({
    headers,
    rows,
}: {
    headers?: readonly string[];
    rows: Record<string, string | number | null>[];
}): Promise<Buffer> {
    const csvStream = formatCsv({
        headers: headers === undefined ? true : [...headers],
        alwaysWriteHeaders: headers !== undefined,
    });
    const chunks: Buffer[] = [];

    csvStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
    });

    for (const row of rows) {
        csvStream.write(row);
    }
    csvStream.end();

    await new Promise<void>((resolve, reject) => {
        csvStream.on("end", resolve);
        csvStream.on("error", reject);
    });

    return Buffer.concat(chunks);
}
