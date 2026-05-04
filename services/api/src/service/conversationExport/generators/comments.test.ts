import { describe, expect, it } from "vitest";
import { buildCsvBuffer } from "./csv.js";
import { createExportParticipantMap } from "./participantMap.js";
import { buildCommentRows, commentHeaders } from "./comments.js";

describe("buildCommentRows", () => {
    it("exports Sensemaker-compatible comment rows", async () => {
        const rows = buildCommentRows({
            opinions: [
                {
                    authorId: "user-1",
                    content: "<p>Hello, <strong>world</strong></p>",
                    createdAt: new Date("2026-01-02T03:04:05.000Z"),
                    numAgrees: 2,
                    numDisagrees: 3,
                    numPasses: 4,
                    moderationId: null,
                    moderationAction: null,
                },
            ],
            participantMap: createExportParticipantMap(),
        });

        expect(rows).toHaveLength(1);
        expect(Object.keys(rows[0])).toEqual(commentHeaders);
        expect(rows[0]).toMatchObject({
            timestamp: 1767323045,
            datetime: "Fri Jan 02 03:04:05 GMT+0 2026",
            "comment-id": 0,
            "author-id": 0,
            agrees: 2,
            disagrees: 3,
            passes: 4,
            votes: 9,
            moderated: 0,
            comment_text: "Hello, world",
        });
        expect(rows[0]).not.toHaveProperty("comment-body");

        const csvBuffer = await buildCsvBuffer({
            headers: commentHeaders,
            rows,
        });

        expect(csvBuffer.toString("utf8").split("\n")[0]).toBe(
            "timestamp,datetime,comment-id,author-id,agrees,disagrees,passes,votes,moderated,comment_text",
        );
    });
});
