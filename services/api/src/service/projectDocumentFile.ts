import { httpErrors } from "@fastify/sensible";
import { createHash } from "node:crypto";
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
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";

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

function getHtmlSecurityInsertionIndex(html: string): number | undefined {
    const leadingMatch = /^\uFEFF?\s*/u.exec(html);
    const leadingLength = leadingMatch?.[0].length ?? 0;
    const content = html.slice(leadingLength);
    const openingMatch = /^(?:<!doctype\s+html(?=\s|>)|<html(?=\s|>))/iu.exec(
        content,
    );
    if (openingMatch === null) {
        return undefined;
    }
    const startsWithHtmlElement = openingMatch[0]
        .toLowerCase()
        .startsWith("<html");
    let quote: '"' | "'" | undefined;
    for (
        let index = openingMatch[0].length;
        index < content.length;
        index += 1
    ) {
        const character = content[index];
        if (quote !== undefined) {
            if (character === quote) {
                quote = undefined;
            }
        } else if (character === '"' || character === "'") {
            quote = character;
        } else if (character === ">") {
            return startsWithHtmlElement
                ? leadingLength
                : leadingLength + index + 1;
        }
    }
    return undefined;
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
        case "text/html": {
            return (
                getHtmlSecurityInsertionIndex(decodeUtf8(buffer)) !== undefined
            );
        }
        case "application/json": {
            const parsed: unknown = JSON.parse(decodeUtf8(buffer));
            return parsed !== undefined;
        }
        case "text/plain":
        case "text/markdown":
        case "text/csv":
            decodeUtf8(buffer);
            return true;
    }
}

function applyHtmlContentSecurityPolicy(buffer: Buffer): Buffer {
    const html = decodeUtf8(buffer);
    const meta = `<meta http-equiv="Content-Security-Policy" content="${PROJECT_DOCUMENT_HTML_CSP}">`;
    const insertionIndex = getHtmlSecurityInsertionIndex(html);
    if (insertionIndex === undefined) {
        throw httpErrors.badRequest("Document is not a complete HTML page");
    }
    return Buffer.from(
        `${html.slice(0, insertionIndex)}${meta}${html.slice(insertionIndex)}`,
    );
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
