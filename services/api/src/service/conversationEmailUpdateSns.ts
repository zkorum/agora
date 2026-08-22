import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import pLimit from "p-limit";
import {
    createSnsEnvelopeSignatureVerifier,
    ingestConversationEmailSnsEnvelope,
    type SnsIngestionResult,
} from "@/shared-backend/conversationEmailUpdateSnsIngress.js";

export interface ConversationEmailUpdateSnsIngressService {
    ingest: (rawPayload: unknown) => Promise<SnsIngestionResult>;
}

export function createSnsIngressConcurrencyLimiter({
    ingest,
    maxConcurrency,
}: {
    ingest: (rawPayload: unknown) => Promise<SnsIngestionResult>;
    maxConcurrency: number;
}): (rawPayload: unknown) => Promise<SnsIngestionResult> {
    const limit = pLimit(maxConcurrency);
    return async (rawPayload) =>
        await limit(async () => await ingest(rawPayload));
}

export function createConversationEmailUpdateSnsIngressService({
    db,
    expectedTopicArn,
}: {
    db: PostgresDatabase;
    expectedTopicArn: string;
}): ConversationEmailUpdateSnsIngressService {
    const verifySignature = createSnsEnvelopeSignatureVerifier();
    return {
        ingest: createSnsIngressConcurrencyLimiter({
            maxConcurrency: 4,
            ingest: async (rawPayload) =>
                await ingestConversationEmailSnsEnvelope({
                    db,
                    rawPayload,
                    expectedTopicArn,
                    verifySignature,
                }),
        }),
    };
}
