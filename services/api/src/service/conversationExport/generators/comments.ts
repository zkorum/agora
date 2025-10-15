import { eq } from "drizzle-orm";
import { and, or, isNull, ne } from "drizzle-orm";
import { format as formatCsv } from "fast-csv";
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
            .where(
                and(
                    eq(opinionTable.conversationId, conversationId),
                    or(
                        isNull(opinionModerationTable.moderationAction),
                        ne(opinionModerationTable.moderationAction, "move"),
                    ),
                ),
            )
            .orderBy(opinionTable.createdAt);

        // Generate CSV rows following Polis spec
        // Note: fast-csv handles escaping automatically, so we don't need escapeCsvField
        const rows = opinions.map((opinion) => ({
            timestamp: Math.floor(opinion.createdAt.getTime() / 1000),
            datetime: formatDatetime(opinion.createdAt),
            "comment-id": opinion.opinionId,
            "author-id": opinion.authorParticipantId,
            agrees: opinion.numAgrees,
            disagrees: opinion.numDisagrees,
            moderated: opinion.moderationId !== null ? 1 : 0,
            "comment-body": opinion.content,
        }));

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
