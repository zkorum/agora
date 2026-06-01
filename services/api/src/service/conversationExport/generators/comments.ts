import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import {
    analysisSnapshotOpinionTable,
    conversationViewSnapshotTable,
    opinionTable,
    opinionContentTable,
    opinionModerationTable,
} from "@/shared-backend/schema.js";
import { formatDatetime } from "../utils.js";
import { buildCsvBuffer } from "./csv.js";
import type {
    CsvGenerator,
    GeneratorParams,
    CsvGeneratorResult,
} from "./base.js";
import type { ExportParticipantMap } from "./participantMap.js";

export const commentHeaders = [
    "timestamp",
    "datetime",
    "comment-id",
    "author-id",
    "agrees",
    "disagrees",
    "passes",
    "votes",
    "moderated",
    "comment_text",
] as const;

interface CommentExportOpinion {
    authorId: string;
    content: string;
    createdAt: Date;
    numAgrees: number;
    numDisagrees: number;
    numPasses: number;
    moderationId: number | null;
    moderationAction: string | null;
}

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

export function buildCommentRows({
    opinions,
    participantMap,
}: {
    opinions: CommentExportOpinion[];
    participantMap: ExportParticipantMap;
}): Record<string, string | number | null>[] {
    return opinions.map((opinion, index) => {
        const authorId = participantMap.getOrCreateExportParticipantId({
            userId: opinion.authorId,
        });

        return {
            timestamp: Math.floor(opinion.createdAt.getTime() / 1000),
            datetime: formatDatetime(opinion.createdAt),
            "comment-id": index, // Remap comment_id to 0-based index
            "author-id": authorId, // Remap author_id to 0-based index per conversation
            agrees: opinion.numAgrees,
            disagrees: opinion.numDisagrees,
            passes: opinion.numPasses,
            votes: opinion.numAgrees + opinion.numDisagrees + opinion.numPasses,
            moderated:
                opinion.moderationId === null
                    ? 0 // unmoderated
                    : opinion.moderationAction === "hide"
                      ? -1 // banned/hidden
                      : opinion.moderationAction === "move"
                        ? -1 // moved (also treated as banned)
                        : 1, // approved (fallback, though no explicit "approve" action exists)
            comment_text: stripHtmlForCsv(opinion.content),
        };
    });
}

/**
 * Generator for Sensemaker-compatible comments.csv
 */
export const commentsGenerator: CsvGenerator = {
    fileType: "comments",
    minimumAccessLevel: "public",
    async generate(params: GeneratorParams): Promise<CsvGeneratorResult> {
        const { db, conversationId, participantMap } = params;

        const latestViewSnapshotRows = await db
            .select({
                analysisSnapshotId:
                    conversationViewSnapshotTable.analysisSnapshotId,
            })
            .from(conversationViewSnapshotTable)
            .where(
                and(
                    eq(
                        conversationViewSnapshotTable.conversationId,
                        conversationId,
                    ),
                    isNotNull(conversationViewSnapshotTable.activatedAt),
                ),
            )
            .orderBy(
                desc(conversationViewSnapshotTable.createdAt),
                desc(conversationViewSnapshotTable.id),
            )
            .limit(1);

        if (latestViewSnapshotRows.length === 0) {
            throw new Error(
                `Missing conversation view snapshot counts for conversation ${String(conversationId)}`,
            );
        }
        const latestViewSnapshot = latestViewSnapshotRows[0];

        // Fetch all opinions for this conversation with moderation status
        const opinions = await db
            .select({
                opinionId: opinionTable.id,
                authorId: opinionTable.authorId,
                content: opinionContentTable.content,
                createdAt: opinionTable.createdAt,
                moderationId: opinionModerationTable.id,
                moderationAction: opinionModerationTable.moderationAction,
            })
            .from(opinionTable)
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

        const opinionCountsById = new Map<
            number,
            { numAgrees: number; numDisagrees: number; numPasses: number }
        >();
        if (
            latestViewSnapshot.analysisSnapshotId !== null &&
            opinions.length > 0
        ) {
            const snapshotOpinionRows = await db
                .select({
                    opinionId: analysisSnapshotOpinionTable.opinionId,
                    numAgrees: analysisSnapshotOpinionTable.numAgrees,
                    numDisagrees: analysisSnapshotOpinionTable.numDisagrees,
                    numPasses: analysisSnapshotOpinionTable.numPasses,
                })
                .from(analysisSnapshotOpinionTable)
                .where(
                    and(
                        eq(
                            analysisSnapshotOpinionTable.analysisSnapshotId,
                            latestViewSnapshot.analysisSnapshotId,
                        ),
                        inArray(
                            analysisSnapshotOpinionTable.opinionId,
                            opinions.map((opinion) => opinion.opinionId),
                        ),
                    ),
                );
            for (const row of snapshotOpinionRows) {
                opinionCountsById.set(row.opinionId, {
                    numAgrees: row.numAgrees,
                    numDisagrees: row.numDisagrees,
                    numPasses: row.numPasses,
                });
            }
        }

        const opinionsWithCounts = opinions.map((opinion) => {
            const counts = opinionCountsById.get(opinion.opinionId);
            return {
                ...opinion,
                numAgrees: counts?.numAgrees ?? 0,
                numDisagrees: counts?.numDisagrees ?? 0,
                numPasses: counts?.numPasses ?? 0,
            };
        });

        // Generate CSV rows following Sensemaker's expected comments.csv shape.
        const rows = buildCommentRows({
            opinions: opinionsWithCounts,
            participantMap,
        });

        const csvBuffer = await buildCsvBuffer({
            headers: commentHeaders,
            rows,
        });

        return {
            csvBuffer,
            recordCount: opinions.length,
        };
    },
};
