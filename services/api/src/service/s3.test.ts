import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generatePresignedUrl, uploadToS3 } from "./s3.js";

const signUrl = vi.hoisted(() => vi.fn<typeof getSignedUrl>());
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: signUrl }));

vi.mock("@/app.js", () => ({
    config: { EXPORT_CONVOS_AWS_S3_REGION: "eu-west-1" },
    log: { info: vi.fn(), error: vi.fn() },
}));

afterEach(() => vi.restoreAllMocks());

describe("S3 HTTP representation metadata", () => {
    it("uses the captured grant timestamp for signing and expiration", async () => {
        signUrl.mockResolvedValueOnce("https://documents.example/report");
        const signingDate = new Date("2026-11-14T12:00:00.000Z");
        const response = await generatePresignedUrl({
            s3Key: "report/br",
            bucketName: "documents",
            region: "eu-west-1",
            expiresIn: 600,
            signingDate,
        });
        expect(signUrl.mock.calls.at(-1)?.at(2)).toEqual({
            expiresIn: 600,
            signingDate,
        });
        expect(response).toEqual({
            url: "https://documents.example/report",
            expiresAt: new Date("2026-11-14T12:10:00.000Z"),
        });
    });

    it("declares the encoding for the exact uploaded bytes without changing MIME type", async () => {
        const send = vi
            .spyOn(S3Client.prototype, "send")
            .mockResolvedValue(undefined);
        const buffer = Buffer.from("encoded fixture");
        const abortSignal = AbortSignal.timeout(120_000);
        await uploadToS3({
            s3Key: "report/br",
            bucketName: "documents",
            region: "eu-west-1",
            buffer,
            contentType: "text/html",
            contentEncoding: "br",
            checksumSha256: "fixture-checksum",
            abortSignal,
        });
        const command = send.mock.calls.at(0)?.at(0);
        expect(command).toBeInstanceOf(PutObjectCommand);
        expect(send.mock.calls.at(0)?.at(1)).toEqual({ abortSignal });
        if (command instanceof PutObjectCommand) {
            expect(command.input).toMatchObject({
                Key: "report/br",
                Bucket: "documents",
                Body: buffer,
                ContentEncoding: "br",
                ContentType: "text/html",
                ChecksumSHA256: "fixture-checksum",
            });
        }
    });

    it("leaves ordinary CSV exports unencoded", async () => {
        const send = vi
            .spyOn(S3Client.prototype, "send")
            .mockResolvedValue(undefined);
        await uploadToS3({
            s3Key: "export.csv",
            bucketName: "exports",
            buffer: Buffer.from("statement,votes\n"),
            fileName: "export.csv",
        });
        const command = send.mock.calls.at(0)?.at(0);
        expect(command).toBeInstanceOf(PutObjectCommand);
        if (command instanceof PutObjectCommand) {
            expect(command.input.ContentEncoding).toBeUndefined();
            expect(command.input.ContentType).toBe("text/csv");
            expect(command.input.ContentDisposition).toBe(
                'attachment; filename="export.csv"',
            );
        }
    });
});
