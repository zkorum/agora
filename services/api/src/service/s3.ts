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
export const s3Client = new S3Client({
    region: config.EXPORT_CONVOS_AWS_S3_REGION,
});

/**
 * Validate S3 bucket access on startup.
 */
export async function validateS3Access({
    bucketName,
}: {
    bucketName: string;
}): Promise<void> {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
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
}: {
    s3Key: string;
    buffer: Buffer;
    bucketName: string;
    fileName?: string;
}): Promise<void> {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: buffer,
            ContentType: "text/csv",
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
}: {
    s3Key: string;
    bucketName: string;
    expiresIn: number; // seconds
}): Promise<{ url: string; expiresAt: Date }> {
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { url, expiresAt };
}

/**
 * Delete object from S3.
 */
export async function deleteFromS3({
    s3Key,
    bucketName,
}: {
    s3Key: string;
    bucketName: string;
}): Promise<void> {
    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
        }),
    );
}
