import { describe, expect, it } from "vitest";
import { getVisibleExportFiles } from "./core.js";

describe("getVisibleExportFiles", () => {
    it("keeps public survey metadata files visible to everyone", () => {
        expect(
            getVisibleExportFiles({
                fileRecords: [
                    {
                        fileType: "comments",
                        fileName: "comments.csv",
                        fileSize: 100,
                        recordCount: 2,
                        s3Key: "exports/comments.csv",
                    },
                    {
                        fileType: "survey_questions",
                        fileName: "survey_questions.csv",
                        fileSize: 100,
                        recordCount: 2,
                        s3Key: "exports/survey_questions.csv",
                    },
                ],
                exportAccessLevel: "public",
            }),
        ).toEqual([
            {
                fileType: "comments",
                fileName: "comments.csv",
                fileSize: 100,
                recordCount: 2,
                s3Key: "exports/comments.csv",
            },
            {
                fileType: "survey_questions",
                fileName: "survey_questions.csv",
                fileSize: 100,
                recordCount: 2,
                s3Key: "exports/survey_questions.csv",
            },
        ]);
    });

    it("hides owner-only survey files from public viewers", () => {
        expect(
            getVisibleExportFiles({
                fileRecords: [
                    {
                        fileType: "comments",
                        fileName: "comments.csv",
                        fileSize: 100,
                        recordCount: 2,
                        s3Key: "exports/comments.csv",
                    },
                    {
                        fileType: "survey_full_aggregates",
                        fileName: "survey_full_aggregates.csv",
                        fileSize: 100,
                        recordCount: 2,
                        s3Key: "exports/survey_full_aggregates.csv",
                    },
                ],
                exportAccessLevel: "public",
            }),
        ).toEqual([
            {
                fileType: "comments",
                fileName: "comments.csv",
                fileSize: 100,
                recordCount: 2,
                s3Key: "exports/comments.csv",
            },
        ]);
    });

    it("keeps owner-only survey files for owners", () => {
        expect(
            getVisibleExportFiles({
                fileRecords: [
                    {
                        fileType: "comments",
                        fileName: "comments.csv",
                        fileSize: 100,
                        recordCount: 2,
                        s3Key: "exports/comments.csv",
                    },
                    {
                        fileType: "survey_full_aggregates",
                        fileName: "survey_full_aggregates.csv",
                        fileSize: 100,
                        recordCount: 2,
                        s3Key: "exports/survey_full_aggregates.csv",
                    },
                ],
                exportAccessLevel: "owner",
            }),
        ).toEqual([
            {
                fileType: "comments",
                fileName: "comments.csv",
                fileSize: 100,
                recordCount: 2,
                s3Key: "exports/comments.csv",
            },
            {
                fileType: "survey_full_aggregates",
                fileName: "survey_full_aggregates.csv",
                fileSize: 100,
                recordCount: 2,
                s3Key: "exports/survey_full_aggregates.csv",
            },
        ]);
    });
});
