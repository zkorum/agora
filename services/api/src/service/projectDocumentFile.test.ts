import { describe, expect, it } from "vitest";
import {
    buildProjectDocumentContentDisposition,
    normalizeProjectDocumentLocalizations,
    normalizeProjectDocumentUploadFile,
} from "./projectDocumentFile.js";

describe("project document files", () => {
    it("parses a valid HTML document from its extension and signature", () => {
        const file = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from(
                "<!doctype html><html><body>Report</body></html>",
            ),
            originalFileName: "report.html",
            reportedContentType: "text/html",
        });

        expect(file.contentType).toBe("text/html");
        expect(file.buffer.toString()).toContain(
            'http-equiv="Content-Security-Policy"',
        );
        expect(file.buffer.toString()).toContain("connect-src 'none'");
    });

    it("places HTML security metadata before any executable markup", () => {
        const file = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from(
                '<!doctype html><!-- <head> --><html><script>window.location = "https://example.com"</script><head></head></html>',
            ),
            originalFileName: "report.html",
            reportedContentType: "text/html",
        });
        const html = file.buffer.toString();

        expect(html.indexOf("Content-Security-Policy")).toBeLessThan(
            html.indexOf("<!-- <head> -->"),
        );
        expect(html.indexOf("Content-Security-Policy")).toBeLessThan(
            html.indexOf("<script>"),
        );
    });

    it("places security metadata after a complete quoted doctype", () => {
        const doctype = '<!doctype html PUBLIC "x>y">';
        const file = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from(`${doctype}<html><script></script></html>`),
            originalFileName: "report.html",
            reportedContentType: "text/html",
        });
        const html = file.buffer.toString();

        expect(html.indexOf("Content-Security-Policy")).toBeGreaterThan(
            html.indexOf(doctype),
        );
        expect(html.indexOf("Content-Security-Policy")).toBeLessThan(
            html.indexOf("<html>"),
        );
    });

    it("places security metadata before HTML element event attributes", () => {
        const file = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from(
                "<html onload=\"window.location = 'https://example.com'\"><body></body></html>",
            ),
            originalFileName: "report.html",
            reportedContentType: "text/html",
        });
        const html = file.buffer.toString();

        expect(html.indexOf("Content-Security-Policy")).toBeLessThan(
            html.indexOf("<html"),
        );
    });

    it("rejects HTML-like prefixes that are not document elements", () => {
        expect(() =>
            normalizeProjectDocumentUploadFile({
                buffer: Buffer.from("<html-report>not a page</html-report>"),
                originalFileName: "report.html",
                reportedContentType: "text/html",
            }),
        ).toThrow("Document contents do not match its file format");
    });

    it("rejects an allowed MIME type with an unknown extension", () => {
        expect(() =>
            normalizeProjectDocumentUploadFile({
                buffer: Buffer.from("%PDF-1.7"),
                originalFileName: "report.exe",
                reportedContentType: "application/pdf",
            }),
        ).toThrow("Unsupported project document extension");
    });

    it("rejects bytes that do not match the declared safe format", () => {
        expect(() =>
            normalizeProjectDocumentUploadFile({
                buffer: Buffer.from("not a pdf"),
                originalFileName: "report.pdf",
                reportedContentType: "application/pdf",
            }),
        ).toThrow("Document contents do not match its file format");
    });

    it("rejects a truncated PDF with only a valid header", () => {
        expect(() =>
            normalizeProjectDocumentUploadFile({
                buffer: Buffer.from("%PDF-1.7"),
                originalFileName: "report.pdf",
                reportedContentType: "application/pdf",
            }),
        ).toThrow("Document contents do not match its file format");
    });

    it("accepts array-shaped JSON documents", () => {
        const file = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from('[{"result":"approved"}]'),
            originalFileName: "report.json",
            reportedContentType: "application/json",
        });

        expect(file.contentType).toBe("application/json");
    });

    it("requires every localized filename to preserve the file extension", () => {
        const participantFile = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from("%PDF-1.7\n%%EOF"),
            originalFileName: "report.pdf",
            reportedContentType: "application/pdf",
        });

        expect(() =>
            normalizeProjectDocumentLocalizations({
                participantFile,
                ownerFile: undefined,
                localizations: [
                    {
                        languageCode: "fr",
                        name: "Rapport",
                        downloadFileName: "rapport.html",
                    },
                ],
            }),
        ).toThrow("must preserve the uploaded file extension");
    });

    it("builds a safe Unicode download disposition", () => {
        expect(
            buildProjectDocumentContentDisposition({
                mode: "download",
                fileName: "отчёт.pdf",
            }),
        ).toBe(
            "attachment; filename=\"_____.pdf\"; filename*=UTF-8''%D0%BE%D1%82%D1%87%D1%91%D1%82.pdf",
        );
    });
});
