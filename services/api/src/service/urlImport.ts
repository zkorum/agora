import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AxiosInstance } from "axios";
import * as polisService from "./polis.js";
import * as importService from "./import.js";
import type { VoteBuffer } from "./voteBuffer.js";
import type { EventSlug } from "@/shared/types/zod.js";

interface ProcessUrlImportProps {
    db: PostgresJsDatabase;
    voteBuffer: VoteBuffer;
    axiosPolis: AxiosInstance;
    polisUrl: string;
    proof: string;
    didWrite: string;
    authorId: string;
    postAsOrganization: string | undefined;
    indexConversationAt?: string;
    isLoginRequired: boolean;
    isIndexed: boolean;
    requiresEventTicket?: EventSlug;
}

/**
 * Process URL import - fetch from Polis API and import conversation
 * Returns conversationId for status tracking
 */
export async function processUrlImport(
    props: ProcessUrlImportProps,
): Promise<{ conversationId: number }> {
    // 1. Fetch conversation data from Polis API
    const { importedPolisConversation, polisUrlType } =
        await polisService.importExternalPolisConversation({
            polisUrl: props.polisUrl,
            axiosPolis: props.axiosPolis,
        });

    // 2. Load the conversation using shared import logic
    const { conversationId } = await importService.loadImportedPolisConversation(
        {
            db: props.db,
            voteBuffer: props.voteBuffer,
            importedPolisConversation,
            importConfig: {
                method: "url",
                polisUrl: props.polisUrl,
                polisUrlType,
            },
            proof: props.proof,
            didWrite: props.didWrite,
            authorId: props.authorId,
            postAsOrganization: props.postAsOrganization,
            indexConversationAt: props.indexConversationAt,
            isLoginRequired: props.isLoginRequired,
            isIndexed: props.isIndexed,
            requiresEventTicket: props.requiresEventTicket,
        },
    );

    return { conversationId };
}
