import { eq } from "drizzle-orm";
import { format as formatCsv } from "fast-csv";
import sanitizeHtml from "sanitize-html";
import {
    opinionTable,
    userTable,
    opinionContentTable,
    opinionModerationTable,
} from "@/shared-backend/schema.js";
import { formatDatetime } from "../utils.js";
import type {
    CsvGenerator,
    GeneratorParams,
    CsvGeneratorResult,
} from "./base.js";

/**
 * Strip all HTML tags from content for CSV export.
 * Converts HTML to plain text while preserving line breaks.
 */
function stripHtmlForCsv(htmlContent: string): string {
    // First pass: convert <br> and block-level tags to newlines
    let text = htmlContent
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/p>/gi, "\n");

    // Second pass: strip all remaining HTML tags
    text = sanitizeHtml(text, {
        allowedTags: [],
        allowedAttributes: {},
    });

    // Clean up excessive whitespace while preserving intentional line breaks
    text = text
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
        .trim();

    return text;
}

/**
 * Generator for comments.csv following Polis specification
 */
export class CommentsGenerator implements CsvGenerator {
    public readonly fileType = "comments";

    async generate(params: GeneratorParams): Promise<CsvGeneratorResult> {
        const { db, conversationId } = params;

        // Fetch all opinions for this conversation with moderation status
        const opinions = await db
            .select({
                opinionId: opinionTable.id,
                authorParticipantId: userTable.polisParticipantId,
                content: opinionContentTable.content,
                createdAt: opinionTable.createdAt,
                numAgrees: opinionTable.numAgrees,
                numDisagrees: opinionTable.numDisagrees,
                moderationId: opinionModerationTable.id,
                moderationAction: opinionModerationTable.moderationAction,
            })
            .from(opinionTable)
            .innerJoin(userTable, eq(opinionTable.authorId, userTable.id))
            .innerJoin(
                opinionContentTable,
                eq(opinionTable.currentContentId, opinionContentTable.id),
            )
            .leftJoin(
                opinionModerationTable,
                eq(opinionTable.id, opinionModerationTable.opinionId),
            )
            .where(eq(opinionTable.conversationId, conversationId))
            .orderBy(opinionTable.createdAt);

        // Track author IDs to remap them to sequential integers starting from 0
        const authorIdMap = new Map<number, number>();
        let nextAuthorId = 0;

        // Generate CSV rows following Polis spec
        // Note: fast-csv handles escaping automatically, so we don't need escapeCsvField
        const rows = opinions.map((opinion, index) => {
            let authorId = authorIdMap.get(opinion.authorParticipantId);
            if (authorId === undefined) {
                authorId = nextAuthorId++;
                authorIdMap.set(opinion.authorParticipantId, authorId);
            }

            return {
                timestamp: Math.floor(opinion.createdAt.getTime() / 1000),
                datetime: formatDatetime(opinion.createdAt),
                "comment-id": index, // Remap comment_id to 0-based index
                "author-id": authorId, // Remap author_id to 0-based index per conversation
                agrees: opinion.numAgrees,
                disagrees: opinion.numDisagrees,
                moderated:
                    opinion.moderationId === null
                        ? 0 // unmoderated
                        : opinion.moderationAction === "hide"
                          ? -1 // banned/hidden
                          : opinion.moderationAction === "move"
                            ? -1 // moved (also treated as banned)
                            : 1, // approved (fallback, though no explicit "approve" action exists)
                "comment-body": stripHtmlForCsv(opinion.content),
            };
        });

        const csvStream = formatCsv({ headers: true });
        const chunks: Buffer[] = [];

        csvStream.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
        });

        // Write all rows
        for (const row of rows) {
            csvStream.write(row);
        }

        csvStream.end();

        // Wait for stream to finish
        await new Promise<void>((resolve, reject) => {
            csvStream.on("end", () => {
                resolve();
            });
            csvStream.on("error", reject);
        });

        const csvBuffer = Buffer.concat(chunks);

        return {
            csvBuffer,
            recordCount: opinions.length,
        };
    }
}
