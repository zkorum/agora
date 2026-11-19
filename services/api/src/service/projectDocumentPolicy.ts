export const PROJECT_DOCUMENT_MAX_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
export const STALE_PENDING_UPLOAD_AGE_MS = 60 * 60 * 1000;
export const PROJECT_DOCUMENT_UPLOAD_TIMEOUT_MS = 120_000;

export function createProjectDocumentUploadDeadline() {
    const expiresAt = Date.now() + PROJECT_DOCUMENT_UPLOAD_TIMEOUT_MS;
    const abortSignal = AbortSignal.timeout(PROJECT_DOCUMENT_UPLOAD_TIMEOUT_MS);
    function check(): void {
        abortSignal.throwIfAborted();
        // A resumed process may not have run its abort timer yet.
        if (Date.now() >= expiresAt)
            throw new DOMException(
                "Document publication deadline exceeded",
                "TimeoutError",
            );
    }
    return { abortSignal, check };
}

export type ProjectDocumentUploadDeadline = ReturnType<
    typeof createProjectDocumentUploadDeadline
>;
