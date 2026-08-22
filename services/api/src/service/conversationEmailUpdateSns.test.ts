import { describe, expect, it, vi } from "vitest";
import {
    buildSnsCanonicalSignatureString,
    parseValidSnsCertificateUrl,
    snsEnvelopeSchema,
} from "@/shared-backend/conversationEmailUpdateSnsIngress.js";
import { createSnsIngressConcurrencyLimiter } from "./conversationEmailUpdateSns.js";

describe("SNS signature helpers", () => {
    it("builds the AWS canonical notification string in fixed field order", () => {
        const envelope = snsEnvelopeSchema.parse({
            Type: "Notification",
            MessageId: "message-id",
            TopicArn: "arn:aws:sns:eu-west-1:123456789012:updates",
            Subject: "SES event",
            Message: '{"eventType":"Send"}',
            Timestamp: "2026-08-21T12:00:00.000Z",
            SignatureVersion: "1",
            Signature: "signature",
            SigningCertURL:
                "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-0123456789abcdef0123456789abcdef.pem",
        });
        expect(buildSnsCanonicalSignatureString(envelope)).toBe(
            'Message\n{"eventType":"Send"}\nMessageId\nmessage-id\nSubject\nSES event\nTimestamp\n2026-08-21T12:00:00.000Z\nTopicArn\narn:aws:sns:eu-west-1:123456789012:updates\nType\nNotification\n',
        );
    });

    it("accepts only strict AWS SNS HTTPS certificate URLs", () => {
        expect(
            parseValidSnsCertificateUrl(
                "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-0123456789abcdef0123456789abcdef.pem",
            ),
        ).toBeInstanceOf(URL);
        expect(
            parseValidSnsCertificateUrl(
                "https://sns.eu-west-1.amazonaws.com.evil.example/SimpleNotificationService-0123456789abcdef0123456789abcdef.pem",
            ),
        ).toBeUndefined();
        expect(
            parseValidSnsCertificateUrl(
                "http://sns.eu-west-1.amazonaws.com/SimpleNotificationService-0123456789abcdef0123456789abcdef.pem",
            ),
        ).toBeUndefined();
        expect(
            parseValidSnsCertificateUrl(
                "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-0123456789abcdef0123456789abcdef.pem?redirect=x",
            ),
        ).toBeUndefined();
    });
});

describe("SNS ingress concurrency", () => {
    it("bounds simultaneous verification work", async () => {
        let active = 0;
        let maximumActive = 0;
        const releaseCallbacks: (() => void)[] = [];
        const ingest = vi.fn(async () => {
            active += 1;
            maximumActive = Math.max(maximumActive, active);
            await new Promise<void>((resolve) => {
                releaseCallbacks.push(resolve);
            });
            active -= 1;
            return { kind: "stored" } as const;
        });
        const limitedIngest = createSnsIngressConcurrencyLimiter({
            ingest,
            maxConcurrency: 2,
        });
        const requests = Array.from({ length: 5 }, (_, index) =>
            limitedIngest(index),
        );

        await vi.waitFor(() => {
            expect(ingest).toHaveBeenCalledTimes(2);
        });
        while (releaseCallbacks.length > 0) {
            releaseCallbacks.shift()?.();
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        await Promise.all(requests);

        expect(maximumActive).toBe(2);
    });
});
