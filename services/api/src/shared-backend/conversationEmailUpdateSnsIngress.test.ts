/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { describe, expect, it, vi } from "vitest";

vi.mock("./schema.js", () => ({
    conversationEmailUpdateSnsEventInboxTable: {},
}));

import {
    createSnsEnvelopeSignatureVerifier,
    sesEventSchema,
    snsEnvelopeSchema,
    type SnsEnvelope,
} from "./conversationEmailUpdateSnsIngress.js";

const mail = {
    timestamp: "2026-08-21T12:00:00.000Z",
    source: "sender@example.com",
    sourceArn: "arn:aws:ses:eu-west-1:123456789012:identity/example.com",
    sendingAccountId: "123456789012",
    messageId: "0102019b12345678-example",
    destination: ["recipient@example.net"],
    headersTruncated: false,
    headers: [{ name: "From", value: "sender@example.com" }],
    commonHeaders: { from: ["sender@example.com"] },
    tags: { "ses:configuration-set": ["conversation-email-updates"] },
    providerAddedMailField: "accepted",
};

const recipient = {
    emailAddress: "recipient@example.net",
    action: "failed",
    status: "5.1.1",
    diagnosticCode: "smtp; 550 mailbox unavailable",
    providerAddedRecipientField: "accepted",
};

describe("SES event parsing", () => {
    it.each([
        ["send", { eventType: "Send", mail, send: {} }],
        [
            "delivery",
            {
                eventType: "Delivery",
                mail,
                delivery: {
                    timestamp: "2026-08-21T12:00:01.000Z",
                    processingTimeMillis: 1_000,
                    recipients: ["recipient@example.net"],
                    smtpResponse: "250 2.0.0 Ok",
                    reportingMTA: "a8-1.smtp-out.amazonses.com",
                    providerAddedDetailField: "accepted",
                },
            },
        ],
        [
            "bounce",
            {
                eventType: "Bounce",
                mail,
                bounce: {
                    bounceType: "Permanent",
                    bounceSubType: "General",
                    bouncedRecipients: [recipient],
                    timestamp: "2026-08-21T12:00:01.000Z",
                    feedbackId: "feedback-id",
                    reportingMTA: "dns; a8-1.smtp-out.amazonses.com",
                },
            },
        ],
        [
            "complaint with documented null subtype",
            {
                eventType: "Complaint",
                mail,
                complaint: {
                    complainedRecipients: [
                        { emailAddress: "recipient@example.net" },
                    ],
                    timestamp: "2026-08-21T12:00:01.000Z",
                    complaintFeedbackType: "abuse",
                    complaintSubType: null,
                    feedbackId: "feedback-id",
                    userAgent: "AnyCompany Feedback Loop",
                    arrivalDate: "2026-08-21T12:00:00.000Z",
                },
            },
        ],
        [
            "delivery delay",
            {
                eventType: "DeliveryDelay",
                mail,
                deliveryDelay: {
                    delayedRecipients: [recipient],
                    timestamp: "2026-08-21T12:00:01.000Z",
                    delayType: "TransientCommunicationFailure",
                    expirationTime: "2026-08-22T12:00:00.000Z",
                },
            },
        ],
        [
            "reject",
            {
                eventType: "Reject",
                mail,
                reject: {
                    reason: "Bad content",
                    providerAddedDetailField: "accepted",
                },
            },
        ],
        [
            "rendering failure",
            {
                eventType: "Rendering Failure",
                mail,
                failure: {
                    errorMessage: "Missing required template value",
                    templateName: "conversation-update",
                    providerAddedDetailField: "accepted",
                },
            },
        ],
    ])("parses a real-shaped %s event", (_name, event) => {
        const parsed = sesEventSchema.parse({
            ...event,
            providerAddedEventField: "accepted",
        });

        expect(parsed.mail.messageId).toBe(mail.messageId);
        expect(parsed.providerAddedEventField).toBe("accepted");
        expect(parsed.mail.providerAddedMailField).toBe("accepted");
    });

    it("allows an omitted complaint subtype but requires correlation fields", () => {
        expect(
            sesEventSchema.safeParse({
                eventType: "Complaint",
                mail,
                complaint: {
                    complainedRecipients: [recipient],
                    timestamp: "2026-08-21T12:00:01.000Z",
                },
            }).success,
        ).toBe(true);
        expect(
            sesEventSchema.safeParse({
                eventType: "Send",
                mail: { timestamp: mail.timestamp },
                send: {},
            }).success,
        ).toBe(false);
    });
});

describe("SNS certificate cache", () => {
    const envelope = snsEnvelopeSchema.parse({
        Type: "Notification",
        MessageId: "message-id",
        TopicArn: "arn:aws:sns:eu-west-1:123456789012:updates",
        Message: JSON.stringify({ eventType: "Send", mail, send: {} }),
        Timestamp: "2026-08-21T12:00:00.000Z",
        SignatureVersion: "2",
        Signature: "valid-signature",
        SigningCertURL:
            "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-0123456789abcdef0123456789abcdef.pem",
    });

    it("caches only certificates that verify a signature", async () => {
        const fetchCertificate = vi.fn(
            async () => await Promise.resolve("certificate-pem"),
        );
        const verifyCertificate = vi.fn(
            ({ envelope: receivedEnvelope }: { envelope: SnsEnvelope }) =>
                receivedEnvelope.Signature === "valid-signature",
        );
        const verify = createSnsEnvelopeSignatureVerifier({
            fetchCertificate,
            verifyCertificate,
        });

        expect(await verify({ envelope })).toBe(true);
        expect(await verify({ envelope })).toBe(true);
        expect(fetchCertificate).toHaveBeenCalledOnce();

        const invalidEnvelope = { ...envelope, Signature: "invalid-signature" };
        const verifyInvalid = createSnsEnvelopeSignatureVerifier({
            fetchCertificate,
            verifyCertificate,
        });
        expect(await verifyInvalid({ envelope: invalidEnvelope })).toBe(false);
        expect(await verifyInvalid({ envelope: invalidEnvelope })).toBe(false);
        expect(fetchCertificate).toHaveBeenCalledTimes(3);
    });

    it("validates certificate URLs before fetch and bounds cache size", async () => {
        const fetchCertificate = vi.fn(
            async (url: URL) => await Promise.resolve(url.href),
        );
        const verify = createSnsEnvelopeSignatureVerifier({
            fetchCertificate,
            verifyCertificate: () => true,
            cacheMaxEntries: 1,
        });
        const secondEnvelope = {
            ...envelope,
            SigningCertURL:
                "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-1123456789abcdef0123456789abcdef.pem",
        };

        expect(
            await verify({
                envelope: {
                    ...envelope,
                    SigningCertURL: "https://attacker.example/certificate.pem",
                },
            }),
        ).toBe(false);
        expect(fetchCertificate).not.toHaveBeenCalled();
        expect(await verify({ envelope })).toBe(true);
        expect(await verify({ envelope: secondEnvelope })).toBe(true);
        expect(await verify({ envelope })).toBe(true);
        expect(fetchCertificate).toHaveBeenCalledTimes(3);
    });

    it("expires cached certificates after the bounded TTL", async () => {
        let currentTime = new Date("2026-08-21T12:00:00.000Z");
        const fetchCertificate = vi.fn(
            async () => await Promise.resolve("certificate-pem"),
        );
        const verify = createSnsEnvelopeSignatureVerifier({
            fetchCertificate,
            verifyCertificate: () => true,
            now: () => currentTime,
            cacheTtlMs: 1_000,
        });

        expect(await verify({ envelope })).toBe(true);
        currentTime = new Date("2026-08-21T12:00:00.999Z");
        expect(await verify({ envelope })).toBe(true);
        currentTime = new Date("2026-08-21T12:00:01.000Z");
        expect(await verify({ envelope })).toBe(true);

        expect(fetchCertificate).toHaveBeenCalledTimes(2);
    });
});
