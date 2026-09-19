import { parseHTML } from "linkedom";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
    getProjectDocumentDownloadFileName,
    MAX_PROJECT_DOCUMENT_FILE_SIZE,
} from "@/shared/projectDocument.js";
import {
    buildProjectDocumentContentDisposition,
    normalizeProjectDocumentLocalizations,
    normalizeProjectDocumentUploadFile,
} from "./projectDocumentFile.js";

describe("project document files", () => {
    it("authorizes uploaded inline scripts by hash without allowing arbitrary inline code", () => {
        const script = "document.body.dataset.rendered = 'yes';";
        const result = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from(
                `<!doctype html><html><body><script type="application/json">{"value":1}</script><script>${script}</script></body></html>`,
            ),
            originalFileName: "report.html",
            reportedContentType: "text/html",
        });
        const { document } = parseHTML(result.buffer.toString());
        const policy = document
            .querySelector('meta[http-equiv="Content-Security-Policy"]')
            ?.getAttribute("content");
        expect(policy).toContain(
            `script-src 'sha256-${createHash("sha256").update(script).digest("base64")}'`,
        );
        expect(policy).toContain("script-src-attr 'none'");
        expect(policy).not.toContain("script-src 'unsafe-inline'");
        expect(
            document.querySelector('script[type="application/json"]')
                ?.textContent,
        ).toBe('{"value":1}');
    });

    it("removes declarative navigation and referrer overrides but keeps local anchors", () => {
        const source =
            '<!doctype html><html><head><meta http-equiv="refresh" content="0;url=https://example.com"><meta name="referrer" content="unsafe-url"></head><body><a id="remote" href="https://example.com">Remote</a><a id="local" href="#section">Local</a><svg><a href="https://example.com">SVG</a></svg><template><a href="https://example.com">Template</a></template></body></html>';
        const result = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from(source),
            originalFileName: "report.html",
            reportedContentType: "text/html",
        });
        const { document } = parseHTML(result.buffer.toString());
        expect(document.querySelector('meta[http-equiv="refresh"]')).toBeNull();
        expect(document.querySelectorAll('meta[name="referrer"]')).toHaveLength(
            1,
        );
        expect(
            document
                .querySelector('meta[name="referrer"]')
                ?.getAttribute("content"),
        ).toBe("no-referrer");
        expect(
            document.getElementById("remote")?.getAttribute("href"),
        ).toBeNull();
        expect(document.getElementById("local")?.getAttribute("href")).toBe(
            "#section",
        );
        expect(result.buffer.toString()).not.toContain("https://example.com");
    });

    it("accepts a report above 25 MiB and rejects files beyond 50 MiB", () => {
        const file = {
            buffer: Buffer.alloc(40 * 1024 * 1024, "x"),
            originalFileName: "report.txt",
            reportedContentType: "text/plain",
        };
        expect(normalizeProjectDocumentUploadFile(file).buffer.length).toBe(
            file.buffer.length,
        );
        expect(() =>
            normalizeProjectDocumentUploadFile({
                ...file,
                buffer: Buffer.alloc(MAX_PROJECT_DOCUMENT_FILE_SIZE + 1),
            }),
        ).toThrow("Invalid project document size");
    });

    it("gives owner downloads a distinct filename without corrupting Unicode or the extension", () => {
        expect(
            getProjectDocumentDownloadFileName({
                fileName: "rapport.html",
                audience: "participant",
            }),
        ).toBe("rapport.html");
        expect(
            getProjectDocumentDownloadFileName({
                fileName: "rapport.html",
                audience: "owner",
            }),
        ).toBe("rapport-owner.html");
        const name = getProjectDocumentDownloadFileName({
            fileName: `${"😀".repeat(124)}.html`,
            audience: "owner",
        });
        expect(name.length).toBeLessThanOrEqual(255);
        expect(name.endsWith("-owner.html")).toBe(true);
        expect(() => encodeURIComponent(name)).not.toThrow();
    });
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
        expect(file.buffer.toString()).toContain("script-src 'none'");
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
            html.indexOf("<script>"),
        );
        expect(
            parseHTML(html)
                .document.head.querySelector("meta[http-equiv]")
                ?.getAttribute("content"),
        ).toContain("script-src 'sha256-");
    });

    it.each([
        '<!doctype html PUBLIC "-//W3C//DTD HTML 4.01//EN" "https://www.w3.org/TR/html4/strict.dtd">',
        '<!doctype html SYSTEM "about:legacy-compat">',
    ])("places security metadata after a valid doctype: %s", (doctype) => {
        const file = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from(`${doctype}<html><script></script></html>`),
            originalFileName: "report.html",
            reportedContentType: "text/html",
        });
        const html = file.buffer.toString();

        expect(html.indexOf("Content-Security-Policy")).toBeLessThan(
            html.indexOf("<script>"),
        );
        expect(
            parseHTML(html)
                .document.head.querySelector("meta[http-equiv]")
                ?.getAttribute("content"),
        ).toContain("script-src 'sha256-");
    });

    it("disables event handlers through a head policy while preserving the document", () => {
        const file = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from(
                "<html onload=\"window.location = 'https://example.com'\"><body></body></html>",
            ),
            originalFileName: "report.html",
            reportedContentType: "text/html",
        });
        const html = file.buffer.toString();

        const { document } = parseHTML(html);
        expect(
            document.head
                .querySelector("meta[http-equiv]")
                ?.getAttribute("content"),
        ).toContain("script-src 'none'");
        expect(document.documentElement.getAttribute("onload")).toContain(
            "window.location",
        );
    });

    it.each([
        '<!doctype html x=" ><script>fetch("https://example.com")</script>">',
        '<!doctype html PUBLIC x "><script>fetch("https://example.com")</script>">',
        '<!doctype html SYSTEM x "><script>fetch("https://example.com")</script>">',
        "<!doctype html PUBLIC \"x><script>fetch('https://example.com')</script>\">",
        "<!doctype html SYSTEM \"x><script>fetch('https://example.com')</script>\">",
    ])(
        "normalizes malformed doctypes without allowing scripts before CSP: %s",
        (doctype) => {
            const file = normalizeProjectDocumentUploadFile({
                buffer: Buffer.from(
                    `${doctype}<html><body>Report</body></html>`,
                ),
                originalFileName: "report.html",
                reportedContentType: "text/html",
            });
            const html = file.buffer.toString();
            const { document } = parseHTML(html);
            expect(
                document.head
                    .querySelector("meta[http-equiv]")
                    ?.getAttribute("content"),
            ).toContain("script-src 'sha256-");
            expect(html.indexOf("Content-Security-Policy")).toBeLessThan(
                html.indexOf("<script>"),
            );
            expect(document.body.textContent).toContain("Report");
        },
    );

    it("preserves static layout, Unicode and embedded images", () => {
        const source =
            '<!doctype html><html lang="fr"><head><style>body { color: red; }</style></head><body><h1>Rapport été</h1><img src="data:image/png;base64,AAAA"></body></html>';
        const file = normalizeProjectDocumentUploadFile({
            buffer: Buffer.from(source),
            originalFileName: "report.html",
            reportedContentType: "text/html",
        });
        const { document } = parseHTML(file.buffer.toString());
        expect(document.querySelector("h1")?.textContent).toBe("Rapport été");
        expect(document.querySelector("style")?.textContent).toBe(
            "body { color: red; }",
        );
        expect(document.querySelector("img")?.getAttribute("src")).toBe(
            "data:image/png;base64,AAAA",
        );
        expect(document.head.firstElementChild?.getAttribute("charset")).toBe(
            "utf-8",
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
