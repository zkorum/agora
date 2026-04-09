import { describe, expect, it } from "vitest";
import { canAccessExportFileType, getExportGenerators } from "./factory.js";

describe("getExportGenerators", () => {
    it("omits survey files when the conversation has no survey", () => {
        const generators = getExportGenerators({
            exportAccessLevel: "owner",
            hasSurvey: false,
        });

        expect(generators.map((generator) => generator.fileType)).toEqual([
            "comments",
        ]);
    });

    it("includes survey metadata files for optional and required surveys", () => {
        const generators = getExportGenerators({
            exportAccessLevel: "public",
            hasSurvey: true,
        });

        expect(generators.map((generator) => generator.fileType)).toEqual([
            "comments",
            "survey_questions",
            "survey_question_options",
            "survey_public_aggregates",
        ]);
    });
});

describe("canAccessExportFileType", () => {
    it("hides owner-only survey files from public viewers", () => {
        expect(
            canAccessExportFileType({
                fileType: "survey_participant_responses",
                exportAccessLevel: "public",
            }),
        ).toBe(false);
        expect(
            canAccessExportFileType({
                fileType: "survey_full_aggregates",
                exportAccessLevel: "public",
            }),
        ).toBe(false);
    });

    it("keeps survey metadata files public", () => {
        expect(
            canAccessExportFileType({
                fileType: "survey_questions",
                exportAccessLevel: "public",
            }),
        ).toBe(true);
        expect(
            canAccessExportFileType({
                fileType: "survey_question_options",
                exportAccessLevel: "public",
            }),
        ).toBe(true);
    });
});
