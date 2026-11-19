import { createHash, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { brotliDecompress, gunzip } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
    compressProjectDocument,
    preferredProjectDocumentEncodings,
} from "./projectDocumentCompression.js";
import { normalizeProjectDocumentUploadFile } from "./projectDocumentFile.js";

describe("project document HTTP representations", () => {
    it("preserves normalized HTML, script hashes and rendering code byte-for-byte", async () => {
        const file = normalizeProjectDocumentUploadFile({
            originalFileName: "report.html",
            reportedContentType: "text/html",
            buffer: Buffer.from(
                `<!doctype html><html><body><script type="application/json" id="data">${JSON.stringify(Array.from({ length: 2000 }, () => ({ text: "Кыргызча · English · Русский", votes: 42 })))}</script><script>document.body.dataset.ready = JSON.parse(document.getElementById('data').textContent).length;</script></body></html>`,
            ),
        });
        const representations = await compressProjectDocument(file);
        expect(representations.map(({ encoding }) => encoding)).toEqual([
            "br",
            "gzip",
        ]);
        for (const representation of representations) {
            const decoded =
                representation.encoding === "br"
                    ? await promisify(brotliDecompress)(representation.buffer)
                    : await promisify(gunzip)(representation.buffer);
            expect(decoded).toEqual(file.buffer);
            expect(representation.buffer.length).toBeLessThan(
                file.buffer.length / 5,
            );
            expect(representation.checksumSha256).toBe(
                createHash("sha256")
                    .update(representation.buffer)
                    .digest("base64"),
            );
        }
    });

    it("keeps PDFs unencoded but always prepares both encodings for text documents", async () => {
        expect(
            await compressProjectDocument({
                buffer: Buffer.alloc(5000, 1),
                contentType: "application/pdf",
            }),
        ).toEqual([]);
        for (const buffer of [Buffer.from("small"), randomBytes(8192)]) {
            const representations = await compressProjectDocument({
                buffer,
                contentType: "text/plain",
            });
            expect(representations.map(({ encoding }) => encoding)).toEqual([
                "br",
                "gzip",
            ]);
            for (const representation of representations) {
                const decoded =
                    representation.encoding === "br"
                        ? await promisify(brotliDecompress)(
                              representation.buffer,
                          )
                        : await promisify(gunzip)(representation.buffer);
                expect(decoded).toEqual(buffer);
            }
        }
    });

    it("handles concurrent publication without changing representation bytes", async () => {
        const buffer = Buffer.from("a report statement\n".repeat(10000));
        const results = await Promise.all(
            Array.from(
                { length: 12 },
                async () =>
                    await compressProjectDocument({
                        buffer,
                        contentType: "text/html",
                    }),
            ),
        );
        for (const result of results) expect(result).toEqual(results[0]);
    });

    it("rejects cancelled work before starting compression", async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(
            compressProjectDocument({
                buffer: Buffer.from("cancelled report"),
                contentType: "text/html",
                abortSignal: controller.signal,
            }),
        ).rejects.toMatchObject({ name: "AbortError" });
    });
});

describe("document content-coding preferences", () => {
    it.each([
        { header: undefined, expected: ["gzip", "identity"] },
        { header: "", expected: ["identity"] },
        { header: "gzip, deflate, br", expected: ["br", "gzip", "identity"] },
        { header: "gzip", expected: ["gzip", "identity"] },
        { header: "BR;Q=1, gzip;q=0.5", expected: ["br", "gzip", "identity"] },
        { header: "br;q=0, gzip", expected: ["gzip", "identity"] },
        { header: "gzip;q=0, br;q=0", expected: ["identity"] },
        { header: "identity;q=0, br", expected: ["br"] },
        { header: "*;q=0", expected: [] },
        { header: "*;q=0, gzip;q=1", expected: ["gzip"] },
        { header: "*;q=0, identity;q=1", expected: ["identity"] },
        { header: "br;q=0, *;q=0.8", expected: ["gzip", "identity"] },
        { header: "identity;q=1, br;q=0.5", expected: ["identity", "br"] },
        {
            header: "gzip;q=0.8, br;q=0.3",
            expected: ["gzip", "br", "identity"],
        },
        { header: "br;q=1.1, gzip;q=-1", expected: ["identity"] },
        { header: "br;q=0.0001, gzip;q=0.001", expected: ["gzip", "identity"] },
        { header: "br;x=1, gzip;q=banana", expected: ["identity"] },
        { header: "zstd", expected: ["identity"] },
        { header: "identity;q=0, zstd", expected: [] },
        {
            header: "gzip;q=0.5, identity;q=0.8",
            expected: ["identity", "gzip"],
        },
        { header: "br;q=0, gzip;q=0, *;q=1", expected: ["identity"] },
    ])("parses $header", ({ header, expected }) => {
        expect(preferredProjectDocumentEncodings(header)).toEqual(expected);
    });
});
