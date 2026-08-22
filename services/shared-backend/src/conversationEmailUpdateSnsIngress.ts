import { createVerify, X509Certificate } from "node:crypto";
import { z } from "zod";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { conversationEmailUpdateSnsEventInboxTable } from "./schema.js";

const snsBaseSchema = z
    .object({
        Message: z.string(),
        MessageId: z.string().min(1).max(191),
        Signature: z.string().min(1),
        SignatureVersion: z.enum(["1", "2"]),
        SigningCertURL: z.url(),
        Timestamp: z.iso.datetime(),
        TopicArn: z.string().min(1),
    })
    .strict();

export const snsNotificationSchema = snsBaseSchema
    .extend({
        Type: z.literal("Notification"),
        Subject: z.string().optional(),
        UnsubscribeURL: z.url().optional(),
    })
    .strict();
const snsSubscriptionSchema = snsBaseSchema
    .extend({
        Type: z.enum(["SubscriptionConfirmation", "UnsubscribeConfirmation"]),
        SubscribeURL: z.url(),
        Token: z.string().min(1),
    })
    .strict();

export const snsEnvelopeSchema = z.union([
    snsNotificationSchema,
    snsSubscriptionSchema,
]);
export type SnsEnvelope = z.infer<typeof snsEnvelopeSchema>;

const sesRecipientSchema = z
    .object({
        emailAddress: z.email(),
        action: z.string().optional(),
        status: z.string().optional(),
        diagnosticCode: z.string().optional(),
    })
    .loose();
const sesMailSchema = z
    .object({
        timestamp: z.iso.datetime(),
        messageId: z.string().min(1),
        source: z.string().optional(),
        sourceArn: z.string().optional(),
        sendingAccountId: z.string().optional(),
        destination: z.array(z.string()).optional(),
        headersTruncated: z.boolean().optional(),
        headers: z
            .array(z.object({ name: z.string(), value: z.string() }).strict())
            .optional(),
        commonHeaders: z.record(z.string(), z.unknown()).optional(),
        tags: z.record(z.string(), z.array(z.string())).optional(),
    })
    .loose();

const deliverySchema = z
    .object({
        timestamp: z.iso.datetime(),
        processingTimeMillis: z.number().optional(),
        recipients: z.array(z.string()).optional(),
        smtpResponse: z.string().optional(),
        reportingMTA: z.string().optional(),
        remoteMtaIp: z.string().optional(),
    })
    .loose();
const bounceSchema = z
    .object({
        bounceType: z.string(),
        bounceSubType: z.string().optional(),
        bouncedRecipients: z.array(sesRecipientSchema),
        timestamp: z.iso.datetime(),
        feedbackId: z.string().optional(),
        reportingMTA: z.string().optional(),
        remoteMtaIp: z.string().optional(),
    })
    .loose();
const complaintSchema = z
    .object({
        complainedRecipients: z.array(sesRecipientSchema),
        timestamp: z.iso.datetime(),
        complaintFeedbackType: z.string().optional(),
        complaintSubType: z.string().nullable().optional(),
        feedbackId: z.string().optional(),
        userAgent: z.string().optional(),
        arrivalDate: z.iso.datetime().optional(),
    })
    .loose();
const deliveryDelaySchema = z
    .object({
        delayedRecipients: z.array(sesRecipientSchema),
        timestamp: z.iso.datetime(),
        delayType: z.string().optional(),
        expirationTime: z.iso.datetime().optional(),
        reportingMTA: z.string().optional(),
    })
    .loose();

export const sesEventSchema = z.discriminatedUnion("eventType", [
    z
        .object({
            eventType: z.literal("Send"),
            mail: sesMailSchema,
            send: z.object({}).loose(),
        })
        .loose(),
    z
        .object({
            eventType: z.literal("Delivery"),
            mail: sesMailSchema,
            delivery: deliverySchema,
        })
        .loose(),
    z
        .object({
            eventType: z.literal("Bounce"),
            mail: sesMailSchema,
            bounce: bounceSchema,
        })
        .loose(),
    z
        .object({
            eventType: z.literal("Complaint"),
            mail: sesMailSchema,
            complaint: complaintSchema,
        })
        .loose(),
    z
        .object({
            eventType: z.literal("DeliveryDelay"),
            mail: sesMailSchema,
            deliveryDelay: deliveryDelaySchema,
        })
        .loose(),
    z
        .object({
            eventType: z.literal("Reject"),
            mail: sesMailSchema,
            reject: z.object({ reason: z.string() }).loose(),
        })
        .loose(),
    z
        .object({
            eventType: z.literal("Rendering Failure"),
            mail: sesMailSchema,
            failure: z
                .object({
                    errorMessage: z.string(),
                    templateName: z.string().optional(),
                })
                .loose(),
        })
        .loose(),
]);
export type SesEvent = z.infer<typeof sesEventSchema>;

export function buildSnsCanonicalSignatureString(
    envelope: SnsEnvelope,
): string {
    if (envelope.Type === "Notification") {
        const subject =
            envelope.Subject === undefined
                ? ""
                : `Subject\n${envelope.Subject}\n`;
        return `Message\n${envelope.Message}\nMessageId\n${envelope.MessageId}\n${subject}Timestamp\n${envelope.Timestamp}\nTopicArn\n${envelope.TopicArn}\nType\n${envelope.Type}\n`;
    }
    return `Message\n${envelope.Message}\nMessageId\n${envelope.MessageId}\nSubscribeURL\n${envelope.SubscribeURL}\nTimestamp\n${envelope.Timestamp}\nToken\n${envelope.Token}\nTopicArn\n${envelope.TopicArn}\nType\n${envelope.Type}\n`;
}

export function parseValidSnsCertificateUrl(value: string): URL | undefined {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return undefined;
    }
    const validHost =
        /^sns\.[a-z0-9-]+\.amazonaws\.com(?:\.cn)?$/.test(url.hostname) &&
        url.hostname === url.hostname.toLowerCase();
    const validPath = /^\/SimpleNotificationService-[A-Fa-f0-9]{32}\.pem$/.test(
        url.pathname,
    );
    if (
        url.protocol !== "https:" ||
        !validHost ||
        !validPath ||
        url.username !== "" ||
        url.password !== "" ||
        url.port !== "" ||
        url.search !== "" ||
        url.hash !== ""
    ) {
        return undefined;
    }
    return url;
}

function parseValidSnsSubscriptionUrl({
    value,
    expectedTopicArn,
    expectedToken,
}: {
    value: string;
    expectedTopicArn: string;
    expectedToken: string;
}): URL | undefined {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return undefined;
    }
    const validHost = /^sns\.[a-z0-9-]+\.amazonaws\.com(?:\.cn)?$/.test(
        url.hostname,
    );
    if (
        url.protocol !== "https:" ||
        !validHost ||
        url.username !== "" ||
        url.password !== "" ||
        url.port !== "" ||
        url.hash !== "" ||
        url.pathname !== "/" ||
        url.searchParams.get("Action") !== "ConfirmSubscription" ||
        url.searchParams.get("TopicArn") !== expectedTopicArn ||
        url.searchParams.get("Token") !== expectedToken
    ) {
        return undefined;
    }
    return url;
}

type FetchSnsCertificate = (url: URL) => Promise<string>;
type VerifySnsCertificate = (params: {
    envelope: SnsEnvelope;
    certificatePem: string;
    now: Date;
}) => boolean;

const SNS_CERTIFICATE_CACHE_TTL_MS = 15 * 60 * 1000;
const SNS_CERTIFICATE_CACHE_MAX_ENTRIES = 16;

async function fetchSnsCertificate(url: URL): Promise<string> {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(5_000),
        redirect: "error",
    });
    if (!response.ok) throw new Error("Unable to fetch SNS certificate");
    const certificate = await response.text();
    if (certificate.length > 32_768) {
        throw new Error("SNS certificate response is too large");
    }
    return certificate;
}

function verifySnsCertificate({
    envelope,
    certificatePem,
    now,
}: {
    envelope: SnsEnvelope;
    certificatePem: string;
    now: Date;
}): boolean {
    const certificate = new X509Certificate(certificatePem);
    if (now < certificate.validFromDate || now > certificate.validToDate) {
        return false;
    }
    const verifier = createVerify(
        envelope.SignatureVersion === "1" ? "RSA-SHA1" : "RSA-SHA256",
    );
    verifier.update(buildSnsCanonicalSignatureString(envelope), "utf8");
    verifier.end();
    return verifier.verify(certificate.publicKey, envelope.Signature, "base64");
}

export function createSnsEnvelopeSignatureVerifier({
    fetchCertificate = fetchSnsCertificate,
    verifyCertificate = verifySnsCertificate,
    now = () => new Date(),
    cacheTtlMs = SNS_CERTIFICATE_CACHE_TTL_MS,
    cacheMaxEntries = SNS_CERTIFICATE_CACHE_MAX_ENTRIES,
}: {
    fetchCertificate?: FetchSnsCertificate;
    verifyCertificate?: VerifySnsCertificate;
    now?: () => Date;
    cacheTtlMs?: number;
    cacheMaxEntries?: number;
} = {}): (params: { envelope: SnsEnvelope }) => Promise<boolean> {
    const certificateCache = new Map<
        string,
        { certificatePem: string; expiresAt: number }
    >();

    return async ({ envelope }) => {
        const certificateUrl = parseValidSnsCertificateUrl(
            envelope.SigningCertURL,
        );
        if (certificateUrl === undefined) return false;

        const currentTime = now();
        const cacheKey = certificateUrl.href;
        const cachedCertificate = certificateCache.get(cacheKey);
        if (
            cachedCertificate !== undefined &&
            cachedCertificate.expiresAt > currentTime.getTime()
        ) {
            certificateCache.delete(cacheKey);
            certificateCache.set(cacheKey, cachedCertificate);
            return verifyCertificate({
                envelope,
                certificatePem: cachedCertificate.certificatePem,
                now: currentTime,
            });
        }
        certificateCache.delete(cacheKey);

        const certificatePem = await fetchCertificate(certificateUrl);
        const isValid = verifyCertificate({
            envelope,
            certificatePem,
            now: currentTime,
        });
        if (!isValid) return false;

        certificateCache.set(cacheKey, {
            certificatePem,
            expiresAt: currentTime.getTime() + cacheTtlMs,
        });
        while (certificateCache.size > cacheMaxEntries) {
            const oldestCacheKey = certificateCache.keys().next().value;
            if (oldestCacheKey === undefined) break;
            certificateCache.delete(oldestCacheKey);
        }
        return true;
    };
}

export async function verifySnsEnvelopeSignature({
    envelope,
    fetchCertificate,
}: {
    envelope: SnsEnvelope;
    fetchCertificate?: FetchSnsCertificate;
}): Promise<boolean> {
    return await createSnsEnvelopeSignatureVerifier({ fetchCertificate })({
        envelope,
    });
}

export type SnsIngestionResult =
    | { kind: "stored" | "duplicate" }
    | { kind: "subscription_confirmation"; subscribeUrl: URL }
    | { kind: "unsubscribe_confirmation" };

export async function ingestConversationEmailSnsEnvelope({
    db,
    rawPayload,
    expectedTopicArn,
    verifySignature = verifySnsEnvelopeSignature,
}: {
    db: PostgresDatabase;
    rawPayload: unknown;
    expectedTopicArn: string;
    verifySignature?: (params: { envelope: SnsEnvelope }) => Promise<boolean>;
}): Promise<SnsIngestionResult> {
    const envelope = snsEnvelopeSchema.parse(rawPayload);
    if (envelope.TopicArn !== expectedTopicArn) {
        throw new Error("Unexpected SNS topic ARN");
    }
    if (!(await verifySignature({ envelope }))) {
        throw new Error("Invalid SNS signature");
    }
    if (envelope.Type === "SubscriptionConfirmation") {
        const subscribeUrl = parseValidSnsSubscriptionUrl({
            value: envelope.SubscribeURL,
            expectedTopicArn: envelope.TopicArn,
            expectedToken: envelope.Token,
        });
        if (subscribeUrl === undefined) {
            throw new Error("Invalid SNS subscription confirmation URL");
        }
        return { kind: "subscription_confirmation", subscribeUrl };
    }
    if (envelope.Type === "UnsubscribeConfirmation") {
        return { kind: "unsubscribe_confirmation" };
    }

    sesEventSchema.parse(JSON.parse(envelope.Message));
    const inserted = await db
        .insert(conversationEmailUpdateSnsEventInboxTable)
        .values({
            snsTopicArn: envelope.TopicArn,
            snsMessageId: envelope.MessageId,
            rawPayload,
            status: "pending",
        })
        .onConflictDoNothing({
            target: [
                conversationEmailUpdateSnsEventInboxTable.snsTopicArn,
                conversationEmailUpdateSnsEventInboxTable.snsMessageId,
            ],
        })
        .returning({ id: conversationEmailUpdateSnsEventInboxTable.id });
    return { kind: inserted.length === 0 ? "duplicate" : "stored" };
}
