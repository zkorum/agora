import {
    and,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    ne,
    or,
} from "drizzle-orm";
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
    contentPlainText: string | null;
    createdAt: Date;
    numAgrees: number;
    numDisagrees: number;
    numPasses: number;
    moderationId: number | null;
    moderationAction: string | null;
}

const HIDDEN_MODERATION_ACTION = "hide";
const MOVED_MODERATION_ACTION = "move";

function isHiddenOpinion(
    opinion: Pick<CommentExportOpinion, "moderationAction">,
): boolean {
    return opinion.moderationAction === HIDDEN_MODERATION_ACTION;
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
    return opinions
        .filter((opinion) => !isHiddenOpinion(opinion))
        .map((opinion, index) => {
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
                votes:
                    opinion.numAgrees + opinion.numDisagrees + opinion.numPasses,
                moderated:
                    opinion.moderationId === null
                        ? 0 // unmoderated
                        : opinion.moderationAction === MOVED_MODERATION_ACTION
                          ? -1 // moved opinions remain in moderation history
                          : 1, // approved (fallback, though no explicit "approve" action exists)
                comment_text:
                    opinion.contentPlainText ?? stripHtmlForCsv(opinion.content),
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

        // Hidden opinions are moderator-only. Moved opinions stay in the
        // Sensemaker moderation history as moderated=-1.
        const opinions = await db
            .select({
                opinionId: opinionTable.id,
                authorId: opinionTable.authorId,
                content: opinionContentTable.content,
                contentPlainText: opinionContentTable.contentPlainText,
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
                and(
                    eq(opinionTable.id, opinionModerationTable.opinionId),
                    isNull(opinionModerationTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(opinionTable.conversationId, conversationId),
                    or(
                        isNull(opinionModerationTable.id),
                        ne(
                            opinionModerationTable.moderationAction,
                            HIDDEN_MODERATION_ACTION,
                        ),
                    ),
                ),
            )
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
            recordCount: rows.length,
        };
    },
};
