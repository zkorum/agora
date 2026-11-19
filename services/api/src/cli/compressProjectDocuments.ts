import { drizzle } from "drizzle-orm/postgres-js";
import { parseArgs } from "node:util";
import { z } from "zod";
import { config, log, server } from "../app.js";
import { logApiError } from "../logging/privacy.js";
import {
    backfillProjectDocumentRepresentations,
    cleanupProjectDocumentRepresentations,
} from "../service/projectDocumentStorage.js";
import { createPostgresClient } from "../shared-backend/db.js";

async function main(): Promise<void> {
    const { values } = parseArgs({
        options: {
            project: { type: "string" },
            document: { type: "string" },
            limit: { type: "string", default: "100" },
            apply: { type: "boolean", default: false },
        },
    });
    const args = z
        .object({
            project: z.string().min(1),
            document: z.uuid().optional(),
            limit: z.coerce.number().int().min(1).max(1000),
            apply: z.boolean(),
        })
        .parse(values);
    const storage = z
        .object({
            bucketName: z.string().min(1),
            region: z.string().min(1),
        })
        .parse({
            bucketName: config.PROJECT_DOCUMENTS_AWS_S3_BUCKET_NAME,
            region: config.PROJECT_DOCUMENTS_AWS_S3_REGION,
        });
    const client = await createPostgresClient(config, log);
    try {
        const db = drizzle(client);
        const cleanupScope = {
            db,
            storage,
            projectSlug: args.project,
            documentId: args.document,
        };
        if (args.apply)
            await cleanupProjectDocumentRepresentations(cleanupScope);
        const result = await backfillProjectDocumentRepresentations({
            db,
            storage,
            projectSlug: args.project,
            documentId: args.document,
            apply: args.apply,
            limit: args.limit,
        });
        log.info(
            { count: result.selected },
            "Project document compression candidates selected",
        );
        log.info(
            { count: result.prepared },
            "Project document compression preparation completed",
        );
    } finally {
        await client.end({ timeout: 5 });
    }
}

try {
    await main();
} catch (error) {
    logApiError({
        logger: log,
        level: "error",
        event: { event: "application_error" },
        error,
    });
    process.exitCode = 1;
} finally {
    await server.close();
}
