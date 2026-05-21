/**
 * Import queue producer.
 *
 * The API owns request validation, import record creation, and enqueueing. The
 * dedicated import-worker owns Valkey consumption and import execution.
 *
 * Queue semantics intentionally match the previous import buffer:
 * - Valkey List FIFO queue (RPUSH by API, LPOP by worker)
 * - At-most-once delivery: worker removes items before processing
 * - conversation_import remains the user-facing source of truth
 */

import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { log } from "@/app.js";
import type { ImportRequest } from "./importQueueContract.js";
import { zodImportRequest } from "./importQueueContract.js";
import type { ValkeyRef } from "./valkeyRef.js";

export interface ImportBuffer {
    addImport: (request: ImportRequest) => Promise<void>;
    flush: () => Promise<void>;
    shutdown: () => Promise<void>;
}

interface ImportBufferDependencies {
    valkeyRef: ValkeyRef;
}

export function createImportBuffer({
    valkeyRef,
}: ImportBufferDependencies): ImportBuffer {
    const getValkey = (): Valkey | undefined => valkeyRef.current;
    let isShuttingDown = false;

    async function addImport(request: ImportRequest): Promise<void> {
        if (isShuttingDown) {
            throw new Error("[ImportQueue] Cannot add imports during shutdown");
        }

        const valkey = getValkey();
        if (valkey === undefined) {
            throw new Error(
                "[ImportQueue] Queue Valkey is required for import-worker processing",
            );
        }

        const parsedRequest = zodImportRequest.parse(request);
        await valkey.rpush(VALKEY_QUEUE_KEYS.IMPORT_BUFFER, [
            JSON.stringify(parsedRequest),
        ]);
        log.info(
            `[ImportQueue] Added ${parsedRequest.type} import ${parsedRequest.importSlugId} to Valkey queue`,
        );
    }

    function flush(): Promise<void> {
        // Import consumption happens in services/import-worker.
        return Promise.resolve();
    }

    function shutdown(): Promise<void> {
        isShuttingDown = true;
        return Promise.resolve();
    }

    return { addImport, flush, shutdown };
}
