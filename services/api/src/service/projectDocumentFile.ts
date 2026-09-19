import { httpErrors } from "@fastify/sensible";
import { createHash } from "node:crypto";
import {
    defaultTreeAdapter,
    type DefaultTreeAdapterMap,
    html,
    parse,
    serialize,
} from "parse5";
import {
    getProjectDocumentContentTypeFromFileName,
    getProjectDocumentFileExtension,
    isSafeProjectDocumentFileName,
    MAX_PROJECT_DOCUMENT_FILE_SIZE,
    PROJECT_DOCUMENT_CONTENT_TYPES,
    type ProjectDocumentContentType,
} from "@/shared/projectDocument.js";
import type { ProjectDocumentLocalization } from "@/shared/types/dto.js";

const allowedContentTypes = new Set<string>(PROJECT_DOCUMENT_CONTENT_TYPES);
const PROJECT_DOCUMENT_HTML_CSP =
    "default-src 'none'; script-src-attr 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";

export interface ProjectDocumentFileUpload {
    buffer: Buffer;
    originalFileName: string;
    reportedContentType: string;
}

export interface NormalizedProjectDocumentFile {
    buffer: Buffer;
    originalFileName: string;
    contentType: ProjectDocumentContentType;
    checksumSha256: string;
}

function normalizeFileName(fileName: string): string {
    const normalized = fileName.trim();
    if (!isSafeProjectDocumentFileName(normalized)) {
        throw httpErrors.badRequest("Invalid document file name");
    }
    return normalized;
}

function parseReportedContentType(
    reportedContentType: string,
): string | undefined {
    const normalized = reportedContentType
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
    return normalized === "" || normalized === "application/octet-stream"
        ? undefined
        : normalized;
}

function decodeUtf8(buffer: Buffer): string {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
        throw httpErrors.badRequest("Document is not valid UTF-8 text");
    }
}

function hasExpectedFileSignature({
    buffer,
    contentType,
}: {
    buffer: Buffer;
    contentType: ProjectDocumentContentType;
}): boolean {
    switch (contentType) {
        case "application/pdf":
            return (
                buffer.subarray(0, 5).toString("ascii") === "%PDF-" &&
                buffer.includes(Buffer.from("%%EOF"))
            );
        case "application/json": {
            const parsed: unknown = JSON.parse(decodeUtf8(buffer));
            return parsed !== undefined;
        }
        case "text/html":
            // HTML is decoded and checked once during normalization below.
            return true;
        case "text/plain":
        case "text/markdown":
        case "text/csv":
            decodeUtf8(buffer);
            return true;
    }
}

function applyHtmlContentSecurityPolicy(buffer: Buffer): Buffer {
    // Uploaded HTML is untrusted. Use the browser's parsing rules rather than
    // scanning source text: malformed doctypes can terminate before their quotes.
    const source = decodeUtf8(buffer);
    // This is only format sniffing; the parser determines where the policy goes.
    if (
        !/^\uFEFF?\s*(?:<!doctype\s+html(?=\s|>)|<html(?=\s|>))/iu.test(source)
    ) {
        throw httpErrors.badRequest(
            "Document contents do not match its file format",
        );
    }
    const document = parse(source);
    const scriptHashes = prepareHtmlDocument(document);
    const scriptPolicy =
        scriptHashes.length === 0 ? "'none'" : scriptHashes.join(" ");
    const root = document.childNodes.find((node) =>
        defaultTreeAdapter.isElementNode(node),
    );
    const head = root?.childNodes
        .filter((node) => defaultTreeAdapter.isElementNode(node))
        .find((node) => node.tagName === "head");
    if (head === undefined) {
        throw httpErrors.badRequest(
            "Document contents do not match its file format",
        );
    }
    const securityMetadata = [
        [{ name: "charset", value: "utf-8" }],
        [
            { name: "http-equiv", value: "Content-Security-Policy" },
            {
                name: "content",
                value: `${PROJECT_DOCUMENT_HTML_CSP}; script-src ${scriptPolicy}`,
            },
        ],
        [
            { name: "name", value: "referrer" },
            { name: "content", value: "no-referrer" },
        ],
    ];
    const firstChild = head.childNodes.at(0);
    for (const attributes of securityMetadata) {
        const meta = defaultTreeAdapter.createElement(
            "meta",
            html.NS.HTML,
            attributes,
        );
        if (firstChild === undefined) {
            defaultTreeAdapter.appendChild(head, meta);
        } else {
            defaultTreeAdapter.insertBefore(head, meta, firstChild);
        }
    }
    return Buffer.from(serialize(document));
}

function prepareHtmlDocument(
    document: DefaultTreeAdapterMap["document"],
): string[] {
    const scriptHashes = new Set<string>();
    const pending: DefaultTreeAdapterMap["node"][] = [document];
    while (pending.length > 0) {
        const node = pending.pop();
        if (node === undefined) break;
        if (defaultTreeAdapter.isElementNode(node)) {
            if (
                node.tagName === "script" &&
                node.namespaceURI === html.NS.HTML
            ) {
                const type = node.attrs
                    .find((attribute) => attribute.name === "type")
                    ?.value.trim()
                    .toLowerCase();
                const hasSource = node.attrs.some(
                    (attribute) => attribute.name === "src",
                );
                if (
                    !hasSource &&
                    type !== "application/json" &&
                    type !== "application/ld+json"
                ) {
                    const source = node.childNodes
                        .filter((child) => defaultTreeAdapter.isTextNode(child))
                        .map((child) =>
                            defaultTreeAdapter.getTextNodeContent(child),
                        )
                        .join("");
                    scriptHashes.add(
                        `'sha256-${createHash("sha256").update(source).digest("base64")}'`,
                    );
                }
            }
            if (
                node.tagName === "meta" &&
                node.attrs.some(
                    (attribute) =>
                        (attribute.name === "http-equiv" &&
                            attribute.value.trim().toLowerCase() ===
                                "refresh") ||
                        (attribute.name === "name" &&
                            attribute.value.trim().toLowerCase() ===
                                "referrer"),
                )
            ) {
                defaultTreeAdapter.detachNode(node);
                continue;
            }
            // CSP does not restrict iframe navigation. Remove declarative external
            // links while preserving same-document anchors, including SVG links.
            node.attrs = node.attrs.filter(
                (attribute) =>
                    attribute.name !== "href" ||
                    attribute.value.trim().startsWith("#"),
            );
            if (
                node.tagName === "template" &&
                "content" in node &&
                node.namespaceURI === html.NS.HTML
            ) {
                pending.push(defaultTreeAdapter.getTemplateContent(node));
            }
        }
        if ("childNodes" in node) {
            for (const child of node.childNodes) pending.push(child);
        }
    }
    return [...scriptHashes];
}

export function normalizeProjectDocumentUploadFile(
    file: ProjectDocumentFileUpload,
): NormalizedProjectDocumentFile {
    if (
        file.buffer.length === 0 ||
        file.buffer.length > MAX_PROJECT_DOCUMENT_FILE_SIZE
    ) {
        throw httpErrors.payloadTooLarge("Invalid project document size");
    }
    const originalFileName = normalizeFileName(file.originalFileName);
    const contentType =
        getProjectDocumentContentTypeFromFileName(originalFileName);
    if (contentType === undefined) {
        throw httpErrors.unsupportedMediaType(
            "Unsupported project document extension",
        );
    }
    const reportedContentType = parseReportedContentType(
        file.reportedContentType,
    );
    if (
        reportedContentType !== undefined &&
        (!allowedContentTypes.has(reportedContentType) ||
            reportedContentType !== contentType)
    ) {
        throw httpErrors.badRequest(
            "Document extension does not match its content type",
        );
    }
    try {
        if (!hasExpectedFileSignature({ buffer: file.buffer, contentType })) {
            throw httpErrors.badRequest(
                "Document contents do not match its file format",
            );
        }
    } catch (error: unknown) {
        if (error instanceof Error && "statusCode" in error) {
            throw error;
        }
        throw httpErrors.badRequest("Document contents could not be validated");
    }
    const buffer =
        contentType === "text/html"
            ? applyHtmlContentSecurityPolicy(file.buffer)
            : file.buffer;
    if (buffer.length > MAX_PROJECT_DOCUMENT_FILE_SIZE) {
        throw httpErrors.payloadTooLarge(
            "HTML security metadata exceeds the maximum document size",
        );
    }
    return {
        buffer,
        originalFileName,
        contentType,
        checksumSha256: createHash("sha256").update(buffer).digest("base64"),
    };
}

export function normalizeProjectDocumentLocalizations({
    localizations,
    participantFile,
    ownerFile,
}: {
    localizations: readonly ProjectDocumentLocalization[];
    participantFile: NormalizedProjectDocumentFile;
    ownerFile: NormalizedProjectDocumentFile | undefined;
}): ProjectDocumentLocalization[] {
    const expectedExtension = getProjectDocumentFileExtension(
        participantFile.originalFileName,
    );
    if (
        expectedExtension === undefined ||
        (ownerFile !== undefined &&
            getProjectDocumentFileExtension(ownerFile.originalFileName) !==
                expectedExtension)
    ) {
        throw httpErrors.badRequest(
            "Participant and owner files must use the same supported extension",
        );
    }
    return localizations.map((localization) => {
        const downloadFileName = normalizeFileName(
            localization.downloadFileName,
        );
        if (
            getProjectDocumentFileExtension(downloadFileName) !==
            expectedExtension
        ) {
            throw httpErrors.badRequest(
                "Localized download filenames must preserve the uploaded file extension",
            );
        }
        return { ...localization, downloadFileName };
    });
}

export function buildProjectDocumentContentDisposition({
    mode,
    fileName,
}: {
    mode: "inline" | "download";
    fileName: string;
}): string {
    const disposition = mode === "inline" ? "inline" : "attachment";
    const asciiFileName = fileName
        .replace(/[^\x20-\x7e]/gu, "_")
        .replace(/["\\]/gu, "_");
    const encodedFileName = encodeURIComponent(fileName).replace(
        /['()*]/gu,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return `${disposition}; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`;
}
