import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config, log } from "@/app.js";

// Initialize S3 client following the same pattern as SecretsManagerClient in index.ts
// Credentials are automatically loaded from IAM role or environment variables
const s3ClientsByRegion = new Map<string, S3Client>();

function getS3Client({ region }: { region: string | undefined }): S3Client {
    const regionKey = region ?? "default";
    const existingClient = s3ClientsByRegion.get(regionKey);
    if (existingClient !== undefined) {
        return existingClient;
    }

    const client = new S3Client({ region });
    s3ClientsByRegion.set(regionKey, client);
    return client;
}

/**
 * Validate S3 bucket access on startup.
 */
export async function validateS3Access({
    bucketName,
    region = config.EXPORT_CONVOS_AWS_S3_REGION,
}: {
    bucketName: string;
    region?: string;
}): Promise<void> {
    try {
        await getS3Client({ region }).send(
            new HeadBucketCommand({ Bucket: bucketName }),
        );
        log.info(`S3 bucket verified: ${bucketName}`);
    } catch (error) {
        log.error(error, "S3 configuration error:");
        throw new Error("S3 bucket not accessible. Check configuration.");
    }
}

/**
 * Upload buffer to S3.
 */
export async function uploadToS3({
    s3Key,
    buffer,
    bucketName,
    fileName,
    contentType = "text/csv",
    checksumSha256,
    region = config.EXPORT_CONVOS_AWS_S3_REGION,
}: {
    s3Key: string;
    buffer: Buffer;
    bucketName: string;
    fileName?: string;
    contentType?: string;
    checksumSha256?: string;
    region?: string;
}): Promise<void> {
    await getS3Client({ region }).send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: buffer,
            ContentType: contentType,
            ChecksumSHA256: checksumSha256,
            ContentDisposition: fileName
                ? `attachment; filename="${fileName}"`
                : undefined,
        }),
    );
}

/**
 * Generate pre-signed URL for S3 object.
 */
export async function generatePresignedUrl({
    s3Key,
    bucketName,
    expiresIn,
    region = config.EXPORT_CONVOS_AWS_S3_REGION,
    responseContentType,
    responseContentDisposition,
}: {
    s3Key: string;
    bucketName: string;
    expiresIn: number; // seconds
    region?: string;
    responseContentType?: string;
    responseContentDisposition?: string;
}): Promise<{ url: string; expiresAt: Date }> {
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        ResponseContentType: responseContentType,
        ResponseContentDisposition: responseContentDisposition,
    });

    const url = await getSignedUrl(getS3Client({ region }), command, {
        expiresIn,
    });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { url, expiresAt };
}

/**
 * Delete object from S3.
 */
export async function deleteFromS3({
    s3Key,
    bucketName,
    region = config.EXPORT_CONVOS_AWS_S3_REGION,
}: {
    s3Key: string;
    bucketName: string;
    region?: string;
}): Promise<void> {
    await getS3Client({ region }).send(
        new DeleteObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
        }),
    );
}
