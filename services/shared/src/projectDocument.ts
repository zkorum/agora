export const MAX_PROJECT_DOCUMENT_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_PROJECT_DOCUMENT_FILE_SIZE_MB =
    MAX_PROJECT_DOCUMENT_FILE_SIZE / (1024 * 1024);

export const PROJECT_DOCUMENT_UPLOAD_FIELD_NAMES = {
    PARTICIPANT_FILE: "participantFile",
    OWNER_FILE: "ownerFile",
    METADATA: "metadata",
} as const;

export const PROJECT_DOCUMENT_CONTENT_TYPES = [
    "text/html",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
] as const;

export type ProjectDocumentContentType =
    (typeof PROJECT_DOCUMENT_CONTENT_TYPES)[number];

export const PROJECT_DOCUMENT_CONTENT_TYPE_BY_EXTENSION: Readonly<
    Record<string, ProjectDocumentContentType>
> = {
    html: "text/html",
    htm: "text/html",
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    json: "application/json",
};

export const PROJECT_DOCUMENT_ACCEPT = Object.keys(
    PROJECT_DOCUMENT_CONTENT_TYPE_BY_EXTENSION,
)
    .map((extension) => `.${extension}`)
    .join(",");

export function getProjectDocumentFileExtension(
    fileName: string,
): string | undefined {
    const extension = fileName.split(".").at(-1)?.toLowerCase();
    return extension === undefined || extension === fileName.toLowerCase()
        ? undefined
        : extension;
}

export function getProjectDocumentContentTypeFromFileName(
    fileName: string,
): ProjectDocumentContentType | undefined {
    const extension = getProjectDocumentFileExtension(fileName);
    return extension === undefined
        ? undefined
        : PROJECT_DOCUMENT_CONTENT_TYPE_BY_EXTENSION[extension];
}

export function isSafeProjectDocumentFileName(fileName: string): boolean {
    const normalized = fileName.trim();
    if (normalized.length === 0 || normalized.length > 255) {
        return false;
    }
    for (const character of normalized) {
        const codePoint = character.codePointAt(0);
        if (
            codePoint === undefined ||
            codePoint < 32 ||
            codePoint === 127 ||
            character === "/" ||
            character === "\\"
        ) {
            return false;
        }
    }
    return true;
}

export function isInlineProjectDocumentContentType(
    contentType: ProjectDocumentContentType,
): boolean {
    return contentType === "text/html" || contentType === "application/pdf";
}
