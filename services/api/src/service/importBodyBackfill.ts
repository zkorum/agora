/**
 * One-time startup backfill to clean import metadata from conversation bodies.
 *
 * Previously, import metadata (source URL, author, creation date, etc.) was
 * injected directly into the conversation body HTML after a "------" separator.
 * This backfill:
 * 1. Finds imported conversations whose body still contains the separator
 * 2. Parses metadata from the body text
 * 3. Fills any NULL DB columns with extracted metadata
 * 4. Strips the separator and metadata from the body
 *
 * Idempotent — becomes a no-op once all bodies are cleaned.
 */

import {
    conversationTable,
    conversationContentTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNotNull, like } from "drizzle-orm";
import { log } from "@/app.js";

interface ParsedImportMetadata {
    sourceUrl: string | undefined;
    conversationUrl: string | undefined;
    exportUrl: string | undefined;
    author: string | undefined;
    createdAt: Date | undefined;
}

function parseMetadataFromBody(metadataText: string): ParsedImportMetadata {
    const result: ParsedImportMetadata = {
        sourceUrl: undefined,
        conversationUrl: undefined,
        exportUrl: undefined,
        author: undefined,
        createdAt: undefined,
    };

    // Split on <br /> or <br/> tags to get individual lines
    const lines = metadataText.split(/<br\s*\/?>/gi).map((l) => l.trim());

    const importedFromRegex = /imported from (?!Polis CSV)(.+?)\.?\s*$/i;
    const conversationUrlRegex =
        /original conversation url is (.+?)\.?\s*$/i;
    const reportUrlRegex = /original report url is (.+?)\.?\s*$/i;
    const authorRegex = /original author is "(.+?)"/i;
    const dateRegex = /original creation date is (.+?)\.?\s*$/i;

    for (const line of lines) {
        const importedFromMatch = importedFromRegex.exec(line);
        if (importedFromMatch?.[1] !== undefined) {
            result.sourceUrl = importedFromMatch[1].trim();
            continue;
        }

        const conversationUrlMatch = conversationUrlRegex.exec(line);
        if (conversationUrlMatch?.[1] !== undefined) {
            result.conversationUrl = conversationUrlMatch[1].trim();
            continue;
        }

        const reportUrlMatch = reportUrlRegex.exec(line);
        if (reportUrlMatch?.[1] !== undefined) {
            result.exportUrl = reportUrlMatch[1].trim();
            continue;
        }

        const authorMatch = authorRegex.exec(line);
        if (authorMatch?.[1] !== undefined) {
            result.author = authorMatch[1].trim();
            continue;
        }

        const dateMatch = dateRegex.exec(line);
        if (dateMatch?.[1] !== undefined) {
            const parsed = new Date(dateMatch[1].trim());
            if (!isNaN(parsed.getTime())) {
                result.createdAt = parsed;
            }
            continue;
        }
    }

    return result;
}

export async function backfillImportBodies({
    db,
}: {
    db: PostgresDatabase;
}): Promise<void> {
    // Find imported conversations whose body still contains the separator
    const candidates = await db
        .select({
            conversationId: conversationTable.id,
            slugId: conversationTable.slugId,
            contentId: conversationContentTable.id,
            body: conversationContentTable.body,
            importUrl: conversationTable.importUrl,
            importConversationUrl: conversationTable.importConversationUrl,
            importExportUrl: conversationTable.importExportUrl,
            importCreatedAt: conversationTable.importCreatedAt,
            importAuthor: conversationTable.importAuthor,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(
                conversationTable.currentContentId,
                conversationContentTable.id,
            ),
        )
        .where(
            and(
                isNotNull(conversationTable.currentContentId),
                like(conversationContentTable.body, "%--------------%" ),
            ),
        );

    if (candidates.length === 0) {
        log.info(
            "[Import Backfill] No conversations need body cleanup",
        );
        return;
    }

    log.info(
        `[Import Backfill] Cleaning bodies for ${String(candidates.length)} imported conversations`,
    );

    let successCount = 0;
    let errorCount = 0;

    for (const candidate of candidates) {
        try {
            const body = candidate.body;
            if (body === null) {
                continue;
            }

            // Split on the separator pattern: <br /><br />-------------- (6+ dashes)
            const separatorRegex = /<br\s*\/?>\s*<br\s*\/?>\s*-{6,}/i;
            const separatorMatch = separatorRegex.exec(body);
            if (separatorMatch?.index === undefined) {
                continue;
            }

            const cleanBody = body.slice(0, separatorMatch.index).trim();
            const metadataText = body.slice(
                separatorMatch.index + separatorMatch[0].length,
            );

            // Parse metadata from the body text
            const parsed = parseMetadataFromBody(metadataText);

            // Fill NULL DB columns with parsed metadata
            const columnsToUpdate: Record<string, string | Date> = {};
            if (
                candidate.importUrl === null &&
                parsed.sourceUrl !== undefined
            ) {
                columnsToUpdate.importUrl = parsed.sourceUrl;
            }
            if (
                candidate.importConversationUrl === null &&
                parsed.conversationUrl !== undefined
            ) {
                columnsToUpdate.importConversationUrl =
                    parsed.conversationUrl;
            }
            if (
                candidate.importExportUrl === null &&
                parsed.exportUrl !== undefined
            ) {
                columnsToUpdate.importExportUrl = parsed.exportUrl;
            }
            if (
                candidate.importAuthor === null &&
                parsed.author !== undefined
            ) {
                columnsToUpdate.importAuthor = parsed.author;
            }
            if (
                candidate.importCreatedAt === null &&
                parsed.createdAt !== undefined
            ) {
                columnsToUpdate.importCreatedAt = parsed.createdAt;
            }

            // Update DB columns if needed
            if (Object.keys(columnsToUpdate).length > 0) {
                await db
                    .update(conversationTable)
                    .set(columnsToUpdate)
                    .where(eq(conversationTable.id, candidate.conversationId));
            }

            // Clean the body
            await db
                .update(conversationContentTable)
                .set({
                    body: cleanBody.length > 0 ? cleanBody : null,
                })
                .where(eq(conversationContentTable.id, candidate.contentId));

            successCount++;
        } catch (error) {
            log.error(
                error,
                `[Import Backfill] Failed for conversation ${candidate.slugId}`,
            );
            errorCount++;
        }
    }

    log.info(
        `[Import Backfill] Complete: ${String(successCount)} succeeded, ${String(errorCount)} failed`,
    );
}
