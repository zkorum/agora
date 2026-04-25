import type { CsvGenerator, ExportAccessLevel } from "./base.js";
import type { ExportFileAudience, ExportFileType } from "@/shared/types/zod.js";
import { commentsGenerator } from "./comments.js";
import { surveyFullAggregatesGenerator } from "./surveyFullAggregates.js";
import { surveyParticipantResponsesGenerator } from "./surveyParticipantResponses.js";
import { surveyQuestionOptionsGenerator } from "./surveyQuestionOptions.js";
import { surveyQuestionsGenerator } from "./surveyQuestions.js";
import { surveyPublicAggregatesGenerator } from "./surveyPublicAggregates.js";

const exportGenerators: CsvGenerator[] = [
    commentsGenerator,
    surveyQuestionsGenerator,
    surveyQuestionOptionsGenerator,
    surveyParticipantResponsesGenerator,
    surveyPublicAggregatesGenerator,
    surveyFullAggregatesGenerator,
];

const exportGeneratorByFileType = new Map(
    exportGenerators.map((generator) => [generator.fileType, generator]),
);

function isSurveyExportFileType({
    fileType,
}: {
    fileType: ExportFileType;
}): boolean {
    return fileType.startsWith("survey_");
}

export function getExportGenerators({
    exportAccessLevel,
    hasSurvey,
}: {
    exportAccessLevel: ExportAccessLevel;
    hasSurvey: boolean;
}): CsvGenerator[] {
    return exportGenerators.filter((generator) => {
        if (
            isSurveyExportFileType({ fileType: generator.fileType }) &&
            !hasSurvey
        ) {
            return false;
        }

        if (generator.minimumAccessLevel === "public") {
            return true;
        }

        return exportAccessLevel === "owner";
    });
}

export function getAvailableExportFileTypes(): string[] {
    return exportGenerators.map((generator) => generator.fileType);
}

export function getExportGeneratorByFileType({
    fileType,
}: {
    fileType: ExportFileType;
}): CsvGenerator | undefined {
    return exportGeneratorByFileType.get(fileType);
}

export function canAccessExportFileType({
    fileType,
    exportAccessLevel,
}: {
    fileType: ExportFileType;
    exportAccessLevel: ExportAccessLevel;
}): boolean {
    const generator = exportGeneratorByFileType.get(fileType);
    if (generator === undefined) {
        return false;
    }

    if (generator.minimumAccessLevel === "public") {
        return true;
    }

    return exportAccessLevel === "owner";
}

export function getExportFileAudience({
    fileType,
}: {
    fileType: ExportFileType;
}): ExportFileAudience | undefined {
    const generator = exportGeneratorByFileType.get(fileType);
    if (generator === undefined) {
        return undefined;
    }

    return generator.minimumAccessLevel === "public" ? "redacted" : "owner";
}
